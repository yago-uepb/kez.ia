from typing import Annotated

from asyncpg import Connection
from fastapi import Depends

from src.shared.dependencies import get_connection
from src.shared.exceptions import ConflictException, NotFoundException


class ListProblemService:
    def __init__(
        self,
        connection: Annotated[Connection, Depends(get_connection)]
    ):
        self.connection = connection

    async def attach(self, list_id, problem_id):
        list_row = await self.connection.fetchrow("SELECT id FROM lists WHERE id = $1", list_id)
        if list_row is None:
            raise NotFoundException(f"A lista {list_id} não foi encontrada.")

        problem_row = await self.connection.fetchrow("SELECT id FROM problems WHERE id = $1", problem_id)
        if problem_row is None:
            raise NotFoundException(f"O problema {problem_id} não foi encontrado.")

        exists = await self.connection.fetchrow(
            "SELECT 1 FROM list_problems WHERE list_id = $1 AND problem_id = $2",
            list_id, problem_id,
        )
        if exists:
            raise ConflictException("Esse problema já está nessa lista.")

        await self.connection.execute(
            "INSERT INTO list_problems (list_id, problem_id) VALUES ($1, $2)",
            list_id, problem_id,
        )
        return {"list_id": list_id, "problem_id": problem_id}

    async def detach(self, list_id, problem_id):
        result = await self.connection.execute(
            "DELETE FROM list_problems WHERE list_id = $1 AND problem_id = $2",
            list_id, problem_id,
        )
        # asyncpg retorna string tipo "DELETE 1" ou "DELETE 0"
        if result.endswith("0"):
            raise NotFoundException("Esse problema não está associado a essa lista.")