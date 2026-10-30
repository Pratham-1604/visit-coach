import { useParams } from 'react-router-dom'
import { getSharedPacket } from '../api/teacher.js'
import { formatDate } from '../lib/format.js'
import { teacherLabels } from '../lib/labels.js'
import { useFetch } from '../lib/useFetch.js'

const TEXT_FIELDS = ['strength', 'priority']
const LIST_FIELDS = ['practice_steps', 'materials']
const ACTION_FIELDS = ['follow_up', 'follow_up_check']

// What the teacher sees from the mentor's shared link. No app, no login, no mentor-only details.
export default function TeacherView() {
  const { token } = useParams()
  const { data, error, loading } = useFetch(() => getSharedPacket(token), [token])

  if (loading) return <Page>…</Page>
  if (error) return <Page>{teacherLabels('en').error}</Page>

  const labels = teacherLabels(data.language)
  const { packet } = data

  return (
    <Page lang={data.language}>
      <header className="space-y-1">
        <h1 className="text-xl font-semibold">{labels.title}</h1>
        <p className="text-sm text-slate-500">
          {data.teacher_first_name} · {data.school_name} · {formatDate(data.approved_at)}
        </p>
        {data.mentor_name && (
          <p className="text-sm text-slate-500">
            {labels.mentor}: {data.mentor_name}
          </p>
        )}
      </header>

      {TEXT_FIELDS.map((key) => (
        <Section key={key} title={labels[key]} highlight={key === 'priority'}>
          <p className="whitespace-pre-line">{packet[key]}</p>
        </Section>
      ))}

      {LIST_FIELDS.map((key) => (
        <Section key={key} title={labels[key]}>
          <ol className={`space-y-1 pl-5 ${key === 'practice_steps' ? 'list-decimal' : 'list-disc'}`}>
            {(packet[key] ?? []).map((line, index) => (
              <li key={index}>{line}</li>
            ))}
          </ol>
        </Section>
      ))}

      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
        {ACTION_FIELDS.map((key) => (
          <div key={key} className="space-y-1 [&+&]:mt-3">
            <h2 className="text-sm font-semibold text-emerald-900">{labels[key]}</h2>
            <p className="whitespace-pre-line text-emerald-950">{packet[key]}</p>
          </div>
        ))}
      </div>

      <History history={data.history ?? []} labels={labels} />
    </Page>
  )
}

const RESULT_STYLES = {
  done: 'bg-emerald-100 text-emerald-800',
  partly: 'bg-amber-100 text-amber-800',
  not_done: 'bg-rose-100 text-rose-800',
  open: 'bg-slate-100 text-slate-600',
}

// The teacher's earlier visits, across mentors, so the coaching reads as one story (MENTOR.md #6).
function History({ history, labels }) {
  return (
    <Section title={labels.history}>
      {history.length === 0 ? (
        <p className="text-slate-600">{labels.history_empty}</p>
      ) : (
        <ol className="space-y-3">
          {history.map((entry, index) => {
            const result = entry.result ?? 'open'
            return (
              <li key={index} className="border-l-2 border-emerald-200 pl-3">
                <p className="text-xs text-slate-500">
                  {formatDate(entry.date)}
                  {entry.mentor_name && ` · ${labels.mentor}: ${entry.mentor_name}`}
                </p>
                {entry.focus && <p className="font-medium">{entry.focus}</p>}
                {entry.follow_up && <p className="text-slate-700">{entry.follow_up}</p>}
                <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${RESULT_STYLES[result]}`}>
                  {labels.results[result]}
                </span>
              </li>
            )
          })}
        </ol>
      )}
    </Section>
  )
}

function Page({ lang, children }) {
  return (
    <div lang={lang} className="min-h-screen bg-slate-50 text-slate-900">
      <div className="bg-emerald-700 px-4 py-3 text-center text-sm font-medium text-white">VisitCoach</div>
      <main className="mx-auto max-w-md space-y-4 px-4 py-5 text-[15px] leading-relaxed">{children}</main>
    </div>
  )
}

function Section({ title, highlight, children }) {
  return (
    <section className={`rounded-xl border bg-white p-4 ${highlight ? 'border-amber-300' : 'border-slate-200'}`}>
      <h2 className="mb-1 text-sm font-semibold text-slate-500">{title}</h2>
      {children}
    </section>
  )
}
