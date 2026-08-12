from typing import Annotated
 
from fastapi import APIRouter, Body, Depends, Path, Query
 
from .schemas import (
    DeleteProblemRequest,
    AddProblemsRequest,
    AddProblemsResponse,
    GetRandomProblemsRequest,
    GetRandomProblemsResponse,
    ProblemResponse,
    ProblemPatchRequest,
)
from .service import ProblemService
 
router = APIRouter(tags=["Problems"])
 
 
@router.post(
    "/lists/{list_id}/problems",
    response_model=AddProblemsResponse,
    status_code=201,
)
async def add_problems(
    list_id: Annotated[int, Path(ge=1)],
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
 
@router.get("/problems/random", response_model=GetRandomProblemsResponse)
async def get_random_problems(
    params: Annotated[GetRandomProblemsRequest, Query()],
    service: Annotated[ProblemService, Depends()],
):
    # Retorna vários problemas aleatórios e sem repetição, conforme os filtros informados.
    problems = await service.get_random_problems(
        params.lists_ids,
        params.excluded_problem_ids,
        params.quantity,
    )

    # Instancia o schema de resposta a partir dos dados retornados pelo service.
    return GetRandomProblemsResponse(problems=problems)
    
@router.get("/problems/{problem_id}", response_model=ProblemResponse)
async def get_problem(
    problem_id: Annotated[int, Path()],
    service: Annotated[ProblemService, Depends()],
):
    return await service.get_problem(problem_id)
 
@router.patch("/problems/{id}", response_model=ProblemResponse)
async def patch_problem(
    id: Annotated[int, Path()],
    body : Annotated[ProblemPatchRequest, Body()],
    service : Annotated[ProblemService, Depends()],
):
    return await service.patch_problem(id, body)
 
 
@router.delete("/problems")
async def delete_problems(
    body: Annotated[DeleteProblemRequest, Body()],
    service: Annotated[ProblemService, Depends()],
):
    deleted_ids = await service.delete_problems(body.ids)
    return {"deleted_ids": deleted_ids}