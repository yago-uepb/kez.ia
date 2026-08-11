from pydantic import BaseModel, Field, field_validator


class CreateListRequest(BaseModel):
    name: str = Field(min_length=3, max_length=255)
    description: str | None = Field(default=None, min_length=3, max_length=255)
    is_hidden: bool = False

    @field_validator("name", mode="before")
    @classmethod
    def normalize_name(cls, v):
        if isinstance(v, str):
            return " ".join(v.split())
        return v

    @field_validator("description", mode="before")
    @classmethod
    def normalize_description(cls, v):
        if isinstance(v, str):
            cleaned = " ".join(v.split())
            return cleaned if cleaned else None
        return v

class CreateListResponse(BaseModel):
    id: int = Field(ge=1)
    name: str = Field(min_length=3, max_length=255)
    description: str | None = Field(default=None, min_length=3, max_length=255)
    is_hidden: bool = False
