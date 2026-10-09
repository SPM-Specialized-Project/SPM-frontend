# Existing backend API inventory

The API is a small Node `http` server with JSON-file persistence. These paths describe the inspected implementation, not a promise of stable/versioned production contracts. The base path is `/api`; Vite's development proxy is not part of a mobile deployment.

## Common behavior

- `GET /api/health` and `POST /api/auth/login` are public. `OPTIONS` receives 204.
- Other routes require a bearer token resolved by the in-memory session map; invalid/expired session yields 401. A non-active account is rejected.
- `POST /api/auth/login` accepts email/password, rejects invalid credentials with 401 and inactive accounts with 403 (`ACCOUNT_LOCKED`). Seed fixtures exist; their secrets must not be copied into client docs, builds or screenshots.
- `GET /api/auth/me` resolves the current session/user. Sessions expire after eight hours and are invalidated by backend process restart. No refresh/revoke/logout API was found.
- Responses and error envelopes vary by route. Most resource handlers use generic JSON-shaped `item`/`patch` bodies rather than a versioned schema.
- Data is written to JSON files. This provides no evidence of transactional concurrency guarantees, production backup policy or multi-instance consistency.

## Core endpoints observed

| Method/path | Current behavior and constraints |
|---|---|
| `GET /api/courses` | Role-filtered course catalog. Admin/coordinator/chairman see all; lecturer sees assigned/owned; student sees active memberships. |
| `GET /api/courses/:id/detail` | Returns course and detail object; detail content is synthesized/static in backend code rather than proof of production course content. Access is based on course membership/assignment, with manager/admin exceptions. |
| `GET /api/classrooms/:id/memberships` or `/api/courses/:id/memberships` | Returns roster, viewer role, permissions, available students and metadata. An active student can view complete roster read-only; assigned lecturer and managers have broader access. |
| `POST /api/courses/:id/memberships` | Lecturer add/reactivate by `studentEmail`; response is resource-oriented. |
| `PATCH /api/courses/:id/memberships/:membershipId` | Lecturer membership status update (`ACTIVE`/`REVOKED`); `DELETE` revokes. Exact route aliases should be verified against handler before client implementation. |
| `GET /api/courses/:id/submissions` | Optional assignment/student filters. Student sees own submissions; assigned lecturer sees course submissions. Admin/coordinator behavior is not uniformly available. |
| `PATCH /api/submissions/:id` | Lecturer updates score/feedback; student may update own submitted timestamp/file URL. No multipart/file-upload endpoint was found. |
| `GET /api/sessions?courseId=` | Role-filtered sessions. Student restricted to active classroom membership; lecturer to own; coordinator/chairman broader. |
| `POST /api/sessions` | Lecturer/coordinator/chairman create using `{ item }`; lecturer must be assigned. |
| `PATCH /api/sessions/:id`, `DELETE /api/sessions/:id` | Role/ownership-checked generic patch/delete. |
| `GET /api/registrations?registrationType=` | Lists student or tutor/lecturer registration records. |
| `POST /api/registrations` | `{ registrationType, item }`; self-service student/lecturer requests and manager creation paths. `tutor` is normalized as legacy alias to `lecturer`. |
| `PATCH /api/registrations/:id`, `DELETE /api/registrations/:id` | Status/update/delete paths with role and ownership checks. |
| `GET/POST /api/course-requests` | Coordinator/chairman create/list course requests; managers patch/delete subject to ownership/policy. |
| CodePulse `/api/codepulse/*` | Dedicated term/classroom/assignment/lab/workspace endpoints summarized in [contract map](../05-api-integration/contract-map.md). |

## Current API does not establish these capabilities

- Refreshable/revocable auth sessions, password reset, MFA, managed OAuth, SSO or secure account recovery.
- Profile read/update, course content editing, file upload/download lifecycle, ratings persistence, library search/catalog, notifications/push, chat/realtime, aggregate statistics, or system-monitoring metrics in this backend.
- A mobile-safe API hostname, TLS termination, production CORS/network policy, API versioning, idempotency or offline synchronization contract.
- Stable pagination/filter/sort envelopes. Several screens paginate locally after downloading data.

Do not synthesize these missing services in Flutter. Either scope the corresponding mobile feature as read-only/deferred or add an explicit backend work item and contract first.
