# Evaluation plan

## Evidence status

No HCMUT coordinator-judged recommendation benchmark or measured model result was found in the inspected repository. Existing fixtures and accepted/pending/declined statuses are not relevance judgments. Do not use them as ground truth without a reviewed labeling protocol.

If historical matches are insufficient, build a reproducible anonymized benchmark from Coordinator-reviewed candidate pairs. This requires a Coordinator/domain expert to label; developers must not invent labels or treat a synthetic smoke fixture as a real benchmark.

## Benchmark record

Store one query group per student request with:

- stable pseudonymous query and tutor IDs;
- schema/taxonomy and source snapshot version;
- only the text/profile attributes authorized for evaluation;
- hard-constraint outcome and reason codes;
- two independent relevance grades if feasible, on an agreed ordinal rubric (for example 0 not suitable, 1 weak, 2 suitable, 3 strong);
- labeler role/version and adjudication record;
- train/validation/test group assignment.

Labels must evaluate eligible pairs only for ranking metrics. Hard-ineligible pairs belong in constraint tests, not in model ranking. Split by student/request identity (and by time where historical feedback is used) to avoid the same request appearing in both development and test. Keep synthetic fixtures separate and clearly named.

## Baselines to compare

1. Current deterministic rule baseline after canonicalization (candidate coverage/no-candidate and eligibility only; it produces no relevance ranking).
2. TF-IDF + cosine.
3. Multilingual embedding + cosine, starting with BGE-M3 dense mode.
4. Hybrid structured topic overlap + semantic score, equal-weight MVP.
5. Optional multilingual cross-encoder/reranker on the already-feasible candidate set.

Run the same query groups, feasible candidate set, split, `K`, and relevance judgments for every model. Pin model revision and preprocessing. A full Coordinator report should include sample/query counts, language/topic slices, missing-field coverage and confidence intervals; do not report a score if the benchmark has not been labeled/run.

## Metrics

- `Precision@K`, `Recall@K`, `MRR`, `MAP@K`, and `HitRate@K` for binary suitable/not-suitable views.
- `nDCG@K` for the agreed graded relevance labels and rank-sensitive gain.
- Hard constraint violation rate (must be exactly zero by construction and test).
- No-candidate rate and recommendation coverage.
- Top-K Coordinator acceptance, rejection/override rate, and reason, once persisted decisions exist. These are workflow measures and may be selection-biased; do not call them pure relevance labels.
- Inference/API latency, errors, model load time, and resource usage.
- Tutor load distribution and outcome slices, once valid capacity and assignment data exist.

Define acceptable thresholds with product/Coordinator before reading the held-out test result. Do not select thresholds or weights after inspecting the test set.

## Fairness, privacy, and operational checks

- Review ranking and coverage across approved, relevant slices such as language, delivery mode and subject; only evaluate demographic attributes if separately approved and lawfully available.
- Do not use name, email, target grade, or other unrelated identifiers as model features.
- Run a shadow/review pilot where a Coordinator sees suggestions but retains assignment authority. Preserve an override path and collect a reason without coercing acceptance.
- Do not send free-text student requests to an external inference provider until provider, purpose, retention, redaction and institutional privacy/security review are approved.
- Re-evaluate on model/taxonomy/profile changes; retain versioned evidence. NIST AI RMF is a risk-management reference, not a compliance certificate.

## Reproducibility gate

An evaluation run records commit, data snapshot hash, query groups, model ID/revision, extraction/taxonomy version, feature definition, weights, random seed, metric implementation and output artifact. Synthetic unit fixtures may prove code paths but do not count as measured quality evidence.

## Offline evaluator in this checkout

`backend/matching/evaluation-dataset.schema.json` defines the input shape. `backend/matching/evaluate.mjs` reads one anonymized JSON dataset and writes aggregate metrics; it never writes profile text into the result. A quality run requires `labelingStatus: "coordinator_reviewed"` and, per query, an adjudicated rubric version, Coordinator/domain-expert role and reviewer count. Synthetic unit fixtures require an explicit in-process test-only option and the CLI rejects them. Before ranking, the evaluator requires a judgment for every hard-eligible tutor and verifies that all tested models produce the same feasible candidate set. Identifiable profile keys such as name, email, phone, address and student number are rejected. Store real reviewed datasets outside the repository unless their privacy approval explicitly permits version control.

Example invocation after a reviewed dataset has been prepared:

```powershell
node backend/matching/evaluate.mjs --input C:\private\matching-dev.json --output C:\private\matching-metrics.json --models TFIDF,BGE_M3 --k 5
```

The BGE-M3 comparison requires the configured local embedding adapter. Use `--models TFIDF` for the local lexical/hybrid comparison only; that is not a comparison with embeddings. Methods reported are a feasibility-only stable-ID ordering, semantic-only TF-IDF/BGE-M3, and each model's hybrid rank. The rule ordering is a deliberately weak no-relevance baseline, not a score claimed by the previous UI. Precision@K uses K as denominator, relevance grades 2–3 count as relevant for binary metrics, and nDCG uses the full graded scale. Macro metrics use query groups that have at least one eligible grade ≥2; the report includes that query count. The current CLI emits point estimates and semantic-feature coverage; stratified slices and confidence intervals remain to be added before a full evaluation report. No real benchmark file or Coordinator labels were found or manufactured in this checkout, so the evaluator has only been exercised by synthetic unit fixtures.
