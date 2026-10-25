import { getWithCache } from '../lib/offline.js'

// Cached on the phone: the last copy is used when there is no signal.
export function getSchools() {
  return getWithCache('/api/schools')
}

export function getSchool(schoolId) {
  return getWithCache(`/api/schools/${schoolId}`)
}
