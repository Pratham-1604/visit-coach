import { apiGet, apiGetBlob, apiPost, apiPostForm } from './client.js'

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

// Totals per item from the visits, and Claude's latest suggestions for the next version.
export function getInsights() {
  return apiGet('/api/checklists/insights')
}

// Claude reads mentors' notes and suggests new items. Answers in the given language.
export function suggestItems(language) {
  return apiPost('/api/checklists/suggestions', { language })
}

export function getSuggestedCsv() {
  return apiGetBlob('/api/checklists/suggestions/csv')
}
