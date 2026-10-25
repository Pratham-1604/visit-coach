# VisitCoach — Build plan

**Deadline:** Sun 25 Oct 2026 · **Team:** Prathamesh Mundada, Dhruv Yadav · **Budget:** $500 Claude API credits

The goal is a working, demoable prototype of the loop from our proposal:
**observe** (offline, voice + rubric taps) → **coach** (Claude packet, CRP edits and approves) → **follow through** (next-visit check, block-level needs).

## What is needed vs. what can be done

```
 MUST (demo breaks without it)                 CAN (add if time allows, in this order)
 ─────────────────────────────                 ─────────────────────────────────────────
 [1] Pick school/teacher, start visit   ──┐    (a) Suggested visit focus  ✅ basic rule done
 [2] OBSERVE offline                      │
     • tap ~12 FLN rubric items           │
     • record ≤30 s voice notes           │    (b) Typed-note fallback if mic/ASR fails
     • saved in IndexedDB                 │
 [3] SYNC when online                     │
     • upload visit + audio               │
     • Sarvam ASR → transcript            │
 [4] COACH: Claude → coaching packet      │    (c) English gloss beside teacher-language packet
     strength · priority · 5-min practice │
     demo script · follow-up · evidence   │
 [5] CRP REVIEW: edit + approve           │
 [6] TEACHER VIEW: share link (in        ─┘    (d) Teacher usefulness 👍/👎
     Tamil/Hindi/Marathi)
 [7] FOLLOW THROUGH: next visit marks          (e) AI REHEARSAL: Claude plays defensive
     action done / partly / not done               teacher → score card for the CRP
 [8] BLOCK VIEW: aggregated needs              (f) Claude narrative on block needs
     "14 of 22 schools need …" (no teacher     (g) Proposal metrics: time-to-feedback,
     scores) + seeded data                         % with action, % done, CRP edit rate
 [9] Deployed URL, works on Android phone      (h) Eval: 50 synthetic cases, LLM judge
     + README + demo video                     (i) Installable PWA polish, UI label translations
```

If time runs short, cut from the end of the CAN list first. Log anything cut in [improvements/futurescope.md](improvements/futurescope.md).

## Checklist

### Fri 23
- [x] Repo setup: uv backend, Vite + React + Tailwind frontend, git, docs
- [x] Backend layering example (schools: route → controller → service → db) + tests
- [x] Home (school list + focus) and School pages
- [x] Rubric (15 FLN items, each tagged with a need area; `GET /api/rubric`)
- [x] FLN knowledge pack v1 (`backend/app/knowledge/`): rubric, 16 practices, NIPUN Lakshyas, 21 verified source excerpts
- [x] `services/llm.py` + `services/packet.py`: Claude coaching packet from notes + taps, runnable from the CLI (verified live: ~25 s per packet, prompt cache hits on repeat calls)
- [x] Observe page: rubric taps + 30 s recorder → IndexedDB (Dexie), offline indicator (rubric + schools cached for offline; drafts listed on Home)
- [x] Sync: `POST /api/visits/sync` → Sarvam ASR → packet (background task, status polling, retry). Verified live with typed notes; Sarvam path needs `SARVAM_API_KEY`
- [x] Packet review/edit/approve page (edits kept on phone offline, sent on approve; share link `/t/:token`)
- [ ] Teacher view via share link

### Sat 24
- [ ] Follow-up on next visit
- [ ] Block dashboard + seed data for 22 schools (pre-generated packets)
- [ ] PWA: vite-plugin-pwa app shell, installable
- [ ] Dockerfile + deploy to Render
- [ ] CAN items in order: (b) → (e) → (g) → (f) → (h) → (c) → (d) → (i)

### Sun 25
- [ ] Test on a real Android phone in Hindi, Tamil and Marathi
- [ ] Fixes and polish, README
- [ ] Demo video, submit

## Verification
- `cd backend && uv run pytest`
- `cd frontend && npm run lint && npm run build`
- E2E in Chrome DevTools mobile mode:
  1. Go offline, tap the rubric and record 2 notes, then reload; the data is still there.
  2. Go online and sync; the packet appears in about 1 min.
  3. Edit and approve, then open the teacher link.
  4. Mark the follow-up; the block view updates.
- Second packet call shows `cache_read_input_tokens > 0` (prompt caching works)
- Open the deployed URL on an Android phone and install it

## Prerequisites
- [ ] Anthropic API key (the org with the $500 credits) → `.env`
- [ ] Sarvam API key (dashboard.sarvam.ai, ₹100 free credit) → `.env`
- [ ] Render account
- [ ] GitHub repo for submission
