from typing import Annotated

from fastapi import APIRouter, Body, Depends

from .schemas import (
    CreateListRequest,
    CreateListResponse,
    DeleteListsRequest,
    ListDetailResponse,
    ListId,
    ListPatchResponse,
    ListResponse,
)
from .service import ListService

router = APIRouter(tags=["Lists"])


@router.get("/lists", response_model= list[ListResponse])
async def get_lists(
    service: Annotated[ListService, Depends()],
):
    return await service.get_all()


@router.post("/lists", status_code=201, response_model=CreateListResponse,)
async def create_list(
    payload: Annotated[CreateListRequest, Body()],
    service: Annotated[ListService, Depends()]
):
    return await service.create(payload)


@router.get("/lists/{id}", response_model=ListDetailResponse)
async def get_list(
    id: ListId,
    service: Annotated[ListService, Depends()]
):
    return await service.get_by_id(id)


@router.patch("/lists/{id}", response_model=ListResponse)
async def patch_list(
    id: ListId,
    body: Annotated[ListPatchResponse, Body()],
    service: Annotated[ListService, Depends()]
):
    return await service.patch_list(id, body)


@router.delete("/lists")
async def delete_lists(
    body: Annotated[DeleteListsRequest, Body()],
    service: Annotated[ListService, Depends()]
):
    return await service.delete_lists(body.ids)
