# API and persistence contract

## Trust boundary

All routes require a bearer session. The backend derives actor role and email from the session. `POST`/`GET /api/matching/*` is coordinator/chairman-only; request-supplied roles, eligibility values, scores and identities are not authoritative. The optional Python adapter receives only text for hard-eligible pairs and cannot read/write registrations or create assignments.

## Create recommendations

`POST /api/matching/recommendations`

```json
{"studentRegistrationId":"reg-student-id","model":"TFIDF","topK":10}
```

`model` is `TFIDF` (default) or `BGE_M3`. `topK` is an integer from 1 to 50. The student registration must exist and not be declined/closed/cancelled. Only approved tutor registrations are considered; non-approved tutors appear in exclusions. All hard constraints are evaluated before text scoring or an embedding request.

Response:

```json
{
  "item": {
    "id":"match-rec-id",
    "studentRegistrationId":"reg-student-id",
    "status":"PENDING_COORDINATOR_DECISION",
    "matchingSchemaVersion":1,
    "extractionVersion":"controlled-taxonomy-v1",
    "model":"BGE_M3",
    "modelVersion":"BAAI/bge-m3@5617a9f61b028005a4858fdac845db406aefb181",
    "ranking":"equal-weight-available-features-v1",
    "scoreSemantics":"ranking_score_not_probability",
    "reviewWarnings":[],
    "candidates":[{
      "tutorRegistrationId":"reg-tutor-id",
      "rankingScore":0.86,
      "features":{"semanticSimilarity":0.44,"semanticRankingScore":0.72,"topicFit":1.0},
      "reasons":[{"code":"SHARED_SUBJECT","value":"subject-id"}],
      "hardConstraints":[{"constraint":"capacityAvailable","passed":true,"reason":"satisfied"}]
    }],
    "excluded":[{"tutorRegistrationId":"other-tutor-id","reasons":[{"constraint":"capacityAvailable","passed":false,"reason":"capacity_not_configured"}]}],
    "counts":{"evaluated":4,"eligible":1,"excluded":3}
  }
}
```

The numeric example is illustrative, not a measured result. The response does not contain the free-text profile. Recommendation records persist IDs, version labels, feature values, reason codes, timestamps and coordinator identity; they do not persist raw text or an input snapshot hash. Text stays in the registration collection.

`GET /api/matching/recommendations?studentRegistrationId=...` returns the coordinator-visible saved recommendation history for a student. Candidate `rankingScore` is a ranking value, never a probability. Missing features are omitted and excluded from the equal-weight mean; no synthetic zero is inserted for missing profile data.

## Coordinator decision and assignment

`POST /api/matching/recommendations/{recommendationId}/decision`

Accept:

```json
{"decision":"ACCEPT","tutorRegistrationId":"reg-tutor-id"}
```

Reject one candidate and continue through the same Top-K list:

```json
{"decision":"REJECT","tutorRegistrationId":"reg-tutor-id","reason":"Giờ học không phù hợp sau khi xác nhận."}
```

Reject requires a reason. Before acceptance, the backend re-reads registrations and assignments, verifies current statuses, re-evaluates every hard constraint, enforces one active tutor per student and checks tutor capacity again. A pair rejected by the hard filter cannot be accepted through this endpoint. `GET /api/matching/assignments` returns persisted active assignments with registration IDs and display names, not emails.

Recommendation generation never changes registration status and never creates an assignment. Candidate decisions are recorded separately. Rejecting one tutor does not close the recommendation until all returned candidates have been reviewed; accepting one marks it accepted and creates an active assignment.

## Feedback

`POST /api/matching/feedback` accepts `{ "assignmentId", "outcome", "comment" }`, where outcome is `SUCCESSFUL`, `PARTIAL`, or `UNSUCCESSFUL`. An authenticated Coordinator/Chairman or participant whose authenticated email belongs to the assignment can submit feedback. Feedback is event data, not a training label until a review protocol is approved. There is no feedback-list API or feedback UI in this implementation.

## JSON persistence and consistency boundary

The backend creates these JSON collections under its configured data directory:

- `matching-recommendations.json`: recommendation metadata, ranked feasible candidate IDs, features/reasons, exclusions and review state.
- `matching-assignments.json`: active assignment ID, recommendation/decision references, student/tutor registration IDs, actor and timestamp.
- `matching-decisions.json`: candidate accept/reject, reason, actor and timestamp.
- `matching-feedback.json`: explicit outcome, optional comment, assignment and actor.

Active tutor workload is derived by counting active assignment records; there is no separate counter. Writes use the existing process-local write queue. Assignment decisions are serialized by an additional in-process lock and capacity is rechecked. The JSON store does not provide a multi-file database transaction or cross-process lock: a crash between collection writes or multiple backend workers can leave partial/stale state. This implementation is suitable for local evaluation only; a production multi-instance system needs transactional persistence and deployment review.

## Implemented error codes

`FORBIDDEN`, `STUDENT_REGISTRATION_REQUIRED`, `INVALID_TOP_K`, `STUDENT_REGISTRATION_NOT_FOUND`, `STUDENT_REQUEST_CLOSED`, `INVALID_MATCHING_MODEL`, embedding service errors, `RECOMMENDATION_NOT_FOUND`, `RECOMMENDATION_ALREADY_DECIDED`, `TUTOR_NOT_IN_RECOMMENDATION`, `CANDIDATE_ALREADY_DECIDED`, `MATCHING_PROFILE_CHANGED`, `STUDENT_ALREADY_ASSIGNED`, `MATCH_NO_LONGER_FEASIBLE`, `REGISTRATION_HAS_ACTIVE_ASSIGNMENT`, and feedback validation codes. No fallback from BGE-M3 to TF-IDF is performed.
