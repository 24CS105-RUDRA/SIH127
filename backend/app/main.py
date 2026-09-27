from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, Response

from app.api import api_router
from app.core.config import settings
from app.db.database import init_db, close_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield
    await close_db()


app = FastAPI(
    title="ANPR Traffic Analytics API",
    description=(
        "City-Wide AI Engine for Multi-Camera ANPR Trajectory Tracking "
        "and Urban Traffic Analytics"
    ),
    version="1.0.0",
    lifespan=lifespan,
)

ALLOWED_METHODS = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
ALLOWED_HEADERS = "Accept, Authorization, Content-Type, Origin, X-Requested-With"


def _cors_headers(origin: str) -> dict:
    return {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Methods": ALLOWED_METHODS,
        "Access-Control-Allow-Headers": ALLOWED_HEADERS,
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Max-Age": "600",
    }


@app.middleware("http")
async def cors_middleware(request: Request, call_next):
    origin = request.headers.get("origin")
    allowed = origin in settings.ALLOWED_ORIGINS if origin else False

    # Answer preflight before routing so unmatched OPTIONS never 405/400.
    if request.method == "OPTIONS":
        if allowed:
            return Response(status_code=204, headers=_cors_headers(origin))
        return Response(status_code=403)

    response = await call_next(request)

    if allowed:
        response.headers.update(_cors_headers(origin))
    return response


app.include_router(api_router, prefix="/api/v1")


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "anpr-backend"}


@app.get("/")
async def root():
    return {
        "message": "ANPR Traffic Analytics API",
        "version": "1.0.0",
        "docs": "/docs",
    }
