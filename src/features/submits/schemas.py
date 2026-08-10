from typing import Literal

from pydantic import BaseModel, Field


class SubmitRequest(BaseModel):
    problem_id: int = Field(ge=1)
    attempt: str




class FailedCase(BaseModel):
    input: str | None
    expected_output: str
    actual_output: str | None

class AIReviewRejectedCase(BaseModel):
    category: list[
        Literal[
            "runtime_error", 
            "incorrect_resolution"
            ]
        ] | None = Field(default=None, min_length=0, max_length=2)
    exception: str | None
    explanation: str | None
    lines: list[int] | None
    suggestion: str | None

class AIReviewApprovedCase(BaseModel):
    explanation: str | None
    suggestion: str | None

class SubmitResponse(BaseModel):
    status: Literal["rejected", "approved"]
    failed_case: FailedCase | None = None
    ai_review: AIReviewRejectedCase | AIReviewApprovedCase | None = None
