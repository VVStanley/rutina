from fastapi import APIRouter, Response, status
from sqlalchemy.ext.asyncio import AsyncEngine

from rutina.errors import ErrorResponse
from rutina.features.health.service import check_database
from rutina.observability import REQUEST_ID_HEADER


def build_health_router(engine: AsyncEngine) -> APIRouter:
    router = APIRouter(tags=["health"])
    headers = {REQUEST_ID_HEADER: {"schema": {"type": "string"}}}

    @router.get(
        "/health",
        status_code=status.HTTP_204_NO_CONTENT,
        response_class=Response,
        responses={
            204: {"description": "Database reachable", "headers": headers},
            503: {
                "model": ErrorResponse,
                "description": "Database unavailable",
                "headers": headers,
            },
            500: {"model": ErrorResponse, "description": "Internal error", "headers": headers},
        },
    )
    async def health() -> Response:
        await check_database(engine)
        return Response(status_code=status.HTTP_204_NO_CONTENT)

    return router
