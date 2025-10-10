/**
 * Retry options configuration
 */
export interface RetryOptions {
  maxAttempts?: number;
  baseDelay?: number;
}

/**
 * RetryHandler provides automatic retry logic with exponential backoff for failed requests
 *
 * Features:
 * - Exponential backoff strategy (1s, 2s, 4s, etc.)
 * - Smart retry decision based on error type
 * - Respects HTTP 429 Retry-After headers
 * - Does not retry on client errors (4xx except 429)
 * - Retries on server errors (5xx) and network failures
 *
 * Usage:
 * ```typescript
 * const result = await RetryHandler.withRetry(
 *   () => apiClient.fetchData(),
 *   { maxAttempts: 3, baseDelay: 1000 }
 * );
 * ```
 *
 * Follows Constitution Principle III: TDD approach with comprehensive tests
 * Implements FR-CLI-017: Retry logic with exponential backoff
 */
export class RetryHandler {
  /**
   * Execute a function with retry logic and exponential backoff
   *
   * @param fn - Async function to execute with retry
   * @param options - Retry configuration options
   * @returns Result from successful function execution
   * @throws Last error if all retry attempts fail
   */
  static async withRetry<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {}
  ): Promise<T> {
    const { maxAttempts = 3, baseDelay = 1000 } = options;
    let lastError: any;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;

        // Check if we should not retry this error
        if (this.shouldNotRetry(error)) {
          throw error;
        }

        // If this was the last attempt, throw the error
        if (attempt === maxAttempts - 1) {
          throw error;
        }

        // Calculate delay for next attempt
        const delay = this.calculateDelay(error, attempt, baseDelay);

        // Wait before retrying
        await this.sleep(delay);
      }
    }

    throw lastError;
  }

  /**
   * Determine if an error should not be retried
   *
   * @param error - Error object to check
   * @returns true if error should not be retried
   */
  private static shouldNotRetry(error: any): boolean {
    // Extract status from error (supports both direct status and axios-style response.status)
    const status = error?.status || error?.response?.status;

    // Don't retry if no status (will retry network errors)
    if (!status) {
      return false;
    }

    // Don't retry on client errors (4xx) except 429 (rate limit)
    if (status >= 400 && status < 500) {
      return status !== 429;
    }

    // Retry on all other errors (5xx, network errors)
    return false;
  }

  /**
   * Calculate delay before next retry attempt
   *
   * @param error - Error object that may contain Retry-After header
   * @param attempt - Current attempt number (0-indexed)
   * @param baseDelay - Base delay in milliseconds
   * @returns Delay in milliseconds
   */
  private static calculateDelay(error: any, attempt: number, baseDelay: number): number {
    // Check for Retry-After header (HTTP 429 rate limiting)
    const retryAfter = error?.headers?.['retry-after'] || error?.response?.headers?.['retry-after'];

    if (retryAfter) {
      // Retry-After can be in seconds or a date string
      // For simplicity, assume it's in seconds
      const seconds = parseInt(retryAfter, 10);
      if (!isNaN(seconds)) {
        return seconds * 1000; // Convert to milliseconds
      }
    }

    // Use exponential backoff: baseDelay * 2^attempt
    // attempt 0: 1s, attempt 1: 2s, attempt 2: 4s
    return baseDelay * Math.pow(2, attempt);
  }

  /**
   * Sleep for specified duration
   *
   * @param ms - Milliseconds to sleep
   * @returns Promise that resolves after delay
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
