import { useSyncExternalStore } from 'react'

// The mentor's name, typed once and kept on the phone. There's no login yet; the name goes with each visit
// so the teacher's coaching history shows who visited (MENTOR.md #6).
const KEY = 'visitcoach.mentor_name'
const listeners = new Set()

export function getMentorName() {
  return localStorage.getItem(KEY) ?? ''
}

export function setMentorName(name) {
  localStorage.setItem(KEY, name.trim())
  listeners.forEach((listener) => listener())
}

export function useMentorName() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    getMentorName,
  )
}

// Ask for the name with the browser's own prompt: works offline and on any phone.
export function askMentorName() {
  const name = window.prompt('Your name (shown to teachers with your feedback)', getMentorName())
  if (name !== null && name.trim()) setMentorName(name)
}
