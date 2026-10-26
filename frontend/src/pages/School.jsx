import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getRubric } from '../api/rubric.js'
import { getSchool } from '../api/schools.js'
import FocusBadge from '../components/FocusBadge.jsx'
import { db } from '../lib/db.js'
import { formatDate } from '../lib/format.js'
import { recordFollowUp } from '../lib/followups.js'
import { useFetch } from '../lib/useFetch.js'
import { startVisit } from '../lib/visits.js'

// One school: suggested focus, last visit's agreed actions to check, and the teachers the CRP can observe.
export default function School() {
  const { schoolId } = useParams()
  const { data: school, error, loading } = useFetch(() => getSchool(schoolId), [schoolId])
  // Loading the rubric here also saves it on the phone before the CRP walks into class.
  const { data: rubric } = useFetch(() => getRubric(), [])
  const drafts = useLiveQuery(
    () =>
      db.visits
        .where('school_id')
        .equals(Number(schoolId))
        .filter((visit) => visit.status === 'draft')
        .toArray(),
    [schoolId],
  )
  // Follow-ups answered on this phone, sent or not yet sent.
  const answered = useLiveQuery(() => db.outbox.where('kind').equals('followup').toArray(), [])
  const navigate = useNavigate()

  async function openVisit(teacher) {
    const draft = drafts?.find((visit) => visit.teacher_id === teacher.id)
    const visitId = draft ? draft.id : await startVisit(school, teacher, rubric.version)
    navigate(`/visits/${visitId}`)
  }

  if (loading) return <p className="text-slate-500">Loading…</p>
  if (error) return <p className="text-red-600">Could not load school: {error}</p>

  const answerFor = (visitId) => answered?.find((row) => row.visit_id === visitId)

  return (
    <div className="space-y-4">
      <Link to="/" className="text-sm text-emerald-700">
        ← All schools
      </Link>

      <div>
        <h1 className="text-xl font-semibold">{school.name}</h1>
        <p className="text-sm text-slate-500">{school.village}</p>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <FocusBadge area={school.focus.area} />
        <p className="mt-2 text-sm text-slate-700">{school.focus.reason}</p>
      </section>

      <section className="space-y-2">
        <h2 className="font-medium">Teachers</h2>
        {school.teachers.map((teacher) => {
          const followUp = school.open_followups?.find((open) => open.teacher_id === teacher.id)
          return (
            <div key={teacher.id} className="rounded-xl border border-slate-200 bg-white">
              <div className="flex items-center justify-between p-4">
                <div>
                  <p className="font-medium">{teacher.name}</p>
                  <p className="text-sm text-slate-500">Grade {teacher.grade}</p>
                </div>
                <button
                  onClick={() => openVisit(teacher)}
                  disabled={!rubric || !drafts}
                  className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  {drafts?.some((visit) => visit.teacher_id === teacher.id) ? 'Continue visit' : 'Start visit'}
                </button>
              </div>
              {/* Wait for the phone's saved answers, so an answered follow-up doesn't flash as unanswered. */}
              {followUp && answered && (
                <FollowUp
                  followUp={followUp}
                  teacher={teacher}
                  language={school.language}
                  answer={answerFor(followUp.visit_id)}
                />
              )}
            </div>
          )
        })}
      </section>
    </div>
  )
}

const RESULTS = [
  { value: 'done', label: '✅ Done', on: 'bg-emerald-600 text-white border-emerald-600' },
  { value: 'partly', label: '🟡 Partly', on: 'bg-amber-500 text-white border-amber-500' },
  { value: 'not_done', label: '❌ Not done', on: 'bg-rose-600 text-white border-rose-600' },
]

// "Last time, the teacher agreed to …. Did it happen?" Saved on the phone, sent when online.
function FollowUp({ followUp, teacher, language, answer }) {
  const [editing, setEditing] = useState(!answer)
  const [status, setStatus] = useState(answer?.body.status ?? null)
  const [note, setNote] = useState(answer?.body.note ?? '')
  const [rating, setRating] = useState(answer?.body.teacher_rating ?? null)

  async function save() {
    await recordFollowUp(followUp.visit_id, { status, note, teacherRating: rating })
    setEditing(false)
  }

  if (answer && !editing) {
    const result = RESULTS.find((option) => option.value === answer.body.status)
    return (
      <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 px-4 py-3 text-sm">
        <p className="text-slate-700">
          Last action checked: <span className="font-medium">{result?.label}</span>
          <span className="ml-2 text-xs text-slate-500">{answer.sent ? 'sent' : 'saved on phone, sends when online'}</span>
        </p>
        <button onClick={() => setEditing(true)} className="shrink-0 text-emerald-700 underline">
          Change
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-3 border-t border-amber-200 bg-amber-50 p-4 text-sm">
      <div>
        <p className="font-medium text-amber-900">From your last visit ({formatDate(followUp.approved_at)})</p>
        <p lang={language} className="mt-1 text-slate-800">
          {teacher.name.split(' ')[0]} agreed: {followUp.follow_up}
        </p>
        {followUp.follow_up_check && (
          <p lang={language} className="mt-1 text-slate-600">
            How to check: {followUp.follow_up_check}
          </p>
        )}
      </div>

      <div>
        <p className="mb-1 font-medium">Did it happen? Check in class, don't just ask.</p>
        <div className="grid grid-cols-3 gap-2">
          {RESULTS.map((option) => (
            <button
              key={option.value}
              onClick={() => setStatus(option.value)}
              aria-pressed={status === option.value}
              className={`min-h-12 rounded-lg border font-medium ${
                status === option.value ? option.on : 'border-slate-200 bg-white text-slate-700'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-1 font-medium">How useful did {teacher.name.split(' ')[0]} find the last advice?</p>
        <div className="grid grid-cols-5 gap-2">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              onClick={() => setRating(rating === value ? null : value)}
              aria-pressed={rating === value}
              className={`min-h-12 rounded-lg border font-medium ${
                rating === value ? 'border-emerald-700 bg-emerald-700 text-white' : 'border-slate-200 bg-white'
              }`}
            >
              {value}
            </button>
          ))}
        </div>
        <p className="mt-1 text-xs text-slate-500">1 = not useful · 5 = very useful (optional)</p>
      </div>

      <textarea
        value={note}
        onChange={(event) => setNote(event.target.value)}
        rows={2}
        placeholder="What did you see? (optional)"
        className="w-full rounded-xl border border-slate-200 bg-white p-3"
      />

      <button
        onClick={save}
        disabled={!status}
        className="w-full rounded-lg bg-amber-600 px-4 py-3 font-medium text-white disabled:opacity-50"
      >
        Save check
      </button>
    </div>
  )
}
