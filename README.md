# VisitCoach

An AI copilot that turns every CRP school visit into one actionable coaching intervention for Grade 1–3 FLN teachers.
Team Semicolon · FLN Hackathon, Challenge 05 (System Capacity).

- What we're building and when (and what's pending): [PLAN.md](PLAN.md)
- Why we chose what we chose: [DECISIONS.md](DECISIONS.md)
- How it works end to end: [FLOW.md](FLOW.md) (plain-words walkthrough)
- What's left for later: [improvements/futurescope.md](improvements/futurescope.md)
- Mentor call feedback (28 Oct) and what we're changing because of it: [MENTOR.md](MENTOR.md)
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

## Tests and checks

```bash
cd backend && uv run pytest
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

On first start the server creates 22 made-up schools with a few weeks of visit history, so the block view (`/block`) and the next-visit check have something to show. To start fresh (for example after pulling new demo data), stop the server and delete `backend/data/visitcoach.db`.

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
  seed.py          made-up demo data: 22 schools + visit history
  knowledge/       FLN knowledge pack (JSON): rubric, practices, Lakshyas, source excerpts
  routes/          HTTP endpoints, thin — they call a controller
  controllers/     the logic for each feature: db reads/writes + services
  services/        external APIs (Claude, Sarvam) and pure helpers
backend/tests/     pytest, uses a throwaway db
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
