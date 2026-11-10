# Architecture Decisions — Phase 0

This document records the *why* behind Phase 0's structural decisions. Treat it as a living
ADR log — append to it, don't rewrite history, as later phases add their own decisions.

## 1. Modular monolith, not microservices (for the Node/Express core)

The Express API is a single deployable unit internally organized as feature-based vertical
slices (`src/modules/<context>/<module>`), not a set of independently deployed services.

**Why:** microservices earn their operational cost (service discovery, distributed tracing,
network-partition handling, eventual consistency) only once a module has genuinely different
scaling needs or a separate team owns it. At single-institution scale, that cost buys nothing
yet. The AI service is the one deliberate exception — see §2.

**Trade-off accepted:** if a specific module (e.g. Analytics) later needs independent scaling,
extracting it means carving a bounded context out of the monolith. The bounded-context folder
structure is chosen specifically to make that extraction mechanical rather than a rewrite.

## 2. AI service as a separate FastAPI microservice

Unlike the rest of the backend, AI workloads live in `apps/ai-service`, called over an internal
HTTP contract authenticated by a shared token (never exposed to the frontend/internet directly).

**Why:** different dependency tree (Python ML/AI libraries vs. Node), different scaling curve
(LLM calls are slow and bursty vs. typical CRUD latency), and different failure isolation (an
OpenAI outage should degrade AI features, not take down job applications).

## 3. Auth: Supabase Auth + JWT verification + PostgreSQL RLS + Express authorization (defense in depth)

Four layers, each catching what the others might miss:

1. **Supabase Auth** owns credentials, session issuance, refresh, email verification.
2. **Express middleware** verifies the JWT signature/expiry on every request and attaches
   `req.user` (id, roles, permissions) before any controller runs.
3. **Service-layer authorization** enforces business rules ("a TPO can only close drives they
   created") — these are too nuanced for RLS and need rich error messages.
4. **PostgreSQL RLS** is the last line of defense: even a bug in (2) or (3), or a leaked
   anon-key request, cannot read/write rows outside a user's own scope. See
   `packages/db/rls/001_enable_rls.sql`.

The Express API connects with Supabase's `service_role` key (bypasses RLS by design) — RLS
protects *direct* Supabase client access (e.g. from the frontend using the anon key), while
the Express layer is where full business authorization lives.

## 4. Drizzle ORM over Prisma or the raw Supabase client

Chosen per explicit requirement. Trade-offs worth recording: Drizzle's SQL-like query builder
gives more predictable generated SQL than Prisma (useful when tuning slow queries later) and
keeps the repository layer thin, at the cost of a less mature migration-diffing UX than Prisma
Studio (mitigated by `npm run db:studio`, which does work).

## 5. Two strict TypeScript flags disabled *only* in `packages/db`

`exactOptionalPropertyTypes` and `noUncheckedIndexedAccess` are enabled everywhere in the
monorepo **except** `packages/db`, where they produce false-positive type errors against
Drizzle's internal relation/column typings (verified empirically — see the tsconfig comment
for exact symptoms). Every other strict flag, including `noImplicitAny` and
`strictNullChecks`, stays on in that package. This is a scoped, documented exception, not a
blanket relaxation.

## 6. Bundler module resolution over NodeNext, even for backend packages

`packages/db` and `apps/api` use `moduleResolution: "Bundler"` rather than `NodeNext`, because:
- Every runtime path in this repo goes through a resolver that understands extensionless
  TS imports — `tsx` in dev, esbuild/Vite in the frontend, and `drizzle-kit`'s own loader.
- `drizzle-kit generate` specifically fails to resolve `.js`-suffixed imports pointing at
  `.ts` source files (confirmed during Phase 0 validation) — it does not perform the Node
  ESM `.js → .ts` remap that `tsx` does.
- Nothing in this repo ships as a published npm package consumed by a plain `node script.js`
  with no bundler/loader in front of it, so `NodeNext`'s strict extension requirement buys
  correctness we don't need at the cost of tooling breakage we do hit.

## 7. API response envelope

