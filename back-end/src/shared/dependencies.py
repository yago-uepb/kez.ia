from src.core.database import SQLiteConnectionAdapter, get_db_type, get_pool
from src.core.settings import settings


async def get_connection():
    pool = get_pool()
    if pool is None:
        raise RuntimeError("O pool de banco de dados é None.")

    if get_db_type() == "postgres":
        # Pega uma unidade do agrupamento de conexões do pool
        async with pool.acquire() as connection:
            # Envia essa conexão garantindo ativação e segurança
            yield connection
    else:
        yield SQLiteConnectionAdapter(pool)

async def get_settings():
    return settings
