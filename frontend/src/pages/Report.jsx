import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getReport, markReportSent, writeReport } from '../api/reports.js'
import { db } from '../lib/db.js'
import { covers, formatDate, itemText } from '../lib/format.js'
import { LANGUAGES, useLanguage, useT } from '../lib/i18n.js'
import { useOnline } from '../lib/offline.js'
import { useFetch } from '../lib/useFetch.js'

const MARKS = { yes: '✓', partly: '◐', no: '✗' }

// The visit report: what the mentor would otherwise write by hand after the visit. Facts come straight from
// the data; Claude writes the summary, observations, points to check and support needed. The mentor checks
// it and sends it (WhatsApp, or a PDF); it isn't sent anywhere automatically.
export default function Report() {
  const t = useT()
  const { visitId } = useParams()
  const visit = useLiveQuery(() => db.visits.get(visitId), [visitId])

  if (visit === undefined) return <p className="text-slate-500">{t('common.loading')}</p>
  if (!visit?.server_id) return <p className="text-slate-500">{t('packet.not_synced')}</p>

  return <ReportView visit={visit} />
}

function ReportView({ visit }) {
  const t = useT()
  const language = useLanguage()
  const online = useOnline()
  const { data, error } = useFetch(() => getReport(visit.server_id), [visit.server_id])
  const [latest, setLatest] = useState(null)
  const [writing, setWriting] = useState(false)
  const [writeError, setWriteError] = useState(null)
  const view = latest ?? data

  if (error) return <p className="text-red-600">{t('packet.error', { error })}</p>
  if (!view) return <p className="text-slate-500">{t('common.loading')}</p>

  const ready = ['ready', 'approved'].includes(view.visit.status)
  const languageName = (id) => LANGUAGES.find((l) => l.id === id)?.label ?? id

  async function write() {
    setWriting(true)
    setWriteError(null)
    try {
      setLatest(await writeReport(visit.server_id, language))
    } catch (err) {
      setWriteError(err.message)
    }
    setWriting(false)
  }

  async function sent() {
    try {
      setLatest(await markReportSent(visit.server_id))
    } catch {
      // Offline: it can be marked later; the report itself was already shared.
    }
  }

  return (
    <div className="space-y-5 pb-10">
      <Link to={`/visits/${visit.id}/packet`} className="text-sm text-emerald-700 print:hidden">
        {t('report.back')}
      </Link>

      <ReportBody view={view} />

      <div className="space-y-3 print:hidden">
        {!ready && <p className="text-sm text-slate-500">{t('report.not_ready')}</p>}
        {ready && !online && !view.report && <p className="text-sm text-slate-500">{t('report.needs_internet')}</p>}
        {writeError && <p className="text-sm text-red-600">{t('report.error', { error: writeError })}</p>}
        {ready && (!view.report || view.language !== language) && (
          <button
            onClick={write}
            disabled={!online || writing}
            className="w-full rounded-lg bg-emerald-700 px-4 py-3 font-medium text-white disabled:opacity-50"
          >
            {writing
              ? t('report.writing')
              : view.report
                ? t('report.rewrite', { language: languageName(language) })
                : t('report.write')}
          </button>
        )}
        {view.report && <Send view={view} onSent={sent} />}
      </div>
    </div>
  )
}

