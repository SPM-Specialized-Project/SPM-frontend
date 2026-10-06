# Implementation roadmap and phase definition of done

This roadmap is a future plan; **no implementation phase has started**. Expected paths are proposals inside the separate `SPM-mobile` repository and are not created by this task. Feature priority needs product approval; ordering below follows dependencies and backend readiness rather than measured usage analytics.

## Phase 0 — Discovery and decisions (documentation complete; readiness gates open)

- **Goal:** establish verified scope, existing behavior, target navigation/architecture, roles, API contracts and risk register.
- **Scope/screens:** source audit of all routes, backend endpoints, Flutter scaffold and platform config; no Flutter feature code.
- **Deliverables:** this plan (`00`–`07`), source trace, screen route map, permission matrix, endpoint/gap inventory.
- **Prerequisites:** repository access; target branch selection.
- **Backend dependency:** none for documentation; staging/API owners needed to close readiness decisions.
- **Acceptance / DoD:** major routes and role set trace to source; current/proposed/unconfirmed are distinguished; links resolve; no code changed outside docs.
- **Risks:** checkout one commit behind; fixture behavior may be mistaken for production; mobile repo is separate from doc location.
- **Explicitly not included:** code, package adds, merges, backend/web edits, commit/push.
- **Status:** discovery complete for snapshot; production decisions remain open.

## Phase 1 — Flutter foundation

- **Goal:** establish maintainable app skeleton, build flavors, common theme, dependency seams and CI baseline.
- **Prerequisites:** confirm `SPM-mobile` repository ownership; app ID/bundle ID, supported platforms/min OS, signing owner, package policy, environment host plan.
- **Expected modules/files:** `lib/main.dart`; `lib/app/app.dart`, `bootstrap.dart`, `router/`, `theme/`; `lib/core/config/`, `networking/`, `errors/`, `storage/`, `ui/`; `analysis_options.yaml`; flavor/build config; CI workflow and smoke build.
- **Screens:** app startup/loading and safe fallback only; counter demo removed as a planned implementation step, not in this docs task.
- **APIs:** none required for base shell; health endpoint may be used for environment connectivity only if defined.
- **Backend dependencies:** reachable HTTPS dev/staging hosts, health/error contract, CORS-free native network policy, TLS.
- **Acceptance / DoD:** debug builds on approved Android/iOS targets; environment selection cannot accidentally point release to localhost; theme and architecture tests compile; logging redacts secrets.
- **Risks:** current Android release uses debug signing/sample package ID; iOS bundle ID is sample; no minimum OS decision beyond scaffold iOS target 13.0.
- **Not included:** production sign-in, feature screens, API mutations, release signing secrets.

## Phase 2 — Authentication and authorization boundary

- **Goal:** make sign-in/session behavior reliable before protected feature data is loaded.
- **Prerequisites:** backend session design (expiry, refresh/revoke/logout, disabled account, recovery), stable user/capability DTO, error envelope and staging role accounts.
- **Expected modules/files:** `features/auth/{data,domain,presentation}/`; `core/auth/session_controller.dart`; secure storage adapter; `app/router/auth_redirect.dart`; typed `AuthenticatedUser` and error/result models.
- **Screens:** sign-in, startup session resolution, session expired, account disabled/locked, forbidden and logout confirmation if policy requires.
- **APIs:** `POST /api/auth/login`, `GET /api/auth/me`; logout/refresh are **not currently confirmed** and require backend contract before implementation.
- **Acceptance / DoD:** secure token persistence; restore/expiry/logout tested; 401 clears caches and routes once; 403 does not destroy a valid session; role/capabilities never inferred from local defaults; direct deep-link auth flow tested.
- **Risks:** current in-memory token sessions are lost on restart and lack refresh/revoke; plain localStorage in web is not a mobile pattern to copy.
- **Not included:** Google OAuth until native PKCE/callback is designed; password reset/MFA absent contract.

## Phase 3 — Application shell and navigation

- **Goal:** stable four-tab shell with independent tab stacks and role-aware secondary destinations.
- **Prerequisites:** Phase 1 and 2; approved product IA and canonical capabilities.
- **Expected modules/files:** `app/router/app_router.dart`; `app/router/routes.dart`; `app/shell/`; `features/home/` or `features/courses/` shell roots; navigation/route tests.
- **Screens:** Courses, Schedule, Library, More; account/profile entry and safe not-found/forbidden placeholders.
- **APIs:** none for navigation shell itself; tabs may show capability-aware placeholders until their feature is ready.
- **Acceptance / DoD:** each tab preserves stack and list state on switch; Android back pops nested route before shell exit; deep links wait for auth/resource permission; hidden destinations aren't treated as security.
- **Risks:** stable nav chosen on reasoned workflow, not usage telemetry; Library currently has no API.
- **Not included:** unbacked analytics, chat/notifications, dynamic tab reshuffling.

## Phase 4 — Core learning features: courses, roster, submissions

