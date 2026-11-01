import { getWithCache } from '../lib/offline.js'

// Counts for the block officer. Never names a school or teacher.
export function getBlockSummary() {
  return getWithCache('/api/block/summary')
}
