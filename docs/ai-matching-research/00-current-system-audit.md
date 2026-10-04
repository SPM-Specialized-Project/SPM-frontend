# Current-system audit: Student–Tutor matching

**Baseline audit:** 2026-10-02, before the matching implementation in this documentation package. The baseline describes the checked-out source at that point, not a deployed environment.

## Scope and evidence labels

- **Observed:** directly visible in the source or checked-in data inspected for this document.
- **Proposed:** a design choice in this research package; it is not implemented merely because it is documented.
- **Unknown:** not established by the inspected repository.

The older report's matching section is [chapter 9, printed pages 90–95](../../group07_report%2004.pdf#page=90). It documents a rule-based hard-match helper and proposes a future AI extension. It is a project report, not empirical evidence that the proposed AI has been implemented or evaluated.

## Current flow

| Area | Observed in source | Consequence |
|---|---|---|
| Web action | `frontend/src/features/~_private/~overview/~index.tsx` sets a loading state, switches tabs, and clears the state after five seconds. | The button does not call an AI/model or matching endpoint. |
| Frontend helper | `frontend/src/utils/matching.ts` compares overlapping subject IDs, language IDs, and session-type IDs; it checks location when the student has the literal mode ID `offline`. | This helper is not an authoritative backend policy and does not rank candidates, check availability/capacity, or allocate tutors globally. |
| Coordinator selection | `frontend/src/features/~_private/~overview/components/data-tab.tsx` filters the popup by course-code text. Confirmation updates registration status in the client store and logs the selected ID. | It does not persist a Student–Tutor assignment. |
| Result view | `frontend/src/features/~_private/~overview/components/result-tab.tsx` groups existing sessions and displays pending registration rows. | Existing session grouping is not a recommendation result. |
| Backend registration API | `backend/routes.mjs` exposes JSON-backed registration GET/POST/PATCH/DELETE. | No matching/recommendation/assignment endpoint exists in the inspected backend. |
| Persistence | `backend/data/storage.mjs` persists named collections to JSON files under `backend/data`. | There is no relational database or schema migration framework in this backend. New matching collections must follow this store or introduce a separately approved persistence change. |
| Registration contract | `backend/data/seeds.mjs`, `backend/data/registrations.json`, and frontend registration types contain subjects, languages, session types, locations, free-text `specialRequest`, status and ownership. | Availability, tutor topic competencies, competence level, verified evidence, capacity and workload are not consistently structured. |

## Data defects and missing values

- Existing values mix mode IDs such as `online`, `offline`, and `hybrid`; at least one frontend tutor fixture uses the ID `online` with the Vietnamese display name for in-person teaching. IDs and display labels therefore cannot safely be treated as a canonical contract.
- A tutor fixture references `mockLocations[11]` while the visible location list contains only four entries. This is an invalid fixture reference, not a real location.
- `specialRequest` is free text for both sides. It can mention learning topics or schedule preferences, but does not prove structured competence, availability, experience, rating, or capacity.
- The checked-in backend registration records inspected for this audit have no matching profile, assignment, or feedback history. Historical recommendations and capacity cannot be inferred from the current registration collection.
- The source helper checks pairwise eligibility only. It does not enforce the one-tutor-per-student and tutor-capacity constraints needed for a batch allocation.

## Current capability statement

**Observed:** registration CRUD, a client-side hard-match helper, coordinator UI, and a simulated “Gợi ý AI” wait state.

**Not observed:** an AI model, inference adapter, structured NLP extraction service, matching API, recommendation persistence, assignment persistence, matching feedback, capacity data, or local evaluation dataset with coordinator judgments.

The baseline gaps motivated the design. The current local implementation status is recorded below; code and tests do not prove better match quality. That requires the evaluation described in [06-evaluation-plan.md](06-evaluation-plan.md).

## Implemented in this checkout after the baseline audit

The local web/backend implementation now has a coordinator-only recommendation API, a backend hard-feasibility gate, deterministic bilingual phrase extraction, TF-IDF + cosine default ranking, optional BGE-M3 embedding service adapter, JSON persistence for recommendations/decisions/assignments/feedback, capacity revalidation on acceptance, and a coordinator review panel. Student/tutor registration forms now capture explicit schedule windows, and tutor forms capture maximum active students. See [implementation plan and current evidence](07-implementation-plan.md).

**Verified in this checkout:** see the current command results in [07-implementation-plan.md](07-implementation-plan.md). These establish exercised code paths and type consistency only. They are not a labeled quality benchmark.

**Still unverified:** a coordinator-reviewed HCMUT relevance dataset, ranking metrics, production deployment, privacy/fairness approval, and multi-process transactional consistency. The pinned local BGE adapter and Node-to-adapter request path ran on CPU; `/health` reported 1024 dimensions, and example Vietnamese/English requests returned finite vectors without a Hugging Face Hub warning. This is an inference smoke check, not recommendation accuracy or a quality benchmark.
