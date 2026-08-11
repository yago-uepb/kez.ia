from typing import Annotated

from fastapi import APIRouter, Body, Depends, Path

from .schemas import AddProblemsRequest, AddProblemsResponse
from .service import ProblemService

router = APIRouter(tags=["Problems"])


@router.post(
    "/lists/{list_id}/problems",
    response_model=AddProblemsResponse,
    status_code=201,
)
async def add_problems(
    list_id: Annotated[int, Path()],
    body: Annotated[AddProblemsRequest, Body()],
    service: Annotated[ProblemService, Depends()],
):
    # Recebe a requisição e envia os dados para o service.
    problems = await service.add_problems_to_list(
        list_id,
        body.problems,
    )

    # Retorna os problemas criados.
    return AddProblemsResponse(
        list_id=list_id,
        problems=problems,
    )