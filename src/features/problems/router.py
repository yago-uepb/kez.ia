from typing import Annotated

from asyncpg import Connection
from fastapi import APIRouter, Depends, Path
from pydantic import BaseModel, Field

from src.shared.dependencies import get_connection
from src.shared.exceptions import NotFoundException

router = APIRouter(tags=["Problems"])

class GetProblemRequest(BaseModel):
    id: int = Field(ge=1)

@router.get("/problems/{id}")
async def get_problem(
    path_parameters: Annotated[GetProblemRequest, Path()],
    connection: Annotated[Connection, Depends(get_connection)]
):
    exists = await connection.fetchrow(
        """
        SELECT * FROM problems WHERE id = $1 
        """, path_parameters.id
    )

    if not exists:
        raise NotFoundException("Problema não encontrado")
     
    problem = dict(exists)

    return problem
