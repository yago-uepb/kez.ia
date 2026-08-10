from typing import Annotated

from fastapi import APIRouter, Body, Depends

from .schemas import SubmitRequest, SubmitResponse
from .service import SubmitService

router = APIRouter(tags=["Submit"])

@router.post("/submits", status_code=200, response_model=SubmitResponse)
async def submit_resolving(
    payload: Annotated[SubmitRequest, Body()],
    service: Annotated[SubmitService, Depends()]
):
    return await service.review(payload.problem_id, payload.attempt)
