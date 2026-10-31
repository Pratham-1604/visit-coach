import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { rehearsalTurn, scoreRehearsal } from '../api/rehearsal.js'
import { db } from '../lib/db.js'
import { useT } from '../lib/i18n.js'
import { useOnline } from '../lib/offline.js'

// Score card rows; labels are lib/strings.js score.<key>.
const CRITERIA = ['strength_first', 'specific', 'one_priority', 'invites_teacher', 'agreed_action']

// Practise the debrief before talking to the teacher. Claude plays the teacher, then gives feedback.
export default function Rehearse() {
  const t = useT()
  const { visitId } = useParams()
  const visit = useLiveQuery(() => db.visits.get(visitId), [visitId])
  const online = useOnline()
  const [history, setHistory] = useState([])
  const [draft, setDraft] = useState('')
  const [waiting, setWaiting] = useState(false)
  const [score, setScore] = useState(null)
  const [error, setError] = useState(null)

  if (visit === undefined) return <p className="text-slate-500">{t('common.loading')}</p>
  if (!visit?.server_id) return <p className="text-red-600">{t('rehearse.no_packet')}</p>

  const teacher = visit.teacher_name.split(' ')[0]

  async function ask(action) {
    setWaiting(true)
    setError(null)
    try {
      return await action()
    } catch (err) {
      setError(err.message)
    } finally {
      setWaiting(false)
    }
  }

  async function send() {
    const next = [...history, { role: 'crp', text: draft.trim() }]
    setHistory(next)
    setDraft('')
    const result = await ask(() => rehearsalTurn(visit.server_id, next))
    if (result) setHistory([...next, { role: 'teacher', text: result.reply }])
  }

  async function finish() {
    const result = await ask(() => scoreRehearsal(visit.server_id, history))
    if (result) setScore(result)
  }

  function restart() {
    setHistory([])
    setScore(null)
    setError(null)
  }

  return (
    <div className="space-y-4 pb-40">
      <Link to={`/visits/${visit.id}/packet`} className="text-sm text-emerald-700">
        {t('rehearse.back')}
      </Link>

      <div>
        <h1 className="text-xl font-semibold">{t('rehearse.title')}</h1>
        <p className="text-sm text-slate-500">{t('rehearse.intro', { name: teacher })}</p>
      </div>

      {!online && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{t('rehearse.needs_internet')}</p>}

      <div className="space-y-2">
        {history.length === 0 && (
          <p className="rounded-xl bg-slate-100 p-3 text-sm text-slate-600">{t('rehearse.tip', { name: teacher })}</p>
        )}
        {history.map((line, index) => (
          <div key={index} className={`flex ${line.role === 'crp' ? 'justify-end' : 'justify-start'}`}>
            <p
              lang={line.role === 'teacher' ? visit.language : undefined}
              className={`max-w-[85%] whitespace-pre-line rounded-2xl px-3 py-2 text-sm ${
                line.role === 'crp' ? 'bg-emerald-700 text-white' : 'border border-slate-200 bg-white'
              }`}
            >
              {line.text}
            </p>
          </div>
        ))}
        {waiting && <p className="text-sm text-slate-500">{score ? '' : t('rehearse.thinking', { name: teacher })}</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      {score && <ScoreCard score={score} onRestart={restart} />}

      {!score && (
        <div className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white/95 backdrop-blur">
          <div className="mx-auto max-w-md space-y-2 px-4 py-3">
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              rows={2}
              placeholder={t('rehearse.placeholder', { name: teacher })}
              className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm"
            />
            <div className="flex gap-2">
              <button
                onClick={send}
                disabled={!online || waiting || !draft.trim()}
                className="flex-1 rounded-lg bg-emerald-700 px-4 py-3 font-medium text-white disabled:opacity-50"
              >
                {t('rehearse.say')}
              </button>
              <button
                onClick={finish}
                disabled={!online || waiting || !history.some((line) => line.role === 'crp')}
                className="rounded-lg border border-slate-300 px-4 py-3 font-medium text-slate-700 disabled:opacity-50"
              >
                {t('rehearse.finish')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Claude's comments, tip and better line are in English (the better line is in the conversation's language).
function ScoreCard({ score, onRestart }) {
  const t = useT()
  return (
    <section className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm">
      <h2 className="font-semibold text-emerald-900">{t('score.title')}</h2>
      <ul className="space-y-2">
        {CRITERIA.map((key) => (
          <li key={key}>
            <div className="flex items-center justify-between gap-3">
              <span className="font-medium text-slate-800">{t(`score.${key}`)}</span>
              <span className="shrink-0 font-semibold text-emerald-800" aria-label={t('score.out_of', { n: score[key].score })}>
                {'●'.repeat(score[key].score)}
                <span className="text-emerald-200">{'●'.repeat(4 - score[key].score)}</span>
              </span>
            </div>
            <p lang="en" className="text-slate-600">
              {score[key].comment}
            </p>
          </li>
        ))}
      </ul>
      <p>
        <span className="font-medium">{t('score.tip')}</span> <span lang="en">{score.overall_tip}</span>
      </p>
      <p>
        <span className="font-medium">{t('score.better')}</span> “{score.better_line}”
      </p>
      <button onClick={onRestart} className="rounded-lg bg-emerald-700 px-4 py-2 font-medium text-white">
        {t('score.again')}
      </button>
    </section>
  )
}
