# OnlineExamSystem Backend

This is a minimal FastAPI backend scaffold with SQLAlchemy models and PostgreSQL configuration.

## Setup

1. Create and export your PostgreSQL URL in PowerShell:

```powershell
$env:DATABASE_URL = "postgresql+psycopg2://<user>:<password>@localhost:5432/<database>"
```

2. Install dependencies (already installed if you ran the provided command):

```powershell
pip install -r requirements.txt
```

## Run

```powershell
uvicorn app.main:app --reload
```

- On startup, the app creates all database tables defined in `app/models.py`.
- Root endpoint: `GET /` returns `{ "message": "Hello" }`.

## Project Structure

```
backend/
  app/
    __init__.py
    main.py
    database.py
    models.py
  README.md
  requirements.txt
```
