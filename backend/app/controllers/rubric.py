"""Rubric logic: the observation rubric the phone caches for offline visits."""

from app.services import knowledge


def get_rubric():
    rubric = knowledge.rubric()
    return {
        "version": rubric["version"],
        "need_areas": rubric["need_areas"],
        "items": [
            {key: item[key] for key in ("id", "subject", "need_area", "text", "look_for")}
            for item in rubric["items"]
        ],
    }
