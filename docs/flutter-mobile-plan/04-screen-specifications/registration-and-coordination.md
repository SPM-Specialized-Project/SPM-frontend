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

- **Audience:** web route gates Coordinator; backend authorizes coordinator/chairman from the bearer session.
- **Initial audit behavior:** the old wait state and popup did not call a model or persist assignment. These were replaced in the current web checkout.
- **Current web behavior:** coordinator selects a student and TF-IDF or optional local BGE-M3, requests Top-K hard-feasible tutors, sees reasons/feature values and confirms or rejects a candidate. Rejections require a reason. Acceptance revalidates capacity and stores a durable assignment. See [API and persistence contract](../../ai-matching-research/05-api-design.md) and [model design](../../ai-matching-research/04-model-design.md).
- **Flutter target:** reproduce API states and error reasons, show only stored/server-confirmed decisions, preserve manual approval, and clearly label scores as rankings rather than probabilities. Do not implement separate mobile scoring or inference.
- **States:** missing/incomplete profile, no eligible tutors, loading, unavailable BGE adapter, pending/rejected/accepted recommendation, stale constraints/capacity conflict, active assignment, forbidden.
- **Decision needed:** mobile exposure and production rollout policy; HCMUT judgment rubric/benchmark; JSON-to-transactional persistence migration; privacy/fairness review. The current ranking has no empirical quality validation.

## Role and privacy requirements

- Student sees only own request and status; lecturer sees own registration plus assigned work; managers see data needed for management only. Enforce through server queries.
- Protect target grade, personal location/special requests and student identities; don't send these to third-party AI services unless a separate approved privacy/security design exists.
- Matching results should record algorithm/version and input snapshot for audit, if assignments affect users.
