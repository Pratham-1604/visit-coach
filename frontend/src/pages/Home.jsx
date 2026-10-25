import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { getSchools } from '../api/schools.js'
import FocusBadge from '../components/FocusBadge.jsx'
import { db } from '../lib/db.js'
import { useOnline } from '../lib/offline.js'
import { hasPacket, retry, syncAll, TONES, visitStatus } from '../lib/sync.js'
import { useFetch } from '../lib/useFetch.js'

// This week's visits: the CRP picks a school to visit.
export default function Home() {
  const { data: schools, error, loading } = useFetch(() => getSchools(), [])
  const visits = useLiveQuery(() => db.visits.orderBy('started_at').reverse().toArray(), [])

  if (loading) return <p className="text-slate-500">Loading schools…</p>
  if (error) return <p className="text-red-600">Could not load schools: {error}</p>

  return (
    <div className="space-y-3">
      {visits?.length > 0 && <PhoneVisits visits={visits} />}

      <h1 className="text-xl font-semibold">This week's visits</h1>

      {schools.map((school) => (
        <Link
          key={school.id}
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
          <p className="mt-2 text-sm text-slate-600">{school.focus.reason}</p>
        </Link>
      ))}
    </div>
  )
}

// Visits recorded on this phone, newest first. Drafts can be continued.
function PhoneVisits({ visits }) {
  const online = useOnline()
  const [syncing, setSyncing] = useState(false)
  const waiting = visits.filter((visit) => visit.status === 'ready').length

  async function syncNow() {
    setSyncing(true)
    await syncAll()
    setSyncing(false)
  }

  return (
    <section className="space-y-2 pb-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">On this phone</h2>
        {waiting > 0 && (
          <button
            onClick={syncNow}
            disabled={!online || syncing}
            className="rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {syncing ? 'Syncing…' : online ? `Sync now (${waiting})` : 'Sync when online'}
          </button>
        )}
      </div>
      {visits.map((visit) => (
        <PhoneVisit key={visit.id} visit={visit} />
      ))}
    </section>
  )
}

function PhoneVisit({ visit }) {
  const { label, tone } = visitStatus(visit)
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
            {visit.school_name} · {new Date(visit.started_at).toLocaleDateString()}
          </p>
        </div>
        <span className={`shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${TONES[tone]}`}>
          {label}
        </span>
      </Link>
      {error && (
        <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-3 py-2 text-xs text-rose-700">
          <p className="min-w-0 break-words">{error}</p>
          {visit.server_status === 'failed' && (
            <button onClick={() => retry(visit)} className="shrink-0 rounded-lg border border-rose-200 px-2 py-1 font-medium">
              Retry
            </button>
          )}
        </div>
      )}
    </div>
  )
}
