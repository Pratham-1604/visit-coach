import { Link, Outlet } from 'react-router-dom'

// Shared page frame: top bar + a phone-width content column.
export default function Layout() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-10 bg-emerald-700 text-white">
        <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3">
          <Link to="/" className="text-lg font-semibold">
            VisitCoach
          </Link>
          <span className="text-sm text-emerald-100">CRP: Demo user</span>
        </div>
      </header>

      <main className="mx-auto max-w-md px-4 py-4">
        <Outlet />
      </main>
    </div>
  )
}
