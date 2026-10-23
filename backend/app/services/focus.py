"""Suggest what a CRP should focus on before visiting a school.

Simple rules over the school's existing FLN assessment numbers.
"""


def suggest_focus(school):
    reading = school.get("pct_reading_beginner") or 0
    numeracy = school.get("pct_numeracy_beginner") or 0

    if reading >= numeracy and reading >= 30:
        return {
            "area": "literacy",
            "reason": f"{reading}% of Grade 1-3 children are still at letter level or below. "
            "Watch whether children read on their own, not only repeat after the teacher.",
        }
    if numeracy >= 30:
        return {
            "area": "numeracy",
            "reason": f"{numeracy}% of Grade 1-3 children cannot yet recognise numbers 1-9. "
            "Watch whether children handle concrete materials themselves.",
        }
    return {
        "area": "general",
        "reason": "Learning levels are comparatively good. Check that every child, "
        "including the back rows, gets a turn to practise.",
    }
