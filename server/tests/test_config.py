import os
from app.config import Settings


def test_default_storage_backend():
    s = Settings(DATABASE_URL="sqlite+aiosqlite:///:memory:")
    assert s.STORAGE_BACKEND == "postgres"


def test_custom_database_url():
    s = Settings(DATABASE_URL="postgresql+asyncpg://u:p@host/db")
    assert s.DATABASE_URL == "postgresql+asyncpg://u:p@host/db"


def test_env_override(monkeypatch):
    monkeypatch.setenv("STORAGE_BACKEND", "sqlite")
    monkeypatch.setenv("DATABASE_URL", "sqlite+aiosqlite:///:memory:")
    s = Settings()
    assert s.STORAGE_BACKEND == "sqlite"
