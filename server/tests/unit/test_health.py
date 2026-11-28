import logging
from uuid import UUID

import pytest
from anyio import sleep_forever
from fastapi.testclient import TestClient
from pydantic import SecretStr
from sqlalchemy.exc import OperationalError
from sqlalchemy.ext.asyncio import AsyncConnection, AsyncEngine

from rutina.config import Environment, Settings
from rutina.features.health import service
from rutina.main import create_app


@pytest.fixture
def client() -> TestClient:
    settings = Settings(
        _env_file=None,
        environment=Environment.TEST,
        database_host="unused.invalid",
        database_name="rutina_test",
        database_user="rutina_test",
        database_password=SecretStr("fixture"),
    )
    return TestClient(create_app(settings))


def test_health_with_unavailable_database(
    client: TestClient, monkeypatch: pytest.MonkeyPatch, caplog: pytest.LogCaptureFixture
) -> None:
    def fail_to_connect(_engine: AsyncEngine) -> AsyncConnection:
        raise OperationalError(None, None, ConnectionError("sensitive placeholder"))

    monkeypatch.setattr(AsyncEngine, "connect", fail_to_connect)

    with client:
        response = client.get("/health")

    assert response.status_code == 503
    assert response.json() == {"code": "database_unavailable"}
    request_id = response.headers["X-Request-ID"]
    assert UUID(request_id).version == 4
    assert f"request_id={request_id}" in caplog.text
    assert "sensitive placeholder" not in caplog.text


def test_health_with_unexpected_failure(
    client: TestClient, monkeypatch: pytest.MonkeyPatch, caplog: pytest.LogCaptureFixture
) -> None:
    def fail_to_connect(_engine: AsyncEngine) -> AsyncConnection:
        raise RuntimeError("sensitive placeholder")

    monkeypatch.setattr(AsyncEngine, "connect", fail_to_connect)

    with client:
        response = client.get("/health")

    assert response.status_code == 500
    assert response.json() == {"code": "internal_error"}
    request_id = response.headers["X-Request-ID"]
    assert UUID(request_id).version == 4
    errors = [record for record in caplog.records if record.levelno >= logging.ERROR]
    assert len(errors) == 1
    assert f"request_id={request_id}" in errors[0].getMessage()
    assert "sensitive placeholder" not in caplog.text


def test_health_openapi_declares_responses_and_header(client: TestClient) -> None:
    with client:
        response = client.get("/openapi.json")

    responses = response.json()["paths"]["/health"]["get"]["responses"]
    assert set(responses) == {"204", "503", "500"}
    assert all("X-Request-ID" in operation["headers"] for operation in responses.values())
    assert "content" not in responses["204"]


def test_health_times_out_waiting_for_database(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    async def stalled_connection(_connection: AsyncConnection) -> AsyncConnection:
        await sleep_forever()
        raise AssertionError("The health deadline must cancel this wait")

    monkeypatch.setattr(service, "HEALTH_TIMEOUT_SECONDS", 0.05)
    monkeypatch.setattr(AsyncConnection, "__aenter__", stalled_connection)

    with client:
        response = client.get("/health")

    assert response.status_code == 503
    assert response.json() == {"code": "database_unavailable"}
    assert UUID(response.headers["X-Request-ID"]).version == 4
