# Web screen inventory

The web app registers route files through TanStack Router; most routes below are descendants of `/_private` and inherit an authentication check. The route inventory records the current web route and a mobile interpretation. See [route mapping](../01-mobile-product-architecture/route-mapping.md) for target route names and migration disposition.

| Current web route | Current purpose / evidence | Mobile disposition |
|---|---|---|
| `/` | Redirect to dashboard. | Resolve to role landing tab after auth. |
| `/login` | Email/password login; optional remembered email; Google callback path is commented/incomplete. | Native sign-in screen; no fake OAuth option. |
| `/dashboard` | Course cards from API-backed course store; search, sort and client pagination. | Courses tab / course list. |
| `/course` | Redirect to course listing. | Redirect to `/courses`. |
| `/course/$id` | Course detail; backend returns a course plus synthetic static detail content; special CodePulse UI for course 13. | Course overview with nested content and CodePulse entry where entitled. |
| `/course/$id/roster` | API-backed class roster, membership status/actions. | Roster list/detail; lecturer mutation controls, student read-only view. |
| `/course/$id/rating` | Course/tutor rating list, localStorage-backed. | Course feedback; hold write/sync until backend persistence exists. |
| `/course/$id/rating/$ratingid/$index` | Rating detail/response path. | Rating detail; local-only current state must not be represented as server-persisted. |
| `/course/$id/submissions` | API submission list by course. | Course submissions. |
| `/course/$id/$name` | Assignment-specific submission list. | Assignment submissions nested under course. |
| `/course/$id/$name/$stuname` | Individual submission/detail and lecturer review. | Submission detail/review, with role-specific actions. |
| `/course/$id/stastical` | Per-course charts/statistics; route spelling is `stastical`. | Course analytics; do not preserve typo in new mobile route. |
| `/schedule` | Week/calendar UI with client role toggle and sessions. | Schedule tab; agenda-first on phone, role comes from signed-in identity. |
| `/schedule/$id` | Session detail, attendance, notes and actions; some updates local-only. | Session detail with server-confirmed mutations only. |
| `/schedule/request` | Lecturer creates a session; current helper path may only update local store. | Create session flow after persistence contract is fixed. |
| `/schedule/request/new` | Student session request, currently local helper path. | Request-session flow; mark pending until backend supports it. |
| `/schedule/history` | Session/request history with role toggle/search/filter. | Schedule history list. |
| `/schedule/history/$id` | Accept/decline/detail actions; current helper update is local. | Request review/detail after API contract is defined. |
| `/register-session` | Student, lecturer and coordinator registration/request forms. | Role-specific “Requests” area under More. |
| `/registration-history` | Registration list/history and status actions; JSON-backed API. | My requests and role-specific review queue. |
| `/overview` | After the 2026-10-02 web matching work, the coordinator panel calls `/api/matching/recommendations`, shows server reasons/features, persists accept/reject decisions, and lists active assignments. TF-IDF is the default; BGE-M3 requires the optional local adapter. | Flutter can use the documented endpoints. Keep this advisory, surface missing-profile reasons, and retain Coordinator confirmation. Matching quality is not benchmarked. |
| `/library` | Search landing page for HCMUT Library. | Library tab; API/catalog availability must be confirmed. |
| `/library/$query` | Query results/cards/details; source data is static/local. | Search results and book detail; clearly distinguish catalog availability from cached fixture data. |
| `/profile` | Placeholder editable-looking profile fields; no API binding confirmed. | Profile read-only initially; editing gated on profile API. |
| `/profile/$id` | Profile detail by id, largely placeholder. | Other-user profile only where authorization and data contract allow. |
| `/statistical` | Course list with fabricated sample timestamps and client paging; client gate requires coordinator. | Reporting entry only after reports API and permission contract. |
| `/statistical/reports` | Report charts/filters and placeholders; no aggregate endpoint found. | Reports screen after backend aggregates are available. |
| `/statistical/overview` | Overview/analytics route; role intent differs across screens. | Defer until chairman/coordinator access policy is resolved. |
| `/statistical/$id` | Course report/detail route. | Course report detail. |
| `/system-monitoring` | Polls `localhost:5000/api/stats`; no matching metrics API was confirmed in this backend. | Do not port until a secured, reachable metrics service is identified. |

## Cross-cutting current web UI

- `StudyLayout` renders a desktop sidebar and mobile slide-over menu. There is no persistent bottom navigation bar.
- Notification UI includes fixture/generated in-memory notices; chat is local/mock. No notification service, push integration, WebSocket, or server-sent event endpoint was found in the inspected backend.
- Some pages use API data, some fixture data, some localStorage, and some in-memory stores. “Visible and clickable on web” does not imply server persistence.
- Client-side route gates inspect persisted browser state in places. The API must remain the final authorization authority; mobile should not reproduce client-only gates as security controls.

## Current web behavior detail by screen family

The route table above is the exhaustive route inventory. These field notes record details verified during source inspection; a field not established by the source is explicitly marked **Not confirmed from current codebase** rather than inferred.

### Authentication and course screens