// The report as it is printed or saved as PDF: labels in the mentor's language, Claude's text as written.
function ReportBody({ view }) {
  const t = useT()
  const language = useLanguage()
  const { visit, checklist, rubric, report } = view
  const items = visibleItems(view)
  const counts = countRatings(items, rubric)

  return (
    <article className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 text-sm print:border-0 print:p-0">
      <header>
        <h1 className="text-xl font-semibold">{t('report.title')}</h1>
        <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
          <Fact label={t('report.school')} value={visit.school_name} />
          <Fact label={t('report.teacher')} value={visit.teacher_name} />
          <Fact
            label={t('report.class')}
            value={[
              t('school.grade', { grade: visit.grade }),
              visit.subject !== 'both' && t(`subject.${visit.subject}`), // older visits observed one subject
              visit.children_present && t('report.children', { n: visit.children_present }),
              visit.grades_together?.length > 1 && t('report.grades_together', { grades: visit.grades_together.join(', ') }),
            ]
              .filter(Boolean)
              .join(' · ')}
          />
          <Fact label={t('report.date')} value={formatDate(visit.observed_at)} />
          <Fact label={t('report.mentor')} value={visit.mentor_name ?? '–'} />
        </dl>
        <p className="mt-1 text-xs text-slate-500">
          {t('report.checklist', { name: checklist.name ?? t('checklist.title'), version: checklist.version })}
        </p>
      </header>

      {report && (
        <Section title={t('report.summary')}>
          <p lang={view.language}>{report.summary}</p>
        </Section>
      )}

      <Section title={t('report.results')}>
        <p className="mb-2 text-xs text-slate-500">{t('report.counts', counts)}</p>
        <ul className="divide-y divide-slate-100">
          {items.map((item) => (
            <li key={item.id} className="flex items-start justify-between gap-3 py-1">
              <span>{itemText(item, language)}</span>
              <span className="shrink-0 font-medium">
                {rubric[item.id] ? `${MARKS[rubric[item.id]]} ${t(`rating.${rubric[item.id]}`)}` : t('report.not_rated')}
              </span>
            </li>
          ))}
        </ul>
      </Section>

      {report && (
        <>
          <ListSection title={t('report.observations')} lines={report.observations} lang={view.language} />
          <ListSection title={t('report.flags')} lines={report.flags} lang={view.language} />
          <ListSection title={t('report.support')} lines={report.support_needed} lang={view.language} />
        </>
      )}

      <Section title={t('report.action')}>
        <p lang={visit.language}>{view.follow_up || t('report.no_action')}</p>
      </Section>

      {report && (
        <p className="border-t border-slate-100 pt-2 text-xs text-slate-500">
          {t('report.prepared', { mentor: visit.mentor_name ?? '' })}{' '}
          {t('report.written_in', { language: LANGUAGES.find((l) => l.id === view.language)?.label ?? view.language })}
        </p>
      )}
    </article>
  )
}

function Send({ view, onSent }) {
  const t = useT()
  const text = reportText(view, t)

  function print() {
    window.print()
    onSent()
  }

  return (
    <div className="space-y-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
      <div className="flex flex-wrap gap-3">
        <a
          href={`https://wa.me/?text=${encodeURIComponent(text)}`}
          target="_blank"
          rel="noreferrer"
          onClick={onSent}
          className="rounded-lg bg-emerald-700 px-3 py-2 font-medium text-white"
        >
          {t('report.whatsapp')}
        </a>
        <button onClick={print} className="rounded-lg border border-emerald-300 bg-white px-3 py-2 font-medium">
          {t('report.print')}
        </button>
        {!view.sent_at && (
          <button onClick={onSent} className="rounded-lg px-3 py-2 text-emerald-800 underline">
            {t('report.mark_sent')}
          </button>
        )}
      </div>
      {view.sent_at && <p>✓ {t('report.sent', { date: formatDate(view.sent_at) })}</p>}
    </div>
  )
}

function Fact({ label, value }) {
  return (
    <>
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </>
  )
}

function Section({ title, children }) {
  return (
    <section className="space-y-1 break-inside-avoid">
      <h2 className="font-semibold">{title}</h2>
      {children}
    </section>
  )
}

function ListSection({ title, lines, lang }) {
  const t = useT()
  return (
    <Section title={title}>
      {lines.length ? (
        <ul lang={lang} className="list-disc space-y-0.5 pl-5">
          {lines.map((line, index) => (
            <li key={index}>{line}</li>
          ))}
        </ul>
      ) : (
        <p className="text-slate-500">{t('report.none')}</p>
      )}
    </Section>
  )
}

// The items rated in the visit: the whole checklist, or one subject's items for older visits.
function visibleItems(view) {
  return view.checklist.items.filter((item) => covers(view.visit.subject, item))
}

function countRatings(items, rubric) {
  const counts = { yes: 0, partly: 0, no: 0, skipped: 0 }
  for (const item of items) counts[rubric[item.id] ?? 'skipped'] += 1
  return counts
}

// The report as plain text for WhatsApp.
function reportText(view, t) {
  const { visit, report } = view
  const lines = [
    `*${t('report.title')}*`,
    `${visit.school_name} · ${visit.teacher_name} · ${t('school.grade', { grade: visit.grade })}`,
    `${formatDate(visit.observed_at)} · ${t('report.mentor')}: ${visit.mentor_name ?? ''}`,
    '',
    `*${t('report.summary')}*`,
    report.summary,
    '',
    `*${t('report.results')}*`,
    t('report.counts', countRatings(visibleItems(view), view.rubric)),
  ]
  for (const [key, list] of [
    ['report.observations', report.observations],
    ['report.flags', report.flags],
    ['report.support', report.support_needed],
  ]) {
    if (list.length) lines.push('', `*${t(key)}*`, ...list.map((line) => `• ${line}`))
  }
  lines.push('', `*${t('report.action')}*`, view.follow_up || t('report.no_action'))
  return lines.join('\n')
}
