import { useEffect, useState } from 'react'
import { apiGet } from '../api/client.js'
import { db, now } from './db.js'

// GET from the API and keep a copy; when the network fails, return the saved copy.
export async function getWithCache(path) {
  try {
    const value = await apiGet(path)
    await db.cache.put({ key: path, value, saved_at: now() })
    return value
  } catch (error) {
    const saved = await db.cache.get(path)
    if (saved) return saved.value
    throw error
  }
}

// true while the browser thinks it has a connection.
export function useOnline() {
  const [online, setOnline] = useState(navigator.onLine)
  useEffect(() => {
    const update = () => setOnline(navigator.onLine)
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])
  return online
}
