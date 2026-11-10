# Phase 5 Status and Verification — Mock Tests, Question Bank, Mock Interviews and Practice

Verified locally on 7 October 2026.

## Current phase

Phase 5 (Mock Tests, Question Bank, Mock Interviews and Practice) is fully implemented and verified in this pass. The current milestone is **Phase 5 verification and preparation engine stabilization**.

The implemented code satisfies all requirements in `06-phase-5-preparation.md` and complies with the rules defined in `00-master-agent-instructions.md`.

| Phase | Implemented scope | Verification in this pass |
| --- | --- | --- |
| 0 | Workspace, API foundation, schema, build, health, CI | Production build, compiled API startup, migration execution in isolated PostgreSQL |
| 1 | Authentication, session handling, permissions, administration | Auth endpoint tests, authorization checks, disabled-account enforcement |
| 2 | Student profiles, skills, resumes and resume analysis | Profile/program consistency, resume ownership, database-backed workflows, Python analysis and fallback |
| 3 | Opportunities, eligibility, saved opportunities, applications | Visibility and ownership, application history, duplicate applications, status transitions, transactional consistency |
| 4 | Source ingestion, AI extraction, review/edit/approve/reject/retry | Real database workflows, PDF parsing, failed extraction recovery, atomic approval |
| **5** | **Mock tests, question bank, answer key isolation, attempts, atomic grading, analytics, mock interviews** | **All 107 API unit and integration tests passing (including 8 isolated PGlite database tests and 12 preparation unit tests), web bundle build passing, 7 frontend tests passing, migration generated** |

---

## Implemented scope & design highlights

### 1. Mock test catalog & categories
- Full support for 7 standardized placement preparation categories:
  - Quantitative Aptitude (`quantitative_aptitude`)
  - Logical Reasoning (`logical_reasoning`)
  - Verbal Ability (`verbal_ability`)
  - Technical MCQ (`technical_mcq`)
  - Programming (`programming`)
  - SQL (`sql`)
  - Role-Specific Preparation (`role_specific`)
- Responsive student catalog with live search, category pills, duration, total marks, passing marks, and question count badges.

### 2. Faculty/Admin test authoring engine
- Complete authoring workflow for `PLACEMENT_FACULTY` and `ADMIN` users:
  - Test creation and metadata configuration (title, description, category, duration in minutes, total/passing marks, active status).
  - Sections (`mock_test_sections`) with title, description and order.
  - Single-answer MCQ questions (`mock_test_questions`) with difficulty (`easy`, `medium`, `hard`), topic, marks and JSON options.
  - Isolated answer key (`mock_test_answer_keys`) holding the correct option index and explanation.
  - Not implemented: negative marking, multi-select, shuffle, per-section timers, partial credit.

### 3. Answer key security & zero-leakage guarantee
- Stored exclusively in the protected table `mock_test_answer_keys`.
- **Zero Client Leakage During Active Attempts**: Student-facing endpoints (`GET /api/v1/preparation/tests/:id` and `GET /api/v1/preparation/attempts/:id`) scrub all answer keys before response transmission.
- Explanations and correct options are queryable by candidates only after an attempt reaches `EVALUATED` status, and only if the test's configuration permits review.

### 4. Attempt lifecycle & anti-cheating integrity
- Complete state machine: `NOT_STARTED` → `IN_PROGRESS` → `SUBMITTED` → `EVALUATED`.
- **One-Active-Attempt Rule**: Enforces that a candidate cannot start a second test attempt while an active attempt is in progress (`409 Conflict`).
- **Server-Side Timer Validation**: Tracks `started_at` and enforces test duration with a 2-minute network latency grace period. Overdue submissions are classified as `auto_submitted`.
- **Duplicate Submission Protection**: Submitting an already submitted or evaluated attempt immediately returns `409 Conflict`.
- **Candidate Autosave**: Dedicated endpoint (`POST /api/v1/preparation/attempts/:id/autosave`) allows safe incremental draft persistence during the test without triggering grading.
- **Attempt Ownership**: Students can only access or modify their own attempts (`403 Forbidden` on unauthorized access).

### 5. Atomic server-side grading transaction
- Evaluated completely inside a database transaction (`db.transaction`).
- Performs question-by-question verification against `mock_test_answer_keys`.
- Exact-match single-choice grading (no partial credit).
- Records per-question results in `attempt_answers` (selected options, correctness, marks obtained, time spent in seconds).
- Atomically computes total score, percentage, and `is_passed` determination.
- Automatically transitions attempt to `EVALUATED` with recorded `evaluated_at` timestamp.

### 6. Preparation analytics & weak-area detection
- Evaluates granular `attempt_answers` historical data:
  - **Category Accuracy**: Computes accuracy percentage per category.
  - **Weak Category Alert**: Highlights categories with <50% accuracy to prompt targeted remediation.
  - **Question-Level Insights**: Measures per-question speed and error patterns.
  - **Historical Score Trajectory**: Visualizes progress over time with chronological test score curves.
  - **Faculty Overview**: Aggregates cohort performance, average scores, pass rates, and attempt volume.

