# CourseForge AI — PDF → E-Course Learning Platform

Turn any PDF into a structured, lesson-by-lesson course. This repository contains
the complete application architecture (frontend + backend) ready for an AI
agent pipeline to plug in.

> **AI generation is now fully implemented!** The pipeline uses Google's Gemini SDK for course structure generation, lesson drafting, storytelling, and quiz generation. A Groq integration powers the persistent chat assistant.

---

## Tech stack

| Layer            | Technology                                              |
| ---------------- | ------------------------------------------------------ |
| Frontend         | Next.js 15 (App Router), React, TypeScript, Tailwind   |
| UI primitives    | shadcn-style components, Radix UI, Framer Motion        |
| Forms & validation | React Hook Form, Zod                                  |
| Backend          | FastAPI, SQLAlchemy 2, Pydantic v2                     |
| Database         | PostgreSQL, Alembic migrations                         |
| Auth             | Google OAuth, GitHub OAuth, JWT session                |
| Storage          | Local `uploads/` folder (dev)                          |
| PDF parsing      | PyMuPDF (fitz)                                         |

## Repo layout

```
/
├── frontend/                Next.js 15 app
│   ├── src/app/             App Router pages (landing, auth, dashboard, upload,
│   │                       course/[id], lesson/[id], profile)
│   ├── src/components/     ui/, layout/, landing/, dashboard/, providers/
│   ├── src/lib/            api.ts, config.ts, utils.ts
│   └── src/types/          shared TS types
├── backend/                 FastAPI app
│   ├── app/
│   │   ├── api/routes/     auth, users, upload, documents, courses, lessons, progress
│   │   ├── models/         SQLAlchemy models
│   │   ├── schemas/        Pydantic schemas
│   │   ├── services/       pdf_service, course_service, user_service, oauth_service,
│   │   │                   queries.py, orchestrator.py
│   │   │   └── agents/     structure/lesson/story/quiz/review (placeholders)
│   │   ├── database/       engine, session, Base
│   │   ├── utils/          security, jwt_utils, deps
│   │   ├── uploads/        dev uploads directory
│   │   ├── main.py         FastAPI factory
│   │   └── cli.py          db init/seed
│   ├── alembic/            migrations
│   └── requirements.txt
├── database/               (reserved for SQL dumps / volumes)
├── uploads/                host-mounted uploads folder
├── docker-compose.yml       db + backend + frontend
├── .env.example
└── README.md
```

## Quick start (local dev)

### Prerequisites

- Python 3.11+, Node 20+, PostgreSQL 16 (or use the `db` service alone)
- Google / GitHub OAuth apps (optional for email/password login)

### 1. Clone & copy env

```bash
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Edit `DATABASE_URL`, `JWT_SECRET`, and OAuth client IDs accordingly.

### 2. Start Postgres (optional if you already have one)

```bash
docker compose up -d db
```

### 3. Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate   # Windows: .\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python -m app.cli init           # create tables (dev) — or use Alembic:
alembic upgrade head             # equivalent, with migration history
python -m app.cli seedtest      # optional: demo user + course
uvicorn app.main:app --reload
# API at http://localhost:8000 (docs at /docs)
```

### 4. Frontend

```bash
cd frontend
npm install
npm run dev
# app at http://localhost:3000
```

### Or: full stack with Docker

```bash
docker compose up --build
# frontend:  http://localhost:3000
# backend:  http://localhost:8000
# db:        localhost:5432   (postgres/postgres)
```

---

## API surface

| Method | Endpoint                     | Description                          |
| ------ | ---------------------------- | ------------------------------------ |
| POST   | `/api/auth/signup`          | Email/password signup → JWT           |
| POST   | `/api/auth/login`           | Email/password login → JWT            |
| GET    | `/api/auth/google`          | Redirects to Google OAuth            |
| GET    | `/api/auth/google/callback` | Exchanges code, returns JWT          |
| GET    | `/api/auth/github`          | Redirects to GitHub OAuth            |
| GET    | `/api/auth/github/callback` | Exchanges code, returns JWT          |
| GET    | `/api/me`                   | Current authenticated user           |
| POST   | `/api/upload`               | Upload a PDF (≤100 MB), parse & store |
| GET    | `/api/documents`            | List user's uploaded PDFs            |
| GET    | `/api/courses`              | List user's courses                  |
| GET    | `/api/course/{id}`          | Course with chapters/topics/lessons  |
| GET    | `/api/lesson/{id}`          | Single lesson                        |
| POST   | `/api/lesson/{id}/complete` | Mark lesson complete/incomplete      |
| GET    | `/api/progress`             | Dashboard aggregates                 |
| GET    | `/api/health`               | Liveness probe                       |
| GET    | `/api/agents`               | Describes the (future) AI pipeline   |

## Data model

```
User ──< Document ──1:1 Course ──< Chapter ──< Topic ──< Lesson
  │                                                    │
  └──────< Progress (1:1 with Lesson per user) ───────┘
```

## The AI pipeline

The architecture uses a fault-tolerant, resumable orchestrator. When a PDF is uploaded, the backend executes:

```
Extract Text  →  Chunk Text  →  AI Orchestrator (orchestrator.py)
   →  Structure Agent (gemini)   →  Lesson Agents (gemini)   →  Storytelling Agent (gemini)
   →  Flashcard Agent (gemini)   →  Quiz Agent (gemini)      →  Review Agent
   →  Store Course
```

The pipeline writes its progress iteratively to the `pipeline_jobs` table, and the frontend polls this to display a live progress bar. If the pipeline hits an API rate limit, it gracefully pauses and can resume exactly where it left off!

There is also a Chatbot Agent (`chat_agent.py`) which uses Groq (`llama-3.1-8b-instant`) to answer user questions about their course context.

## OAuth notes

1. Create a Google OAuth client with redirect URI
   `http://localhost:8000/api/auth/google/callback`.
2. Create a GitHub OAuth app with redirect URI
   `http://localhost:8000/api/auth/github/callback`.
3. After the callback, the backend stores the JWT in `localStorage` and
   redirects the user to `<frontend>/auth/callback?token=...`.
4. The frontend `AuthProvider` persists the token via `localStorage` and
   attaches it as a `Bearer` header on every API call.

## Security checklist for production

- Replace `JWT_SECRET` with a long random string.
- Switch `UPLOAD_DIR` to S3-compatible object storage.
- Add rate limiting / throttling on `/api/upload` and auth routes.
- Run `npm run typecheck` and `npm run lint` in CI; `ruff check app` for backend.
- Add CSRF protection if cookie-based sessions replace bearer tokens.

## License

MIT
