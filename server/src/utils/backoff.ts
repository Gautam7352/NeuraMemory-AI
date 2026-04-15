/**
 * Simple Exponential Backoff utility for API calls.
 */
export async function withBackoff<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelayMs?: number;
    maxDelayMs?: number;
    factor?: number;
    retryableStatuses?: number[];
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelayMs = 1000,
    maxDelayMs = 10000,
    factor = 2,
    retryableStatuses = [429, 502, 503, 504],
  } = options;

  let lastError: any;
  let delay = initialDelayMs;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      
      const status = err?.status || err?.response?.status;
      const isRetryable = !status || retryableStatuses.includes(status);

      if (attempt === maxRetries || !isRetryable) {
        throw err;
      }

      console.warn(
        `[Backoff] Attempt ${attempt + 1} failed (Status: ${status || 'Unknown'}). Retrying in ${delay}ms...`
      );
      
      await new Promise((res) => setTimeout(res, delay));
      delay = Math.min(delay * factor, maxDelayMs);
    }
  }

  throw lastError;
}
