from typing import Annotated

from fastapi import Path
from pydantic import BaseModel, Field, field_validator

from src.features.problems.schemas import ProblemResponse

ListId = Annotated[int, Path(ge=1)]

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

class ListResponse(BaseModel):
    id: int = Field(ge=1)
    name: str = Field(min_length=3, max_length=255) 
    description: str | None = Field(default=None, max_length=255)
    is_hidden: bool = False

class ListDetailResponse(ListResponse):
    problems: list[ProblemResponse] = []

class ListPatchResponse(BaseModel):
    name: str | None = Field(default=None, min_length = 3, max_length=255)
    description: str | None = Field(default=None, max_length=255)
    is_hidden: bool | None = None

    @field_validator("name", mode="before")
    @classmethod
    def normalize_name(cls, v):
        if isinstance(v, str):
            return " ".join(v.split())
            return v



class DeleteListsRequest(BaseModel):
    ids: list[int] = Field(..., min_length=1) 