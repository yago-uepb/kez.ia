from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    DATABASE_URL: str
    GROQ_API_KEY: str

    # Busca automaticamente o arquivo .env na raiz do projeto
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8"
    )

# Instância única para ser injetada
settings = Settings()
