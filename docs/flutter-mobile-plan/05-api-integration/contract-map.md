# Mobile-to-backend contract map

This is a mapping of endpoints observed in the checkout. Contracts are not versioned/stable guarantees. Confirm exact route aliases, request/response bodies, status enums and role behavior from the chosen base branch and staging before coding.

## Authentication and courses

| Mobile feature | Endpoint | Current contract / client implication |
|---|---|---|
| Health/config preflight | `GET /api/health` | Public health response; no mobile deployment configuration included. |
| Sign in | `POST /api/auth/login` | Email/password; returns token and user data. Error 401 invalid credentials, 403 `ACCOUNT_LOCKED`. Never cache password. |
| Session identity | `GET /api/auth/me` | Requires bearer. Token sessions are in-memory, eight-hour expiry, no refresh/revoke found. |
| Courses | `GET /api/courses` | Role-filtered list; no stable paging/filter envelope documented. |
| Course detail | `GET /api/courses/:id/detail` | Course and synthesized/static detail content; do not assume editable backend record. |
| Roster | `GET /api/classrooms/:id/memberships` or `/api/courses/:id/memberships` | Returns items, viewerRole, permissions, availableStudents/meta. Exact alias should be confirmed. |
| Membership add/status | `POST /api/courses/:id/memberships`; `PATCH/DELETE` membership resource | Lecturer add/reactivate/revoke constraints. Verify exact PATCH/DELETE route template and response on base branch. |
| Submissions | `GET /api/courses/:id/submissions?assignmentId=&studentId=&studentEmail=` | Role-filtered list, optional filters. No server pagination contract noted. |
| Submission review | `PATCH /api/submissions/:id` | Lecturer score/feedback; student may update own submittedAt/fileUrl. No upload route. |

## Schedule, requests and registrations

| Feature | Endpoint | Current contract / gap |
|---|---|---|
| Sessions list | `GET /api/sessions?courseId=` | Role-filtered list. |
| Create session | `POST /api/sessions` `{ item }` | Lecturer/coordinator/chairman subject to assignment/policy. Generic record shape. |
| Update/delete session | `PATCH /api/sessions/:id` `{ patch }`; `DELETE /api/sessions/:id` | Ownership/role checks exist; attendance/note field schema and transitions need confirmation. |
| Registrations | `GET /api/registrations?registrationType=student|tutor` | `tutor` is normalized to lecturer alias; resource shape generic. |
| Create registration | `POST /api/registrations` `{ registrationType, item }` | Student/lecturer self-service plus manager path. |
| Update/delete registration | `PATCH /api/registrations/:id`; `DELETE /api/registrations/:id` | Status/ownership behavior should be written into OpenAPI/schema. |
| Course requests | `GET/POST /api/course-requests`, `PATCH/DELETE /api/course-requests/:id` | Coordinator/chairman management; generic item/patch. |

## CodePulse endpoint groups

Paths below are relative to `/api/codepulse` unless full path is shown:

| Resource/action | Methods and path |
|---|---|
| Terms | `GET /terms?courseId=`, `POST /terms`, `PATCH /terms/:termId`, `DELETE /terms/:termId` |
| Classrooms | `GET/POST /classrooms?courseId=`, `GET/PATCH/DELETE /classrooms/:classroomId` |
| Classroom dashboard | `GET /classrooms/:classroomId/dashboard` |
| Assignment versions | `GET /classrooms/:classroomId/assignment-versions` |
| Assignments | `GET/POST /classrooms/:classroomId/assignments`, `GET/PATCH/DELETE /classrooms/:classroomId/assignments/:assignmentId` |
| Assignment execution lifecycle | `POST /classrooms/:classroomId/assignments/:assignmentId/run`, `/verify`, `/publish` |
| Labs | `GET/POST /classrooms/:classroomId/labs`, `PATCH /classrooms/:classroomId/labs/:labId` |
| Legacy/problem statement read | `GET /classrooms/:classroomId/problems/:problemId` |
| Student workspace | `GET /classrooms/:classroomId/workspace?assignmentId=`, `GET/PATCH /workspaces/:workspaceId` |
| Lab workspace execution and hints | `POST /workspaces/:workspaceId/execute`, `POST /workspaces/:workspaceId/hints/:hintId` |
| Membership | `PATCH /memberships/:membershipId` |

