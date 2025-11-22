import io
import json
import uuid
from datetime import datetime, timezone

import openpyxl
import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def create_test_workbook():
    """Create an in‑memory Excel file matching the expected schema."""
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "questions"
    ws.append([
        "title",
        "complexity",
        "type",
        "options",
        "correct_answers",
        "max_score",
        "tags",
    ])
    ws.append([
        "What is 2+2?",
        "easy",
        "single_choice",
        json.dumps(["1", "2", "3", "4"]),
        json.dumps(["4"]),
        1,
        "math,arithmetic",
    ])
    ws.append([
        "Select prime numbers",
        "medium",
        "multi_choice",
        json.dumps(["2", "4", "5", "6"]),
        json.dumps(["2", "5"]),
        2,
        "math",
    ])
    ws.append([
        "Explain polymorphism",
        "hard",
        "text",
        None,
        None,
        5,
        "programming,oop",
    ])
    stream = io.BytesIO()
    wb.save(stream)
    stream.seek(0)
    return stream


def test_preview_questions_success():
    """POST /admin/preview-questions/ should return parsed JSON."""
    file_stream = create_test_workbook()
    files = {
        "file": (
            "test.xlsx",
            file_stream,
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
    }
    response = client.post("/admin/preview-questions/", files=files)
    assert response.status_code == 200
    data = response.json()
    assert "questions" in data
    assert data["count"] == 3
    first = data["questions"][0]
    assert first["title"] == "What is 2+2?"
    assert first["type"] == "single_choice"
    assert first["options"] == ["1", "2", "3", "4"]
    assert first["correct_answers"] == ["4"]
    assert first["max_score"] == 1
    assert "math" in first["tags"]
