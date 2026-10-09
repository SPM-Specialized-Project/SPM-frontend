# Domain and API data mapping

Mobile domain models should use stable identifiers and typed fields. Current backend records are JSON-shaped and some APIs wrap values in `{ item }`; the following is a **target mapping**, not a claim that every field is present today.

| Domain object | Minimum mobile fields | Current source / contract status |
|---|---|---|
| `AuthenticatedUser` | `id`, display name, email (if needed), canonical role, capabilities, account status | `/auth/login`, `/auth/me`; booleans are inconsistent; formal capabilities schema needed. |
| `Course` | `id`, title, code, status, role-specific membership/assignment summary | `GET /courses`; exact optional fields vary. |
| `CourseDetail` | course reference, sections/content type, stable content IDs, updatedAt | `/courses/:id/detail` currently synthesizes static detail; no confirmed editing API. |
| `Membership` | `id`, course/classroom ID, user ID, status, role, created/updated/revision | roster endpoint; includes permission/meta shape; availableStudents returned for lecturer path. |
| `Assignment` | `id`, classroom/course ID, title, version, visibility, state, dueAt, language(s) | CodePulse versions; exact state schema/immutability policy must be documented. |
| `Submission` | `id`, assignment ID, owner ID, submittedAt, status, authorized file reference, score, feedback, revision | List/PATCH endpoints; no upload API or stable file abstraction found. |
| `Workspace` | `id`, owner ID, assignment ID, language, source, revision, savedAt | CodePulse GET/PATCH; enforce owner scope and size limits. |
| `LabSession` | `id`, classroom ID, assignment version IDs, state, startsAt/endsAt | CodePulse lab endpoints; transitions validated server-side. |
| `Session` | `id`, course ID, title, start/end with offset, mode, location, participants, status, attendance | Generic JSON record; web writes attendance/note locally in some paths. Schema required. |
| `RegistrationRequest` | `id`, requester ID, type, constraints, status, created/updated, decision metadata | `/registrations`; currently generic item and local name filtering. |
| `CourseRequest` | `id`, requester ID, course proposal, proposed slots, lifecycle state, decision metadata | `/course-requests`; generic record. |
| `Feedback` | `id`, course/user scope, rating, text, createdAt, visibility | Current localStorage only; no API found. |
| `LibraryItem` | catalog ID, title, author, availability, source URL, checkedAt | Current local/static; catalog API unconfirmed. |
| `AggregateReport` | metric key, period, scope, value, generatedAt, completeness/privacy metadata | No aggregate API found. |

## Serialization rules

- Use stable opaque IDs, not names, email addresses or display labels as route keys.
- Parse timestamps with explicit offsets; store server time consistently and render in device locale/time zone.
- Model status enums as unknown-safe values: if an unrecognized server status arrives, show a neutral “status unavailable” and disable unsafe actions rather than crashing or mapping to an approved state.
- Preserve nullable vs missing fields; do not replace absent server values with plausible-looking defaults.
- Use decimal/integer semantics for scores as backend defines; validate scale and rounding with product.
- Keep API DTOs separate from widget state; never deserialize permission by guessing from a role label.

## Fixtures and development mode

Backend seeds include fixture identities/data. Mobile local fakes should be isolated behind test/dev configuration and visibly distinguish demo mode. Release builds must not contain default user passwords or silently substitute sample courses, registration requests, chart numbers or library inventory when the API fails.
