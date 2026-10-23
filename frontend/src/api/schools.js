import { apiGet } from './client.js'

export function getSchools() {
  return apiGet('/api/schools')
}

export function getSchool(schoolId) {
  return apiGet(`/api/schools/${schoolId}`)
}
