import { clearSession, getSession } from '../lib/session.js'

// Tiny fetch helpers. Every API file in this folder uses these. They send the login token if there is one.

function withToken(headers = {}) {
  const token = getSession()?.token
  return token ? { ...headers, Authorization: `Bearer ${token}` } : headers
}

async function handle(response) {
  if (!response.ok) {
    // The server no longer knows this login (logged out, or a fresh database): show the login screen.
    if (response.status === 401) clearSession()
    const text = await response.text()
    throw new Error(`${response.status}: ${text}`)
  }
  return response.json()
}

export async function apiGet(path) {
  return handle(await fetch(path, { headers: withToken() }))
}

export async function apiPost(path, body) {
  return handle(
    await fetch(path, {
      method: 'POST',
      headers: withToken({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(body),
    }),
  )
}

export async function apiPut(path, body) {
  return handle(
    await fetch(path, {
      method: 'PUT',
      headers: withToken({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(body),
    }),
  )
}

// For files to save, e.g. a checklist as CSV.
export async function apiGetBlob(path) {
  const response = await fetch(path, { headers: withToken() })
  if (!response.ok) return handle(response)
  return response.blob()
}

// For uploads (audio files, checklists): the browser sets the multipart Content-Type itself.
export async function apiPostForm(path, formData) {
  return handle(await fetch(path, { method: 'POST', headers: withToken(), body: formData }))
}
