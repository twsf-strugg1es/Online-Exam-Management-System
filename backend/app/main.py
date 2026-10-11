import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import models  # noqa: F401  # ensure models are imported so metadata has tables
from .routers import admin, auth, organizations, student, profile

# The database schema is managed by Alembic migrations: run `alembic upgrade head`.
app = FastAPI()

# Comma-separated list of frontend origins allowed to call the API
allowed_origins = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173"
    ).split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,
)


@app.get("/")
async def read_root():
    return {"message": "Hello"}


# Include routers AFTER middleware is configured
app.include_router(admin.router)
app.include_router(auth.router)
app.include_router(organizations.router)
app.include_router(student.router)
app.include_router(profile.router)
