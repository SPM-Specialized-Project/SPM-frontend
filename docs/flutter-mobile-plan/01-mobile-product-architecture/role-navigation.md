# Role-aware navigation and landing behavior

The table proposes where capabilities live, not authorization policy. A capability must also be enforced by the API; absent/unknown capability means hide the action and deny the operation server-side.

| Role | Courses | Schedule | Library | More / account |
|---|---|---|---|---|
| Student | Enrolled courses; content, own submissions, read-only roster, CodePulse assignments/live labs | Own agenda, session detail, student request if backend persists it | Search/read catalog if available | Register-session, own request/history, profile (read-only until API), help/sign out |
| Lecturer | Assigned courses; roster actions, submission review, CodePulse authoring/labs for assigned classes | Own sessions, attendance and permitted session creation | Same shared library | Lecturer registration/history; assigned-course coordination; reports only if API explicitly allows |
| Coordinator | Broad course views; coordination actions only where contracts exist | Manager schedule/session actions | Shared library | Course requests, matching/registration operations, reports if aggregates exist |
| Chairman | Broad management according to backend policy | Manager actions per server | Shared library | Reports/coordination only after chairman route policy is reconciled with coordinator-only guards |
| Admin | Course reads where allowed; CodePulse term/classroom administration | Do not assume legacy session management access | Shared library | Platform administration; no access to student workspace unless backend explicitly authorizes |

## Landing route

After successful auth, land in Courses for student and lecturer, and in a role-relevant overview for coordinator/chairman/admin only after that overview is implemented and authorized. Until then, all roles may land in Courses with a compact capability-aware “More” area. Do not build the coordinator’s current mock AI screen as the app-wide dashboard.

## Bottom-tab allocation by role

All five roles retain the same position and label for the four primary tabs: **1 Courses, 2 Schedule, 3 Library, 4 More**. Student sees own learning and request entries within those contexts; lecturer sees assigned-course work and session controls; coordinator/chairman see management tools in More after policy is reconciled; admin sees CodePulse setup in More. If a role cannot access a tab's data, show an explanatory no-access/unavailable state rather than silently changing tab positions. Library remains a shared destination only if the actual catalog is available; until then it can be omitted from the release scope without moving the other tabs.

## Role changes and stale sessions

The backend currently supplies role/user data from its session model. On app resume and after 401, validate session as contract permits. If account role or capabilities changed, refresh user context and rebuild navigation; remove now-forbidden cached screens/data. If identity is ambiguous or role absent, do not default to student silently in mobile UI—show a safe session error and sign out/re-authenticate.
