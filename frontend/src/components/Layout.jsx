import { Link, Outlet } from 'react-router-dom'
import { useOnline } from '../lib/offline.js'

// Shared page frame: top bar + a phone-width content column.
export default function Layout() {
  const online = useOnline()

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-10 bg-emerald-700 text-white">
        <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3">
          <Link to="/" className="text-lg font-semibold">
            VisitCoach
          </Link>
          <div className="flex items-center gap-3 text-sm text-emerald-100">
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                online ? 'bg-emerald-600 text-white' : 'bg-amber-300 text-amber-950'
              }`}
            >
              {online ? 'Online' : 'Offline · saving on phone'}
            </span>
            <span>CRP: Demo</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-md px-4 py-4">
        <Outlet />
      </main>
    </div>
  )
}
