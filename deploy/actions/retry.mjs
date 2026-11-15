const defaultWait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

export async function retry(operation, {
  attempts = 3,
  initialDelayMs = 1_000,
  maxDelayMs = 8_000,
  wait = defaultWait,
  onRetry = () => {},
  shouldRetry = () => true,
} = {}) {
  if (typeof operation !== 'function') throw new TypeError('operation must be a function.');
  if (!Number.isInteger(attempts) || attempts < 1) throw new RangeError('attempts must be a positive integer.');
  if (!Number.isFinite(initialDelayMs) || initialDelayMs < 0) throw new RangeError('initialDelayMs must be non-negative.');
  if (!Number.isFinite(maxDelayMs) || maxDelayMs < 0) throw new RangeError('maxDelayMs must be non-negative.');
  if (typeof wait !== 'function') throw new TypeError('wait must be a function.');
  if (typeof onRetry !== 'function') throw new TypeError('onRetry must be a function.');
  if (typeof shouldRetry !== 'function') throw new TypeError('shouldRetry must be a function.');

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation(attempt);
    } catch (error) {
      if (attempt === attempts || !(await shouldRetry(error, attempt))) throw error;
      const delayMs = Math.min(initialDelayMs * 2 ** (attempt - 1), maxDelayMs);
      await onRetry(error, attempt, delayMs);
      await wait(delayMs);
    }
  }

  throw new Error('Retry loop exited unexpectedly.');
}
