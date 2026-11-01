# Submission checklist

**Submit:** Mon 2 Nov 2026 · **Team:** Prathamesh Mundada, Dhruv Yadav
Tick each box as you go. Work top to bottom; each section depends on the one above.

---

## 0. See the app yourself first (about 15 min)

- [ ] Get the latest code: `git checkout v2 && git merge --ff-only claude`. v2 already has Dhruv's work. `claude` adds the state checklist, notes panel, visit report and checklist suggestions.
- [ ] `.env` in the repo root has `ANTHROPIC_API_KEY` (needed for new packets) and `SARVAM_API_KEY` (needed for voice notes).
- [ ] **Delete `backend/data/visitcoach.db`** so the server creates the new demo data: 22 Maharashtra schools, mentor names and coaching history. An old database won't show the history.
- [ ] Terminal 1: `cd backend` → `uv sync` → `uv run uvicorn app.main:app --reload`
- [ ] Terminal 2: `cd frontend` → `npm install` → `npm run dev`
- [ ] Open **http://localhost:5173** in Chrome, then press F12 → device toolbar (Ctrl+Shift+M) and pick a phone such as Pixel 7.

## 1. Click through the demo story (about 30 min)

Do this once locally and once on the deployed site (section 4). Note anything broken in the "Problems found" list at the bottom.

**Mentor side**
- [ ] The login screen shows. Tap the **Sachin Gore** demo user (`sachin` / `sachin123`) and log in.
- [ ] Menu (top right) → **मराठी**: every label on every screen switches to Marathi. Switch back to English (or keep Marathi for the video).
- [ ] Menu → **Dark**: all screens are readable, with no white boxes or invisible text. Switch back.
- [ ] Home lists the schools.
  - [ ] Type `Sunita` in the search box: only Wagholi is left.
  - [ ] Tap **Action to check**: only schools with an open action show.
  - [ ] Clear the search with ×.
- [ ] Open **ZP Primary School Wagholi**. Press back: the search and filter are kept.
- [ ] The school page shows a suggested focus, and Sunita Pawar has a **Coaching history** with 3 visits by 2 mentors (Kiran Bhagat, Vandana Joshi).
- [ ] The **Agreed at the previous visit** card shows the date and "by Vandana Joshi". Answer it: *Partly*, usefulness 4, note "only front rows".
- [ ] **Start visit** for Sunita.
  - [ ] Children present: `32`. Grades sitting together: tick **1** and **2**.
  - [ ] Tap 5–6 checklist items. Each shows its **KPALP** indicator.
  - [ ] Record one voice note in Marathi, or type a note, e.g. *"Paired reading started but only front rows read. Back-row Grade 1 children only watched."*
  - [ ] Write a note in the **Notes** panel (📝 on an item starts a line about it), e.g. "only front rows answered" while "every child gets a turn" is ticked **Yes**.
  - [ ] **End visit**: the check lists unrated items and flags the contradiction. Fix it or end anyway.
- [ ] Status changes from Waiting to sync → Transcribing → Writing packet → **Review packet** within about a minute.

**The packet**
- [ ] It's in Marathi, has one priority, and **builds on Vandana's earlier action** instead of starting over.
- [ ] The practice says how to split **Grades 1 and 2**.
- [ ] Evidence and Sources show real document pages, including Maharashtra ones (`mh-…`).
- [ ] Nothing in a teacher's box is meant for the mentor, and no children's names appear.
- [ ] Edit one line, then press **Approve and share**.
- [ ] The **WhatsApp message** preview shows the advice in Marathi plus a link.
- [ ] **Send on WhatsApp** opens WhatsApp with the message ready.
- [ ] **Practise the conversation:** do 3–4 turns, then get the score card.
- [ ] **Visit report** → Write the report: summary, checklist results, points to check, support needed. Send it on WhatsApp or save it as PDF; it shows "Sent".

**Teacher side**
- [ ] Open the link from the message (`/t/…`). The headings are in Marathi, the page shows the advice and **"Your coaching so far"**, and there are no scores or mentor notes.

**Support planning**
- [ ] Open `/block` (link at the bottom of Home).
  - [ ] It shows "14 of 22 schools …" and the 5 numbers.
  - [ ] It shows no teacher names.
- [ ] Menu → **Log out**, then log in as `officer` / `officer123`: only support planning opens, with no schools or visits.
- [ ] Open the teacher link while logged out: it still works without a login.
- [ ] Log out, then log in as `admin` / `admin123` (state admin): only the **State checklist** page opens.
  - [ ] **What the visits say** shows "almost always met" (e.g. print-rich classroom) and "often left unrated" (children explain their thinking).
  - [ ] **Ask Claude for new items** suggests items like drinking water or attendance, with Marathi and Hindi wording. Download the suggested next version (CSV).
  - [ ] Upload that CSV as a new version: it becomes "in use". Log back in as a mentor: a new visit shows the new items.
  - [ ] A broken file (e.g. delete the `text_en` column) is rejected with every problem listed.

**Offline (built version only, sections 3–4)**
- [ ] Open the app once online, then turn on airplane mode (or DevTools → Network → Offline).
- [ ] The app still opens, the school page and history still show, and you can start a visit, tap the checklist and end it.
- [ ] Go back online and the visit uploads by itself.

## 2. Push and merge (5 min)

- [ ] Push and merge with these commands:
  ```
  git push origin v2
  git checkout main && git merge --ff-only v2 && git push origin main && git checkout v2
  ```
