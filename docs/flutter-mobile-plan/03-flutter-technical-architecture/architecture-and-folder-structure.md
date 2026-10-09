# Proposed Flutter architecture and folder structure

## Target shape

Use a feature-first, layered Flutter app with dependencies flowing inward:

```text
lib/
├── app/                 # MaterialApp.router, theme, router, app bootstrap
├── core/
│   ├── config/           # environment/base URL, build configuration
│   ├── networking/       # Dio setup, interceptors, API error mapping
│   ├── auth/             # session boundary, secure token adapter
│   ├── storage/          # secure and non-sensitive preferences
│   ├── ui/               # shared design system and async states
│   └── errors/           # typed failures/result conventions
└── features/
    ├── auth/{data,domain,presentation}/
    ├── courses/{data,domain,presentation}/
    ├── roster/{data,domain,presentation}/
    ├── submissions/{data,domain,presentation}/
    ├── codepulse/{data,domain,presentation}/
    ├── schedule/{data,domain,presentation}/
    ├── registrations/{data,domain,presentation}/
    ├── coordination/{data,domain,presentation}/
    ├── library/{data,domain,presentation}/
    └── reports/{data,domain,presentation}/
```

The exact depth can remain lean; avoid ceremonial use-case classes for every one-line mapping. Keep API DTOs separate from UI state so generic backend records do not leak into widget trees.

## Recommended technology choices (not installed)

- Flutter Material 3 and `ThemeData`/`ColorScheme` for app shell and controls.
- Riverpod for dependency injection and async feature state; define auth/session and feature providers explicitly.
- GoRouter for nested navigation, tab stacks, deep links and redirect guards.
- Dio as the HTTP adapter with environment base URL, timeout, auth header and normalized errors.
- `json_serializable` or another generated typed-serialization approach if contracts become sufficiently stable; do not hand-wave dynamic `Map<String, dynamic>` across UI.
- Secure platform storage for bearer credentials; non-sensitive preferences in ordinary preferences storage.

These are proposals only. No package choice is approved by code in `SPM-mobile`; confirm team preference and package maintenance/support before adding dependencies.

## State-management choice against alternatives

- **Riverpod (recommended):** fits multiple independently loading, role-scoped feature resources; makes repository/config dependencies explicit and supports test overrides without putting API logic in widgets.
- **Bloc:** also viable if the team already standardizes on event/state streams; it offers explicit transitions but adds ceremony across many simple list/detail flows. No evidence of an existing Flutter Bloc convention.
- **ChangeNotifier/simple state:** sufficient for a tiny prototype, but the planned session lifecycle, independent tab stacks, list invalidation and async mutations would invite ad hoc global notifiers. Keep it only for small local UI controls, not as the application-wide data layer.

Riverpod is a recommendation based on the observed number of routes/roles/async stores, not a detected dependency. A short team ADR should approve or replace it before implementation.

## Layer contracts

- Presentation: renders immutable view state and emits user intent; no raw HTTP or direct storage access.
- Domain: role-aware concepts and validation that are deterministic/client-side safe; backend still authorizes.
- Data: repositories map typed API DTOs to domain objects and coordinate cache policy.
- Core: cross-feature transport/session/theme primitives, not a dumping ground for feature rules.

## Dependency and test seam

Inject API clients/repositories/session storage. Keep development fixture data behind an explicit fake repository/configuration that cannot be enabled silently in release. Feature logic should be unit-testable without a device or live server; route and widget tests use mock repositories, with staging integration tests isolated from the default test suite.
