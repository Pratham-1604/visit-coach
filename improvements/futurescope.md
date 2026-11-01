# Improvements and future scope

## After the hackathon
- **Native wrapper:** a TWA or Flutter shell for reliable background sync and Play Store distribution.
- **On-device or offline speech recognition**, so notes are transcribed even without internet.
- **Bhashini integration** to align with the government's language platform.
- **Real retrieval (RAG)** over full state FLN handbooks, lesson plans and TLM guides, once the knowledge pack grows too large to fit in the prompt.
- **Real login:** phone + OTP or state single sign-on, tokens that expire, and accounts created by an admin. The prototype has demo users and roles (mentor, block officer, state admin; DECISIONS.md #25).
- **WhatsApp bot (phase 2, MENTOR.md #12):** mentors send voice notes and tap follow-up buttons in WhatsApp, with no app. Meta's WhatsApp Cloud API calls a webhook on our server (`routes/whatsapp.py`), which reuses Sarvam, the packet, follow-ups and history. Needs a Meta business account and a phone number (ideally owned by the state), approved message templates for sending to teachers first, a per-message budget, and phone numbers for mentors and teachers. WhatsApp also holds voice notes until there's signal, which covers offline use.
- **Teacher "I tried it"** on the shared link, so the next mentor sees the teacher's own answer next to the follow-up check.
- **Checklist drafts and more states:** let a state review a new checklist version before it goes live, and add a second state (the upload and versions are built, DECISIONS.md #28).
- **Send the visit report where the state wants it** (a portal, email or form), once we know the channel. Today the mentor sends it on WhatsApp or as a PDF (#30).
- **Check voice notes in "Did I miss anything?"** once they can be transcribed on the phone (#29).
- **Integration with state visit apps** (e.g. Jharkhand e-Vidya Vahini, Gujarat BRC/CRC forms), so we add coaching on top of their existing data capture.
- **Practitioner-rated evaluation set** to replace or calibrate the LLM judge.
- **More languages** beyond Tamil, Hindi and Marathi.
- **Voice read-out (TTS)** of packets for teachers.
- **Pilot with real mentors** (Kendra Pramukhs) that measures the 5 proposal metrics: time from observation to feedback, % of visits ending in a concrete action, % of actions done by the next visit, mentor edit and acceptance rate, and teacher usefulness rating.

## Production architecture
Dhruv's `APP_PLAN.md` (in the `edu-hackathon-fln` workspace) already designs the scaled-up system. For the build we kept the simple version ([DECISIONS.md](../DECISIONS.md) #4, #14):
- Postgres with a jobs queue and a separate worker, instead of SQLite + background tasks
- Phone + PIN login with roles (mentor, block officer, admin)
- Two-way push/pull sync with versions and conflict rules, and resumable chunked audio upload
- A separate evidence-extraction call before the packet call
- Full-text or vector retrieval over chunked sources, once the knowledge pack outgrows one prompt
- An events table for metrics, and audio deleted 30 days after approval

## More data to collect (see `DATA_INVENTORY.md` in the workspace)
- **State FLN materials (D14):** TN *Ennum Ezhuthum*, NIPUN Maharashtra, a Hindi-belt state handbook. Packets could then cite the teacher's own state material.
- **A real CRC coaching manual:** the Assam CRCC training handbook (Jan 2025). It would ground the "how to give feedback" guidance, which no current source covers.
- **Native-speaker-checked** Hindi, Marathi and Tamil rubric labels and FLN glossaries (D11).
- **Consented adult voice samples (D10)**, e.g. AI4Bharat Kathbath / IndicVoices, to evaluate speech-to-text.
- **A practitioner-rated eval set (D25)** and real block and school rosters (D1, D2).

## Known limitations of the prototype
- All data is synthetic, and there is no child-level data.
- The Marathi and Hindi screens, and the Hindi, Marathi and Tamil checklist labels, are drafts awaiting a native-speaker check.
- Approving a packet needs a connection (review and edits work offline).
- A visit with only checklist taps (no voice or typed note) gives general advice. The packet says so, but the demo should always include a note.
- Hindi/Marathi text can't match the mentor's gender (we don't store it), so packets use neutral phrasing. A mentor profile with a preferred form would fix this.
- Login is demo-grade: passwords are shown on the login screen, and tokens don't expire.
- SQLite runs on a single instance, and data resets on redeploy.
- The free hosting tier sleeps when idle, so the first request after a pause is slow.
- Voice notes are capped at 30 s.

## Not done yet (may still happen before the deadline)
- Claude-written summary on the block view (the counts and metrics are there).
- Mentor screens in Tamil (English, Marathi and Hindi are done; the teacher's page and packets already support Tamil).
- Noto Devanagari/Tamil fonts bundled with the app.
- The eval has 14 cases (2 multi-grade); the target is 50.
- Demo packets are library text marked "Demo data" in English; only their agreed actions are in the school's language.

## Cut during the build
_Add items here if we drop them to meet the deadline._
