# VisitCoach

An AI copilot that turns every CRP school visit into one actionable coaching intervention for Grade 1–3 FLN teachers.
Team Semicolon · FLN Hackathon, Challenge 05 (System Capacity).

- What we're building and when: [PLAN.md](PLAN.md)
- Why we chose what we chose: [Decisions.md](Decisions.md)
- How it works end to end: [flow.md](flow.md)
- What's left for later: [improvements/futurescope.md](improvements/futurescope.md)

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
```

## Production-style run

`npm run build` writes `frontend/dist`. FastAPI serves it, so one server handles the app and the API:

```bash
cd frontend && npm run build
cd ../backend && uv run uvicorn app.main:app --port 8000   # open http://localhost:8000
```

## Code layout

```
backend/app/
  main.py          app setup, routers, serves frontend/dist
  config.py        settings from .env
  db.py            sqlite3 helpers: query(), query_one(), execute()
  seed.py          synthetic demo schools and teachers
  routes/          HTTP endpoints, thin — they call a controller
  controllers/     the logic for each feature: db reads/writes + services
  services/        external APIs (Claude, Sarvam) and pure helpers
backend/tests/     pytest, uses a throwaway db

frontend/src/
  router.jsx       every page/URL is listed here
  api/             one file per backend feature, plain fetch functions
  pages/           one component per screen
  components/      reusable UI pieces
  lib/             hooks and helpers (offline storage and sync go here)
```

**Adding a feature:** add a `routes/x.py` + `controllers/x.py` (+ `services/x.py` if it calls an outside API), include the router in `main.py`, add `api/x.js` + a page, and register the page in `router.jsx`.

We use plain functions everywhere and avoid classes, except Pydantic models used as data shapes.
