from typing import Literal

from pydantic import BaseModel


class SubmitRequest(BaseModel):
    problem_id: int 
    attempt: str

class SubmitResponse(BaseModel):
    category: Literal["runtime_error", "incorrect_resolution", "approved"]
    exception: str | None
    explanation: str
    lines: list[int] | None
    suggestion: str