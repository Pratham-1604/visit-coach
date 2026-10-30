import { Link } from 'react-router-dom'
import { getBlockSummary } from '../api/block.js'
import { useFetch } from '../lib/useFetch.js'

// Support planning for the block officer: which training the cluster needs, and whether mentoring helps teachers.
// It plans support, it doesn't monitor anyone (MENTOR.md #1).
// Only counts. No school, teacher or coaching text ever reaches this page (DECISIONS.md #10).
export default function Block() {
  const { data, error, loading } = useFetch(() => getBlockSummary(), [])

  if (loading) return <p className="text-slate-500">Loading…</p>
  if (error) return <p className="text-red-600">Could not load the block view: {error}</p>

  const { metrics } = data

  return (
    <div className="space-y-6">
      <Link to="/" className="text-sm text-emerald-700">
        ← Home
      </Link>

      <div>
        <h1 className="text-xl font-semibold">Support planning</h1>
        <p className="text-slate-700">What training does this cluster need?</p>
        <p className="text-sm text-slate-500">
          {data.schools_total} schools · based on each school's latest approved coaching packet
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="font-medium">What teachers are working on</h2>
        <ul className="space-y-3">
          {data.needs.map((need) => (
            <NeedBar key={need.need_area} label={need.label} schools={need.schools} total={data.schools_total} />
          ))}
          {data.other_schools > 0 && (
            <NeedBar label="Other needs (each under 5 schools)" schools={data.other_schools} total={data.schools_total} muted />
          )}
        </ul>
        <p className="text-xs text-slate-500">
          Needs shared by fewer than 5 schools are grouped, so no single school can be identified. No teacher is
          scored or named.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-medium">Is mentoring helping teachers?</h2>
        <div className="grid grid-cols-2 gap-3">
          <Stat
            value={pct(metrics.pct_done)}
            label={`of agreed actions were done by the next visit${
              metrics.pct_partly != null ? ` (${metrics.pct_partly}% partly)` : ''
            }`}
          />
          <Stat
            value={metrics.avg_usefulness != null ? `${metrics.avg_usefulness} / 5` : '–'}
            label="how useful teachers found the advice (average)"
          />
          <Stat value={pct(metrics.pct_with_action)} label="of visits ended with one clear action for the teacher" />
          <Stat
            value={minutes(metrics.minutes_to_feedback)}
            label="from observation to feedback on WhatsApp (median), with no report to write"
          />
          <Stat value={pct(metrics.pct_edited)} label="of packets were edited by the mentor before sharing" />
          <Stat value={metrics.visits} label={`visits synced · ${metrics.followups_checked} actions checked`} />
        </div>
      </section>
    </div>
  )
}

// One need area: "14 of 22 schools", with a thin bar for the share of the block.
function NeedBar({ label, schools, total, muted }) {
  const share = total ? Math.round((100 * schools) / total) : 0
  return (
    <li title={`${schools} of ${total} schools (${share}%)`}>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className={muted ? 'text-slate-500' : 'font-medium text-slate-800'}>{label}</span>
        <span className="shrink-0 text-slate-600">
          <span className="font-semibold text-slate-900">{schools}</span> of {total} schools
        </span>
      </div>
      <div className="mt-1 h-2 rounded-full bg-slate-100" aria-hidden="true">
        <div
          className={`h-2 rounded-full ${muted ? 'bg-slate-400' : 'bg-emerald-600'}`}
          style={{ width: `${share}%` }}
        />
      </div>
    </li>
  )
}

function Stat({ value, label }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <p className="text-2xl font-semibold text-slate-900">{value}</p>
      <p className="mt-1 text-xs leading-snug text-slate-600">{label}</p>
    </div>
  )
}

function pct(value) {
  return value == null ? '–' : `${value}%`
}

function minutes(value) {
  if (value == null) return '–'
  return value < 90 ? `${value} min` : `${(value / 60).toFixed(1)} h`
}
