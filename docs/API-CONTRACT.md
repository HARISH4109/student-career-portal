# Phase 12 — API Contract and Integration Specification

## Base URL

`/api/v1`

OpenAPI 3.1.0 specification is served at:
- `GET /api/v1/openapi.json`
- `GET /api/v1/docs` (Swagger UI)

## Response Envelope

### Success

```json
{
  "success": true,
  "data": {},
  "error": null,
  "meta": {
    "requestId": "..."
  }
}
```

Paginated list responses include `page`, `pageSize` (default `20`, max `100`), `totalItems`, and `totalPages` in `meta`.

### Error

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "NOT_FOUND",
    "message": "Opportunity not found",
    "details": {}
  },
  "meta": {
    "requestId": "..."
  }
}
```

### Canonical Error Codes

- `VALIDATION_ERROR` (422)
- `UNAUTHORIZED` (401)
- `FORBIDDEN` (403)
- `NOT_FOUND` (404)
- `CONFLICT` (409)
- `RATE_LIMITED` (429)
- `INTERNAL_ERROR` (500)

## Canonical Endpoint Groups

- **Auth / Users**: `GET /auth/me`, `PATCH /users/me`
- **Students**: `GET /students/me`, `PATCH /students/me`, `GET /students/:id`
- **Resumes**: `GET /resumes`, `POST /resumes`, `GET /resumes/:id`, `PATCH /resumes/:id`, `DELETE /resumes/:id`, `POST /resumes/:id/analyze`
- **Opportunities**: `GET /opportunities`, `POST /opportunities`, `GET /opportunities/:id`, `PATCH /opportunities/:id`, `POST /opportunities/:id/publish`, `POST /opportunities/:id/close`, `DELETE /opportunities/:id`
- **Applications**: `POST /opportunities/:id/applications`, `GET /applications/me`, `GET /applications/:id`, `POST /applications/:id/withdraw`, `PATCH /applications/:id/status`
- **AI Extraction**: `POST /extraction/sources`, `GET /extraction/drafts`, `GET /extraction/drafts/:id`, `PATCH /extraction/drafts/:id`, `POST /extraction/drafts/:id/approve`, `POST /extraction/drafts/:id/reject`, `POST /extraction/runs/:id/retry`
- **Preparation**: `GET /tests`, `POST /tests`, `GET /tests/:id`, `POST /tests/:id/start`, `POST /tests/:id/submit`, `GET /attempts/:id/result`
- **Career / Resources**: `GET /career-paths`, `POST /roadmaps`, `GET /roadmaps/:id`, `GET /resources`, `POST /resources`, `GET /skill-gaps/me`, `POST /skill-gaps/analyze`
- **Notices / Notifications**: `GET /notices`, `POST /notices`, `POST /notices/:id/publish`, `GET /notifications`, `PATCH /notifications/:id/read`
- **Admin**: `GET /admin/users`, `PATCH /admin/users/:id/status`, `GET /admin/audit-logs`, `/academic/*` CRUD
