import { formatDate } from './format.js'
import { teacherLabels } from './labels.js'

const MAX_PART = 220 // characters per part, so the message reads at a glance on a phone

// The WhatsApp message for the teacher, in their language: the advice itself, with the link only for details.
// Teachers get feedback where they already are, with no app or login (MENTOR.md #11).
export function whatsappMessage(server, url) {
  const labels = teacherLabels(server.language)
  const { packet } = server
  return [
    `*${labels.title}*`,
    `${server.teacher_name.split(' ')[0]} · ${formatDate(server.approved_at)}`,
    '',
    `✅ *${labels.strength}*`,
    short(packet.strength),
    '',
    `🎯 *${labels.priority}*`,
    short(packet.priority),
    '',
    `📌 *${labels.follow_up}*`,
    short(packet.follow_up),
    '',
    `${labels.details}: ${url}`,
  ].join('\n')
}

export function whatsappUrl(message) {
  return `https://wa.me/?text=${encodeURIComponent(message)}`
}

// Cut long text at a word boundary.
function short(text) {
  const clean = (text ?? '').trim()
  if (clean.length <= MAX_PART) return clean
  const cut = clean.slice(0, MAX_PART)
  return `${cut.slice(0, cut.lastIndexOf(' ') > 0 ? cut.lastIndexOf(' ') : MAX_PART)}…`
}
