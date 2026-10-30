import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getRubric } from '../api/rubric.js'
import { getVisitCached } from '../api/visits.js'
import { db } from '../lib/db.js'
import { formatDate, hasCrpNote } from '../lib/format.js'
import { useOnline } from '../lib/offline.js'
import { whatsappMessage, whatsappUrl } from '../lib/share.js'
import { useFetch } from '../lib/useFetch.js'
import { approvePacket, updateVisit } from '../lib/visits.js'

// The parts of the packet the CRP can edit, in the order the debrief goes.
const FIELDS = [
  { key: 'strength', label: 'What went well' },
  { key: 'priority', label: 'One thing to work on' },
  { key: 'practice_steps', label: '5-minute practice for tomorrow', list: true, hint: 'One step per line' },
  { key: 'materials', label: 'Materials', list: true, hint: 'One per line' },
  { key: 'demo_script', label: 'Your 2-minute demo' },
  { key: 'follow_up', label: 'Agreed action before the next visit' },
  { key: 'follow_up_check', label: 'How you will check it next visit' },
]

// After sync: the CRP reads Claude's packet, edits it, and approves it to share with the teacher.
export default function Packet() {
  const { visitId } = useParams()
  const visit = useLiveQuery(() => db.visits.get(visitId), [visitId])

  if (visit === undefined) return <p className="text-slate-500">Loading…</p>
  if (visit === null) return <p className="text-red-600">This visit is not on this phone.</p>
  if (!visit.server_id) return <p className="text-slate-500">This visit has not been synced yet.</p>

  return <PacketReview visit={visit} />
}

function PacketReview({ visit }) {
  const { data, error } = useFetch(() => getVisitCached(visit.server_id), [visit.server_id])
  const { data: rubric } = useFetch(() => getRubric(), [])
  const [approved, setApproved] = useState(null)
  const server = approved ?? data

  if (error) return <p className="text-red-600">Could not load the packet: {error}</p>
  if (!server) return <p className="text-slate-500">Loading packet…</p>

  const packet = server.packet
  const priorityItem = rubric?.items.find((item) => item.id === packet?.priority_rubric_item)

  return (
    <div className="space-y-5 pb-28">
      <Link to="/" className="text-sm text-emerald-700">
        ← Home
      </Link>

      <div>
        <h1 className="text-xl font-semibold">Coaching packet · {server.teacher_name}</h1>
        <p className="text-sm text-slate-500">
          Grade {server.grade} · {server.school_name} · {formatDate(visit.started_at)}
        </p>
      </div>

      {!packet ? (
        <p className="text-slate-500">The packet is not ready yet ({server.status}).</p>
      ) : (
        <>
          <section className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
            <p className="font-medium text-slate-500">Summary for you (English)</p>
            <p className="mt-1">{packet.english_gloss}</p>
            {priorityItem && (
              <p className="mt-2 text-slate-600">
                Priority: <span className="font-medium">{priorityItem.text.en}</span>
              </p>
            )}
          </section>

          {server.status === 'approved' ? (
            <>
              <ShareLink server={server} />
              <ApprovedPacket packet={packet} language={server.language} />
            </>
          ) : (
            <PacketForm visit={visit} packet={packet} language={server.language} onApproved={setApproved} />
          )}

          <Link
            to={`/visits/${visit.id}/rehearse`}
            className="block rounded-xl border border-slate-200 bg-white p-4 text-sm active:bg-slate-50"
          >
            <span className="font-medium text-emerald-700">Practise the conversation →</span>
            <span className="mt-0.5 block text-slate-600">
              Claude plays {server.teacher_name.split(' ')[0]} so you can rehearse the debrief (needs internet).
            </span>
          </Link>

          <Evidence packet={packet} />
          <Transcripts server={server} />
        </>
      )}
    </div>
  )
}

