import { getWithCache } from '../lib/offline.js'

// The observation rubric. Cached on the phone so visits work offline.
export function getRubric() {
  return getWithCache('/api/rubric')
}
