from contextlib import asynccontextmanager

from fastapi import FastAPI

from .core.database import close_db_connection, connect_db
from .features.ai.router import router as ai_routes
from .features.lists.router import router as list_routes
from .features.problems.router import router as problem_routes
from .features.submits.router import router as submit_routes


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

app.include_router(ai_routes)
app.include_router(list_routes)
app.include_router(problem_routes)
app.include_router(submit_routes)
