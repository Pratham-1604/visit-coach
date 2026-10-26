import { useEffect } from 'react'
import { postFollowUp } from '../api/followups.js'
import { getOfflinePack } from '../api/schools.js'
import { getVisit, retryVisit, syncVisit } from '../api/visits.js'
import { db, now } from './db.js'
import { updateVisit } from './visits.js'

const PENDING = ['queued', 'transcribing', 'generating']
const POLL_MS = 5000
const PACK_EVERY_MS = 2 * 60 * 1000 // re-download the offline pack at most every 2 minutes

// One pass: upload finished visits, then refresh the server status of visits still being processed.
// Errors are saved on the visit (sync_error) and the visit is tried again next pass.
let running = null
export function syncAll() {
  running ??= runSync().finally(() => (running = null))
  return running
}

async function runSync() {
  if (!navigator.onLine) return

  // Follow-ups first, so the visit uploaded next already knows what the CRP found.
  for (const row of await db.outbox.where('kind').equals('followup').filter((row) => !row.sent).toArray()) {
    try {
      await postFollowUp(row.visit_id, row.body)
      await db.outbox.update(row.id, { sent: true, error: null })
    } catch (error) {
      await db.outbox.update(row.id, { error: error.message })
    }
  }

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

  await refreshOfflinePack()
}

// Download schools, teachers, open follow-ups and the rubric, so every school opens without signal.
// Each part is stored under the key of its normal API call, which is where the pages look (getWithCache).
let packSavedAt = 0
async function refreshOfflinePack() {
  if (Date.now() - packSavedAt < PACK_EVERY_MS) return
  try {
    const pack = await getOfflinePack()
    const saved_at = now()
    await db.cache.bulkPut([
      { key: '/api/schools', value: pack.schools, saved_at },
      { key: '/api/rubric', value: pack.rubric, saved_at },
      ...Object.entries(pack.school_details).map(([id, value]) => ({ key: `/api/schools/${id}`, value, saved_at })),
    ])
    packSavedAt = Date.now()
  } catch {
    // Not fatal: pages still use whatever was saved last time.
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
