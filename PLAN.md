# VisitCoach — Build plan

> **Replaced by [PLAN_V2.md](PLAN_V2.md)** after the mentor review (27 Oct). This file is the v1 record. Its "Still to do" list is now step 6 of v2.

**Deadline:** Sun 1 Nov 2026 · **Feature freeze:** Thu 29 Oct · **Submit by:** Sat 31 Oct (a spare day before the deadline)
**Team:** Prathamesh Mundada, Dhruv Yadav · **Budget:** $500 Claude API credits

The goal is a working, demoable prototype of the loop from our proposal:
**observe** (offline, voice + rubric taps) → **coach** (Claude packet, CRP edits and approves) → **follow through** (next-visit check, block-level needs).

How it works, in plain words: [FLOW.md](FLOW.md). Why we chose what we chose: [DECISIONS.md](DECISIONS.md).

## What is needed vs. what can be done

✅ built and tested by the automated tests · 🌐 not yet clicked through in a real browser · ❌ not built

**MUST: the demo breaks without these**

| # | Step | Status |
|---|---|---|
| 1 | Pick school/teacher, start visit | ✅ |
| 2 | Observe offline: 15 checklist items, ≤30 s voice notes, typed note, saved on the phone | ✅ · the app now opens with no signal (PWA) 🌐 |
| 3 | Sync when online: upload → Sarvam speech-to-text → packet | ✅ · ⚠️ Sarvam not yet tested with a real key |
| 4 | Coach: Claude writes the coaching packet | ✅ · quality fixes in the prompt, not yet tried on real Claude 🌐 |
| 5 | CRP review: edit, see transcripts, approve (blocked while a note for the CRP is left) | ✅ 🌐 |
| 6 | Teacher view: share link opens the packet in the teacher's language | ✅ 🌐 |
| 7 | Follow-up at the next visit, offline, with usefulness rating | ✅ 🌐 |
| 8 | Block view: "14 of 22 schools need …" + demo data | ✅ 🌐 |
| 9 | Deployed URL, works on an Android phone, demo video | ⚠️ Dockerfile written (not yet built); deploy ❌ |

**CAN: add if time allows, in this order**

| | Extra | Status |
|---|---|---|
| a | Suggested visit focus | ✅ rule-based |
| b | Typed-note fallback | ✅ |
| c | English summary for the CRP | ✅ |
| d | Teacher usefulness rating (1–5, asked at the next visit) | ✅ 🌐 |
| e | AI rehearsal: defensive teacher → score card | ✅ 🌐 |
| f | Claude-written summary on the block view | ❌ |
| g | Proposal metrics on the block view | ✅ 🌐 |
| h | Eval: AI grader | ✅ harness + 12 cases (not yet run; target 50) |
| i | PWA polish, UI label translations | ⚠️ icons + install done; Noto fonts ❌; CRP screens English only |

If time runs short, cut from the end of the CAN list first. Log anything cut in [improvements/futurescope.md](improvements/futurescope.md).

## Checklist

### Done (23–25 Oct)
- [x] Repo setup: uv backend, Vite + React + Tailwind frontend, git, docs
- [x] Backend layering example (schools: route → controller → service → db) + tests
- [x] Home (school list + focus) and School pages
- [x] Rubric: 15 FLN items in en/hi/mr/ta, 8 need areas (`GET /api/rubric`)
- [x] FLN knowledge pack v1 (`backend/app/knowledge/`): rubric, 16 practices, NIPUN Lakshyas, 21 verified source excerpts (`check_grounding.py`: 21/21 found)
- [x] `services/llm.py` + `services/packet.py`: Claude coaching packet from notes + taps, runnable from the CLI (verified live: ~25 s per packet, prompt cache hits on repeat calls)
- [x] Observe page: rubric taps + 30 s recorder → IndexedDB (Dexie), offline indicator (rubric + schools cached for offline; drafts listed on Home)
- [x] Sync: `POST /api/visits/sync` → Sarvam ASR → packet (background task, status polling every 5 s, retry). Verified live with typed notes
- [x] Packet review: edit (kept on the phone offline, sent on approve), approve, share link + WhatsApp share, evidence and sources

