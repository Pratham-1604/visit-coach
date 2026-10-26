import { getWithCache } from '../lib/offline.js'
import { apiGet } from './client.js'

// Cached on the phone: the last copy is used when there is no signal.
export function getSchools() {
  return getWithCache('/api/schools')
}

export function getSchool(schoolId) {
  return getWithCache(`/api/schools/${schoolId}`)
}

// Everything for offline school visits in one download (see lib/sync.js).
export function getOfflinePack() {
  return apiGet('/api/offline-pack')
}
