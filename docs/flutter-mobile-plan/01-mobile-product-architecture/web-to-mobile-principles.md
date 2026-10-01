# Web-to-mobile product principles

## Preserve user outcomes, redesign interaction

Mobile is not a narrow web viewport. Preserve the core jobs—find a course, learn/submit/review, manage sessions, submit or review requests, use CodePulse, find library material—while replacing desktop layouts with thumb-friendly navigation, progressive disclosure and concise summaries.

### Keep

- Role-scoped course access and server authorization.
- Course → roster/submissions/assignments nesting.
- Schedule events, request status, registration status and CodePulse assignment/lab lifecycle concepts.
- Search/filter where it materially helps a list; preserve selected filters when returning from detail.
- Explicit loading/empty/error/forbidden states and Vietnamese user-facing labels where the web currently uses them.

### Redesign

- Replace sidebar + slide-over with a stable bottom navigation shell and nested tab stacks.
- Replace week grids and wide tables with agenda/day grouping, filter chips, expandable cards, and detail pages.
- Use native date/time pickers and bottom sheets; move long forms to focused screens with sticky primary action only when keyboard safe areas permit.
- A simple filter/context menu may become a bottom sheet; long multi-section form, high-stakes review, or editor becomes a dedicated screen. Use platform file/image pickers only after upload endpoint, permission, size/type and storage policy are defined; the current backend has no confirmed file upload API.
- Replace role toggles with authenticated capabilities.
- Break complex matching and CodePulse admin work into reviewable steps; confirm destructive/publish actions.

### Defer or constrain until backend support exists

Profile edits, course content edits, ratings, library search if no catalog API, session-request persistence paths that are local-only, notifications/chat, system monitoring, full analytics, upload workflows, and true offline mutation sync.

## Product rules

1. Never present a local optimistic change as saved until server confirmation; current web stores can retain failed optimistic values.
2. Every mutation must have explicit pending, success, recoverable failure and conflict behavior; disable duplicate submission and support safe retry/idempotency.
3. Every route reached through a push notification/deep link must re-check authentication and server access before showing protected content.
4. The student path is read/submit/track; lecturer path is teach/review/manage; coordinator/chairman path is coordinate/report; admin path is platform setup. Do not collapse these into one crowded dashboard.
5. Feature priority is a product decision. Current data has no verified usage analytics, so the recommended tab order is a reasoned baseline, not a measured frequency ranking.

## Release slices

- Slice A: startup/config, sign-in/session validation, role/capability resolution, course list/detail read.
- Slice B: roster and submissions (server contracts and upload path must be settled before submission mutation).
- Slice C: CodePulse student workflow, then lecturer authoring/review, then admin term/classroom operations.
- Slice D: schedule, attendance, session creation/request/history only after local-only paths gain real persistence contracts.
- Slice E: registrations and coordinator matching after algorithm, persistence, auditability and approval model are defined.
- Slice F: profile, library, ratings, analytics/monitoring only when their authoritative services exist.
