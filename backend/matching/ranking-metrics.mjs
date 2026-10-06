function calculateRankingMetrics(rankedIds, judgments, { k = 5, relevantThreshold = 2 } = {}) {
  const limit = Math.max(1, Math.floor(Number(k) || 5));
  const relevance = rankedIds.map((id) => Number(judgments[id] ?? 0));
  const relevantTotal = Object.values(judgments).filter((grade) => Number(grade) >= relevantThreshold).length;
  const top = relevance.slice(0, limit);
  const relevantRanks = top.flatMap((grade, index) => (grade >= relevantThreshold ? [index + 1] : []));
  const precisionAtK = relevantRanks.length / limit;
  const recallAtK = relevantTotal === 0 ? null : relevantRanks.length / relevantTotal;
  const reciprocalRankAtK = relevantRanks.length ? 1 / relevantRanks[0] : 0;
  const averagePrecisionAtK = relevantTotal === 0
    ? null
    : relevantRanks.reduce((sum, rank, index) => sum + ((index + 1) / rank), 0) / Math.min(relevantTotal, limit);
  const dcg = top.reduce((sum, grade, index) => sum + ((2 ** grade - 1) / Math.log2(index + 2)), 0);
  const idealGrades = Object.values(judgments).map(Number).sort((left, right) => right - left).slice(0, limit);
  const idealDcg = idealGrades.reduce((sum, grade, index) => sum + ((2 ** grade - 1) / Math.log2(index + 2)), 0);

  return {
    precisionAtK,
    recallAtK,
    reciprocalRankAtK,
    averagePrecisionAtK,
    hitRateAtK: Number(relevantRanks.length > 0),
    ndcgAtK: idealDcg > 0 ? dcg / idealDcg : null,
    relevantTotal,
  };
}

function mean(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function summarizeRankingMetrics(perQuery, k) {
  const judged = perQuery.filter((metrics) => metrics.relevantTotal > 0);
  const fields = ['precisionAtK', 'recallAtK', 'reciprocalRankAtK', 'averagePrecisionAtK', 'hitRateAtK', 'ndcgAtK'];
  return {
    k,
    metricQueryCount: judged.length,
    metrics: Object.fromEntries(fields.map((field) => [field, mean(judged.map((metrics) => metrics[field]).filter(Number.isFinite))])),
  };
}

export { calculateRankingMetrics, summarizeRankingMetrics };
