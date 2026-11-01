# VisitCoach

VisitCoach gives India's cluster mentors (CRPs, Kendra Pramukhs, ARPs) more time to mentor: every classroom visit ends with one clear, NIPUN-aligned action for the teacher, sent on WhatsApp, and the next mentor picks up where the last one left off. Our research and demo use Maharashtra as the example state. Any state can upload its own checklist; the teacher gets advice in Hindi, Marathi or Tamil.
Team Semicolon · FLN Hackathon, Challenge 05 (System Capacity).

- Research and source documents (NIPUN Bharat, NCF-FS, KVS FLN tools): Dhruv's workspace `../edu-hackathon-fln/` (outside this repo). The app only needs the verified excerpts in `backend/app/knowledge/grounding.json`.

## For evaluators

- **Working demo:** https://visitcoach-514819575049.asia-south1.run.app (public; opens in any phone or laptop browser, nothing to install). The first load after a quiet spell takes a few seconds.
- **Demo video:** https://youtube.com/shorts/bS4kY_5r2ts
- **Code:** this repository is public. To run it yourself, see [Run it locally](#run-it-locally).

All schools, teachers and visit history are made up. Every evaluator shares the same demo accounts, and the demo data reloads when the server restarts, so a visit you add may later disappear.

### Test credentials

| Role | Login | What to look at |
|---|---|---|
| Mentor (Kendra Pramukh) | `sachin` / `sachin123` | ZP Primary School Wagholi → Sunita Pawar: coaching history, then **Start visit** |
| Mentor | `vandana` / `vandana123` | Same schools, as one of the earlier mentors |
| Teacher | no login | The link a mentor sends on WhatsApp, e.g. https://visitcoach-514819575049.asia-south1.run.app/t/seed3: the notes read aloud, with **Read in English** |
| Block officer | `officer` / `officer123` | Support planning: needs counted across schools, never a teacher's name |
| State admin (SCERT) | `admin` / `admin123` | The state checklist and **What the visits say** about it |

The menu (your name, top right) switches the screens between English, मराठी and हिंदी. Please don't upload a new checklist version on the shared demo: it would change the checklist for every evaluator. To try uploads, run the app locally with the sample file `demo/maharashtra_checklist_v2.csv`.

### Sample inputs

Log in as `sachin`, open **ZP Primary School Wagholi**, and tap **Start visit** for a teacher.

1. **A visit with a typed note (Sunita Pawar).** Set *Children present* to `31` and tick Grades `1` and `2` as sitting together. Rate a few checklist items, and rate *Most children, including back rows and slower learners, get a turn* as **Yes**. Open **📝 Notes** and paste:
   > Paired reading from the last visit has started: most pairs read the day's lesson together for about 5 minutes. The back-row Grade 1 children mostly watched and did not get a turn. Number cards are on the wall but were not used; children counted on their fingers for subtraction. The teacher explained new words with examples from home. Four children had no textbook and shared.

   **Expected:** **End visit** shows *Before you end the visit*, where Claude flags that the "back rows get a turn" tick disagrees with the note. After ending, the coaching packet is ready in about a minute: Marathi for the teacher, with English under each line. It builds on the earlier mentor's paired-reading action. **Approve and share** gives the WhatsApp message and its audio.

2. **A note written in Marathi (Rahul Jadhav).** Paste:
   > मुलांनी मण्यांच्या माळेने दहाच्या गटात मोजणी केली. फळ्यावरील बेरजेची उदाहरणे शिक्षकांनी स्वतःच सोडवली; मुलांना स्वतः करून पाहण्याची संधी कमी मिळाली. पहिलीची काही मुले अंक तोंडपाठ म्हणत होती, पण वस्तू मोजताना अडखळत होती.

   **Expected:** a packet focused on children working with objects themselves, and an English summary for the mentor.

3. **A voice note.** In **📝 Notes**, tap **Record a note** (allow the microphone) and speak for up to 30 seconds, in English, Hindi or Marathi. For example: *"Children read in pairs today, but the teacher answered most questions herself."*
   **Expected:** after the visit ends, the packet page shows the transcript under *Your notes, as the app heard them*, and the advice uses it.

4. **Rehearse the debrief.** From any coaching packet, open **Practise the conversation** and type:
   > Sunita tai, the paired reading has really started, well done. What did you notice about the back-row children today?

   **Expected:** Claude replies in Marathi as the teacher and may push back. **End and get feedback** gives a score card on 5 criteria.

5. **A visit with no signal.** Open the app once while online, turn on airplane mode, then run a visit with taps and a note and end it.
   **Expected:** everything works offline, and the visit waits on the phone. When the phone is back online, it uploads without a tap and the packet follows.

## Run it locally

You need [uv](https://docs.astral.sh/uv/) and Node 20+.

```bash
cp .env.example .env          # then add your API keys

# terminal 1 — backend on :8000
cd backend
uv sync
uv run uvicorn app.main:app --reload

# terminal 2 — frontend on :5173 (proxies /api to :8000)
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. Use Chrome DevTools' device mode to see the phone layout.

## AI models and external services

All AI calls are made by the server. The phone never calls an AI service, and API keys stay on the server.

| Service | Model | Used for | Code |
|---|---|---|---|
| Anthropic Claude API | `claude-opus-5-5`, effort `medium` | Coaching packet in the teacher's language; rehearsal score card; new checklist items suggested to the state | `services/packet.py`, `rehearsal.py`, `checklist_review.py` |
| Anthropic Claude API | `claude-opus-5-5`, effort `low` | "Did I miss anything?" check at the end of a visit; the teacher in rehearsal; visit report; teacher's notes in English | `services/review.py`, `rehearsal.py`, `report.py`, `translate.py` |
| Sarvam AI speech-to-text | `saaras:v3` | Turns each voice note (up to 30 s) into text, once | `services/asr.py` |
| Sarvam AI text-to-speech | `bulbul:v3` | Reads the approved teacher's notes aloud (Marathi, Hindi, Tamil, or English) | `services/tts.py` |
| Google Cloud Run (`asia-south1`, Mumbai) | – | Hosts the live demo: one container with the API and the built app | `Dockerfile` |

Every Claude call goes through one function, `services/llm.py`. It uses structured output (a fixed JSON shape), a cached FLN knowledge pack as the system prompt, and Anthropic's server-side fallback model if a request is refused. The quality check in `backend/evals/` also uses Claude, as a grader; it is not part of the app.

## Configuration

Settings are read from a `.env` file in the repo root (copy `.env.example`), or from environment variables in Docker and Cloud Run.

| Variable | Required | What it does |
|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | Claude: coaching packets, checks, rehearsal, reports, translation |
| `SARVAM_API_KEY` | For voice | Voice notes (speech-to-text) and the teacher's audio (text-to-speech). Without it, visits with only typed notes still work, and the teacher's page shows text without audio |
| `DB_PATH` | No | SQLite database file. Default `backend/data/visitcoach.db` |
| `UPLOAD_DIR` | No | Uploaded voice notes. Default `backend/data/uploads` |
| `SHARED_DIR` | No | Cached teacher audio and English notes. Default `backend/data/shared` |

On first start the server creates the database, the demo checklist, the demo data and the demo logins, so no other setup is needed.

## Checks

```bash
cd frontend && npm run lint && npm run build

# every grounding excerpt must appear on its cited page (needs Dhruv's sources folder)
cd backend && uv run python scripts/check_grounding.py ../../edu-hackathon-fln/sources
```

## Coaching packet from the CLI

```bash
cd backend
uv run python -m app.services.packet            # synthetic Grade 2 Marathi visit -> packet JSON
uv run python -m app.services.packet --twice    # usage on stderr; 2nd call should show cache_read_input_tokens > 0
```

## Demo data

On first start the server creates 5 made-up schools in Maharashtra (our research and demo state) with a few weeks of visit history, so the support planning page (`/block`), the next-visit check and the coaching history have something to show. The demo teacher is **Sunita Pawar** (ZP Primary School Wagholi), with 3 earlier visits by mentors Kiran Bhagat and Vandana Joshi. For the demo, log in as the new mentor **Sachin Gore**. The logins are in [Test credentials](#test-credentials); the login screen lists them too (prototype only). The teacher's shared link needs no login. The menu (your name, top right) also switches between light and dark.

To start fresh (for example after pulling new demo data), stop the server and delete `backend/data/visitcoach.db`.

## Quality check (costs credits)

```bash
cd backend
uv run python -m evals.run_eval --limit 3   # try 3 cases first (about $0.10-0.15 each)
uv run python -m evals.run_eval             # all cases; writes evals/results.json + prints a summary
```

## Production-style run

`npm run build` writes `frontend/dist`. FastAPI serves it, so one server handles the app and the API:

```bash
cd frontend && npm run build
cd ../backend && uv run uvicorn app.main:app --port 8000   # open http://localhost:8000
```

The app only keeps working offline in the **built** version (`npm run build` / the deployed site), not in `npm run dev`.

## Docker

```bash
docker build -t visitcoach .
docker run -p 8000:8000 -e ANTHROPIC_API_KEY=... -e SARVAM_API_KEY=... visitcoach   # open http://localhost:8000
```

## Code layout

```
backend/app/
  main.py          app setup, routers, serves frontend/dist
  config.py        settings from .env
  db.py            sqlite3 helpers: query(), query_one(), execute()
  seed.py          made-up demo data: 5 schools + visit history
  knowledge/       FLN knowledge pack (JSON): rubric, practices, Lakshyas, source excerpts
  routes/          HTTP endpoints, thin — they call a controller
  controllers/     the logic for each feature: db reads/writes + services
  services/        external APIs (Claude, Sarvam) and pure helpers
backend/scripts/   one-off checks, e.g. check_grounding.py (excerpts vs source PDFs)
backend/evals/     quality check: synthetic visits + AI grader (costs credits)

frontend/src/
  router.jsx       every page/URL is listed here
  api/             one file per backend feature, plain fetch functions
  pages/           one component per screen
  components/      reusable UI pieces
  lib/             hooks and helpers (offline storage and sync go here)
```

**Adding a feature:** add a `routes/x.py` + `controllers/x.py` (+ `services/x.py` if it calls an outside API), include the router in `main.py`, add `api/x.js` + a page, and register the page in `router.jsx`.

We use plain functions everywhere and avoid classes, except Pydantic models used as data shapes.
