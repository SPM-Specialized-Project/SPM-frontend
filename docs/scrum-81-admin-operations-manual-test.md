# SCRUM-81 Admin Operations & Smart Alerts — Manual Test

## Preconditions

- Run the frontend and backend from the PR branch using a fresh, disposable copy of `backend/data`. Set `BACKEND_DATA_DIRECTORY` to that copy; do not use staging, production, or the repository's shared data directory.
- Start the backend with the configured execution sandbox available before testing student runs. Keep the manual test isolated because acknowledging or resolving a seeded alert changes its local data.
- Use the local demo accounts: `admin@gmail.com` / `admin123`, `coordinator@gmail.com` / `coordinator123`, `lecturer@gmail.com` / `lecturer123`, and `student@gmail.com` / `student123`.
- Confirm the disposable copy contains at least one active alert for `class-1`; record its ID before testing.
- As the student, run a LAB workspace with a unique source-code marker in a comment. Capture the returned execution ID; a stored execution is not required beforehand.
- Keep the admin session for system health, trace lookup, and audit review; use the lecturer for an alert lifecycle check and the student for denied-access checks.

## Manual checks

| # | Action | Expected result | Result |
| --- | --- | --- | --- |
| 1 | As admin, open **Giám sát hệ thống**, then run the student LAB workspace. | Queue and worker values come from the local backend. Latency/error rate show no data before a run and reflect the real run afterward. | PASS — 2 workers; after one successful run p50/p95 were 19 ms and error rate was 0%. |
| 2 | As a student, open `/system-monitoring` directly and request health, trace, audit, and alert endpoints. | The route redirects to the dashboard, the system-monitoring navigation item is hidden, and each API request returns HTTP 403. | PASS — route redirect and all four API requests returned the expected result. |
| 3 | As admin, search for the execution ID captured during the test. | The trace belongs to that execution and shows the actual `RECEIVED`, `DISPATCHED`, `EXECUTED`, and `RECORDED` stages. | PASS — all four recorded stages matched the successful execution. |
| 4 | Inspect the returned trace and search for a nonexistent execution ID. | The unique source-code marker and hidden inputs/outputs are redacted. A nonexistent ID returns no trace instead of invented lifecycle events. | PASS — marker absent from API response and stored trace file; unknown ID returned no trace. |
| 5 | Acknowledge an active seeded alert in the admin UI, then acknowledge an active alert through the lecturer API. | Each alert changes to `ACKNOWLEDGED`, its occurrence count stays unchanged, and audit records identify the actor and action. | PASS — admin UI and lecturer API acknowledgements succeeded; audit entries recorded the actions. |
| 6 | As a student, request the admin alert list. | The request returns HTTP 403 and exposes no alert data. | PASS — HTTP 403. |
| 7 | Refresh the admin page and filter alerts by **Đã tiếp nhận**. | Acknowledged alerts remain persisted and the filtered list contains no unacknowledged alerts. | PASS — after reload, filter remained functional; 4 acknowledged rows and 0 unacknowledged rows were shown. |
| 8 | Run 3 consecutive failures, then 2 consecutive timeouts, using the rule test fixture or sandbox. | A warning is created at failure 3, deduplicated/escalated at failure 5, and a critical timeout-loop alert appears at timeout 2. A passing run auto-resolves active alerts for the workspace. | Automated PASS — backend rule tests passed in the 30-test suite; these thresholds were not manually triggered in the browser. |

## Execution record

- Date: 2026-11-12
- Branch/commit: `Feat/Scrum-81`, tested against PR head `fab2141` plus staging `949ed91` and the local PR fixes
- Disposable data directory: `C:\Users\tungq\AppData\Local\Temp\SPM-pr68-manual-data-f12cc87774c64a3ab6f36161b7fca48a`
- Test alert ID: `alert-1794368790593-c61458`
- Test execution ID: `execution-bc9f04de-1088-40e1-9101-a7201b73405a`
- Checks passed/failed: Manual checks 1–7 passed; backend suite 30 passed, 0 failed; frontend type check, lint, and production build passed.
- Notes: The test execution completed successfully (Python, 19 ms, exit code 0). Source was redacted from the trace. One asynchronous assessment request logged `AI_PROVIDER_TIMEOUT`; assessment availability was not verified in this local run. Failure/timeout thresholds were covered by backend rule tests rather than manually triggered in the browser.
