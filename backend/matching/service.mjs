import { evaluateHardConstraints } from './hard-constraints.mjs';
import {
  buildFeatureVector,
  buildStudentText,
  buildTutorText,
  combineAvailableFeatures,
} from './features.mjs';
import { cosineSimilarity as vectorCosine, createEmbeddingProvider, DEFAULT_BGE_M3_REVISION } from './embedding-provider.mjs';
import { extractProfile } from './profile-extractor.mjs';
import { scoreTfidf } from './tfidf.mjs';
import { normalizeRegistration } from './contracts.mjs';

const MODEL_VERSIONS = {
  TFIDF: 'tfidf-word-bigram-v1',
};

function withExtractedProfile(record, role) {
  const normalized = normalizeRegistration(record, role);
  if (role === 'TUTOR' && record.achievements) {
    normalized.specialRequest = [normalized.specialRequest, String(record.achievements)].filter(Boolean).join('\n');
  }
  const extractedProfile = extractProfile(normalized.specialRequest);
  const explicitTopicIds = normalized.topicIds;
  const extractedTopicIds = extractedProfile.topics.map((topic) => topic.value);
  return {
    ...normalized,
    topicIds: [...new Set([...explicitTopicIds, ...extractedTopicIds])],
    extractedProfile,
    extractedAvailability: extractedProfile.availability,
  };
}

function activeAssignmentCount(assignments, tutorRegistrationId) {
  return assignments.filter((assignment) => assignment.tutorRegistrationId === tutorRegistrationId
    && assignment.status === 'ACTIVE').length;
}

