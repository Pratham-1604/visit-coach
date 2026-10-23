# How VisitCoach works

## 1. The CRP's visit (user journey)

```mermaid
flowchart LR
    A[Before visit<br/>Pick school<br/>See suggested focus] --> B[In class, offline<br/>Tap rubric items<br/>Record ≤30 s voice notes]
    B --> C[After sync<br/>Review + edit packet<br/>Optional: rehearse debrief]
    C --> D[Debrief<br/>Approve → teacher gets link<br/>in their language]
    D --> E[Next visit<br/>Check agreed action:<br/>done / partly / not done]
    E --> F[Block view<br/>Aggregated support needs]
```

## 2. From observation to coaching packet

```mermaid
sequenceDiagram
    participant P as Phone (PWA)
    participant DB as IndexedDB
    participant API as FastAPI
    participant ASR as Sarvam ASR
    participant C as Claude

    P->>DB: save rubric taps + audio (works offline)
    Note over P: back online / "Sync now"
    P->>API: POST /api/visits/sync (visit JSON + audio)
    API-->>P: visit id, status=queued
    API->>ASR: each voice note (≤30 s)
    ASR-->>API: transcript
    API->>C: notes + taps + knowledge pack (cached)
    C-->>API: CoachingPacket (structured JSON)
    P->>API: poll GET /api/visits/:id
    API-->>P: status=ready + packet
    P->>API: PUT edits, POST approve
    API-->>P: teacher share link /t/:token
```

## 3. Visit status

```mermaid
stateDiagram-v2
    [*] --> draft: on phone only
    draft --> queued: synced
    queued --> transcribing
    transcribing --> generating
    generating --> ready
    ready --> approved: CRP approves
    approved --> followed_up: next visit check
    transcribing --> failed
    generating --> failed
    failed --> queued: retry
```

## 4. Rehearsal loop (optional feature)

```mermaid
flowchart LR
    S[CRP opens rehearsal<br/>for this packet] --> T[Claude plays the teacher<br/>sometimes defensive]
    T --> U[CRP replies<br/>text or voice]
    U --> T
    U -->|End| V[Claude scores the feedback:<br/>specific? strength first?<br/>one priority? agreed action?]
```

## 5. Who sees what (two-tier data)

```mermaid
flowchart TB
    subgraph Private[Private: CRP + teacher]
        N[Voice notes, transcripts]
        K[Coaching packet]
        R[Rehearsal]
    end
    subgraph Block[Block officer]
        G["Counts per need area<br/>e.g. 14 of 22 schools need<br/>phonemic-awareness support"]
        M[Process metrics]
    end
    K -- need_area only --> G
    K -- timestamps, approval, follow-up --> M
```

## 6. Where Claude is used

| Step | Service function | Input | Output | Effort |
|---|---|---|---|---|
| Coaching packet | `services/packet.py` | transcripts + rubric taps + grade/subject/language | strength, priority, 5-min practice, demo script, follow-up, evidence, need_area, grounded_in | medium |
| Rehearsal turn | `services/rehearsal.py` | packet + conversation so far | teacher's reply | low |
| Rehearsal score | `services/rehearsal.py` | conversation | scores + tips for the CRP | medium |
| Block narrative | `services/block.py` | aggregated counts only | short summary of support needs | medium |
| Eval judge | `eval/run_eval.py` | case + packet | scores per criterion | medium |

Every call shares one cached system prompt containing the FLN knowledge pack.
