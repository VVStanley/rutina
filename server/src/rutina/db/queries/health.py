from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncConnection


async def select_one(connection: AsyncConnection) -> None:
    await connection.execute(text("SELECT 1"))