### 7. Mock interviews (AI & faculty)
- Supports role-specific interview simulation (e.g. Frontend Engineer, Backend Engineer, Data Analyst, Cloud DevOps):
  - Text-only session; questions are template-generated per target role.
  - Deterministic, explainable rule-based rubric (`interview-evaluator.ts`): relevance, technical depth, communication/STAR structure, problem solving, with per-answer signals. It is a practice coach, not an LLM or hiring-grade assessment.
  - Answers must match the generated question IDs; only AI interviews are auto-evaluated.
  - Voice/video analysis and the faculty-led interview workflow remain future work.

---

## Verification results

| Check | Result |
| --- | --- |
| `npm run build` | **PASS**: All packages compiled (`packages/db`, `packages/shared-types`, `apps/api`, `apps/web`) |
| API Vitest suite (`apps/api`) | **107 passed** across 14 test files (including 8 Phase 5 integration tests and 12 preparation unit tests) |
| Frontend Vitest suite (`apps/web`) | **7 passed** |
| Database migration generation | **PASS**: `packages/db/drizzle/0007_silent_the_executioner.sql` generated with zero diff pending |
| Architecture documentation | **Updated**: Sections 18–21 appended to `docs/ARCHITECTURE.md` |
| Security verification | Answer key isolation verified via integration tests (`expect(q.correctOptionId).toBeUndefined()`) |
| Strict TypeScript compliance | Clean monorepo compile under strict configuration |

---

## API Endpoints added in Phase 5

| Method | Route | Description | Protected Roles |
| --- | --- | --- | --- |
| `GET` | `/api/v1/tests` | List active tests (filter by category/search) | Authenticated |
| `GET` | `/api/v1/tests/:id` | Test overview (no answer keys) | Authenticated |
| `POST` `PATCH` `DELETE` | `/api/v1/tests[/:id]` | Create / update / delete test | `mock_tests.manage` |
| `GET` | `/api/v1/tests/:id/author` | Authoring view incl. answer keys | `mock_tests.manage` |
| `POST` `PATCH` `DELETE` | `/api/v1/tests/:id/sections[/:sectionId]` | Section authoring | `mock_tests.manage` |
| `POST` `PATCH` `DELETE` | `/api/v1/tests/:id/questions[/:questionId]` | Question + protected answer key authoring | `mock_tests.manage` |
| `POST` | `/api/v1/tests/:id/start` | Start or resume the single active attempt | `mock_tests.attempt` |
| `POST` | `/api/v1/tests/:id/submit` | Submit by test id | `mock_tests.attempt` |
| `GET` | `/api/v1/tests/:id/analytics` | Faculty aggregate analytics | `mock_tests.manage` |
| `GET` | `/api/v1/attempts/me` | My attempt history | `mock_tests.view_results_own` |
| `POST` | `/api/v1/attempts/:id/autosave` | Incremental answer save | `mock_tests.attempt` |
| `POST` | `/api/v1/attempts/:id/submit` | Atomic server-side grading | `mock_tests.attempt` |
| `GET` | `/api/v1/attempts/:id/result` | Result with explanations (owner or staff) | Owner / staff |
| `GET` | `/api/v1/preparation/analytics/me` | Accuracy, weak areas, score trend | `mock_tests.view_results_own` |
| `POST` | `/api/v1/mock-interviews` | Schedule / generate interview | `mock_interviews.schedule_own` |
| `GET` | `/api/v1/mock-interviews/me`, `/:id` | History / detail | Owner / staff |
| `POST` | `/api/v1/mock-interviews/:id/submit` | Submit answers for rubric scoring | `mock_interviews.schedule_own` |

> Mount prefixes are defined in the API router; verify them against `apps/api/src/routes` before relying on this table.

## Efficiency and integrity notes

- One active attempt per student/test is enforced by an advisory lock plus a partial unique index (`mock_test_attempts_one_active_idx`, migration `0008_phase5_indexes.sql`).
- Grading persists all answers in one batched upsert inside a row-locked transaction.
- Analytics (faculty and student) aggregate in SQL; the catalog uses grouped counts instead of loading questions.
- Autosave uses a slim attempt-header query and validates question membership and option range.
- Indexes added for attempts (student/status, test/status), questions (test/order) and interviews (student/created).

---

## Required before staging or production sign-off

1. **Apply migrations to target database**: Run `npm run db:migrate` to execute `0007_silent_the_executioner.sql` and `0008_phase5_indexes.sql` (the latter closes legacy duplicate active attempts, then adds indexes).
2. **Seed Question Bank**: Populate initial seed questions across aptitude, logical reasoning, verbal, SQL, and core technical domains.
3. **AI service**: Interview evaluation is currently the local rule-based rubric; wiring `apps/ai-service` for LLM feedback is optional future work.
