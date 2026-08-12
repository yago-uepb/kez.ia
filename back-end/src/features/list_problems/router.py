from typing import Annotated

from fastapi import APIRouter, Body, Depends

from .schemas import ListProblemRequest
from .service import ListProblemService

router = APIRouter(tags=["List Problems"])


@router.post("/list-problems", status_code=201)
async def attach_problem(
    body: Annotated[ListProblemRequest, Body()],
    service: Annotated[ListProblemService, Depends()],
):
    return await service.attach(body.list_id, body.problem_id)


@router.delete("/list-problems")
async def detach_problem(
    body: Annotated[ListProblemRequest, Body()],
    service: Annotated[ListProblemService, Depends()],
):
    await service.detach(body.list_id, body.problem_id)
    return {"detached": True}