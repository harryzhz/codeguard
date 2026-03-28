from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    STORAGE_BACKEND: str = "postgres"
    DATABASE_URL: str = "sqlite+aiosqlite:///codeguard.db"
    CODEGUARD_API_KEY: str = ""

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}
