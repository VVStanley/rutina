FROM ghcr.io/astral-sh/uv:0.12.7 AS uv

FROM python:3.13.15-slim AS base
COPY --from=uv /uv /usr/local/bin/uv
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 \
    UV_LINK_MODE=copy UV_PYTHON_DOWNLOADS=never PATH="/app/.venv/bin:$PATH"
COPY pyproject.toml uv.lock ./

FROM base AS runtime
RUN --mount=type=cache,id=rutina-uv,target=/root/.cache/uv uv sync --locked --no-dev
COPY src/ src/
USER 65534:65534
EXPOSE 8000
CMD ["uvicorn", "--app-dir", "src", "rutina.main:create_app", "--factory", "--host", "0.0.0.0", "--port", "8000", "--ws", "none", "--no-access-log"]

FROM base AS test
RUN --mount=type=cache,id=rutina-uv,target=/root/.cache/uv uv sync --locked
COPY src/ src/
COPY tests/ tests/
USER 65534:65534
CMD ["pytest", "-p", "no:cacheprovider", "-m", "integration"]
