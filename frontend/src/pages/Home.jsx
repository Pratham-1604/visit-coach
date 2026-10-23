import { Link } from 'react-router-dom'
import { getSchools } from '../api/schools.js'
import FocusBadge from '../components/FocusBadge.jsx'
import { useFetch } from '../lib/useFetch.js'

// This week's visits: the CRP picks a school to visit.
export default function Home() {
  const { data: schools, error, loading } = useFetch(() => getSchools(), [])

  if (loading) return <p className="text-slate-500">Loading schools…</p>
  if (error) return <p className="text-red-600">Could not load schools: {error}</p>

  return (
    <div className="space-y-3">
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
