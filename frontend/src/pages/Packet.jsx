import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getRubric } from '../api/rubric.js'
import { getVisitCached } from '../api/visits.js'
import { db } from '../lib/db.js'
import { formatDate, hasCrpNote, itemText } from '../lib/format.js'
import { useLanguage, useT } from '../lib/i18n.js'
import { useOnline } from '../lib/offline.js'
import { whatsappMessage, whatsappUrl } from '../lib/share.js'
import { visitStatus } from '../lib/sync.js'
import { useFetch } from '../lib/useFetch.js'
import { approvePacket, updateVisit } from '../lib/visits.js'

// The parts of the packet the mentor can edit, in the order the debrief goes. Labels: lib/strings.js field.*
const FIELDS = [
  { key: 'strength' },
  { key: 'priority' },
  { key: 'practice_steps', list: true, hint: 'hint.one_step' },
  { key: 'materials', list: true, hint: 'hint.one_item' },
  { key: 'demo_script' },
  { key: 'follow_up' },
  { key: 'follow_up_check' },
]

// After sync: the mentor reads Claude's packet, edits it, and approves it to share with the teacher.
export default function Packet() {
  const t = useT()
  const { visitId } = useParams()
  const visit = useLiveQuery(() => db.visits.get(visitId), [visitId])

  if (visit === undefined) return <p className="text-slate-500">{t('common.loading')}</p>
  if (visit === null) return <p className="text-red-600">{t('observe.not_here')}</p>
  if (!visit.server_id) return <p className="text-slate-500">{t('packet.not_synced')}</p>

  return <PacketReview visit={visit} />
}

function PacketReview({ visit }) {
  const t = useT()
  const uiLanguage = useLanguage()
  const { data, error } = useFetch(() => getVisitCached(visit.server_id), [visit.server_id])
  const { data: rubric } = useFetch(() => getRubric(), [])
  const [approved, setApproved] = useState(null)
  const server = approved ?? data

  if (error) return <p className="text-red-600">{t('packet.error', { error })}</p>
  if (!server) return <p className="text-slate-500">{t('packet.loading')}</p>

  const packet = server.packet
  const priorityItem = rubric?.items.find((item) => item.id === packet?.priority_rubric_item)

  return (
    <div className="space-y-5 pb-28">
      <Link to="/" className="text-sm text-emerald-700">
        {t('common.home')}
      </Link>

      <div>
        <h1 className="text-xl font-semibold">{t('packet.title', { name: server.teacher_name })}</h1>
        <p className="text-sm text-slate-500">
          {t('school.grade', { grade: server.grade })} · {server.school_name} · {formatDate(visit.started_at)}
        </p>
      </div>

      {!packet ? (
        <p className="text-slate-500">
          {t('packet.not_ready', { status: t(visitStatus({ status: 'synced', server_status: server.status }).key) })}
        </p>
      ) : (
        <>
          <section className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
            <p className="font-medium text-slate-500">{t('packet.summary')}</p>
            <p lang="en" className="mt-1">
              {packet.english_gloss}
            </p>
            {priorityItem && (
              <p className="mt-2 text-slate-600">
                {t('packet.priority')} <span className="font-medium">{itemText(priorityItem, uiLanguage)}</span>
              </p>
            )}
          </section>

          {server.status === 'approved' ? (
            <>
              <ShareLink server={server} />
              <ApprovedPacket packet={packet} language={server.language} />
            </>
          ) : (
            <PacketForm visit={visit} packet={packet} language={server.language} onApproved={setApproved} />
          )}

          <Link
            to={`/visits/${visit.id}/rehearse`}
            className="block rounded-xl border border-slate-200 bg-white p-4 text-sm active:bg-slate-50"
          >
            <span className="font-medium text-emerald-700">{t('packet.rehearse')}</span>
            <span className="mt-0.5 block text-slate-600">
              {t('packet.rehearse_hint', { name: server.teacher_name.split(' ')[0] })}
            </span>
          </Link>

          <Link
            to={`/visits/${visit.id}/report`}
            className="block rounded-xl border border-slate-200 bg-white p-4 text-sm active:bg-slate-50"
          >
            <span className="font-medium text-emerald-700">{t('report.link')}</span>
            <span className="mt-0.5 block text-slate-600">{t('report.link_hint')}</span>
          </Link>

          <Evidence packet={packet} />
          <Transcripts server={server} />
        </>
      )}
    </div>
  )
}

