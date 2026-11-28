from sqlalchemy import URL
from sqlalchemy.ext.asyncio import AsyncEngine, create_async_engine

from rutina.config import Settings

DATABASE_TIMEOUT_SECONDS = 3


def build_engine(settings: Settings) -> AsyncEngine:
    url = URL.create(
        drivername="postgresql+psycopg",
        username=settings.database_user,
        password=settings.database_password.get_secret_value(),
        host=settings.database_host,
        port=settings.database_port,
        database=settings.database_name,
    )
    return create_async_engine(
        url,
        connect_args={"connect_timeout": DATABASE_TIMEOUT_SECONDS},
        pool_timeout=DATABASE_TIMEOUT_SECONDS,
        pool_pre_ping=True,
        hide_parameters=True,
    )
