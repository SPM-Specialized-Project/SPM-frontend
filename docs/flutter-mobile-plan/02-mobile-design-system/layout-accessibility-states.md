# Mobile layout, accessibility and UI states

## Layout rules

- Root content scrolls under safe areas; bottom navigation respects system gesture insets.
- Use a single-column list on phones. At tablet widths, optionally use a rail and wider content pane; do not force the phone UI into desktop table density.
- Sticky bottom actions must include keyboard and safe-area inset handling. Long forms scroll as one accessible page; avoid nested scroll views with competing gestures.
- Proposed adaptive breakpoints: compact phone ≤360 logical dp uses one column and hides nonessential metadata; standard/large phone 361–599dp stays one column with a bounded content width; tablet ≥600dp may use a navigation rail; ≥840dp may use master/detail for roster or course content. These are starting points to validate on target devices, not copied web pixel breakpoints.
- Agenda/calendar defaults to day or week-summary list on phone. A dense week grid can be an optional tablet view.
- Convert roster, registration and report tables into labeled cards/rows with expandable secondary details and clear actions.
- Convert hover-only web affordances into visible tap actions, focus/press states, or an overflow menu; never make hover the only way to reveal information or controls.
- Text must wrap; do not truncate a status, score or required validation message without an accessible full label.

## Every asynchronous screen supports

1. Initial loading/skeleton, not a blank screen.
2. Loaded content, including partial data when the contract supports it.
3. Empty state with a role-appropriate next action (or a clear explanation that none is available).
4. Network/server failure with safe retry and preserved form/filter state.
5. Unauthorized (401/session expired), forbidden (403), not found (404), conflict (409), validation failure (4xx), and maintenance/offline states where relevant.
6. Refreshing/pending mutation state that distinguishes stale data from confirmed data.

Do not turn a failed fetch into an empty-state message; that falsely suggests the user has no courses/requests.

## Accessibility acceptance

- VoiceOver/TalkBack labels describe icon-only controls, status, selected tab, expansion state and validation association.
- Screen order follows visual order; dialogs/sheets announce title and return focus to the invoking control.
- Support platform text scaling at least through 200% without clipped CTA/status, and landscape/reduced width without horizontal scrolling for primary flows.
- Do not convey role, status, error or selection by color alone.
- Respect reduced motion; keep transitions short and avoid indefinite animated wait screens. The existing five-second matching wait should not be ported as evidence of completed work.
- Touch target spacing prevents accidental revoke/delete/publish. Destructive actions require confirmation and identify the target record.
- Localized date/time, number and score formatting; Vietnamese strings should remain accessible and avoid hard-coded screenshot-only text.

## Offline behavior

Phase 1 should be network-aware but not claim offline-first operation. Read-only course data may be cached only with an explicit TTL and sign-out/role-change purge policy. Queueing writes is unsafe until backend idempotency, conflict resolution and expiration rules exist. Show cached/stale state explicitly and never imply an offline action has been accepted.
