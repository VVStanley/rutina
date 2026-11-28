from enum import StrEnum

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Environment(StrEnum):
    LOCAL = "local"
    TEST = "test"
    PROD = "prod"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="RUTINA_", env_file=".env", extra="ignore", hide_input_in_errors=True
    )

    environment: Environment = Environment.LOCAL
    database_host: str = Field(min_length=1)
    database_port: int = Field(default=5432, ge=1, le=65535)
    database_name: str = Field(min_length=1)
    database_user: str = Field(min_length=1)
    database_password: SecretStr = Field(min_length=1)
