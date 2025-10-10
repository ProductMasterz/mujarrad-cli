import { Logger } from './Logger.js';

/**
 * Structured API error with user-friendly messaging
 */
export interface ApiError {
  statusCode?: number;
  message: string;
  userMessage: string;
  canRetry: boolean;
  retryAfter?: number;
}

/**
 * ErrorHandler provides centralized error handling for API requests
 *
 * Features:
 * - User-friendly error messages for all HTTP status codes
 * - Automatic retry detection based on error type
 * - Extraction of retry-after headers for rate limiting
 * - Structured error logging
 * - Support for multiple error response formats
 *
 * Usage:
 * ```typescript
 * try {
 *   await apiCall();
 * } catch (error) {
 *   const apiError = errorHandler.handleApiError(error);
 *   console.error(errorHandler.formatErrorMessage(apiError));
 *   if (apiError.canRetry) {
 *     // Retry logic
 *   }
 * }
 * ```
 *
 * Follows Constitution Principle III: TDD approach with comprehensive tests
 * Implements FR-CLI-018: User-friendly error messages for all API failures
 */
export class ErrorHandler {
  private logger: Logger;

  constructor(logger?: Logger) {
    this.logger = logger || new Logger({ logLevel: 'info' });
  }

  /**
   * Handle API error and convert to structured ApiError
   *
   * @param error - Error object from API call (supports axios-style and generic errors)
   * @returns Structured ApiError with user-friendly messaging
   */
  handleApiError(error: any): ApiError {
    // Extract status code (supports both direct response and axios-style)
    const statusCode = error?.response?.status || error?.status;

    // Extract error message from various formats
    const rawMessage = this.extractErrorMessage(error);

    // Extract retry-after header for rate limiting
    const retryAfter = this.extractRetryAfter(error);

    // Determine if error is retryable
    const canRetry = this.isRetryable(statusCode);

    // Create structured error based on status code
    const apiError = this.createStructuredError(statusCode, rawMessage, canRetry, retryAfter);

    // Log the error
    this.logError(apiError, error);

    return apiError;
  }

  /**
   * Format ApiError into user-friendly display message
   *
   * @param apiError - Structured API error
   * @returns Formatted error message for display
   */
  formatErrorMessage(apiError: ApiError): string {
    const parts: string[] = [];

    // Add error header with status code
    if (apiError.statusCode) {
      parts.push(`Error (${apiError.statusCode}): ${apiError.userMessage}`);
    } else {
      parts.push(`Error: ${apiError.userMessage}`);
    }

    // Add technical details
    parts.push(`\nDetails: ${apiError.message}`);

    // Add retry information
    if (apiError.canRetry) {
      if (apiError.retryAfter) {
        parts.push(`\nRetry after ${apiError.retryAfter} seconds`);
      } else {
        parts.push(`\nThis operation can be retried`);
      }
    }

    return parts.join('');
  }

  /**
   * Check if HTTP status code indicates retryable error
   *
   * @param statusCode - HTTP status code
   * @returns True if error can be retried
   */
  isRetryable(statusCode?: number): boolean {
    // No status code = network error (retryable)
    if (!statusCode) {
      return true;
    }

    // 429 rate limit (retryable)
    if (statusCode === 429) {
      return true;
    }

    // 5xx server errors (retryable)
    if (statusCode >= 500 && statusCode < 600) {
      return true;
    }

    // 4xx client errors (not retryable)
    return false;
  }

  /**
   * Create ApiError from Error object or custom parameters
   *
   * @param error - Error message or Error object
   * @param statusCode - Optional HTTP status code
   * @param userMessage - Optional user-friendly message
   * @param canRetry - Optional retry flag
   * @returns Structured ApiError
   */
  static createApiError(
    error: string | Error,
    statusCode?: number,
    userMessage?: string,
    canRetry = false
  ): ApiError {
    const message = typeof error === 'string' ? error : error.message;

    return {
      statusCode,
      message,
      userMessage: userMessage || 'An unexpected error occurred',
      canRetry
    };
  }

  /**
   * Extract error message from various error formats
   *
   * @param error - Error object
   * @returns Error message string
   */
  private extractErrorMessage(error: any): string {
    // Check response.data.error
    if (error?.response?.data?.error) {
      return error.response.data.error;
    }

    // Check response.data.message
    if (error?.response?.data?.message) {
      return error.response.data.message;
    }

    // Check response.data as string
    if (typeof error?.response?.data === 'string') {
      return error.response.data;
    }

    // Check error.message
    if (error?.message) {
      return error.message;
    }

    // Fallback
    return 'Unknown error';
  }

