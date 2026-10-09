# Routing and state management proposal

## Routing

Use GoRouter with a signed-in route guard and `StatefulShellRoute.indexedStack` for the four top-level tabs. Nested stacks preserve their own scroll and navigation state. This is preferable to hand-building Navigator 2.0 route parsing for the current app size; GoRouter uses Navigator 2.0 under the hood while providing a declarative route/redirect layer. Guard redirects based on the resolved session state (`loading`, `signedOut`, `signedIn`, `expired`), not synchronous reads of a local role flag.

Route parameters should use stable IDs (`courseId`, `assignmentId`, `submissionId`, `sessionId`). Parse/validate route inputs at boundaries. Deep links to a nested page wait for auth resolution and then request the resource; a cached object does not grant access.

## State ownership

| State | Owner | Lifetime |
|---|---|---|
| Auth/session, signed-in user/capabilities | App/core auth provider | Across tabs; cleared on logout/expiry/role change |
| Course list and course detail | Course feature repository/providers | Cache policy explicit; keyed by current principal and course ID |
| Roster/submissions/requests | Feature providers keyed by course/resource/filter | Refresh after server-confirmed mutation; no cross-user leakage |
| Search text, selected filters, expanded card | Screen/route state unless shareable deep link | Preserve during push/pop; reset when identity/context changes |
| Form drafts | Feature-local state; optionally secure/sensitive policy | Retain on recoverable network failure; clear on success/explicit cancel |
| Theme, language, non-sensitive preferences | Local preferences | Across restarts |
| Bearer token | Secure storage/session adapter | Until backend expiry/logout, not in plain preferences/logs |

Riverpod `AsyncValue` (or equivalent) should drive loading/data/error states. Avoid duplicating API data into a second mutable global store. Mutation state should be explicit; optimistic updates are optional only when rollback/conflict semantics are tested.

## Refresh and invalidation

- Pull-to-refresh refetches the active resource and reports failure without erasing last confirmed data.
- On successful create/update/delete, invalidate affected list/detail providers after server acknowledgement.
- On 401, serialize session invalidation to avoid multiple overlapping dialogs, clear sensitive in-memory providers, then return to sign-in.
- On 403, retain navigation shell if the session is valid, explain lack of access and offer a safe back action.
- On role/capability refresh, invalidate all role-sensitive caches and rebuild tabs/actions.

## Avoid current web-state hazards

Do not port Zustand localStorage token persistence or `data-store` fire-and-forget writes. The web has optimistic local operations whose remote errors are logged without rollback; mobile writes must surface failure and represent server truth.
