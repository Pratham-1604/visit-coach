// Dates as Indians write them: 25/10/2026.
export function formatDate(value) {
  if (!value) return ''
  // The server stores "2026-10-25 09:30:00" (UTC) without a zone; read it as UTC.
  const text = /^\d{4}-\d{2}-\d{2} \d/.test(value) ? `${value.replace(' ', 'T')}Z` : value
  return new Date(text).toLocaleDateString('en-IN')
}

// A checklist item's wording in the given language (rubric.json has en, hi, mr, ta).
export function itemText(item, language) {
  return item.text[language] ?? item.text.en
}

// Why to watch a school, in the mentor's language. Same rules as backend/app/services/focus.py.
export function focusReason(t, school) {
  const { area } = school.focus
  const pct = area === 'literacy' ? school.pct_reading_beginner : school.pct_numeracy_beginner
  return t(`focus.reason.${area}`, { pct })
}

// Same rule as the server (backend/app/services/packet.py CRP_NOTE): a note meant for the mentor.
const CRP_NOTE = /\[\s*(CRP|mentor)\b|\bCRP\s*:/i

export function hasCrpNote(text) {
  return CRP_NOTE.test(text ?? '')
}
