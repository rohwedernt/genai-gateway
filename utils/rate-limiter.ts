// ============================================================================
// RATE LIMITER - Critical for not getting blocked by AI APIs
// ============================================================================

export {};

/**
 * Token Bucket Algorithm Implementation
 * 
 * How it works:
 * 1. You have a bucket that can hold a maximum number of tokens
 * 2. Tokens are added to the bucket at a constant rate (e.g., 3 per second)
 * 3. When you want to make a request, you need to take a token from the bucket
 * 4. If no tokens are available, you wait until one is added
 * 
 * This prevents burst traffic while allowing some flexibility
 */
export class RateLimiter {
  // Current number of tokens (may be fractional)
  private tokens: number;
  // High-resolution timestamp of last refill in milliseconds
  private lastRefill: number;
  // Queue of resolvers waiting for a token
  private queue: Array<{
    resolve: () => void;
    reject: (err: Error) => void;
    timer?: ReturnType<typeof setTimeout> | null;
  }> = [];
  // Single timer id used when the queue is non-empty
  private timer: ReturnType<typeof setTimeout> | null = null;

  /**
   * Create a RateLimiter (token-bucket).
   * @param tokensPerSecond rate at which tokens are added (must be > 0)
   * @param bucketSize maximum tokens the bucket can hold (must be > 0)
   * @param startFull whether to initialize the bucket full (default true)
   */
  constructor(
    private tokensPerSecond: number,
    private bucketSize: number,
    startFull = true
  ) {
    if (!(tokensPerSecond > 0)) {
      throw new Error('tokensPerSecond must be > 0');
    }
    if (!(bucketSize > 0)) {
      throw new Error('bucketSize must be > 0');
    }

    // Use performance.now() when available for better resolution
    this.lastRefill = (typeof performance !== 'undefined' && performance.now)
      ? performance.now()
      : Date.now();

    this.tokens = startFull ? bucketSize : 0;
  }

  // Refill tokens based on time elapsed. Keeps tokens fractional for accuracy.
  private refillTokens(): void {
    const now = (typeof performance !== 'undefined' && performance.now)
      ? performance.now()
      : Date.now();

    const elapsedMs = now - this.lastRefill;
    if (elapsedMs <= 0) return;

    const added = (elapsedMs / 1000) * this.tokensPerSecond;
    this.tokens = Math.min(this.bucketSize, this.tokens + added);
    this.lastRefill = now;
  }

  // Try to acquire a token synchronously. Returns true if a token was taken.
  tryAcquire(): boolean {
    this.refillTokens();
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    }
    return false;
  }

  /**
   * Acquire a token, optionally providing a timeout in milliseconds.
   * If timeoutMs is provided and no token becomes available within that time,
   * the returned promise rejects with an Error.
   */
  acquire(timeoutMs?: number): Promise<void> {
    // Fast path
    if (this.tryAcquire()) return Promise.resolve();

    return new Promise<void>((resolve, reject) => {
      let entry: { resolve: () => void; reject: (err: Error) => void; timer?: ReturnType<typeof setTimeout> | null };
      entry = {
        resolve: () => {
          // clear any per-waiter timer when resolved
          if (entry.timer) {
            clearTimeout(entry.timer);
            entry.timer = null;
          }
          resolve();
        },
        reject: (err: Error) => {
          if (entry.timer) {
            clearTimeout(entry.timer);
            entry.timer = null;
          }
          reject(err);
        },
        timer: null,
      };

      // If a timeout was requested, attach a per-waiter timer that will remove
      // this entry from the queue and reject when it fires.
      if (typeof timeoutMs === 'number' && timeoutMs > 0) {
        entry.timer = setTimeout(() => {
          // Attempt to remove this entry from the queue
          const idx = this.queue.indexOf(entry);
          if (idx !== -1) this.queue.splice(idx, 1);
          // Reject the promise
          entry.reject(new Error('RateLimiter: acquire timeout'));
        }, timeoutMs);
      }

      this.queue.push(entry);
      // If there's no timer scheduled, schedule processing when next token will be available
      if (!this.timer) this.scheduleProcess();
    });
  }

  // Schedule the queue processor for the time until the next token is available.
  private scheduleProcess(): void {
    this.refillTokens();

    // If tokens are already available, process immediately (but asynchronously)
    if (this.tokens >= 1) {
      this.timer = setTimeout(() => this.processQueue(), 0);
      return;
    }

    // Compute ms until 1 token is available
    const missing = 1 - this.tokens; // > 0
    const waitMs = Math.max(0, (missing / this.tokensPerSecond) * 1000);

    this.timer = setTimeout(() => this.processQueue(), Math.ceil(waitMs));
  }

  // Process queued acquirers while tokens are available. Schedules next run if queue still has waiters.
  private processQueue(): void {
    this.timer = null;
    this.refillTokens();

    while (this.queue.length > 0 && this.tokens >= 1) {
      const next = this.queue.shift();
      if (!next) break;
      // Consume token and resolve
      this.tokens -= 1;
      try {
        // clear per-waiter timer if present
        if (next.timer) {
          clearTimeout(next.timer);
          next.timer = null;
        }
        next.resolve();
      } catch {
        // ignore resolver errors
      }
    }

    // If there are still waiters, schedule the next process when the next token is expected
    if (this.queue.length > 0) {
      this.scheduleProcess();
    }
  }

  // Optional: cancel queued waiters and clear timers (useful for shutdown)
  shutdown(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    // Reject remaining queued waiters to surface shutdown to callers
    while (this.queue.length > 0) {
      const entry = this.queue.shift();
      if (entry) {
        if (entry.timer) {
          clearTimeout(entry.timer);
          entry.timer = null;
        }
        try {
          entry.reject(new Error('RateLimiter: shutdown'));
        } catch {
          // ignore
        }
      }
    }
  }
}
