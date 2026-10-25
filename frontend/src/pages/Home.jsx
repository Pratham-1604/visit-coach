import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { getSchools } from '../api/schools.js'
import FocusBadge from '../components/FocusBadge.jsx'
import { db } from '../lib/db.js'
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
  return (
    <section className="space-y-2 pb-2">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">On this phone</h2>
      {visits.map((visit) => (
        <Link
          key={visit.id}
          to={`/visits/${visit.id}`}
          className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 active:bg-slate-50"
        >
          <div>
            <p className="font-medium">{visit.teacher_name}</p>
            <p className="text-sm text-slate-500">
              {visit.school_name} · {new Date(visit.started_at).toLocaleDateString()}
            </p>
          </div>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              visit.status === 'draft' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
            }`}
          >
            {visit.status === 'draft' ? 'In progress' : 'Waiting to sync'}
          </span>
        </Link>
      ))}
    </section>
  )
}
