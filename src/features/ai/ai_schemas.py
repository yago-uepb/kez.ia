from pydantic import BaseModel


class ReviewRequest(BaseModel):
    script_name: str

class ReviewResponse(BaseModel):
    category: str
    explanation: str
