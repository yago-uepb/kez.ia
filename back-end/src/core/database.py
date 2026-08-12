import logging
import re
from contextlib import asynccontextmanager

import aiosqlite
import asyncpg

from src.core.settings import settings

logger = logging.getLogger(__name__)

pool = None
db_type = None  # "postgres" ou "sqlite"

SQLITE_PATH = "fallback.db"


class SQLiteConnectionAdapter:
    """
    Adapta a interface utilizada pelo projeto com asyncpg
    para aiosqlite.

    Compatibilidades implementadas:
    - $1, $2, ... -> ?
    - ILIKE -> LIKE
    - = ANY($N::tipo[]) -> IN (?, ?, ...)
    - execute()
    - executemany()
    - fetch()
    - fetchrow()
    - fetchval()
    - transaction()
    """

    _ANY_ARRAY_PATTERN = re.compile(
        r"=\s*ANY\(\$(\d+)::\w+\[\]\)",
        re.IGNORECASE,
    )


    def __init__(self, connection: aiosqlite.Connection):
        self._conn = connection
        self._transaction_depth = 0


    def _convert_query_and_args(
        self,
        query: str,
        args: tuple,
    ):
        args = list(args)

        # ==========================================================
        # PostgreSQL:
        #
        #   column = ANY($1::integer[])
        #
        # SQLite:
        #
        #   column IN (?, ?, ?)
        # ==========================================================

        match = self._ANY_ARRAY_PATTERN.search(query)

        if match:
            param_index = int(match.group(1)) - 1
            array_value = args[param_index]

            if not array_value:
                # Evita gerar:
                #
                # IN ()
                #
                # que não é portável.
                query = self._ANY_ARRAY_PATTERN.sub(
                    "IN (NULL)",
                    query,
                )
            else:
                placeholders = ", ".join(
                    "?" for _ in array_value
                )

                query = self._ANY_ARRAY_PATTERN.sub(
                    f"IN ({placeholders})",
                    query,
                )

                args = (
                    args[:param_index]
                    + list(array_value)
                    + args[param_index + 1:]
                )

        # PostgreSQL ILIKE -> SQLite LIKE
        query = re.sub(
            r"\bILIKE\b",
            "LIKE",
            query,
            flags=re.IGNORECASE,
        )

        # PostgreSQL positional parameters -> SQLite
        query = re.sub(
            r"\$\d+",
            "?",
            query,
        )

        return query, tuple(args)


    async def execute(
        self,
        query: str,
        *args,
    ) -> str:
        query, args = self._convert_query_and_args(
            query,
            args,
        )

        cursor = await self._conn.execute(
            query,
            args,
        )

        # Só confirma automaticamente se NÃO estivermos
        # dentro de uma transação explícita.
        if self._transaction_depth == 0:
            await self._conn.commit()

        return f"EXECUTED {cursor.rowcount}"


    async def executemany(
        self,
        query: str,
        args,
    ) -> str:
        """
        Executa a mesma query múltiplas vezes.

        Compatível com o padrão:

            await connection.executemany(
                query,
                [
                    (1, 10),
                    (1, 11),
                    (1, 12),
                ],
            )
        """

        converted_query = None
        converted_args = []

        for row_args in args:
            current_query, current_args = (
                self._convert_query_and_args(
                    query,
                    tuple(row_args),
                )
            )

            if converted_query is None:
                converted_query = current_query
            elif current_query != converted_query:
                raise ValueError(
                    "Não é possível usar executemany() com "
                    "queries convertidas para estruturas diferentes."
                )

            converted_args.append(current_args)

        if converted_query is None:
            return "EXECUTED 0"

        cursor = await self._conn.executemany(
            converted_query,
            converted_args,
        )

        if self._transaction_depth == 0:
            await self._conn.commit()

        return f"EXECUTED {cursor.rowcount}"


    async def fetch(
        self,
        query: str,
        *args,
    ) -> list[dict]:
        query, args = self._convert_query_and_args(
            query,
            args,
        )

        cursor = await self._conn.execute(
            query,
            args,
        )

        try:
            rows = await cursor.fetchall()

            return [
                dict(row)
                for row in rows
            ]
        finally:
            await cursor.close()
            

    async def fetchrow(
        self,
        query: str,
        *args,
    ) -> dict | None:
        query, args = self._convert_query_and_args(
            query,
            args,
        )

        cursor = await self._conn.execute(
            query,
            args,
        )

        try:
            row = await cursor.fetchone()
            return dict(row) if row else None
        finally:
            await cursor.close()
            

    async def fetchval(
        self,
        query: str,
        *args,
    ):
        row = await self.fetchrow(
            query,
            *args,
        )

        if row is None:
            return None

        return next(iter(row.values()))


    @asynccontextmanager
    async def transaction(self):
        is_outermost = self._transaction_depth == 0
        started_transaction = False

        if is_outermost and not self._conn.in_transaction:
            await self._conn.execute("BEGIN")
            started_transaction = True

        self._transaction_depth += 1

        try:
            yield self

            self._transaction_depth -= 1

            if is_outermost and started_transaction:
                await self._conn.commit()

        except Exception:
            self._transaction_depth -= 1

            if is_outermost and started_transaction:
                await self._conn.rollback()

            raise


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
