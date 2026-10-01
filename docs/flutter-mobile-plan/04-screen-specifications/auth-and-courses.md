# Screen specifications: authentication and courses

All interactions below are **target behavior** unless explicitly labelled current. Common state requirements (loading, empty, error, 401/403/404 and offline) apply to every server-backed screen; each section lists relevant specifics.

## Sign in

- **Purpose / current web:** email + password form at `/login`; optional remember-email behavior; Google callback implementation is commented/incomplete.
- **Audience / entry:** signed-out user, expired session, or protected deep link redirect.
- **Data:** current `POST /api/auth/login`, then `GET /api/auth/me`; contract should return stable user role/capabilities and session expiry.
- **Layout:** product mark/title; email field; password field with show/hide; submit; concise account/help link only if a real route exists. Keyboard action advances/submits; button respects keyboard/safe areas.
- **Actions:** submit; reveal password; forgot-password only after backend implementation; optional third-party sign-in only after OAuth/PKCE/native redirect flow is designed.
- **States:** initial, submitting, invalid credentials, account locked, offline/server unavailable, successful session resolving, expired token. Retain email on recoverable failure; do not persist password. Do not persist token in plain preferences.
- **Navigation:** success to intended safe deep link or role landing; 401/invalid credentials stay; account locked explains next support step.
- **Acceptance:** screen reader labels; no seed credentials; no unverified Google button; secrets excluded from analytics/logging.

## Courses list (web `/dashboard`)

- **Audience:** any signed-in role with course-list access.
- **Data:** `GET /api/courses`; current web course store is API-backed. Search/sort/paging are mostly client-side.
- **Layout:** app-bar “Khóa học”; search field; optional sort/filter chips; course cards with title, code, role-relevant metadata and membership/assignment status. Avoid fabricated instructor/time metadata.
- **Actions:** search locally over loaded data or via backend when query/pagination contract exists; tap card; pull to refresh.
- **States:** loading skeleton; no courses vs failed request; stale cache label; forbidden or expired session.
- **Navigation:** `/courses/:courseId`; save scroll/search state when returning.
- **Open questions:** backend provides stable paging/filter envelope? Which fields are safe to expose for each role? What is the canonical course status?

## Course detail / content (web `/course/$id`)

- **Current evidence:** `GET /api/courses/:id/detail` returns course plus detail. Backend detail is synthesized static material, introduction/reference/submission-like content—not evidence of persisted course authoring. Lecturer edit controls in web do not establish a backend edit endpoint. Course 13 hosts CodePulse UI.
- **Audience:** active students, assigned lecturer, managers/admin only per server.
- **Layout:** course title/code/status; concise summary; segmented sections for Overview, Content, Assignments, People, Submissions; CodePulse card shown only when capability/data says it exists.
- **Actions:** open permitted nested flows; external document link through safe platform/browser handling; retry detail fetch. Do not expose local edit controls as persisted until a write endpoint exists.
- **States:** course unavailable, not enrolled/not assigned (403), detail empty (distinct from failure), external link error, content stale.
- **Navigation:** nested routes keyed by course ID; back returns to previous course list position.
- **Acceptance:** do not hardcode `courseId == 13` as the future product capability gate; keep server configuration/feature capability authoritative.

## Roster (web `/course/$id/roster`)

- **Data:** `GET /api/courses/:id/memberships` or classroom alias; returns items/viewerRole/permissions/availableStudents/meta. Lecturer can add/reactivate by provisioned `studentEmail`, update ACTIVE/REVOKED status or DELETE to revoke. Active student sees full roster read-only.
- **Layout:** course context; search; grouped active/inactive sections or status chips; each row shows only authorized directory fields; lecturer actions in overflow; add-student sheet with email lookup/validation.
- **Actions:** refresh/search; lecturer add/reactivate/revoke with confirmation; student has no mutation affordance.
- **States:** loading, no roster, no matches, invalid/unprovisioned email, duplicate membership, revoked membership, 403, conflict, failed mutation. On failure retain prior server truth and show retry/refresh.
- **Navigation:** roster details only if real person detail API is authorized; avoid creating a profile route based solely on email.
- **Acceptance:** do not infer permission from client role flags; student’s class-directory visibility follows API permission, not a locally cached membership assumption.

## Submission list and assignment submission list

- **Routes:** course-level `/course/:courseId/submissions`; assignment-level nested list replaces current name slug.
- **Data:** `GET /api/courses/:id/submissions` with optional assignment/student filters. Student sees only own records; assigned lecturer sees class records. Role/route mismatch exists for coordinator/admin in current web tabs.
- **Layout:** filters for assignment/status and lecturer search where allowed; cards show assignment, submitted time/status and score/feedback when authorized; student view highlights own due/submitted state.
- **Actions:** filter, open detail, refresh. Upload/resubmit action only after upload API contract is available.
- **States:** empty no submission vs no assignment; 403 for unsupported role; loading, stale, failed fetch, missing assignment; preserve filters after detail pop.
- **Acceptance:** don't present `fileUrl` as safe/accessible until backend file authorization, MIME, size and lifecycle are defined.

## Submission detail/review

- **Current evidence:** detail screen reads submissions and supports lecturer score/feedback edit; `PATCH /api/submissions/:id`. Backend permits student updating own timestamp/file URL, but no file upload endpoint was found.
- **Student layout:** assignment context, submission status/time, permitted file preview/download, score/feedback read-only.
- **Lecturer layout:** student identity fields allowed by role, submission content, score/feedback fields and explicit Save/review confirmation.
- **Actions:** lecturer save score/feedback; student submit/replace only when safe upload contract exists.
- **States:** loading/missing; unsupported role; saving; field validation; stale/conflict; inaccessible/expired file; save failure preserves draft and shows unsaved marker.
- **Navigation:** stable submission ID, never student name slug; return to prior filtered list.

## Ratings and course analytics (current local/demo state)

Rating routes currently use localStorage and have no corresponding API confirmed. Course analytics derive from frontend data and do not prove server aggregates. Specify as deferred/read-only until services exist; if shipped before that, label data source and never imply cross-device persistence. Replace local optimistic edits with backend-confirmed state before release.
