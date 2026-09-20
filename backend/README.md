# SCRUM-20 authorization implementation

Run `npm run backend` and `npm run backend:test` from the repository root. The server listens on `127.0.0.1:4000` by default. Set `BACKEND_PORT` and `BACKEND_DATA_DIRECTORY` to override the port and JSON storage directory.

`POST /api/auth/login` is public. All other API routes except `/api/health` require `Authorization: Bearer <accessToken>`. `GET /api/auth/me` validates the current session. Sessions are stored in memory for eight hours; restarting the server invalidates them. The existing legacy role and email fields in request bodies and query strings are ignored for authorization. They can be removed from frontend API types in a follow-up cleanup.

CodePulse demo users: `student@gmail.com` / `student123`, `student2@gmail.com` / `student2123`, `lecturer@gmail.com` / `lecturer123`, `lecturer2@gmail.com` / `lecturer2123`, and `admin@gmail.com` / `admin123`. These are development fixtures, not production credentials.

## CodePulse endpoints

| Endpoint | Access |
| --- | --- |
| `GET /api/codepulse/classrooms/:id` | Active student member or assigned lecturer |
| `GET /api/codepulse/classrooms/:id/dashboard` | Assigned lecturer |
| `GET /api/codepulse/classrooms/:id/problems/:problemId` | Active student member or assigned lecturer; student response omits hidden cases and runner trace |
| `GET /api/codepulse/workspaces/:id` | Active student owner or assigned lecturer; admin denied |
| `PATCH /api/codepulse/workspaces/:id` | Active student owner only; accepts `sourceCode` |
| `PATCH /api/codepulse/memberships/:id` | Admin only; accepts `{ "status": "revoked" }` |

The demo domain is isolated from legacy course data. Classroom and problem fixtures are in `codepulse.mjs`; memberships and workspaces are persisted in `data/codepulse-*.json` on first access. Every request re-reads membership status, so revocation affects the next API request.

## Remaining integration work

This repo has no realtime server, full classroom/problem/submission domain, persistent account store, or production identity provider. Realtime revocation, audited admin privilege escalation, and authorization of future endpoints must be implemented when those components are added. Replace fixture passwords and in-memory sessions before production use.
