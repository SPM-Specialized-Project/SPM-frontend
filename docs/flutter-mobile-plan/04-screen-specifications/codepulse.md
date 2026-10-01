# Screen specifications: CodePulse

CodePulse is a course-scoped programming lab integrated into course 13 in the current UI. Mobile should treat it as a capability discovered from course/backend data, not permanently bind product behavior to that numeric ID. All permissions below must be reconfirmed against endpoint handlers and API contract before implementation.

## Student flow

### Live lab problem workspace (present in the fetched upstream change)

- The latest fetched branch commit adds `StudentLabWorkspace` to the student lab screen. It lists problems in LIVE labs, loads a workspace, edits source, saves, executes, reveals hints and shows execution result.
- Lab assignment cards expose title/version/mandatory/practice window and hint count. Student-safe version responses omit `starterCode` and hint content; workspace response includes problem metadata and only reveals each hint's content after that student reveals it.
- **APIs:** `GET /api/codepulse/workspaces/:workspaceId`; `PATCH /api/codepulse/workspaces/:workspaceId` with `{ sourceCode }`; `POST /api/codepulse/workspaces/:workspaceId/execute` with `{ sourceCode }`; `POST /api/codepulse/workspaces/:workspaceId/hints/:hintId` with no required body.
- **Write window:** server rejects changes unless classroom is not archived, lab is `LIVE`, and current time is within that problem's practice window. Client-side date check is only a convenience; server is authoritative. Current conflict codes include `CLASSROOM_ARCHIVED`, `LAB_NOT_LIVE`, `PRACTICE_WINDOW_CLOSED`; empty source returns 422 `EMPTY_SOURCE_CODE`.
- **Execution caution:** when a published assignment/test set is linked, handler runs visible/public cases and stores a result. A fallback path can generate a synthetic completion/runtime result when no linked published assignment is found. Until that path is removed or explicitly labelled, never state that every successful response proves submitted code ran through the intended compiler/test suite.
- **States:** no LIVE lab/no assignments; workspace loading; unsaved draft; saving; executing; results (completed/failed/runtime error); outside practice window read-only; hint locked/revealed; conflict; save/execute error. Preserve local draft after transient failure and clearly separate local unsaved code from server-saved source.

### Classroom dashboard and assignment list

- **Audience:** active classroom student in the current term.
- **Data:** `GET /api/codepulse/terms?courseId=13`, classroom data, `GET /classrooms/:id/dashboard`, assignment versions and labs endpoints. Student sees published assignment versions and only LIVE labs.
- **Layout:** current term/classroom banner; live lab status; assignment cards with title, due/status if available; simple progress summaries only if server fields support them.
- **Actions:** open assignment/workspace; open live lab; refresh. Do not show draft/hidden assignment or hidden tests.
- **States:** no active term/classroom, no published assignment, no live lab, loading/offline, membership revoked (403), stale lab state/conflict.

### Assignment detail and workspace

- **Data:** `GET /classrooms/:id/assignments/:assignmentId`, `GET /classrooms/:id/workspace?assignmentId=`, `GET/PATCH /workspaces/:id`.
- **Layout:** problem statement; examples/public constraints; code editor as primary surface; language selector only for backend-supported languages; save/run/submit controls; result area with accessible status text.
- **Actions:** read published problem; edit own workspace; save; run against public tests. Student must never request/receive hidden test data or another user's workspace.
- **States:** draft local edits, saving, saved, save failure with draft retained, execution queued/running/result, time/resource limit, invalid source, network interruption, 403/409 stale workspace. Show server-confirmed saved time.
- **Acceptance:** draft editor content must be protected against data loss; no “passed all tests” implication if only public tests ran.

### Lab session

- **Data:** `GET /classrooms/:id/labs`; live lab's selected published assignment versions.
- **Actions:** join/open live work; view state. Student cannot create or change lab status.
- **States:** upcoming/closed/not available, lab transitions while viewing, active membership required.

## Lecturer flow

### Assigned classroom

- **Audience:** lecturer assigned to the classroom.
- **Actions/data:** fetch classroom, terms, assignment versions, labs, dashboard. Lecturer can edit assigned classroom name/description/status within current constraints; admin handles term assignment/classroom administration.
- **Layout:** roster/assignment/lab sections; explicit current class/term; keep management controls in overflow or distinct management route.
- **States:** no assignment, assignment revoked, validation/conflict, forbidden.

### Assignment authoring

- **Endpoints:** `GET/POST /classrooms/:id/assignments`, `GET/PATCH/DELETE /classrooms/:id/assignments/:assignmentId`, `POST .../run`, `POST .../verify`, `POST .../publish`; assignment versions endpoint.
- **Layout:** focused editor sections for title/instructions, examples, public/hidden test cases, reference solution and language; long form with section anchors; show version/draft/published state.
- **Actions:** save draft, verify reference solution, publish immutable version, delete draft only. Confirmation before publish/delete; publishing summary displays exactly which version/test visibility becomes active.
- **States:** draft saved, verifying, verification failures per test, publish in progress, success with version identifier, conflict/validation/capacity/unsupported language. Do not claim `admin` can author assignments: current backend capability is lecturer-specific.

### Lab management

- **Endpoints:** `GET/POST /classrooms/:id/labs`, `PATCH /classrooms/:id/labs/:labId`, read assignment versions.
- **Actions:** lecturer creates a lab from published versions and transitions allowed lifecycle states. Server must validate transitions and class/assignment consistency.
- **States:** no published versions, create validation, transition conflict, closed/active state, network failure.

## Admin flow

- **Endpoints:** list/create/patch/delete terms; list/create/patch/delete classrooms; selected membership administration. Admin may administer terms/classrooms but current rules do not grant editing assignments or viewing student workspaces.
- **Layout:** term list/detail; classroom list/detail; assignment/lecturer mapping and membership controls only when returned permissions allow.
- **Actions:** create/update/delete term/classroom; assign lecturer and term when supported; manage membership. Destructive action confirms impact and affected classes.
- **States:** term with dependent classes/labs, conflict/in-use refusal, permission denied, stale updates.

## Shared API/security constraints

- Current backend runs student code in child processes inside server-managed temporary directories (Python/C++ paths observed) with source/output/resource limits. Mobile must submit source to this service; never execute untrusted student source on the phone or add a client-side hidden-test mechanism.
- Current handler uses validation/status errors including 400/409/413/422 classes. Normalize these to field or execution-result states; do not expose raw stack traces.
- Confirm concurrency, sandbox isolation, queue limits, cleanup, compiler/runtime versions, rate limits, audit trail and abuse monitoring before a production launch.
- Editor keyboard, landscape layout, screen reader status, code selection/paste and unsaved-change warning require device testing.
