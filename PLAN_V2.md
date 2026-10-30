# VisitCoach v2: revised plan after the mentor review

**Why:** the mentor review ([MENTOR.md](MENTOR.md), 27 Oct) changed what "impactful" means for us. The old plan ([PLAN.md](PLAN.md)) built a tool for the CRP's visit. v2 builds it around three ideas that came out of the review:

1. **The teacher's coaching continues when the mentor changes.** This is feedback #6, and it's our strongest story.
2. **WhatsApp is where the teacher already is.** The advice is in the message itself, and teachers never install anything (#11, #12).
3. **The app supports teachers, it doesn't inspect them, and it's built for Maharashtra.** We use the state's own words, mentor role (Kendra Pramukh) and NIPUN goals (#1–4, #14).

**Status (31 Oct):** steps 1–5 are built ✅. 52 backend tests pass, and the frontend lints and builds. One real Claude packet was tested end to end. **Not yet clicked through in a real browser** 🌐. Step 6 is next.

**Time:** today is Sat 31 Oct and the deadline is Sun 1 Nov, so there's about **1.5 days**. The order below protects the demo: each step stands on its own, so if we stop after any step we can still submit. Deploying and the demo video (PLAN.md "Still to do") stay **mandatory** and get the last half-day no matter what.

---

## The demo story v2 is built for

> **Sunita** teaches Grade 1 at ZP School Wagholi (Pune). Over the last two months, Kendra Pramukh **Kiran** visited twice, and then **Vandana** took over. Vandana agreed one action with Sunita: *"5 minutes of paired reading every day."* Now Vandana has moved on too.
>
> This week, the new Kendra Pramukh **Sachin** opens Sunita's page and sees Sunita's **coaching history**: three visits by two mentors, what each agreed, and whether it happened. Sachin checks Vandana's action ("partly done: only the front rows"), observes, and notes **32 children present, Grades 1 and 2 together** (the other teacher is on training).
>
> Claude's packet **builds on Vandana's work**. It doesn't start over, and it picks a practice that works for two grades at once. Sachin approves it, and Sunita gets a **WhatsApp message in Marathi** with what went well, the one thing to work on and the agreed action. The link in the message also shows Sunita's own history across all three mentors.

These are the names in the demo data (`backend/app/seed.py`: `MENTORS`, `DEMO_MENTOR`). Every step below exists to make this story work for real in the demo.

---

## The steps, in build order

### Step 1: Teacher coaching history (feedback #6) ⭐ highest impact, about 4 h · ✅ built

| Part | Change | Files |
|---|---|---|
| Mentor name | The mentor types their name once on the phone (saved in localStorage), and the header shows "Mentor: Rahul · change". The name is sent with every visit. There's no login, which fits the prototype. | `Layout.jsx`, `lib/visits.js`, `controllers/visits.py` (`VisitIn.mentor_name`), `db.py` (`ADDED_COLUMNS`: `visits.mentor_name`) |
| History API | `teacher_history(teacher_id)` returns the teacher's approved visits, newest first: date, mentor, subject, focus (the checklist item's wording), agreed action, follow-up result. It's added to the school details, so the **offline pack** carries it automatically. | `controllers/schools.py` (or a new `controllers/history.py`), `controllers/offline.py` |
| School page timeline | Under each teacher, show a compact timeline: *"12/08 · Meena · Letter sounds → 'Letter cards daily' · Partly done"*. It works offline. | `School.jsx` |
| Claude reads the last 3 actions | Replace `previous_action` with `previous_actions(limit=3)`. New prompt rules: build on earlier actions, **don't repeat an action that's already done**, and if the same action wasn't done twice, make it smaller. | `controllers/followups.py`, `services/packet.py` (`visit_prompt`, rules) |
| Demo data | Give past visits **2–3 different mentor names**, and give Sunita 3 visits so the change of mentor shows on screen. | `seed.py` |
| Tests | History order, history in the offline pack, mentor name saved, prompt includes 3 actions | `tests/test_teacher.py`, `test_followups.py`, `test_visits.py` |

