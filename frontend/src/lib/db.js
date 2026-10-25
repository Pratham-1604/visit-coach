import Dexie from 'dexie'

// Everything the phone keeps offline lives in IndexedDB, through Dexie.
//   visits: one row per classroom visit, created on the phone
//           { id, school_id, teacher_id, school_name, teacher_name, grade, language,
//             subject, rubric: {item_id: 'yes'|'partly'|'no'}, typed_note,
//             rubric_version, status: 'draft'|'ready', started_at, ended_at, updated_at }
//   notes:  voice notes, the audio Blob itself is stored { id, visit_id, audio, mime, duration_s, created_at }
//   cache:  last good API responses, so pages still open without signal { key, value, saved_at }
export const db = new Dexie('visitcoach')

db.version(1).stores({
  visits: 'id, school_id, teacher_id, status, started_at',
  notes: 'id, visit_id, created_at',
  cache: 'key',
})

// Ask the browser not to clear our data when storage runs low.
navigator.storage?.persist?.()

// crypto.randomUUID only exists on https/localhost, so fall back for plain-http testing on a phone.
export function newId() {
  if (crypto.randomUUID) return crypto.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export function now() {
  return new Date().toISOString()
}
