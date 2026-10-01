# Screen specifications: schedule and sessions

Current schedule screens include demo role toggles and several local-only mutation paths. Target mobile uses the signed-in role and shows only server-confirmed records/actions.

## Schedule agenda (web `/schedule`)

- **Data:** `GET /api/sessions?courseId=`; existing screen presents calendar events and toggles student/lecturer view in local UI.
- **Layout:** date header/strip; agenda grouped by day; each session card shows time, course, location/mode, status and participant context allowed by role. Optional compact week grid on tablets.
- **Actions:** choose date, filter course/status, open session; lecturer/manager create action only where server permits. Remove manual role switching.
- **States:** no events for selected day vs no sessions overall; loading, failed, stale; time zone/localization and DST correctness.
- **Navigation:** `/schedule/sessions/:sessionId`; maintain selected day/filter on back.

## Session detail (web `/schedule/$id`)

- **Data:** session read from sessions resource. Current attendance and notes use helper `updateSession` that updates local data; delete has remote API path.
- **Layout:** course/date/time/status; online/offline location; attendees/attendance section only for allowed role; notes; contextual actions.
- **Actions:** permitted attendance/note update, edit/delete only after backend persistence contract. Require delete confirmation.
- **States:** session removed, conflict, failed save, unauthorized, attendance unavailable, stale. Do not display local-only data as synced.

## Lecturer session creation (web `/schedule/request`)

- **Current evidence:** form covers title/course/method/start-end/students; helper `createRequestSession` routes through local `saveSession`/upsert in the inspected path.
- **Target layout:** stepwise form: course + session basics; date/time picker; delivery/location; student selection; review/submit.
- **Actions:** submit only after confirmed POST schema and ownership; validate end after start, time zone and student-course membership.
- **States:** field-level validation, roster load failure, duplicate submission, server rejection, successful created session ID; preserve data on failure.

## Student session request (web `/schedule/request/new`)

- **Current evidence:** title/course/description and request type (new/makeup/absence); current helper is local-only.
- **Target:** separate request form from confirmed scheduled session; show request status and next expected action. Backend needs explicit request resource, workflow and persistence before enabling submit.
- **Actions:** create/cancel/edit based on server state; no claim of booked session until approved and scheduled.

## Schedule history and request detail (web `/schedule/history`, `/$id`)

- **Current evidence:** search/filter/pagination and accept/decline UI; update helper is local-only.
- **Target list:** tabs/chips “Pending / Approved / Declined”; role-specific queue; cards include requester, course, proposed times and status.
- **Detail:** full request, decision/audit note, accept/decline actions only for authorized manager; confirm decline and optionally require reason if product policy says so.
- **States:** request changed by another user (409), already decided, missing, no results, API failure; refetch before decision.

## Data and interaction requirements

- Backend should return ISO 8601 timestamps with explicit offset/zone and stable session/request status enum.
- Define attendance schema, permitted editors, per-student attendance visibility, note privacy, recurrence, cancellations and notification behavior.
- Use client-side view formatting only; server stores canonical UTC/offset representation. Never infer user's role from selected tab.
