import { getWithCache } from '../lib/offline.js'

// The approved packet behind a teacher's link. Cached, so it opens again without signal.
export function getSharedPacket(token) {
  return getWithCache(`/api/t/${token}`)
}
