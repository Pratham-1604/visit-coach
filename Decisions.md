# Decisions

A short log of the choices we made and why. Add new ones at the bottom. If you change a decision, edit its entry and say why.

Format: **Decision**, then *Why*, *Alternatives* (not chosen), *Consequences*, and *Revisit when*.

---

### 1. Build a PWA, not a Flutter app
- **Why:** There are 3 days to build. Judges can open a URL on any phone, with no APK, sideloading or Play Store review. A PWA can still work offline, record audio and be installed on the home screen.
- **Alternatives:** Flutter + SQLite (it's in the proposal, but deployment and distribution are slow).
- **Consequences:** Offline storage is IndexedDB instead of SQLite. Background sync is limited, so sync runs when the app is open or when the CRP taps "Sync now".
- **Revisit when:** A real pilot needs background sync or device integration. A TWA wrapper or Flutter goes in the future scope.

### 2. React + Vite + plain JavaScript + Tailwind
- **Why:** Fastest to write and easy for anyone on the team to read. Tailwind keeps styling inside the components.
- **Alternatives:** TypeScript (extra friction in a 3-day build), Next.js (we don't need SSR).

### 3. Backend layering: routes → controllers → services → db, all functions
- **Why:** It's simple to follow. Routes only handle HTTP, controllers hold the feature logic, and services wrap outside APIs (Claude, Sarvam). Plain functions instead of classes or inheritance make it quick to pick up.
- **Consequences:** Pydantic models are the only classes, and they are used purely as data shapes.

### 4. FastAPI + plain sqlite3 (no ORM), one container
- **Why:** There's nothing to set up. FastAPI also serves the built frontend, so there is one deployable unit and one URL.
- **Alternatives:** SQLModel/SQLAlchemy, or Postgres (Neon/Supabase). Both are overkill for the demo.
- **Consequences:** A single instance, and data resets on redeploy, so the seed data loads on boot.
- **Revisit when:** More than one server instance is needed, or data has to persist across deploys.

### 5. Sarvam AI for Indic speech-to-text
- **Why:** It's cheapest for a demo: ₹100 free credit, about 2 h of audio at ₹30/h. It's a hosted API (no GPU), handles Tamil, Hindi and Marathi (`ta-IN`, `hi-IN`, `mr-IN`) and accepts WebM from the browser recorder. We use `POST https://api.sarvam.ai/speech-to-text` with `model=saaras:v3`.
- **Alternatives:** Bhashini (free, but onboarding is slow), self-hosted AI4Bharat IndicConformer (needs a GPU).
- **Consequences:** The REST endpoint is meant for clips under 30 s, so see #8.
- **Revisit when:** We go to a pilot. Bhashini would strengthen the government-alignment story.

### 6. Claude Opus 5.5 via the Anthropic API
- **Why:** We have $500 in credits. It writes in Indic languages well, supports structured outputs (Pydantic) so packets are always valid JSON, and supports prompt caching for the knowledge pack.
- **Settings:** effort `medium` for packets, `low` for rehearsal chat turns, `medium` for scoring and the block narrative. The server-side refusal fallback is on.
- **Alternatives:** Amazon Bedrock (as in the proposal). It adds AWS setup and doesn't use our credits.

### 7. Ground on a curated knowledge pack in a cached system prompt, not vector RAG
- **Why:** The pack (NIPUN Bharat observation and feedback expectations, Grade 1–3 goals, pedagogy practices) fits easily in context. Caching makes repeat calls cheap and fast. Each packet cites the pack section IDs it used (`grounded_in`).
- **Alternatives:** A vector DB with embeddings. That's more infrastructure and gains nothing at this size.
- **Revisit when:** The pack grows to full state handbooks and lesson plans.

### 8. Cap each voice note at 30 seconds
- **Why:** It fits Sarvam's REST limit and the proposal's "short, deliberate notes". A CRP can record several notes.

### 9. Demo CRP picker, no real login
- **Why:** Auth isn't what we're being judged on. A share token protects the teacher view.
- **Revisit when:** Real users join. Roles needed: CRP, teacher, block officer.

### 10. Two-tier data
- **Why:** Teachers fear inspection. The coaching record stays between the CRP and the teacher, and the block only sees aggregated needs, never teacher scores.
- **Consequences:** Block endpoints return counts per need area only. A test checks that no per-teacher fields leak.

### 11. Eval: LLM judge now, practitioner ratings later
- **Why:** We can't recruit education practitioners in 3 days. 50 synthetic cases are scored by Claude against a rubric: specific, a single priority, doable in 5 minutes, grounded, respectful, correct language.
- **Revisit when:** Mentors can connect us with practitioners.

### 12. Synthetic data only
- **Why:** No child audio and no personal data. The schools, teachers, FLN levels and voice notes are all made up. Test voice samples come only from consenting adult volunteers.

### 13. Ground the knowledge pack on the hackathon `sources/` library, with verified verbatim excerpts
- **Why:** The workspace above this repo already holds the public FLN documents (KVS FLN monitoring booklet, NIPUN Bharat guidelines, NCF-FS 2022, with extracted text) plus `DATA_INVENTORY.md`. The rubric starts from the classroom-observable items on the KVS checklist, adds the two items it lacks (children read themselves, pair/group work), and the practice library adapts KVS's suggested activities and NCF-FS §4.5 strategies. Packets cite our own passage ids (`grounded_in`), and the server rejects unknown ids.
- **Consequences:** `app/knowledge/grounding.json` holds short verbatim excerpts, so the app doesn't need the PDFs at runtime. `scripts/check_grounding.py ../../sources` checks every excerpt against its cited page. Page numbers are PDF pages, not printed pages. Hindi, Marathi and Tamil rubric labels are drafts that need a native-speaker check.
- **Alternatives:** Native API citations (can't be combined with structured outputs), or vector RAG (see #7).

### 14. The workspace's `APP_PLAN.md` is a reference, not the build plan
- **Why:** `../APP_PLAN.md` describes a bigger system (Postgres, job worker, Dexie outbox with pull cursors, JWT auth, a separate evidence-extraction call). For this build we keep decisions #1–#12: SQLite, background tasks, no login, and one packet call. We reuse its content: the rubric/practice/citation design, the safety rules (one priority, no teacher scores, 5-minute practices, "insufficient evidence" over invention), and its k-anonymity rule for the block view.
- **Revisit when:** A pilot needs multi-device sync or real users. That is when APP_PLAN's server design applies.
