"""Everything the phone needs before walking into a school with no signal, in one download.

The phone stores each part under the same key as the normal API call, so pages read
it from their usual cache (frontend/src/lib/sync.js -> refreshOfflinePack).
"""

from app.controllers import rubric as rubric_controller
from app.controllers import schools as schools_controller


def offline_pack():
    schools = schools_controller.list_schools()
    return {
        "schools": schools,
        "school_details": {str(school["id"]): schools_controller.get_school(school["id"]) for school in schools},
        "rubric": rubric_controller.get_rubric(),
    }
