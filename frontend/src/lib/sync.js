import { useEffect } from 'react'
import { getVisit, retryVisit, syncVisit } from '../api/visits.js'
import { db } from './db.js'
import { updateVisit } from './visits.js'

const PENDING = ['queued', 'transcribing', 'generating']
const POLL_MS = 5000

// One pass: upload finished visits, then refresh the server status of visits still being processed.
// Errors are saved on the visit (sync_error) and the visit is tried again next pass.
let running = null
export function syncAll() {
  running ??= runSync().finally(() => (running = null))
  return running
}

async function runSync() {
  if (!navigator.onLine) return

  for (const visit of await db.visits.where('status').equals('ready').toArray()) {
    try {
      const notes = await db.notes.where('visit_id').equals(visit.id).sortBy('created_at')
      const server = await syncVisit(visit, notes)
      await updateVisit(visit.id, { status: 'synced', ...fromServer(server) })
    } catch (error) {
      await updateVisit(visit.id, { sync_error: error.message })
    }
  }

  const processing = await db.visits
    .where('status')
    .equals('synced')
    .filter((visit) => PENDING.includes(visit.server_status))
    .toArray()
  for (const visit of processing) {
    try {
      await updateVisit(visit.id, fromServer(await getVisit(visit.server_id)))
    } catch (error) {
      await updateVisit(visit.id, { sync_error: error.message })
    }
  }
}

function fromServer(server) {
  return { server_id: server.id, server_status: server.status, server_error: server.error, sync_error: null }
}

export async function retry(visit) {
  await updateVisit(visit.id, fromServer(await retryVisit(visit.server_id)))
}

// Sync when the app opens, when the signal comes back, and every few seconds while open.
export function useAutoSync() {
  useEffect(() => {
    syncAll()
    const timer = setInterval(syncAll, POLL_MS)
    window.addEventListener('online', syncAll)
    return () => {
      clearInterval(timer)
      window.removeEventListener('online', syncAll)
    }
  }, [])
}

// What to show the CRP for a visit on this phone.
export function visitStatus(visit) {
  if (visit.status === 'draft') return { label: 'In progress', tone: 'amber' }
  if (visit.status === 'ready') return { label: 'Waiting to sync', tone: 'slate' }
  switch (visit.server_status) {
    case 'queued':
    case 'transcribing':
      return { label: 'Transcribing notes…', tone: 'sky' }
    case 'generating':
      return { label: 'Writing packet…', tone: 'sky' }
    case 'failed':
      return { label: 'Failed', tone: 'rose' }
    case 'ready':
      return { label: 'Review packet', tone: 'violet' }
    default:
      return { label: 'Approved', tone: 'emerald' }
  }
}

// Synced visits whose packet the CRP can open.
export function hasPacket(visit) {
  return visit.status === 'synced' && ['ready', 'approved'].includes(visit.server_status)
}

export const TONES = {
  amber: 'bg-amber-100 text-amber-800',
  slate: 'bg-slate-200 text-slate-700',
  sky: 'bg-sky-100 text-sky-800',
  rose: 'bg-rose-100 text-rose-800',
  emerald: 'bg-emerald-100 text-emerald-800',
  violet: 'bg-violet-100 text-violet-800',
}
