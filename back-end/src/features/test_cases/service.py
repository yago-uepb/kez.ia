from typing import Annotated

from asyncpg import Connection
from fastapi import Depends

from src.shared.dependencies import get_connection
from src.shared.exceptions import BadRequestException, NotFoundException

from .schemas import (
    CreateTestCasesResponse,
    DeleteTestCasesResponse,
    GetTestCasesByProblemIdResponse,
    UpdateTestCaseResponse,
)


class TestCaseService:
    def __init__(
        self,
        connection: Annotated[Connection, Depends(get_connection)]
    ):
        self.connection = connection


    async def get_by_problem_id(self, problem_id):
        exists = await self.connection.fetchrow(
            """
            SELECT 
                input, expected_output
            FROM problems
            WHERE id = $1
            """, problem_id
        )

        if not exists:
            raise NotFoundException("Problema não encontrado")

        sample_case = dict(exists)

        rows = await self.connection.fetch(
            """
            SELECT 
                id, input, expected_output
            FROM test_cases
            WHERE problem_id = $1
            """, problem_id
        )

        return GetTestCasesByProblemIdResponse(
            sample_case=sample_case,
            remaining_cases=rows
        )


    async def create(self, problem_id, payload):
        problem_row = await self.connection.fetchrow(
            "SELECT id FROM problems WHERE id = $1", problem_id
        )

        if problem_row is None:
            raise NotFoundException(f"O problema {problem_id} não foi encontrado.")

        params = []
        values = []

        for index, case in enumerate(payload.test_cases):
            params.append(f"(${1+index*3}, ${2+index*3}, ${3+index*3})")
            values.extend([problem_id, case.input, case.expected_output])
            # Adiciona os elementos da lista individualmente na lista values

        rows = await self.connection.fetch(
            f"""
            INSERT INTO test_cases 
                (problem_id, input, expected_output)
            VALUES 
                {", ".join(params)}
            RETURNING 
                id, problem_id, input, expected_output
            """,
            *values
        )

        return CreateTestCasesResponse(
            test_cases=rows
        )


    async def update_test_cases(self, payload):
        rows = []

        for case in payload.test_cases:
            updates = []
            values = []

            if case.input:
                values.append(case.input)
                updates.append(f"input = ${len(values)}")

            if case.expected_output:
                values.append(case.expected_output)
                updates.append(f"expected_output = ${len(values)}")

            if updates:
                values.append(case.id)
                
                row = await self.connection.fetchrow(
                    f"""
                    UPDATE test_cases
                    SET 
                        {", ".join(updates)}
                    WHERE 
                        id = ${len(updates)}
                    RETURNING 
                        id, input, expected_output
                    """, *values
                )

                if row:
                    rows.append(dict(row))

        if not rows:
            raise BadRequestException("Nenhum valor válido foi enviado para atualização")
    
        return UpdateTestCaseResponse(
            test_cases=rows
        )


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
        
        return DeleteTestCasesResponse(
            ids=[row["id"] for row in deleted_rows]
        )
