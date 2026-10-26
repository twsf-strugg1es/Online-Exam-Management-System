# 2. Technical Requirements Document (TRD): TestKori

Purpose: make technical choices explicit so the build does not rely on guesses.
Status: living document · Last updated 2026-10-12 · Describes the system **as built**; *(planned)* items are scheduled in the [Implementation Plan](06-IMPLEMENTATION-PLAN.md).

## Platforms

- **Web only, desktop first**: version one is a desktop web app (1024 px and wider). Narrower, only the public landing page, login and signup work; other routes show a "use a computer" screen.
- Supported: the last 2 versions of Chrome, Edge, Firefox and Safari on Windows, macOS and Linux; old low-spec PCs are a first-class target. The landing page also supports mobile Safari and Android Chrome.
- Clipboard clearing uses the async Clipboard API (`navigator.clipboard.writeText`), which needs a focused page; it's best effort, and paste blocking doesn't depend on it.
- *(planned)* An installable PWA. There are no native apps.

## Frontend and hosting

| Item | Choice |
|---|---|
| Framework | React 19, React Router 7, Create React App (`react-scripts` 5) |
| Styling | Tailwind CSS 3 with CSS-variable theme tokens; light and dark themes |
| HTTP | axios instance in `src/api.js` (adds the `Authorization` and `X-Organization-Id` headers) |
| Icons / fonts | `react-icons/lu` (Lucide); self-hosted `@fontsource` IBM Plex Sans/Mono and Hind Siliguri |
| State | React Context (`AuthContext`, `ThemeContext`) plus local component state; no global store |
| Build output | Static files (`npm run build`), served by nginx or a CDN *(planned)* |
| Config | `REACT_APP_API_URL` at build time (default `http://localhost:8000`) |

## Backend and database

| Item | Choice |
|---|---|
| API | FastAPI (Python 3.10+; the code uses `X \| None` syntax), uvicorn, Pydantic v2; OpenAPI at `/docs` |
| ORM | SQLAlchemy (synchronous sessions), `psycopg[binary]` |
| Database | PostgreSQL 12+; UUID primary keys; JSON columns for options, answers and event details |
| Migrations | Alembic, `backend/migrations/versions/000N_*.py`; the app never calls `create_all` |
| File storage | Today: image answers inline in the database as `data:` URLs. *(planned)* S3-compatible object storage (Cloudflare R2 / AWS S3 / MinIO) with signed URLs |
| Background jobs | None today. *(planned)* A small scheduler/worker for notifications and closing abandoned attempts |
| Region | One region at launch (Singapore or Mumbai: low latency to South Asia, acceptable globally). *(planned)* An EU region for customers that require EU data residency, as a separate deployment per region rather than one global database |

### Internationalization (global readiness)

| Concern | Requirement |
|---|---|
| UI text | **Done (1.8):** every visible string goes through `t('English text')` / `tn(count, one, other)` from `src/i18n/` (`useI18n()`). English text is the key, so a missing translation falls back to English. Translations live in the catalogs in `src/i18n/index.js` (Bengali is task 4.13). `npm run i18n:extract` lists every string in `src/i18n/strings.json` for translators; CI fails if it's out of date. `?lang=en-XA` renders a pseudo-language to find strings that skipped `t()` |
| API messages | Error `detail` and `message` strings stay English and are translated on the client: `errorMessage()` passes them through `t()`, and the extractor collects them from `backend/app`. Messages with variable parts (f-strings) are not translatable yet; give them a fixed sentence when they matter |
| Dates, numbers, currency | Formatted with `Intl` APIs and the user's locale; stored as UTC timestamps / integer minor units + ISO 4217 currency code |
| Settings | **Done (1.9):** organization `default_language`, `timezone` (IANA), `currency`, `country`; user `language`. `/me` memberships carry the organization's `timezone` and `default_language`. The frontend calls `setTimeZone()` (in `App.js`) so every formatter in `src/utils.js` uses the organization's timezone; `formatExamTime()` adds a short zone label when the organization's offset differs from the viewer's, and the exam form reads and writes `datetime-local` values in that zone (`toZonedInput` / `fromZonedInput`). Language order: `?lang=` > account > organization > browser; a hidden test language (`en-XA`, `en-XB`) stays until it's changed |
| Scripts | Font stack covers Latin and Bengali today; add Noto fallbacks for other scripts. Layout works right-to-left (**done, 1.10**): logical Tailwind utilities only, `<html dir>` set from the language catalog (`dir` field in `src/i18n/index.js`), test with `?lang=en-XB` |
| Phone numbers | Stored in E.164 format; validated per country |
| Local exam conventions | Negative marking, merit lists, grading scales are per-exam/per-organization settings, never global defaults |

