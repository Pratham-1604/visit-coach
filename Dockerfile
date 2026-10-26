# One container: FastAPI serves the API and the built React app (DECISIONS.md #4).
# Build:  docker build -t visitcoach .
# Run:    docker run -p 8000:8000 -e ANTHROPIC_API_KEY=... -e SARVAM_API_KEY=... visitcoach

# Stage 1: build the React app (frontend/dist)
FROM node:22-alpine AS frontend
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: the Python server
FROM python:3.11-slim
COPY --from=ghcr.io/astral-sh/uv:0.8.17 /uv /bin/uv
ENV UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy PORT=8000
WORKDIR /app/backend

# Dependencies first, so code changes don't reinstall them.
COPY backend/pyproject.toml backend/uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project

COPY backend/ ./
COPY --from=frontend /app/frontend/dist /app/frontend/dist

EXPOSE 8000
# The database and voice notes live in backend/data inside the container: they reset on every deploy,
# and the demo data is seeded again on start.
CMD ["sh", "-c", "uv run --no-sync uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]
