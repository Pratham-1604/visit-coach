# Mentor review

**Call:** Tue 27 Oct 2026, with an education mentor (FLN Hackathon)
This doc lists each piece of feedback the mentor gave and what we have done about it.

**Status key:**
- ✅ **In the app:** already built before the call
- 🔎 **Checked:** researched after the call (findings in section 3)
- 🔧 **To build:** planned before the feature freeze (Thu 29 Oct)
- 🆕 **Built in v2 (31 Oct):** see [PLAN_V2.md](PLAN_V2.md) and [PITCH.md](PITCH.md)
- 🔮 **Future:** after the hackathon

---

## 1. Reviews given by the mentor

1. **Think about helping teachers and learning, not monitoring.** The main aim should be to **increase mentoring time**.
2. **Take one state, Maharashtra, as the example.** Check its policies and build from there.
3. **NIPUN is a mission and very important.** The solution should serve it.
4. **The checklist is already decided by each state.** Don't invent a new one.
5. **There is a teacher mentor cadre** whose main responsibility is mentoring teachers.
6. **Teachers get different mentors, so feedback is discontinuous.** It's hard for teachers to keep track, so capture the feedback history.
7. **Check average enrolment** in a Grade 1 and Grade 2 class.
8. **Check for multi-grade classes.** With fewer teachers, several grades sit together.
9. **Check how many schools fall under one mentor.**
10. **Voice notes are a good idea.** Check whether they're possible given how many mentors and teachers have suitable phones.
11. **WhatsApp is important,** because a new app is friction.
12. **The solution cannot be radically different** from how things work today.
13. **The UP example:** UP has a mentor cadre of Academic Resource Persons (ARPs) and a quality ("gunvatta") app. An ARP spends about 2 hours in a school: about 40 min observing, 20 min with the teacher, 20 min on assessments, and more.
14. **We need to convince the state government.**

---

## 2. What we have done about each

| # | Review | What we have done | Status |
|---|---|---|---|
| 1 | Mentoring, not monitoring; more mentoring time | **Already in the app:** the coaching packet is ready minutes after the visit, so the mentor writes no report afterwards. The rehearsal helps the mentor prepare the talk with the teacher. The block view shows no teacher names or scores. **Next:** reword the app to say "mentor" instead of "CRP", and retitle the block view as "Support planning: what training does this cluster need?". | ✅ 🆕 |
| 2 | Take Maharashtra | Checked Maharashtra's mentor role (the **Kendra Pramukh**) and its policy. The state's own document says supervision should give "support, counselling, facilitation and mentoring", not inspection. 18 of our 22 demo schools are already Maharashtra/Marathi. **Next:** make all 22 Maharashtra, and keep Hindi and Tamil as "next states". | 🔎 ✅ 🆕 |
| 3 | NIPUN mission | Advice is grounded in the NIPUN Bharat guidelines and the NIPUN learning goals (Lakshyas), and every packet cites the pages it used. We also checked that NIPUN Maharashtra assessments are running in districts. **Next:** add NIPUN Maharashtra material once we find a usable document. | ✅ 🔎 |
| 4 | The state decides the checklist | Found Maharashtra's Kendra Pramukh observation checklist (from KPALP, the state's Kendra Pramukh training programme). It scores items 1/2/3 like our No/Partly/Yes, but covers general teaching, not reading and maths. Our checklist is a JSON file, so a state can swap in its own. **Pitch:** an add-on for reading and maths next to the state's checklist, not a replacement. | ✅ 🔎 🔮 |
| 5 | Teacher mentor cadre | The Kendra Pramukh is Maharashtra's equivalent and is our main user. We still need to confirm whether other mentor roles exist (e.g. block subject experts). | 🔎 |
| 6 | Different mentors, discontinuous feedback | **Already in the app:** the next visit asks whether the last agreed action was done, and Claude builds the new advice on it. **Next:** a **teacher coaching history**. Every visit records the mentor's name. The school page shows each teacher's timeline (date, mentor, focus, agreed action, done or not), and it opens offline. Claude reads the last 3 actions. **Built:** the teacher's own WhatsApp link also shows this history. | ✅ 🆕 |
| 7 | Grade 1–2 enrolment | Not found for Maharashtra yet. Single-teacher schools average about 18–19 children. **Next:** ask the mentor. Record "children present" on each visit so the advice fits the class size. **Built.** | 🔎 🆕 |
| 8 | Multi-grade classes | Maharashtra has about **8,150–9,270 single-teacher schools** (about 8% of all schools), where every grade sits together. **Next:** on the visit, record "Which grades sit together?", so Claude picks a practice that works across grades. **Built** (and tested with a real packet). | 🔎 🆕 |
| 9 | Schools per mentor | Not found. One general guide suggests 5–10 schools per cluster, but that isn't Maharashtra's rule. **Next:** ask the mentor. | 🔎 |
| 10 | Voice notes and phones | **Already in the app:** 30-second voice notes in Marathi, Hindi and Tamil, which **work offline** and upload later. In Maharashtra **98%** of teachers use EdTech (63% daily), and **83%** have a device in school. **67% report internet problems**, which supports working offline. | ✅ 🔎 |
| 11 | WhatsApp | **Already in the app:** a "Share" button sends the teacher a link on WhatsApp, and the teacher needs no app or login. **73%** of Maharashtra teachers use WhatsApp. **Next:** the message itself will carry the short advice in Marathi (what went well, one focus, agreed action), and the link is only for details. **Built.** | ✅ 🔎 🆕 |
| 12 | Not radically different | The mentor still observes, uses a checklist and talks to the teacher, just with less paperwork. Teachers only ever see WhatsApp. **Future:** mentors send voice notes through a WhatsApp bot, with no app at all. | ✅ 🔮 |
| 13 | UP example | UP's ARPs do on-site mentoring with observation checklists, and its *Prerna* app has a "supportive supervision" module. We could **not** confirm the 2-hour visit split from a written source, so we won't quote it. | 🔎 |
| 14 | Convince the state government | Rewrote our one-line pitch (below). **Next:** a pitch slide with the state's "support, not inspection" quote, mentoring time saved, continuity across mentors, NIPUN alignment, and cost (about ₹10–12 per packet). **Done:** [PITCH.md](PITCH.md). | 🆕 |

