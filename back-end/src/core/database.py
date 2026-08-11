import logging
import re

import aiosqlite
import asyncpg

from src.core.settings import settings

logger = logging.getLogger(__name__)

pool = None
db_type = None  # "postgres" ou "sqlite"
SQLITE_PATH = "fallback.db"


class SQLiteConnectionAdapter:
    """
    Adapta a interface do asyncpg para aiosqlite, cobrindo os padrões
    de query usados no projeto: $N -> ?, ILIKE -> LIKE,
    e = ANY($N::tipo[]) -> IN (?, ?, ...).
    """

    _ANY_ARRAY_PATTERN = re.compile(
        r"=\s*ANY\(\$(\d+)::\w+\[\]\)", re.IGNORECASE
    )

    def __init__(self, connection: aiosqlite.Connection):
        self._conn = connection

    def _convert_query_and_args(self, query: str, args: tuple):
        args = list(args)

        # "= ANY($N::tipo[])" -> "IN (?, ?, ...)"
        match = self._ANY_ARRAY_PATTERN.search(query)
        if match:
            param_index = int(match.group(1)) - 1
            array_value = args[param_index]

            placeholders = ", ".join("?" for _ in array_value)
            query = self._ANY_ARRAY_PATTERN.sub(f"IN ({placeholders})", query)

            args = (
                args[:param_index] + list(array_value) + args[param_index + 1:]
            )

        # ILIKE -> LIKE (SQLite já é case-insensitive por padrão em ASCII)
        query = re.sub(r"\bILIKE\b", "LIKE", query, flags=re.IGNORECASE)

        # $1, $2... -> ?
        query = re.sub(r"\$\d+", "?", query)

        return query, tuple(args)

    async def execute(self, query: str, *args) -> str:
        query, args = self._convert_query_and_args(query, args)
        cursor = await self._conn.execute(query, args)
        await self._conn.commit()
        return f"EXECUTED {cursor.rowcount}"

    async def fetch(self, query: str, *args) -> list[dict]:
        query, args = self._convert_query_and_args(query, args)
        cursor = await self._conn.execute(query, args)
        rows = await cursor.fetchall()
        return [dict(row) for row in rows]

    async def fetchrow(self, query: str, *args) -> dict | None:
        query, args = self._convert_query_and_args(query, args)
        cursor = await self._conn.execute(query, args)
        row = await cursor.fetchone()
        return dict(row) if row else None

    async def fetchval(self, query: str, *args):
        row = await self.fetchrow(query, *args)
        if row is None:
            return None
        return next(iter(row.values()))


async def connect_db():
    global pool, db_type

    if settings.FORCE_SQLITE_FALLBACK:
        logger.warning("FORCE_SQLITE_FALLBACK ativo. Usando SQLite direto.")
        pool = await aiosqlite.connect(SQLITE_PATH)
        pool.row_factory = aiosqlite.Row
        db_type = "sqlite"
        return

    try:
        pool = await asyncpg.create_pool(
            dsn=settings.DATABASE_URL,
            min_size=1,
            max_size=10,
            command_timeout=30,
            timeout=30,
            statement_cache_size=0,
        )
        db_type = "postgres"
        logger.info("✅ Conectado ao Postgres (Neon).")
    except (TimeoutError, OSError, asyncpg.PostgresError) as e:
        logger.warning(
            f"⚠️ Falha ao conectar ao Postgres ({e!r}). Usando SQLite como fallback local."
        )
        pool = await aiosqlite.connect(SQLITE_PATH)
        pool.row_factory = aiosqlite.Row
        db_type = "sqlite"
        logger.info("✅ Conectado ao SQLite (fallback).")


async def close_db_connection():
    if pool is None:
        return
    await pool.close()


def get_pool():
    return pool


def get_db_type():
    return db_type
