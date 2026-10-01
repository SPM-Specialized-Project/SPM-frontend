# Web route to mobile route mapping

Mobile route strings below are **proposed** canonical paths for GoRouter; route naming can be adjusted before implementation. Web typos/legacy names are not carried forward. `/` and `/course` are redirects, not feature screens.

| Web route | Proposed mobile route | Destination / migration note |
|---|---|---|
| `/`, `/course` | `/courses` | Redirect to signed-in Courses tab. |
| `/login` | `/sign-in` | Public auth stack; pending OAuth flow is not assumed. |
| `/dashboard` | `/courses` | Courses root. |
| `/course/$id` | `/courses/:courseId` | Course overview/content. |
| `/course/$id/roster` | `/courses/:courseId/roster` | Roster; server permissions authoritative. |
| `/course/$id/submissions` | `/courses/:courseId/submissions` | Course submissions. |
| `/course/$id/$name` | `/courses/:courseId/assignments/:assignmentId/submissions` | Replace route slug/name with stable ID. |
| `/course/$id/$name/$stuname` | `/courses/:courseId/submissions/:submissionId` | Stable submission ID, no student name in URL. |
| `/course/$id/rating` | `/courses/:courseId/feedback` | Defer write until persistence API. |
| `/course/$id/rating/$ratingid/$index` | `/courses/:courseId/feedback/:feedbackId` | Defer unless API exists. |
| `/course/$id/stastical` | `/courses/:courseId/analytics` | Correct typo; defer pending aggregates. |
| CodePulse inside `/course/13` | `/courses/:courseId/codepulse/...` | Keep as course-scoped nested flow; do not hard-code course 13 in route logic. |
| `/schedule` | `/schedule` | Schedule tab; agenda-first. |
| `/schedule/$id` | `/schedule/sessions/:sessionId` | Session detail. |
| `/schedule/request` | `/schedule/sessions/new` | Lecturer/manager create, API readiness required. |
| `/schedule/request/new` | `/schedule/requests/new` | Student request, currently local-only. |
| `/schedule/history` | `/schedule/history` | History list. |
| `/schedule/history/$id` | `/schedule/requests/:requestId` | Request detail/review after contract. |
| `/register-session` | `/more/registrations/new` | Role-specific form variant. |
| `/registration-history` | `/more/registrations` | My requests/review queue by capability. |
| `/overview` | `/more/coordination/matching` | Coordinator-only; do not call it AI until real algorithm exists. |
| `/library` | `/library` | Library tab. |
| `/library/$query` | `/library/search/:query` | Search results. |
| `/profile` | `/account/profile` | Own profile, read-only until API supports updates. |
| `/profile/$id` | `/users/:userId` | Defer/limit fields by policy. |
| `/statistical` | `/more/reports` | Role/capability-gated after API work. |
| `/statistical/reports` | `/more/reports/summary` | Aggregate API required. |
| `/statistical/overview` | `/more/reports/overview` | Chairman/coordinator policy decision required. |
| `/statistical/$id` | `/more/reports/courses/:courseId` | Aggregate API required. |
| `/system-monitoring` | None initially | Defer until secured monitor service and mobile-safe endpoint exist. |

## Link migration rules

- Preserve IDs and intended user context through auth redirection, but never embed bearer tokens or PII in a deep link.
- Unknown/malformed IDs show a recoverable not-found state, not an empty detail page.
- Server 403/404 is handled at screen boundary; do not navigate into detail using stale cached objects only.
- Use explicit canonical IDs for assignment and submission routes; current web uses names/slugs/user names in segments, which are mutable and may expose PII.
