import logging
from collections.abc import Awaitable, Callable
from uuid import uuid4

from fastapi import Request, Response, status
from fastapi.responses import JSONResponse

from rutina.errors import AppError, ErrorCode, ErrorResponse

REQUEST_ID_HEADER = "X-Request-ID"
logger = logging.getLogger(__name__)

APP_ERROR_STATUS = {ErrorCode.DATABASE_UNAVAILABLE: status.HTTP_503_SERVICE_UNAVAILABLE}


def configure_logging() -> None:
    logging.basicConfig(level=logging.INFO, format="level=%(levelname)s %(message)s")


async def observe_request(
    request: Request, call_next: Callable[[Request], Awaitable[Response]]
) -> Response:
    request_id = uuid4().hex
    request.state.request_id = request_id

    try:
        response = await call_next(request)
    except AppError as error:
        response = JSONResponse(
            status_code=APP_ERROR_STATUS[error.code],
            content=ErrorResponse(code=error.code).model_dump(mode="json"),
        )
        logger.warning(
            "event=request_finished request_id=%s status=%d code=%s",
            request_id,
            response.status_code,
            error.code,
        )
    except Exception as error:
        response = JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=ErrorResponse(code=ErrorCode.INTERNAL_ERROR).model_dump(mode="json"),
        )
        logger.error(
            "event=request_finished request_id=%s status=%d code=%s exception_type=%s",
            request_id,
            response.status_code,
            ErrorCode.INTERNAL_ERROR,
            type(error).__name__,
        )
    else:
        logger.info(
            "event=request_finished request_id=%s status=%d", request_id, response.status_code
        )

    response.headers[REQUEST_ID_HEADER] = request_id
    return response
