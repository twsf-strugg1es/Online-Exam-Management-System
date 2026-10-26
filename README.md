# Online Exam Management System

[![CI](https://github.com/twsf-strugg1es/Online-Exam-Management-System/actions/workflows/ci.yml/badge.svg)](https://github.com/twsf-strugg1es/Online-Exam-Management-System/actions/workflows/ci.yml)

A web-based exam management system built with **FastAPI** (Python) and **React** (JavaScript). Organizations (schools, coaching centers, companies) manage their own questions and exams, while students take exams with auto-save functionality and auto-grading for objective questions.

**Docs:** [PRD](docs/01-PRD.md) · [TRD](docs/02-TRD.md) · [App flow](docs/03-APP-FLOW.md) · [UI/UX brief](docs/04-UI-UX-BRIEF.md) · [Backend schema](docs/05-BACKEND-SCHEMA.md) · [Implementation plan](docs/06-IMPLEMENTATION-PLAN.md) · [Guide for coding agents](docs/AGENTS.md)

## Features

### Organizations

- Any number of organizations, each with its own questions, exams, students and results
- Roles per organization: **owner**, **admin**, **examiner** (questions, exams, grading) and **candidate**
- One account can belong to several organizations, e.g. a student at two coaching centers
- **Groups** (batches, classes, hiring rounds) decide which candidates see which exams
- Students join with an organization or group **join code**

### Exam integrity

A browser can't stop a student from switching apps, but it can notice, hide the questions, and keep a record. Each exam chooses which protections to use:

- **Fullscreen required**: questions are hidden whenever the student leaves fullscreen
- **Leaving the exam is recorded**: switching tab, window or app, and exiting fullscreen, count as violations
- **Automatic submission** after a chosen number of violations, enforced by the server
- **Copy, paste and right-click blocked**, along with print, save and developer-tool shortcuts; attempts are flagged
- **Shuffled per student**: question and option order differ for every student and stay stable on reload
- **Integrity report** per attempt: risk level (clean, review, high), time spent away, and a timeline of every event
- **One attempt per exam**, with the timer starting only when the student presses Start

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
alembic upgrade head
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

Copy the example and fill in your values:

```bash
cp backend/.env.example backend/.env
```

It contains `DATABASE_URL`, `SECRET_KEY` (generate one with `python -c "import secrets; print(secrets.token_urlsafe(48))"`) and an optional `CORS_ORIGINS`. For a different API address on the frontend, copy `frontend/.env.example` to `frontend/.env`.

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

#### Step 3: Create the Database Tables

The schema is managed with [Alembic](https://alembic.sqlalchemy.org/) migrations. Run this after installing, and again whenever you pull new code:

```bash
alembic upgrade head
```

**Upgrading an existing database from before organizations existed?** The same command works. It keeps all your data and moves it into a "Default Organization": admins become its owners, students its candidates, and each SSC/HSC/Admission value becomes a group. Back up your database first.

#### Step 4: Create an Organization and Its Owner

```bash
python create_admin.py
```

**Output:**

```
Organization created successfully!
Organization: Demo Organization
Join code for students: K7M2QX9P
Owner: admin@example.com
Password: Xq7v2mPz9LkA4s  (random; printed once, so note it down)
```

Optionally pass your own details: `python create_admin.py you@example.com yourpassword "Your School"`. New organizations can also sign up from the app.

#### Step 5: Start Backend Server

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

The frontend calls the API at `http://localhost:8000` by default. To use another address, set `REACT_APP_API_URL` (for example in `frontend/.env`) before `npm start` or `npm run build`.

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

## Running with Docker (optional)

Docker needs a few GB of RAM. On a low-end PC, use the native setup above instead; CI builds and checks the Docker images on every push.

```bash
SECRET_KEY=$(python -c "import secrets; print(secrets.token_urlsafe(48))") docker compose up --build
docker compose exec api python create_admin.py   # demo organization + owner
```

- Web: `http://localhost:3000` · API: `http://localhost:8000` · Health: `http://localhost:8000/health`
- The API container runs `alembic upgrade head` before it starts.
- Database data lives in the `db-data` volume. `docker compose down -v` deletes it.

## Login Credentials

After setup completes, use these default credentials to log in:

- **Email**: `admin@example.com`
- **Password**: the random one `create_admin.py` printed (or pass your own: `python create_admin.py you@example.com yourpassword`)
- **Role**: Owner of "Demo Organization"

Students sign up on their own and enter the join code printed by `create_admin.py` (or the code of one of your groups).

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


Lastly, thanks to vibe coding. :)
