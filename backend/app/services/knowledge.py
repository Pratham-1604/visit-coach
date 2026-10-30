"""The FLN knowledge pack: rubric, practices, Lakshyas and grounding excerpts.

Data lives in app/knowledge/*.json (built from the public documents in the
hackathon's sources/ folder). This module loads it and renders the text block
that goes into every Claude call. The rendered text never changes between
requests, so it can be prompt-cached.
"""

import json
from functools import cache
from pathlib import Path

KNOWLEDGE_DIR = Path(__file__).resolve().parent.parent / "knowledge"


@cache
def _load(name):
    return json.loads((KNOWLEDGE_DIR / f"{name}.json").read_text(encoding="utf-8"))


def rubric():
    return _load("rubric")


def rubric_items():
    return {item["id"]: item for item in rubric()["items"]}


def need_areas():
    return {area["id"]: area for area in rubric()["need_areas"]}


def practices():
    return {practice["id"]: practice for practice in _load("practices")["practices"]}


def passages():
    return {passage["id"]: passage for passage in _load("grounding")["passages"]}


def source_label(passage_id):
    """A passage with its document title, for showing "Source: ... p.N" in the app."""
    passage = passages()[passage_id]
    return {
        "id": passage_id,
        "document": _load("grounding")["documents"][passage["doc"]],
        "page": passage["page"],
        "text": passage["text"],
    }


def lakshyas(grade):
    return _load("lakshyas")["grades"].get(str(grade))


def practices_for(rubric_item_id, grade=None):
    return [
        practice
        for practice in practices().values()
        if rubric_item_id in practice["rubric_item_ids"]
        and (grade is None or grade in practice["grades"])
    ]


@cache
def pack_text():
    """The whole knowledge pack as one plain-text block for the system prompt."""
    areas = need_areas()
    lines = ["# FLN knowledge pack", ""]

    state = rubric()["state_checklist"]
    lines += ["## Observation rubric (ratings: yes / partly / no)", "", state["about"], ""]
    for item in rubric()["items"]:
        lines.append(
            f"- {item['id']} [{item['subject']}; need area: {areas[item['need_area']]['label']}; "
            f"{state['name']} {item['kpalp']}: {state['indicators'][item['kpalp']]}]: "
            f"{item['text']['en']}. Good looks like: {item['look_for']} "
            f"(sources: {', '.join(item['source_ids'])})"
        )

    lines += ["", "## 5-minute practice library", ""]
    for practice in practices().values():
        lines.append(
            f"### {practice['id']}: {practice['title']} "
            f"(fixes: {', '.join(practice['rubric_item_ids'])}; grades {practice['grades']})"
        )
        lines.append(f"Materials: {'; '.join(practice['materials'])}")
        lines += [f"{n}. {step}" for n, step in enumerate(practice["steps"], 1)]
        lines.append(f"Mentor demo: {practice['demo_tip']}")
        lines.append(f"Next-visit check: {practice['check']}")
        lines.append(f"Sources: {', '.join(practice['source_ids'])}")
        lines.append("")

    lines += ["## NIPUN Bharat Lakshyas (targets) by class", ""]
    for grade, targets in _load("lakshyas")["grades"].items():
        lines.append(f"### Class {grade} (source: {targets['source_id']})")
        for domain in ("oral_language", "reading", "writing", "numeracy"):
            lines.append(f"{domain.replace('_', ' ').title()}: " + " | ".join(targets[domain]))
        lines.append("")

    lines += ["## Grounding passages (cite these ids in grounded_in)", ""]
    for passage in passages().values():
        source = source_label(passage["id"])
        lines.append(f"[{passage['id']}] {source['document']}, p.{passage['page']}: {passage['topic']}")
        lines.append(f"\"{passage['text']}\"")
        lines.append("")

    return "\n".join(lines)
