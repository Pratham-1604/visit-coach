import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { getSchools } from '../api/schools.js'
import FocusBadge from '../components/FocusBadge.jsx'
import { db } from '../lib/db.js'
import { focusReason, formatDate } from '../lib/format.js'
import { plural, useT } from '../lib/i18n.js'
import { useOnline } from '../lib/offline.js'
import { hasPacket, retry, syncAll, TONES, visitStatus } from '../lib/sync.js'
import { useFetch } from '../lib/useFetch.js'

// This week's visits: the mentor picks a school to visit.
export default function Home() {
  const t = useT()
  const { data: schools, error, loading } = useFetch(() => getSchools(), [])
  const visits = useLiveQuery(() => db.visits.orderBy('started_at').reverse().toArray(), [])

  if (loading) return <p className="text-slate-500">{t('home.loading')}</p>
  if (error) return <p className="text-red-600">{t('home.error', { error })}</p>

  return (
    <div className="space-y-3">
      {visits?.length > 0 && <PhoneVisits visits={visits} />}

      <h1 className="text-xl font-semibold">{t('home.title')}</h1>

      <SchoolList schools={schools} />

      <Link to="/block" className="block py-2 text-center text-sm text-emerald-700 underline">
        {t('home.block_link')}
      </Link>
    </div>
  )
}

const FILTERS = [
  { id: 'all', test: () => true },
  { id: 'actions', test: (school) => school.open_actions > 0 },
  { id: 'literacy', test: (school) => school.focus.area === 'literacy' },
  { id: 'numeracy', test: (school) => school.focus.area === 'numeracy' },
]

// Search by school, village or teacher, plus quick filters. Kept in the URL, so "back" keeps them.
function SchoolList({ schools }) {
  const t = useT()
  const [params, setParams] = useSearchParams()
  const query = params.get('q') ?? ''
  const filter = FILTERS.find((f) => f.id === params.get('filter')) ?? FILTERS[0]

  function update(changes) {
    const next = new URLSearchParams(params)
    for (const [key, value] of Object.entries(changes)) {
      if (value && value !== 'all') next.set(key, value)
      else next.delete(key)
    }
    setParams(next, { replace: true })
  }

  const words = query.trim().toLowerCase()
  const matching = schools.filter((school) => {
    const text = [school.name, school.village, ...(school.teacher_names ?? [])].join(' ').toLowerCase()
    return text.includes(words)
  })
  const shown = matching.filter(filter.test)

  return (
    <section className="space-y-3">
      <div className="relative">
        <input
          type="search"
          value={query}
          onChange={(event) => update({ q: event.target.value })}
          placeholder={t('home.search')}
          aria-label={t('home.search')}
          className="w-full rounded-xl border border-slate-200 bg-white p-3 pr-10 text-sm shadow-sm"
        />
        {query && (
          <button
            onClick={() => update({ q: '' })}
            aria-label={t('home.clear')}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full px-2 text-lg text-slate-400"
          >
            ×
          </button>
        )}
      </div>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => update({ filter: f.id })}
            aria-pressed={f.id === filter.id}
            className={`shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-sm font-medium ${
              f.id === filter.id ? 'border-emerald-700 bg-emerald-700 text-white' : 'border-slate-200 bg-white text-slate-700'
            }`}
          >
            {t(`filter.${f.id}`)} ({matching.filter(f.test).length})
          </button>
        ))}
      </div>

      {shown.length === 0 && (
        <p className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500">
          {t('home.none')}{' '}
          <button onClick={() => update({ q: '', filter: 'all' })} className="text-emerald-700 underline">
            {t('home.show_all')}
          </button>
        </p>
      )}

      {shown.map((school) => (
        <SchoolCard key={school.id} school={school} />
      ))}
    </section>
  )
}

function SchoolCard({ school }) {
  const t = useT()
  return (
    <Link
      to={`/schools/${school.id}`}
      className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm active:bg-slate-50"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium">{school.name}</p>
          <p className="text-sm text-slate-500">{school.village}</p>
        </div>
        <FocusBadge area={school.focus.area} />
      </div>
      <p className="mt-2 text-sm text-slate-600">{focusReason(t, school)}</p>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
        <span>{school.last_visit ? t('home.last_visit', { date: formatDate(school.last_visit) }) : t('home.not_visited')}</span>
        {school.open_actions > 0 && (
          <span className="font-medium text-amber-700">{plural(t, 'home.actions', school.open_actions)}</span>
        )}
      </div>
    </Link>
  )
}

// Which visits need the mentor first: failed, then packets to review, then visits still in progress.
const NEEDS_ATTENTION = ['status.failed', 'status.ready', 'status.draft', 'status.waiting']
const SHOW_FIRST = 3

function attentionRank(visit) {
  const rank = NEEDS_ATTENTION.indexOf(visitStatus(visit).key)
  return rank === -1 ? NEEDS_ATTENTION.length : rank
}

// Visits recorded on this phone: the ones that need the mentor first, then newest first. Drafts can be continued.
function PhoneVisits({ visits }) {
  const t = useT()
  const online = useOnline()
  const [syncing, setSyncing] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const waiting = visits.filter((visit) => visit.status === 'ready').length
  // sort() is stable, so visits with the same rank stay newest first.
  const sorted = [...visits].sort((a, b) => attentionRank(a) - attentionRank(b))
  const shown = showAll ? sorted : sorted.slice(0, SHOW_FIRST)

  async function syncNow() {
    setSyncing(true)
    await syncAll()
    setSyncing(false)
  }

  return (
    <section className="space-y-2 pb-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{t('home.on_phone')}</h2>
        {waiting > 0 && (
          <button
            onClick={syncNow}
            disabled={!online || syncing}
            className="rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {syncing ? t('home.syncing') : online ? t('home.sync_now', { n: waiting }) : t('home.sync_later')}
          </button>
        )}
      </div>
      {shown.map((visit) => (
        <PhoneVisit key={visit.id} visit={visit} />
      ))}
      {visits.length > SHOW_FIRST && (
        <button onClick={() => setShowAll(!showAll)} className="w-full py-1 text-sm text-emerald-700 underline">
          {showAll ? t('home.show_fewer') : t('home.show_all_visits', { n: visits.length })}
        </button>
      )}
    </section>
  )
}

function PhoneVisit({ visit }) {
  const t = useT()
  const { key, tone } = visitStatus(visit)
  const error = visit.server_status === 'failed' ? visit.server_error : visit.sync_error

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <Link
        to={hasPacket(visit) ? `/visits/${visit.id}/packet` : `/visits/${visit.id}`}
        className="flex items-center justify-between p-3 active:bg-slate-50"
      >
        <div>
          <p className="font-medium">{visit.teacher_name}</p>
          <p className="text-sm text-slate-500">
            {visit.school_name} · {formatDate(visit.started_at)}
          </p>
        </div>
        <span className={`shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${TONES[tone]}`}>
          {t(key)}
        </span>
      </Link>
      {error && (
        <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-3 py-2 text-xs text-rose-700">
          <p className="min-w-0 break-words">{error}</p>
          {visit.server_status === 'failed' && (
            <button onClick={() => retry(visit)} className="shrink-0 rounded-lg border border-rose-200 px-2 py-1 font-medium">
              {t('common.retry')}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
