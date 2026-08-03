import asyncpg

from src.core.settings import settings

pool = None

async def connect_db():
    global pool
    pool = await asyncpg.create_pool(
        dsn=settings.DATABASE_URL,
        min_size=1,
        max_size=10,
        command_timeout=30,
    )

async def close_db_connection():
    await pool.close()

def get_pool():
    return pool