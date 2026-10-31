import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getRubric } from '../api/rubric.js'
import { reviewVisit } from '../api/visits.js'
import { db } from '../lib/db.js'
import { itemText } from '../lib/format.js'
import { plural, useLanguage, useT } from '../lib/i18n.js'
import { useOnline } from '../lib/offline.js'
import { hasPacket, syncAll, visitStatus } from '../lib/sync.js'
import { useFetch } from '../lib/useFetch.js'
import { MAX_NOTE_SECONDS, useRecorder } from '../lib/useRecorder.js'
import { addNote, deleteNote, endVisit, rateItem, reopenVisit, updateVisit } from '../lib/visits.js'

const RATINGS = [
  { value: 'yes', on: 'bg-emerald-600 text-white border-emerald-600' },
  { value: 'partly', on: 'bg-amber-500 text-white border-amber-500' },
  { value: 'no', on: 'bg-rose-600 text-white border-rose-600' },
]

// In class: tick the state checklist, keep notes beside it, record short voice notes. Everything saves to the
// phone as you go. Before ending, "Did I miss anything?" compares the ticks with the notes.
export default function Observe() {
  const t = useT()
  const language = useLanguage()
  const { visitId } = useParams()
  const visit = useLiveQuery(() => db.visits.get(visitId), [visitId])
  const notes = useLiveQuery(() => db.notes.where('visit_id').equals(visitId).sortBy('created_at'), [visitId])
  const { data: rubric, error } = useFetch(() => getRubric(), [])
  const [notesOpen, setNotesOpen] = useState(false) // the notes drawer on phones (always shown beside on wide screens)
  const [noteDraft, setNoteDraft] = useState(null) // the typed note while editing; saved to the phone on every change
  const [reviewing, setReviewing] = useState(false)

  if (error) return <p className="text-red-600">{t('observe.error', { error })}</p>
  if (visit === undefined || !rubric || !notes) return <p className="text-slate-500">{t('common.loading')}</p>
  if (visit === null) return <p className="text-red-600">{t('observe.not_here')}</p>

  const items = rubric.items.filter((item) => item.subject === 'both' || item.subject === visit.subject)
  const ratedCount = items.filter((item) => visit.rubric[item.id]).length
  const ended = visit.status !== 'draft'
  const typedNote = noteDraft ?? visit.typed_note

  function changeNote(text) {
    setNoteDraft(text)
    updateVisit(visit.id, { typed_note: text })
  }

  // From a checklist item: start a new note line about it, then open the notes.
  function noteAbout(item) {
    const before = typedNote.trimEnd()
    changeNote(`${before}${before ? '\n' : ''}• ${itemText(item, language)}: `)
    setNotesOpen(true)
  }

  async function end() {
    setReviewing(false)
    await endVisit({ ...visit, typed_note: typedNote }, items.map((item) => item.id))
    syncAll()
  }

  const notesPanel = (
    <NotesPanel visit={visit} notes={notes} text={typedNote} onChange={changeNote} disabled={ended} />
  )

  return (
    <div className="pb-28 md:grid md:grid-cols-[minmax(0,1fr)_22rem] md:items-start md:gap-6">
      <div className="space-y-5">
        <Link to={`/schools/${visit.school_id}`} className="text-sm text-emerald-700">
          ← {visit.school_name}
        </Link>

        <div>
          <h1 className="text-xl font-semibold">{visit.teacher_name}</h1>
          <p className="text-sm text-slate-500">
            {t('school.grade', { grade: visit.grade })} · {visit.school_name}
          </p>
        </div>

        {ended && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
            <p className="font-medium">{t('observe.ended')}</p>
            <p className="mt-1">
              {visit.status === 'ready'
                ? t('observe.will_send')
                : t('observe.sent', { status: t(visitStatus(visit).key) })}
            </p>
            <div className="mt-3 flex gap-3">
              {hasPacket(visit) ? (
                <Link to={`/visits/${visit.id}/packet`} className="rounded-lg bg-emerald-700 px-3 py-2 font-medium text-white">
                  {t('observe.open_packet')}
                </Link>
              ) : (
                <Link to="/" className="rounded-lg bg-emerald-700 px-3 py-2 font-medium text-white">
                  {t('observe.back')}
                </Link>
              )}
              {visit.status === 'ready' && (
                <button onClick={() => reopenVisit(visit.id)} className="rounded-lg px-3 py-2 text-emerald-800 underline">
                  {t('observe.edit')}
                </button>
              )}
            </div>
          </div>
        )}

        <SubjectPicker visit={visit} disabled={ended} />

        <ClassContext visit={visit} disabled={ended} />

        <p className="text-xs text-slate-500">{t('observe.kpalp_note')}</p>

        <p className="rounded-lg bg-slate-100 p-3 text-xs text-slate-600">{t('observe.privacy')}</p>

        <RubricSections rubric={rubric} items={items} visit={visit} disabled={ended} onNote={noteAbout} />
      </div>

      {/* Wide screens: notes beside the checklist. Phones: a drawer opened from the bottom bar. */}
      <aside className="hidden md:sticky md:top-20 md:block">{notesPanel}</aside>
      {notesOpen && (
        <div className="fixed inset-0 z-30 md:hidden">
          <button aria-label={t('notes.close')} onClick={() => setNotesOpen(false)} className="absolute inset-0 bg-slate-950/40" />
          <div className="absolute inset-x-0 bottom-0 max-h-[80vh] overflow-y-auto rounded-t-2xl bg-slate-50 p-4 shadow-2xl">
            <div className="mb-2 flex justify-end">
              <button onClick={() => setNotesOpen(false)} className="rounded-lg px-3 py-1 text-sm font-medium text-emerald-700">
                {t('notes.close')}
              </button>
            </div>
            {notesPanel}
          </div>
        </div>
      )}

      {reviewing && (
        <EndVisitReview
          visit={visit}
          items={items}
          typedNote={typedNote}
          hasVoiceNotes={notes.length > 0}
          onClose={() => setReviewing(false)}
          onEnd={end}
        />
      )}

      {!ended && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 backdrop-blur">
          <div className="mx-auto flex max-w-md items-center justify-between gap-3 px-4 py-3 md:max-w-5xl">
            <p className="text-sm text-slate-600">
              {t('observe.rated', { rated: ratedCount, total: items.length })} · {plural(t, 'observe.notes', notes.length)}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setNotesOpen(true)}
                className="rounded-lg border border-slate-300 px-3 py-3 text-sm font-medium text-slate-700 md:hidden"
              >
                {t('notes.open')}
              </button>
              <button
                onClick={() => setReviewing(true)}
                disabled={ratedCount === 0 && notes.length === 0 && !typedNote.trim()}
                className="rounded-lg bg-emerald-700 px-4 py-3 font-medium text-white disabled:opacity-50"
              >
                {t('observe.end')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Shown when the mentor taps End visit: unrated items (on the phone, works offline), then Claude's check of
// ticks against notes (needs internet). The mentor can go back and fix, or end anyway.
function EndVisitReview({ visit, items, typedNote, hasVoiceNotes, onClose, onEnd }) {
  const t = useT()
  const language = useLanguage()
  const online = useOnline()
  const unrated = items.filter((item) => !visit.rubric[item.id])
  const { data: review, error, loading } = useFetch(
    () =>
      online
        ? reviewVisit({
            checklist_id: visit.checklist_id ?? null,
            rubric: Object.fromEntries(Object.entries(visit.rubric).filter(([id]) => items.some((i) => i.id === id))),
            typed_note: typedNote,
            grade: visit.grade,
            subject: visit.subject,
            language,
          })
        : Promise.resolve(null),
    [],
  )
  const itemById = Object.fromEntries(items.map((item) => [item.id, item]))
  const allGood = review && unrated.length === 0 && !review.mismatches.length && !review.missed.length

  function goTo(itemId) {
    onClose()
    setTimeout(() => document.getElementById(`item-${itemId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50)
  }

  return (
    <div className="fixed inset-0 z-40">
      <button aria-label={t('review.back')} onClick={onClose} className="absolute inset-0 bg-slate-950/40" />
      <div className="absolute inset-x-0 bottom-0 mx-auto max-h-[85vh] max-w-xl space-y-4 overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl md:bottom-auto md:top-16 md:rounded-2xl">
        <h2 className="text-lg font-semibold">{t('review.title')}</h2>

        {unrated.length > 0 && (
          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-amber-800">{plural(t, 'review.unrated', unrated.length)}</h3>
            <ul className="space-y-1 text-sm">
              {unrated.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-3 rounded-lg bg-amber-50 px-3 py-2">
                  <span>{itemText(item, language)}</span>
                  <button onClick={() => goTo(item.id)} className="shrink-0 text-emerald-700 underline">
                    {t('review.go')}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {!online && <p className="rounded-lg bg-slate-100 p-3 text-sm text-slate-600">{t('review.offline')}</p>}
        {online && loading && <p className="animate-pulse text-sm text-slate-500">{t('review.checking')}</p>}
        {error && <p className="text-sm text-red-600">{t('review.error', { error })}</p>}

        {review?.mismatches.length > 0 && (
          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-rose-800">{t('review.mismatch_title')}</h3>
            <ul className="space-y-2 text-sm">
              {review.mismatches.map((mismatch, index) => (
                <li key={index} className="rounded-lg bg-rose-50 px-3 py-2">
                  <p className="font-medium">
                    {itemById[mismatch.item_id] ? itemText(itemById[mismatch.item_id], language) : mismatch.item_id} ·{' '}
                    {t(`rating.${visit.rubric[mismatch.item_id] ?? 'no'}`)}
                  </p>
                  <p className="text-slate-700">“{mismatch.notes_say}”</p>
                  <p className="text-slate-600">{mismatch.suggestion}</p>
                  <button onClick={() => goTo(mismatch.item_id)} className="mt-1 text-emerald-700 underline">
                    {t('review.go')}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {review?.missed.length > 0 && (
          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-sky-800">{t('review.missed_title')}</h3>
            <ul className="space-y-2 text-sm">
              {review.missed.map((missed, index) => (
                <li key={index} className="rounded-lg bg-sky-50 px-3 py-2">
                  <p className="font-medium">{missed.point}</p>
                  <p className="text-slate-600">{missed.why}</p>
                </li>
              ))}
            </ul>
            <p className="text-xs text-slate-500">{t('review.missed_hint')}</p>
          </section>
        )}

        {allGood && <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900">✓ {t('review.all_good')}</p>}
        {hasVoiceNotes && <p className="text-xs text-slate-500">{t('review.voice')}</p>}

        <div className="flex flex-wrap justify-end gap-2 pt-2">
          <button onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-3 font-medium text-slate-700">
            {t('review.back')}
          </button>
          <button onClick={onEnd} className="rounded-lg bg-emerald-700 px-4 py-3 font-medium text-white">
            {allGood || (!online && unrated.length === 0) ? t('review.end') : t('review.end_anyway')}
          </button>
        </div>
      </div>
    </div>
  )
}

function SubjectPicker({ visit, disabled }) {
  const t = useT()
  return (
    <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
      {['literacy', 'numeracy'].map((subject) => (
        <button
          key={subject}
          disabled={disabled}
          onClick={() => updateVisit(visit.id, { subject })}
          className={`rounded-lg py-2 text-sm font-medium ${
            visit.subject === subject ? 'bg-white shadow-sm' : 'text-slate-500'
          }`}
        >
          {t(`subject.${subject}`)}
        </button>
      ))}
    </div>
  )
}

// Class size and multi-grade, so Claude picks a practice that fits the class (MENTOR.md #7, #8).
function ClassContext({ visit, disabled }) {
  const t = useT()
  const grades = visit.grades_together ?? [visit.grade]

  function toggleGrade(grade) {
    const next = grades.includes(grade) ? grades.filter((g) => g !== grade) : [...grades, grade].sort()
    updateVisit(visit.id, { grades_together: next })
  }

  return (
    <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
      <label className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium">{t('class.children')}</span>
        <input
          type="number"
          inputMode="numeric"
          min="0"
          max="200"
          disabled={disabled}
          value={visit.children_present ?? ''}
          onChange={(event) =>
            updateVisit(visit.id, {
              children_present: event.target.value === '' ? null : Math.min(200, Math.max(0, Number(event.target.value))),
            })
          }
          className="w-24 rounded-lg border border-slate-200 p-2 text-right disabled:bg-slate-50"
        />
      </label>
      <div className="text-sm">
        <p className="font-medium">{t('class.grades')}</p>
        <div className="mt-2 grid grid-cols-5 gap-2">
          {[1, 2, 3, 4, 5].map((grade) => (
            <button
              key={grade}
              disabled={disabled}
              onClick={() => toggleGrade(grade)}
              aria-pressed={grades.includes(grade)}
              className={`min-h-11 rounded-lg border font-medium ${
                grades.includes(grade) ? 'border-emerald-700 bg-emerald-700 text-white' : 'border-slate-200 bg-white'
              } disabled:opacity-60`}
            >
              {grade}
            </button>
          ))}
        </div>
        {grades.length > 1 && (
          <p className="mt-2 text-xs text-slate-500">{t('class.multigrade')}</p>
        )}
      </div>
    </section>
  )
}

function RubricSections({ rubric, items, visit, disabled, onNote }) {
  const t = useT()
  // Group items under their need area, in the rubric's order.
  const sections = rubric.need_areas
    .map((area) => ({ area, items: items.filter((item) => item.need_area === area.id) }))
    .filter((section) => section.items.length)

  return sections.map(({ area, items }) => (
    <section key={area.id} className="space-y-2">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{t(`need.${area.id}`)}</h2>
      {items.map((item) => (
        <RubricItem key={item.id} item={item} visit={visit} disabled={disabled} onNote={onNote} />
      ))}
    </section>
  ))
}

function RubricItem({ item, visit, disabled, onNote }) {
  const t = useT()
  const uiLanguage = useLanguage()
  const rating = visit.rubric[item.id]
  // In English, also show the item in the teacher's language: the words the mentor will use with them.
  const teacherWords = uiLanguage === 'en' && visit.language !== 'en' ? item.text[visit.language] : null
  const lookFor = t(`look_for.${item.id}`)

  return (
    <div id={`item-${item.id}`} className="scroll-mt-24 rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium">{itemText(item, uiLanguage)}</p>
        {!disabled && (
          <button
            onClick={() => onNote(item)}
            aria-label={t('notes.about')}
            title={t('notes.about')}
            className="shrink-0 rounded-lg px-1.5 text-lg leading-none"
          >
            📝
          </button>
        )}
      </div>
      {teacherWords && (
        <p lang={visit.language} className="mt-0.5 text-sm text-slate-500">
          {teacherWords}
        </p>
      )}
      {item.kpalp && (
        <p className="mt-1 text-xs text-slate-500">
          {t('rubric.kpalp', { code: item.kpalp, area: t(`kpalp.${item.kpalp[0]}`) })}
        </p>
      )}
      <details className="mt-1 text-sm text-slate-500">
        <summary className="cursor-pointer text-emerald-700">{t('rubric.good')}</summary>
        <p className="mt-1">{lookFor === `look_for.${item.id}` ? item.look_for : lookFor}</p>
      </details>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {RATINGS.map(({ value, on }) => (
          <button
            key={value}
            disabled={disabled}
            aria-pressed={rating === value}
            onClick={() => rateItem(visit.id, item.id, value)}
            className={`min-h-12 rounded-lg border text-sm font-medium ${
              rating === value ? on : 'border-slate-200 bg-white text-slate-700'
            } disabled:opacity-60`}
          >
            {t(`rating.${value}`)}
          </button>
        ))}
      </div>
    </div>
  )
}

function VoiceNotes({ visitId, notes, disabled }) {
  const t = useT()
  const recorder = useRecorder((audio, mime, seconds) => addNote(visitId, audio, mime, seconds))

  return (
    <section className="space-y-2">
      <h2 className="font-medium">{t('voice.title')}</h2>
      <p className="text-sm text-slate-500">{t('voice.hint', { seconds: MAX_NOTE_SECONDS })}</p>

      {!disabled && (
        <button
          onClick={recorder.recording ? recorder.stop : recorder.start}
          className={`flex min-h-14 w-full items-center justify-center gap-2 rounded-xl text-base font-medium text-white ${
            recorder.recording ? 'bg-rose-600' : 'bg-slate-800'
          }`}
        >
          {recorder.recording ? (
            <>
              <span className="h-3 w-3 animate-pulse rounded-full bg-white" />
              {t('voice.stop')} · {formatSeconds(recorder.seconds)} / {formatSeconds(MAX_NOTE_SECONDS)}
            </>
          ) : (
            t('voice.record')
          )}
        </button>
      )}
      {recorder.error && <p className="text-sm text-red-600">{t(recorder.error)}</p>}

      {notes.map((note, index) => (
        <NoteRow key={note.id} note={note} number={index + 1} disabled={disabled} />
      ))}
    </section>
  )
}

function NoteRow({ note, number, disabled }) {
  const t = useT()
  const url = useMemo(() => URL.createObjectURL(note.audio), [note.audio])
  useEffect(() => () => URL.revokeObjectURL(url), [url])

  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
      <span className="text-sm font-medium text-slate-600">
        #{number} · {formatSeconds(note.duration_s)}
      </span>
      <audio src={url} controls className="h-10 min-w-0 flex-1" />
      {!disabled && (
        <button
          onClick={() => deleteNote(note.id)}
          className="text-sm text-rose-700"
          aria-label={t('voice.delete_label', { n: number })}
        >
          {t('voice.delete')}
        </button>
      )}
    </div>
  )
}

// The mentor's notes: typed (or dictated with the keyboard's mic) and short voice notes. Saved to the phone
// as they type. The text lives in Observe, so a checklist item's 📝 can add a line to it.
function NotesPanel({ visit, notes, text, onChange, disabled }) {
  const t = useT()
  return (
    <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="font-medium">{t('notes.title')}</h2>
      {!disabled && <p className="text-xs text-slate-500">{t('notes.hint')}</p>}
      <textarea
        value={text}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        rows={10}
        placeholder={t('notes.placeholder')}
        className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm disabled:bg-slate-50"
      />
      <VoiceNotes visitId={visit.id} notes={notes} disabled={disabled} />
    </section>
  )
}

function formatSeconds(seconds) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}
