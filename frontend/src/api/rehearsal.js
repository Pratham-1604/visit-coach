import { apiPost } from './client.js'

// Rehearsal is online only: every turn asks Claude for the teacher's next line.
export function rehearsalTurn(serverId, history) {
  return apiPost(`/api/rehearsal/${serverId}/turn`, { history })
}

export function scoreRehearsal(serverId, history) {
  return apiPost(`/api/rehearsal/${serverId}/score`, { history })
}
