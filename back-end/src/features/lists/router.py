from typing import Annotated

from fastapi import APIRouter, Body, Depends

from .schemas import CreateListRequest, CreateListResponse
from .service import ListService

router = APIRouter(tags=["Lists"])

@router.post("/lists", status_code=201, response_model=CreateListResponse,)
async def create_list(
    payload: Annotated[CreateListRequest, Body()],
    service: Annotated[ListService, Depends()]
):
    return await service.create(
        payload.name, 
        payload.description, 
        payload.is_hidden
    )
