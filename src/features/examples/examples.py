import asyncpg
from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from src.shared.dependencies import get_connection

router = APIRouter(tags=["Example"])



class GetRequest(BaseModel):
    id: int

@router.get("/code-groups")
async def get_code_groups(
    connection: asyncpg.Connection = Depends(get_connection)
):
    return await connection.fetchrow(
        """
        SELECT id, name
        FROM code_groups
        """
    )



@router.get("/code-groups/{id}")
async def get_code_group_by_id(
    id: int,
    connection: asyncpg.Connection = Depends(get_connection)
):
    return await connection.fetchrow(
        """
        SELECT id, name
        FROM code_groups
        WHERE id = $1
        """, id
    )



class PostRequest(BaseModel):
    name: str = Field(min_length=3, max_length=255)

@router.post("/code-groups")
async def create_code_group(
    payload: PostRequest, 
    connection: asyncpg.Connection = Depends(get_connection)
):
    name = payload.name.strip().replace(r"\s+", " ")
    await connection.execute(
        """
        INSERT INTO code_groups
            (name) 
        VALUES ($1)
        """, name
    )
    return { "success": True }



class DeleteRequest(BaseModel):
    ids_list: list[int]

@router.delete("/code-groups")
async def delete_code_group(
    payload: DeleteRequest, 
    connection: asyncpg.Connection = Depends(get_connection)
):
    await connection.execute(
        """
        DELETE FROM code_groups
        WHERE id = ANY($1::int[])
        """, payload.ids_list
    )
    return { "success": True }
