# Online Exam Management System

A comprehensive web-based exam management system built with FastAPI (Python) and React (JavaScript). The system enables administrators to manage questions and exams, while students can take exams with automatic progress saving and resume functionality. Objective questions are auto-graded with immediate score calculation.

## Features

### Admin Features
- **Question Bank Management**: Import questions from Excel files with validation
- **Exam Creation**: Create exams by selecting questions and setting time windows
- **Exam Publishing**: Publish/unpublish exams for student access
- **Student Management**: View and manage student accounts
- **Result Evaluation**: Manual evaluation of text and image-based answers
- **Dashboard**: Overview of all exams, questions, and student performance

### Student Features
- **Available Exams**: View exams filtered by exam candidate type (SSC, HSC, Admission)
- **Exam Participation**: Take exams with auto-save and timer functionality
- **Resume Capability**: Resume interrupted exams before expiry
- **Auto-Grading**: Immediate score calculation for objective questions
- **Result Review**: View results with detailed answer breakdown
- **Profile Management**: Update personal information and change password

## Technology Stack

### Backend
- **FastAPI** - Modern Python web framework
- **SQLAlchemy** - ORM for database operations
- **PostgreSQL** - Relational database
- **JWT** - Authentication and authorization
- **pytest** - Comprehensive unit testing

### Frontend
- **React** - UI library
- **React Router** - Client-side routing
- **Context API** - State management
- **Inline CSS** - Styling (no external CSS framework dependencies)

## Prerequisites

- **Node.js** (v14 or higher)
- **npm** or **yarn**
- **Python** (v3.8 or higher)
- **PostgreSQL** (v12 or higher)
- **Git**

## Installation & Setup

### Environment Configuration

Before starting, understand your deployment scenario:

- **Local Development:** Backend and frontend on same machine (localhost)
- **Network Development:** Backend on one machine, frontend on another (use machine IP)
- **Cloud/Production:** Backend and frontend on cloud servers (use domain names)

All instructions below use placeholders like `<backend-url>` - replace these with your actual URLs.

### Backend Setup

#### 1. Navigate to Backend Directory
```bash
cd backend
```

#### 2. Create and Activate Virtual Environment
```bash
# Windows (PowerShell)
python -m venv venv
.\venv\Scripts\Activate.ps1

# macOS/Linux
python3 -m venv venv
source venv/bin/activate
```

#### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

#### 4. Database Setup

**Create PostgreSQL Database:**
```sql
CREATE DATABASE online_exam_system;
```

**Set Environment Variables:**
```powershell
# Windows (PowerShell)
$env:DATABASE_URL = "postgresql+psycopg2://username:password@localhost:<****>/online_exam_system"

# macOS/Linux
export DATABASE_URL="postgresql+psycopg2://username:password@localhost:<****>/online_exam_system"
```

**Replace `username` and `password` with your PostgreSQL credentials.**

#### 5. Create Admin User
```bash
python create_admin.py
```

#### 6. Run Backend Server
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

*Note: Replace `8000` with a different port if it's already in use on your machine.*

**API will be available at:**
- Local: `http://localhost:<port>`
- Network: `http://<your-machine-ip>:<port>`

Example (if using port 8000):
- Local: `http://localhost:8000`
- Network: `http://192.168.1.100:8000`

**API Documentation:**
- Swagger UI: `http://<backend-url>/docs`
- ReDoc: `http://<backend-url>/redoc`

*Replace `<backend-url>` with your actual backend address and port*

### Frontend Setup

#### 1. Navigate to Frontend Directory
```bash
cd frontend
```

#### 2. Install Dependencies
```bash
npm install
```

#### 3. Configure Backend URL (Important)
Edit `src/api.js` and update the API base URL to match your backend configuration:
```javascript
const api = axios.create({
  baseURL: 'http://<backend-url>:<port>',  // Replace with your backend address and port
  withCredentials: true,
});
```

**Configuration Examples:**

*For local development (default ports):*
```javascript
baseURL: 'http://localhost:8000', 
```

*For development with custom port:*
```javascript
baseURL: 'http://localhost:9000',  // if using port 9000
```

*For network development:*
```javascript
baseURL: 'http://192.168.1.100:8000',  // your backend machine IP
```

*For production:*
```javascript
baseURL: 'https://api.example.com',  // your domain
```

#### 4. Run Frontend Development Server
```bash
npm start
```

Frontend will open automatically at: `http://localhost:3000` (for local development)

For deployed frontend, access via your server's URL.

## Running Tests

```bash
cd backend

# Run all tests
python -m pytest tests/ -v

# Run specific test file
python -m pytest tests/test_excel_parsing.py -v
python -m pytest tests/test_auto_grading.py -v

# Run with coverage report
python -m pytest tests/ --cov=app --cov-report=term-missing
```

