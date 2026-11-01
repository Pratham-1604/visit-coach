import { getWithCache } from '../lib/offline.js'

// The approved packet behind a teacher's link, or its English version. Cached, so it opens again without signal.
export function getSharedPacket(token, english = false) {
  return getWithCache(`/api/t/${token}${english ? '?lang=en' : ''}`)
}

// The same notes read aloud (MP3), made by the server with Sarvam.
export function sharedAudioUrl(token, english = false) {
  return `/api/t/${token}/audio${english ? '?lang=en' : ''}`
}
