from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .core.database import close_db_connection, connect_db
from .core.settings import settings
from .features.ai.router import router as ai_routes
from .features.list_problems.router import router as list_problems_routes
from .features.lists.router import router as list_routes
from .features.problems.router import router as problem_routes
from .features.submits.router import router as submit_routes
from .features.test_cases.router import router as test_cases_routes


@asynccontextmanager
async def lifespan(app):
    await connect_db() # roda ao iniciar o servidor
    yield
    await close_db_connection() # roda ao encerrar  

app = FastAPI(
    title="kez.ia — API Documentation", 
    version="0.1.0", 
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ai_routes)
app.include_router(list_routes)
app.include_router(problem_routes)
app.include_router(submit_routes)
app.include_router(list_problems_routes)
app.include_router(test_cases_routes)
