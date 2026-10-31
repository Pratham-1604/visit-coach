"""Read and check an uploaded checklist file (CSV or JSON). Pure functions, no database.

CSV columns (one row per item; a header row is required):
    id, subject, need_area, text_en, text_mr, text_hi, look_for, kpalp
JSON: a list of items shaped like rubric.json's items (text is {"en": ..., "mr": ..., "hi": ...}),
or {"items": [...]}.
"""

import csv
import io
import json
import re

CSV_COLUMNS = ["id", "subject", "need_area", "text_en", "text_mr", "text_hi", "look_for", "kpalp"]
SUBJECTS = ("literacy", "numeracy", "both")
LANGUAGES = ("en", "mr", "hi")
MAX_ITEMS = 60
ID_PATTERN = re.compile(r"^[a-z][a-z0-9_]{1,40}$")


class ChecklistFileError(Exception):
    """The file can't be used. `problems` lists every reason, for the uploader to fix in one go."""

    def __init__(self, problems):
        super().__init__("; ".join(problems))
        self.problems = problems


def parse_checklist(filename, data, need_area_ids):
    """Bytes of an uploaded .csv or .json file -> a clean list of items, or ChecklistFileError."""
    try:
        text = data.decode("utf-8-sig")  # Excel saves CSV with a BOM
    except UnicodeDecodeError as err:
        raise ChecklistFileError(["The file must be saved as UTF-8 text"]) from err

    if filename.lower().endswith(".json"):
        raw = _from_json(text)
    elif filename.lower().endswith(".csv"):
        raw = _from_csv(text)
    else:
        raise ChecklistFileError(["Upload a .csv or .json file"])

    items = [_clean(item) for item in raw]
    problems = check_items(items, need_area_ids)
    if problems:
        raise ChecklistFileError(problems)
    return items


def check_items(items, need_area_ids):
    problems = []
    if not items:
        problems.append("The checklist has no items")
    if len(items) > MAX_ITEMS:
        problems.append(f"At most {MAX_ITEMS} items (found {len(items)})")

    seen = set()
    for number, item in enumerate(items, 1):
        where = f"Item {number} ({item['id'] or 'no id'})"
        if not ID_PATTERN.match(item["id"]):
            problems.append(f"{where}: id must be lowercase letters, digits and _ (e.g. children_read)")
        elif item["id"] in seen:
            problems.append(f"{where}: the id is used twice")
        seen.add(item["id"])
        if item["subject"] not in SUBJECTS:
            problems.append(f"{where}: subject must be one of {', '.join(SUBJECTS)}")
        if item["need_area"] not in need_area_ids:
            problems.append(f"{where}: need_area must be one of {', '.join(sorted(need_area_ids))}")
        if not item["text"].get("en"):
            problems.append(f"{where}: text_en (the English wording) is required")
        if any(len(text) > 200 for text in item["text"].values()):
            problems.append(f"{where}: item wording must be under 200 characters")
        if len(item["look_for"]) > 400:
            problems.append(f"{where}: look_for must be under 400 characters")
    return problems


def to_csv(items):
    """Items -> CSV text in the upload format, so a state can download, edit and upload again."""
    out = io.StringIO()
    writer = csv.DictWriter(out, fieldnames=CSV_COLUMNS)
    writer.writeheader()
    for item in items:
        writer.writerow(
            {
                "id": item["id"],
                "subject": item["subject"],
                "need_area": item["need_area"],
                **{f"text_{lang}": item["text"].get(lang, "") for lang in LANGUAGES},
                "look_for": item.get("look_for", ""),
                "kpalp": item.get("kpalp", ""),
            }
        )
    return out.getvalue()


def _from_csv(text):
    reader = csv.DictReader(io.StringIO(text))
    missing = [column for column in ("id", "subject", "need_area", "text_en") if column not in (reader.fieldnames or [])]
    if missing:
        raise ChecklistFileError([f"The header row is missing: {', '.join(missing)} (columns: {', '.join(CSV_COLUMNS)})"])
    return [
        {
            "id": row.get("id"),
            "subject": row.get("subject"),
            "need_area": row.get("need_area"),
            "text": {lang: row.get(f"text_{lang}") for lang in LANGUAGES},
            "look_for": row.get("look_for"),
            "kpalp": row.get("kpalp"),
        }
        for row in reader
        if any((value or "").strip() for value in row.values() if isinstance(value, str))
    ]


def _from_json(text):
    try:
        data = json.loads(text)
    except json.JSONDecodeError as err:
        raise ChecklistFileError([f"Not valid JSON: {err.msg} (line {err.lineno})"]) from err
    items = data.get("items") if isinstance(data, dict) else data
    if not isinstance(items, list) or not all(isinstance(item, dict) for item in items):
        raise ChecklistFileError(['JSON must be a list of items, or {"items": [...]}'])
    return items


def _clean(item):
    """Trim strings and keep only the fields the app uses."""
    text = item.get("text") if isinstance(item.get("text"), dict) else {"en": item.get("text")}
    clean = {
        "id": _str(item.get("id")).lower(),
        "subject": _str(item.get("subject")).lower() or "both",
        "need_area": _str(item.get("need_area")),
        "text": {lang: _str(text.get(lang)) for lang in LANGUAGES if _str(text.get(lang))},
        "look_for": _str(item.get("look_for")),
    }
    if _str(item.get("kpalp")):
        clean["kpalp"] = _str(item.get("kpalp"))
    return clean


def _str(value):
    return str(value).strip() if value is not None else ""
