# Screen specifications: registrations and coordination

## Register-session hub (web `/register-session`)

The web page branches into student, tutor/lecturer and coordinator forms. Mobile role is derived from authenticated session; users cannot switch into another role with a segmented control.

- Student request: course, language, session type/mode, location, special request and target grade.
- Lecturer request: subjects, languages, session types, location and special request.
- Coordinator course request: course/class request details, proposed schedule slots and history.
- Each form has its own API/data contract; no universal generic form model should be exposed in Flutter.
- Submit states include field errors, duplicate pending request, server confirmation and request ID/status. Save drafts only if privacy/retention policy is approved.

## Registration history/review (web `/registration-history`)

- **Data:** `GET /api/registrations?registrationType=student|tutor`, plus POST/PATCH/DELETE. Server persists JSON resource. Current frontend filters some records by names, which is fragile.
- **Layout:** “My requests” for student/lecturer, management queue for authorized coordinator/chairman; status chips Pending/Approved/Declined; date and request kind.
- **Actions:** open details, cancel/delete only while server policy allows, manager review decision only if explicit API capability supports it.
- **States:** no requests, filter no match, pending, approved, declined, forbidden, server conflict; do not infer owner by display name.
- **Required backend fields:** stable requester/user ID, request type, status enum, created/updated timestamps, decision actor/time/reason, revision/version.

## Coordinator course-request flow

Course creation requests use `/api/course-requests` with generic item/patch shapes. Define required field schemas, ownership, lifecycle/status transitions and whether creating a request also creates a course. Web modal/schedule slot behavior should not be ported until the backend contract is explicit.

## Coordination and matching (web `/overview`)

- **Audience:** coordinator gate in current screen; backend management semantics include coordinator/chairman but exact matching API is absent.
- **Current behavior:** Data and Results tabs consume registration stores. `hardMatch` filters tutors if subject IDs, language IDs and session-type IDs overlap; offline student also requires location overlap. Separately, “Gợi ý AI” changes tab and displays an illustration/wait state for five seconds; that click does not call `matchAllStudents()` or an AI/API service. Therefore it is not evidence of AI matching or durable assignment.
- **Target layout:** data filters; explicit “Run matching” action with selected cohort; progress state driven by actual job/API; explainable match reasons; candidate list; coordinator review; confirmed assignment action. Show unmatched requests with actionable reason, not just empty table.
- **Actions:** preview deterministic criteria, adjust allowable constraints if product approves, accept/reject candidate, create/persist assignment only through API with audit trail. Do not assign automatically without policy approval.
- **States:** no eligible requests, loading, no candidates per reason, stale inputs, matching job failure, duplicate run, result awaiting review, conflict when another manager changes data.
- **Decision needed:** authoritative algorithm and weighting/tie-break rules; whether currently intended as simple hard constraints or AI-assisted recommendations; explainability, privacy, fairness review, manual override, persistence, approval and audit.

## Role and privacy requirements

- Student sees only own request and status; lecturer sees own registration plus assigned work; managers see data needed for management only. Enforce through server queries.
- Protect target grade, personal location/special requests and student identities; don't send these to third-party AI services unless a separate approved privacy/security design exists.
- Matching results should record algorithm/version and input snapshot for audit, if assignments affect users.
