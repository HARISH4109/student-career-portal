# Phase 0–3 stabilization

Historical baseline from the start of stabilization. The owner subsequently implemented Phase 4 in another task and authorized review of the combined project. See [the current Phase 0–4 report](PHASE-0-4-STATUS.md) for completed fixes, test evidence and remaining deployment gates. The unchecked baseline below is superseded by that report.

## Baseline

- Production build compiles, but the API cannot start because emitted imports retain TypeScript aliases.
- Existing tests: 50 API, 5 web, 2 Python; browser workflows are not covered.
- Source lint: 1,091 errors, 361 warnings before fixes.
- Redis was unavailable during the initial health check.
- No Git metadata is present in this directory. Source backup: `phase3-before-fixes.zip`.

## Acceptance checklist

- [ ] Production API starts using the documented command.
- [ ] Lint, TypeScript builds, and existing tests pass.
- [ ] Sign-in, session hydration, sign-out, reset redirects, and disabled accounts are handled correctly.
- [ ] Student profiles and resumes enforce ownership and validate input.
- [ ] Opportunities enforce visibility, owner/admin editing, valid deadlines, and consistent eligibility.
- [ ] Applications prevent duplicates, enforce eligibility and ownership, and record valid status transitions atomically.
- [ ] Invalid input and infrastructure failures return useful errors.
- [ ] Core browser flows have automated coverage.
- [ ] Database migrations and constraints are verified in an isolated environment.
- [ ] CI and Docker configuration match the working build.
- [ ] Remaining environment requirements and verification limits are documented.

This checklist records evidence; unchecked items must not be described as complete.