Every endpoint returns `{ success: true, data, meta? }` or
`{ success: false, error: { code, message, details? } }` (`packages/shared-types/src/api-envelope.ts`).
Controllers never hand-roll response shapes; the frontend has exactly one shape to unwrap
regardless of which of the 17 modules it's calling.

## 8. Single-institution deployment (not multi-tenant)

Per requirements. There is no `tenant_id`/`institution_id` column anywhere in the schema.
If multi-tenancy becomes a future requirement, expect it to touch nearly every table — this
is a deliberate scope boundary, not an oversight.

## Open items carried into Phase 1

- Supabase Auth webhook/trigger that creates the corresponding `users` row on signup (not yet
  implemented — Phase 1 must land this before any real auth flow works end-to-end).
- Full RBAC middleware (`requireAuth`, `requirePermission`) in `apps/api/src/middlewares/` —
  Phase 0 only ships the module *pattern* (`health`), not the auth module itself.
- Automated codegen from Drizzle schema → `shared-types` enums, to remove the manual-sync note
  in `packages/shared-types/src/enums.ts`.

## 9. Data Access Architecture (added Phase 0.5)

The full authentication and authorization pipeline for server-side API requests:

```
Supabase Auth → JWT → Express Middleware → RBAC Middleware → Service Layer → Drizzle ORM → PostgreSQL
```

| Layer | Responsibility |
|---|---|
| **Supabase Auth** | Credential management, session issuance, JWT signing, email verification, password reset |
| **Express JWT Middleware** | Verifies JWT signature + expiry; attaches `req.user { id, roles, permissions }` |
| **RBAC Middleware** | Checks `req.user.permissions` against route-level permission requirements; throws `ForbiddenError` |
| **Service Layer** | Business rule authorization (e.g., "student can only edit own profile"); all queries scoped by user context |
| **Drizzle ORM** | Query builder; connects with `service_role` key (bypasses RLS) — RLS is **not** relied upon for server-side access |
| **PostgreSQL RLS** | Defense-in-depth for **direct Supabase client access only** (frontend anon key). See §10. |

## 10. RLS is defense-in-depth, not primary authorization (added Phase 0.5)

The Express API connects with Supabase's `service_role` key which **bypasses RLS by design**.
This is intentional — authorization is enforced at the Express middleware and service layers.

RLS policies serve as a safety net for any *direct* Supabase client access from the frontend
(e.g., using the anon key for real-time subscriptions or storage). They catch bugs in
direct-access scenarios but are not the primary authorization mechanism for server-side code.

