# Model and service design

## Pipeline

```text
StudentNeed + TutorProfile
        │
        ▼
Canonicalize and validate
        │
        ▼
Backend hard constraints H(s,t) ── H=0 / unknown ──► reason, stop
        │ H=1 only
        ▼
Extract controlled intents/topics and schedule evidence
        │
        ├── TF-IDF + cosine baseline
        └── Multilingual embedding + cosine baseline (BGE-M3 dense mode)
        │
        ▼
Available structured features + equal-weight baseline rank
        │
        ▼
Deterministic evidence reasons → Coordinator review → persisted decision
```

The main Node backend owns eligibility, capacity, ranking policy, authorization, persistence and assignment creation. The optional Python inference service receives only text needed to produce embeddings and cannot read/write registrations or create assignments. The frontend never computes authoritative matches.

## NLP extraction

The report's intent categories are a useful taxonomy seed, not a labeled training set. Start with a controlled Vietnamese/English taxonomy and deterministic synonym/phrase extraction. Preserve matched spans for explanations. “Cuối tuần” can be retained as Saturday/Sunday day evidence, but without an explicit time range it produces no hard availability window and is returned as unresolved for Coordinator review. If a phrase is ambiguous, do not invent a schedule.

An eventual LLM adapter uses the same versioned JSON schema, validates allowed taxonomy IDs and evidence spans, and has no interface for tutor selection or scoring. It is optional and is not called from the browser. In the current extractor, a weekend phrase without an explicit day and time range is unresolved; it does not become assumed all-day availability.

## Text representations

- Student text: `specialRequest` plus extracted, literal topic/intent terms. Exclude name, email, target grade and unrelated personal identifiers.
- Tutor text: tutor-declared expertise/achievement text and `specialRequest`. Do not claim a verified skill solely because a phrase extractor or embedding model finds similar wording; extracted topic IDs represent mentions only.
- Hard fields (IDs, mode, location, availability and capacity) stay out of semantic scoring and are checked before any model call.

## Baseline A: TF-IDF + cosine

Use local tokenization with normalized Vietnamese/English text, unigrams and bigrams, and TF-IDF weights. Keep important course/topic phrases intact in the taxonomy; word-level overlap is the interpretable lexical baseline. Compute cosine on sparse vectors. No external service or user data transmission is needed.

## Baseline B: multilingual sentence embeddings

Use the dense vector mode of `BAAI/bge-m3` behind `EmbeddingProvider`. The paper describes multilingual dense/sparse/multi-vector retrieval; this project tests dense vectors with cosine only. The local adapter is offline-only and pins verified repository commit `5617a9f61b028005a4858fdac845db406aefb181`; the official model card demonstrates sentence-transformer encoding and cosine similarity [16]. Use CPU/GPU memory, model startup time, latency, and local relevance judgments when choosing deployment. A paper benchmark is a candidate shortlist, not an HCMUT result.

Optionally evaluate `bge-reranker-v2-m3` only after candidate generation and only on `C_s`; it must never receive a hard-rejected pair. Keep reranking behind a separate adapter so it can be disabled and compared.

## Structured feature builder and MVP ranker

The implemented API returns feature values as numbers and omits unavailable values. Implemented data can contribute:

- `semanticSimilarity`: raw cosine, not a probability.
- `topicFit`: Jaccard overlap between normalized extracted student topics and tutor-declared/extracted taxonomy IDs, where both sides provide them. This is shared textual evidence, not a competence verification.
- `teachingStyleFit`: Jaccard overlap between controlled style phrases explicitly found in both free-text profiles, with source spans preserved as evidence.

Compute `teachingStyleFit` only when both profiles contain explicit matches from the controlled style-phrase extractor; retain the literal evidence. Keep level, experience, rating and workload relevance unavailable until validated data and an approved definition exist. For each feasible pair, compute `rankingScore` as the equal-weight mean over available normalized features. TF-IDF cosine is already nonnegative and remains on its native `[0,1]` scale; BGE-M3 cosine is mapped from `[-1,1]` to `[0,1]` for ranking. Preserve and display raw `semanticSimilarity` separately from `semanticRankingScore`. The equal-weight choice is transparent and unlearned.

Deterministic reasons are generated from the feature evidence object: shared subject/language/mode; onsite location overlap; matching time window; topic IDs and controlled teaching-style phrases found on both sides. Do not generate unsupported free-form claims.

## Future reciprocal and global assignment

Reciprocal compatibility requires meaningful tutor-side preferences about students. Those are not present. Do not apply a harmonic mean or other two-sided fusion to missing preference data.

The recommendation endpoint returns one student's Top-K. A future batch optimizer may solve the capacitated maximum-weight bipartite assignment defined in [02-problem-formulation.md](02-problem-formulation.md), after product approval. Do not use a global optimizer to hide unknown capacity or eligibility.

## Version and fallback behavior

Every result records ranker name/version, model ID/revision label, extractor version, matching schema version, normalized features, and reasons. The current implementation does not persist an input snapshot hash. If the embedding service is unavailable or reports a different model/revision, return an explicit inference error; do not silently change the model or label TF-IDF output as BGE-M3.
