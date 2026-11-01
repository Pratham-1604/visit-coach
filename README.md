# VisitCoach

VisitCoach gives India's cluster mentors (CRPs, Kendra Pramukhs, ARPs) more time to mentor: every classroom visit ends with one clear, NIPUN-aligned action for the teacher, sent on WhatsApp, and the next mentor picks up where the last one left off. Our research and demo use Maharashtra as the example state. Any state can upload its own checklist; the teacher gets advice in Hindi, Marathi or Tamil.
Team Semicolon · FLN Hackathon, Challenge 05 (System Capacity).

- Research and source documents (NIPUN Bharat, NCF-FS, KVS FLN tools): Dhruv's workspace `../edu-hackathon-fln/` (outside this repo). The app only needs the verified excerpts in `backend/app/knowledge/grounding.json`.

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

## Checks

```bash
cd frontend && npm run lint && npm run build

# every grounding excerpt must appear on its cited page (needs Dhruv's sources folder)
cd backend && uv run python scripts/check_grounding.py ../../edu-hackathon-fln/sources
```

`.env` needs `ANTHROPIC_API_KEY` for packets and `SARVAM_API_KEY` for voice notes. Without the Sarvam key, visits that only have a typed note still work.

## Coaching packet from the CLI

```bash
cd backend
uv run python -m app.services.packet            # synthetic Grade 2 Marathi visit -> packet JSON
uv run python -m app.services.packet --twice    # usage on stderr; 2nd call should show cache_read_input_tokens > 0
```

## Demo data

On first start the server creates 5 made-up schools in Maharashtra (our research and demo state) with a few weeks of visit history, so the support planning page (`/block`), the next-visit check and the coaching history have something to show. The demo teacher is **Sunita Pawar** (ZP Primary School Wagholi), with 3 earlier visits by mentors Kiran Bhagat and Vandana Joshi. For the demo, log in as the new mentor **Sachin Gore**.

| Username | Password | Who |
|---|---|---|
| `sachin` | `sachin123` | Mentor (Kendra Pramukh), Sachin Gore |
| `vandana` | `vandana123` | Mentor, Vandana Joshi |
| `officer` | `officer123` | Block officer: sees support planning only |
| `admin` | `admin123` | State admin (SCERT): manages the state checklist only |

The login screen lists these too (prototype only). The teacher's shared link needs no login. The menu (your name, top right) switches the screens between English, मराठी and हिंदी, and between light and dark.

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
