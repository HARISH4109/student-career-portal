# Phase 8 — Administration, Audit, Security Hardening, and Governance

Implemented and verified against the monorepo architecture on 14 November 2026.

## Delivered Capabilities

### 1. Centralized Audit Logging, Origin & Request Correlation (`/admin` Audit Tab)
- **Immutable Audit Trail**: Append-only storage in `audit_logs` tracking actor identity, action type, target resource, JSONB metadata, IP address, user agent, request correlation ID (`request_id`), and provenance (`origin`).
- **Distributed Request Correlation via AsyncLocalStorage**:
  - Automatically captures `x-request-id`, client `origin`, `ipAddress`, and `userAgent` inside Express request context storage (`requestContextStorage`).
  - Automatically enriches any `auditService.log` call across the request lifecycle without requiring manual parameter threading.
- **System-Wide Domain Auditing (Beyond Opportunity Drafts)**:
  - **Authentication**: `auth.login`, `auth.logout`, `auth.registered`, `auth.password_reset_requested`.
  - **Notices & Communication**: `notice.created`, `notice.published`, `notice.pinned`, `notice.expired`.
  - **Student Applications**: `application.submitted`, `application.withdrawn`, `application.status_changed`.
  - **Opportunities**: `opportunity.created`, `opportunity.updated`, `opportunity.published`, `opportunity.closed`, `opportunity.draft_submitted`, `opportunity.draft_approved`, `opportunity.draft_rejected`.
  - **Resumes & ATS**: `resume.created`, `resume.uploaded`, `resume.deleted`, `resume.ai_analyzed`.
  - **Preparation & Assessments**: `test.created`, `test.attempt_submitted`, `interview.ai_evaluated`.
  - **Academic Taxonomy**: `academic.course_created`, `academic.course_updated`, `academic.course_deactivated`, `academic.stream_created`, `academic.stream_updated`, `academic.stream_deactivated`.
  - **RBAC & Governance**: `user.role_assigned`, `user.role_revoked`, `user.activated`, `user.deactivated`.
- **Admin Audit Viewer**: Interactive frontend viewer with server-side pagination, date range filtering, action filtering, entity type filtering, origin filtering, actor search, quick "Copy Request ID" buttons, and JSON payload modal inspection.

### 2. Single-Department Academic Taxonomy (`/admin` Academic Tab)
- **Single-Department Institutional Alignment**: Configured specifically for a single department (Computer Science & Engineering). Rather than redundant multi-department routing, the academic taxonomy centers on:
  - **Degree Courses & Programs**: B.Tech CSE, MCA, M.Tech Data Science, Ph.D, with degree levels (Bachelors, Masters, Doctoral) and duration in years.
  - **Specialization Streams**: AI & ML, Cybersecurity, Cloud Systems, Full Stack Systems, filtered by parent degree course.
  - **Graduating Batches**: Class of 2024, Class of 2025, Class of 2026, Class of 2027.
- **Administrative CRUD & Validation**: Create, edit, and deactivate degree courses and specialization streams with audit trail recording.

### 3. Comprehensive AI Workload & Microservice Observability (`/admin` AI Jobs & Diagnostics)
- **Unified AI Job & Microservice Logs (`ai_job_logs` + `ai_extraction_runs`)**:
  - Centralizes logging of all AI workloads across the platform: opportunity ingestion (`n8n` webhook), resume ATS scoring, STAR bullet text enhancement, opportunity matching, and AI mock interview evaluations.
  - Captures error messages, execution duration, task type, service name, model used, payload preview, correlation request ID, and metadata.
  - Frontend includes task type filtering across all workloads with dedicated failure diagnosis.
- **Accurate Multi-Agent Diagnostics Probe (`/api/v1/admin/health`)**:
  - Differentiates between the local FastAPI Core AI Microservice (Resume & Opportunity Matching) and the external Opportunity Extraction Agent (n8n Webhook / Cloudflare Tunnel).
  - Explicitly diagnoses whether the external extraction agent is connected, unconfigured, or offline. If the external extraction webhook is disconnected, the system status correctly reflects "Degraded Performance" while confirming that the core database, Redis, and resume analysis engines remain operational.

### 4. Administrator Self-Protection & Lockout Prevention
- **Self-Deactivation Guard**: Prevents an administrator from deactivating their own account.
- **Self-Demotion Guard**: Prevents an administrator from revoking their own `ADMIN` role.
- **Sole Administrator Protection**: Verifies that the platform always retains at least one active administrator, preventing catastrophic accidental administrative lockouts.

