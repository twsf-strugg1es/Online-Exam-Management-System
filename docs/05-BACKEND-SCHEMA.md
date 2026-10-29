# 5. Backend Schema: Fairpaper

Purpose: define stored data, relationships, and access rules.
Status: living document · Last updated 2026-10-12 · Source of truth: `backend/app/models.py` and `backend/migrations/versions/`. Database: PostgreSQL. All primary keys are UUID v4 (`id`, generated in the app).

## Entities

| Entity | Table | Represents |
|---|---|---|
| Organization | `organizations` | A tenant: school, coaching center or company |
| User | `users` | A person's login account (global, across organizations) |
| Membership | `memberships` | A user's role inside one organization |
| Group | `groups` | A batch/class/hiring round inside an organization |
| Question | `questions` | One item in an organization's question bank |
| Exam | `exams` | A scheduled test made of questions, for some or all candidates |
| ExamAttempt | `exam_attempts` | One candidate's sitting of one exam |
| Answer | `answers` | A candidate's response to one question in an attempt |
| Evaluation | `evaluations` | A grader's verdict on one answer |
| IntegrityEvent | `integrity_events` | Something the exam page noticed during an attempt |
| (join) | `group_members` | Membership ↔ Group |
| (join) | `exam_questions` | Exam ↔ Question |
| (join) | `exam_groups` | Exam ↔ Group (no rows = open to all candidates) |

## Tables

Types: `uuid`, `text` (SQLAlchemy `String`), `int`, `float`, `bool`, `timestamptz`, `date`, `json`.

### organizations
| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| id | uuid | ✓ | uuid4 | PK |
| name | text | ✓ | | 2–120 chars (API) |
| join_code | text | ✓ | 8 random chars from `ABCDEFGHJKMNPQRSTUVWXYZ23456789` | **unique** |
| created_at | timestamptz | ✓ | now | |
| country | varchar(2) | | null | ISO 3166-1 alpha-2, stored upper case |
| default_language | text | ✓ | `en` | One of `models.LANGUAGES` (`en`, `bn`); members without their own language get it |
| timezone | text | ✓ | `UTC` | IANA name, e.g. `Asia/Dhaka`; checked against `zoneinfo`. Exam windows are shown in it. Org signup sends the browser's zone (unknown zones fall back to `UTC`) |
| currency | varchar(3) | | null | ISO 4217, stored upper case; for plans and invoices later |

*(planned)* `data_region` (e.g. `ap`, `eu`), task 8.10.

