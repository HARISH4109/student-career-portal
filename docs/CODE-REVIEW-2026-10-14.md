# Code review and fixes — 14 October 2026

Reviewed the API, web app, shared types, database schema and migrations, Python AI
service, automated tests, and container configuration. The initial production
build passed, but ESLint reported 296 errors and 345 warnings. An API test hook
also timed out during concurrent checks; the full API suite passed on subsequent
runs without increasing its timeout.

## Fixes

- Assessment start failures now show an error instead of an endless loading screen.
- The assessment countdown follows its start-time deadline, including after a
  background-tab pause. Expired resumed attempts submit automatically, submission
  stays outside React state-updater functions, and repeated submissions are guarded.
  Failed submissions expose a retry action; failed answer clearing resets save state.
- The test catalog now applies page size and offset to its database query.
  Pagination, category, status, and search parameters are validated. Submission
  through the test route validates the attempt UUID instead of converting a
  missing identifier into the string `undefined`.
- Mock interview repository inputs and JSON fields now have explicit types.
  The optional question answer-key relation is modeled from its actual foreign
  key direction. No SQL migration is required for these schema typing changes.
- Fixed unsafe types, unhandled promise expressions, misleading void returns,
  redundant conditions, and template expressions across API and frontend modules.
  Existing lint rules remain enabled.
- Python resume endpoints consistently require the internal service token,
  including development mode, and reject empty configured secrets. The shared
  authentication dependency compares token bytes with `compare_digest`.
- Updated the browser regression test to use the current approval button name.
- Docker Compose now maps the web port to Nginx port 80, supplies frontend build
  settings, uses service DNS names for Redis and the AI service, and avoids mounts
  that hide compiled application files. Compose defaults to its Postgres service;
  `DOCKER_DATABASE_URL` allows an external database. README documents this choice.

## Verification

| Check | Result |
| --- | --- |
| Full production build | Passed for shared types, database package, API, and web |
| Compiled API startup smoke test | Passed under plain Node |
| API unit and database integration tests | 109 passed |
| Frontend unit and assessment regression tests | 11 passed |
| Playwright browser tests | 3 passed |
| Python tests | 11 passed |
| Python Ruff | Passed |
| Python mypy | Passed for 14 source files |
| ESLint | Zero errors; nonblocking style warnings remain |
| Docker Compose configuration | Passed |

The browser and database integration tests use isolated fixtures and an in-memory
PostgreSQL-compatible database. Live Supabase, SMTP, n8n, and paid AI provider
integrations were not exercised. Docker container builds and startup were not
verified because the Docker Desktop Linux engine is not running.

This folder has no Git repository metadata. Original TypeScript source files
captured before fixes are retained under `.maintenance/review-originals`; the
machine-readable lint results are in `.maintenance/review-lint.json`.
