# Repository overview and evidence boundary

## What was inspected

The web application is in `frontend/`; its package manifests, Vite/TanStack routes, feature screens, stores/services, CSS/Tailwind configuration and relevant backend handlers were inspected. The backend is a separate Node ESM package under `backend/`. The Flutter app is not a subdirectory of this checkout: it is the peer repository `C:\disk D\SPM-mobile`.

The web repository is on `SCRUM-65-US-004.1-Assign-Multiple-Problems-to-LAB`. It was one commit behind at initial inspection, then safely fast-forwarded to fetched upstream commit `73bd83d`; that commit's CodePulse student workspace changes were inspected and included in this plan. A pre-existing modified `frontend/tsconfig.tsbuildinfo` was intentionally left untouched. No source, config or lockfile was edited for this plan.

## Source of truth, not README assumptions

The repository-level README mentions an architecture and stack that do not match the checked-out implementation (for example, it describes NestJS/JWT and a database-oriented service). In the inspected code:

| Area | Observed implementation |
|---|---|
| Web | React 19, TypeScript, Vite, TanStack Router, Zustand, Axios, Tailwind; additional UI/data packages are present, but presence in package manifest does not prove active use. |
| API | Node.js ESM using `node:http`; package declares Node >=20 and no runtime dependency set for a framework. |
| Persistence | JSON files under backend data directories; no SQL/ORM/database adapter was found in the active paths inspected. |
| Authentication | Bearer token held in an in-memory backend session map, with eight-hour expiry; session state is lost when server process restarts. |
| Flutter | Separate scaffold app; `lib/main.dart` is the generated increment-counter demo. |

This is a source inspection snapshot, not a claim that deployment infrastructure or other branches have no additional services. Confirm the target deployment branch and live API before implementation.

## Current data entities and relationships

No relational schema, SQL migration, ORM or database model layer was found in the active backend path. JSON collections/fixtures include users (seeded), memberships, sessions, registrations, course requests, submissions, and CodePulse terms/classrooms/memberships/assignments/assignment versions/labs/workspaces. Backend route/domain code joins these records by IDs and, in some legacy paths, by normalized email.

Observed relationship intent: a membership associates a student with a course/classroom; a session belongs to a course and may carry participants/attendance; a submission belongs to an assignment/course and student; a registration/course request has an owner; a CodePulse classroom is associated with course/term/lecturer and has members, assignment versions, labs and student workspaces. These are code-level JSON links, not database-enforced foreign keys or a complete ERD. Exact nullability, cascade behavior, uniqueness and transaction rules are **Not confirmed from current codebase** and must be formalized before migrations or offline cache design.

## Current Flutter baseline

At inspection, `flutter --version` reports Flutter 3.44.6 stable and Dart 3.12.2. `SPM-mobile/pubspec.yaml` constrains Dart to `^3.12.2`, declares only Flutter SDK plus `cupertino_icons` at runtime, and has `flutter_test`/`flutter_lints` as development dependencies. `lib/main.dart` is the stock Material counter with purple seeded theme and no SPM navigation, auth, API client, domain model, or feature. The only widget test is the generated counter smoke test.

Generated Android/iOS runners are present. Android `android/app/build.gradle.kts` still uses sample application ID `com.example.spm_mobile`, Flutter default SDK values, Java/Kotlin 17, and debug signing for the release build; `android/settings.gradle.kts` uses Android Gradle Plugin 9.0.1 and Kotlin 2.3.20. iOS `ios/Runner.xcodeproj/project.pbxproj` sets deployment target 13.0 and sample bundle ID `com.example.spmMobile`; `Info.plist` display name is “Spm Mobile”. These are scaffold settings, not release-approved identity/signing/minimum OS. Generated Linux/macOS/web/Windows targets are also present, but product scope is not confirmed.

## Network topology is a first-order blocker

Backend defaults to port 4000 and binds to `127.0.0.1`. Vite proxies `/api` to `http://127.0.0.1:4000` in local development, which makes same-origin web calls convenient. On a physical phone, `127.0.0.1` points back to the phone, not the developer machine or server. A mobile build therefore needs a reachable HTTPS API base URL and deployment/TLS configuration; changing the client URL alone cannot expose a loopback-bound server.

The frontend also polls `http://localhost:5000/api/stats` for system metrics. No matching API was found in this backend. It is not safe to treat that local monitor as a mobile backend contract.

## Confidence and revalidation

- High confidence: file-level route registrations, API handler paths, client service calls, local-vs-remote store behavior, Flutter scaffold contents.
- Medium confidence: intended product semantics inferred from labels/forms because several views are fixtures or use generic JSON records.
- Unverified: deployed URLs, TLS, production identity provider, real-user data model, release environments, Android/iOS minimum OS, privacy/retention rules, backend behavior on other branches.

Before implementation, compare this snapshot with the chosen upstream/base commit, confirm which repository owns the mobile app, and get a staging API URL plus representative non-production accounts for every role.
