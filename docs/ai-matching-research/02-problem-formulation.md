# Problem formulation

## Sets and input

- `S`: student registrations eligible for Coordinator review.
- `T`: tutor registrations that are approved/active for recommendations.
- `H(s,t)`: deterministic feasibility mask computed by the application backend.
- `C_s = {t ∈ T | H(s,t) = 1}`: only tutors allowed into feature construction and ranking for student `s`.

The report's pages 90–95 describe rule-based filtering followed by a proposed soft ranker. Its example `FinalScore = 1.0 × HardMatch + 0.3 × AIScore` is a design proposal, not measured evidence: after hard filtering, `HardMatch` is 1 for every ranked pair, so it only adds the same constant; the `0.3` coefficient has no HCMUT-labeled basis in the inspected repository. This document keeps the stages separate and does not reuse those weights.

## Hard feasibility

For a student request `s` and tutor profile `t`:

```text
H(s,t) = subjectMatch
       × languageMatch
       × modeMatch
       × locationMatch
       × availabilityMatch
       × capacityAvailable
```

Each component is Boolean. A `false` factor makes `H=0`; that pair must not be sent to an embedding/reranking provider or scored. An unknown required value fails closed and returns a reason code rather than being invented.

Proposed MVP semantics:

- Subject: shared canonical subject ID is mandatory.
- Language: shared canonical language ID is mandatory.
- Mode: canonical student requested modes must intersect tutor supported modes. Implemented legacy mapping expands `HYBRID` to `ONLINE` or `ONSITE`.
- Location: required only when the common mode requires onsite. A shared online option satisfies a hybrid request without requiring a physical-location overlap. A missing onsite location is not an automatic match.
- Availability: if the student specifies a required structured window, at least one tutor window in the same explicit timezone must overlap. Deterministic text extraction creates a hard schedule constraint only when it finds a day and an explicit time range; vague phrases such as “weekend” are evidence for review, not fabricated full-day availability. If the student has no required window, do not claim that unrecorded availability was verified.
- Capacity: tutor `maxActiveStudents` must be a valid configured integer greater than their current active assignment count. Missing capacity is unavailable and fails closed.

Status eligibility is an input gate: the selected student request must be pending and the tutor profile must be approved/active. Status is not a model feature.

## Semantic and structured features

Only for `t ∈ C_s`, construct feature vector `x(s,t)`. In the first implementation it includes fields only when supported by source data:

- `semanticSimilarity`: cosine similarity of student-need text and tutor-capability text (TF-IDF or multilingual embedding implementation). This is not a probability.
- `topicFit`: set-based Jaccard overlap of taxonomy topic IDs found in the student request and tutor-declared profile/text. It measures shared mentions, not verified competence. Missing profile topics produce `unavailable`, not a synthetic zero.
- `teachingStyleFit`: set-based Jaccard overlap of explicitly extracted style phrases (for example, step-by-step or many examples) when both profiles provide evidence. It is an expressed-text fit, not observed teaching quality.
- `teachingStyleFit`, `difficultyFit`, `experienceFit`, `ratingFit`, `workloadFit`: unavailable until validated structured fields and evidence exist. Workload used for capacity feasibility is a deterministic active-assignment count; it is not a learned relevance feature.

## Initial ranking objective

The MVP ranking score is an interpretable equal-weight baseline over the available normalized features:

```text
R(s,t) = Σ(k ∈ A_st) w_k · x_k(s,t)
w_k = 1 / |A_st|,    Σ w_k = 1,    w_k ≥ 0
```

`A_st` contains only features available for that pair. TF-IDF uses nonnegative vectors, so its cosine is already in `[0,1]`; dense embedding cosine can be in `[-1,1]` and is mapped monotonically to `[0,1]` for ranking. The raw cosine remains visible as `semanticSimilarity`, and `semanticRankingScore` is the normalized feature used by the ranker. The score is named `rankingScore`; it is not calibrated and must not be called a probability. The first version's weights are an **equal-weight baseline**, not learned or empirically optimal.

Hard-match must never appear as a ranking-score feature. Since every ranked pair already satisfies `H=1`, adding `HardMatch` would add a constant and obscure the separation between constraints and preferences.

## Recommendation versus assignment

For one student registration, return Top-K feasible tutors in rank order. This is a ranking task.

For a later global batch allocation, define binary variables `x_st` and solve:

```text
maximize   Σ_s Σ_t R(s,t) x_st
subject to Σ_t x_st ≤ 1            for each student s
           Σ_s x_st ≤ capacity_t   for each tutor t
           x_st ≤ H(s,t)
           x_st ∈ {0,1}
```

This is a capacitated assignment/maximum-weight bipartite matching problem and is explicitly outside the first API. Use a min-cost-flow/assignment method only after the product defines whether unmatched students, fairness, diversity and other global objectives matter. Gale–Shapley stable matching is not a synonym for maximum-weight assignment and is not selected without preference orders from both sides and a stability requirement.

## Learning from Coordinator decisions

Later, a Coordinator's preference `i ≻_s j` can contribute a pairwise loss such as:

```text
L = -Σ log σ(R(s,i) - R(s,j)) + λ ||w||²
```

This is a future learning-to-rank proposal, not the MVP scorer. Do not train on only accepted matches: rejected candidates, exposure, policy, and missing historical labels can bias the sample. Store recommendation context and decision events before considering training.
