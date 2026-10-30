import { getWithCache } from '../lib/offline.js'
import { apiGet, apiPost, apiPostForm, apiPut } from './client.js'

// Upload one finished visit and its voice notes. Safe to repeat: the server matches on client_id.
export function syncVisit(visit, notes) {
  const form = new FormData()
  form.append(
    'visit',
    JSON.stringify({
      client_id: visit.id,
      school_id: visit.school_id,
      teacher_id: visit.teacher_id,
      subject: visit.subject,
      rubric: visit.rubric,
      typed_note: visit.typed_note,
      observed_at: visit.started_at,
      mentor_name: visit.mentor_name ?? '',
      children_present: visit.children_present ?? null,
      grades_together: visit.grades_together ?? [],
    }),
  )
  for (const note of notes) form.append('notes', note.audio, `${note.id}.${note.mime.includes('mp4') ? 'm4a' : 'webm'}`)
  return apiPostForm('/api/visits/sync', form)
}

export function getVisit(serverId) {
  return apiGet(`/api/visits/${serverId}`)
}

export function retryVisit(serverId) {
  return apiPost(`/api/visits/${serverId}/retry`)
}

// The synced visit with its packet. Cached, so the CRP can review it without signal.
export function getVisitCached(serverId) {
  return getWithCache(`/api/visits/${serverId}`)
}

export function savePacket(serverId, edits) {
  return apiPut(`/api/visits/${serverId}/packet`, edits)
}

export function approveVisit(serverId) {
  return apiPost(`/api/visits/${serverId}/approve`)
}
