from typing import Annotated

from asyncpg import Connection
from fastapi import Depends

from src.shared.dependencies import get_connection
from src.shared.exceptions import ConflictException

from .schemas import CreateListRequest, CreateListResponse


class ListService:
    def __init__(
        self, 
        connection: Annotated[Connection, Depends(get_connection)]
    ):
        self.connection = connection
    

    async def create(self, data: CreateListRequest):
        exists = await self.connection.fetchrow(
            """
            SELECT id, name
            FROM lists 
            WHERE name ILIKE $1
            LIMIT 1
            """, data.name
        )

        if exists:
            raise ConflictException("Esse nome pertence a outra lista")

        row = await self.connection.fetchrow(
            """
            INSERT INTO lists 
                (name, description, is_hidden) 
            VALUES 
                ($1, $2, $3) 
            RETURNING id
            """, data.name, data.description, data.is_hidden
        )

        return CreateListResponse(
            id=row["id"],
            name=data.name,
            description=data.description,
            is_hidden=data.is_hidden
        )
