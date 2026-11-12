# CodePulse issue detection

CodePulse stores one asynchronous assessment record for each saved, run, or submitted snapshot. Each record pins the problem version and tracks snapshot, execution, and submission coverage. Events receive an idempotency key and a monotonically increasing sequence per workspace. Repeated event IDs return the original assessment. The worker holds later events when a sequence is missing, then resumes them in order when the gap is filled or after a service restart.

Immutable submissions queue a sandbox execution against their pinned assignment version after the submission is accepted. The assessment worker waits for that execution result in the background; the submission endpoint does not wait for AI inference or test completion. If the runner cannot accept the job, the assessment records an infrastructure failure and does not create an issue case.

## Local AI providers

The default provider is Ollama at `http://127.0.0.1:11434/api/chat`, using `qwen3:4b`. Both settings are overridable:

The backend does not download models or start either inference server. The selected model must already be installed and its local server running; missing providers are recorded as failed assessments without affecting student requests.

- `CODEPULSE_AI_PROVIDER`: `ollama` (default), `colibri`, or `openai`.
- `CODEPULSE_OLLAMA_ENDPOINT`: Ollama chat endpoint; defaults to the local API above.
- `CODEPULSE_OLLAMA_MODEL`: Ollama model name; defaults to `qwen3:4b`.
- `CODEPULSE_OLLAMA_KEEP_ALIVE`: how long Ollama keeps the model in memory; defaults to `5m` to avoid reloading between nearby assessments.
- `CODEPULSE_AI_TIMEOUT_MS`: per-provider timeout; defaults to 60 seconds and is capped at 180 seconds.
- `CODEPULSE_AI_MAX_TOKENS`: response token limit; defaults to 512 and is capped at 1,024.

Ollama uses its native JSON chat API with thinking disabled and deterministic output. The worker has one inference in flight at a time, and each response is capped to keep background resource use bounded. Student save, run, and submit requests do not wait for this worker.

Colibri can be selected as the only provider or configured as a sequential fallback. It exposes an OpenAI-compatible endpoint:

- `CODEPULSE_COLIBRI_ENDPOINT`: full chat-completions URL; defaults to `http://127.0.0.1:8000/v1/chat/completions`.
- `CODEPULSE_COLIBRI_MODEL`: the model ID reported by the running Colibri server.
- `CODEPULSE_COLIBRI_API_KEY`: optional bearer token; it must match the Colibri server's `COLI_API_KEY`.
- `CODEPULSE_AI_FALLBACK_PROVIDER`: optional fallback provider, such as `colibri` when Ollama is primary.

For example, start the backend with Ollama primary and Colibri failover in PowerShell after Colibri is configured:

```powershell
$env:CODEPULSE_AI_PROVIDER = 'ollama'
$env:CODEPULSE_OLLAMA_MODEL = 'qwen3:4b'
$env:CODEPULSE_AI_FALLBACK_PROVIDER = 'colibri'
$env:CODEPULSE_COLIBRI_MODEL = '<model-id-reported-by-colibri>'
npm run backend
```

Failover is sequential: Colibri is called only if Ollama errors or returns invalid JSON. A valid empty finding list is treated as insufficient evidence and does not trigger a second model call. This avoids duplicate inference load and helps keep the student workflow responsive. Since Colibri holds a model process in memory and queues requests internally, do not run two large models in parallel on a memory-limited machine.

The previous custom OpenAI-compatible configuration remains supported. Set `CODEPULSE_AI_ENDPOINT` to the full endpoint, `CODEPULSE_AI_MODEL` to its model ID, and optional `CODEPULSE_AI_API_KEY` for a bearer token; when the provider name is omitted, this configuration takes precedence over Ollama defaults. Configure only providers approved to process student code. Provider timeouts and errors are logged without exposing credentials or changing student results.

The provider must return JSON with a `findings` array. Each finding must use one of the approved `ProblemType` identifiers (`INFINITE_RECURSION`, `POINTER_MEMORY_LEAK`, or `BOUNDARY_FAILURE`), include a rationale, and cite exact snapshot lines, a failed test outcome, or a known execution/submission event. The backend rejects unknown types, fabricated code excerpts, successful test references, and evidence that does not match the stored inputs.

## Records and lecturer review

`codepulse-issue-detection.json` stores assessments, approved problem types, issue cases, case evidence, and related test cases. Assessment states are `PENDING`, `EVALUATING`, `EVALUATED`, `INSUFFICIENT_EVIDENCE`, and `FAILED`. Only lecturers assigned to a classroom can list these records or change an active case to `RESOLVED` or `DISMISSED`. Students have no assessment or case diagnostics endpoint. The existing immutable snapshot API is `GET`/`POST /api/codepulse/workspaces/:workspaceId/snapshots`; lecturer reads are limited to workspaces in classrooms they manage.

The lecturer view is in the DSA course's Terms and classrooms section. It provides a student summary table, case and milestone filters, case lifecycle controls, and inspectable snapshot/test evidence. Authenticated server-sent events update the view after assessment or case changes; a slower polling refresh is retained for recovery if the stream is unavailable. The stream is limited to lecturers assigned to the requested classroom.

Backend regression coverage in `backend/test/issue-detection.test.mjs` exercises concurrent event ordering, duplicate delivery, active-case evidence accumulation, sequence-gap recovery, restart recovery, and the separation of runner errors, provider failures, and unverifiable findings. The snapshot endpoint's immutability and revision behavior are also covered by `backend/test/snapshot-conflict.test.mjs`.

## Evaluation quality gate

This repository does not include the D-06 independent evaluation dataset, numerical thresholds, or the deployed model configuration. AC-13f therefore remains unverified; passing sample or mock outputs is not a substitute for the required evaluation. Record the actual provider/model configuration and evaluate it against the approved independent dataset before claiming that gate is satisfied.
