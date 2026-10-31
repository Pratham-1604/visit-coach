"""FastAPI entry point.

Dev:  uv run uvicorn app.main:app --reload   (from backend/)
Prod: the same app also serves the built React app from frontend/dist.
"""

import mimetypes
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException
from fastapi.responses import FileResponse

from app import config, db
from app.controllers.auth import current_user, require_mentor
from app.controllers.visits import fail_interrupted
from app.routes import auth, block, followups, offline, rehearsal, rubric, schools, teacher, visits
from app.seed import seed_if_empty, seed_users_if_empty


@asynccontextmanager
async def lifespan(app):
    db.init_db()
    seed_if_empty()
    seed_users_if_empty()
    fail_interrupted()
    yield


# The PWA manifest (frontend/dist/manifest.webmanifest) must be served with its own content type.
mimetypes.add_type("application/manifest+json", ".webmanifest")

app = FastAPI(title="VisitCoach API", lifespan=lifespan)

# Who may call what: mentors use the whole app, the block officer only support planning.
# The teacher's shared link stays open: teachers never log in (controllers/auth.py).
mentors_only = [Depends(require_mentor)]
app.include_router(auth.router)
app.include_router(schools.router, dependencies=mentors_only)
app.include_router(rubric.router, dependencies=mentors_only)
app.include_router(visits.router, dependencies=mentors_only)
app.include_router(followups.router, dependencies=mentors_only)
app.include_router(offline.router, dependencies=mentors_only)
app.include_router(rehearsal.router, dependencies=mentors_only)
app.include_router(block.router, dependencies=[Depends(current_user)])
app.include_router(teacher.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}


# Serve the built frontend (only exists after `npm run build`).
# Any non-API path returns index.html so React Router can handle it.
if config.FRONTEND_DIST.exists():
    dist = config.FRONTEND_DIST.resolve()

    @app.get("/{path:path}", include_in_schema=False)
    def serve_frontend(path: str):
        if path.startswith("api/"):
            raise HTTPException(status_code=404)

        file = (dist / path).resolve()
        if path and file.is_file() and file.is_relative_to(dist):
            return FileResponse(file)
        return FileResponse(dist / "index.html")
