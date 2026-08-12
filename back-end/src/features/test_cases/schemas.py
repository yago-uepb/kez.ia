from typing import Annotated

from fastapi import Path
from pydantic import BaseModel, Field, field_validator

ProblemId = Annotated[int, Path(ge=1)]

'''-------- GET SCHEMAS ---------'''

class SampleCase(BaseModel):
    input: str | None = None
    expected_output: str

class GetTestCase(BaseModel):
    id: int = Field(ge=1)
    input: str | None = None
    expected_output: str

class GetTestCasesByProblemIdResponse(BaseModel):
    sample_case: SampleCase
    remaining_cases: list[GetTestCase] = Field(default_factory=list)

'''-------- POST SCHEMAS ---------'''

class CreateTestCase(BaseModel):
    input: str | None = None
    expected_output: str

class CreateTestCasesRequest(BaseModel):
    test_cases: list[CreateTestCase] = Field(min_length=1, max_length=10)

class CreatedTestCases(BaseModel):
    id: int = Field(ge=1)
    problem_id: int = Field(ge=1)
    input: str | None
    expected_output: str

class CreateTestCasesResponse(BaseModel):
    test_cases: list[CreatedTestCases]

'''-------- PUT SCHEMAS ---------'''

class UpdateTestCase(BaseModel):
    id: int = Field(ge=1)
    input: str | None = None
    expected_output: str

class UpdateTestCaseRequest(BaseModel):
    test_cases: list[UpdateTestCase] = Field(min_length=1, max_length=10)

class UpdateTestCaseResponse(BaseModel):
    test_cases: list[UpdateTestCase] 

'''-------- DELETE SCHEMAS ---------'''

class DeleteTestCasesRequest(BaseModel):
    ids: list[int] = Field(..., min_length=1)

    @field_validator("ids", mode="before")
    @classmethod
    def prevent_duplicate_ids(cls, v):
        if isinstance(v, (list, tuple)):
            return list(
                dict.fromkeys(v) # Torna valores únicos
            ) # Converte em uma lista só com as chaves
            
        return v

class DeleteTestCasesResponse(BaseModel):
    ids: list[int] = Field(..., min_length=1)
