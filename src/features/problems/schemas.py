from pydantic import BaseModel, Field


class TestCases(BaseModel):
    input: str | None = None # Não tem NOT NULL no banco, então pode não receber nada
    expected_output: str


class ProblemCreate(BaseModel):
    # Define os dados necessários para criar um problema.
    title: str = Field(min_length=3, max_length=255)
    description: str
    test_cases: list[TestCases] = Field(min_length=1, max_length=10)


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
