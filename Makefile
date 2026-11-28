.DEFAULT_GOAL := help

COMPOSE := docker compose --project-name rutina-local -f compose.yaml -f compose.local.yaml \
	$(if $(wildcard compose.local.network.yaml),-f compose.local.network.yaml)
GRADLE := android/gradlew -p android
PYTHON := uv run --project server --locked

.PHONY: help up down status logs fmt check test test-db apk

help:
	@printf '%s\n' \
	  'make up       Собрать и запустить локальный API и PostgreSQL' \
	  'make down     Остановить локальные сервисы с сохранением тома БД' \
	  'make status   Показать состояние локальных сервисов' \
	  'make logs     Показать последние журналы локальных сервисов' \
	  'make fmt      Отформатировать Python и Kotlin' \
	  'make check    Проверить формат, линтеры, типы Python и Android Lint' \
	  'make test     Запустить тесты Python и Kotlin, включая отдельную БД' \
	  'make test-db  Запустить интеграционный тест на одноразовой PostgreSQL' \
	  'make apk      Собрать подписанный тестовый APK'

up:
	$(COMPOSE) up -d --build --wait

down:
	$(COMPOSE) down

status:
	$(COMPOSE) ps

logs:
	$(COMPOSE) logs --tail 100

fmt:
	$(PYTHON) ruff format server
	$(GRADLE) :app:ktlintFormat

check:
	$(PYTHON) ruff format --check server
	$(PYTHON) ruff check server
	$(PYTHON) mypy --config-file server/pyproject.toml server/src server/tests
	$(GRADLE) :app:ktlintCheck :app:lintDebug

test:
	$(PYTHON) pytest server/tests -m 'not integration'
	$(MAKE) test-db
	$(GRADLE) :app:testDebugUnitTest

test-db:
	@set -eu; \
	  run_dir=$$(mktemp -d "$${TMPDIR:-/tmp}/rutina-test.XXXXXXXX"); \
	  project=$$(basename "$$run_dir" | tr '[:upper:].' '[:lower:]-'); \
	  compose() { docker compose --env-file /dev/null -p "$$project" -f compose.test.yaml "$$@"; }; \
	  trap 'compose down --volumes --rmi local && rmdir "$$run_dir"' EXIT; \
	  trap 'exit 130' INT; \
	  trap 'exit 143' TERM; \
	  compose run --rm --build tests

apk:
	@: "$${RUTINA_TEST_KEYSTORE:?Set the path to the persistent test keystore}"
	@: "$${RUTINA_TEST_KEYSTORE_PASSWORD:?Set the test keystore password}"
	$(GRADLE) :app:assembleDebug
