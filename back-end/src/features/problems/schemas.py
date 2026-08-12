from typing import Annotated

from fastapi import Path
from pydantic import BaseModel, Field, field_validator

PositiveInt = Annotated[int, Field(ge=1)]

ProblemId = Annotated[int, Path(ge=1)]
 
class TestCases(BaseModel):
    input: str | None = None # Não tem NOT NULL no banco, então pode não receber nada
    expected_output: str
 
 
class ProblemCreate(BaseModel):
    # Define os dados necessários para criar um problema.
    title: str = Field(min_length=3, max_length=255)
    description: str
    test_cases: list[TestCases] = Field(min_length=1, max_length=10)
 
    @field_validator("title", mode="before")
    @classmethod
    def normalize_title(cls, v):
        if isinstance(v, str):
            return " ".join(v.split())
        return v
 
 
class AddProblemsRequest(BaseModel): # Antes de criar
    # Define os dados recebidos no corpo da requisição.
    problems: list[ProblemCreate] = Field(..., min_length=1, max_length=30)
 
 
class ProblemResponse(BaseModel): # Depois de criar, já vem com ID
    # Representa um problema completo retornado pela API.
    id: int = Field(ge=1)
    title: str = Field(min_length=3, max_length=255)
    description: str
    input: str | None 
    expected_output: str
 
 
class AddProblemsResponse(BaseModel):
    # Define os dados enviados na resposta.
    list_id: int
    problems: list[ProblemResponse]
 
 
class ProblemPatchRequest(BaseModel):
    title: str | None = Field(default= None, min_length=3, max_length=255)
    description: str | None = None
    input: str | None = None
    expected_output : str | None = None
 
class DeleteProblemRequest(BaseModel):
    ids: list[int] = Field(..., min_length=1)
 
 
class GetRandomProblemsRequest(BaseModel):
    lists_ids: list[PositiveInt] | None = Field(default=None)
    excluded_problem_ids: list[PositiveInt] | None = Field(default=None)
    quantity: int = Field(default=1, ge=1, le=30)

class GetRandomProblemsResponse(BaseModel):
    problems: list[ProblemResponse]
