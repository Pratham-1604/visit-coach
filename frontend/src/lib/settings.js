import { useSyncExternalStore } from 'react'

// A small value kept on the phone (localStorage) that components can watch: language, theme, login session.
// Storage can be blocked (private mode), so every read and write is guarded and falls back to the default.
export function createSetting(key, fallback) {
  const listeners = new Set()

  function get() {
    try {
      return localStorage.getItem(key) ?? fallback()
    } catch {
      return fallback()
    }
  }

  function set(value) {
    try {
      if (value == null) localStorage.removeItem(key)
      else localStorage.setItem(key, value)
    } catch {
      // Not saved for next time, but this session still updates below.
    }
    listeners.forEach((listener) => listener())
  }

  function use() {
    return useSyncExternalStore((listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    }, get)
  }

  return { get, set, use }
}
