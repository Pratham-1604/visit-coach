import { getWithCache } from '../lib/offline.js'

// The newest version of the mentor's state checklist. Cached on the phone so visits work offline.
export function getRubric() {
  return getWithCache('/api/rubric')
}
