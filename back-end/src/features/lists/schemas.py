from pydantic import BaseModel, Field


class CreateListRequest(BaseModel):
    name: str = Field(min_length=3, max_length=255)
    description: str | None = Field(default=None, min_length=3, max_length=255)
    is_hidden: bool = False

class CreateListResponse(BaseModel):
    id: int = Field(ge=1)
    name: str = Field(min_length=3, max_length=255)
    description: str | None = Field(default=None, min_length=3, max_length=255)
    is_hidden: bool = False