- **Goal:** deliver the highest-confidence learning flow with server truth.
- **Prerequisites:** Phase 1–3; API schema/version, reachable staging, role tests, stable paging; course detail truth; membership policy; submission file strategy before upload.
- **Expected modules/files:** `features/courses/`, `features/roster/`, `features/submissions/`; typed DTOs, repositories, list/detail/form providers and widget/contract tests.
- **Screens:** course list/search; course overview/content; roster; course/assignment submissions; submission detail/review.
- **APIs:** `GET /api/courses`, `GET /api/courses/:id/detail`, memberships GET/POST/PATCH/DELETE, `GET /api/courses/:id/submissions`, `PATCH /api/submissions/:id`; file transfer not currently available.
- **Acceptance / DoD:** role scope verified; roster student view read-only; lecturer add/reactivate/revoke correct; submission reviewer sees only authorized class data; confirmed mutations refetch server truth; no hidden local fixture fallback.
- **Risks:** synthetic course detail; admin submission/roster access mismatch; no file upload; web optimistic local writes may not persist.
- **Not included:** course content editing, upload/resubmit, ratings and analytics until their service contracts exist.

## Phase 5 — Role-specific workflows: CodePulse, schedule, registrations, coordination

- **Goal:** add differentiated workflows only as each server-backed contract is ready; subfeatures may ship separately.
- **Prerequisites:** Phase 2 auth and capability model; Phase 4 course context; backend persistence, state transitions, idempotency, audit and authorization tests for each domain.
- **Expected modules/files:** `features/codepulse/`, `features/schedule/`, `features/registrations/`, `features/coordination/`; editor/lifecycle state and domain-specific contract tests.
- **Screens:** CodePulse student assignment/workspace/live lab; lecturer assignment authoring/publish/lab management; admin term/classroom management; schedule agenda/session/request/history; registrations/history; coordinator course request/matching review.
- **APIs:** CodePulse `/api/codepulse/*`; sessions list/create/update/delete; registrations list/create/update/delete; course requests; matching `POST/GET /api/matching/recommendations`, `POST /api/matching/recommendations/:id/decision`, `GET /api/matching/assignments`, and `POST /api/matching/feedback`. See [exact matching contract](../../ai-matching-research/05-api-design.md).
- **Acceptance / DoD:** each vertical slice has owner/role path tests, recovery/conflict behavior, server-confirmed state and audit; hidden test/workspace isolation verified; no role toggle; matching result explainable, persisted and manually reviewable.
- **Risks:** CodePulse sandbox and mobile editor performance; schedule request/attendance local-only paths; generic registration schemas; matching persistence is JSON/process-local and matching quality has no HCMUT benchmark.
- **Not included:** automatic tutor assignment; claiming benchmarked AI quality; third-party inference without governance; system monitor; push/chat; local-only session request mutations.

## Phase 6 — UX polish, accessibility and resilience

- **Goal:** make shipped flows comfortable and resilient across phone/tablet conditions.
- **Prerequisites:** stable feature flows and representative device/account test matrix.
- **Expected modules/files:** shared `core/ui/` loading/error/empty widgets; localization; accessibility checks; cache policy; telemetry redaction; performance profiles.
- **Screens:** all shipped screens, prioritized auth/course/roster/submission/CodePulse.
- **APIs:** no new domain endpoint unless stale/offline/cache validators are needed.
- **Acceptance / DoD:** screen-reader tasks, 200% text, low connectivity, app background/restore, safe retry, no duplicate mutation, large source list/editor profiling pass.
- **Risks:** offline write queue is unsafe without idempotency/revision contract; do not overbuild animations before core accessibility.
- **Not included:** claiming full offline-first parity or adding unapproved analytics.

## Phase 7 — Testing and release

- **Goal:** ship to approved platforms with secure config and operational ownership.
- **Prerequisites:** Phases 1–6 for included scope; store identity/signing/privacy/legal review; backend rollback plan and production session support.
- **Expected modules/files:** unit/widget/integration/contract tests; Android release config; iOS archive/signing config; CI build/release workflow; runbook and release notes.
- **Screens/APIs:** only explicitly accepted MVP scope; excluded routes remain documented/deferred.
- **Acceptance / DoD:** full permission matrix on staging; TLS and no-loopback scan; release signed with approved credentials; crash/log redaction; app-store policy/privacy labels; monitoring and rollback/support runbook.
- **Risks:** generated runner settings are not production-ready; API contract changes can break older app versions; no stable backend migrations/backup evidence.
- **Not included:** releasing unsupported desktop/web Flutter targets unless separately approved.

## Parallel work opportunities

After Phase 2 contracts stabilize, UI design/accessibility work can proceed in parallel with backend schema implementation. Courses, schedule and CodePulse teams may build isolated mock-backed feature tests in parallel, but integration/release depends on auth/capability contracts and each endpoint's staging readiness. Do not parallelize role-specific mutations against an unresolved permission matrix.
