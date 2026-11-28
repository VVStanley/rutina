import logging
from uuid import UUID

import pytest
from fastapi.testclient import TestClient

from rutina.config import Environment, Settings
from rutina.main import create_app


@pytest.mark.integration
def test_health_with_empty_postgresql(caplog: pytest.LogCaptureFixture) -> None:
    settings = Settings(_env_file=None)
    assert settings.environment == Environment.TEST

    with TestClient(create_app(settings)) as client, caplog.at_level(logging.INFO):
        response = client.get("/health")

    assert response.status_code == 204
    assert response.content == b""
    request_id = response.headers["X-Request-ID"]
    assert UUID(request_id).version == 4
    assert f"request_id={request_id} status=204" in caplog.text
