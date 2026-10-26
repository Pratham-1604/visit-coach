import Dexie from 'dexie'

// Everything the phone keeps offline lives in IndexedDB, through Dexie.
//   visits: one row per classroom visit, created on the phone
//           { id, school_id, teacher_id, school_name, teacher_name, grade, language,
//             subject, rubric: {item_id: 'yes'|'partly'|'no'}, typed_note,
//             rubric_version, status: 'draft'|'ready'|'synced', started_at, ended_at, updated_at,
//             after sync: server_id, server_status (see backend visits.status), server_error, sync_error,
//             packet_draft: the CRP's unsent packet edits }
//           'ready' = ended on the phone, not uploaded yet; 'synced' = the server has it.
//   notes:  voice notes, the audio Blob itself is stored { id, visit_id, audio, mime, duration_s, created_at }
//   cache:  last good API responses, so pages still open without signal { key, value, saved_at }
//   outbox: answers made offline, waiting to be sent { id, kind: 'followup', visit_id, body, sent, created_at }
//           sent rows are kept, so pages can hide follow-ups already answered on this phone.
export const db = new Dexie('visitcoach')

db.version(1).stores({
  visits: 'id, school_id, teacher_id, status, started_at',
  notes: 'id, visit_id, created_at',
  cache: 'key',
})
db.version(2).stores({
  outbox: 'id, kind, visit_id, sent',
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