The route handler has role-specific branches: admin manages terms/classrooms but is not generally assignment author; assigned lecturer manages assignments/labs and may inspect assigned student work; student sees published assignments, live labs and own workspace/public tests. Admin workspace access is specifically constrained. Verify every permission on server before implementation.

### CodePulse request/response details verified in the web API adapter

| Operation | Request body/query | Response shape typed by current client |
|---|---|---|
| List terms/classrooms | `courseId` query (defaults to `13` in web adapter) | `{ items: Term[] }`, `{ items: Classroom[] }` |
| Create term | Term fields directly: name/startDate/endDate/resetDate (status/id generated) | `{ item: Term }` |
| Update term | `{ patch: Partial<Term> }`; delete has no body | `{ item: Term }`; `{ deleted: boolean }` |
| Create classroom | `{ name, description, termId, courseId, lecturerEmail? }` | `{ item: Classroom }` |
| Update classroom | `{ patch: { name?, description?, termId?, status?, lecturerEmail? } }`; delete no body | `{ item: Classroom }`; `{ deleted: boolean }` |
| Classroom dashboard | No body | `{ classroom, activeMembers }` |
| Problem/assignment versions | Problem uses stable problem ID; versions list by classroom | `{ item: Problem }`; `{ items: AssignmentVersion[] }` |
| Create assignment | Assignment fields directly: title/description/constraints/inputFormat/outputFormat/runtime/referenceSolution/testCases/limits as supplied by UI | `{ item: Assignment }` |
| Update assignment | `{ patch: Partial<AssignmentInput> }` | `{ item: Assignment }` |
| Verify assignment | `{}` or `{ referenceSolution }` | `{ item: Assignment, verification: { status, testCaseCount } }` |
| Publish/delete assignment | Publish no body; delete no body | `{ item: Assignment }`; `{ deleted: boolean }` |
| Run assignment | `{ sourceCode, testCaseIds? }` | `{ item: { assignmentId, runtime, results, passedCount, totalCount } }`; each result has testCaseId/status/output/duration fields |
| Create lab | `{ name, description, startAt, endAt, assignments: [{ assignmentVersionId, mandatory, practiceStartAt, practiceEndAt }] }` | `{ item: Lab }` |
| Update lab state | `{ status }` | `{ item: Lab }` |
| Read student workspace | `assignmentId` query | `{ item: Workspace }` |
| Update workspace | `{ sourceCode }` | `{ item: Workspace }` |
| Execute lab workspace | `{ sourceCode }` | `{ item: Workspace }` including `executionResult`; result may have status/stdout/stderr/exitCode/runtime and public-test counts/results |
| Reveal a problem hint | Path hint ID; no required body in current adapter | `{ item: Workspace }` with that hint marked revealed and content included |
| Update CodePulse membership | `{ status: "revoked" }` in current client adapter | `{ item: { id, status: "revoked" } }` as typed by web; casing differs from core membership status and needs normalization decision |

These are adapter types/bodies, not a generated OpenAPI contract. Validate actual status codes, required fields and all error responses against handler/staging. Lab workspace writes require a LIVE lab and open practice window; current error codes include `CLASSROOM_ARCHIVED`, `LAB_NOT_LIVE`, `PRACTICE_WINDOW_CLOSED`, `EMPTY_SOURCE_CODE`, unsupported runtime and no visible public tests. A fallback workspace execution result may be synthetic if no published assignment is linked; this must be resolved before product language treats execution as verified.

## Common integration conventions required before production

- Publish OpenAPI (or equivalent generated schema) with request/response DTOs, error envelope, auth scheme and role/capability requirements.
- Add API versioning/backward compatibility policy, `requestId`, pagination cursor/total semantics, consistent ISO timestamps and enum values.
- Add idempotency keys for create/decision/execution actions where retries could duplicate side effects.
- Define cache validators/ETag or revision field and conflict behavior before implementing offline/optimistic mutation.
- Test against staging with non-production users for all five canonical roles and representative inaccessible resources.

## Request/response detail where confirmed

`Protected` means bearer session and active-account check in the common route path. Exact body details marked **Not confirmed** must be read from the target branch/API schema before client implementation; recommendations are not contracts.

