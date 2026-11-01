import { Link } from 'react-router-dom'
import { getBlockSummary } from '../api/block.js'
import { useT } from '../lib/i18n.js'
import { useSession } from '../lib/session.js'
import { useFetch } from '../lib/useFetch.js'

// Support planning for the block officer: which training the cluster needs, and whether mentoring helps teachers.
// It plans support, it doesn't monitor anyone.
// Only counts. No school, teacher or coaching text ever reaches this page.
export default function Block() {
  const t = useT()
  const session = useSession()
  const { data, error, loading } = useFetch(() => getBlockSummary(), [])

  if (loading) return <p className="text-slate-500">{t('common.loading')}</p>
  if (error) return <p className="text-red-600">{t('block.error', { error })}</p>

  const { metrics } = data

  return (
    <div className="space-y-6">
      {/* The block officer has no home screen: this page is all they use. */}
      {session?.user.role === 'mentor' && (
        <Link to="/" className="text-sm text-emerald-700">
          {t('common.home')}
        </Link>
      )}

      <div>
        <h1 className="text-xl font-semibold">{t('block.title')}</h1>
        <p className="text-slate-700">{t('block.question')}</p>
        <p className="text-sm text-slate-500">{t('block.basis', { n: data.schools_total })}</p>
      </div>

      <section className="space-y-3">
        <h2 className="font-medium">{t('block.working_on')}</h2>
        <ul className="space-y-3">
          {data.needs.map((need) => (
            <NeedBar
              key={need.need_area}
              label={t(`need.${need.need_area}`)}
              schools={need.schools}
              total={data.schools_total}
            />
          ))}
          {data.other_schools > 0 && (
            <NeedBar label={t('block.other')} schools={data.other_schools} total={data.schools_total} muted />
          )}
        </ul>
        <p className="text-xs text-slate-500">{t('block.privacy')}</p>
      </section>

      <section className="space-y-3">
        <h2 className="font-medium">{t('block.helping')}</h2>
        <div className="grid grid-cols-2 gap-3">
          <Stat
            value={pct(metrics.pct_done)}
            label={t('block.done') + (metrics.pct_partly != null ? t('block.partly', { n: metrics.pct_partly }) : '')}
          />
          <Stat
            value={metrics.avg_usefulness != null ? `${metrics.avg_usefulness} / 5` : '–'}
            label={t('block.useful')}
          />
          <Stat value={pct(metrics.pct_with_action)} label={t('block.with_action')} />
          <Stat value={duration(t, metrics.minutes_to_feedback)} label={t('block.minutes')} />
          <Stat value={pct(metrics.pct_edited)} label={t('block.edited')} />
          <Stat value={metrics.visits} label={t('block.visits', { n: metrics.followups_checked })} />
        </div>
      </section>
    </div>
  )
}

// One need area: "14 of 22 schools", with a thin bar for the share of the block.
function NeedBar({ label, schools, total, muted }) {
  const t = useT()
  const share = total ? Math.round((100 * schools) / total) : 0
  return (
    <li title={`${share}%`}>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className={muted ? 'text-slate-500' : 'font-medium text-slate-800'}>{label}</span>
        <span className="shrink-0 font-semibold text-slate-900">{t('block.of_schools', { n: schools, total })}</span>
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

function duration(t, minutes) {
  if (minutes == null) return '–'
  return minutes < 90 ? t('unit.minutes', { n: minutes }) : t('unit.hours', { n: (minutes / 60).toFixed(1) })
}
