# Phase 0–4 status and verification

Verified locally on 24 September 2026.

## Current phase

Phase 4 (AI opportunity ingestion and faculty review) is implemented and included in this stabilization pass. Phase 5 has not been started. The current milestone is **integrated staging verification of Phases 0–4**.

The implemented code passes the checks below. This is not a claim that every possible input or live deployment is error-free. Live services, migration rollout, and Docker images still need the environment checks listed below.

| Phase | Implemented scope | Verification in this pass |
| --- | --- | --- |
| 0 | Workspace, API foundation, schema, build, health, CI | Production build, compiled API startup, migration execution in isolated PostgreSQL, lint and dependency audit |
| 1 | Authentication, session handling, permissions, administration | Auth endpoint tests, authorization checks, disabled-account enforcement, login error browser test, sign-out race regression |
| 2 | Student profiles, skills, resumes and resume analysis | Profile/program consistency, resume ownership, database-backed workflows, Python analysis and fallback tests |
| 3 | Opportunities, eligibility, saved opportunities, applications | Visibility and ownership, application history, duplicate applications, status transitions, deadline/compensation validation and transaction rollback |
| 4 | Source ingestion, AI extraction, review/edit/approve/reject/retry | Real database workflows, PDF parsing, failed extraction recovery, edit persistence, atomic approval, browser save-failure guard |

## Important fixes

### Foundation and authentication

- Compiled Node imports now resolve without a TypeScript runtime loader.
- Browser API URLs no longer accidentally repeat `/api/v1`.
- Sign-in persists the Supabase session; sign-out clears cached user data.
- A profile request that finishes after sign-out cannot restore authentication.
- Password reset redirects use `WEB_BASE_URL`.
- Role and disabled-account checks use current database state.
- Validation errors and wrapped database constraint errors return consistent client errors.
- Sensitive authorization and cookie headers are redacted from logs.

### Profiles, resumes and applications

- Student programs must belong to the selected department.
- Resume ownership and primary-resume changes are protected; resumes used by applications cannot be deleted.
- Application creation and history writes are transactional; duplicates and stale status changes are rejected.
- Staff application updates enforce opportunity ownership or administrator access.
- Students cannot save unpublished opportunities.
- Opportunity creation/editing now keeps its skills and eligibility changes in the same transaction.
- Invalid compensation ranges and expired publication deadlines are rejected.
- Administrator role filtering happens before pagination, so totals and pages agree.
- Resume enhancement fallbacks preserve supplied facts instead of inventing achievements or percentages. Python tests cannot use developer AI credentials.

### Phase 4 ingestion and review

- Work mode, application URL and contact email survive extraction, editing and approval, including clearing a contact field.
- Failed extractions create a visible draft that can be retried.
- Retry claims are transactional; a second retry cannot start against the same failed run. Approval cannot race an active extraction.
- Approval locks the draft and atomically writes the opportunity, skills, eligibility, review result and audit event. Failed writes roll back.
- Reviewed skill names and structured department/batch/CGPA eligibility are resolved into actual database relations. Unknown department codes or graduation years require correction.
- PDF uploads are parsed into text before AI extraction. Unreadable, encrypted, blank/scanned or oversized PDFs return actionable errors. A scanned page can be uploaded as an image instead.
- Source hashes have a database uniqueness constraint for newly ingested content; upload metadata is retained for retries.
- Duplicate matching examines all matching-title candidates, escapes SQL wildcard characters and surfaces database failures.
- Queue entries no longer claim “none detected” when duplicate matching has not run.
- Failed saves stop frontend approval. Longer extraction requests have a matching client timeout.
- Fractional confidence scores and compensation ranges expressed in lakhs are normalized.

## Verification results

| Check | Result |
| --- | --- |
| `npm run build` | Pass: shared types, database package, API and frontend |
| ESLint over all application/shared source | **0 errors**, 262 non-blocking warnings: explicit return types and console usage |
| API Vitest suite | **84 passed**, including 15 database workflow checks and 3 real PDF parsing checks |
| Frontend Vitest suite | **6 passed** |
| Playwright browser suite | **3 passed**: guest redirect, login error, failed save blocks approval |
| Python pytest | **4 passed**: analysis, matching, factual fallback, internal-token enforcement |
| Python Ruff | Pass |
| Python mypy | Pass: 14 source files |
| `npm audit` | **0 reported vulnerabilities**, including development dependencies |
| Compiled API startup | Pass with plain Node and `NODE_ENV=production`; protected endpoint returns the expected 401 envelope |
| Database migration generation | No ungenerated schema changes |

The database tests execute the migration journal against an isolated PGlite PostgreSQL engine. Authentication and AI responses are controlled test fixtures. Browser tests use controlled API responses. These checks do not establish that real Supabase, Redis, n8n, email delivery, or an external LLM is healthy.

The frontend core production chunk is approximately 369 KB, with React and Supabase in separate cacheable chunks. The build no longer reports the large-chunk warning. This is a bundle measurement, not a measured improvement in page-load time.

## Required before staging or production sign-off

1. **Apply the reviewed migration to the intended database:** `npm run db:migrate`. New migration: `packages/db/drizzle/0006_blushing_argent.sql`. It adds `content_hash`, `file_name`, `mime_type` and the source-hash uniqueness constraint. It was tested in isolation and has **not** been applied to your configured live database. Existing historical sources keep null hashes; the new uniqueness protection applies to new ingestions.
2. Configure `WEB_BASE_URL`, CORS origins, Supabase browser/server settings, the AI service token and `N8N_EXTRACTION_WEBHOOK_URL`. Verify Supabase allows the intended password-reset redirect.
3. Start the database, Redis, API, frontend and AI service. The final check found no reachable local API on port 4000, so live dependency health is not certified.
4. Perform a staging run with real student/faculty accounts: sign-in/reset/sign-out, create a profile/resume, ingest representative text/URL/image/PDF sources, review, publish and apply. Verify actual n8n response quality and failure handling.
5. Run the Docker image builds. The local Docker daemon was unavailable. Docker/CI configuration was corrected, migration files are included in the API image, and CI now includes browser tests and the production startup check; the remote CI run itself was not observed.

No live database migration, deployment, or next-phase work was performed in this pass.

## Useful additions for the next agreed scope

- Background ingestion jobs with progress updates and recovery after a server restart; extraction currently runs within a request.
- Explicit currency/pay-period fields and configurable eligibility policies, based on your personalized requirements.
- Broader staging browser coverage for all role combinations, responsive layouts, keyboard navigation and resume export/printing.
- OCR for complete scanned PDFs, if uploading individual page images is insufficient.
- Persisted duplicate decisions, historical source-hash backfill, retention rules and richer review audit history.
- Load testing, monitoring and backup/restore exercises before a public launch.

These are recommendations or deployment gates, not features claimed as completed. Preserve the current phase boundary until the personalized next-phase requirements are provided.