  /**
   * Extract Retry-After header value from error
   *
   * @param error - Error object
   * @returns Retry-after value in seconds, or undefined
   */
  private extractRetryAfter(error: any): number | undefined {
    const retryAfter = error?.response?.headers?.['retry-after'] ||
                      error?.headers?.['retry-after'];

    if (retryAfter) {
      const seconds = parseInt(retryAfter, 10);
      if (!isNaN(seconds)) {
        return seconds;
      }
    }

    return undefined;
  }

  /**
   * Create structured error based on status code
   *
   * @param statusCode - HTTP status code
   * @param rawMessage - Raw error message
   * @param _canRetry - Whether error is retryable (unused - determined by status code)
   * @param retryAfter - Retry-after value in seconds
   * @returns Structured ApiError
   */
  private createStructuredError(
    statusCode: number | undefined,
    rawMessage: string,
    _canRetry: boolean,
    retryAfter?: number
  ): ApiError {
    // Network error (no status code)
    if (!statusCode) {
      return {
        message: `Network error: ${rawMessage}`,
        userMessage: 'A network error occurred. Please check your internet connection and try again.',
        canRetry: true
      };
    }

    // 400 Bad Request
    if (statusCode === 400) {
      return {
        statusCode,
        message: `Invalid request: ${rawMessage}`,
        userMessage: `Your request was invalid. ${rawMessage}`,
        canRetry: false
      };
    }

    // 401 Unauthorized
    if (statusCode === 401) {
      return {
        statusCode,
        message: `Unauthorized: ${rawMessage}`,
        userMessage: 'You are not authenticated. Please login with: mujarrad auth login',
        canRetry: false
      };
    }

    // 403 Forbidden
    if (statusCode === 403) {
      return {
        statusCode,
        message: `Forbidden: ${rawMessage}`,
        userMessage: `You do not have permission to access this resource. ${rawMessage}`,
        canRetry: false
      };
    }

    // 404 Not Found
    if (statusCode === 404) {
      return {
        statusCode,
        message: `Not found: ${rawMessage}`,
        userMessage: `The requested resource was not found. ${rawMessage}`,
        canRetry: false
      };
    }

    // 409 Conflict
    if (statusCode === 409) {
      return {
        statusCode,
        message: `Conflict: ${rawMessage}`,
        userMessage: `A conflict occurred. ${rawMessage}`,
        canRetry: false
      };
    }

    // 429 Rate Limit
    if (statusCode === 429) {
      const retryMessage = retryAfter
        ? `Please wait ${retryAfter} seconds before retrying.`
        : 'Please wait before retrying.';

      return {
        statusCode,
        message: `Rate limit exceeded: ${rawMessage}`,
        userMessage: `You have exceeded the rate limit. ${retryMessage}`,
        canRetry: true,
        retryAfter
      };
    }

    // 5xx Server Errors
    if (statusCode >= 500 && statusCode < 600) {
      const specificMessage = this.getServerErrorMessage(statusCode);

      return {
        statusCode,
        message: `Server error: ${rawMessage || 'Unknown server error'}`,
        userMessage: `${specificMessage} Please try again later.`,
        canRetry: true
      };
    }

    // Unknown status code
    return {
      statusCode,
      message: `HTTP ${statusCode}: ${rawMessage}`,
      userMessage: `An error occurred (${statusCode}). ${rawMessage}`,
      canRetry: false
    };
  }

  /**
   * Get user-friendly message for server errors
   *
   * @param statusCode - HTTP status code (5xx)
   * @returns User-friendly error message
   */
  private getServerErrorMessage(statusCode: number): string {
    switch (statusCode) {
      case 500:
        return 'The server encountered an error.';
      case 502:
        return 'The server is temporarily unavailable (bad gateway).';
      case 503:
        return 'The service is temporarily unavailable.';
      case 504:
        return 'The server timed out.';
      default:
        return 'A server error occurred.';
    }
  }

  /**
   * Log error with appropriate level
   *
   * @param apiError - Structured API error
   * @param _originalError - Original error object (unused but kept for potential debugging)
   */
  private logError(apiError: ApiError, _originalError: any): void {
    const logContext = {
      statusCode: apiError.statusCode,
      message: apiError.message,
      canRetry: apiError.canRetry,
      retryAfter: apiError.retryAfter
    };

    // Log client errors (4xx) as warnings
    if (apiError.statusCode && apiError.statusCode >= 400 && apiError.statusCode < 500) {
      this.logger.warn('Client error occurred', logContext);
    }
    // Log server errors (5xx) and network errors as errors
    else {
      this.logger.error('API error occurred', logContext);
    }
  }
}
