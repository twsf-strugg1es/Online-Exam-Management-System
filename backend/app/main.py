from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import Base, engine, SessionLocal
from . import models, crud, schemas  # noqa: F401  # ensure models are imported so metadata has tables
from .routers import admin, auth, student, profile

app = FastAPI()

# Configure CORS BEFORE adding routers - use more explicit configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,
)


@app.on_event("startup")
def on_startup() -> None:
    # Create all database tables at startup
    Base.metadata.create_all(bind=engine)
    
    # Note: Initial users should be created via migration or admin commands
    # because the database schema must be updated first with the new fields
    db = SessionLocal()
    try:
        # Skip automatic user creation - users should be created manually
        # after database schema is updated
        pass
    finally:
        db.close()


@app.get("/")
async def read_root():
    return {"message": "Hello"}


# Include routers AFTER middleware is configured
app.include_router(admin.router)
app.include_router(auth.router)
app.include_router(student.router)
app.include_router(profile.router)
