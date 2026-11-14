# Phase 7 — Notices, Notifications, and Institutional Analytics

Implemented and verified against the monorepo architecture on 11 November 2026.

## Delivered Capabilities

### 1. Campus Notice Board (`/dashboard/notices`)
- **Lifecycle Management**: Complete state machine (`draft`, `scheduled`, `published`, `expired`, `archived`) with staff management controls.
- **Audience Targeting**: Flexible filtering by `roles`, `departments`, and `batches` stored in indexed JSONB (`target_audience`).
- **Pinning & Priority**: Pinned notices are pinned to the top of the feed and prioritized in queries.
- **Structured Attachments**: Supports file attachments (`name`, `url`, `size`, `mimeType`) stored as JSONB arrays with client download/preview capabilities.
- **Automated Cron Scheduling & Expiry**: Background cron tasks automatically transition `scheduled` notices to `published` when `scheduledAt <= now()`, and `published` notices to `expired` when `expiresAt <= now()`.

### 2. Multi-Channel Notification Engine
- **Persistent In-App History**: Database-backed notification storage with tracking for read/unread status and timestamps.
- **Real-Time Push via Socket.io**: Authenticated WebSocket connection verifying Supabase JWT during handshake and broadcasting events to private user rooms (`user:${userId}`).
- **User Preference Matrix**: Configurable preferences for push notifications, email notifications, and granular notification type muting (`mutedTypes`).
- **Automated Event Triggers**:
  - `new_opportunity`: When an opportunity is published.
  - `application_update`: When an application status changes (shortlisted, interview, selected, rejected).
  - `opportunity_deadline`: Automated cron alerts 24 hours prior to deadline for eligible students.
  - `test_assigned`: When tests are assigned or created for student batches.
  - `test_result_ready`: Triggered automatically on test submission and grading.
  - `notice_published`: Pushed to matching target audience when notices go live.
  - `roadmap_reminder`: Automated cron alerts for students with active roadmap stages pending > 7 days.
- **Email Delivery Fallback**: Resilient Nodemailer integration supporting SMTP environment variables with an automatic mock console logger fallback for test/dev environments.

### 3. Role-Based Analytics & Reporting (`/dashboard/analytics`)
- **Student Analytics**:
  - Profile completion percentage & breakdown.
  - Best ATS resume score from verified analyses.
  - Preparation metrics: tests attempted, average score, passed tests.
  - Career roadmap progress percentage and completed stage count.
  - Application pipeline: submitted, under review, shortlisted, interviewed, selected.
- **Faculty & Coordinator Analytics**:
  - Opportunity publishing statistics (active, closed, total).
  - Institution-wide application funnel visualization.
  - Assessment participation volume, average score, and pass rates.
  - Departmental student readiness comparisons.
  - In-demand skill requirements across posted opportunities.
- **Administrative Analytics**:
  - Total users breakdown by role (`STUDENT`, `PLACEMENT_FACULTY`, `DEPARTMENT_COORDINATOR`, `ADMIN`).
  - Student enrollment breakdown by department and graduating batch.
  - Placement rate calculation (selected candidates vs total eligible student cohort).
  - Notification delivery throughput and system adoption metrics.
- **Historical Snapshots**: Scheduled aggregation cron persists daily snapshots into `analytics_snapshots` for historical and semester-level trend analysis.

---

## Schema & Migration

Applied migration `0012_phase7_notices_notifications_analytics.sql`:
- **Enums**:
  - Created `notice_status_enum` (`draft`, `scheduled`, `published`, `expired`, `archived`).
  - Updated `notification_type_enum` with `'opportunity_deadline'`, `'test_assigned'`, `'test_result_ready'`, `'roadmap_reminder'`.
- **Tables Modified / Added**:
  - `notices`: Added `status`, `published_at`, `attachments` JSONB columns, and GIN/B-tree performance indexes.
  - `notifications`: Performance composite indexes on `(user_id, is_read)` and `(created_at)`.
  - `notification_preferences`: Schema for channel settings and muted types.
  - `analytics_snapshots`: Schema for daily/weekly/monthly aggregate metric snapshots.
- **Migration Journal**: Registered as entry 12 in `packages/db/drizzle/meta/_journal.json`.

---

## API Endpoints

All endpoints are prefixed with `/api/v1` and wrapped in standard API success/error envelopes:

| Endpoint | Method | Role / Permission | Description |
|---|---|---|---|
| `/notices` | GET | Authenticated | List published notices targeting the current student |
| `/notices/manage` | GET | `notices.create` | Manage all notices for faculty/staff |
| `/notices` | POST | `notices.create` | Create a new draft/scheduled/published notice |
| `/notices/:id` | GET | Authenticated | Get notice details |
| `/notices/:id` | PUT | `notices.create` | Update notice content or targeting |
| `/notices/:id/publish` | PATCH | `notices.create` | Manually publish a notice |
| `/notices/:id/pin` | PATCH | `notices.create` | Toggle notice pinned status |
| `/notices/:id/expire` | PATCH | `notices.create` | Manually expire a notice |
| `/notifications` | GET | Authenticated | Get user's notification list (paginated, unread filter) |
| `/notifications/unread-count` | GET | Authenticated | Get real-time unread count for badge |
| `/notifications/:id/read` | PATCH | Authenticated | Mark specific notification as read |
| `/notifications/read-all` | POST | Authenticated | Mark all user notifications as read |
| `/notifications/preferences` | GET | Authenticated | Get user's notification preferences |
| `/notifications/preferences` | PUT | Authenticated | Update channel preferences and muted types |
| `/analytics/student` | GET | Authenticated | Get personal student career & preparation metrics |
| `/analytics/faculty` | GET | Faculty / Admin | Get cohort and opportunity funnel analytics |
| `/analytics/admin` | GET | Admin | Get institutional placement and system analytics |

---

## Verification & Test Results

1. **Full Monorepo Build**:
   - `@career-portal/shared-types`: `tsc` + `tsc-alias` exit code 0.
   - `@career-portal/db`: `tsc` + `tsc-alias` exit code 0.
   - `@career-portal/api`: `tsc` + `tsc-alias` exit code 0.
   - `@career-portal/web`: `tsc -b` + `vite build` exit code 0.
2. **Backend API Test Suite**:
   - 20 test files executed, **151 tests passed, 0 failures**.
   - Includes `phase7-migration.test.ts` verifying journal entry 12 against PGlite.
   - Includes `phase7.integration.test.ts` (15 tests covering notice targeting, staff management, pinning, expiring, persistent notifications, unread counts, mark as read, ownership security, preference muting, cron tasks, student/faculty/admin analytics).
3. **Web Frontend Test Suite**:
   - 3 test files executed, **16 tests passed, 0 failures**.
   - Includes `notices-api.test.ts` verifying API client methods and payload structure.

