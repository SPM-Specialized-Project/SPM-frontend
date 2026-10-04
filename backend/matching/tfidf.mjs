import { normalizeText } from './contracts.mjs';

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'can', 'for', 'from', 'help', 'i', 'in', 'is', 'it',
  'me', 'my', 'of', 'on', 'or', 'the', 'to', 'want', 'with', 'you', 'em', 'muon', 'can', 'hoc',
  'minh', 'toi', 'va', 've', 'cho', 'mot', 'cac', 'co', 'duoc', 'giup', 'phan', 'mon', 'hoc',
]);

function tokenize(text) {
  const words = normalizeText(text).match(/[\p{L}\p{N}]+/gu) ?? [];
  const filtered = words.filter((word) => !STOP_WORDS.has(word));
  const tokens = [...filtered];
  for (let index = 0; index + 1 < filtered.length; index += 1) {
    tokens.push(`${filtered[index]}_${filtered[index + 1]}`);
  }
  return tokens;
}

function vectorize(documents) {
  const tokenLists = documents.map(tokenize);
  const documentFrequency = new Map();
  for (const tokens of tokenLists) {
    for (const token of new Set(tokens)) documentFrequency.set(token, (documentFrequency.get(token) ?? 0) + 1);
  }
  const documentCount = Math.max(1, documents.length);
  return tokenLists.map((tokens) => {
    const termFrequency = new Map();
    for (const token of tokens) termFrequency.set(token, (termFrequency.get(token) ?? 0) + 1);
    const vector = new Map();
    for (const [token, count] of termFrequency) {
      const tf = 1 + Math.log(count);
      const df = documentFrequency.get(token) ?? 0;
      const idf = Math.log(1 + (documentCount + 1) / (df + 1)) + 1;
      vector.set(token, tf * idf);
    }
    return vector;
  });
}

function cosineSimilarity(left, right) {
  if (left.size === 0 || right.size === 0) return 0;
  let dot = 0;
  let leftNormSquared = 0;
  let rightNormSquared = 0;
  for (const value of left.values()) leftNormSquared += value * value;
  for (const value of right.values()) rightNormSquared += value * value;
  for (const [token, value] of left) dot += value * (right.get(token) ?? 0);
  const denominator = Math.sqrt(leftNormSquared * rightNormSquared);
  return denominator === 0 ? 0 : dot / denominator;
}

function scoreTfidf(query, documents) {
  const vectors = vectorize([query, ...documents]);
  return documents.map((_, index) => cosineSimilarity(vectors[0], vectors[index + 1]));
}

export { cosineSimilarity, scoreTfidf, tokenize };
