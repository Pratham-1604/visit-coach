"""Quality check for coaching packets (DECISIONS.md #11).

For each synthetic visit in cases.jsonl: generate a real packet, run automatic checks, then have
Claude grade it on six criteria. Writes evals/results.json and prints a summary table.

Costs real credits: about $0.10-0.15 per case (packet + grading). Needs ANTHROPIC_API_KEY.
Usage (from backend/):
    uv run python -m evals.run_eval              # all cases
    uv run python -m evals.run_eval --limit 3    # first 3, to try it cheaply
"""

import json
import sys
import time
from pathlib import Path

from pydantic import BaseModel, Field

from app.services import llm
from app.services.packet import LANGUAGES, crp_notes_in, generate_packet

HERE = Path(__file__).resolve().parent
CASES = HERE / "cases.jsonl"
RESULTS = HERE / "results.json"

# Claude Opus 5.5, US$ per million tokens: input, output, cache read, cache write (5 min).
PRICES = {"input_tokens": 4.0, "output_tokens": 20.0, "cache_read_input_tokens": 0.2, "cache_creation_input_tokens": 5.0}

CRITERIA = ["specific", "single_priority", "feasible_5min", "grounded", "respectful", "correct_language"]


class Grade(BaseModel):
    score: int = Field(description="1 = poor, 2 = weak, 3 = good, 4 = excellent")
    comment: str = Field(description="One sentence explaining the score")


class Judgement(BaseModel):
    specific: Grade = Field(description="Does it refer to what was actually observed, not generic advice?")
    single_priority: Grade = Field(description="Is there exactly one clear priority, without a list of other issues?")
    feasible_5min: Grade = Field(description="Can a government-school teacher do the practice in 5 minutes tomorrow?")
    grounded: Grade = Field(description="Is the advice supported by the cited sources, and honest when notes are thin?")
    respectful: Grade = Field(description="Collegial coaching tone: no scoring, blaming or inspecting the teacher")
    correct_language: Grade = Field(description="Are the teacher-facing parts natural, simple text in the right language?")


JUDGE_INSTRUCTIONS = """You review coaching packets that an AI wrote for Cluster Resource Persons (CRPs) in Indian \
government primary schools, after a CRP observed a Grade 1-3 lesson. Grade strictly but fairly: a 4 means you \
would show it to an expert teacher educator without changes. Judge only what is in front of you."""


def judge(case, packet):
    teacher_parts = {key: packet.get(key) for key in (
        "strength", "priority", "practice_steps", "materials", "demo_script", "follow_up", "follow_up_check")}
    sources = [f"{s['document']}, p.{s['page']}: {s['text']}" for s in packet.get("sources", [])]
    user = "\n\n".join([
        f"Teacher's language: {LANGUAGES[case['language']]}. Class {case['grade']}, {case['subject']}.",
        "What the CRP recorded:\n" + json.dumps({"rubric": case["rubric"], "notes": case["notes"]}, ensure_ascii=False),
        "Packet parts the teacher reads:\n" + json.dumps(teacher_parts, ensure_ascii=False, indent=1),
        "Evidence and summary for the CRP:\n" + json.dumps(
            {"evidence": packet.get("evidence"), "english_gloss": packet.get("english_gloss")}, ensure_ascii=False),
        "Cited sources:\n" + "\n".join(sources),
        "Grade the packet.",
    ])
    judgement, usage = llm.parse(JUDGE_INSTRUCTIONS, user, Judgement, effort="medium")
    grades = judgement.model_dump()
    for key in CRITERIA:
        grades[key]["score"] = max(1, min(4, grades[key]["score"]))
    return grades, usage


def cost(usages):
    return sum(usage.get(key, 0) * price / 1_000_000 for usage in usages for key, price in PRICES.items())


def run_case(case):
    visit = {key: case[key] for key in ("language", "grade", "subject", "rubric", "notes")}
    started = time.monotonic()
    try:
        packet, usages = generate_packet(visit)
    except llm.LLMError as err:
        return {"id": case["id"], "error": str(err)}
    seconds = round(time.monotonic() - started, 1)

    grades, judge_usage = judge(case, packet)
    return {
        "id": case["id"],
        "language": case["language"],
        "priority": packet["priority_rubric_item"],
        "priority_ok": packet["priority_rubric_item"] in case["acceptable"],
        "crp_notes_left": crp_notes_in(packet),
        "retries": len(usages) - 1,
        "sources": len(packet["grounded_in"]),
        "seconds": seconds,
        "cost_usd": round(cost([*usages, judge_usage]), 4),
        "grades": grades,
        "packet": packet,
    }


def summarise(rows):
    done = [row for row in rows if "error" not in row]
    print(f"\n{len(done)}/{len(rows)} cases ran", file=sys.stderr)
    if not done:
        return
    print(f"priority matched: {sum(r['priority_ok'] for r in done)}/{len(done)}", file=sys.stderr)
    print(f"CRP notes left in teacher text: {sum(bool(r['crp_notes_left']) for r in done)}", file=sys.stderr)
    print(f"needed a retry: {sum(r['retries'] > 0 for r in done)}", file=sys.stderr)
    print(f"median seconds per packet: {sorted(r['seconds'] for r in done)[len(done) // 2]}", file=sys.stderr)
    print(f"total cost: ${sum(r['cost_usd'] for r in done):.2f}", file=sys.stderr)
    print("\n| criterion | average (1-4) |\n|---|---|", file=sys.stderr)
    for key in CRITERIA:
        average = sum(r["grades"][key]["score"] for r in done) / len(done)
        print(f"| {key} | {average:.1f} |", file=sys.stderr)
    for row in rows:
        if "error" in row:
            print(f"ERROR {row['id']}: {row['error']}", file=sys.stderr)


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
    cases = [json.loads(line) for line in CASES.read_text(encoding="utf-8").splitlines() if line.strip()]
    if "--limit" in sys.argv:
        cases = cases[: int(sys.argv[sys.argv.index("--limit") + 1])]

    rows = []
    for case in cases:
        print(f"{case['id']}…", file=sys.stderr)
        rows.append(run_case(case))
    RESULTS.write_text(json.dumps(rows, ensure_ascii=False, indent=1), encoding="utf-8")
    summarise(rows)
    print(f"\nFull results: {RESULTS}", file=sys.stderr)


if __name__ == "__main__":
    main()
