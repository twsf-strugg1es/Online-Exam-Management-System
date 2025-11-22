# Online Exam Management System

A web-based exam management system built with **FastAPI** (Python) and **React** (JavaScript). Administrators manage questions and exams, while students take exams with auto-save functionality and auto-grading for objective questions.

## Features

### Admin

- Import questions from Excel files
- Create and publish exams
- Manage students and view performance
- Grade text and image-based answers manually

### Student

- View and take available exams
- Auto-save progress and resume exams
- View results with detailed answer breakdown
- Manage profile and change password

## Tech Stack

- **Backend**: FastAPI, SQLAlchemy, PostgreSQL, JWT
- **Frontend**: React, React Router, Context API

## Prerequisites

- Python 3.8+ ([Download](https://www.python.org/downloads/))
- Node.js 14+ ([Download](https://nodejs.org/))
- Git (for cloning the repository)
- PostgreSQL 12+ ([Download](https://www.postgresql.org/download/))

## Setup

### Quick Reference - Commands Used

These are the exact commands that were used to run the project:

**Terminal 1 (Backend on Windows):** 

(d:\Downloads path in my case)

```powershell
cd d:\Downloads\Online-Exam-Management-System-main\backend
pip install -r requirements.txt
python create_admin.py
python -m uvicorn app.main:app --reload --port 8000
```

**Terminal 2 (Frontend on Windows):**

```powershell
cd d:\Downloads\Online-Exam-Management-System-main\frontend
npm install
npm start
```

---

### Detailed Setup Instructions

### Important: Start PostgreSQL First

1. **Installed** on your machine
2. **Running** (check Task Manager on Windows or use `pg_isready` command)
3. **Accessible** with username and password

If you haven't installed PostgreSQL yet, download it from [postgresql.org](https://www.postgresql.org/download/)

**Verify PostgreSQL is running:**

- **Windows**: Check Services (search for "Services") and find PostgreSQL
- **Linux/macOS**: Run `pg_isready` in terminal

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/Online-Exam-Management-System.git
cd Online-Exam-Management-System
```

### 2. Backend Setup

#### Step 1: Create `.env` file

In the `backend/` directory, create a `.env` file with:

```
DATABASE_URL=postgresql://postgres:password@localhost:5432/online_exam_system
SECRET_KEY=your-super-secret-key-change-this-in-production
```

**Replace:**

- `postgres` with your PostgreSQL username
- `password` with your PostgreSQL password
- `localhost` with your PostgreSQL host (if different)
- `5432` with your PostgreSQL port (if different)

**Note:** Make sure the database `online_exam_system` exists. If it doesn't, create it:

```sql
CREATE DATABASE online_exam_system;
```

Or use pgAdmin (PostgreSQL GUI tool) to create it.

#### Step 2: Install Dependencies

**Windows (PowerShell):**

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

**Linux/macOS:**

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

#### Step 3: Create Admin Account

```bash
python create_admin.py
```

**Output:**

```
Admin user created successfully!
Email: admin@example.com
Role: admin
Password: admin123
```

#### Step 4: Start Backend Server

**Windows:**

```powershell
python -m uvicorn app.main:app --reload --port 8000
```

**Linux/macOS:**

```bash
python -m uvicorn app.main:app --reload --port 8000
```

**API Documentation**: `http://localhost:8000/docs`

### 3. Frontend Setup

**In a new terminal, from the project root:**

```bash
cd frontend
npm install
npm start
```

Frontend runs at: `http://localhost:3000`

## Running Both Servers

Open **two separate terminals** from the project root directory:

**Terminal 1 - Backend:**

```bash
cd backend
# On Windows:
.\venv\Scripts\Activate.ps1
# On Linux/macOS:
source venv/bin/activate

python -m uvicorn app.main:app --reload --port 8000
```

**Terminal 2 - Frontend:**

```bash
cd frontend
npm start
```

Both servers will start and auto-reload on code changes. Open `http://localhost:3000` in your browser.

## Login Credentials

After setup completes, use these default credentials to log in:

- **Email**: `admin@example.com`
- **Password**: `admin123`
- **Role**: Admin

## Running Tests

From the `backend/` directory (with virtual environment activated):

```bash
python -m pytest tests/ -v
```

For coverage report:

```bash
python -m pytest tests/ -v --cov=app
```

## Project Structure

```
Online-Exam-Management-System/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── models.py
│   │   ├── crud.py
│   │   ├── schemas.py
│   │   ├── database.py
│   │   ├── security.py
│   │   └── routers/
│   │       ├── admin.py
│   │       ├── auth.py
│   │       ├── profile.py
│   │       └── student.py
│   ├── tests/
│   ├── create_admin.py
│   └── requirements.txt
│
└── frontend/
    ├── public/
    │   └── index.html
    ├── src/
    │   ├── pages/
    │   ├── components/
    │   ├── context/
    │   ├── styles/
    │   ├── App.js
    │   ├── index.js
    │   ├── api.js
    │   └── theme.js
    ├── package.json
    └── tailwind.config.js
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

## Troubleshooting

### Port already in use

**Problem**: `Address already in use` error

**Solution**: Change the port in the command:

```bash
python -m uvicorn app.main:app --reload --port 8001  # Use 8001 instead of 8000
```

Then update the frontend API URL in `frontend/src/api.js` accordingly.

### npm install fails

**Problem**: Dependencies installation errors

**Solution**:

```bash
cd frontend
rm -rf node_modules package-lock.json  # Windows: del node_modules, del package-lock.json
npm install
```

### Virtual environment issues

**Problem**: `python: command not found` or `python -m venv` fails

**Solution**:

- Use `python3` instead of `python` on Linux/macOS
- Ensure Python is added to PATH on Windows
- Try: `python --version` to verify installation
