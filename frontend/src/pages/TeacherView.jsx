import { useParams } from 'react-router-dom'
import { getSharedPacket } from '../api/teacher.js'
import { formatDate } from '../lib/format.js'
import { useFetch } from '../lib/useFetch.js'

// Headings in the teacher's language. Drafts: to be checked by native speakers (DECISIONS.md #13).
const LABELS = {
  en: {
    title: 'Notes from your class visit',
    strength: 'What went well',
    priority: 'One thing to work on',
    practice_steps: '5-minute practice for tomorrow',
    materials: 'Materials',
    follow_up: 'What we agreed before the next visit',
    follow_up_check: 'How we will look at it next time',
    error: 'This link does not work. Please ask your CRP to share it again.',
  },
  hi: {
    title: 'आपकी कक्षा की मुलाक़ात के नोट्स',
    strength: 'क्या अच्छा रहा',
    priority: 'एक चीज़ जिस पर काम करें',
    practice_steps: 'कल के लिए 5 मिनट का अभ्यास',
    materials: 'सामग्री',
    follow_up: 'अगली मुलाक़ात तक हमने क्या तय किया',
    follow_up_check: 'अगली बार हम इसे कैसे देखेंगे',
    error: 'यह लिंक काम नहीं कर रहा। कृपया अपने CRP से इसे दोबारा भेजने को कहें।',
  },
  mr: {
    title: 'तुमच्या वर्ग भेटीच्या नोंदी',
    strength: 'काय छान झाले',
    priority: 'लक्ष देण्यासारखी एक गोष्ट',
    practice_steps: 'उद्यासाठी ५ मिनिटांचा सराव',
    materials: 'साहित्य',
    follow_up: 'पुढच्या भेटीपर्यंत आपण काय ठरवले',
    follow_up_check: 'पुढच्या वेळी आपण हे कसे पाहू',
    error: 'ही लिंक चालत नाही. कृपया तुमच्या CRP ना ती पुन्हा पाठवायला सांगा.',
  },
  ta: {
    title: 'உங்கள் வகுப்பு வருகைக் குறிப்புகள்',
    strength: 'நன்றாக நடந்தது',
    priority: 'கவனம் செலுத்த வேண்டிய ஒன்று',
    practice_steps: 'நாளைக்கான 5 நிமிடப் பயிற்சி',
    materials: 'தேவையான பொருட்கள்',
    follow_up: 'அடுத்த வருகை வரை நாம் ஒப்புக்கொண்டது',
    follow_up_check: 'அடுத்த முறை இதை எப்படிப் பார்ப்போம்',
    error: 'இந்த இணைப்பு வேலை செய்யவில்லை. உங்கள் CRP-யிடம் மீண்டும் அனுப்பச் சொல்லுங்கள்.',
  },
}

const TEXT_FIELDS = ['strength', 'priority']
const LIST_FIELDS = ['practice_steps', 'materials']
const ACTION_FIELDS = ['follow_up', 'follow_up_check']

// What the teacher sees from the CRP's shared link. No app, no login, no CRP-only details.
export default function TeacherView() {
  const { token } = useParams()
  const { data, error, loading } = useFetch(() => getSharedPacket(token), [token])

  if (loading) return <Page>…</Page>
  if (error) return <Page>{LABELS.en.error}</Page>

  const labels = LABELS[data.language] ?? LABELS.en
  const { packet } = data

  return (
    <Page lang={data.language}>
      <header className="space-y-1">
        <h1 className="text-xl font-semibold">{labels.title}</h1>
        <p className="text-sm text-slate-500">
          {data.teacher_first_name} · {data.school_name} · {formatDate(data.approved_at)}
        </p>
      </header>

      {TEXT_FIELDS.map((key) => (
        <Section key={key} title={labels[key]} highlight={key === 'priority'}>
          <p className="whitespace-pre-line">{packet[key]}</p>
        </Section>
      ))}

      {LIST_FIELDS.map((key) => (
        <Section key={key} title={labels[key]}>
          <ol className={`space-y-1 pl-5 ${key === 'practice_steps' ? 'list-decimal' : 'list-disc'}`}>
            {(packet[key] ?? []).map((line, index) => (
              <li key={index}>{line}</li>
            ))}
          </ol>
        </Section>
      ))}

      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
        {ACTION_FIELDS.map((key) => (
          <div key={key} className="space-y-1 [&+&]:mt-3">
            <h2 className="text-sm font-semibold text-emerald-900">{labels[key]}</h2>
            <p className="whitespace-pre-line text-emerald-950">{packet[key]}</p>
          </div>
        ))}
      </div>
    </Page>
  )
}

function Page({ lang, children }) {
  return (
    <div lang={lang} className="min-h-screen bg-slate-50 text-slate-900">
      <div className="bg-emerald-700 px-4 py-3 text-center text-sm font-medium text-white">VisitCoach</div>
      <main className="mx-auto max-w-md space-y-4 px-4 py-5 text-[15px] leading-relaxed">{children}</main>
    </div>
  )
}

function Section({ title, highlight, children }) {
  return (
    <section className={`rounded-xl border bg-white p-4 ${highlight ? 'border-amber-300' : 'border-slate-200'}`}>
      <h2 className="mb-1 text-sm font-semibold text-slate-500">{title}</h2>
      {children}
    </section>
  )
}
