/**
 * Retry utility with exponential backoff
 */

export interface RetryOptions {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
  retryCondition?: (error: any) => boolean;
}

export const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  backoffFactor: 2,
  retryCondition: (error) => {
    // Retry on network errors, rate limits, and server errors
    if (error?.code === "NETWORK_ERROR") return true;
    if (error?.status >= 500) return true;
    if (error?.status === 429) return true; // Rate limited
    return false;
  },
};

export async function withRetry<T>(
  operation: () => Promise<T>,
  options: Partial<RetryOptions> = {},
): Promise<T> {
  const config = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: any;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      // Don't retry on the last attempt
      if (attempt === config.maxRetries) {
        break;
      }

      // Check if we should retry this error
      if (config.retryCondition && !config.retryCondition(error)) {
        break;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        config.baseDelay * Math.pow(config.backoffFactor, attempt),
        config.maxDelay,
      );

      console.warn(
        `Operation failed (attempt ${attempt + 1}/${config.maxRetries + 1}), retrying in ${delay}ms:`,
        error,
      );

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

export class RateLimiter {
  private requests: number[] = [];
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(maxRequests: number, windowMs: number) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  async acquire(): Promise<void> {
    const now = Date.now();

    // Remove old requests outside the window
    this.requests = this.requests.filter((time) => now - time < this.windowMs);

    // If we're at the limit, wait
    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = this.requests[0];
      const waitTime = this.windowMs - (now - oldestRequest);

      if (waitTime > 0) {
        await new Promise((resolve) => setTimeout(resolve, waitTime));
        return this.acquire(); // Try again after waiting
      }
    }

    // Record this request
    this.requests.push(now);
  }
}

export function createPlatformRateLimiter(platform: string): RateLimiter {
  // Platform-specific rate limits
  switch (platform) {
    case "twitter":
      return new RateLimiter(300, 15 * 60 * 1000); // 300 requests per 15 minutes
    case "linkedin":
      return new RateLimiter(100, 24 * 60 * 60 * 1000); // 100 requests per day
    case "facebook":
      return new RateLimiter(200, 60 * 60 * 1000); // 200 requests per hour
    case "instagram":
      return new RateLimiter(200, 60 * 60 * 1000); // 200 requests per hour
    case "mastodon":
      return new RateLimiter(300, 5 * 60 * 1000); // 300 requests per 5 minutes
    case "bluesky":
      return new RateLimiter(3000, 5 * 60 * 1000); // 3000 requests per 5 minutes
    default:
      return new RateLimiter(60, 60 * 1000); // Default: 60 requests per minute
  }
}


