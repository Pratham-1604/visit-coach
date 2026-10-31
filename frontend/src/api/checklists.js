import { apiGet, apiGetBlob, apiPostForm } from './client.js'

// The state admin's checklist page: the version in use and every earlier version.
export function getChecklists() {
  return apiGet('/api/checklists')
}

// Upload a new version (.csv or .json). It becomes the version every mentor in the state gets.
export function uploadChecklist(file, name, note) {
  const form = new FormData()
  form.append('file', file)
  form.append('name', name)
  form.append('note', note)
  return apiPostForm('/api/checklists', form)
}

export function getChecklistCsv(checklistId) {
  return apiGetBlob(`/api/checklists/${checklistId}/csv`)
}
