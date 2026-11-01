import { getWithCache } from '../lib/offline.js'
import { apiPost } from './client.js'

// The visit report page: facts from the data plus Claude's report, if written. Cached to open offline.
export function getReport(serverVisitId) {
  return getWithCache(`/api/visits/${serverVisitId}/report`)
}

// Claude writes (or rewrites) the report in the given language. Needs internet.
export function writeReport(serverVisitId, language) {
  return apiPost(`/api/visits/${serverVisitId}/report`, { language })
}

export function markReportSent(serverVisitId) {
  return apiPost(`/api/visits/${serverVisitId}/report/sent`, {})
}
