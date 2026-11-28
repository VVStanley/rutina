from rutina.errors import AppError, ErrorCode


class DatabaseUnavailableError(AppError):
    code = ErrorCode.DATABASE_UNAVAILABLE
