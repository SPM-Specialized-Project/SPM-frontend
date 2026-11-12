# SCRUM-82 — Manual Test: Backup, Recovery Drill and Session Report

## Preconditions

- Check out the PR branch after integrating the current `staging` branch. Run the backend and frontend locally.
- Copy `backend/data` to a new disposable directory and start the backend with `BACKEND_DATA_DIRECTORY` pointing to that copy. Use a separate backend port. Do not run backup tampering checks against shared, staging, or production data.
- The backup and report checks do not require the code execution sandbox. Use the local demo accounts: `admin@gmail.com` / `admin123`, `coordinator@gmail.com` / `coordinator123`, `lecturer@gmail.com` / `lecturer123`, and `student@gmail.com` / `student123`.
- Available report fixtures in the copied data are LAB `lab-1790764823448` and legacy sessions `s-1`, `s-2`, and `s-3`. The UI also exposes `empty-session-test` for the `N=0` case.
- Before running the recovery drill, record each backup ID and confirm whether its file exists under the disposable data directory's `backups` folder. For corruption checks, alter only a backup file in that directory.

## Manual checks

| # | Action | Expected result | Result |
| --- | --- | --- | --- |
| 1 | As admin, open **Giám sát hệ thống → Sao lưu & Báo cáo học kỳ** and reload the backup list. | The list contains only persisted backup records; each listed artifact is present on disk. | PASS — initial list was empty. |
| 2 | Create a backup for `term-2026-1`. | The response and UI show a new ID, file, positive size and SHA-256 hash. The file contents cover the requested term, and the hash equals SHA-256 of the exact saved bytes. | PASS — hash matched; metadata contained only `term-2026-1`, 2 classrooms, 3 assignments and 8 workspaces. |
| 3 | Run the drill for the new backup. | The drill reports success only when the artifact exists, its checksum matches, JSON parses, and classroom, assignment and workspace references are valid. The audit log records the action. | PASS — valid backup displayed “ĐẠT TIÊU CHUẨN”. |
| 4 | In the disposable directory, alter bytes in the new backup file, then run its drill again. | The drill reports failure and does not overwrite a checksum or parse error with a successful fallback. | PASS — checksum mismatch and malformed JSON reported as failure. |
| 5 | Remove a backup artifact in the disposable directory and run its drill. | The drill reports a missing artifact as failure; it does not simulate a successful verification. | PASS — missing file reported as failure. |
| 6 | Request the backup list/create/drill APIs as a student. | All three requests return HTTP 403; local backup records are unchanged. | PASS — all returned 403. |
| 7 | Load the report for `lab-1790764823448`. Compare registered students, activity windows, assignments, submissions and scores with the copied source records. | Counts use only that LAB/classroom and reflect the stored records; no other LAB or classroom's activity is included. | PASS — current fixture has no matching roster/activity/submissions; report shows N=0, two assignments, zero submissions and N/A values. |
| 8 | Load reports for `s-1`, `s-2`, and `s-3`. | Each report uses the matching session's roster and recorded activity/submission data rather than fixed demonstration values. | PASS — s-1: 1/2 present; s-2: 2/2; s-3: 0/2; no linked graded submissions, so grades are N/A. |
| 9 | Load `empty-session-test`. | `N=0` returns `null` numeric rates/average and `N/A` display values; response is valid JSON without `NaN`, `Infinity`, or HTTP 500. | PASS — N=0 and N/A shown. |
| 10 | Request a nonexistent session ID and open a report as a student. | Unknown IDs return an explicit not-found response instead of another session's report. Authenticated report access follows the documented policy. | PASS — unknown report returned 404; student report for s-1 returned 200. |

## Execution record

- Date: 2026-11-12
- PR head / merged staging commit: `9378bffd` / `16f2cb8` (tested in the integration worktree)
- Disposable data directory: `%TEMP%\spm-pr69-final-fd8118a484e9429b9d43f80edf3542fe`
- Backup IDs tested: `backup-1794478179732-4e182b` (tampered, then removed); `backup-1794478323557-6fe8cd` (valid/hash verified)
- Session IDs tested: `lab-1790764823448`, `s-1`, `s-2`, `s-3`, `empty-session-test`, `not-a-session`
- Checks passed/failed: Manual checklist 10/10 passed. Targeted backend tests 10/10 passed; frontend type check and production build passed.
- Notes: The current lab fixture has no active membership mapped to `class-1` and no matching stored submissions, so its accurate report is N=0. The page also logged shared-layout React SVG attribute/path console errors unrelated to these report and backup checks.
