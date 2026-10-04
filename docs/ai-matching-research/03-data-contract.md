# Data contract and legacy normalization

## Contract version

New matching contracts use `matchingSchemaVersion: 1`. The JSON files in this repository are schemaless collections; this contract is validated at the matching boundary and added incrementally. No database migration framework exists in the inspected backend.

## Canonical enums

```text
RegistrationRole = STUDENT | TUTOR
SessionMode = ONLINE | ONSITE | HYBRID
Intent = EXAM_PREP | FOUNDATIONAL | TOPIC_LEARNING
       | ASSIGNMENT_SUPPORT | SCHEDULING | TEACHING_PREFERENCE
```

Known legacy mode IDs map as `online → ONLINE`, `offline → ONSITE`, `hybrid → HYBRID`. Canonical IDs take precedence over stale display labels. Unknown IDs are rejected with a validation error; do not infer from translated names. Language and location use stable IDs, not labels. Subject uses the source course/subject ID, never a parsed display string.

## StudentNeed

```json
{
  "registrationId": "student-registration-id",
  "subjectIds": ["subject-id"],
  "acceptedLanguages": ["vi"],
  "requestedModes": ["ONLINE"],
  "locationIds": [],
  "availability": {
    "timezone": "Asia/Ho_Chi_Minh",
    "windows": [{"dayOfWeek": 6, "startTime": "08:00", "endTime": "12:00"}]
  },
  "specialRequest": "Muốn ôn Big-O và sorting vào cuối tuần.",
  "extractedNeed": {
    "schemaVersion": 1,
    "intents": [{"value": "TOPIC_LEARNING", "evidence": "ôn Big-O và sorting"}],
    "topics": [{"value": "algorithm.big_o", "evidence": "Big-O"}],
    "learnerLevel": null,
    "targetLevel": null,
    "teachingPreferences": [],
    "availabilityConstraints": [{"value": "0,6", "evidence": "cuối tuần"}],
    "unresolved": ["availability_requires_explicit_time_range"]
  }
}
```

## TutorProfile

```json
{
  "registrationId": "tutor-registration-id",
  "subjectIds": ["subject-id"],
  "acceptedLanguages": ["vi", "en"],
  "acceptedModes": ["ONLINE", "ONSITE"],
  "locationIds": ["location-id"],
  "availability": {
    "timezone": "Asia/Ho_Chi_Minh",
    "windows": [{"dayOfWeek": 6, "startTime": "08:00", "endTime": "12:00"}]
  },
  "maxActiveStudents": 2,
  "topicCompetencies": [{
    "topicId": "algorithm.big_o",
    "level": null,
    "evidenceType": "SELF_DECLARED",
    "evidenceRef": null
  }],
  "teachingStyles": [],
  "experience": null,
  "specialRequest": "Tôi có thể hướng dẫn Big-O và phân tích thuật toán."
}
```

`maxActiveStudents`, availability, competence levels, verified evidence, ratings and experience may be absent in legacy records. The matching service reports a missing-data reason and does not create a value. `currentWorkload` is derived from persisted active assignments; do not store a second unsynchronized counter.

The example values above illustrate schema shape only. They are not existing user data.

## NLP extraction schema

The extractor may only return taxonomy-controlled intents/topics and literal evidence spans. Each value carries a canonical ID and an evidence span when available. Confidence is optional and must not be surfaced as calibrated probability unless separately calibrated. Schema validation (Zod/Pydantic) is followed by business validation against allowed taxonomy IDs. A model may not set tutor IDs, eligibility, `rankingScore`, or assignment decisions.

The implemented initial extractor uses a deterministic bilingual taxonomy and literal source spans. A day without an explicit time range is retained as unresolved evidence and is not converted to an all-day hard constraint. If an LLM provider is added later, it is limited to this extraction contract; output is validated, and a Coordinator can review/correct ambiguous extracted needs.

## Hard fields versus soft fields

| Field | Purpose | If missing |
|---|---|---|
| subject, language, mode | Hard feasibility | Reject or report invalid legacy data. |
| onsite location | Hard feasibility when onsite | Reject as unverifiable. |
| student-required availability | Hard feasibility for explicit structured or day-plus-time windows, after timezone equality | Reject as unverifiable if tutor windows/timezone are missing. |
| tutor capacity | Hard feasibility | Reject as capacity not configured. |
| topic competencies | Semantic/structured ranking | Mark `topicFit` unavailable; do not infer verified competence from prose. |
| teaching style, learner/target level, experience, ratings | Optional ranking/evaluation | Mark unavailable until structured source data exists. |

## Legacy rollout

1. Validate records at the matching boundary; preserve source JSON and IDs.
2. Normalize known mode aliases in memory with a recorded mapping. Never mutate registration data merely by reading it.
3. Reject unknown mode IDs and invalid foreign IDs with actionable reason codes.
4. New registration forms capture structured windows and tutor capacity. Do not bulk-fill capacity or availability for existing tutors.
5. Recommendations persist matching schema and extractor versions so later changes do not silently reinterpret past output.
