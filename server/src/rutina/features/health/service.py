from anyio import fail_after
from sqlalchemy.exc import InterfaceError, OperationalError
from sqlalchemy.exc import TimeoutError as PoolTimeoutError
from sqlalchemy.ext.asyncio import AsyncEngine

from rutina.db.queries.health import select_one
from rutina.features.health.errors import DatabaseUnavailableError

HEALTH_TIMEOUT_SECONDS = 3


async def check_database(engine: AsyncEngine) -> None:
    try:
        with fail_after(HEALTH_TIMEOUT_SECONDS):
            async with engine.connect() as connection:
                await select_one(connection)
    except (InterfaceError, OperationalError, PoolTimeoutError, TimeoutError) as error:
        raise DatabaseUnavailableError from error
