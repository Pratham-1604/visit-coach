import { db, now } from './db.js'

// Save the CRP's follow-up answer on the phone. lib/sync.js sends it when there is signal.
// One row per visit: answering again replaces the earlier answer.
export function recordFollowUp(visitId, { status, note, teacherRating }) {
  return db.outbox.put({
    id: `followup-${visitId}`,
    kind: 'followup',
    visit_id: visitId,
    body: { status, note, teacher_rating: teacherRating },
    sent: false,
    created_at: now(),
  })
}
