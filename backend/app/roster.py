"""Reading a student list (CSV or XLSX) for bulk import.

One row per student: an email column (required) and a name column (optional). Header names
are matched loosely ("Email", "E-mail address", "Full name", "Student name"...).
"""
import csv
import io

import openpyxl
from email_validator import EmailNotValidError, validate_email

MAX_ROWS = 1000
MAX_BYTES = 2 * 1024 * 1024
EMAIL_HEADERS = {"email", "e-mail", "email address", "e-mail address", "mail"}
NAME_HEADERS = {"name", "full name", "full_name", "student name", "student", "fullname"}

# File-level problems (shown to staff, translated on the client)
UNREADABLE = "Couldn't read the file. Upload a .csv or .xlsx file."
NOT_UTF8 = "Save the CSV as \"CSV UTF-8\" and upload it again."
NO_EMAIL_COLUMN = "The first row needs an \"email\" column heading."
TOO_MANY_ROWS = "Import at most 1000 students at a time."
TOO_LARGE = "The file is larger than 2 MB."
EMPTY = "The file has no students in it."


def _cells(filename: str, content: bytes) -> list[list[str]]:
    name = filename.lower()
    if name.endswith(".csv"):
        try:
            text = content.decode("utf-8-sig")
        except UnicodeDecodeError:
            raise ValueError(NOT_UTF8)
        return [[c.strip() for c in row] for row in csv.reader(io.StringIO(text))]
    if name.endswith((".xlsx", ".xlsm")):
        try:
            wb = openpyxl.load_workbook(io.BytesIO(content), read_only=True, data_only=True)
        except Exception:
            raise ValueError(UNREADABLE)
        ws = wb.worksheets[0]
        return [["" if c is None else str(c).strip() for c in row] for row in ws.iter_rows(values_only=True)]
    raise ValueError(UNREADABLE)


def read_rows(filename: str, content: bytes) -> list[tuple[int, str, str]]:
    """(row number as the spreadsheet shows it, raw email, name) for every non-empty row."""
    if len(content) > MAX_BYTES:
        raise ValueError(TOO_LARGE)
    rows = _cells(filename or "", content)
    # The header is the first non-empty row
    start = next((i for i, row in enumerate(rows) if any(row)), None)
    if start is None:
        raise ValueError(EMPTY)
    header = [h.strip().lower() for h in rows[start]]
    email_col = next((i for i, h in enumerate(header) if h in EMAIL_HEADERS), None)
    if email_col is None:
        raise ValueError(NO_EMAIL_COLUMN)
    name_col = next((i for i, h in enumerate(header) if h in NAME_HEADERS), None)

    out = []
    for i, row in enumerate(rows[start + 1:], start=start + 2):
        if not any(row):
            continue
        email = row[email_col] if email_col < len(row) else ""
        name = row[name_col] if name_col is not None and name_col < len(row) else ""
        out.append((i, email, name[:120]))
    if not out:
        raise ValueError(EMPTY)
    if len(out) > MAX_ROWS:
        raise ValueError(TOO_MANY_ROWS)
    return out


def normalize_email(raw: str) -> str | None:
    """The address in a canonical form (lower case), or None when it isn't a valid email."""
    try:
        return validate_email(raw.strip(), check_deliverability=False).normalized.lower()
    except EmailNotValidError:
        return None
