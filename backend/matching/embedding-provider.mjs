const DEFAULT_TIMEOUT_MS = 15000;
const DEFAULT_BGE_M3_REVISION = '5617a9f61b028005a4858fdac845db406aefb181';

function createEmbeddingProvider({
  baseUrl = process.env.MATCHING_EMBEDDING_URL,
  expectedRevision = process.env.MATCHING_BGE_M3_REVISION?.trim() || DEFAULT_BGE_M3_REVISION,
  timeoutMs = DEFAULT_TIMEOUT_MS,
} = {}) {
  return {
    configured: Boolean(baseUrl),
    modelVersion: `BAAI/bge-m3@${expectedRevision}`,
    async embed(texts) {
      if (!baseUrl) {
        const error = new Error('BGE-M3 embedding service is not configured.');
        error.code = 'EMBEDDING_SERVICE_NOT_CONFIGURED';
        error.status = 503;
        throw error;
      }
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetch(`${baseUrl.replace(/\/$/u, '')}/v1/embeddings`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ texts }),
          signal: controller.signal,
        });
        if (!response.ok) {
          const error = new Error(`Embedding service returned HTTP ${response.status}.`);
          error.code = 'EMBEDDING_SERVICE_ERROR';
          error.status = response.status === 503 ? 503 : 502;
          throw error;
        }
        const payload = await response.json();
        if (payload.model !== 'BAAI/bge-m3' || payload.revision !== expectedRevision) {
          const error = new Error('Embedding service model or revision does not match the Node backend configuration.');
          error.code = 'EMBEDDING_MODEL_REVISION_MISMATCH';
          error.status = 503;
          throw error;
        }
        if (!Array.isArray(payload.embeddings)
          || payload.embeddings.length !== texts.length
          || payload.embeddings.some((vector) => !Array.isArray(vector) || vector.some((value) => !Number.isFinite(value)))) {
          const error = new Error('Embedding service returned an invalid vector payload.');
          error.code = 'EMBEDDING_RESPONSE_INVALID';
          error.status = 502;
          throw error;
        }
        return payload.embeddings;
      } catch (cause) {
        if (['EMBEDDING_SERVICE_ERROR', 'EMBEDDING_MODEL_REVISION_MISMATCH', 'EMBEDDING_RESPONSE_INVALID'].includes(cause?.code)) {
          throw cause;
        }
        const error = new Error(cause?.name === 'AbortError'
          ? 'Embedding service request timed out.'
          : 'Embedding service is unavailable.');
        error.code = 'EMBEDDING_SERVICE_UNAVAILABLE';
        error.status = 503;
        throw error;
      } finally {
        clearTimeout(timeout);
      }
    },
  };
}

function cosineSimilarity(left, right) {
  if (!Array.isArray(left) || !Array.isArray(right) || left.length === 0 || left.length !== right.length) return null;
  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;
  for (let index = 0; index < left.length; index += 1) {
    dot += left[index] * right[index];
    leftNorm += left[index] ** 2;
    rightNorm += right[index] ** 2;
  }
  const denominator = Math.sqrt(leftNorm * rightNorm);
  return denominator === 0 ? null : dot / denominator;
}

export { cosineSimilarity, createEmbeddingProvider, DEFAULT_BGE_M3_REVISION };