Backend environment (`backend/.env`):

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | yes | `postgresql://user:pass@host:5432/db` |
| `SECRET_KEY` | yes | JWT signing key; the app refuses to start without it |
| `CORS_ORIGINS` | no | Comma-separated allowed frontend origins (default: localhost:3000, localhost:5173) |
| `LOG_LEVEL` | no | `DEBUG` / `INFO` (default) / `WARNING` / `ERROR`. Logs are JSON lines on stdout |

## Authentication and roles

- **Sign-in:** email + password via `POST /token` (OAuth2 password form; the `username` field holds the email).
- **Tokens:** JWT HS256, 60-minute expiry, `sub` = user email. The frontend refreshes before expiry with `POST /token/refresh`, so a long exam never logs anyone out. Tokens are stored in `localStorage`.
- **Passwords:** `pbkdf2_sha256` (passlib). Older bcrypt hashes still verify.
- **Roles are per organization** (`Membership.role`): `owner` > `admin` > `examiner` > `candidate`.
  - Staff = owner, admin, examiner: questions, exams, grading, results.
  - Managers = owner, admin: members, groups, join codes, organization settings.
  - Only owners can grant, change or remove the owner role; an organization always keeps at least one owner.
- **Organization context:** every organization-scoped request sends `X-Organization-Id`. `permissions.get_current_membership` resolves it to the caller's membership or returns 403. Route guards: `require_staff`, `require_manager`, `require_candidate`.
- *(planned)* Password reset, email verification, Google sign-in, rate limiting on auth endpoints.

## External services and APIs

| Service | Purpose | Status | Limits / notes | Credentials owner |
|---|---|---|---|---|
| Email (SMTP, or Resend/SES) | Reset, verification, invites, notifications | planned | Provider free tiers ≈ 3k/month | Product owner |
| SMS: BD gateway (SSL Wireless / BulkSMSBD / Alpha SMS) for Bangladesh; Twilio (or similar) elsewhere | Exam reminders, results | planned | Per-SMS cost; sender ID rules differ by country; route by the phone number's country | Product owner |
| Object storage (R2/S3) | Image answers, webcam snapshots, ID photos | planned | Signed URLs, private bucket | Product owner |
| Sentry | Error tracking (API + web) | planned | Free tier | Product owner |
| Payments: SSLCommerz / bKash (Bangladesh); Stripe or Paddle (global; Paddle also handles sales tax/VAT as merchant of record) | Subscriptions | planned (P3) | Merchant accounts required; payment provider chosen per organization's country | Business owner |

No external service is called today. All credentials will come from environment variables and are never committed.

## Architecture

```
Browser (React SPA)
  │  HTTPS JSON · Authorization: Bearer <jwt> · X-Organization-Id: <uuid>
  ▼
FastAPI app (backend/app)
  main.py ── routers/ (auth, organizations, admin, student, profile)
                │  depend on permissions.py (membership + role) and security.py (JWT user)
                ▼
             crud.py (business logic: grading, shuffling, deadlines, integrity)
                ▼
             models.py (SQLAlchemy) ──► PostgreSQL (schema via Alembic)
```

**Main data flows**
1. **Login:** `/token` → JWT → `/me` returns the user and their memberships → the frontend stores the selected `organizationId` → every later call carries both headers.
2. **Exam start:** `POST /student/exams/{id}/start` checks visibility (organization + group), publish state, window, and that the exam isn't already submitted, then creates or reuses the attempt and returns the questions (shuffled per attempt, with no answer keys), saved answers and the deadline.
3. **Answering:** `POST /attempts/{id}/save-answer` upserts one answer. It is rejected after `deadline + 30 s` (`ANSWER_GRACE_SECONDS`).
4. **Integrity:** the exam page's `useExamIntegrity` hook sends events to `POST /attempts/{id}/events` (`fetch` with `keepalive`). The server counts violations and submits automatically at `max_violations`.
5. **Submit:** `POST /attempts/{id}/submit` auto-grades choice questions and records the submit reason (`student`, or `time_up` if within 5 s of the deadline). Written and image answers wait for manual grading through `/admin/evaluations/...`.