### 5. Streamlined Security Audit Logs & Cohort Analytics
- **Clean Audit Logs UI**: Removed unnecessary raw IP / Network Origin columns and dropdown filters from the main audit logs table, focusing on high-value governance indicators: Timestamp, Security Action, Target Entity, Actor, Request ID, and Detail Modal.
- **Streamlined Faculty Placement Analytics**:
  - Removed departmental cohort progression cards from the faculty view to eliminate redundancy with the administrative dashboard.
  - Replaced the previous competency list with a high-impact **Campus Placement Conversion & Hiring Health** matrix displaying:
    - **Placement Conversion Rate**: % of active candidate applicants who secured verified placement offers.
    - **Interview Clearance Rate**: % of candidates advancing from interview stages to confirmed selections.
    - **Initial Screening Clearance**: Resume screening pass rate.
    - **Candidate Milestone Standing**: Segmented counts for Confirmed Placement Offers, Active Interview Rounds, Assessment & Screening Pool, and Diagnostic Drive-Ready Pool.
    - **Faculty Operational Takeaway**: Dynamic actionable guidance based on current recruitment pipeline metrics.
- **Removed Redundant Administration Shortcuts**: Stripped repetitive action buttons from both Faculty and Admin Analytics views, restoring clean, standalone data reporting.
- **Single-Department Institutional Telemetry**: Retained authoritative degree course breakdown (B.Tech CSE, MCA, M.Tech Data Science) with student enrollment counts and diagnostic readiness percentages.

### 5. Security Hardening & Guardrails
- **SSRF Defense (`SsrfGuard`)**:
  - Protocol whitelist: HTTP and HTTPS only.
  - Port restrictions: Ports 80 and 443 only.
  - IP and Hostname Blacklist: Blocks loopback (`127.0.0.1`, `::1`, `localhost`), RFC 1918 private IPv4 networks (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), IPv6 link-local and unique-local ranges (`fc00::/7`, `fe80::/10`), and cloud metadata services (`169.254.169.254`, `metadata.google.internal`).
- **File Upload Security (`FileValidator`)**:
  - Size enforcement (5 MB limit).
  - Strict MIME type verification (`application/pdf`, DOCX, plain text).
  - Extension-to-MIME consistency checks against disguised payloads.
  - Path sanitization blocking directory traversal attacks (`../`, null bytes).
- **AI Input Guardrails (`AiInputGuard`)**:
  - Length truncation protecting against context window stuffing and denial-of-wallet.
  - Control character and null byte stripping.
  - Prompt injection detection heuristics flagging suspicious jailbreak instructions.
- **Specialized AI Endpoint Rate Limiting**:
  - Enforces 20 requests per 15-minute sliding window per user on AI extraction and resume enhancement routes.

---

## Schema & Migration

Applied migrations:
- `0016_phase8_audit_security.sql`: Added `request_id` (varchar 64) and B-tree indexes to `audit_logs`.
- `0017_audit_origin_and_ai_job_logs.sql`:
  - Added `origin` column (varchar 255) to `audit_logs`.
  - Created `ai_job_logs` table (`id`, `service_name`, `task_type`, `model_used`, `error_message`, `duration_ms`, `request_id`, `origin`, `payload_preview`, `created_at`) with performance indexes.
  - Registered in `packages/db/drizzle/meta/_journal.json`.

---

## Verification & Test Results

1. **Full Monorepo Build**:
   - `@career-portal/shared-types`: Exit code 0 (`tsc` + `tsc-alias`).
   - `@career-portal/db`: Exit code 0 (`tsc` + `tsc-alias`).
   - `@career-portal/api`: Exit code 0 (`tsc` + `tsc-alias`).
   - `@career-portal/web`: Exit code 0 (`tsc -b` + `vite build`).
2. **Backend API Test Suite**:
   - 23 test suites executed, **188 tests passed, 0 failures**.
   - Includes `phase8.integration.test.ts` (20 tests) covering request ID correlation, origin tracking, failed AI jobs query, admin self-protection, SSRF blocker, AI guardrails, file validation, and single-department course programs.
   - Includes `academic-crud.integration.test.ts` (12 tests) covering academic taxonomy operations.
3. **Frontend Web Test Suite**:
   - 4 test suites executed, **20 tests passed, 0 failures**.
4. **Total Monorepo Tests**:
   - **208 passed tests across 27 suites**.
5. **Production Smoke Test**:
   - `scripts/production-smoke.cjs`: Exit code 0 (compiled API starts with plain Node.js and serves protected routes).
