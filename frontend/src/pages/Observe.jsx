import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getRubric } from '../api/rubric.js'
import { db } from '../lib/db.js'
import { hasPacket, syncAll, visitStatus } from '../lib/sync.js'
import { useFetch } from '../lib/useFetch.js'
import { MAX_NOTE_SECONDS, useRecorder } from '../lib/useRecorder.js'
import { addNote, deleteNote, endVisit, rateItem, reopenVisit, updateVisit } from '../lib/visits.js'

const RATINGS = [
  { value: 'yes', label: 'Yes', on: 'bg-emerald-600 text-white border-emerald-600' },
  { value: 'partly', label: 'Partly', on: 'bg-amber-500 text-white border-amber-500' },
  { value: 'no', label: 'No', on: 'bg-rose-600 text-white border-rose-600' },
]

// In class: tap rubric items and record short voice notes. Everything saves to the phone as you go.
export default function Observe() {
  const { visitId } = useParams()
  const visit = useLiveQuery(() => db.visits.get(visitId), [visitId])
  const notes = useLiveQuery(() => db.notes.where('visit_id').equals(visitId).sortBy('created_at'), [visitId])
  const { data: rubric, error } = useFetch(() => getRubric(), [])

  if (error) return <p className="text-red-600">Could not load the rubric: {error}</p>
  if (visit === undefined || !rubric || !notes) return <p className="text-slate-500">Loading…</p>
  if (visit === null) return <p className="text-red-600">This visit is not on this phone.</p>

  const items = rubric.items.filter((item) => item.subject === 'both' || item.subject === visit.subject)
  const ratedCount = items.filter((item) => visit.rubric[item.id]).length
  const ended = visit.status !== 'draft'

  return (
    <div className="space-y-5 pb-28">
      <Link to={`/schools/${visit.school_id}`} className="text-sm text-emerald-700">
        ← {visit.school_name}
      </Link>

      <div>
        <h1 className="text-xl font-semibold">{visit.teacher_name}</h1>
        <p className="text-sm text-slate-500">
          Grade {visit.grade} · {visit.school_name}
        </p>
      </div>

      {ended && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          <p className="font-medium">Visit ended and saved on this phone.</p>
          <p className="mt-1">
            {visit.status === 'ready'
              ? 'It will be sent for a coaching packet as soon as the phone is online.'
              : `Sent to the server · ${visitStatus(visit).label}`}
          </p>
          <div className="mt-3 flex gap-3">
            {hasPacket(visit) ? (
              <Link to={`/visits/${visit.id}/packet`} className="rounded-lg bg-emerald-700 px-3 py-2 font-medium text-white">
                Open packet
              </Link>
            ) : (
              <Link to="/" className="rounded-lg bg-emerald-700 px-3 py-2 font-medium text-white">
                Back to schools
              </Link>
            )}
            {visit.status === 'ready' && (
              <button onClick={() => reopenVisit(visit.id)} className="rounded-lg px-3 py-2 text-emerald-800 underline">
                Edit visit
              </button>
            )}
          </div>
        </div>
      )}

      <SubjectPicker visit={visit} disabled={ended} />

      <ClassContext visit={visit} disabled={ended} />

      <p className="text-xs text-slate-500">
        A reading and maths add-on to your state's classroom observation (KPALP). Use both as usual.
      </p>

      <p className="rounded-lg bg-slate-100 p-3 text-xs text-slate-600">
        Record your notes after class or away from children. Do not say children's names.
      </p>

      <RubricSections rubric={rubric} items={items} visit={visit} disabled={ended} />

      <VoiceNotes visitId={visit.id} notes={notes} disabled={ended} />

      <TypedNote visit={visit} disabled={ended} />

      {!ended && (
        <div className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white/95 backdrop-blur">
          <div className="mx-auto flex max-w-md items-center justify-between gap-3 px-4 py-3">
            <p className="text-sm text-slate-600">
              {ratedCount}/{items.length} rated · {notes.length} {notes.length === 1 ? 'note' : 'notes'}
            </p>
            <button
              onClick={() => endVisit(visit, items.map((item) => item.id)).then(syncAll)}
              disabled={ratedCount === 0 && notes.length === 0 && !visit.typed_note.trim()}
              className="rounded-lg bg-emerald-700 px-4 py-3 font-medium text-white disabled:opacity-50"
            >
              End visit
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function SubjectPicker({ visit, disabled }) {
  return (
    <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
      {['literacy', 'numeracy'].map((subject) => (
        <button
          key={subject}
          disabled={disabled}
          onClick={() => updateVisit(visit.id, { subject })}
          className={`rounded-lg py-2 text-sm font-medium capitalize ${
            visit.subject === subject ? 'bg-white shadow-sm' : 'text-slate-500'
          }`}
        >
          {subject}
        </button>
      ))}
    </div>
  )
}

// Class size and multi-grade, so Claude picks a practice that fits the class (MENTOR.md #7, #8).
function ClassContext({ visit, disabled }) {
  const grades = visit.grades_together ?? [visit.grade]

  function toggleGrade(grade) {
    const next = grades.includes(grade) ? grades.filter((g) => g !== grade) : [...grades, grade].sort()
    updateVisit(visit.id, { grades_together: next })
  }

  return (
    <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
      <label className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium">Children present</span>
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
        <p className="font-medium">Grades sitting together</p>
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
          <p className="mt-2 text-xs text-slate-500">Multi-grade class: the practice will work across these grades.</p>
        )}
      </div>
    </section>
  )
}

function RubricSections({ rubric, items, visit, disabled }) {
  // Group items under their need area, in the rubric's order.
  const sections = rubric.need_areas
    .map((area) => ({ area, items: items.filter((item) => item.need_area === area.id) }))
    .filter((section) => section.items.length)

  return sections.map(({ area, items }) => (
    <section key={area.id} className="space-y-2">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{area.label}</h2>
      {items.map((item) => (
        <RubricItem
          key={item.id}
          item={item}
          visit={visit}
          disabled={disabled}
          indicator={rubric.state_checklist?.indicators[item.kpalp]}
        />
      ))}
    </section>
  ))
}

function RubricItem({ item, visit, disabled, indicator }) {
  const rating = visit.rubric[item.id]
  const local = item.text[visit.language]

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="font-medium">{local ?? item.text.en}</p>
      {local && <p className="mt-0.5 text-sm text-slate-500">{item.text.en}</p>}
      {indicator && (
        <p className="mt-1 text-xs text-slate-500" title={indicator}>
          Adds detail to KPALP {item.kpalp} · {indicator.split(':')[0]}
        </p>
      )}
      <details className="mt-1 text-sm text-slate-500">
        <summary className="cursor-pointer text-emerald-700">What good looks like</summary>
        <p className="mt-1">{item.look_for}</p>
      </details>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {RATINGS.map(({ value, label, on }) => (
          <button
            key={value}
            disabled={disabled}
            aria-pressed={rating === value}
            onClick={() => rateItem(visit.id, item.id, value)}
            className={`min-h-12 rounded-lg border text-sm font-medium ${
              rating === value ? on : 'border-slate-200 bg-white text-slate-700'
            } disabled:opacity-60`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}

function VoiceNotes({ visitId, notes, disabled }) {
  const recorder = useRecorder((audio, mime, seconds) => addNote(visitId, audio, mime, seconds))

  return (
    <section className="space-y-2">
      <h2 className="font-medium">Voice notes</h2>
      <p className="text-sm text-slate-500">Short notes, up to {MAX_NOTE_SECONDS} seconds each. Record as many as you need.</p>

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
              Stop · {formatSeconds(recorder.seconds)} / {formatSeconds(MAX_NOTE_SECONDS)}
            </>
          ) : (
            '🎙 Record a note'
          )}
        </button>
      )}
      {recorder.error && <p className="text-sm text-red-600">{recorder.error}</p>}

      {notes.map((note, index) => (
        <NoteRow key={note.id} note={note} number={index + 1} disabled={disabled} />
      ))}
    </section>
  )
}

function NoteRow({ note, number, disabled }) {
  const url = useMemo(() => URL.createObjectURL(note.audio), [note.audio])
  useEffect(() => () => URL.revokeObjectURL(url), [url])

  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
      <span className="text-sm font-medium text-slate-600">
        #{number} · {formatSeconds(note.duration_s)}
      </span>
      <audio src={url} controls className="h-10 min-w-0 flex-1" />
      {!disabled && (
        <button onClick={() => deleteNote(note.id)} className="text-sm text-rose-700" aria-label={`Delete note ${number}`}>
          Delete
        </button>
      )}
    </div>
  )
}

// Local state while typing; each change is also saved to the phone.
function TypedNote({ visit, disabled }) {
  const [text, setText] = useState(visit.typed_note)

  return (
    <section className="space-y-2">
      <h2 className="font-medium">Typed note (optional)</h2>
      <textarea
        value={text}
        disabled={disabled}
        onChange={(event) => {
          setText(event.target.value)
          updateVisit(visit.id, { typed_note: event.target.value })
        }}
        rows={3}
        placeholder="Anything you want to add, in any language"
        className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm disabled:bg-slate-50"
      />
    </section>
  )
}

function formatSeconds(seconds) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}
