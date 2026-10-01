# Networking, authentication, storage and error handling

## Environment and HTTP

Inject an API base URL per dev/staging/prod build (for example through build-time defines or flavor configuration); it must be an HTTPS host reachable from the phone. Do not ship `localhost`, `127.0.0.1`, fixture credentials, signing material or environment secrets in client source. Configure connect/receive timeouts, cancellation, JSON content type, request correlation ID if supported, and redacted structured diagnostics.

Current backend binds to loopback on port 4000 and web relies on Vite `/api` proxying. A real-device build cannot use that topology as-is. Backend/deployment owner must expose the API securely and supply a staging URL before integration.

## Authentication constraints

Current login is email/password and returns a bearer token. Backend sessions are in-memory, expire after eight hours and disappear on restart; there is no refresh or revoke endpoint found. Frontend stores the token in browser localStorage. The mobile app should store token only in platform secure storage, omit it from logs/crash reports, and clear it on logout/401.

Before production, backend owners should define revocation/logout, renewal, password recovery, account lockout, session concurrency, device loss, and secure deployment behavior. If no refresh contract exists, prompt reauthentication on expiry; do not invent a token refresh protocol.

## Error mapping

Normalize transport/backend failures into typed categories:

| Category | UX behavior |
|---|---|
| No connection/timeout | Keep confirmed data and form values; offer retry; label stale/offline state. |
| 400/422 validation | Map field errors where response schema is stable; preserve form. |
| 401 | Clear session once and route to sign-in; resume deep link only after re-auth and access check. |
| 403 | Permission screen/action unavailable; do not retry automatically. |
| 404 | Resource no longer exists; offer back/list refresh. |
| 409 | Explain conflicting/stale update and refetch before retry. |
| 429/5xx | Backoff/retry only for safe/idempotent requests; show correlation/support detail if available. |
| Unknown parsing/contract error | Safe generic message plus redacted diagnostic identifier; do not render raw server body. |

The current API has inconsistent response/error envelopes. Add a backend contract/error schema before relying on field-level mapping.

## Storage/cache

- Credential: OS-backed secure storage; do not store tokens in shared preferences or SQLite unencrypted.
- Non-sensitive settings: ordinary preferences (theme, display choices); never treat as identity/authorization.
- API cache: explicit key includes principal, resource ID and role-sensitive scope; purge on logout, account switch or role change.
- Submitted files: use a backend-provided upload/download contract and signed/authorized URLs; avoid permanent public links or arbitrary webview file rendering.
- Logs: redact Authorization, passwords, student submissions and personal data; apply retention controls.

## Transport-security release gate

Confirm TLS/certificate policy, CORS irrelevance for native clients but server network exposure, Android cleartext restrictions, iOS ATS, rate limiting, session storage/revocation, backend binding, and staging/prod configuration. Do not normalize an insecure development bypass into release code.
