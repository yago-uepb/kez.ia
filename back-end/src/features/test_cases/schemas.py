from pydantic import BaseModel, Field


class TestCaseCreateRequest(BaseModel):
    input: str | None = None
    expected_output: str


class TestCaseResponse(BaseModel):
    id: int = Field(ge=1)
    problem_id: int = Field(ge=1)
    input: str | None
    expected_output: str


class DeleteTestCasesRequest(BaseModel):
    ids: list[int] = Field(..., min_length=1)