from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    STORAGE_BACKEND: str = "postgres"
    DATABASE_URL: str = "sqlite+aiosqlite:///codeguard.db"
    CODEGUARD_API_KEY: str = ""
    CODEGUARD_SERVER: str = ""
    POSTGRES_USER: str = ""
    POSTGRES_PASSWORD: str = ""
    POSTGRES_DB: str = ""

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}
