"""FastAPI entry point.

Dev:  uv run uvicorn app.main:app --reload   (from backend/)
Prod: the same app also serves the built React app from frontend/dist.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse

from app import config, db
from app.routes import rubric, schools
from app.seed import seed_if_empty


@asynccontextmanager
async def lifespan(app):
    db.init_db()
    seed_if_empty()
    yield


app = FastAPI(title="VisitCoach API", lifespan=lifespan)

app.include_router(schools.router)
app.include_router(rubric.router)


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
