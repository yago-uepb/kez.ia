from typing import Annotated

from fastapi import APIRouter, Body, Depends, File, UploadFile

from src.shared.exceptions import BadRequestException, UnsupportedMediaTypeException

from .schemas import (
    ExtractQuestionsResponse,
    SuggestTestCasesRequest,
    SuggestTestCasesResponse,
)
from .service import AIService

router = APIRouter(prefix="/ai", tags=["Artificial Intelligence"])

MAX_DOCUMENT_SIZE_MB = 10

ALLOWED_DOCUMENTS_MIME_TYPES = (
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
)

@router.post("/documents/extract-questions", response_model=ExtractQuestionsResponse)
async def extract_questions(
    file: Annotated[UploadFile, File()],
    service: Annotated[AIService, Depends()],
):
    if file.content_type not in ALLOWED_DOCUMENTS_MIME_TYPES:
        raise UnsupportedMediaTypeException(
            detail=f"Tipo de arquivo não suportado: {file.content_type}",
        )

    content = await file.read()
    if len(content) > MAX_DOCUMENT_SIZE_MB * 1024 * 1024:
        raise BadRequestException(
            detail=f"Arquivo excede o limite de {MAX_DOCUMENT_SIZE_MB}MB",
        )

    return await service.extract_questions(content, file.content_type)

@router.post("/suggest-test-cases", response_model=SuggestTestCasesResponse)
async def suggest_test_cases(
    payload: Annotated[SuggestTestCasesRequest, Body()],
    service: Annotated[AIService, Depends()],
):
    return await service.suggest_test_cases(payload.questions)
