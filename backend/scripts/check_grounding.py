"""Check that every grounding excerpt is really in its source document.

Usage (from backend/): uv run python scripts/check_grounding.py ../../sources

The sources/ folder (PDFs + extracted text) lives in the hackathon workspace, outside this repo.
Each excerpt is split on ' … ' and every segment must appear on the cited page.
"""

import json
import re
import sys
from pathlib import Path

GROUNDING = Path(__file__).resolve().parent.parent / "app" / "knowledge" / "grounding.json"


def normalise(text):
    return " ".join(text.split())


def page_texts(txt_file):
    pages, page, lines = {}, 0, []
    for line in txt_file.read_text(encoding="utf-8").splitlines():
        marker = re.match(r"=== page (\d+) ===", line)
        if marker:
            pages[page] = normalise(" ".join(lines))
            page, lines = int(marker.group(1)), []
        else:
            lines.append(line)
    pages[page] = normalise(" ".join(lines))
    return pages


def main(sources_dir):
    sources_dir = Path(sources_dir)
    grounding = json.loads(GROUNDING.read_text(encoding="utf-8"))
    cache, failures = {}, 0

    for passage in grounding["passages"]:
        doc = passage["doc"]
        if doc not in cache:
            txt_file = next((sources_dir / doc / "extracted").glob("*.txt"))
            cache[doc] = page_texts(txt_file)
        page = cache[doc].get(passage["page"], "")

        for segment in passage["text"].split(" … "):
            if normalise(segment) not in page:
                failures += 1
                print(f"MISSING {passage['id']} (p.{passage['page']}): {segment[:80]}")

    print(f"{len(grounding['passages'])} passages checked, {failures} missing segments")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1] if len(sys.argv) > 1 else "../../sources"))
