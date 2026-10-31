import { useMemo } from 'react'
import { createSetting } from './settings.js'

// The login: { token, user: { id, username, name, role } }, kept on the phone so the app works offline
// after the first login. Every API call sends the token (api/client.js).
const session = createSetting('visitcoach.session', () => null)

export function getSession() {
  return parse(session.get())
}

export function useSession() {
  const raw = session.use()
  return useMemo(() => parse(raw), [raw])
}

export function saveSession(value) {
  session.set(JSON.stringify(value))
}

export function clearSession() {
  session.set(null)
}

function parse(raw) {
  try {
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}