### Step 2: WhatsApp message carries the advice, plus a teacher's own history (#11, #12, #6), about 2.5 h · ✅ built

| Part | Change | Files |
|---|---|---|
| Message text | The Share button sends a **short message in the teacher's language** (Marathi in the demo), then the link for details. Example: *"✅ काय छान झाले: … / 🎯 लक्ष देण्यासारखी एक गोष्ट: … / 📌 पुढच्या भेटीपर्यंत: … / Details: link"*. It's built from the approved packet, so no extra Claude call is needed. Each part is cut to about 200 characters so the message stays short. | `Packet.jsx` (`ShareLink`), move `LABELS` from `TeacherView.jsx` into `lib/labels.js` |
| Mentor preview | The mentor sees the exact message before sending it. | `Packet.jsx` |
| Teacher's history on the link | Below today's packet: *"Your coaching so far"*, a list of past agreed actions with date, mentor and done/partly/not done. It includes teacher-safe fields only (no evidence, no transcripts). | `controllers/teacher.py`, `TeacherView.jsx` |
| Tests | Shared packet includes history, and the history has no mentor-only fields | `tests/test_teacher.py` |

### Step 3: Real classroom context, multi-grade and class size (#7, #8), about 1.5 h · ✅ built

| Part | Change | Files |
|---|---|---|
| Two quick fields on the observe page | "Children present" (a number) and "Grades sitting together" (chips 1, 2, 3, 4, 5). Both are saved offline with the visit. | `Observe.jsx`, `lib/visits.js`, `VisitIn`, `db.py` (`visits.children_present`, `visits.grades_together`) |
| Claude uses them | They go into `visit_prompt`. New rule: *if more than one grade sits together, choose a practice that works across levels (e.g. group by level, older children lead a pair) and say how to split the class.* | `services/packet.py` |
| Eval | Add 2 multi-grade cases | `evals/cases.jsonl` |

### Step 4: Mentoring, not monitoring, and Maharashtra first (#1, #2, #4, #5, #14), about 1.5 h · ✅ built

| Part | Change | Files |
|---|---|---|
| Wording | Change "CRP" to **"Mentor"** in every screen and in the teacher page's error text. Code comments can wait. The Marathi teacher page says **"केंद्रप्रमुख"** (the title teachers already know). | `Layout.jsx`, `Block.jsx`, `Packet.jsx`, `TeacherView.jsx`, `Home.jsx`, `School.jsx` |
| Block view | Retitle it *"Support planning: what training does this cluster need?"*. Lead with **actions completed** and **teacher usefulness** instead of counts. Still no names and no scores. | `Block.jsx` |
| All 22 schools in Maharashtra | Change the 4 Hindi/Tamil schools to Marathi schools with Pune-district villages. Hindi and Tamil stay supported in code as "next states". | `seed.py` |
| State checklist, not ours | Add one line on the observe page: *"Reading & maths add-on to your KPALP observation"*. This shows the app sits **next to** the state checklist. | `Observe.jsx` |
| Docs | Update FLOW.md (CRP → Mentor/Kendra Pramukh, new steps) and the README pitch line | `FLOW.md`, `README.md` |

### Step 5: Pitch for the state (#14), about 1 h, no code · ✅ [PITCH.md](PITCH.md)

Write `PITCH.md` (5 slides of content):
1. **The problem:** mentors change, feedback breaks, teachers lose track, and reports eat up mentoring time.
2. **The state's own goal:** quote *"support, counselling, facilitation and mentoring"* (Pragat Shaikshanik Maharashtra).
3. **What changes:** the 60-second demo story above, using today's routine (observe, checklist, talk) with less paperwork.
4. **Fits NIPUN Maharashtra:** NIPUN goals, the KPALP checklist and Kendra Pramukh role, WhatsApp (73% of teachers), offline (67% report internet problems).
5. **Cost and pilot:** about ₹10–12 per packet, the 5 metrics we'd measure, and the ask (a one-cluster pilot with SCERT Maharashtra).

