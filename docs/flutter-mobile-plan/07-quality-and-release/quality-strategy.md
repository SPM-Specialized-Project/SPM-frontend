# Quality, security and release strategy

## Test pyramid

- **Unit:** serialization, unknown enums, role/capability presentation logic, form validators, date/time conversion, matching explanation logic if approved, error mapping and repository behavior.
- **Widget:** loading/empty/error/forbidden states, large text, form keyboard behavior, mutation pending state, screen reader semantics, navigation/filter restoration.
- **Route/integration:** deep link → sign-in → protected resource; 401 expiry; 403/404; tab stack restoration; server-confirmed mutation then refetch.
- **Backend contract:** run client contract tests against an API schema and staging server, with one least-privilege user per canonical role and inaccessible-resource IDs.
- **Device:** Android/iOS real-device network, keyboard/insets, app background/kill-resume, secure storage, upload/download and CodePulse editor performance.
- **Release smoke:** staging build with production-like TLS/config; no seed credentials, debug logs, local endpoints or fixture-only UI.

## Security acceptance

- Tokens only in secure storage; redact auth headers/password/source/submission PII from all logs and crash telemetry.
- TLS enforced; no release cleartext override or localhost base URL.
- Client visibility is not authorization. Test direct route/API attempts as wrong role and non-member.
- Purge user/role-sensitive cache at logout, expiry, account switch and capability change.
- Require explicit confirmation for revoke/delete/decline/publish; prevent double-submit; use idempotency/revision if API supports.
- Review file URLs/attachments, CodePulse source/test-data secrecy, clipboard/preview/webview and data retention.
- System-monitoring data remains excluded until audience and service security are approved.

## Accessibility and performance gates

- VoiceOver/TalkBack core course, roster, submission and CodePulse tasks; 200% text scaling; contrast; keyboard navigation where platform supports external keyboard.
- Avoid blocking main isolate on parsing/editor operations; use pagination/incremental lists only when backend supports bounded requests.
- Define startup and screen-load budgets with product/backend; measure on a supported low/mid-tier device rather than guessing.
- Code editor memory, large source handling and execution-result rendering get separate profiling.

## Release checklist

- Correct flavor/API host, TLS, app ID, signing, privacy labels and minimum OS approved.
- Backend contract version and rollback compatibility verified; auth/session revoke/expiry tested.
- Crash/error telemetry approved and redacted; support contact and incident ownership defined.
- Role matrix and permission regression suite green on staging; offline behavior honest and non-destructive.
- Store assets, release notes, accessibility review, localization, backup/recovery and operational monitoring ready.

## Documentation completion criteria

- Every in-scope web route has a mobile disposition.
- Every proposed screen identifies audience, data source, layout/actions, states, authorization and known dependency.
- “Current” behavior is separated from recommendations and unverified assumptions.
- No API gaps are hidden by local fixtures or optimistic local state.
