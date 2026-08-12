from typing import Annotated

from fastapi import APIRouter, Body, Depends, Path

from .schemas import CreateListRequest, CreateListResponse, ListResponse, ListDetailResponse, ListPatchResponse, DeleteListsRequest
from .service import ListService

router = APIRouter(tags=["Lists"])

@router.post("/lists", status_code=201, response_model=CreateListResponse,)
async def create_list(
    payload: Annotated[CreateListRequest, Body()],
    service: Annotated[ListService, Depends()]
):
    return await service.create(payload)


@router.get("/lists", response_model= list[ListResponse])
async def get_lists(
    service: Annotated[ListService, Depends()],
):
    return await service.get_all()

@router.get("/lists/{list_id}", response_model= ListDetailResponse)
async def get_list(
    list_id: Annotated[int, Path()],
    service: Annotated[ListService, Depends()]
):
    return await service.get_by_id(list_id)


@router.patch("/lists/{list_id}", response_model = ListResponse)
async def patch_list(
    list_id: Annotated[int, Path()],
    body: Annotated[ListPatchResponse, Body()],
    service: Annotated[ListService, Depends()]
):
    return await service.patch_list(list_id, body)

@router.delete("/lists")
async def delete_lists(
    body: Annotated[DeleteListsRequest, Body()],
    service: Annotated[ListService, Depends()]
):
    return await service.delete_lists(body.ids)