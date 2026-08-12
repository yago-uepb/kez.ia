from typing import Annotated

from fastapi import APIRouter, Body, Depends

from .schemas import (
    CreateTestCasesRequest,
    CreateTestCasesResponse,
    DeleteTestCasesRequest,
    GetTestCasesByProblemIdResponse,
    ProblemId,
    UpdateTestCaseRequest,
    UpdateTestCaseResponse,
)
from .service import TestCaseService

router = APIRouter(tags=["Test Cases"])


@router.get(
    "/problems/{problem_id}/test-cases", 
    response_model=GetTestCasesByProblemIdResponse
)
async def get_tests_cases_by_problem_id(
    problem_id: ProblemId,
    service: Annotated[TestCaseService, Depends()],
):
    return await service.get_by_problem_id(problem_id)


@router.post(
    "/problems/{problem_id}/test-cases",
    response_model=CreateTestCasesResponse,
    status_code=201,
)
async def create_test_cases(
    problem_id: ProblemId,
    body: Annotated[CreateTestCasesRequest, Body()],
    service: Annotated[TestCaseService, Depends()],
):
    return await service.create(problem_id, body)


@router.put(
    "/test-cases",
    response_model=UpdateTestCaseResponse,
)
async def update_test_cases(
    body: Annotated[UpdateTestCaseRequest, Body()],
    service: Annotated[TestCaseService, Depends()],
):
    return await service.update_test_cases(body)


@router.delete("/test-cases")
async def delete_test_cases(
    body: Annotated[DeleteTestCasesRequest, Body()],
    service: Annotated[TestCaseService, Depends()],
):
    deleted_ids = await service.delete_test_cases(body.ids)
    return {"deleted_ids": deleted_ids}
