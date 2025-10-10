/**
 * Standard success response format from API
 */
export interface SuccessResponse<T> {
  success: true;
  data: T;
  timestamp?: string;
}

/**
 * Standard error response format from API
 */
export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
    timestamp?: string;
  };
}

/**
 * Union type for all API responses
 */
export type ApiResponse<T> = SuccessResponse<T> | ErrorResponse;

/**
 * ResponseValidator provides validation and type guards for API responses
 *
 * Features:
 * - Validates success and error response structures
 * - Type guards for narrowing response types
 * - Extraction utilities for data and error information
 * - Clear validation error messages
 *
 * Usage:
 * ```typescript
 * const response = await api.getUser();
 *
 * if (ResponseValidator.isSuccessResponse(response)) {
 *   // TypeScript knows response.data is available
 *   console.log(response.data);
 * } else if (ResponseValidator.isErrorResponse(response)) {
 *   // TypeScript knows response.error is available
 *   console.error(response.error.message);
 * }
 * ```
 *
 * Follows Constitution Principle III: TDD approach with comprehensive tests
 * Implements FR-CLI-020: Response validation with clear error messages
 */
export class ResponseValidator {
  /**
   * Validate API response structure
   *
   * @param response - Response object to validate
   * @returns True if response is valid (either success or error format)
   * @throws Error if response format is invalid
   */
  static validate(response: any): boolean {
    // Check for success field
    if (typeof response.success !== 'boolean') {
      throw new Error('Invalid response format: missing success field');
    }

    // Validate success response structure
    if (response.success === true) {
      if (response.data === undefined || response.data === null) {
        throw new Error('Missing required field: data');
      }
      return true;
    }

    // Validate error response structure
    if (response.success === false) {
      if (!response.error || typeof response.error !== 'object') {
        throw new Error('Invalid error response format');
      }

      if (!response.error.code || typeof response.error.code !== 'string') {
        throw new Error('Invalid error response format');
      }

      if (!response.error.message || typeof response.error.message !== 'string') {
        throw new Error('Invalid error response format');
      }

      return true;
    }

    throw new Error('Invalid response format');
  }

  /**
   * Type guard to check if response is a success response
   *
   * @param response - Response object to check
   * @returns True if response is a success response
   */
  static isSuccessResponse<T>(response: any): response is SuccessResponse<T> {
    try {
      return response && typeof response.success === 'boolean' && response.success === true;
    } catch {
      return false;
    }
  }

  /**
   * Type guard to check if response is an error response
   *
   * @param response - Response object to check
   * @returns True if response is an error response
   */
  static isErrorResponse(response: any): response is ErrorResponse {
    try {
      return response &&
             typeof response.success === 'boolean' &&
             response.success === false &&
             response.error &&
             typeof response.error === 'object';
    } catch {
      return false;
    }
  }

  /**
   * Extract error message from response
   *
   * @param response - Response object
   * @returns Error message string
   */
  static getErrorMessage(response: any): string {
    if (this.isErrorResponse(response)) {
      return response.error.message;
    }

    if (this.isSuccessResponse(response)) {
      return 'No error occurred';
    }

    return 'Unknown error';
  }

  /**
   * Extract error code from response
   *
   * @param response - Response object
   * @returns Error code string or undefined
   */
  static getErrorCode(response: any): string | undefined {
    if (this.isErrorResponse(response)) {
      return response.error.code;
    }

    return undefined;
  }

  /**
   * Extract data from success response
   *
   * @param response - Response object
   * @returns Data from success response
   * @throws Error if response is not a success response
   */
  static extractData<T>(response: any): T {
    // Validate response format first
    try {
      this.validate(response);
    } catch (error) {
      throw new Error('Invalid response format');
    }

    if (!this.isSuccessResponse<T>(response)) {
      throw new Error('Cannot extract data from error response');
    }

    return response.data;
  }

  /**
   * Extract error details from error response
   *
   * @param response - Response object
   * @returns Error details or undefined
   */
  static getErrorDetails(response: any): any | undefined {
    if (this.isErrorResponse(response)) {
      return response.error.details;
    }

    return undefined;
  }

  /**
   * Get timestamp from response
   *
   * @param response - Response object
   * @returns Timestamp string or undefined
   */
  static getTimestamp(response: any): string | undefined {
    if (this.isSuccessResponse(response)) {
      return response.timestamp;
    }

    if (this.isErrorResponse(response)) {
      return response.error.timestamp;
    }

    return undefined;
  }
}
