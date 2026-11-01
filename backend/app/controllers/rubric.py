"""Rubric logic: the observation checklist the phone caches for offline visits.

It is the newest version of the mentor's state checklist (controllers/checklists.py).
"""

from app.controllers.checklists import active_checklist


def get_rubric(user):
    return active_checklist(user["state"])
