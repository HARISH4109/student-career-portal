# Phase 6 — Career Roadmaps, Learning Resources, and Skill Gaps

Implemented and activated against the configured local PostgreSQL database on 2 November 2026. Remote production deployment has not been performed.

## Local activation completed

- Backed up the database before migration to `.local-backups/pre-phase6-2026-11-02.dump` (git-ignored); PostgreSQL verified the backup archive inventory.
- Applied migrations 0010 and 0011 successfully; the database now has twelve journal entries. Migration 0010 tolerates the existing Phase 5 interview-template table, equivalent manually named foreign key, and index.
- Seeded ten published careers with forty stages and ten learning resources using the sole existing active faculty account. Saved its UUID in local `CAREER_SEED_STAFF_USER_ID`; no account was created.
- Granted the Phase 6 permissions to existing roles and invalidated user-permission cache entries without flushing other Redis data. Used targeted setup to avoid inserting unrelated demo opportunities.
- Enabled RLS on all ten Phase 6 catalog/student/audit tables. This PostgreSQL instance has neither `auth.uid()` nor Supabase's `authenticated` role, so Supabase owner policies were correctly skipped. Express connects using the existing privileged service role and enforces ownership; unprivileged database roles have no policies granting access. Existing PUBLIC table grants were checked and none were present.
- Started the API on port 4000 and web application on port 5173. API health returns 200 with database and Redis both healthy; unauthenticated career-catalog requests return 401.
- Verified all ten paths and forty stages through the real database-backed service, including required skills/resource links, and verified ten resources have skill/career links. No student roadmaps, skills, or analysis history were changed for this readiness check.
- Open `http://localhost:5173/dashboard/careers`. Sign out and back in if an existing browser session still has the old navigation permissions. A real authenticated browser journey was not run during activation.

Operational helpers: `scripts/phase6-preflight.mjs` inspects configuration/schema without exposing credentials; `scripts/phase6-setup.ts` seeds the catalog and permissions; `scripts/phase6-access.mjs` applies environment-appropriate RLS; `scripts/phase6-check.ts` verifies catalog and app readiness. Run the TypeScript helpers using `npx tsx --tsconfig apps/api/tsconfig.json` and the script path, from the repository root; prefix shell commands with `rtk` per workspace instructions. All helpers use the configured root environment. The setup and access helpers can be rerun without duplicating seeds, role grants, or policies.

## Delivered behavior

- Career catalog and staff editor with ordered active/inactive stages, canonical skill requirements, target proficiency, linked resources, and project/practice activities.
- Ten starter careers, each with four stages, official documentation links, and practical activities. Seeding requires an explicit existing active faculty/admin UUID and preserves staff edits on repeated runs.
- One active student roadmap, enforced by a partial unique index and student-row transaction lock. Starting the same active career is idempotent; switching archives previous progress. Roadmaps snapshot template content and resource titles/URLs.
- Student-confirmed completion, reopening, progress percentages, current stage, dates, and read-only archived history.
- Searchable, paginated resource library, relational skill/career tags, difficulty, staff editing/deactivation, and private 0/50/100 progress.
- Career and opportunity skill-gap analyses, immutable history, proficiency comparison, optional opportunity skills, and deterministic next actions with explanations.
- Evaluated assessment answers match normalized exact skill names; unmatched topics are shown separately. Accuracy below 60% flags practice needs. Profile skills stay student-controlled.
- Protected dashboard routes, mobile layouts, opportunity analysis entry point, and corrected dashboard placeholder text.

## Setup and migration

From the repository root, use `rtk npm run db:migrate` to apply journal entries 0010 and 0011. These also capture the previously unmigrated Phase 5 interview-template table. The migration assumes existing schema changes were applied through the journal; if a database was manually changed with schema push, reconcile its migration history before applying.

Migration 0010 archives all but the newest legacy active roadmap. It keeps the latest progress row per student/resource and copies duplicate rows to `phase6_legacy_resource_progress`; no history is silently discarded. Migration 0011 adds catalog/opportunity/resource reference constraints. Existing orphan references must be reconciled if present.

Set `CAREER_SEED_STAFF_USER_ID` in the root environment to an existing active faculty/admin UUID, then run `rtk npm run db:seed`. Without this value, the career seed is skipped with an explicit message; base permissions and other existing seeds still run. Permission seeding now reads the full role/permission sets after insertion, including during upgrades. Refresh signed-in sessions after reseeding permissions; if permissions are cached, clear the existing user-permission cache as part of deployment.

For Supabase browser access, apply `packages/db/rls/002_phase6.sql` after migrations using the existing administrative SQL workflow. It enables owner-only reads on student data and denies browser writes; validated writes go through Express. This SQL expects Supabase's `authenticated` role and `auth.uid()` and is applied once, separately from the portable PGlite tests.

Restart the API and web application after migration/seeding. Local activation is recorded above; no new privileged account or remote deployment was created.

## Interfaces

All endpoints use `/api/v1` and the existing success/error envelopes. Catalog list responses carry standard pagination metadata. Shared request schemas reject malformed identifiers, unknown request fields, invalid links, and conflicting analysis targets.

| Endpoint | Behavior |
| --- | --- |
| `GET/POST /career-paths`, `GET/PUT /career-paths/:id` | Read catalog; staff create/replace a template |
| `GET /roadmaps/me`, `POST /roadmaps`, `GET /roadmaps/:id` | Private history, start/switch, detail |
| `PATCH /roadmaps/:id/stages/:stageId` | Complete/reopen an owned stage |
| `GET/POST /resources`, `GET/PUT /resources/:id` | Resource catalog and staff management |
| `PATCH /resources/:id/progress` | Set authenticated student's resource status |
| `POST /skill-gap`, `GET /skill-gap/me`, `GET /skill-gap/:id` | Create analysis, list history, retrieve private snapshot |

Staff use `career_paths.manage` and `resources.manage`; students use existing `roadmaps.manage_own`, `skill_gap.analyze_own`, and `resources.view` permissions. Catalog deactivation uses the editor's published/active fields; there are no destructive delete endpoints.

## Verification and limits

- Full production build passed across shared types, database, API, and web.
- Full API suite: 133 passed across 18 files, including the legacy-upgrade and opportunity cases.
- Existing web unit suite: 11 passed.
- Focused Phase 6 browser tests: 2 passed in Edge, covering staff career authoring and a mobile student start/complete/analyze flow. Browser API responses are isolated fixtures; real backend ownership, switching, resource progress, assessment evidence, and seed behavior are covered by PGlite HTTP tests.
- Full browser regression suite: 5 passed, including the three existing authentication/draft-review checks. Use `PLAYWRIGHT_PORT` to select an available isolated port when the default is occupied.
- Legacy Phase 5 to Phase 6 migration test passed with duplicate roadmap/progress fixtures and audit preservation.
- Repository-wide lint remains blocked by existing errors in opportunity, preparation, and resume code. Targeted Phase 6 ESLint check: zero errors.
- Supabase RLS execution, live account/session refresh, external-resource availability beyond the initial MDN/Node documentation checks, and a live full student journey remain deployment checks. The UI/UX skill's optional generator script was absent; its accessibility and consistency guidance was applied directly.

Staff editor selection lists currently load up to 100 careers/resources. Student catalogs have pagination. Assessment evidence aggregates all evaluated answers and does not infer proficiency or perform fuzzy topic matching. Catalog resources are links; completion is self-reported, without external course verification. Recommendations run synchronously with analysis and do not require an LLM or a background worker.
