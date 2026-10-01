# Pagination, filtering and sorting contract

## Current behavior observed

- No consistent server pagination envelope was found for course, roster, submission, session or registration lists.
- Dashboard and several admin/report views slice/scroll data client-side after loading. Some screens filter by requester name rather than stable user ID.
- Submission endpoints accept `assignmentId`, `studentId`, and `studentEmail` query filters. Session list accepts `courseId`; registrations accept `registrationType`; CodePulse endpoints accept `courseId` and assignment query parameters in their resource-specific paths.
- Sort options and date windows are often UI-local. Sample dates appear in statistics and must not be treated as data.
- Library query route exists in frontend but no library backend search contract was found.

## Recommendation before large mobile lists

Define a consistent list envelope, for example `{ items, nextCursor, hasMore, total?, generatedAt?, permissions? }`. Exact choice is a backend decision. Cursor pagination is preferable for changing rosters/submissions/session feeds; if offset paging is selected, define stable ordering and duplicate/missing item handling.

Every list contract should state:

- allowed query fields and maximum page size;
- stable default sort plus tie-break ID;
- role-scoped filtering applied server-side before pagination;
- whether total count is exact/expensive/omitted;
- search normalization and minimum query length;
- date/time-zone semantics and inclusive/exclusive boundaries;
- filter/sort options supported by server versus client;
- cache validator/revision and refresh behavior;
- behavior when a filter is unauthorized or unknown.

## Mobile client behavior

- Keep lightweight view filters locally only when the returned dataset is bounded and the filter does not imply access control.
- Server-side search/pagination is mandatory for large or sensitive rosters/submissions; never fetch all users then hide them client-side.
- Debounce free-text search; cancel superseded requests; reset cursor when query/filter/sort changes; deduplicate by stable ID when loading more.
- Preserve filter state on detail push/pop and display result count only if returned by server.
- Treat empty page with a non-null cursor, duplicate cursor, malformed item or unsupported sort as contract error, not an infinite spinner.
- Current endpoint contracts do not confirm pagination; do not claim infinite scroll is already supported.
