import { Link, useParams } from 'react-router-dom'
import { getSchool } from '../api/schools.js'
import FocusBadge from '../components/FocusBadge.jsx'
import { useFetch } from '../lib/useFetch.js'

// One school: suggested focus + the teachers the CRP can observe.
export default function School() {
  const { schoolId } = useParams()
  const { data: school, error, loading } = useFetch(() => getSchool(schoolId), [schoolId])

  if (loading) return <p className="text-slate-500">Loading…</p>
  if (error) return <p className="text-red-600">Could not load school: {error}</p>

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
        {school.teachers.map((teacher) => (
          <div
            key={teacher.id}
            className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4"
          >
            <div>
              <p className="font-medium">{teacher.name}</p>
              <p className="text-sm text-slate-500">Grade {teacher.grade}</p>
            </div>
            {/* Next step: this button opens the Observe screen */}
            <button
              disabled
              className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              Start visit
            </button>
          </div>
        ))}
      </section>
    </div>
  )
}
