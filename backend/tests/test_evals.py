"""The eval harness runs end to end (Claude faked), so a paid run won't crash halfway."""

import json

from evals import run_eval

PACKET = {
    "strength": "s", "priority": "p", "practice_steps": ["a"], "materials": ["m"], "demo_script": "d",
    "follow_up": "f", "follow_up_check": "c", "evidence": ["e"], "english_gloss": "g",
    "priority_rubric_item": "children_read", "grounded_in": ["ncf-p115-reading"], "sources": [],
}


def test_run_case_and_summary(monkeypatch, capsys):
    usage = {"input_tokens": 1000, "output_tokens": 500, "cache_read_input_tokens": 0, "cache_creation_input_tokens": 0}
    monkeypatch.setattr(run_eval, "generate_packet", lambda visit: (PACKET, [usage]))

    def parse(system, user, model, effort="medium", max_tokens=16000):
        grade = {"score": 7, "comment": "fine"}
        return model(**{key: grade for key in run_eval.CRITERIA}), usage

    monkeypatch.setattr(run_eval.llm, "parse", parse)
    case = json.loads(run_eval.CASES.read_text(encoding="utf-8").splitlines()[0])

    row = run_eval.run_case(case)
    assert row["priority_ok"] is True
    assert row["grades"]["specific"]["score"] == 4  # clamped
    assert row["cost_usd"] == round(2 * (1000 * 4 + 500 * 20) / 1_000_000, 4)

    run_eval.summarise([row, {"id": "x", "error": "boom"}])
    assert "priority matched: 1/1" in capsys.readouterr().err
