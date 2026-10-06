# Implementation and evidence status

**Snapshot:** 2026-10-03, local checkout only.

## Delivered in this implementation

| Workstream | Code/evidence | Status and limit |
|---|---|---|
| Source and paper audit | [00](00-current-system-audit.md), [01](01-literature-review.md) | Completed. External papers motivate options; no external metric is presented as HCMUT evidence. |
| Contract and normalization | `backend/matching/contracts.mjs`, `profile-extractor.mjs`; new form fields | Implemented for known mode aliases, stable IDs, schedule windows/timezones, capacity, and deterministic taxonomy extraction. Unknown mode IDs and invalid profiles fail eligibility. Legacy values are not bulk-filled. |
| Hard eligibility | `backend/matching/hard-constraints.mjs` | Backend checks subject, language, compatible mode, onsite location when required, explicit overlapping availability in the same timezone, and configured remaining capacity. A shared online option satisfies HYBRID without requiring a location. |
| Text baselines | `tfidf.mjs`, `embedding-provider.mjs`, `backend/ai-service/app.py` | TF-IDF is the default and offline Node baseline. BGE-M3 dense embeddings are optional, pinned to the official model repository revision in the adapter. Neither is trained for Student–Tutor outcomes here. |
| Ranking and explanations | `features.mjs`, `service.mjs` | Equal-weight average of available normalized semantic, topic-overlap and explicitly evidenced teaching-style features. Raw cosine is separately returned; ranking scores are not probabilities. Explanations are deterministic IDs/reasons, not generated claims. |
| Persistence and API | `backend/routes.mjs`, `backend/data/storage.mjs` | Recommendations, candidate decisions, assignments and feedback use JSON collections. Accept revalidates hard constraints and capacity. Coordinator/chairman role comes from the backend session. |
| Coordinator web UI | `frontend/src/features/~_private/~overview/` | The former five-second fake AI wait and client-only assignment popup are removed. Coordinator can approve a tutor only after a positive self-declared capacity is present, selects student/model, reviews reasons/features, accepts or rejects candidates, and sees active assignments. |
| Evaluation code | `backend/matching/evaluate.mjs`, `ranking-metrics.mjs`, `evaluation-dataset.schema.json` | Reproducible evaluator and schema implemented. Coordinator-reviewed HCMUT benchmark data and real quality metrics remain unavailable; synthetic fixtures test calculations only. Current output has point estimates, not confidence intervals or subject/language slices. |

## Verification run

- `backend`: `npm test` — **20 passed, 0 failed**.
- `frontend`: `npm run check-types` — passed.
- Targeted ESLint on the matching panel and coordinator data tab — passed.
- Python adapter syntax compile, evaluation schema JSON parse, and `git diff --check` — passed. Git emitted only line-ending conversion warnings.
- Local BGE HTTP adapter and Node-to-adapter matching path: `/health` succeeded with pinned revision `5617a9f61b028005a4858fdac845db406aefb181`, CPU, 1024 dimensions. A two-text Vietnamese/English smoke request returned two finite normalized vectors of dimension 1024. The matching service consumed the pinned vectors for an eligible pair. The adapter loaded from the exact local snapshot directory; no Hub request was observed. No cosine/acceptance result from this smoke check is interpreted as model quality.
- The BGE adapter was stopped after the smoke check. The default coordinator option remains TF-IDF unless `MATCHING_EMBEDDING_URL` points to the adapter.

## Not completed / evidence needed

1. No Coordinator-labeled HCMUT relevance benchmark exists in the inspected data; `Precision@K`, `nDCG@K`, acceptance-quality claims and comparative model claims remain **not measured**.
2. Legacy tutors have no trustworthy capacity or calendar; they are excluded until the tutor submits a new structured profile with self-declared capacity and an authorized Coordinator approves it. Existing statuses/feedback are not training labels.
3. The browser UI has no feedback form yet. The authenticated feedback API persists explicit outcome events; those events must not be treated as labels without a rubric and review.
4. JSON persistence and in-process locks do not provide multi-instance transactions. Production deployment needs a transactional store, backup/retention policy, privacy/security review and concurrency design.
5. Learning-to-rank, reciprocal preference scoring, batch maximum-weight allocation, auto-assignment and external LLM extraction remain future work. No model is fine-tuned on this repository's data.

## Research-led release gates

- Obtain enough consented, Coordinator-reviewed judgments to split by student/request and avoid leakage.
- Compare deterministic baseline, TF-IDF and BGE-M3 on identical feasible candidate sets and held-out queries. Report sample size and missing-profile coverage next to ranking metrics.
- Review slices by subject, language and mode, and test score explanations with Coordinators before pilot use.
- Keep recommendations advisory. Any future automatic allocation, fairness objective, third-party model access or training workflow needs separate product and institutional review.
