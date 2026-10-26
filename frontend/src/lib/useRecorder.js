import { useEffect, useRef, useState } from 'react'

export const MAX_NOTE_SECONDS = 30 // Sarvam's REST limit (DECISIONS.md #8)

// Record one short voice note with MediaRecorder.
// Usage: const rec = useRecorder((blob, mime, seconds) => save(...))
//        rec.start() / rec.stop(); rec.recording, rec.seconds, rec.error
export function useRecorder(onDone) {
  const [recording, setRecording] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [error, setError] = useState(null)
  const recorderRef = useRef(null)
  const timerRef = useRef(null)
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone

  // Stop the mic if the page closes mid-recording.
  useEffect(() => () => stopTracks(recorderRef.current), [])

  async function start() {
    setError(null)
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('This browser cannot record audio. Use Chrome, over https or localhost.')
      return
    }

    let stream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      setError('Microphone permission was denied.')
      return
    }

    const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find((type) =>
      MediaRecorder.isTypeSupported(type),
    )
    const recorder = new MediaRecorder(stream, { mimeType: mime, audioBitsPerSecond: 24000 })
    const chunks = []
    const startedAt = Date.now()

    recorder.ondataavailable = (event) => event.data.size && chunks.push(event.data)
    recorder.onstop = () => {
      clearInterval(timerRef.current)
      stopTracks(recorder)
      setRecording(false)
      const duration = Math.min(MAX_NOTE_SECONDS, Math.round((Date.now() - startedAt) / 1000))
      if (chunks.length) onDoneRef.current(new Blob(chunks, { type: recorder.mimeType }), recorder.mimeType, duration)
    }

    recorderRef.current = recorder
    recorder.start(1000) // 1 s chunks, so little is lost if the tab is killed
    setSeconds(0)
    setRecording(true)
    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000)
      setSeconds(elapsed)
      if (elapsed >= MAX_NOTE_SECONDS) stop()
    }, 250)
  }

  function stop() {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
  }

  return { start, stop, recording, seconds, error }
}

function stopTracks(recorder) {
  recorder?.stream.getTracks().forEach((track) => track.stop())
}
