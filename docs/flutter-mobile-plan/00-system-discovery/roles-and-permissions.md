# Roles, permission boundaries and observed mismatches

## Canonical role vocabulary

The API/frontend normalize the active role set to `student`, `lecturer`, `coordinator`, `chairman`, and `admin`. Legacy `tutor` values are normalized to `lecturer`. Unknown backend role input falls back to `student`, which should be reviewed as a fail-closed security decision rather than copied automatically into the new client.

Backend `isManager` means only coordinator or chairman. Some generated user booleans mark lecturer as `isManager` too; `statisticalPermission` is set for coordinator/chairman. Do not equate these flags. The mobile client should consume a canonical role/capability contract and the server should authorize every operation.

## Observed capability summary

| Capability | Student | Lecturer | Coordinator / Chairman | Admin |
|---|---|---|---|---|
| View course list | Active membership | Assigned/owned | Broad/all | Broad course reads, but global restrictions apply to many legacy routes |
| View course roster | If own membership is active; read-only complete directory | Assigned course; add/reactivate/revoke membership | Manager access | Blocked on roster path by global legacy endpoint gate (verify desired policy) |
| Course submissions | Own records | Assigned course records; review score/feedback | Not consistently admitted by submission API | Not consistently admitted |
| Sessions | Own active classroom data | Own/assigned sessions | Broad management | Route-dependent/global gate |
| Registration self-service | Student registration | Tutor/lecturer registration | Can create/manage records | Route-dependent; some legacy routes blocked |
| Course creation request | No observed coordinator workflow | No | Coordinator/chairman create and manage | Not established |
| Statistics navigation | Hidden | Hidden | Nav flag says coordinator/chairman, but some routes gate coordinator only | Not established |
| CodePulse terms/classrooms | Active-class student read | Assigned lecturer classroom/assignment operations | No broad CodePulse admin capability established | Term/classroom administration; assignments are not generally admin-editable |
| CodePulse student workspace | Own workspace; published assignments/live labs; public tests | Assigned classroom and permitted student workspaces | Not established | Can inspect/run some class/assignment data but cannot see/edit student workspace |

This table is a summary, not a complete authorization matrix. Route and endpoint behavior must be reconciled with product requirements and the server before release.

## Security design for mobile

1. Treat menus and hidden buttons only as usability. Enforce course membership, assignment ownership, account state and operation permissions in backend responses.
2. Parse server capabilities if present; do not infer permissions from display name, local role flags, email domain, registration form selection or route id.
3. Handle 401 as a session-expiry transition; 403 as a non-retryable permission state with a safe return path; never silently downgrade to another role.
4. For lists that expose classmates or submissions, show only fields authorized by the endpoint and avoid caching another user's data longer than needed.
5. Confirm whether an admin should be blocked from ordinary roster/submission/session routes. Current global gates create inconsistencies that UI code cannot safely resolve.

## Known policy mismatches to settle

- Stats navigation allows coordinator and chairman via a permission flag, while the main statistical route and overview explicitly require coordinator. Chairman may see a nav item and then be redirected.
- Web UI has local role toggles on schedule/history forms. These are presentation/demo switches, not identity changes; mobile must remove them.
- Frontend can display course tabs to non-student roles while API submission endpoints mainly support student/lecturer.
- Client route guards read browser-persisted booleans. That state can be stale/tampered and must not drive sensitive data access.
- Lecturer is flagged as manager in one normalized user shape but not in backend `isManager`. Define capabilities explicitly rather than reproducing ambiguous flags.
