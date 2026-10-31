import { useState } from 'react'
import { login } from '../api/auth.js'
import Settings from '../components/Settings.jsx'
import { useT } from '../lib/i18n.js'
import { useOnline } from '../lib/offline.js'
import { saveSession } from '../lib/session.js'

// Demo logins, also created by the server (backend/app/seed.py DEMO_USERS). Prototype only.
const DEMO_USERS = [
  { username: 'sachin', password: 'sachin123', who: 'Sachin Gore', role: 'mentor' },
  { username: 'vandana', password: 'vandana123', who: 'Vandana Joshi', role: 'mentor' },
  { username: 'officer', password: 'officer123', role: 'officer' },
  { username: 'admin', password: 'admin123', role: 'admin' },
]

// Shown by Layout until someone logs in. After the first login the app keeps working offline.
export default function Login() {
  const t = useT()
  const online = useOnline()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [working, setWorking] = useState(false)
  const [error, setError] = useState(null)

  async function submit(event) {
    event.preventDefault()
    setWorking(true)
    setError(null)
    try {
      saveSession(await login(username, password))
    } catch (err) {
      setError(err.message.startsWith('401') ? t('login.wrong') : t('login.failed', { error: err.message }))
      setWorking(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="bg-emerald-700 text-white dark:bg-emerald-200 dark:text-slate-950">
        <div className="mx-auto max-w-md px-4 py-3 text-lg font-semibold">VisitCoach</div>
      </header>

      <main className="mx-auto max-w-md space-y-5 px-4 py-6">
        <div>
          <h1 className="text-xl font-semibold">{t('login.title')}</h1>
          <p className="text-sm text-slate-600">{t('login.subtitle')}</p>
        </div>

        <form onSubmit={submit} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
          <label className="block space-y-1 text-sm">
            <span className="font-medium">{t('login.username')}</span>
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              autoCapitalize="none"
              required
              className="w-full rounded-lg border border-slate-200 bg-white p-3"
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium">{t('login.password')}</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
              className="w-full rounded-lg border border-slate-200 bg-white p-3"
            />
          </label>
          {!online && <p className="text-sm text-amber-700">{t('login.offline')}</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            disabled={working || !online}
            className="w-full rounded-lg bg-emerald-700 px-4 py-3 font-medium text-white disabled:opacity-50"
          >
            {working ? t('login.working') : t('login.submit')}
          </button>
        </form>

        <section className="space-y-2 rounded-xl border border-dashed border-slate-300 p-4 text-sm">
          <p className="text-slate-600">{t('login.demo')}</p>
          {DEMO_USERS.map((user) => (
            <button
              key={user.username}
              type="button"
              onClick={() => {
                setUsername(user.username)
                setPassword(user.password)
              }}
              className="flex w-full items-center justify-between gap-3 rounded-lg bg-slate-100 px-3 py-2 text-left"
            >
              <span>
                <span className="font-medium">{user.who ?? t(`role.${user.role}`)}</span>
                {user.who && <span className="block text-xs text-slate-500">{t(`role.${user.role}`)}</span>}
              </span>
              <span className="font-mono text-xs text-slate-600">
                {user.username} / {user.password}
              </span>
            </button>
          ))}
        </section>

        <Settings />
      </main>
    </div>
  )
}
