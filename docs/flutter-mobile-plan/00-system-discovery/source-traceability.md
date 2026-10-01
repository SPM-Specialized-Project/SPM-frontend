# Source traceability map

Repository-relative paths below identify the main evidence inspected. They are pointers for the next implementation pass, not a statement that every behavior in the web UI is correct or production-backed.

## Web shell, routes and shared services

| Concern | Source paths |
|---|---|
| Package/tooling | `package.json`, `frontend/package.json`, `frontend/vite.config.ts`, `frontend/tailwind.config.cjs`, `frontend/src/index.css`, `frontend/index.html` |
| App entry/router | `frontend/src/main.tsx`, `frontend/src/app/index.tsx`, `frontend/src/routeTree.gen.ts`, `frontend/src/features/~_private.tsx` |
| Shared layout/menu | `frontend/src/components/study-layout/index.tsx` and adjacent header/sidebar components under `frontend/src/components/study-layout/` |
| HTTP/auth client | `frontend/src/services/api-client.ts`, `frontend/src/stores/auth.store.ts`, `frontend/src/stores/user.store.ts` (verify exact export filenames if moved on target branch) |
| Remote/local data bridge | `frontend/src/services/data-store.ts`, `frontend/src/services/use-data-store.ts`, feature stores under `frontend/src/components/data/` |
| Role types/normalization | `frontend/src/types/backend.ts`; backend `backend/domain/backend-data.mjs` |

## Screen feature sources

| Feature | Main route/component sources |
|---|---|
| Login | `frontend/src/features/~login/` and `frontend/src/services/api-client.ts` |
| Dashboard/courses | `frontend/src/features/~_private/~dashboard/~index.tsx`; course route files under `frontend/src/features/~_private/~course/` |
| Course detail/content | `frontend/src/features/~_private/~course/~$id/~index.tsx`; components in `frontend/src/features/~_private/~course/~$id/components/` |
| Roster | `frontend/src/features/~_private/~course/~$id/~roster/~index.tsx` |
| Submissions | `frontend/src/features/~_private/~course/~$id/~submissions/~index.tsx`, `~$name/`, `~$name/~$stuname/` route folders |
| Ratings/course statistics | `frontend/src/features/~_private/~course/~$id/~rating/`, `~$id/~stastical/` |
| CodePulse | `frontend/src/features/~_private/~course/~$id/components/dsa-lab-management.tsx`, `assignment-editor.tsx`, `lab-session-management.tsx`, `student-lab-workspace.tsx`, `frontend/src/services/codepulse-api.ts`; backend execution/lab tests include `backend/codepulse.mjs` and `backend/test/lab-session.test.mjs` |
| Schedule/session | `frontend/src/features/~_private/~schedule/` and components below that directory |
| Registration/history | `frontend/src/features/~_private/~register-session/`, `~registration-history/`, `frontend/src/components/data/~mock-register*` |
| Coordination/matching | `frontend/src/features/~_private/~overview/`; `frontend/src/utils/matching.ts` |
| Library/profile/reports/monitoring | corresponding `frontend/src/features/~_private/~library/`, `~profile/`, `~statistical/`, `~system-monitoring/` route trees |

## Backend

| Concern | Source paths |
|---|---|
| Server/listener/CORS config | `backend/server.mjs`, `backend/config.mjs` |
| Routes/auth | `backend/routes.mjs`, `backend/auth.mjs` |
| Roles, course/session/registration data | `backend/domain/backend-data.mjs`, `backend/data/` |
| CodePulse behavior/execution | `backend/codepulse.mjs` and related CodePulse domain/data modules |
| Fixture accounts | `backend/data/seeds.mjs` (do not copy fixture secrets into Flutter docs/builds) |

## Flutter scaffold (`SPM-mobile`, separate repository)

`pubspec.yaml`, `lib/main.dart`, `test/widget_test.dart`, `.metadata`, `android/app/build.gradle.kts`, `android/settings.gradle.kts`, `ios/Runner/Info.plist`, `ios/Runner.xcodeproj/project.pbxproj`.

## Revalidation rule

The `SPM-frontend` checkout was fast-forwarded from its initial one-commit-behind state to `73bd83d` before the documentation was finalized. A pre-existing modified `frontend/tsconfig.tsbuildinfo` remains untouched. Recheck these paths on the chosen base branch before relying on line-level behavior. No app code was authored or modified as part of this document set.
