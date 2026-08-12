from pydantic import BaseModel, Field


class ListProblemRequest(BaseModel):
    list_id: int = Field(ge=1)
    problem_id: int = Field(ge=1)