### users
| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| id | uuid | ✓ | uuid4 | PK |
| email | text | ✓ | | **unique, indexed**; validated as an email. Looked up case-insensitively (`crud.get_user_by_email`), so sign-in and duplicate checks ignore case; imported addresses are stored lower-case |
| hashed_password | text | ✓ | | pbkdf2_sha256 (bcrypt accepted) |
| full_name | text | | | Shown to examiners |
| date_of_birth | date | | | |
| gender | text | | | `male` / `female` / `other` |
| language | text | | null (use the organization's) | One of `models.LANGUAGES`; set from Account |
| email_verified_at | timestamptz | | null | Set by the emailed confirmation link (or a completed password reset). Null shows a banner; nothing is blocked |
| *(planned)* phone | text | | | E.164, e.g. `+8801XXXXXXXXX` |

### memberships
| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| id | uuid | ✓ | uuid4 | PK |
| user_id | uuid | ✓ | | FK users, **cascade delete**, indexed |
| organization_id | uuid | ✓ | | FK organizations, **cascade delete**, indexed |
| role | text | ✓ | | `owner` · `admin` · `examiner` · `candidate` |
| created_at | timestamptz | ✓ | now | |
| | | | | **unique (user_id, organization_id)** `uq_membership_user_org` |

### groups
| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| id | uuid | ✓ | uuid4 | PK |
| organization_id | uuid | ✓ | | FK, cascade, indexed |
| name | text | ✓ | | 1–100 chars; **unique (organization_id, name)** `uq_group_org_name` |
| join_code | text | ✓ | random 8 chars | **unique** (shares the code space with organizations by convention; see validation) |
| created_at | timestamptz | ✓ | now | |

### questions
| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| id | uuid | ✓ | uuid4 | PK |
| organization_id | uuid | ✓ | | FK, cascade, indexed |
| title | text | ✓ | | Question text |
| description | text | | | Extra context |
| complexity | text | ✓ | | `easy` / `medium` / `hard` |
| type | text | ✓ | | `single_choice` · `multi_choice` · `text` · `image_upload` |
| options | json | | | List of option strings (choice types) |
| correct_answers | json | ✓ | | Value(s) from `options`; for text/image types, a reference answer or empty |
| max_score | int | ✓ | 1 | |
| tags | json | | `[]` | List of lowercase strings |
| archived_at | timestamptz | | null | Set instead of deleting once an exam or answer uses the question; archived questions leave the bank and can't be added to new exams (migration 0005) |
| *(planned)* default_time_limit_seconds | int | | null | Suggested limit when the question is used in a per-question exam (10–3600). Also an optional Excel column `time_limit_seconds` |

### exams
| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| id | uuid | ✓ | uuid4 | PK |
| organization_id | uuid | ✓ | | FK, cascade, indexed |
| title | text | ✓ | | |
| start_time / end_time | timestamptz | ✓ | | The window in which candidates may **start** |
| duration_minutes | int | ✓ | | Per-attempt length, capped by `end_time` |
| is_published | bool | ✓ | false | |
| published_by | uuid | | | FK users |
| shuffle_questions | bool | ✓ | true (server default) | |
| shuffle_options | bool | ✓ | true | |
| require_fullscreen | bool | ✓ | true | |
| block_copy_paste | bool | ✓ | true | |
| max_violations | int | | null | 1–100; null = never auto-submit |
| archived_at | timestamptz | | null | Set (and the exam unpublished) instead of deleting once anyone has started it; hidden from staff and candidate lists, results stay reachable (migration 0005) |
| *(planned)* timing_mode | text | ✓ | `exam` | `exam` (one duration, free navigation) or `per_question` (one question at a time, forward only) |
| *(planned)* default_question_seconds | int | | null | Per-question mode: limit used for questions without their own; null = no limit |

### exam_attempts
| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| id | uuid | ✓ | uuid4 | PK; also the shuffle seed |
| exam_id | uuid | ✓ | | FK exams (no cascade; deleted by the app) |
| student_id | uuid | ✓ | | FK users |
| start_time | timestamptz | ✓ | now | Server time when Start was pressed |
| end_time | timestamptz | | | null = in progress |
| score | float | | | Auto-graded + manually awarded |
| total_possible_score | float | | | Sum of `max_score` |
| submit_reason | text | | | `student` · `time_up` · `violations` |
| | | | | **unique (exam_id, student_id)** `uq_attempt_exam_student` |

### answers
| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| id | uuid | ✓ | uuid4 | PK |
| attempt_id | uuid | ✓ | | FK exam_attempts |
| question_id | uuid | ✓ | | FK questions |
| answer_data | json | ✓ | | Choice: the selected value(s). Text: string. Image: object with a `data:` URL preview (≤ 2 MB, client-enforced) |
| client_seq | bigint | | null | The exam page's save number (3.8). A save whose `client_seq` isn't greater than the stored one is ignored (`{"status": "stale"}`); saves without it always apply |

### evaluations
| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| id | uuid | ✓ | uuid4 | PK |
| answer_id | uuid | ✓ | | FK answers |
| evaluated_by | uuid | ✓ | | FK users (the grader) |
| is_correct | bool | | | null = not graded |
| score_awarded | float | | | |
| comment | text(100) | | | ≤ 100 chars |
| created_at / updated_at | timestamptz | | now | |

### integrity_events
| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| id | uuid | ✓ | uuid4 | PK |
| attempt_id | uuid | ✓ | | FK exam_attempts, **cascade**, indexed |
| type | text | ✓ | | Violations: `focus_lost`, `fullscreen_exit`. Flags: `copy_paste`, `context_menu`, `blocked_shortcut`, `multiple_screens`. Info: `focus_returned` (details: `away_ms`) |
| occurred_at | timestamptz | | | Client clock (informational only) |
| recorded_at | timestamptz | ✓ | server now | Authoritative ordering |
| details | json | | | ≤ 1000 chars serialized |

### password_reset_tokens
| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| id | uuid | ✓ | uuid4 | PK |
| user_id | uuid | ✓ | | FK users, **cascade**, indexed |
| token_hash | varchar(64) | ✓ | | SHA-256 of the emailed token, **unique**. The token itself is never stored |
| created_at | timestamptz | ✓ | now | |
| expires_at | timestamptz | ✓ | created + 30 min | |
| used_at | timestamptz | | | Set when used, and on every older link when a new one is requested or a reset succeeds |
| purpose | text | ✓ | `reset` | `reset` (30 min, "Forgot password?") or `invite` (7 days, accounts created by a bulk import or a staff invite; link `/invite/<token>`; an unused one means "invite pending"). Both are confirmed by `POST /password-reset/confirm` |

### waitlist_signups *(task 3.13)*
| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| id | uuid | ✓ | uuid4 | PK |
| email | text | ✓ | | Stored lower-cased and trimmed; **unique** |
| source | varchar(40) | | | Which call to action, e.g. `landing-close`, `waitlist-page`, or `?from=` on `/waitlist`; anything but letters, digits, `-` and `_` is dropped |
| locale | varchar(20) | | | Browser language (`navigator.language`), for the launch email language |
| created_at | timestamptz | ✓ | now | |
| notified_at | timestamptz | | | Set when the launch email is sent (never send twice) |
| unsubscribed_at | timestamptz | | | Set from the unsubscribe link; excluded from all sends |

Not organization-scoped: it belongs to Fairpaper itself. Read only by a platform-admin command (`python manage_waitlist.py count|export|send-launch`), never by an organization's staff; no API route returns an email from it.

API: `POST /waitlist` `{email, source?, locale?, website?}` (public, 20 per 10 min per IP) always answers "You're on the list…": for a new email, one already listed, or a filled `website` honeypot (nothing stored). Joining again after unsubscribing clears `unsubscribed_at`. `POST /waitlist/unsubscribe` `{token}` sets `unsubscribed_at`; the token is a signed JWT (`purpose: waitlist-unsubscribe`, no expiry, nothing stored), which `get_current_user` refuses as a sign-in token. The plan said `GET /waitlist/unsubscribe/{token}`; it's a POST from the page instead, because mail scanners open links in advance.

`send-launch` emails every row with no `notified_at` and no `unsubscribed_at`, sets `notified_at` after each successful send (so re-running only reaches the ones it missed), and refuses to run unless `EMAIL_BACKEND=smtp` (a console "send" would mark everyone as emailed). `--dry-run` lists the recipients.

### exam_questions *(join table)*
| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| marks | int | | null | **Built (4.2).** What the question is worth in this exam, 1–100; null = the question's `max_score`. Set through `question_marks` on create/edit (only values that differ from the bank are stored). Every exam-scoped read uses `crud.exam_marks(exam)`: auto-grading totals, the candidate's question payload, results, the grading view and `score_awarded` for written answers |
| position | int | | null | *(planned)* Teacher's order (shuffling still applies per candidate if on) |
| time_limit_seconds | int | | null | Per-question mode only; overrides the question's default; null = exam default, then no limit |

### attempt_question_timings *(planned, per-question mode only)*
| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| attempt_id | uuid | ✓ | | FK exam_attempts, cascade; PK with question_id |
| question_id | uuid | ✓ | | FK questions |
| opened_at | timestamptz | ✓ | server now | When the server showed this question |
| limit_seconds | int | | | Copied at open time, so later edits can't change a running question |
| closed_at | timestamptz | | | Set on Next, on time-out (lazily on the next request, or by the 3.1 job) or on submit; after it, the answer can't change |

Server rules: only one open question per attempt; answers to a question are accepted only while it is open and before `opened_at + limit_seconds + 5 s`; opening the next question closes the current one.

### Indexes
Existing: `users.email` (unique), the `organization_id` columns on memberships/groups/questions/exams, `memberships.user_id`, `integrity_events.attempt_id`, `exam_attempts (exam_id, student_id)` (unique constraint), unique join codes.
Added in `0007_indexes_unique_answers`: unique `answers (attempt_id, question_id)` (`uq_answer_attempt_question`, also the index for `attempt_id`; duplicates were removed first, keeping the evaluated one), `evaluations.answer_id`, `exam_attempts.student_id`, `exams (organization_id, start_time)`. `crud.save_answer` catches the unique violation when two saves race and updates the row that won.

## Relationships

| Relationship | Type | Foreign key | On delete |
|---|---|---|---|
| Organization → Membership | 1-to-many | memberships.organization_id | cascade |
| User → Membership | 1-to-many | memberships.user_id | cascade |
| Organization → Group / Question / Exam | 1-to-many | *.organization_id | cascade |
| Group ↔ Membership | many-to-many | group_members (group_id, membership_id) | cascade both sides |
| Exam ↔ Question | many-to-many | exam_questions | cascade both sides |
| Exam ↔ Group | many-to-many | exam_groups | cascade both sides |
| Exam → ExamAttempt | 1-to-many | exam_attempts.exam_id | none (the app deletes attempts → answers → evaluations first) |
| User → ExamAttempt | 1-to-many | exam_attempts.student_id | none |
| ExamAttempt → Answer | 1-to-many | answers.attempt_id | none |
| Question → Answer | 1-to-many | answers.question_id | none |
| Answer → Evaluation | 1-to-many (in practice 1) | evaluations.answer_id | none |
| ExamAttempt → IntegrityEvent | 1-to-many | integrity_events.attempt_id | cascade |

## User ownership

- **Organization-owned:** groups, questions, exams (and through exams: attempts, answers, evaluations, integrity events). Visible only to that organization's members, according to role.
- **User-owned:** the `users` row (profile, password). Attempts and answers belong to the candidate *within* the organization that ran the exam.
- Removing a candidate from an organization deletes the membership only. **Their account and past attempts are kept**, so results stay intact.

## Authentication flow

| Step | Today | Planned |
|---|---|---|
| Sign up (candidate) | `POST /signup` (+ optional join code) → then `POST /token`. Both signups email a confirmation link | — |
| Confirm email | `POST /verify-email` {token}: a signed JWT (`purpose: verify-email`, names the email, 7 days, not stored) sets `email_verified_at`; repeat clicks are fine. `POST /verify-email/resend` (signed in, 3/hour). Tokens with a `purpose` are refused as sign-in tokens | Require confirmation for staff (after pilot) |
| Sign up (organization) | `POST /signup/organization` creates the user + organization + owner membership | — |
| Sign in | `POST /token` (form: username = email, password) → JWT (60 min, subject = user ID). Rate limited: 100/min per IP, 10 failures per account per 15 min → 429 | Google sign-in |
| Session | `Authorization: Bearer`; `GET /me` returns the user + memberships; `POST /token/refresh` renews | httpOnly refresh cookie |
| Select organization | Client stores `organizationId` and sends `X-Organization-Id` | — |
| Change password | `POST /profile/change-password` (old + new) | — |
| Reset password | `POST /password-reset/request` {email} → always the same 200 message; emails a link to `APP_URL/reset-password/<token>` (30 min, single use; max 3 emails per account per hour; 20 requests per 10 min per IP). `POST /password-reset/confirm` {token, new_password ≥ 6} → sets the password, invalidates every open link, clears the sign-in lockout; bad/used/expired → 400 | Sign out other sessions on reset |
| Sign out | Client discards the token | Server-side refresh-token revocation |

### Bulk student import (task 3.6)
`POST /org/students/import/preview` and `POST /org/students/import` (managers only; multipart `file`, plus `group_ids` comma-separated on confirm). CSV (UTF-8) or XLSX, first non-empty row is the header: an `email` column (required) and a name column (optional), ≤ 1000 rows, ≤ 2 MB. Each row is `new` (account created with an unusable random password + an invite link), `existing` (account elsewhere: candidate membership added + an "added to" email), `member` (already a student: only groups change), or skipped with a reason (no email, invalid, repeated in the file, staff in this organization). Confirm re-reads the file; nothing from the preview is trusted. Emails go out after the commit.

### Get started checklist (task 3.10)
`GET /org/setup` (staff): `{steps: {students, groups, questions, exams}, counts, done}`. A step is done once the organization has at least one candidate, group, question (archived included) or exam (archived included). Counted per organization; no table of its own.

## Authorization rules

O = owner, A = admin, E = examiner, C = candidate (in the same organization). Other organizations: no access (403/404).

| Entity | Read | Create | Update | Delete |
|---|---|---|---|---|
| Organization | all members (join code: O, A) | any signed-in user (becomes owner) | O, A (name, regenerate code) | *(not exposed)* |
| Membership | O, A (member list, with `invite_pending`); self (own memberships via `/me`) | O, A by email (no account yet: one is created and invited; resend with `POST /org/members/{id}/invite`); anyone via a join code (as C) | O, A change roles; **only O grants/changes/removes owners** | O, A; can't remove the last owner |
| Group | O, A (E reads them in the exam form) | O, A | O, A (rename, regenerate code, members) | O, A |
| Question | O, A, E | O, A, E (Excel import) | *(no endpoint yet)* | O, A, E |
| Exam | O, A, E; C only if published and visible (organization + group) | O, A, E | publish/unpublish: O, A, E; *(no edit endpoint yet)* | O, A, E (deletes attempts too) |
| ExamAttempt | O, A, E (all in the organization); C own only | C via Start (one per exam) | C own (answers, events, submit) while open; server finalizes | with the exam |
| Answer | O, A, E; C own (correct answers only after the exam closes) | C own, before deadline + 30 s | C own, same rule | with the attempt |
| Evaluation | O, A, E; C sees the verdict + comment on their own answers | O, A, E | O, A, E | with the answer |
| IntegrityEvent | O, A, E | C own attempt while in progress (events after submit are ignored) | never | with the attempt |
| User profile | self; staff see name/email of their organization's members | signup | self | *(not exposed)*; planned account deletion |

## Data validation

| Rule | Where |
|---|---|
| Email format; email unique | Pydantic `EmailStr`; DB unique |
| Organization name 2–120; group name 1–100, unique per organization | Pydantic; DB unique |
| Join codes: 8 chars, unambiguous alphabet, unique; entered codes are trimmed and upper-cased | model default; API |
| Role ∈ ROLES; owner rules (above) | `organizations.py` |
| Question type ∈ 4 types; complexity ∈ easy/medium/hard; choice types need options, and correct answers ⊆ options | Excel import/preview validation |
| Exam: questions and groups must belong to the same organization; `max_violations` 1–100 or null | router + Pydantic |
| Exam: title 1–200 chars, start < end, duration 1–1440 min, ≥ 1 question (repeats dropped); times without an offset read as UTC | `ExamFormPage` and **the server** (`schemas.ExamCreate`, 422) |
| Start: published, now within the window, visible to the candidate, not already submitted | `student.py` |
| Save answer: own attempt, not submitted, question belongs to the exam, now ≤ deadline + 30 s | `crud.save_answer` |
| Integrity events: known type, 1–50 per request, details ≤ 1000 chars | `schemas.IntegrityEventIn` |
| Evaluation comment ≤ 100 chars | DB column + UI |
| Image answers ≤ 2 MB, image MIME types | **client only today**; server check planned with object storage |

## Retention and deletion

| Data | Current behavior | Required behavior *(planned)* |
|---|---|---|
| Organization | Cascade-deletes memberships, groups, questions, exams | Owner-initiated deletion with a 30-day grace period + full export first |
| Exam | **Done (2.7):** deleted only if nobody has started it; otherwise archived and unpublished, attempts, answers, grades and events kept | Same |
| Question | **Done (2.7):** deleted only if no exam or answer uses it; otherwise archived. Answers and grades are never deleted | Same |
| Candidate removed from organization | Membership deleted; attempts kept | Same |
| User account | No deletion endpoint | Self-service deletion; anonymize attempts (keep scores, drop personal data) |
| Integrity events | Kept forever | Keep for the life of the exam record |
| Image answers / webcam / ID photos | Inline in the database | Object storage; webcam/ID photos auto-deleted 90 days after the exam closes (configurable per organization) |
| Export | Not available | XLSX/PDF results; full organization ZIP export |

## Migration and seed data

- **Process:** every schema change is a new Alembic revision in `backend/migrations/versions/` named `000N_<what>.py`, with `down_revision` = the previous revision. Never edit an applied migration. New non-null columns need a `server_default`. Data fixes go in the same migration as the constraint they enable (see `0004`). Test `upgrade` on a copy of real data and against an empty database.
- **History:** `0001_baseline` → `0002_organizations` (moves single-tenant data into "Default Organization": admins → owners, students → candidates, SSC/HSC/Admission → groups) → `0003_exam_integrity` → `0004_one_attempt_per_exam` → `0005_archive_instead_of_delete`.
- **Seed:** `python create_admin.py [email] [password] ["Org name"]` creates an organization and its owner (default `admin@example.com` with a random password printed once, "Demo Organization") and prints the join code. A sample question file is `sample_questions.xlsx`; the template is downloadable from the Question bank.
- **Tests:** the pytest fixtures build the schema with `Base.metadata.create_all` on SQLite. Keep models and migrations in sync; *(planned)* a CI job runs `alembic upgrade head` on Postgres and compares it with the models.
