// Dates as Indians write them: 25/10/2026.
export function formatDate(value) {
  if (!value) return ''
  // The server stores "2026-10-25 09:30:00" (UTC) without a zone; read it as UTC.
  const text = /^\d{4}-\d{2}-\d{2} \d/.test(value) ? `${value.replace(' ', 'T')}Z` : value
  return new Date(text).toLocaleDateString('en-IN')
}

// Same rule as the server (backend/app/services/packet.py CRP_NOTE): a note meant for the CRP.
const CRP_NOTE = /\[\s*CRP\b|\bCRP\s*:/i

export function hasCrpNote(text) {
  return CRP_NOTE.test(text ?? '')
}
