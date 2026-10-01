# Mobile information architecture and navigation

## Recommended top-level shell

Use four stable destinations to avoid different role layouts shifting tab positions:

1. **Khóa học** — course list, course overview, content, roster, assignments, submissions, CodePulse entry.
2. **Lịch** — agenda, date selection, session detail, attendance and permitted request actions.
3. **Thư viện** — library search/results/detail, only when backed by a real catalog or clearly labelled static collection.
4. **Thêm** — role-filtered Requests/Registration, Coordination, Reports, Monitoring (hidden/deferred unless backed), About/help.

Profile and sign out are reachable from an account/avatar action in the app bar, not a primary tab. Keep all four slots stable for all roles; hide unavailable destinations inside More rather than changing tab semantics. If product analytics later show a different top task, revise by evidence.

## Content hierarchy

```text
App
├── Auth (sign in, session recovery)
└── Signed-in shell
    ├── Courses
    │   └── Course → Overview / Content / Roster / Assignments / Submissions / CodePulse
    ├── Schedule
    │   └── Session → Attendance / notes / permitted actions
    ├── Library
    │   └── Search → Results → Book/detail
    └── More (role-aware)
        ├── My requests / registration history
        ├── Coordination and matching (coordinator)
        ├── Reports (confirmed capabilities only)
        └── Account → Profile / Settings / Sign out
```

## Navigation behavior

- Keep each top-level tab's navigation stack and scroll/filter state while switching tabs.
- Course-scoped screens carry an immutable `courseId`; do not rely on mutable global “selected course” state for authorization.
- Detail screens expose a clear app-bar title/back action; Android back and iOS swipe-back follow the same route stack.
- Use full-screen routes for complex forms/editors; use bottom sheets for short filters, action menus and confirm dialogs.
- Restore a safe route after login; an intended deep link is resumed only after session and authorization checks.
- Avoid nested tab bars inside nested tab bars. Course subnavigation may be a compact segmented control or scrollable section navigation only if it remains accessible on narrow phones.

## App-bar conventions

Root list: concise title + contextual search/filter action. Detail: back + title + overflow actions. Forms: back/cancel + task title; primary Save/Submit action stays visible without covering keyboard/system insets. Show connectivity/sync state only when meaningful and actionable.
