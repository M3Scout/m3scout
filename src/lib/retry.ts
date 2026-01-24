export type RetryOptions = {
  /** Delays between retries (ms). Example: [300, 800, 1500] */
  backoffMs: number[];
};

function sleep(ms: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, ms));
}

/**
 * Retries `fn` (immediate first attempt) and waits `backoffMs[i]` before retry i+1.
 */
export async function retryWithBackoff<T>(
  fn: (attempt: number) => Promise<T>,
  { backoffMs }: RetryOptions
): Promise<T> {
  let lastErr: unknown;

  for (let attempt = 0; attempt < backoffMs.length + 1; attempt++) {
    try {
      return await fn(attempt);
    } catch (e) {
      lastErr = e;
      const delay = backoffMs[attempt];
      if (delay == null) break;
      await sleep(delay);
    }
  }

  throw lastErr;
}
