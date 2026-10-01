# Implementation dependency order

## Critical path

```text
Repository/app ownership + release targets
                ↓
Phase 1 foundation, environment and transport
                ↓
Phase 2 auth/session + canonical role/capability contract
                ↓
Phase 3 guarded shell and nested tab stacks
                ↓
Phase 4 course context → roster/submissions
                ↓
Phase 5 role-specific vertical slices
                ↓
Phase 6 accessibility/resilience/performance
                ↓
Phase 7 permission regression + signed release
```

Backend readiness is a parallel prerequisite, not something Flutter can mock into existence:

```text
HTTPS staging + session contract ──────► Phase 1/2 integration
Role matrix + API schema/pagination ───► Shell guards + all feature repos
File upload security contract ─────────► Submission upload only
CodePulse sandbox/state contract ──────► CodePulse slice
Session/request persistence contract ─► Schedule slice
Matching policy + audit endpoint ─────► Coordination/matching slice
Catalog/profile/report service ────────► Deferred feature slices
```

## Work that can run in parallel

- Design token audit and Flutter theme prototyping can run while backend auth/error contracts are being prepared; merge theme once brand owner approves primary blue/font.
- Course, schedule and CodePulse screen prototypes can be built independently against typed fakes after common UI states and API DTO conventions are agreed.
- Accessibility component audit and CI setup can proceed alongside read-only screens.
- Backend feature teams can implement independent APIs, but must converge on common auth, error, pagination and timestamp conventions before mobile integration.

## Work that must remain ordered

- Secure API config → auth transport → protected routes → protected feature repositories.
- Canonical role/capability matrix → tab/route visibility → mutation actions and permission tests.
- Course identity/detail contract → roster/submission/CodePulse route context.
- Upload/storage authorization → file picker and submission upload UI.
- CodePulse published version and sandbox contract → student runner; lecturer publish and lab lifecycle build on immutable version semantics.
- Request/session data model → coordinator review and mobile history; do not build workflow against local web-only records.
- API contract suite → release verification; live-looking fixtures must not substitute for staging.