**New one-line pitch**
> VisitCoach gives Maharashtra's mentors more time to mentor: every classroom visit ends with one clear, NIPUN-aligned action for the teacher, sent on WhatsApp, and the next mentor picks up where the last one left off.

---

## 3. What we found when checking (with sources)

| Topic | Finding | Source |
|---|---|---|
| Mentor role in Maharashtra | **Kendra Pramukh** (cluster head). The state expects the supervision system to give "support, counselling, facilitation and mentoring", and the Kendra Pramukh helps teachers plan so that no child is left behind. | [Pragat Shaikshanik Maharashtra document](https://repository.education.gov.in/wp-content/uploads/2017/07/pragat-shaikshanik-maharashtra-psm--teachers-training-on-demand.pdf) |
| State observation checklist | KPALP classroom observation template, adapted from *Shala Siddhi*. It scores items 1/2/3 on lesson purpose, student engagement, teaching methods and classroom environment. | [KPALP template (TISS)](https://archive-cete.tiss.edu/dataset/a44822b8-2936-4d1d-b9aa-084265731914/resource/42944d81-08a9-43a3-8264-771ca0e7e660/download/4-mh-kpalp_classroom-observation-template.pdf), [KPALP overview](https://knowledgehub.sdg4education2030.org/node/1405) |
| Teachers and phones | 98% use EdTech, 63% daily. YouTube 81%, Google 74%, WhatsApp 73%. 83% have a device in school. 67% report internet problems. | [Bharat Survey for EdTech 2025, Maharashtra](https://www.edtechbase.centralsquarefoundation.org/factsheets/Maharashtra%20Factsheet.pdf) |
| Multi-grade | About 8,150 (2024-25) to 9,270 (2025-26) single-teacher schools, about 18–19 children each | [UDISE+ 2024-25](https://educationforallinindia.com/wp-content/uploads/2025/09/single-teacher-zero-enrolment-schools-UDISEPlus-2024-25-DoSEL.pdf), [UDISE+ 2025-26 analysis](https://educationforallinindia.com/single-teacher-schools-schools-without-enrolment-udise-2025-26/) |
| NIPUN Maharashtra | District assessments are running (e.g. Nashik, March 2026), and cluster heads were asked to plan support for weaker schools. | [Free Press Journal](https://www.freepressjournal.in/amp/pune/nashik-ceo-omkar-pawar-launches-online-student-interaction-drive-under-nipun-maharashtra-campaign) |
| UP model | ARPs do on-site mentoring with checklists and spot-assessment apps. Prerna has a supportive supervision module. | [Central Square Foundation](https://www.centralsquarefoundation.org/articles/green-shoots-for-fln-in-uttar-pradesh-in-conversation-with-anand-kumar-pandey-senior-professional-assistant-director-quality-unit-samagra-shiksha-uttar-pradesh), [Prerna app](https://prernaup.in/Home/android_application) |

---

## 4. Questions to send back to the mentor

- How many schools does one Kendra Pramukh cover, and how often should they visit?
- Besides Kendra Pramukhs, is there a separate mentor cadre in Maharashtra (e.g. block subject experts)?
- Which checklist or app do they use for visits today? Can we see it?
- What is the typical Grade 1–2 class size, and how common are multi-grade classes?
- Who in the state (SCERT Maharashtra, Samagra Shiksha Maharashtra) would decide on a pilot?