- [ ] Dhruv: `git fetch && git checkout v2`, and stop using the old `dhruv` branch.
- [ ] Repo is **public**, or judges have access, if the hackathon requires it.

## 3. Production-style check (optional, 10 min)

- [ ] `cd frontend && npm run build`, then `cd ../backend && uv run uvicorn app.main:app --port 8000` → open http://localhost:8000.
- [ ] Run the **offline** steps from section 1 here. Offline doesn't work in `npm run dev`.

## 4. Deploy (about 1 h)

- [ ] Start Docker Desktop, then `docker build -t visitcoach .` and `docker run -p 8000:8000 -e ANTHROPIC_API_KEY=... -e SARVAM_API_KEY=... visitcoach`. The Dockerfile has **never been tested**, so do this before deploying.
- [ ] Render: **New → Web Service** → this GitHub repo, branch `main`. Render uses the Dockerfile.
- [ ] Add `ANTHROPIC_API_KEY` and `SARVAM_API_KEY` under Environment.
- [ ] Open the Render URL **on a real Android phone**:
  - [ ] The mic works (it needs HTTPS, which Render provides).
  - [ ] **Install app** / Add to home screen works.
  - [ ] Run the section 1 click-through again.
- [ ] Free tier: the site sleeps when idle. **Open it a few minutes before judging or recording** so the first load isn't slow.
- [ ] Free tier: data resets on redeploy, and the demo data comes back by itself. **Don't redeploy after recording.**

## 5. Live AI checks (costs a little credit)

- [ ] One packet with a **real Marathi voice note** (Sarvam) has a correct transcript under "Your notes, as the app heard them".
- [ ] The new Claude features, which have only been tested with a stand-in for Claude so far:
  - [ ] **End visit** gives a real "Did I miss anything?" answer
  - [ ] **Visit report** writes a sensible report
  - [ ] **Ask Claude for new items** (as `admin`) gives sensible suggestions
- [ ] Optional: `cd backend && uv run python -m evals.run_eval --limit 3` (about $0.30–0.45). Note the scores for the write-up.
- [ ] If possible, a Marathi speaker reads one packet and the teacher page and confirms they sound natural.

## 6. Demo video (about 2 h including retakes)

Target **3–4 minutes**, recorded on a phone screen or DevTools phone view. Follow PITCH.md slide 3:
- [ ] **0:00–0:30 Problem:** mentors change, feedback restarts every time, and the write-up eats mentoring time. Quote a state's own words, from our research state Maharashtra: "support, counselling, facilitation and mentoring". Say once: **built for India, researched in Maharashtra**.
- [ ] **0:30–1:00 Before:** Sachin opens Sunita's coaching history (2 earlier mentors) and checks the last action.
- [ ] **1:00–1:45 In class:** offline, the KPALP add-on checklist, 32 children with Grades 1+2, a Marathi voice note.
- [ ] **1:45–2:30 Packet:** builds on Vandana's action, fits multi-grade, cites sources; edit, then approve.
- [ ] **2:30–3:00 Teacher:** the WhatsApp message in Marathi and the teacher's page with "your coaching so far".
- [ ] **3:00–3:30 After the visit:** a quick look at the visit report (no report to write by hand) and support planning (no names, counts only).
- [ ] **3:30–4:00 The state:** the admin's "What the visits say" with Claude's suggested new items. Then the ask: a one-cluster pilot.
- [ ] Say once that **all data is made up**.
- [ ] Upload (YouTube unlisted or Drive), check the link opens in a private window, and set it to "anyone with the link".

## 7. Submission form

- [ ] Read the form's exact requirements on the hackathon portal **today**, so nothing is a surprise tomorrow.
- [ ] GitHub repo link (branch `main`)
- [ ] Live URL (Render)
- [ ] Demo video link
- [ ] Short description: use the one-liner from README / PITCH.md
- [ ] Map our features to the proposal's promises and the 5 metrics (PITCH.md slide 5)
- [ ] Mention the mentor review and what changed (MENTOR.md)
- [ ] Known limitations, stated honestly (below)
- [ ] Submit **before** the deadline and keep the confirmation screenshot

## 8. Known limitations (to state in the write-up)

- All schools, teachers and history are **made up**. There's no real child data.
- Login is demo-grade: four demo users with passwords shown on the login screen, and no expiry or password reset (DECISIONS.md #25).
- Marathi and Hindi screens, and the checklist labels, are drafts awaiting a native-speaker check. Claude's summary and evidence for the mentor stay in English.
- Approving a packet needs a connection. Observing, editing and the follow-up check work offline.
- Voice notes are capped at 30 s.
- The teacher message is sent from the mentor's own WhatsApp (DECISIONS.md #24). No automatic messages yet.
- Free hosting: it sleeps when idle, and data resets on redeploy.
- Not yet confirmed with the mentor: schools per Kendra Pramukh, typical Grade 1–2 class size, and where the state wants visit reports submitted (today the mentor sends them on WhatsApp or as a PDF).
- Built for any Indian state, but only Maharashtra (our research state) is set up so far; adding a state is data, not code. The state comes from the user's login, not the phone's location.

## 9. Freeze

- [ ] After the video is recorded: **no more code changes** unless something is broken.
- [ ] Tag the submitted version: `git tag submission && git push origin submission`.

---

## Problems found during the click-through

| Where | What happened | Fixed? |
|---|---|---|
| | | |
