from typing import Annotated

from asyncpg import Connection
from fastapi import Depends

from src.shared.dependencies import get_connection
from src.shared.exceptions import NotFoundException, ValidationException


class ProblemService:

    def __init__(
        self, 
        connection: Annotated[Connection, Depends(get_connection)]
    ):
        # Guarda a conexão recebida para acessar o banco.
        self.connection = connection


    async def _list_exists(self, list_id):
        # Verifica se a lista informada existe.
        row = await self.connection.fetchrow(
            "SELECT id FROM lists WHERE id = $1",
            list_id,
        )

        return row is not None
        

    async def add_problems_to_list(self, list_id, problems):
        # Cria os problemas e associa cada um à lista.
        async with self.connection.transaction():

            if not await self._list_exists(list_id):
                raise NotFoundException(
                    f"A lista {list_id} não foi encontrada.",
                )

            created_problems = []

            for problem in problems:
                test_cases = problem.test_cases
                
                # Cria o problema e retorna os dados gerados pelo banco.
                row = await self.connection.fetchrow(
                    """
                    INSERT INTO problems (
                        title,
                        description,
                        input,
                        expected_output
                    )
                    VALUES ($1, $2, $3, $4)
                    RETURNING id, title, description, input, expected_output
                    """,
                    problem.title,
                    problem.description,
                    test_cases[0].input,
                    test_cases[0].expected_output,
                )

                # Associa o problema criado à lista.
                await self.connection.execute(
                    """
                    INSERT INTO list_problems 
                        (list_id, problem_id)
                    VALUES 
                        ($1, $2)
                    """,
                    list_id,
                    row["id"],
                )

                # Prepara todos os casos de teste, EXCLUINDO o primeiro já inserido
                tuple_test_cases = [
                    (row["id"], case.input, case.expected_output) 
                    for case in test_cases[1:]
                ]

                # Insere tuple_test_cases em lote
                await self.connection.executemany(
                    """
                    INSERT INTO test_cases 
                        (problem_id, input, expected_output)
                    VALUES 
                        ($1, $2, $3)
                    """,
                    tuple_test_cases
                )

                # Guarda o problema criado para retorná-lo.
                created_problems.append(dict(row))

            return created_problems


    async def get_problem(self, id):
        row = await self.connection.fetchrow(
            """
            SELECT id, title, description, input, expected_output
            FROM problems
            WHERE id = $1
            """, id
        )

        if row is None:
            raise NotFoundException(
                f"O problema {id} não foi encontrado!",
            )
        
        return dict(row)
    

    async def patch_problem(self, id, payload):
        fields = payload.model_dump(exclude_unset=True)

        if not fields:
            raise ValidationException("Nenhum campo para atualizar.")

        set_clause = ", ".join(f"{field} = ${i}" for i, field in enumerate(fields, start=1))
        values = list(fields.values())

        row = await self.connection.fetchrow(
            f"""
            UPDATE problems
            SET {set_clause}
            WHERE id = ${len(values) + 1}
            RETURNING id, title, description, input, expected_output
            """,
            *values,
            id
        )

        if row is None:
            raise NotFoundException(
                f"O Problema {id} não foi encontrado.",
            )
        
        return dict(row)


    async def delete_problems(self, ids):
        deleted_rows = await self.connection.fetch(
            """
            DELETE FROM problems
            WHERE id = ANY($1::int[])
            RETURNING id
            """,
            ids
        )

        if not deleted_rows:
            raise NotFoundException(
                "Nenhum dos problemas informados foram encontrados."
            )
        
        return [row["id"] for row in deleted_rows]
