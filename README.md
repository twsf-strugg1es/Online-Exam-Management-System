# Online Exam Management System

A web-based exam management system built with **FastAPI** (Python) and **React** (JavaScript). Administrators manage questions and exams, while students take exams with auto-save functionality and auto-grading for objective questions.

## Features

### Admin

- Import questions from Excel files
- Create and publish exams
- Manage students and view performance
- Grade text and image-based answers manually
- Default admin email set - admin@example.com
  password- adminpass

### Student

- View and take available exams
- Auto-save progress and resume exams
- View results with detailed answer breakdown
- Manage profile and change password

## Tech Stack

- **Backend**: FastAPI, SQLAlchemy, PostgreSQL, JWT
- **Frontend**: React, React Router, Context API

## Prerequisites

- Python 3.8+
- Node.js 14+
- PostgreSQL 12+

## Setup

### Backend

**Windows (PowerShell):**
```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
$env:DATABASE_URL = "postgresql+psycopg2://user:password@localhost:5432/online_exam_system"
python create_admin.py
cd .. ; cd backend ; uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Linux/macOS:**
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
export DATABASE_URL="postgresql+psycopg2://user:password@localhost:5432/online_exam_system"
python create_admin.py
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Note**: Replace `user` and `password` with your PostgreSQL credentials.

**API Documentation**: `http://localhost:8000/docs`

### Frontend

**In a new terminal:**

```bash
cd frontend
npm install
npm start
```

Frontend runs at: `http://localhost:3000`

**Note**: Update `src/api.js` with your backend URL if not using localhost:8000

## Running Both Servers (Quick Start)

1. **Terminal 1 - Backend:**
   ```powershell
   cd backend
   .\venv\Scripts\Activate.ps1
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

2. **Terminal 2 - Frontend:**
   ```bash
   cd frontend
   npm start
   ```

Both servers will start and auto-reload on code changes.

## Running Tests

```bash
cd backend
python -m pytest tests/ -v
```

## Project Structure

```
OnlineExamSystem/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── models.py
│   │   ├── crud.py
│   │   ├── schemas.py
│   │   └── routers/
│   ├── tests/
│   ├── create_admin.py
│   └── requirements.txt
│
└── frontend/
    ├── src/
    │   ├── pages/
    │   ├── components/
    │   ├── context/
    │   └── api.js
    └── package.json
```

## Excel Import Format

**Required Columns:**

- `title` - Question title
- `complexity` - easy, medium, or hard
- `type` - single_choice, multi_choice, text, or image_upload
- `options` - JSON array for choice questions
- `correct_answers` - Answer(s)
- `max_score` - Points (default: 1)

## Auto-Grading

- **Single-Choice**: Exact match required
- **Multi-Choice**: All correct answers must be selected
- **Text/Image**: Manual grading by admin