**Why not rely on RLS as the primary authorization layer?**
- RLS policies cannot easily express complex business rules (e.g., "PLACEMENT_FACULTY can
  approve drafts only if the extraction confidence is above threshold").
- RLS errors are opaque (the client sees "no rows returned" rather than a structured 403
  with a human-readable reason).
- Testing RLS policies requires database-level test fixtures, while Express middleware
  authorization is testable with standard HTTP integration tests.

## 11. Docker PostgreSQL is development-only (added Phase 0.5)

The `docker-compose.yml` provides a local PostgreSQL instance for development. Production
deployments use Supabase's managed PostgreSQL instance with Auth, Storage, and RLS enabled.

The `DATABASE_URL` environment variable is the switching point between environments:
- **Development:** `postgresql://postgres:postgres@localhost:5432/career_portal`
- **Production:** Supabase connection string (pooled, with SSL)

No application code should branch on "am I in Docker vs. Supabase" — the connection string
is the only difference.

## 12. Auth-specific rate limiting (added Phase 1)

The global `express-rate-limit` in `app.ts` (100 req/min default) provides a baseline, but
auth endpoints are the primary brute-force / credential-stuffing target. Three dedicated
limiters apply tighter windows per IP on the routes that matter most:

| Endpoint | Limit | Window |
|---|---|---|
| `POST /auth/signin` | 10 requests | 15 minutes |
| `POST /auth/signup` | 5 requests | 15 minutes |
| `POST /auth/forgot-password`, `/reset-password` | 3 requests | 15 minutes |

**Why not Redis-backed rate limiting?** The in-memory store is sufficient for a
single-instance deployment. If horizontal scaling is introduced, swap to
`rate-limit-redis` — the middleware signature is identical; only the store option
changes. Recording this as a future consideration rather than premature optimization.

## 13. Request / correlation ID middleware (added Phase 1)

Every request receives a `X-Request-Id` response header. The middleware:

1. Reuses the client-sent `X-Request-Id` header if present (enables distributed tracing
   across Express → AI FastAPI calls by forwarding the header).
2. Generates a `crypto.randomUUID()` if no header is present.
3. Attaches to `req.id` for pino-http's `genReqId`, so every log line in the request's
   lifecycle carries the same correlation ID.

## 14. Auth sync endpoint (added Phase 1)

`POST /api/v1/auth/sync` is an authenticated endpoint that:

1. Ensures the `public.users` row exists (idempotent `INSERT ... ON CONFLICT DO NOTHING`).
2. Assigns the default `STUDENT` role if no roles exist yet.
3. Returns the full `AuthenticatedUser` context (roles + permissions).

**Why a dedicated endpoint?** The signup flow handles user-row creation inline, but the
sync endpoint covers edge cases: social-auth providers (where Supabase creates the user
without going through our signup API), first login from a new device where the DB trigger
may not have fired yet, or any race condition between the trigger and the frontend's
initial `fetchMe` call. It is the frontend's safety net — call it on any `SIGNED_IN`
## 15. Student profile readiness & completeness scoring (added Phase 2)

The profile completion service (`profile-completion.service.ts`) uses a deterministic, rule-based
scoring matrix across 7 weighted categories (total 100%):

1. **Academic Information (20%)**: Department, Program, Batch, Roll Number, CGPA.
2. **Contact & Bio (15%)**: Verified phone number and a descriptive professional bio.
3. **Skills & Proficiencies (15%)**: At least 4 technical/domain skills with defined proficiencies.
4. **Projects & Portfolio (20%)**: At least 2 structured technical projects with technology tags and descriptions.
5. **Certifications & Achievements (10%)**: At least 1 verified certification or academic milestone.
6. **Professional Links (10%)**: LinkedIn, GitHub, or Portfolio website URLs.
7. **Resume Builder (10%)**: At least 1 structured resume generated within the portal.

**Why deterministic over LLM scoring for profile completion?** Determinism guarantees instant, reproducible,
zero-cost calculations on every profile update and prevents non-deterministic fluctuations in placement eligibility checks.

## 16. Structured resume builder & primary versioning (added Phase 2)

Resumes store structured JSON content (`content: jsonb`) separately from file rendering metadata (`fileUrl`).
A student can maintain multiple tailored resume variations (e.g. Full-Stack vs. ML Engineer):

- **Single Primary Constraint**: Database transactions enforce that only one resume per student has `is_primary: true`.
  When a resume is marked primary, all other resumes for that student profile have `is_primary` atomically set to `false`.
- **Duplication & Versioning**: Resumes can be cloned into new independent versions with an incremented version counter.

## 17. Resume AI analysis & opportunity matching engine (added Phase 2)

AI-driven resume intelligence is encapsulated in the FastAPI microservice (`apps/ai-service`) and called
by Express (`apps/api`) via internal token authentication:

1. **Multi-Dimensional Scoring**: Evaluates ATS compliance, technical skill depth, keyword/action verb density, and layout formatting.
2. **Immutable Analysis Snapshots**: Every run creates a new row in `resume_analyses`, allowing candidates and placement faculty to track improvements over time.
3. **Resilient Local Fallback**: If the AI microservice or external LLM provider is offline, the Express backend automatically executes a local deterministic rule evaluator, ensuring zero downtime for students.
4. **Resume-to-Opportunity Match Contract**: Compares normalized resume skills against job requirements and evaluates hard eligibility filters (CGPA, department), returning match scores and transparent explanatory reasons.

## 18. Preparation engine & answer key security isolation (added Phase 5)

Student placement preparation requires strict segregation between test content (questions, options, metadata) and evaluation keys (correct answers, explanations, score weights):

1. **Table Isolation (`mock_test_answer_keys`)**: Correct option identifiers and explanatory text are stored in a separate table (`mock_test_answer_keys`) linked by question ID.
2. **Zero Client Leakage During Active Attempts**: Student-facing endpoints (`GET /api/v1/preparation/tests/:id` and `GET /api/v1/preparation/attempts/:id`) explicitly omit answer keys. Questions and sections are serialized without correct answer fields.
3. **Protected Authoring Layer**: Only users with `PLACEMENT_FACULTY` or `ADMIN` roles can read or write answer key records.
4. **Post-Evaluation Visibility**: Explanations and correct options are surfaced only after an attempt has been officially evaluated and if the test's configuration permits immediate review.

## 19. Attempt lifecycle, atomic grading transaction & integrity protection (added Phase 5)

Mock test attempts adhere to a strict state machine: `NOT_STARTED` → `IN_PROGRESS` → `SUBMITTED` → `EVALUATED`.

1. **One-Active-Attempt Rule**: A student cannot start a new attempt on any test while an active attempt (`IN_PROGRESS`) is already running. Attempting to do so returns `409 Conflict`, preventing parallel exploitation.
2. **Server-Side Timer Validation**: Every attempt records `started_at` and computes an absolute server deadline based on test duration plus a 2-minute network grace period. Submissions beyond this threshold are classified as `auto_submitted` or rejected if past maximum timeout.
3. **Duplicate Submission Protection**: Submissions are guarded by optimistic state transitions and transactional locks. Submitting an already completed or evaluated attempt returns `409 Conflict`.
4. **Autosave Endpoint**: Candidates periodically sync answers (`POST /api/v1/preparation/attempts/:id/autosave`) without triggering evaluation, protecting progress against client disconnections or crashes.
5. **Atomic Grading Transaction**: Grading runs completely inside a PostgreSQL database transaction (`db.transaction`). The engine:
   - Locks the attempt row.
   - Evaluates submitted answers against `mock_test_answer_keys`.
   - Records per-question correctness, marks obtained, and time spent in `attempt_answers`.
   - Computes total score, percentage, and pass/fail status against passing marks.
   - Transitions attempt status to `EVALUATED` atomically, ensuring no partial or corrupted results.

## 20. Placement practice analytics and weak-area identification (added Phase 5)

Performance metrics are computed from granular `attempt_answers` records across all evaluated tests:

1. **Topic and Category Accuracy**: Aggregates total questions attempted vs. correct answers grouped by test category (`quantitative_aptitude`, `logical_reasoning`, `verbal_ability`, `technical_mcq`, `programming`, `sql`, `role_specific`).
2. **Weak Area Threshold**: Any category with an aggregate accuracy below 50% is flagged as a "weak category", triggering contextual practice recommendations in the UI.
3. **Historical Score Trajectory**: Chronological timeline of attempt scores and percentage yields a trend curve showing readiness growth over time.
4. **Faculty Aggregate Insights**: Placement officers can view department-wide and test-wide distributions (average score, pass rate, completion rate, attempt volume) to target cohort training interventions.

## 21. AI mock interview generation and multi-dimensional evaluation (added Phase 5)

Mock interviews simulate realistic technical and behavioral placement rounds:

1. **Role-Specific Question Generation**: Generates targeted interview questions based on job domain (e.g. Frontend Engineer, Backend Engineer, Data Analyst, Cloud/DevOps) across behavioral, technical, and situational competencies.
2. **Text-First Interactive Session**: Questions are delivered sequentially or as a structured questionnaire, collecting candidate responses using the STAR method (Situation, Task, Action, Result).
3. **Multi-Dimensional Rubric Scoring**: Submitted responses are evaluated across standard evaluation criteria:
   - Relevance & Completeness (0–100)
   - Technical Depth & Accuracy (0–100)
   - Communication Clarity & Structure (0–100)
4. **Actionable Constructive Feedback**: In addition to quantitative scores, the engine generates concrete improvement suggestions, highlighting strong points and missing technical keywords.

