from typing import Annotated

from asyncpg import Connection
from fastapi import Depends

from src.shared.dependencies import get_connection
from src.shared.exceptions import ConflictException, ValidationException

from .schemas import CreateListResponse


class ListService:
    def __init__(
        self, 
        connection: Annotated[Connection, Depends(get_connection)]
    ):
        self.connection = connection


    @staticmethod
    def _normalize(name):
        name_normalized = " ".join(name.split())
        return name_normalized
    

    async def create(self, name, is_hidden = False):
        name_normalized = self._normalize(name)

        if not name_normalized:
            raise ValidationException("Nome inválido")

        exists = await self.connection.fetchrow(
            """
            SELECT id, name
            FROM lists 
            WHERE name ILIKE $1
            LIMIT 1
            """, name_normalized
        )

        if exists:
            raise ConflictException("Esse nome pertence a outra lista")

        row = await self.connection.fetchrow(
            """
            INSERT INTO lists (name, is_hidden) 
            VALUES ($1, $2) 
            RETURNING id
            """, name_normalized, is_hidden
        )

        return CreateListResponse(
            success=True,
            id=row["id"]
        )