**Deadline rule:** `deadline = min(attempt.start_time + duration, exam.end_time)`. The server decides; the client timer only displays it.

## Security and privacy

| Concern | Control |
|---|---|
| Tenant isolation | Every tenant query filters by `membership.organization_id`; cross-organization access tests in `tests/test_organizations.py`. **Every new endpoint needs one.** |
| Answer-key leakage | Candidate payloads are built by `crud.questions_for_attempt` and never include `correct_answers`. Results include correct answers only after the exam window closes. |
| Integrity data | Server-side counting. The client clock (`occurred_at`) is informational only; ordering uses the server's `recorded_at`. Event payloads are validated (known types only, ≤ 50 per request, details ≤ 1000 chars). |
| Passwords | Hashed (pbkdf2_sha256); change-password requires the old password. |
| Transport | HTTPS in production *(planned, at deploy)*; CORS restricted by `CORS_ORIGINS`. |
| Sensitive data held | Name, email, optional date of birth and gender, answers, integrity events, uploaded images. *(planned)* webcam/ID images need explicit consent, a retention limit (e.g. 90 days after the exam closes) and deletion by the organization. |
| Privacy law (global) | Before selling outside Bangladesh: GDPR (EU/UK) — lawful basis, data processing agreement for organizations, data export and deletion, subprocessor list, cookie consent, breach process; FERPA/COPPA considerations for US schools and under-13 users; Bangladesh's data protection rules for local customers. Webcam/biometric data (P2) is special-category data under GDPR: explicit consent, minimal retention, EU hosting option |
| Known gaps | No rate limiting; JWT in `localStorage` (exposed to XSS); JWT subject is the email; no audit log. See Key decisions and the Implementation Plan. |

## Performance and reliability targets

| Target | Value | Status |
|---|---|---|
| Exam-start burst | 500 candidates start within 60 s; p95 start < 1.5 s | not yet load-tested |
| Save-answer latency | p95 < 500 ms at 500 concurrent candidates | not yet load-tested |
| Answer durability | 0 accepted answers lost | design goal; offline queue planned |
| Uptime during scheduled exams | 99.9% | planned (monitoring) |
| Backups | Daily automatic backups, ≥ 7-day retention, restore tested once per quarter | planned |
| Frontend | First load < 3 s on 3G for the exam page; JS bundle kept lean | to be measured |

## Environments and delivery

| Environment | Today | Planned |
|---|---|---|
| Development | **Native** (default; fits an 8 GB PC): local PostgreSQL service + `uvicorn --reload` in `backend/.venv` + `npm start`. Optional: `docker compose up --build` (db, api, web) on PCs with RAM to spare | MinIO added to compose with object storage (3.5) |
| Test | `pytest` on in-memory SQLite; Jest smoke tests | CI (1.5) also runs pytest against Postgres, `alembic upgrade head` on an empty database, and builds + health-checks the Docker images |
| Staging | none | Same images as production, seeded demo organization |
| Production | none | Managed Postgres; API container; static web on a CDN; Sentry; uptime check on `/health` |

Delivery rules: migrations run before the new API version starts; frontend `npm run build` must have zero warnings (CRA treats warnings as errors when `CI=true`); every PR runs both test suites. Rollback = redeploy the previous image. Migrations must be backward compatible for one release (expand, then contract).

Commands:
```bash
cd backend && alembic upgrade head && python -m uvicorn app.main:app --reload --port 8000
cd backend && python -m pytest tests/ -q
cd frontend && npm start | npm test -- --watchAll=false | npm run build
```

## Key technical decisions and tradeoffs

