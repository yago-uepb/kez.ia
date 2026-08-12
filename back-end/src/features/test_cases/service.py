from typing import Annotated

from asyncpg import Connection
from fastapi import Depends

from src.shared.dependencies import get_connection
from src.shared.exceptions import NotFoundException


class TestCaseService:
    def __init__(
        self,
        connection: Annotated[Connection, Depends(get_connection)]
    ):
        self.connection = connection

    async def create(self, problem_id, payload):
        problem_row = await self.connection.fetchrow(
            "SELECT id FROM problems WHERE id = $1", problem_id
        )
        if problem_row is None:
            raise NotFoundException(f"O problema {problem_id} não foi encontrado.")

        row = await self.connection.fetchrow(
            """
            INSERT INTO test_cases (problem_id, input, expected_output)
            VALUES ($1, $2, $3)
            RETURNING id, problem_id, input, expected_output
            """,
            problem_id, payload.input, payload.expected_output,
        )
        return dict(row)

    async def delete_test_cases(self, ids):
        deleted_rows = await self.connection.fetch(
            """
            DELETE FROM test_cases
            WHERE id = ANY($1::int[])
            RETURNING id
            """,
            ids,
        )
        if not deleted_rows:
            raise NotFoundException("Nenhum dos test cases informados foi encontrado.")
        return [row["id"] for row in deleted_rows]