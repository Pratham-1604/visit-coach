import { useState } from 'react'
import { Link, Navigate, Outlet, useLocation } from 'react-router-dom'
import { logout } from '../api/auth.js'
import { useT } from '../lib/i18n.js'
import { useOnline } from '../lib/offline.js'
import { clearSession, useSession } from '../lib/session.js'
import { useAutoSync } from '../lib/sync.js'
import Login from '../pages/Login.jsx'
import Settings from './Settings.jsx'

// The one page each non-mentor role uses. Mentors use the whole app.
const ROLE_PAGES = { officer: '/block', admin: '/checklists' }

// Shared page frame: top bar + a phone-width content column. Shows the login screen until someone logs in.
export default function Layout() {
  const session = useSession()
  const location = useLocation()

  if (!session) return <Login />
  const rolePage = ROLE_PAGES[session.user.role]
  if (rolePage && location.pathname !== rolePage) return <Navigate to={rolePage} replace />

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {session.user.role === 'mentor' && <AutoSync />}
      <TopBar user={session.user} />
      <main className="mx-auto max-w-md px-4 py-4">
        <Outlet />
      </main>
    </div>
  )
}

// Uploads visits and refreshes the offline pack in the background, for mentors only.
function AutoSync() {
  useAutoSync()
  return null
}

function TopBar({ user }) {
  const t = useT()
  const online = useOnline()
  const [open, setOpen] = useState(false)

  return (
    // In dark mode colour names are flipped (index.css): emerald-200 is dark green there, slate-950 near white.
    <header className="sticky top-0 z-20 bg-emerald-700 text-white dark:bg-emerald-200 dark:text-slate-950">
      <div className="relative mx-auto flex max-w-md items-center justify-between gap-3 px-4 py-3">
        <Link to="/" className="text-lg font-semibold">
          VisitCoach
        </Link>
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              online ? 'bg-emerald-600 text-white' : 'bg-amber-300 text-amber-950'
            }`}
          >
            {online ? t('app.online') : t('app.offline')}
          </span>
          <button
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            aria-label={open ? t('menu.close') : t('menu.open')}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-medium hover:bg-emerald-600 dark:hover:bg-emerald-300"
          >
            {user.name.split(' ')[0]} <span aria-hidden="true">☰</span>
          </button>
        </div>

        {open && (
          <>
            <button aria-label={t('menu.close')} onClick={() => setOpen(false)} className="fixed inset-0 cursor-default" />
            <div className="absolute right-4 top-full z-30 mt-1 w-72 space-y-4 rounded-xl border border-slate-200 bg-white p-4 text-slate-900 shadow-lg">
              <div>
                <p className="font-medium">{user.name}</p>
                <p className="text-sm text-slate-500">{t(`role.${user.role}`)}</p>
              </div>
              <Settings />
              <button
                onClick={logOut}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-rose-700"
              >
                {t('menu.logout')}
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  )
}

async function logOut() {
  try {
    await logout()
  } catch {
    // Offline or already logged out on the server: forget the login on this phone anyway.
  }
  clearSession()
}
