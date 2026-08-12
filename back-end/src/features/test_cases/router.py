from typing import Annotated

from fastapi import APIRouter, Body, Depends, Path

from .schemas import TestCaseCreateRequest, TestCaseResponse, DeleteTestCasesRequest
from .service import TestCaseService

router = APIRouter(tags=["Test Cases"])


@router.post(
    "/problems/{problem_id}/test-cases",
    response_model=TestCaseResponse,
    status_code=201,
)
async def create_test_case(
    problem_id: Annotated[int, Path()],
    body: Annotated[TestCaseCreateRequest, Body()],
    service: Annotated[TestCaseService, Depends()],
):
    return await service.create(problem_id, body)


@router.delete("/test-cases")
async def delete_test_cases(
    body: Annotated[DeleteTestCasesRequest, Body()],
    service: Annotated[TestCaseService, Depends()],
):
    deleted_ids = await service.delete_test_cases(body.ids)
    return {"deleted_ids": deleted_ids}