### Done (26 Oct)
- [x] **Packet quality fixes** from the first real packet (Kavita Verma, Rampur, Hindi):
  - new prompt rules: no notes for the CRP in the teacher's text, gender-neutral wording, no children's names, evidence and summary in plain English, 2–4 sources
  - the server sends a packet back to Claude once if a `[CRP: …]` note is in the teacher's text
  - **approve is blocked** on the phone and the server while such a note is left (the field is highlighted)
  - rubric ids in the CRP's summary/evidence are swapped for the checklist wording
  - dates in Indian format (25/10/2026)
- [x] **Teacher view:** `GET /api/t/:token` + `/t/:token` page, headings in Hindi/Marathi/Tamil, only the teacher's parts
- [x] **Transcripts** on the review page ("Your notes, as the app heard them")
- [x] "Page not found" screen
- [x] **App opens with no signal:** PWA (vite-plugin-pwa service worker + manifest + icons, installable)
- [x] **Offline pack:** the phone downloads schools, teachers, open follow-ups and the rubric every 2 minutes while online
- [x] **Next-visit follow-up:** done / partly / not done + note + usefulness 1–5, saved on the phone (outbox) and sent when online. Only a teacher's latest approved visit is followed up
- [x] The previous action and what the CRP found go into the next packet
- [x] **Demo data:** 22 schools, 44 past visits (2 per school), 22 checked follow-ups, open actions written in each school's language
- [x] **Block view** (`/block`): schools per need area (only areas with ≥ 5 schools), the 5 proposal metrics, no names
- [x] **Rehearsal** (`/visits/:id/rehearse`): Claude plays the teacher, then scores the CRP on 5 criteria with a tip and a better line
- [x] **Dockerfile** + `.dockerignore` (one container; not yet built: Docker wasn't running)
- [x] **Eval harness** `backend/evals/`: 12 cases (mr/hi/ta), automatic checks + AI grader, cost estimate
- 47 backend tests pass; frontend lints and builds

### Still to do
- [ ] **Click through everything in a real browser** (Chrome mobile mode), especially the new pages: teacher view, follow-up, block view, rehearsal, offline reload. Delete `backend/data/visitcoach.db` first to get the new demo data
- [ ] Run one real visit with the new packet rules and check the result (needs `ANTHROPIC_API_KEY`)
- [ ] Test Sarvam with real voice notes in Hindi, Marathi and Tamil (needs `SARVAM_API_KEY`)
- [ ] Merge `dhruv` → `main`
- [ ] Build the Docker image, deploy to Render, test the HTTPS mic and installing on a real Android phone
- [ ] Run the eval (`uv run python -m evals.run_eval`, about $0.10–0.15 per case); add cases towards 50; fix prompts from the results
- [ ] Native-speaker check: rubric labels, teacher-page headings, demo follow-up actions, packets (Hindi, Marathi, Tamil)
- [ ] CAN items if time allows: Noto fonts → (f) block summary by Claude → CRP screens in Hindi/Marathi/Tamil
- [ ] Final phone test, README, demo video, **submit by Sat 31**

## Verification
- `cd backend && uv run pytest` (47 tests as of 26 Oct)
- `cd frontend && npm run lint && npm run build`
- `cd backend && uv run python scripts/check_grounding.py ../../edu-hackathon-fln/sources` → 0 missing segments
- E2E in Chrome DevTools mobile mode:
  1. Go offline, tap the rubric and record 2 notes, then reload; the data is still there.
  2. Go online; the visit syncs by itself, and the packet appears in about 30–60 s.
  3. Edit and approve, then open the teacher link.
  4. Mark the follow-up; the block view updates.
- Second packet call shows `cache_read_input_tokens > 0` (prompt caching works)
- Open the deployed URL on an Android phone and install it
- **Demo tip:** always record at least one voice note or type a note. A checklist-only visit gives general advice, as in the first test packet

## Prerequisites
- [x] Anthropic API key → `.env` (packets verified live)
- [ ] Sarvam API key (dashboard.sarvam.ai, ₹100 free credit) → `.env`
- [ ] Render account
- [x] GitHub repo (`origin`: `main` + `dhruv` branches)
