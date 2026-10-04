# AI-assisted Student–Tutor matching

This package documents and implements a coordinator-reviewed matching workflow for the HCMUT Tutor Support System. Research citations distinguish **SOURCE SAYS** from **OUR DESIGN DECISION**; papers from other settings are not treated as HCMUT results.

## Read in this order

1. [Current source audit and implementation evidence](00-current-system-audit.md)
2. [Literature review and cited sources](01-literature-review.md)
3. [Formal matching problem and constraints](02-problem-formulation.md)
4. [Student/tutor data contract](03-data-contract.md)
5. [Extractor, baselines and ranker](04-model-design.md)
6. [API and persistence contract](05-api-design.md)
7. [Quality and evaluation protocol](06-evaluation-plan.md)
8. [Implementation and verification status](07-implementation-plan.md)
9. [Pipeline, local run and deploy guide](08-ai-pipeline-local-deploy.md)

The related [Flutter mobile migration plan](../flutter-mobile-plan/README.md) now points to these APIs and describes their current limitations.

## Implemented now

- Backend-only Boolean hard filter; ineligible tutors are not scored or sent to embeddings.
- TF-IDF word/bigram + cosine default; BGE-M3 dense embedding option through a local, offline-only adapter.
- Deterministic Vietnamese/English taxonomy extraction with literal text evidence. It is not an LLM and does not infer verified competence.
- Available-feature equal-weight ranking, explicit non-probability label, evidence-coded explanations.
- Persistent coordinator decisions and assignments with current capacity revalidation.
- Offline ranking evaluator and dataset schema; real evaluation remains gated on anonymized Coordinator/domain-expert labels.
- Registration form capture for explicit weekly time windows and tutor maximum active students.
- Coordinator review UI and server-side authorization.

## Run the checks

```powershell
Push-Location backend
npm test
Pop-Location
Push-Location frontend
npm run check-types
Pop-Location
```

For BGE-M3 adapter setup, see [`backend/ai-service/README.md`](../../backend/ai-service/README.md). The normal path uses TF-IDF and does not require the Python service.

For reviewed-data evaluation format and invocation, see the [evaluation plan](06-evaluation-plan.md). The CLI intentionally refuses synthetic unit fixtures.

## Evidence boundary

Automated tests establish software behavior, not ranking quality. No HCMUT Coordinator-labeled relevance benchmark or comparative model result is present. Recommendation weights remain a transparent baseline until a held-out, expert-reviewed evaluation justifies changes.
