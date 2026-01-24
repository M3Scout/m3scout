export type RetryOptions = {
  /** Delays between retries (ms). Example: [300, 800, 1500] */
  backoffMs: number[];
  /** HTTP status codes that should NOT trigger retry (e.g. 401, 403, 400) */
  nonRetryableStatuses?: number[];
};

function sleep(ms: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, ms));
}

/**
 * Retries `fn` (immediate first attempt) and waits `backoffMs[i]` before retry i+1.
 * Does NOT retry for non-retryable statuses (401/403/400 by default).
 */
export async function retryWithBackoff<T>(
  fn: (attempt: number) => Promise<T>,
  { backoffMs, nonRetryableStatuses = [401, 403, 400] }: RetryOptions
): Promise<T> {
  let lastErr: unknown;

  for (let attempt = 0; attempt < backoffMs.length + 1; attempt++) {
    try {
      return await fn(attempt);
    } catch (e) {
      lastErr = e;
      
      // Check for non-retryable status codes
      const errObj = e as any;
      const status = errObj?.status ?? errObj?.statusCode ?? errObj?.code;
      if (typeof status === "number" && nonRetryableStatuses.includes(status)) {
        // Don't retry, throw immediately
        throw e;
      }
      
      const delay = backoffMs[attempt];
      if (delay == null) break;
      await sleep(delay);
    }
  }

  throw lastErr;
}
