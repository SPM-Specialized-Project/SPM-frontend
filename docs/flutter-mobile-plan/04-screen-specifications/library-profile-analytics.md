# Screen specifications: library, profile, analytics and monitoring

## Library (web `/library`, `/library/$query`)

- **Current evidence:** landing page has search input; result/detail components use static/local content; no library endpoint found in inspected backend.
- **Target layout:** search field with clear action; result cards with title/author/availability only when sourced; detail screen with provenance and safe external link.
- **States:** empty prompt, no results, loading/error only if real API exists, unavailable/offline. Static samples must be labeled and cannot imply live availability.
- **Decision:** identify HCMUT library catalog API, authentication, rate limits, terms and deep-link behavior before implementing search.

## Profile (web `/profile`, `/profile/$id`)

- **Current evidence:** placeholder fields and update-looking controls; no profile API confirmed.
- **Target:** initially display only fields returned by a verified current-user endpoint. Defer edits/password change until profile and credential-management contracts exist. Other-user route must limit PII and require explicit authorization.
- **States:** profile unavailable, partial data, unauthorized, save pending/error only once supported. Do not fabricate phone/department/photo defaults.

## Course and global analytics (web `/course/$id/stastical`, `/statistical/*`)

- **Current evidence:** screens derive data from local stores, use sample timestamps/chart placeholders and no backend aggregate endpoint was found. Main route asks for `isCoordinator`; some nav flags allow chairman too. Per-course route spelling has `stastical` typo.
- **Target:** defer charts until aggregate definitions and API are approved. Specify metric name, numerator/denominator, time zone, privacy threshold, refresh timestamp and filter scope. Label partial/incomplete data.
- **Mobile layout:** summary cards then chart/list; provide accessible tabular summary for charts; filters in a sheet; export only if backend and privacy policy permit.
- **States:** no aggregate, no permission, query failure, stale timestamp, data not yet available; never substitute invented sample values.

## System monitoring (web `/system-monitoring`)

- **Current evidence:** coordinator-gated client polls `http://localhost:5000/api/stats` every two seconds for CPU/memory/disk/swap; inspected backend does not provide that endpoint. On phone `localhost` is the phone. No authenticated monitoring service contract verified.
- **Disposition:** do not include in initial mobile release. A later admin/operations feature requires a secured monitoring service, TLS, authorization, rate-appropriate polling, data-retention policy and product decision about mobile audience.
- **Never expose:** host names, process lists, infrastructure credentials, raw metrics endpoint or internal topology to ordinary student/lecturer accounts.
