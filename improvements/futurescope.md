# Improvements and future scope

## After the hackathon
- **Native wrapper:** a TWA or Flutter shell for reliable background sync and Play Store distribution.
- **On-device or offline speech recognition**, so notes are transcribed even without internet.
- **Bhashini integration** to align with the government's language platform.
- **Real retrieval (RAG)** over full state FLN handbooks, lesson plans and TLM guides, once the knowledge pack grows too large to fit in the prompt.
- **Login and roles:** CRP, teacher and block officer, plus state SSO.
- **WhatsApp delivery** of approved packets to teachers.
- **Integration with state visit apps** (e.g. Jharkhand e-Vidya Vahini, Gujarat BRC/CRC forms), so we add coaching on top of their existing data capture.
- **Practitioner-rated evaluation set** to replace or calibrate the LLM judge.
- **More languages** beyond Tamil, Hindi and Marathi.
- **Voice read-out (TTS)** of packets for teachers.
- **Pilot with real CRPs** that measures the 5 proposal metrics: time from observation to feedback, % of visits ending in a concrete action, % of actions done by the next visit, CRP edit and acceptance rate, and teacher usefulness rating.

## Known limitations of the prototype
- All data is synthetic, and there is no child-level data.
- SQLite runs on a single instance, and data resets on redeploy.
- The free hosting tier sleeps when idle, so the first request after a pause is slow.
- Voice notes are capped at 30 s.

## Cut during the build
_Add items here if we drop them to meet the deadline._
