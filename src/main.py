from contextlib import asynccontextmanager

from fastapi import FastAPI

from src.core.database import close_db_connection, connect_db
from src.features.examples.examples import router as example_routes

# from src.features.ai.ai_router import router as ai_routes
from src.features.submits.submit_router import router as submit_routes


@asynccontextmanager
async def lifespan(app):
    await connect_db() # roda ao iniciar o servidor
    yield
    await close_db_connection() # roda ao encerrar

app = FastAPI(
    title="Code Mentor AI — API Documentation", 
    version="0.1.0", 
    lifespan=lifespan
)

# app.include_router(ai_routes)
app.include_router(submit_routes)
app.include_router(example_routes)