// Editable packet. Edits are kept on the phone as the CRP types, and sent to the server on approve.
function PacketForm({ visit, packet, language, onApproved }) {
  const online = useOnline()
  const original = toForm(packet)
  const [form, setForm] = useState(visit.packet_draft ?? original)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const edited = FIELDS.some(({ key }) => form[key] !== original[key])
  // Notes meant for the CRP, like "[CRP: add an example]", must be removed before the teacher sees the packet.
  const notesLeft = FIELDS.filter(({ key }) => hasCrpNote(form[key]))

  function change(key, value) {
    const next = { ...form, [key]: value }
    setForm(next)
    updateVisit(visit.id, { packet_draft: next })
  }

  function undoEdits() {
    setForm(original)
    updateVisit(visit.id, { packet_draft: null })
  }

  async function approve() {
    if (!window.confirm('Approve this packet? You cannot edit it after it is shared with the teacher.')) return
    setSaving(true)
    setError(null)
    try {
      onApproved(await approvePacket(visit, edited ? toEdits(form) : null))
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <>
      <p className="rounded-lg bg-slate-100 p-3 text-xs text-slate-600">
        Written in the teacher's language. Change anything that does not match what you saw.
      </p>

      {FIELDS.map(({ key, label, hint }) => (
        <label key={key} className="block space-y-1">
          <span className="font-medium">{label}</span>
          {hint && <span className="ml-2 text-xs text-slate-500">{hint}</span>}
          <textarea
            lang={language}
            value={form[key]}
            onChange={(event) => change(key, event.target.value)}
            className={`field-sizing-content min-h-16 w-full rounded-xl border bg-white p-3 text-sm ${
              hasCrpNote(form[key]) ? 'border-rose-400 ring-2 ring-rose-100' : 'border-slate-200'
            }`}
          />
          {hasCrpNote(form[key]) && (
            <span className="block text-xs text-rose-700">
              This has a note for you in [brackets]. Replace it with what you saw, or delete it: the teacher will read this.
            </span>
          )}
        </label>
      ))}

      {edited && (
        <button onClick={undoEdits} className="text-sm text-slate-600 underline">
          Undo my edits
        </button>
      )}

      <div className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-md space-y-1 px-4 py-3">
          {error && <p className="text-sm text-red-600">Could not approve: {error}</p>}
          {notesLeft.length > 0 && (
            <p className="text-sm text-rose-700">
              Remove the note for you in: {notesLeft.map(({ label }) => label).join(', ')}
            </p>
          )}
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-slate-600">
              {!online ? 'Offline · edits saved on phone' : edited ? 'Edited · saved on phone' : 'No edits'}
            </p>
            <button
              onClick={approve}
              disabled={!online || saving || notesLeft.length > 0}
              className="rounded-lg bg-emerald-700 px-4 py-3 font-medium text-white disabled:opacity-50"
            >
              {saving ? 'Approving…' : 'Approve and share'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

function ApprovedPacket({ packet, language }) {
  return FIELDS.map(({ key, label, list }) => (
    <section key={key} className="space-y-1">
      <h2 className="font-medium">{label}</h2>
      {list ? (
        <ol lang={language} className="list-decimal space-y-1 pl-5 text-sm">
          {packet[key].map((line, index) => (
            <li key={index}>{line}</li>
          ))}
        </ol>
      ) : (
        <p lang={language} className="whitespace-pre-line text-sm">
          {packet[key]}
        </p>
      )}
    </section>
  ))
}

// After approval: the WhatsApp message for the teacher, with the advice in their language and the link for details.
function ShareLink({ server }) {
  const [copied, setCopied] = useState(false)
  const url = `${window.location.origin}/t/${server.share_token}`
  const message = whatsappMessage(server, url)
  const firstName = server.teacher_name.split(' ')[0]

  async function shareOther() {
    await navigator.share({ title: 'VisitCoach', text: message }).catch(() => {})
  }

  async function copy() {
    await navigator.clipboard.writeText(message)
    setCopied(true)
  }

  return (
    <section className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
      <p className="font-medium">Approved. Send {firstName} this message on WhatsApp.</p>
      <p lang={server.language} className="whitespace-pre-wrap rounded-lg bg-white p-3 text-slate-800 shadow-sm">
        {message}
      </p>
      <div className="flex flex-wrap gap-3">
        <a
          href={whatsappUrl(message)}
          target="_blank"
          rel="noreferrer"
          className="rounded-lg bg-emerald-700 px-3 py-2 font-medium text-white"
        >
          Send on WhatsApp
        </a>
        {navigator.share && (
          <button onClick={shareOther} className="rounded-lg px-3 py-2 text-emerald-800 underline">
            Other apps
          </button>
        )}
        {navigator.clipboard && (
          <button onClick={copy} className="rounded-lg px-3 py-2 text-emerald-800 underline">
            {copied ? 'Copied' : 'Copy message'}
          </button>
        )}
      </div>
    </section>
  )
}

// Why Claude chose this priority, and where the advice comes from. For the CRP only.
function Evidence({ packet }) {
  return (
    <section className="space-y-2 rounded-xl border border-slate-200 bg-white p-4 text-sm">
      <h2 className="font-medium">Evidence from your notes</h2>
      <ul className="list-disc space-y-1 pl-5 text-slate-700">
        {packet.evidence.map((line, index) => (
          <li key={index}>{line}</li>
        ))}
      </ul>
      <details className="text-slate-600">
        <summary className="cursor-pointer text-emerald-700">Sources ({packet.sources.length})</summary>
        <ul className="mt-2 space-y-2">
          {packet.sources.map((source) => (
            <li key={source.id}>
              <p className="font-medium">
                {source.document}, p.{source.page}
              </p>
              <p className="italic">“{source.text}”</p>
            </li>
          ))}
        </ul>
      </details>
    </section>
  )
}

// What the CRP said and typed, as the server understood it. Checking this catches speech-to-text mistakes.
function Transcripts({ server }) {
  const notes = server.notes ?? []
  if (notes.length === 0 && !server.typed_note) return null

  return (
    <details className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
      <summary className="cursor-pointer font-medium text-emerald-700">
        Your notes, as the app heard them ({notes.length + (server.typed_note ? 1 : 0)})
      </summary>
      <ol className="mt-2 space-y-2">
        {notes.map((note, index) => (
          <li key={note.id} lang={server.language} className="rounded-lg bg-slate-50 p-2">
            <span className="mr-1 text-xs font-medium text-slate-500">Voice note {index + 1}:</span>
            {note.transcript || <span className="italic text-slate-500">(nothing heard)</span>}
          </li>
        ))}
        {server.typed_note && (
          <li lang={server.language} className="rounded-lg bg-slate-50 p-2">
            <span className="mr-1 text-xs font-medium text-slate-500">Typed note:</span>
            {server.typed_note}
          </li>
        )}
      </ol>
      <p className="mt-2 text-xs text-slate-500">
        If a voice note was heard wrongly, fix the packet text above before approving.
      </p>
    </details>
  )
}

// Lists are edited as one item per line.
function toForm(packet) {
  return Object.fromEntries(
    FIELDS.map(({ key, list }) => [key, list ? packet[key].join('\n') : packet[key]]),
  )
}

function toEdits(form) {
  return Object.fromEntries(
    FIELDS.map(({ key, list }) => [key, list ? form[key].split('\n') : form[key]]),
  )
}