| Method and path | Params/body observed | Response observed | Auth / errors / query behavior |
|---|---|---|---|
| `GET /api/health` | None | Health object; exact fields not confirmed here | Public; status/error contract should be documented. |
| `POST /api/auth/login` | JSON email/password | Frontend consumes access token, role and user | Public; 401 invalid login; 403 `ACCOUNT_LOCKED`; exact error envelope varies. |
| `GET /api/auth/me` | Bearer header | Current session/user shape | Protected; invalid/expired token 401. |
| `GET /api/courses` | Optional query filters/pagination not confirmed | Course collection; exact envelope not confirmed | Protected; server role-filters list. |
| `GET /api/courses/:id/detail` | Path `id` | `{ course, detail }` | Protected; membership/assignment/manager checks; 403/404 behavior should be standardized. |
| `GET /api/courses/:id/memberships` | Path course ID | `{ items, classroomId, viewerRole, permissions, availableStudents, meta }` | Protected; student requires active membership; lecturer assigned, managers allowed; admin legacy gate blocks. |
| `POST /api/courses/:id/memberships` | `{ studentEmail }` | Membership/resource response; exact shape verify | Protected; assigned lecturer; validation/conflict envelope to document. |
| `PATCH` membership route | Path membership ID; `{ status: "ACTIVE"|"REVOKED" }` | Resource response; exact route alias/shape verify | Protected; lecturer authorization; 400/403/404/409 should be normalized. |
| `DELETE` membership route | Path membership ID | Revocation result; exact envelope verify | Protected; confirm whether hard delete is ever used or status is revoked. |
| `GET /api/courses/:id/submissions` | Query `assignmentId`, `studentId`, `studentEmail` | `{ items, viewerRole, permissions, meta }` | Protected; student only own, lecturer assigned; not a paginated contract. |
| `PATCH /api/submissions/:id` | `{ patch }`; lecturer score/feedback, student own submission metadata | `{ item }` or resource response; verify exact wrapper | Protected; 400 validation and 403/404; no upload mechanism. |
| `GET /api/sessions` | Query `courseId` | Session collection; exact wrapper to confirm | Protected; role-filtered; page/sort not confirmed. |
| `POST /api/sessions` | `{ item }` | `{ item }` | Protected; lecturer/coordinator/chairman; ownership/assigned-course checks. |
| `PATCH /api/sessions/:id` | `{ patch }` | `{ item }` | Protected; owner/manager checks; generic fields need schema. |
| `DELETE /api/sessions/:id` | Path ID | `{ deleted: true }` observed in handler | Protected; owner/manager checks. |
| `GET /api/registrations` | Query `registrationType=student|tutor` (`tutor` normalized to lecturer) | Collection; exact envelope not confirmed | Protected; owner/manager filtered; no pagination contract confirmed. |
| `POST /api/registrations` | `{ registrationType, item }` | Resource result; exact envelope confirm | Protected; self-service type/owner or manager policy. |
| `PATCH /api/registrations/:id` | `{ patch }` | Resource result; exact envelope confirm | Protected; role and ownership restrictions; status transitions need contract. |
| `DELETE /api/registrations/:id` | Path ID | Delete result; exact envelope confirm | Protected; role/owner restrictions. |
| `GET /api/course-requests` | Query filters not confirmed | Collection; exact envelope not confirmed | Protected; coordinator/chairman capability; admin policy not confirmed. |
| `POST /api/course-requests` | `{ item }` | Resource result; exact envelope confirm | Protected; coordinator/chairman only. |
| `PATCH /api/course-requests/:id` | `{ patch }` | Resource result; exact envelope confirm | Protected; ownership/manager checks; schema/status rules missing. |
| CodePulse execution/authoring routes | JSON payloads are sent by `codepulse-api.ts`; exact fields are feature-specific | Handler returns operation/resource results; full DTO table not established in this snapshot | Protected; validation/status errors include 400/409/413/422 families; standardize `{ code, message, errors? }` as current module shape before typed client. |

### Explicitly unsupported or not confirmed

- A backend upload endpoint, `multipart/form-data` contract, upload size/type limits, scanning result, file download authorization or signed URL lifecycle: **Not confirmed from current codebase**.
- A public library search, profile CRUD, ratings CRUD, push-token registration, notifications/chat, aggregate report, system-monitoring metrics or matching-job endpoint: **Not found in inspected backend**.
- Server pagination/sorting for all listed collections: **Not confirmed**; see [pagination/filtering](pagination-filtering.md).
- Exact body field validation rules for generic `{ item }` / `{ patch }` resources and every CodePulse operation: **Not confirmed** until generated contract or handler-level schema is published.
