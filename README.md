# AI-Powered Student Career Success Portal

Current implementation and verification status: [Phase 8 report](docs/PHASE-8-STATUS.md).

Enterprise placement management platform for a single institution: student profiles and
resumes, job/internship postings with AI-assisted extraction, application tracking, mock
tests and AI mock interviews, career roadmaps, skill-gap analysis, notices/notifications,
recommendations, and analytics — 17 modules across 6 bounded contexts.

See [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) for the reasoning behind the structural
decisions below, not just the what.

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS, shadcn/ui, Redux Toolkit, TanStack Query, React Router, React Hook Form + Zod, Socket.io Client, Framer Motion, Recharts |
| Backend | Node.js, Express, TypeScript, Drizzle ORM, Supabase (Postgres + Auth + Storage), Redis, Socket.io |
| AI Service | FastAPI, Python, NVIDIA NIM (Llama 3.3 / Mistral) / OpenAI API, PyMuPDF, BeautifulSoup |
| Deployment | Docker, GitHub Actions, Nginx, AWS |
| Testing | Vitest, React Testing Library, Jest, Supertest, Playwright |

## Repository structure

```
apps/
  web/          React frontend
  api/          Express backend (feature-based modules under src/modules/<context>/<module>)
  ai-service/   FastAPI AI microservice
packages/
  db/           Drizzle schema, migrations, RLS policies, seed scripts
  shared-types/ Zod DTOs + TS types shared between web and api
  config/       Shared tsconfig/eslint/prettier base
infra/
  docker/       Per-service Dockerfiles
  nginx/        Reverse proxy config
docs/           Architecture Decision Records
```

## Local development

### Prerequisites
- Node.js ≥ 20, Python ≥ 3.12
- Docker (for Postgres/Redis, or run the full stack containerized)
- A Supabase project (for Auth + Storage — Postgres itself can be local via Docker in dev)

### Setup

```bash
cp .env.example .env
# Fill in DATABASE_URL, SUPABASE_*, JWT_SECRET, OPENAI_API_KEY, etc.

npm install

# Start local Postgres + Redis
docker compose up -d postgres redis

# Generate and run migrations
npm run db:generate
npm run db:migrate

# Apply RLS policies (one-time, or after schema changes touching RLS'd tables)
psql "$DATABASE_URL" -f packages/db/rls/001_enable_rls.sql

# Seed RBAC roles/permissions
npm run db:seed

# Run everything (web + api + ai-service) concurrently
npm run dev
```

- Web: http://localhost:5173
- API: http://localhost:4000/api/v1/health
- AI Service: http://localhost:8000/docs (Swagger UI, dev only)

### AI service (Python) setup

```bash
cd apps/ai-service
python -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
uvicorn app.main:app --reload --port 8000
```

## Testing

```bash
npm test                      # API + Web unit/integration tests
npm run test:e2e -w apps/web  # Playwright E2E
cd apps/ai-service && pytest  # AI service tests
```

## Full containerized stack

```bash
docker compose up --build
```

The containerized web app is served at http://localhost:5173 by Nginx. Compose
passes the public Supabase settings into the frontend build and connects the API
to the Compose Postgres, Redis, and AI services. To use an external PostgreSQL
database instead, set `DOCKER_DATABASE_URL` in `.env`. Apply migrations and seed
the chosen database before using the portal.

## Important architectural decisions

- Three roles only: STUDENT, PLACEMENT_FACULTY, ADMIN.
- Companies are data entities, not users.
- Jobs and internships use one `opportunities` entity.
- AI extraction is a separate FastAPI service.
- AI never directly publishes an opportunity.
- Supabase Auth handles identity.
- Express enforces API authorization.
- Drizzle is the data access layer.
- Supabase PostgreSQL is the production database.
- Redis is used only where there is a clear caching/queue/rate-limit need.

`docs/ARCHITECTURE.md` for why Auth comes first.
