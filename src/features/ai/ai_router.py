from fastapi import APIRouter

router = APIRouter(prefix="/ai", tags=["Artificial Intelligence"])

@router.post("/read-pdf")
def read_pdf():
    return { "pending": True }