function constraintReasons(constraints) {
  return Object.entries(constraints).map(([constraint, result]) => ({
    constraint,
    passed: result.passed,
    reason: result.reason,
  }));
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function sharedWindowEvidence(student, tutor) {
  const studentWindows = student.availability?.windows?.length
    ? student.availability.windows
    : student.extractedAvailability?.windows ?? [];
  const tutorWindows = tutor.availability?.windows?.length
    ? tutor.availability.windows
    : tutor.extractedAvailability?.windows ?? [];
  const evidence = [];
  for (const studentWindow of studentWindows) {
    for (const tutorWindow of tutorWindows) {
      if (studentWindow.dayOfWeek !== tutorWindow.dayOfWeek) continue;
      const startTime = studentWindow.startTime > tutorWindow.startTime ? studentWindow.startTime : tutorWindow.startTime;
      const endTime = studentWindow.endTime < tutorWindow.endTime ? studentWindow.endTime : tutorWindow.endTime;
      if (startTime < endTime) evidence.push(`${DAY_LABELS[studentWindow.dayOfWeek]} ${startTime}-${endTime}`);
    }
  }
  return [...new Set(evidence)];
}

function normalizeModel(value) {
  const model = String(value ?? 'TFIDF').trim().toUpperCase();
  if (model !== 'TFIDF' && model !== 'BGE_M3') {
    const error = new Error('model phải là TFIDF hoặc BGE_M3.');
    error.status = 400;
    error.code = 'INVALID_MATCHING_MODEL';
    throw error;
  }
  return model;
}

function createMatchingService({ embeddingProvider = createEmbeddingProvider() } = {}) {
  return {
    async recommend({ studentRecord, tutorRecords, assignments, topK = 10, model = 'TFIDF' }) {
      const selectedModel = normalizeModel(model);
      const student = withExtractedProfile(studentRecord, 'STUDENT');
      const tutors = tutorRecords.map((record) => withExtractedProfile(record, 'TUTOR'));
      const excluded = [];
      const eligible = [];

      // Hard constraints are evaluated for every candidate before any text is sent to a model.
      for (const tutor of tutors) {
        const activeCount = activeAssignmentCount(assignments, tutor.id);
        const decision = evaluateHardConstraints(student, tutor, activeCount);
        if (decision.eligible) eligible.push({ tutor, constraints: decision.constraints });
        else excluded.push({ tutorRegistrationId: tutor.id, reasons: constraintReasons(decision.constraints) });
      }

      let semanticScores = [];
      const studentText = buildStudentText(student);
      const tutorTexts = eligible.map(({ tutor }) => buildTutorText(tutor));
      semanticScores = Array(eligible.length).fill(null);
      const textCandidateIndexes = studentText.trim()
        ? tutorTexts.map((text, index) => text.trim() ? index : -1).filter((index) => index >= 0)
        : [];
      if (selectedModel === 'TFIDF' && textCandidateIndexes.length > 0) {
        const scores = scoreTfidf(studentText, textCandidateIndexes.map((index) => tutorTexts[index]));
        textCandidateIndexes.forEach((candidateIndex, index) => { semanticScores[candidateIndex] = scores[index]; });
      } else if (selectedModel === 'BGE_M3' && textCandidateIndexes.length > 0) {
        // The external local adapter receives only candidates that passed every hard constraint.
        // One student text plus at most 50 tutor texts fits the adapter contract.
        for (let offset = 0; offset < textCandidateIndexes.length; offset += 50) {
          const candidateIndexes = textCandidateIndexes.slice(offset, offset + 50);
          const vectors = await embeddingProvider.embed([
            studentText,
            ...candidateIndexes.map((index) => tutorTexts[index]),
          ]);
          candidateIndexes.forEach((candidateIndex, index) => {
            semanticScores[candidateIndex] = vectorCosine(vectors[0], vectors[index + 1]);
          });
        }
      }

      const candidates = eligible.map(({ tutor, constraints }, index) => {
        const semanticSimilarity = semanticScores[index];
        const features = buildFeatureVector(student, tutor, semanticSimilarity);
        if (Number.isFinite(semanticSimilarity)) {
          // TF-IDF vectors are nonnegative, so their cosine is already in [0, 1].
          // Dense embedding cosine can be in [-1, 1], so map only that model's
          // ranking feature monotonically to [0, 1]. Neither is a probability.
          features.semanticRankingScore = selectedModel === 'BGE_M3'
            ? Math.max(0, Math.min(1, (semanticSimilarity + 1) / 2))
            : Math.max(0, Math.min(1, semanticSimilarity));
        }
        const rankingScore = combineAvailableFeatures(features);
        const reasons = [];
        if (student.subjectIds.some((id) => tutor.subjectIds.includes(id))) reasons.push({ code: 'SHARED_SUBJECT', value: student.subjectIds.find((id) => tutor.subjectIds.includes(id)) });
        if (student.languages.some((id) => tutor.languages.includes(id))) reasons.push({ code: 'SHARED_LANGUAGE', value: student.languages.find((id) => tutor.languages.includes(id)) });
        const sharedOnline = constraints.locationMatch.reason === 'shared_online_mode';
        if (sharedOnline) reasons.push({ code: 'SHARED_ONLINE_MODE' });
        if (constraints.locationMatch.reason === 'shared_onsite_location') {
          reasons.push({ code: 'SHARED_ONSITE_LOCATION', value: student.locationIds.find((id) => tutor.locationIds.includes(id)) });
        }
        if (Number.isFinite(features.topicFit) && features.topicFit > 0) {
          const sharedTopics = student.topicIds.filter((id) => tutor.topicIds.includes(id));
          reasons.push({
            code: 'SHARED_EXTRACTED_TOPICS',
            value: sharedTopics,
            evidence: {
              student: student.extractedProfile.topics.filter((topic) => sharedTopics.includes(topic.value)).map((topic) => topic.evidence),
              tutor: tutor.extractedProfile.topics.filter((topic) => sharedTopics.includes(topic.value)).map((topic) => topic.evidence),
            },
          });
        }
        if (Number.isFinite(features.teachingStyleFit) && features.teachingStyleFit > 0) {
          const sharedStyles = student.extractedProfile.teachingPreferences
            .filter((style) => tutor.extractedProfile.teachingPreferences.some((item) => item.value === style.value));
          reasons.push({
            code: 'SHARED_EXTRACTED_TEACHING_STYLE',
            value: sharedStyles.map((style) => style.value),
            evidence: {
              student: sharedStyles.map((style) => style.evidence),
              tutor: tutor.extractedProfile.teachingPreferences
                .filter((style) => sharedStyles.some((item) => item.value === style.value))
                .map((style) => style.evidence),
            },
          });
        }
        if (constraints.availabilityMatch.reason === 'overlapping_availability') {
          reasons.push({ code: 'OVERLAPPING_AVAILABILITY', value: sharedWindowEvidence(student, tutor) });
        }
        return {
          tutorRegistrationId: tutor.id,
          rankingScore,
          features,
          reasons,
          hardConstraints: constraintReasons(constraints),
        };
      }).sort((left, right) => (right.rankingScore ?? -1) - (left.rankingScore ?? -1)
        || left.tutorRegistrationId.localeCompare(right.tutorRegistrationId));

      return {
        matchingSchemaVersion: 1,
        extractionVersion: 'controlled-taxonomy-v1',
        model: selectedModel,
        modelVersion: selectedModel === 'BGE_M3'
          ? embeddingProvider.modelVersion ?? `BAAI/bge-m3@${process.env.MATCHING_BGE_M3_REVISION?.trim() || DEFAULT_BGE_M3_REVISION}`
          : MODEL_VERSIONS[selectedModel],
        ranking: 'equal-weight-available-features-v1',
        scoreSemantics: 'ranking_score_not_probability',
        reviewWarnings: student.extractedProfile.unresolved,
        // The HTTP route validates user-facing topK to 1..50. Keeping this
        // service limit tied to the supplied pool also lets offline evaluation
        // rank every judged candidate instead of silently truncating recall.
        candidates: candidates.slice(0, Math.max(1, Math.min(tutors.length || 1, Number(topK) || 10))),
        excluded,
        counts: { evaluated: tutors.length, eligible: eligible.length, excluded: excluded.length },
      };
    },
  };
}

export { MODEL_VERSIONS, createMatchingService, withExtractedProfile };
