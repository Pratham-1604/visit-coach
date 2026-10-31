import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getRubric } from '../api/rubric.js'
import { getSchool } from '../api/schools.js'
import FocusBadge from '../components/FocusBadge.jsx'
import { db } from '../lib/db.js'
import { focusReason, formatDate, itemText } from '../lib/format.js'
import { recordFollowUp } from '../lib/followups.js'
import { plural, useLanguage, useT } from '../lib/i18n.js'
import { useFetch } from '../lib/useFetch.js'
import { startVisit } from '../lib/visits.js'

// One school: suggested focus, each teacher's coaching history and last agreed action, and who the mentor can observe.
export default function School() {
  const t = useT()
  const { schoolId } = useParams()
  const { data: school, error, loading } = useFetch(() => getSchool(schoolId), [schoolId])
  // Loading the rubric here also saves it on the phone before the mentor walks into class.
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
    const visitId = draft ? draft.id : await startVisit(school, teacher, rubric)
    navigate(`/visits/${visitId}`)
  }

  if (loading) return <p className="text-slate-500">{t('common.loading')}</p>
  if (error) return <p className="text-red-600">{t('school.error', { error })}</p>

  const answerFor = (visitId) => answered?.find((row) => row.visit_id === visitId)

  return (
    <div className="space-y-4">
      <Link to="/" className="text-sm text-emerald-700">
        {t('school.back')}
      </Link>

      <div>
        <h1 className="text-xl font-semibold">{school.name}</h1>
        <p className="text-sm text-slate-500">{school.village}</p>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <FocusBadge area={school.focus.area} />
        <p className="mt-2 text-sm text-slate-700">{focusReason(t, school)}</p>
      </section>

      <section className="space-y-2">
        <h2 className="font-medium">{t('school.teachers')}</h2>
        {school.teachers.map((teacher) => {
          const followUp = school.open_followups?.find((open) => open.teacher_id === teacher.id)
          return (
            <div key={teacher.id} className="rounded-xl border border-slate-200 bg-white">
              <div className="flex items-center justify-between p-4">
                <div>
                  <p className="font-medium">{teacher.name}</p>
                  <p className="text-sm text-slate-500">{t('school.grade', { grade: teacher.grade })}</p>
                </div>
                <button
                  onClick={() => openVisit(teacher)}
                  disabled={!rubric || !drafts}
                  className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  {drafts?.some((visit) => visit.teacher_id === teacher.id) ? t('school.continue') : t('school.start')}
                </button>
              </div>
              <CoachingHistory history={teacher.history ?? []} language={school.language} rubric={rubric} />
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

const RESULT_STYLES = {
  done: 'bg-emerald-100 text-emerald-800',
  partly: 'bg-amber-100 text-amber-800',
  not_done: 'bg-rose-100 text-rose-800',
  open: 'bg-slate-100 text-slate-600',
}

// Every earlier visit, whoever the mentor was, so a new mentor picks up where the last one left off (MENTOR.md #6).
function CoachingHistory({ history, language, rubric }) {
  const t = useT()
  const uiLanguage = useLanguage()
  if (history.length === 0) return null
  const mentors = new Set(history.map((entry) => entry.mentor_name).filter(Boolean))

  // The focus in the mentor's chosen language; the agreed action stays as the teacher read it.
  function focus(entry) {
    const item = rubric?.items.find((i) => i.id === entry.focus_id)
    return item ? itemText(item, uiLanguage) : entry.focus_en
  }

  return (
    <details className="border-t border-slate-100 px-4 py-3 text-sm">
      <summary className="cursor-pointer font-medium text-emerald-700">
        {t('history.title')} · {plural(t, 'history.visits', history.length)}
        {mentors.size > 0 && `, ${plural(t, 'history.mentors', mentors.size)}`}
      </summary>
      <ol className="mt-3 space-y-3">
        {history.map((entry) => {
          const result = entry.result ?? 'open'
          return (
            <li key={entry.visit_id} className="border-l-2 border-emerald-200 pl-3">
              <p className="text-xs text-slate-500">
                {formatDate(entry.date)} · {entry.mentor_name || t('history.no_mentor')}
              </p>
              {focus(entry) && <p className="font-medium">{focus(entry)}</p>}
              {entry.follow_up && (
                <p lang={language} className="text-slate-700">
                  {entry.follow_up}
                </p>
              )}
              <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${RESULT_STYLES[result]}`}>
                {t(`result.${result}`)}
              </span>
            </li>
          )
        })}
      </ol>
    </details>
  )
}

const RESULTS = [
  { value: 'done', icon: '✅', on: 'bg-emerald-600 text-white border-emerald-600' },
  { value: 'partly', icon: '🟡', on: 'bg-amber-500 text-white border-amber-500' },
  { value: 'not_done', icon: '❌', on: 'bg-rose-600 text-white border-rose-600' },
]

// "At the previous visit, the teacher agreed to …. Did it happen?" Saved on the phone, sent when online.
// The previous visit may have been by another mentor, so the card says who.
function FollowUp({ followUp, teacher, language, answer }) {
  const t = useT()
  const [editing, setEditing] = useState(!answer)
  const [status, setStatus] = useState(answer?.body.status ?? null)
  const [note, setNote] = useState(answer?.body.note ?? '')
  const [rating, setRating] = useState(answer?.body.teacher_rating ?? null)
  const firstName = teacher.name.split(' ')[0]

  async function save() {
    await recordFollowUp(followUp.visit_id, { status, note, teacherRating: rating })
    setEditing(false)
  }

  if (answer && !editing) {
    const result = RESULTS.find((option) => option.value === answer.body.status)
    return (
      <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 px-4 py-3 text-sm">
        <p className="text-slate-700">
          {t('followup.checked')}{' '}
          <span className="font-medium">
            {result?.icon} {t(`result.${answer.body.status}`)}
          </span>
          <span className="ml-2 text-xs text-slate-500">{answer.sent ? t('followup.sent') : t('followup.saved')}</span>
        </p>
        <button onClick={() => setEditing(true)} className="shrink-0 text-emerald-700 underline">
          {t('followup.change')}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-3 border-t border-amber-200 bg-amber-50 p-4 text-sm">
      <div>
        <p className="font-medium text-amber-900">{t('followup.title')}</p>
        <p className="text-xs text-amber-800">
          {formatDate(followUp.approved_at)}
          {followUp.mentor_name && ` · ${t('followup.by', { mentor: followUp.mentor_name })}`}
        </p>
        <p lang={language} className="mt-2 text-slate-800">
          {t('followup.agreed', { name: firstName, action: followUp.follow_up })}
        </p>
        {followUp.follow_up_check && (
          <p lang={language} className="mt-1 text-slate-600">
            {t('followup.how', { check: followUp.follow_up_check })}
          </p>
        )}
      </div>

      <div>
        <p className="mb-1 font-medium">{t('followup.question')}</p>
        <div className="grid grid-cols-3 gap-2">
          {RESULTS.map((option) => (
            <button
              key={option.value}
              onClick={() => setStatus(option.value)}
              aria-pressed={status === option.value}
              className={`min-h-12 rounded-lg border px-1 font-medium ${
                status === option.value ? option.on : 'border-slate-200 bg-white text-slate-700'
              }`}
            >
              {option.icon} {t(`result.${option.value}`)}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-1 font-medium">{t('followup.useful', { name: firstName })}</p>
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
        <p className="mt-1 text-xs text-slate-500">{t('followup.scale')}</p>
      </div>

      <textarea
        value={note}
        onChange={(event) => setNote(event.target.value)}
        rows={2}
        placeholder={t('followup.note')}
        className="w-full rounded-xl border border-slate-200 bg-white p-3"
      />

      <button
        onClick={save}
        disabled={!status}
        className="w-full rounded-lg bg-amber-600 px-4 py-3 font-medium text-white disabled:opacity-50"
      >
        {t('followup.save')}
      </button>
    </div>
  )
}
