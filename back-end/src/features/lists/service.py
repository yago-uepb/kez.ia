from typing import Annotated

from asyncpg import Connection
from fastapi import Depends

from src.shared.dependencies import get_connection
from src.shared.exceptions import ConflictException, NotFoundException, ValidationException

from .schemas import CreateListRequest, CreateListResponse, ListResponse


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
    
    async def get_all(self):
        rows = await self.connection.fetch(
            """
            SELECT id, name, description, is_hidden
            FROM lists
            ORDER BY id
            """
        )
        return [dict(row) for row in rows]
    
    async def get_by_id(self, list_id: int):
        list_row = await self.connection.fetchrow(
            """
            SELECT id, name, description, is_hidden
            FROM lists
            WHERE id = $1 
            """, list_id
        )
        if list_row is None:
            raise NotFoundException(
                f"A lista {list_id} não foi encontrada.",
            )

        problem_rows = await self.connection.fetch(
            """
            SELECT id, title, description, input, expected_output
            FROM problems
            JOIN list_problems ON list_problems.problem_id = problems.id
            WHERE list_problems.list_id = $1
            """, list_id,
        )
        return{ 
            **dict(list_row),
            "problems": [dict(row) for row in problem_rows],
        }

    async def patch_list(self, list_id, payload):
        fields = payload.model_dump(exclude_unset=True)

        if not fields:
            raise ValidationException("Nenhum Campo para atualizar.")

        if "name" in fields:
            exists = await self.connection.fetchrow(
                """
                SELECT id FROM lists
                WHERE name ILIKE $1 AND id != $2
                LIMIT 1
                """, fields["name"], list_id
            )
            if exists:
                raise ConflictException("Esse nome pertence a outra lista.")

        set_clause = ", ".join(
            f"{field} = ${i}" for i, field in enumerate(fields, start=1)
        )
        values = list(fields.values())

        row = await self.connection.fetchrow(
            f"""
            UPDATE lists
            SET {set_clause}
            WHERE id = ${len(values) + 1}
            RETURNING id, name, description, is_hidden
            """, *values, list_id
        )

        print("DEBUG row:", row)
        if row is None:
            raise NotFoundException(f"A lista {list_id} não foi encontrada.")

        return dict(row)
    
    async def delete_lists(self, ids):
            async with self.connection.transaction():
                # Guarda quais problemas estavam ligados a essas listas ANTES de apagar
                problem_rows = await self.connection.fetch(
                    """
                    SELECT DISTINCT problem_id
                    FROM list_problems
                    WHERE list_id = ANY($1::int[])
                    """, ids
                )
                problem_ids = [row["problem_id"] for row in problem_rows]

                deleted_lists = await self.connection.fetch(
                    """
                    DELETE FROM lists
                    WHERE id = ANY($1::int[])
                    RETURNING id
                    """, ids
                )

                if not deleted_lists:
                    raise NotFoundException("Nenhuma das listas informadas foi encontrada.")

                # Dos problemas que estavam nessas listas, apaga só quem ficou "órfão"
                # (ou seja: não sobrou em list_problems em NENHUMA outra lista)
                orphan_ids = []
                if problem_ids:
                    orphan_rows = await self.connection.fetch(
                        """
                        DELETE FROM problems
                        WHERE id = ANY($1::int[])
                        AND id NOT IN (SELECT problem_id FROM list_problems)
                        RETURNING id
                        """, problem_ids
                    )
                    orphan_ids = [row["id"] for row in orphan_rows]

            return {
                "deleted_list_ids": [row["id"] for row in deleted_lists],
                "deleted_problem_ids": orphan_ids,
            }