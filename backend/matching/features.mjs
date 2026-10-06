function jaccardSimilarity(leftValues, rightValues) {
  const left = new Set(leftValues ?? []);
  const right = new Set(rightValues ?? []);
  if (left.size === 0 || right.size === 0) return null;
  const intersection = [...left].filter((value) => right.has(value)).length;
  const union = new Set([...left, ...right]).size;
  return union === 0 ? null : intersection / union;
}

function buildStudentText(student) {
  return [student.specialRequest, ...(student.extractedProfile?.topics ?? []).map((topic) => topic.value)]
    .filter(Boolean).join(' ');
}

function buildTutorText(tutor) {
  return [tutor.specialRequest, ...(tutor.extractedProfile?.topics ?? []).map((topic) => topic.value)]
    .filter(Boolean).join(' ');
}

function buildFeatureVector(student, tutor, semanticSimilarity) {
  const topicFit = jaccardSimilarity(student.topicIds, tutor.topicIds);
  const studentStyles = (student.extractedProfile?.teachingPreferences ?? []).map((item) => item.value);
  const tutorStyles = (tutor.extractedProfile?.teachingPreferences ?? []).map((item) => item.value);
  const teachingStyleFit = jaccardSimilarity(studentStyles, tutorStyles);
  const features = {};
  if (topicFit !== null) features.topicFit = topicFit;
  if (teachingStyleFit !== null) features.teachingStyleFit = teachingStyleFit;
  if (Number.isFinite(semanticSimilarity)) features.semanticSimilarity = semanticSimilarity;
  return features;
}

function combineAvailableFeatures(features) {
  const values = [];
  if (Number.isFinite(features.topicFit)) values.push(features.topicFit);
  if (Number.isFinite(features.teachingStyleFit)) values.push(features.teachingStyleFit);
  if (Number.isFinite(features.semanticRankingScore)) values.push(features.semanticRankingScore);
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export {
  buildFeatureVector,
  buildStudentText,
  buildTutorText,
  combineAvailableFeatures,
  jaccardSimilarity,
};
