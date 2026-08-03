from fastapi import APIRouter, Depends

from .submit_schemas import SubmitRequest, SubmitResponse
from .submit_service import SubmitService

router = APIRouter(tags=["Submit"])

@router.post("/submits", response_model=SubmitResponse)
async def submit_resolving(
    payload: SubmitRequest,
    service: SubmitService = Depends(SubmitService)
):
    response = await service.review(payload.problem_id, payload.attempt)
    return response
