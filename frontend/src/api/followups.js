import { apiPost } from './client.js'

// Record the next-visit check of an agreed action. Safe to resend: the server keeps one answer per visit.
export function postFollowUp(visitId, body) {
  return apiPost(`/api/followups/${visitId}`, body)
}