| Decision | Reason | Alternative considered |
|---|---|---|
| Roles live on memberships; the JWT carries only the user | One person can be a candidate at one organization and an examiner at another | Role claims in the JWT: needs a token per organization and goes stale when roles change |
| Organization chosen via the `X-Organization-Id` header | Simple; works with one token for all organizations | Subdomain per organization: better branding, more DNS/CORS work (maybe later) |
| Groups decide exam visibility; no groups = everyone | Matches "batches"; zero configuration for small organizations | Explicit per-candidate assignment: too much admin work |
| One attempt per (exam, candidate), enforced by a unique constraint | Stops duplicate attempts from double clicks or parallel requests | App-level check only: racy. Retakes would need an `attempt_number` column |
| Shuffle seeded by attempt ID, not stored | Stable order on reload with no extra table | Storing the order: needed later for random *pools*, because a pool can change |
| Grading compares option values, not positions | Shuffling can never affect scores | Index-based answers: breaks with shuffling |
| Violations vs flags | Only leaving the exam can end an attempt; copy/paste/right-click are only recorded. Wrongly auto-submitting an honest candidate costs more than missing a flag | Every event counts: too many false positives |
| Server clock is authoritative | Candidates can change their device clock | Trusting `occurred_at`: easy to fake |
| Fullscreen skipped where unsupported (iOS) | Blocking iPhone users entirely is worse | Requiring a desktop: loses mobile-first users |
| Alembic owns the schema | Safe upgrades of existing institutions' data | `create_all` at startup: can't alter existing tables |
| Image answers inline as `data:` URLs | Fastest to ship for v0 | Object storage: **required before webcam snapshots**, scheduled in the plan |
| Tests on SQLite | Fast, no setup | Postgres in CI: planned, since JSON/constraint behavior differs |
| Global product, Bangladesh launch | One codebase; local conventions are settings. Gets a paying pilot fast without hardcoding one country | Separate BD and global products: double the maintenance |
| Region per deployment (not one global database) | Simple data-residency story for EU customers | Multi-region single database: complex, unnecessary at this scale |
| Translations without a library (`src/i18n/`, ~100 lines on `Intl`) | `react-i18next` and `i18next` declare a TypeScript 5 peer that conflicts with CRA's TypeScript 4.9 (needs `--legacy-peer-deps` everywhere), and they add bundle weight the performance budget doesn't allow | `react-i18next` with forced peer resolution: hides real conflicts in every install |
| CRA kept for now | Works; migrating isn't urgent | Vite: faster builds; a reasonable later task |
| CSS-variable tokens + a small component set (`ui.js`) | One consistent look in light and dark; replaced several competing style systems | Component library (MUI/shadcn): heavier, generic look |

## Known technical debt

1. Image answers stored in the database (move to object storage).
2. **Abandoned attempts are never finalized:** an attempt is scored only when the candidate submits, the page auto-submits, or the candidate resumes after the deadline. If they never return, `end_time` stays empty. Needs a scheduled job that finalizes overdue attempts.
3. The Excel import changes any tag outside a hardcoded list of 9 into `"others"` (`routers/admin.py`).
4. No single-question create/edit endpoint or UI (Excel import only); exams can't be edited after creation.
5. ~~Debug prints and no structured logging~~ Done: JSON logs to stdout via `app/logging_config.py` (one `app.request` line per request with `request_id`, `method`, `path`, `status`, `duration_ms`, `user_id`, `organization_id`, `role`); every response has an `X-Request-ID` header; unexpected 500s return a generic message with that reference instead of exception text. Health check: `GET /health` (200, or 503 when the database is unreachable).
6. Unused legacy grading endpoints in `admin.py`: `/exams/attempts/{id}`, `/exams/attempts/{id}/evaluate`, `/answers/{id}/evaluate`, `/answers/{id}/evaluation`, `/attempts/{id}/results`. The frontend doesn't call them; remove them after confirming.
7. Naive `datetime.utcnow` defaults in several models; prefer timezone-aware values.
8. JWT in `localStorage`. ~~JWT subject is the email~~ Fixed in 2.8: the subject is the user ID; tokens with an email subject are still accepted until the next release (remove the fallback in `security.get_current_user`).
9. ~~README project structure stale~~ Fixed in 1.7.
