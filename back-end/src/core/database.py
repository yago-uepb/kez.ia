import asyncpg

from .settings import settings

pool = None

# import ssl

# ctx = ssl.create_default_context()
# ctx.check_hostname = False
# ctx.verify_mode = ssl.CERT_NONE

async def connect_db():
    global pool
    pool = await asyncpg.create_pool(
        dsn=settings.DATABASE_URL,
        # ssl=ctx,
        min_size=1,
        max_size=10,
        command_timeout=30,
        timeout=15,
        statement_cache_size=0,
    )

async def close_db_connection():
    await pool.close()

def get_pool():
    return pool