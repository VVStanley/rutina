from enum import StrEnum
from typing import ClassVar

from pydantic import BaseModel


class ErrorCode(StrEnum):
    DATABASE_UNAVAILABLE = "database_unavailable"
    INTERNAL_ERROR = "internal_error"


class AppError(Exception):
    code: ClassVar[ErrorCode]


class ErrorResponse(BaseModel):
    code: ErrorCode