// Editable packet. Edits are kept on the phone as the mentor types, and sent to the server on approve.
function PacketForm({ visit, packet, language, onApproved }) {
  const t = useT()
  const online = useOnline()
  const original = toForm(packet)
  const [form, setForm] = useState(visit.packet_draft ?? original)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const edited = FIELDS.some(({ key }) => form[key] !== original[key])
  // Notes meant for the mentor, like "[CRP: add an example]", must be removed before the teacher sees the packet.
  const notesLeft = FIELDS.filter(({ key }) => hasCrpNote(form[key]))

  function change(key, value) {
    const next = { ...form, [key]: value }
    setForm(next)
    updateVisit(visit.id, { packet_draft: next })
  }

  function undoEdits() {
    setForm(original)
    updateVisit(visit.id, { packet_draft: null })
  }

  async function approve() {
    if (!window.confirm(t('packet.confirm'))) return
    setSaving(true)
    setError(null)
    try {
      onApproved(await approvePacket(visit, edited ? toEdits(form) : null))
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <>
      <p className="rounded-lg bg-slate-100 p-3 text-xs text-slate-600">{t('packet.edit_hint')}</p>

      {FIELDS.map(({ key, hint }) => (
        <label key={key} className="block space-y-1">
          <span className="font-medium">{t(`field.${key}`)}</span>
          {hint && <span className="ml-2 text-xs text-slate-500">{t(hint)}</span>}
          <textarea
            lang={language}
            value={form[key]}
            onChange={(event) => change(key, event.target.value)}
            className={`field-sizing-content min-h-16 w-full rounded-xl border bg-white p-3 text-sm ${
              hasCrpNote(form[key]) ? 'border-rose-400 ring-2 ring-rose-100' : 'border-slate-200'
            }`}
          />
          {hasCrpNote(form[key]) && <span className="block text-xs text-rose-700">{t('packet.note_warning')}</span>}
        </label>
      ))}

      {edited && (
        <button onClick={undoEdits} className="text-sm text-slate-600 underline">
          {t('packet.undo')}
        </button>
      )}

      <div className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-md space-y-1 px-4 py-3">
          {error && <p className="text-sm text-red-600">{t('packet.approve_error', { error })}</p>}
          {notesLeft.length > 0 && (
            <p className="text-sm text-rose-700">
              {t('packet.remove_note', { fields: notesLeft.map(({ key }) => t(`field.${key}`)).join(', ') })}
            </p>
          )}
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-slate-600">
              {!online ? t('packet.offline_edits') : edited ? t('packet.edited') : t('packet.no_edits')}
            </p>
            <button
              onClick={approve}
              disabled={!online || saving || notesLeft.length > 0}
              className="rounded-lg bg-emerald-700 px-4 py-3 font-medium text-white disabled:opacity-50"
            >
              {saving ? t('packet.approving') : t('packet.approve')}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

function ApprovedPacket({ packet, language }) {
  const t = useT()
  return FIELDS.map(({ key, list }) => (
    <section key={key} className="space-y-1">
      <h2 className="font-medium">{t(`field.${key}`)}</h2>
      {list ? (
        <ol lang={language} className="list-decimal space-y-1 pl-5 text-sm">
          {packet[key].map((line, index) => (
            <li key={index}>{line}</li>
          ))}
        </ol>
      ) : (
        <p lang={language} className="whitespace-pre-line text-sm">
          {packet[key]}
        </p>
      )}
    </section>
  ))
}

// After approval: the WhatsApp message for the teacher, with the advice in their language and the link for details.
function ShareLink({ server }) {
  const t = useT()
  const [copied, setCopied] = useState(false)
  const url = `${window.location.origin}/t/${server.share_token}`
  const message = whatsappMessage(server, url)
  const firstName = server.teacher_name.split(' ')[0]

  async function shareOther() {
    await navigator.share({ title: 'VisitCoach', text: message }).catch(() => {})
  }

  async function copy() {
    await navigator.clipboard.writeText(message)
    setCopied(true)
  }

  return (
    <section className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
      <p className="font-medium">{t('share.title', { name: firstName })}</p>
      <p lang={server.language} className="whitespace-pre-wrap rounded-lg bg-white p-3 text-slate-800 shadow-sm">
        {message}
      </p>
      <div className="flex flex-wrap gap-3">
        <a
          href={whatsappUrl(message)}
          target="_blank"
          rel="noreferrer"
          className="rounded-lg bg-emerald-700 px-3 py-2 font-medium text-white"
        >
          {t('share.whatsapp')}
        </a>
        {navigator.share && (
          <button onClick={shareOther} className="rounded-lg px-3 py-2 text-emerald-800 underline">
            {t('share.other')}
          </button>
        )}
        {navigator.clipboard && (
          <button onClick={copy} className="rounded-lg px-3 py-2 text-emerald-800 underline">
            {copied ? t('share.copied') : t('share.copy')}
          </button>
        )}
      </div>
    </section>
  )
}

// Why Claude chose this priority, and where the advice comes from. For the mentor only.
// Claude writes the evidence in English, and the source quotes are from English documents.
function Evidence({ packet }) {
  const t = useT()
  return (
    <section className="space-y-2 rounded-xl border border-slate-200 bg-white p-4 text-sm">
      <h2 className="font-medium">{t('evidence.title')}</h2>
      <ul lang="en" className="list-disc space-y-1 pl-5 text-slate-700">
        {packet.evidence.map((line, index) => (
          <li key={index}>{line}</li>
        ))}
      </ul>
      <details className="text-slate-600">
        <summary className="cursor-pointer text-emerald-700">{t('evidence.sources', { n: packet.sources.length })}</summary>
        <ul lang="en" className="mt-2 space-y-2">
          {packet.sources.map((source) => (
            <li key={source.id}>
              <p className="font-medium">{t('evidence.page', { document: source.document, page: source.page })}</p>
              <p className="italic">“{source.text}”</p>
            </li>
          ))}
        </ul>
      </details>
    </section>
  )
}

// What the mentor said and typed, as the server understood it. Checking this catches speech-to-text mistakes.
function Transcripts({ server }) {
  const t = useT()
  const notes = server.notes ?? []
  if (notes.length === 0 && !server.typed_note) return null

  return (
    <details className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
      <summary className="cursor-pointer font-medium text-emerald-700">
        {t('transcripts.title', { n: notes.length + (server.typed_note ? 1 : 0) })}
      </summary>
      <ol className="mt-2 space-y-2">
        {notes.map((note, index) => (
          <li key={note.id} lang={server.language} className="rounded-lg bg-slate-50 p-2">
            <span className="mr-1 text-xs font-medium text-slate-500">{t('transcripts.voice', { n: index + 1 })}</span>
            {note.transcript || <span className="italic text-slate-500">{t('transcripts.nothing')}</span>}
          </li>
        ))}
        {server.typed_note && (
          <li lang={server.language} className="rounded-lg bg-slate-50 p-2">
            <span className="mr-1 text-xs font-medium text-slate-500">{t('transcripts.typed')}</span>
            {server.typed_note}
          </li>
        )}
      </ol>
      <p className="mt-2 text-xs text-slate-500">{t('transcripts.fix')}</p>
    </details>
  )
}

// Lists are edited as one item per line.
function toForm(packet) {
  return Object.fromEntries(FIELDS.map(({ key, list }) => [key, list ? packet[key].join('\n') : packet[key]]))
}

function toEdits(form) {
  return Object.fromEntries(FIELDS.map(({ key, list }) => [key, list ? form[key].split('\n') : form[key]]))
}