**Test Results:**
- ✅ 30 tests passing (100% success rate)
- 18 Excel parsing validation tests
- 12 Auto-grading tests
- Execution time: ~0.38 seconds

## Usage Guide

### Admin Workflow

1. **Login** - Navigate to your frontend URL and login with admin credentials
2. **Upload Questions** - Go to Questions Management, upload Excel file, preview and confirm
3. **Create Exam** - Select questions, set time window, target candidates, then publish
4. **Manage Students** - View registered students and their exam performance
5. **Evaluate Results** - Review and grade text/image questions

### Student Workflow

1. **Sign Up** - Click "Create Account" and fill in details (email, name, gender, exam candidate type)
2. **Login** - Enter credentials
3. **Take Exam** - View available exams, click "Start Exam", answer with auto-save
4. **Resume Exam** - If disconnected, click "Resume" to continue from where you left off
5. **View Results** - See total score and detailed answer breakdown

## Sample Excel File

A sample Excel file (`sample_questions.xlsx`) is included in the repository root for testing question import.

**Required Excel Columns:**
- `title` - Question title (required)
- `description` - Question description (optional)
- `complexity` - easy, medium, or hard (required)
- `type` - single_choice, multi_choice, text, or image_upload (required)
- `options` - JSON array for choice questions (required for single/multi choice)
- `correct_answers` - Single value or JSON array (required for single/multi choice)
- `max_score` - Points for question (default: 1)
- `tags` - Comma-separated tags (optional)

**Example:**
```
title: What is the capital of France?
description: A basic geography question
complexity: easy
type: single_choice
options: ["Paris", "London", "Berlin", "Madrid"]
correct_answers: Paris
max_score: 1
tags: geography, world
```

## Project Structure

```
OnlineExamSystem/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI entry point
│   │   ├── models.py            # Database models
│   │   ├── schemas.py           # Request/response schemas
│   │   ├── crud.py              # Database operations
│   │   ├── database.py          # Database configuration
│   │   ├── security.py          # Authentication
│   │   └── routers/
│   │       ├── auth.py          # Auth endpoints
│   │       ├── admin.py         # Admin endpoints
│   │       ├── student.py       # Student endpoints
│   │       └── profile.py       # Profile endpoints
│   ├── tests/
│   │   ├── conftest.py          # Pytest configuration
│   │   ├── test_excel_parsing.py # Excel validation tests
│   │   └── test_auto_grading.py  # Auto-grading tests
│   └── requirements.txt         # Python dependencies
│
└── frontend/
    ├── public/
    ├── src/
    │   ├── index.js
    │   ├── App.js
    │   ├── api.js
    │   ├── pages/               # Page components
    │   ├── components/          # Reusable components
    │   └── context/             # Auth context
    └── package.json
```

## Auto-Grading Logic

**Single-Choice Questions:**
- Student answer must exactly match the stored correct_answer
- If correct: award max_score points
- If incorrect: award 0 points

**Multi-Choice Questions:**
- Student must select ALL correct answers (no more, no less)
- Answers compared as sorted arrays
- If all match: award max_score points
- Partial correct answers: award 0 points

**Text/Image Questions:**
- Not auto-graded
- Marked as pending for admin manual evaluation
- Admin can award custom score and add comments

## Database Models

- **User**: Student and admin accounts with roles
- **Question**: Question bank with types, options, and correct answers
- **Exam**: Exams with time windows and target candidates
- **ExamAttempt**: Student exam attempts with scores
- **Answer**: Student answers to exam questions
- **Evaluation**: Admin evaluations of student answers

## Configuration Reference

### Backend Configuration

```bash
# Environment variable for database
DATABASE_URL=postgresql+psycopg2://username:password@host:5432/database_name

# Backend command
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 # if using port 8000
```

### Frontend Configuration

**File:** `src/api.js`
```javascript
const api = axios.create({
  baseURL: 'http://<backend-url>:8000',
  withCredentials: true,
});
```

### Common URLs by Environment

| Environment | Backend URL | Frontend URL |
|---|---|---|
| Local Development | `http://localhost:8000` | `http://localhost:3000` |
| Same Network | `http://<machine-ip>:8000` | `http://<machine-ip>:3000` |
| Cloud Deployment | `https://api.example.com` | `https://app.example.com` |

**Note:**
- Port numbers `8000` and `3000` are defaults and can be changed
- For production, you typically use standard ports (80 for HTTP, 443 for HTTPS)
- Ports must be available on your machine (check if another app is using them)
- Update both backend command and frontend `src/api.js` if you change ports

## Security

- JWT tokens for stateless authentication
- Password hashing with bcrypt
- Role-based access control
- CORS configured for development
- Environment variables for sensitive data

## Support

For issues or questions, please refer to the API documentation at `http://<backend-url>/docs` (replace with your actual backend URL)