- **`/login`** — Purpose: establish user session. Roles: all accounts. API: `POST /api/auth/login`, followed by `GET /api/auth/me` under the private route. Actions/form: email/password, optional remember-email; non-empty password and email-format client validation. Error: invalid credentials and locked/inactive response; loading disables submit. OAuth callback is incomplete. Desktop-specific: centered form in web viewport; mobile: native keyboard and secure token persistence.
- **`/dashboard`** — Purpose/data: browse API-backed `courseStore`; role visibility is API-filtered. Actions: title/code/instructor search, sort and local page sizes 4/8/12, open course. Components: course cards and `StudyLayout`. Loading/empty/error: async store loading and empty list; API failure must be distinguished from empty. Desktop uses sidebar/card grid; mobile one-column cards and persistent bottom nav.
- **`/course/$id`** — Purpose/data: detail from `/api/courses/:id/detail`; content sections include introduction/material/reference/movie/note/submission; backend currently synthesizes some detail content. Components include `CourseDetailView`, section renderers and `CourseContentNavigation`; coordinator-specific view exists. Actions: switch sections, open links/media, lecturer edit toggle in UI; no backend content-write API confirmed. Mobile: stacked sections and nested details; do not promise edit persistence.
- **`/course/$id/roster`** — Roles: active student read-only; assigned lecturer has membership actions; managers per API. API: memberships GET plus lecturer POST/PATCH/DELETE. Data: status/member rows and available-student candidates. Actions: search/add/reactivate/revoke. Validation: provisioned email/duplicate membership handled by server; exact UI-side constraints not confirmed. Web table/search and action menu become labeled expandable list on mobile.
- **`/course/$id/submissions`, `/$name`, `/$name/$stuname`** — Roles: student own submissions, lecturer assigned-course review; API GET submissions and PATCH review. Data/actions: search/filter/sort assignment submissions; review score/feedback; file preview/link. Client may show tabs to roles that endpoint rejects. Exact score validation/file upload not confirmed. Desktop tables/iframe details become cards and dedicated mobile detail; no upload UI should be claimed supported without endpoint.
- **Rating routes** — Purpose: course/tutor ratings; state persisted in `localStorage` key scoped by course, not server. Actions: rate/view/comment paths; specific validation and cross-device behavior are not confirmed. Mobile disposition: defer writes until rating API exists.
- **`/course/$id/stastical`** — Purpose: per-course chart data derived from frontend stores. API aggregate endpoint not found. Role gate and complete filter semantics are not confirmed. Mobile: defer or clearly label any future partial data; replace typo in route.

### Schedule, registration and coordination

- **`/schedule`** — Purpose/data: session calendar. API: session list store; view toggles student/lecturer locally, so not identity. Actions: change week/date, inspect event, lecturer create action. Desktop uses calendar grid; mobile should use agenda/list and date picker. Validation and server-supported recurrence are not confirmed.
- **`/schedule/$id`** — Purpose: session detail/attendance/notes. Attendance/note helper is local-only in the inspected path; delete has remote API path. Actions: role-specific edit/delete/attendance. Do not report a local update as persisted.
- **`/schedule/request` / `/schedule/request/new`** — Lecturer form fields include course, title, method, time range and selected students. Student form includes course/title/description and request type (new/makeup/absence). `createRequestSession` currently routes through local `saveSession` in inspected paths. Exact validation bounds and durable request status are **Not confirmed from current codebase**. Mobile form should be stepped/single-column, but submit stays disabled until backend request contract exists.
- **`/schedule/history`, `/schedule/history/$id`** — Purpose: history/review; role toggles and filters on web. Accept/decline uses local update helper in inspected path. Decision reason/audit and server persistence are not confirmed. Mobile list/detail with explicit pending/decided status after API work.
- **`/register-session`** — Student/lecturer/manager form branches: student course/language/session/location/target grade; lecturer subjects/languages/session types/location; coordinator course request and proposed slots. Registration stores use API for student/tutor requests; coordinator course request uses `/course-requests`. Exact field schemas/status transitions are generic/not fully confirmed. Mobile uses role-derived form, no role toggle.
- **`/registration-history`** — Uses registration APIs; pending/approved/declined display and CRUD paths. Filtering by display name is fragile. Exact pagination/server sort is not confirmed. Mobile groups own requests vs manager queue and identifies owner by stable ID.
- **`/overview`** — Coordinator gate, registration filters, persisted matching recommendations and decision review. The old five-second wait and client-only assignment popup described in the initial audit were removed. Current API, feature semantics and evaluation limits are in [AI matching research](../../ai-matching-research/README.md). The UI is advisory; the score is not a probability and quality is not yet evaluated on HCMUT labels.

### Library, profile and management screens

- **`/library`, `/library/$query`** — Search page, static/local result cards and detail popup. No API confirmed. Search only navigates when query is non-empty; catalog freshness/availability cannot be claimed. Mobile needs real catalog source before parity.
- **`/profile`, `/profile/$id`** — Placeholder fields and update-looking controls; profile API and field validation are not confirmed. Mobile should be read-only/deferred until backend contract.
- **`/statistical`, `/statistical/reports`, `/statistical/overview`, `/statistical/$id`** — Course list, sample timestamps, chart placeholders/local calculations. Route gates require coordinator in some screens even where chairman nav permission exists. No aggregate API, report definitions or export behavior confirmed. Mobile should not display fabricated samples.
- **`/system-monitoring`** — Client polls `http://localhost:5000/api/stats` every 2 seconds. The inspected Node backend does not expose it; production service/auth and mobile reachability are not confirmed. Defer.

### Shared validation, loading, navigation and responsive behavior

- `/_private` checks browser auth state and calls `/api/auth/me`; invalid state logs out/redirects. Feature routes may add local boolean gates.
- `api-client.ts` attaches bearer token from store and clears local auth on 401. Other errors are wrapped but endpoint envelopes differ; exact user-facing retry/validation behavior is not uniform.
- `createRemoteDataStore` can mutate local snapshots first and perform remote requests asynchronously; failures may only reach `console.error`, without rollback. Mobile must not reuse that success semantics.
- `StudyLayout` has a desktop sidebar and mobile slide-over; breakpoints start at 360px. There is no bottom tab bar. Tables, cards and modals are web patterns; no hover-only behavior should survive without tap/focus alternative.
- Web forms and per-field constraints vary. Unless named above, exact validation bounds and API error-to-field mapping are **Not confirmed from current codebase**.
