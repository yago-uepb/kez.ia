from pydantic import BaseModel, Field


class CreateListRequest(BaseModel):
    name: str = Field(min_length=3, max_length=255)
    is_hidden: bool

class CreateListResponse(BaseModel):
    success: bool = True
    id: int = Field(ge=1)
