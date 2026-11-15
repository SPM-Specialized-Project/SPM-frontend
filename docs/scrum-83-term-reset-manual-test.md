# SCRUM-83 Term Reset Manual Test

## Preconditions

- Run the frontend and backend from the PR branch against a fresh, disposable local data directory. Do not point the backend at staging, production, or a shared developer data directory; the purge is irreversible for the selected directory.
- Use the local demo accounts: `admin@gmail.com` / `admin123`, `lecturer@gmail.com` / `lecturer123`, and `student@gmail.com` / `student123`.
- Prepare one term in `ENDED` state with `resetDate` in the past, plus a second active term with at least one classroom and student workspace. The reset term should have a known workspace and, when available, a submission, snapshot, activity, execution, per-student submission file, grading job/judgment, and AI assessment/case with evidence.
- Keep the second term's known records as a control set. They must still exist after the first term is purged.
- Start with no reset audit record for the reset term. Record the selected term ID and known record IDs before starting.
- Use an administrator for the reset workflow, a lecturer for audit review and acknowledgement, and a student for the blocked-write checks.

## Manual checks

| # | Action | Expected result | Result |
| --- | --- | --- | --- |
| 1 | As a student, try to start a reset. | The request is rejected and the term remains `ENDED`. | PASS — backend integration test; unauthorized reset returned 403. |
| 2 | As an administrator, try to start reset before `resetDate`. | The request is rejected with the reset-boundary message; no records change. | PASS — backend integration test; returned 409 `RESET_BOUNDARY_NOT_REACHED`. |
| 3 | As an administrator, start reset after the boundary. | The term changes to `RESETTING`; ordinary term editing is locked. | PASS — manually started reset in the local UI; integration test verified reset state and locked edits. |
| 4 | As a student, attempt workspace save, run, and submit while the term is `RESETTING`. | Each write is rejected; no new workspace revision, run, or submission is added. | PASS — backend integration test; all three writes returned 409. |
| 5 | As an administrator, execute the purge. | Existing admitted work drains first; the action completes as `RESETDONE` with a `COMPLETE` audit record and passing reconciliation entries. | PASS — local UI reached `RESETDONE` / `COMPLETE`; reconciliation passed for all nine domains. |
| 6 | Inspect the reset term and the control term. | Reset-scoped workspaces, snapshots, submissions, activities, executions, submission files, grading jobs/judgments, AI assessments/cases/evidence, and case tests are gone; the control term's records remain. | PASS — backend integration test verified purge and retention of control-term rows/files; local UI showed 2 workspaces purged. |
| 7 | As a lecturer, open the reset audit and acknowledge it. | The counts and reconciliation are visible, acknowledgement is saved, and the audit remains available after reload. | PASS — local UI acknowledgement persisted after reload; audit and acknowledgement also verified by integration test. |
| 8 | Restart the backend against the same disposable directory and try a write to the reset term. | The completed reset remains locked and the write is rejected. | PASS — after backend restart, audit remained available and an administrator term edit returned 409. |

## Execution record

- Date: 2026-11-12
- Branch/commit: `Feat/Scrum-83`, PR head `2a9dba2` integrated with staging `57310c7` (tested before merge commit)
- Disposable data directory: `C:\Users\tungq\AppData\Local\Temp\SPM-pr67-manual-data`
- Reset term ID: `term-2026-1`
- Control term ID: `term-2027-1`
- Checks passed/failed: 8/8 passed; backend reset/grading/issue-detection tests 16/16 passed; frontend type check and production build passed.
- Notes: Local browser flow covered administrator reset, purge, lecturer audit review and acknowledgement; acknowledgement persisted after page reload. The seeded `term-2027-1` was `DRAFT`; the integration fixture added a separate `ACTIVE` control term with representative records and confirmed retention. Restarted backend against the same disposable directory; completed audit remained available and edits to the completed term returned 409. Docker-based grading API tests could not run because Docker is unavailable in this environment.
