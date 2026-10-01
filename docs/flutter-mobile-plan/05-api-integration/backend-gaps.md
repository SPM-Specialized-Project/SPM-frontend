# Backend and product gaps that block mobile parity

“Missing” means not found in the inspected backend/frontend paths; it does not prove no external service exists. Assign owners and verify deployment before closing an item.

## P0 — mobile connectivity and security

1. **Reachable API:** backend defaults to `127.0.0.1:4000`; Vite proxy is web-only. Provide HTTPS staging/prod base URL, bind/reverse-proxy plan, TLS, rate limits and environment config.
2. **Session lifecycle:** token stored in in-memory map, eight-hour expiry, restart invalidation; no refresh/revoke/logout endpoint found. Define refresh/revocation/device logout and account recovery; approve secure mobile lifecycle.
3. **Contract consistency:** generic `item`/`patch`, varying envelopes/status codes. Publish versioned schema/OpenAPI, stable error body, enums, timestamps, validation and pagination.
4. **Role/capability truth:** coordinator/chairman stats mismatch; lecturer `isManager` inconsistency; admin legacy-route restrictions. Resolve policy and enforce server-side with tests.
5. **Production data durability:** JSON file persistence needs an explicit concurrency, backup, restore, migration and multi-instance assessment before real user writes.

## P1 — core learning and schedule

- Course detail appears synthesized/static; define authoritative course-content model and read/update endpoints.
- Submission file upload/download, size/type limits, malware scanning, access-controlled storage and signed URL expiration are absent.
- Roster endpoint contract and membership action route aliases/status transition rules need stable schema.
- Session request is not a distinct confirmed backend resource; schedule form/create and attendance/notes have local-only web paths. Define session vs request lifecycle and server persistence.
- Registration and course-request resources need typed schemas, stable owner IDs, status/decision audit, pagination and idempotency.
- Clarify admin access to sessions, rosters, submissions and registration data.

## P1 — CodePulse production readiness

- Confirm compiler/runtime image/version, sandbox boundaries, CPU/memory/output/source limits, execution concurrency/queue, cleanup, abuse controls and audit logs.
- Define public/hidden test secrecy, immutable published version semantics, lab transition state machine, workspace revisions and autosave conflict behavior.
- Recent upstream student-lab workspace handler adds save/execute/hint-reveal with LIVE/practice-window guards. Review the synthetic execution fallback when no published assignment is linked; a response can look like execution without invoking the intended published test suite.
- Provide CodePulse capability/class identifiers rather than hardcoded course 13.
- Establish mobile editor behavior/accessibility/performance and preserve drafts through app lifecycle interruption.

## P2 — incomplete product services

- Ratings API/persistence; profile read/update/password flows; library catalog/search; notifications and push registration; chat/realtime; aggregate statistics/report definitions; system monitoring service.
- Matching algorithm is not an AI service in current interaction. Decide simple criteria vs recommendation model, fairness/privacy/audit/manual override and durable assignment endpoint.
- Offline/cache policy, retention and deletion rules; user export/accessibility language; telemetry consent and personal-data redaction.

## Exit rule

Do not call a feature “mobile parity” while its source web screen is local/mock-only. Either implement a backed mobile replacement through an approved server contract or explicitly omit it from the release and communicate why.
