# Authorization design: navigation, route and action

## Three enforcement levels

1. **Navigation visibility:** stable primary tabs; hide secondary screens/actions the resolved user cannot use. Hiding a tab is UX, not security.
2. **Screen access:** route guard checks authenticated session, then resource fetch handles resource-level authorization; a role alone is insufficient for course membership or assignment ownership.
3. **Action authorization:** create/edit/delete/approve/revoke/publish/run controls reflect server capability; API validates each mutation and scope. Never trust a client-supplied role or hidden button.

## Role → feature → action matrix (observed summary)

Legend: **Yes** observed/allowed on the described scope; **Conditional** depends on membership/assignment or endpoint policy; **No** explicitly absent/blocked in observed path; **Not confirmed** cannot be established consistently from current code. Server remains authoritative.

| Screen/resource action | Student | Lecturer | Coordinator | Chairman | Admin |
|---|---|---|---|---|---|
| List courses | Conditional: active memberships | Conditional: assigned/owned | Yes/all | Yes/all | Yes for course catalog |
| Read course detail | Conditional: member | Conditional: assigned | Yes/manager | Yes/manager | Yes, route exception |
| Read full roster | Conditional: active class member, read-only | Conditional: assigned | Yes/manager | Yes/manager | No on legacy roster path/global gate |
| Add/reactivate roster member | No | Conditional: assigned lecturer | Not confirmed as manager mutation | Not confirmed as manager mutation | No on observed roster route |
| Revoke roster member | No | Conditional: assigned lecturer | Not confirmed | Not confirmed | No on observed roster route |
| Read submissions | Own only | Conditional: assigned course | No on observed handler | No on observed handler | No on observed global/handler path |
| Update own submitted metadata | Conditional: own submission only | No for student fields | No | No | No |
| Review score/feedback | No | Conditional: assigned lecturer | No | No | No |
| List sessions | Conditional: active classroom | Conditional: own/assigned | Yes/manager | Yes/manager | Not confirmed/legacy route restrictions |
| Create/update/delete session | No | Conditional: assigned/owned | Yes/manager subject to resource policy | Yes/manager subject to resource policy | Not confirmed/legacy route restrictions |
| Create own student registration | Yes | No | Manager may create per policy | Manager may create per policy | Not confirmed |
| Create own lecturer registration | No | Yes | Manager may create per policy | Manager may create per policy | Not confirmed |
| Manage registrations | Own-resource behavior conditional | Own-resource behavior conditional | Conditional: manager/owner | Conditional: manager/owner | Not confirmed |
| Create/manage course request | No | No | Yes | Yes | Not confirmed |
| Open statistics | No | No | Current route gate says coordinator | Nav flag exposes item, route may redirect (mismatch) | Not confirmed |
| CodePulse terms/classrooms | Member-scoped read if allowed | Assigned class read | Not confirmed | Not confirmed | Yes: term/classroom admin |
| CodePulse assignment authoring/publish | No | Conditional: assigned lecturer | No/not established | No/not established | No in current assignment capability logic |
| CodePulse student workspace | Own only | Conditional: assigned class student workspace view | Not established | Not established | No: admin workspace access restricted |
| CodePulse lab management | No | Conditional: assigned lecturer | Not established | Not established | Not established |

## Mobile route decisions

- Student: Courses, Schedule, Library; More contains own requests/registration and account. Roster remains read-only and only from an enrolled course.
- Lecturer: same stable tabs; More contains lecturer registration and assigned-course management. Mutations require server-returned capability.
- Coordinator/chairman: same stable tabs; More exposes coordination/report destinations only after the server contract and chairman route mismatch are resolved.
- Admin: same stable tabs; More exposes CodePulse term/classroom administration. Do not imply unrestricted access to student data, sessions or submissions.

## Unknown capability handling

If API omits permission/capability, client hides unsafe action and shows a recoverable unsupported/permission message; it does not infer from `isManager`, screen path, local storage or labels. Add backend authorization tests for each matrix row before release. Resolve all “Not confirmed” entries with backend owner rather than converting them to “Yes”.
