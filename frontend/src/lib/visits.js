import { db, newId, now } from './db.js'

// All visit changes go through these functions, so every write is saved to IndexedDB at once.

export async function startVisit(school, teacher, rubricVersion) {
  const id = newId()
  await db.visits.add({
    id,
    school_id: school.id,
    teacher_id: teacher.id,
    school_name: school.name,
    teacher_name: teacher.name,
    grade: teacher.grade,
    language: school.language,
    subject: school.focus.area === 'numeracy' ? 'numeracy' : 'literacy',
    rubric: {},
    typed_note: '',
    rubric_version: rubricVersion,
    status: 'draft',
    started_at: now(),
    ended_at: null,
    updated_at: now(),
  })
  return id
}

export function updateVisit(visitId, changes) {
  return db.visits.update(visitId, { ...changes, updated_at: now() })
}

// Tapping the rating that is already chosen clears it (= skipped).
export async function rateItem(visitId, itemId, rating) {
  const visit = await db.visits.get(visitId)
  const rubric = { ...visit.rubric }
  if (rubric[itemId] === rating) delete rubric[itemId]
  else rubric[itemId] = rating
  return updateVisit(visitId, { rubric })
}

export function addNote(visitId, audio, mime, durationSeconds) {
  return db.notes.add({
    id: newId(),
    visit_id: visitId,
    audio,
    mime,
    duration_s: durationSeconds,
    created_at: now(),
  })
}

export function deleteNote(noteId) {
  return db.notes.delete(noteId)
}

// Keep only ratings for items shown for the chosen subject, then mark the visit ready to sync.
export function endVisit(visit, visibleItemIds) {
  const rubric = Object.fromEntries(
    Object.entries(visit.rubric).filter(([itemId]) => visibleItemIds.includes(itemId)),
  )
  return updateVisit(visit.id, { rubric, status: 'ready', ended_at: now() })
}

export function reopenVisit(visitId) {
  return updateVisit(visitId, { status: 'draft', ended_at: null })
}
