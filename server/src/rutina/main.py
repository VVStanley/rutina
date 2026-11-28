from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from rutina.config import Settings
from rutina.db.session import build_engine
from rutina.features.health.router import build_health_router
from rutina.observability import configure_logging, observe_request


def create_app(settings: Settings | None = None) -> FastAPI:
    configure_logging()
    engine = build_engine(settings if settings is not None else Settings())

    @asynccontextmanager
    async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
        try:
            yield
        finally:
            await engine.dispose()

    app = FastAPI(title="Rutina API", lifespan=lifespan)
    app.middleware("http")(observe_request)
    app.include_router(build_health_router(engine))
    return app
