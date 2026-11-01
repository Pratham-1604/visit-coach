import { getWithCache } from '../lib/offline.js'

// The approved packet behind a teacher's link. Cached, so it opens again without signal.
export function getSharedPacket(token) {
  return getWithCache(`/api/t/${token}`)
}

// The same notes read aloud (MP3), made by the server with Sarvam.
export function sharedAudioUrl(token) {
  return `/api/t/${token}/audio`
}