Use only numbers MENTOR.md section 3 has a source for. **Don't** quote the UP 2-hour visit split.

### Step 6: Ship (mandatory), the last half-day · ⏳ next

PLAN.md "Still to do": click through in a real browser, run one real Claude visit, deploy, test on an Android phone, record the demo video following the story above, **submit**.

---

## Built differently from the plan (notes)

- Mentor history and class context live in `backend/app/controllers/history.py`. `previous_action` was replaced by `previous_actions` (last 3).
- The teacher page's "Your coaching so far" shows only visits **before** the shared one, and never the mentor's check notes.
- The prompts now say "mentor (Kendra Pramukh, also called CRP)". The left-over note check catches both `[CRP: …]` and `[Mentor: …]`.
- The block view leads with "actions done" and "usefulness", and mentions "no report to write" next to the feedback time.
- Code comments and internal names still say "CRP" in places. Only the text users see changed.

## Stretch, only if steps 1–6 are done

- **Teacher taps "I tried it"** on their link. The next mentor then sees the teacher's own answer next to the follow-up. This turns feedback into a two-way loop, which is the best next step for teachers keeping track themselves.
- A "Mentoring time saved" stat on the block view, worded carefully: "0 reports written after visits".

## Moved to future (update improvements/futurescope.md)

These are dropped from the v1 CAN list or moved to later:
- A WhatsApp bot so mentors can send voice notes with no app (#12)
- Loading a state's checklist as a swappable JSON file (#4)
- Noto fonts, mentor screens in Marathi, the Claude-written block summary, the eval growing to 50 cases
- Mentor login and roles, so the mentor name comes from an account instead of being typed

## Still open: questions for the mentor (MENTOR.md section 4)

These don't block the build. Put the answers into the pitch if they arrive in time: schools per Kendra Pramukh, other mentor roles, the current visit app, Grade 1–2 class size, and who decides on a pilot.

---

## How each piece of mentor feedback is covered after v2

| # | Feedback | Covered by |
|---|---|---|
| 1 | Mentoring, not monitoring | Step 4 (wording, block view), Step 1 (continuity) |
| 2 | Maharashtra | Step 4 (all schools), Step 5 |
| 3 | NIPUN | Already in the app (grounding) + Step 5 |
| 4 | State checklist | Step 4 (add-on wording); swappable checklist → future |
| 5 | Mentor cadre | Step 4 (Kendra Pramukh naming); still asking the mentor |
| 6 | Discontinuous feedback | **Steps 1 and 2** |
| 7 | Enrolment | Step 3 (children present) |
| 8 | Multi-grade | Step 3 |
| 9 | Schools per mentor | Asking the mentor |
| 10 | Voice and phones | Already in the app |
| 11 | WhatsApp | **Step 2** |
| 12 | Not radically different | Steps 2 and 4; WhatsApp bot → future |
| 13 | UP example | Research only (not quoted) |
| 14 | Convince the state | Step 5 |

## Verification

- `cd backend && uv run pytest` (all existing tests plus the new ones above)
- `cd frontend && npm run lint && npm run build`
- Delete `backend/data/visitcoach.db`, restart, then play the demo story end to end in Chrome mobile mode:
  1. Set the mentor name to "Sachin Gore". Open Wagholi → Sunita → Coaching history: 3 visits by Kiran and Vandana, and it still shows when offline.
  2. Check the follow-up, observe (32 children, Grades 1+2), then sync.
  3. The packet refers to the earlier action and suggests a practice for two grades.
  4. Approve, then Share: the WhatsApp text is in Marathi with the advice in it.
  5. Open the link: today's packet, plus "Your coaching so far" across both mentors.
  6. The block view says "Support planning", and "CRP" appears nowhere on screen.
