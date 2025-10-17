import { ErrorHandler, ApiError } from '../../../src/utils/ErrorHandler.js';
import { Logger } from '../../../src/utils/Logger.js';

// Mock Logger
jest.mock('../../../src/utils/Logger.js', () => ({
  Logger: jest.fn().mockImplementation(() => ({
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn()
  }))
}));

describe('ErrorHandler', () => {
  let errorHandler: ErrorHandler;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockLogger = new Logger() as jest.Mocked<Logger>;
    errorHandler = new ErrorHandler(mockLogger);
  });

  describe('handleApiError', () => {
    it('should handle 400 Bad Request with user-friendly message', () => {
      const error = {
        response: {
          status: 400,
          data: { error: 'Invalid request body' }
        }
      };

      const result = errorHandler.handleApiError(error);

      expect(result.statusCode).toBe(400);
      expect(result.message).toBe('Invalid request: Invalid request body');
      expect(result.userMessage).toContain('request was invalid');
      expect(result.canRetry).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalled(); // 4xx errors are logged as warnings
    });

    it('should handle 401 Unauthorized with auth guidance', () => {
      const error = {
        response: {
          status: 401,
          data: { error: 'Invalid token' }
        }
      };

      const result = errorHandler.handleApiError(error);

      expect(result.statusCode).toBe(401);
      expect(result.message).toBe('Unauthorized: Invalid token');
      expect(result.userMessage).toContain('not authenticated');
      expect(result.userMessage).toContain('mujarrad auth login');
      expect(result.canRetry).toBe(false);
    });

    it('should handle 403 Forbidden with permission message', () => {
      const error = {
        response: {
          status: 403,
          data: { error: 'Insufficient permissions' }
        }
      };

      const result = errorHandler.handleApiError(error);

      expect(result.statusCode).toBe(403);
      expect(result.message).toBe('Forbidden: Insufficient permissions');
      expect(result.userMessage).toContain('permission to access');
      expect(result.canRetry).toBe(false);
    });

    it('should handle 404 Not Found', () => {
      const error = {
        response: {
          status: 404,
          data: { error: 'Space not found' }
        }
      };

      const result = errorHandler.handleApiError(error);

      expect(result.statusCode).toBe(404);
      expect(result.message).toBe('Not found: Space not found');
      expect(result.userMessage).toContain('requested resource was not found');
      expect(result.canRetry).toBe(false);
    });

    it('should handle 409 Conflict', () => {
      const error = {
        response: {
          status: 409,
          data: { error: 'Email already exists' }
        }
      };

      const result = errorHandler.handleApiError(error);

      expect(result.statusCode).toBe(409);
      expect(result.message).toBe('Conflict: Email already exists');
      expect(result.userMessage).toContain('conflict');
      expect(result.canRetry).toBe(false);
    });

    it('should handle 429 Rate Limit with retry information', () => {
      const error = {
        response: {
          status: 429,
          headers: { 'retry-after': '60' },
          data: { error: 'Too many requests' }
        }
      };

      const result = errorHandler.handleApiError(error);

      expect(result.statusCode).toBe(429);
      expect(result.message).toBe('Rate limit exceeded: Too many requests');
      expect(result.userMessage).toContain('rate limit');
      expect(result.userMessage).toContain('60 seconds');
      expect(result.canRetry).toBe(true);
      expect(result.retryAfter).toBe(60);
    });

    it('should handle 500 Internal Server Error with retry suggestion', () => {
      const error = {
        response: {
          status: 500,
          data: { error: 'Database connection failed' }
        }
      };

      const result = errorHandler.handleApiError(error);

      expect(result.statusCode).toBe(500);
      expect(result.message).toBe('Server error: Database connection failed');
      expect(result.userMessage).toContain('server encountered an error');
      expect(result.userMessage).toContain('try again');
      expect(result.canRetry).toBe(true);
    });

    it('should handle 502 Bad Gateway', () => {
      const error = {
        response: {
          status: 502,
          data: { error: 'Bad gateway' }
        }
      };

      const result = errorHandler.handleApiError(error);

      expect(result.statusCode).toBe(502);
      expect(result.message).toBe('Server error: Bad gateway');
      expect(result.userMessage).toContain('temporarily unavailable');
      expect(result.canRetry).toBe(true);
    });

    it('should handle 503 Service Unavailable', () => {
      const error = {
        response: {
          status: 503,
          data: { error: 'Service unavailable' }
        }
      };

      const result = errorHandler.handleApiError(error);

      expect(result.statusCode).toBe(503);
      expect(result.message).toBe('Server error: Service unavailable');
      expect(result.userMessage).toContain('temporarily unavailable');
      expect(result.canRetry).toBe(true);
    });

    it('should handle network errors (no response)', () => {
      const error = new Error('Network timeout');

      const result = errorHandler.handleApiError(error);

      expect(result.statusCode).toBeUndefined();
      expect(result.message).toBe('Network error: Network timeout');
      expect(result.userMessage).toContain('network error');
      expect(result.userMessage).toContain('internet connection');
      expect(result.canRetry).toBe(true);
    });

    it('should handle errors without response data', () => {
      const error = {
        response: {
          status: 500
        }
      };

      const result = errorHandler.handleApiError(error);

      expect(result.statusCode).toBe(500);
      expect(result.message).toBe('Server error: Unknown error');
      expect(result.canRetry).toBe(true);
    });

    it('should handle axios-style errors with nested response', () => {
      const error = {
        response: {
          status: 404,
          data: {
            success: false,
            error: 'Resource not found'
          }
        },
        message: 'Request failed with status code 404'
      };

      const result = errorHandler.handleApiError(error);

      expect(result.statusCode).toBe(404);
      expect(result.message).toBe('Not found: Resource not found');
    });

    it('should extract error message from various formats', () => {
      const testCases = [
        {
          error: { response: { status: 400, data: { error: 'Error msg' } } },
          expected: 'Error msg'
        },
        {
          error: { response: { status: 400, data: { message: 'Message msg' } } },
          expected: 'Message msg'
        },
        {
          error: { response: { status: 400, data: 'String error' } },
          expected: 'String error'
        }
      ];

      testCases.forEach(({ error, expected }) => {
        const result = errorHandler.handleApiError(error);
        expect(result.message).toContain(expected);
      });
    });
  });

  describe('formatErrorMessage', () => {
    it('should format error message with status code', () => {
      const apiError: ApiError = {
        statusCode: 404,
        message: 'Not found: Resource not found',
        userMessage: 'The requested resource was not found',
        canRetry: false
      };

      const formatted = errorHandler.formatErrorMessage(apiError);

      expect(formatted).toContain('Error (404)');
      expect(formatted).toContain('The requested resource was not found');
      expect(formatted).toContain('Resource not found');
    });

    it('should format error message without status code', () => {
      const apiError: ApiError = {
        message: 'Network error: Connection failed',
        userMessage: 'A network error occurred',
        canRetry: true
      };

      const formatted = errorHandler.formatErrorMessage(apiError);

      expect(formatted).toContain('Error');
      expect(formatted).not.toContain('Error (');
      expect(formatted).toContain('A network error occurred');
    });

    it('should include retry suggestion when canRetry is true', () => {
      const apiError: ApiError = {
        statusCode: 503,
        message: 'Service unavailable',
        userMessage: 'Server is temporarily unavailable',
        canRetry: true
      };

      const formatted = errorHandler.formatErrorMessage(apiError);

      expect(formatted).toContain('This operation can be retried');
    });

    it('should include retry-after time when available', () => {
      const apiError: ApiError = {
        statusCode: 429,
        message: 'Rate limit exceeded',
        userMessage: 'Too many requests',
        canRetry: true,
        retryAfter: 120
      };

      const formatted = errorHandler.formatErrorMessage(apiError);

      expect(formatted).toContain('Retry after 120 seconds');
    });
  });

  describe('isRetryable', () => {
    it('should return true for 5xx errors', () => {
      expect(errorHandler.isRetryable(500)).toBe(true);
      expect(errorHandler.isRetryable(502)).toBe(true);
      expect(errorHandler.isRetryable(503)).toBe(true);
    });

    it('should return true for 429 rate limit', () => {
      expect(errorHandler.isRetryable(429)).toBe(true);
    });

    it('should return false for 4xx client errors (except 429)', () => {
      expect(errorHandler.isRetryable(400)).toBe(false);
      expect(errorHandler.isRetryable(401)).toBe(false);
      expect(errorHandler.isRetryable(403)).toBe(false);
      expect(errorHandler.isRetryable(404)).toBe(false);
    });

    it('should return true for network errors (no status)', () => {
      expect(errorHandler.isRetryable(undefined)).toBe(true);
    });
  });

  describe('createApiError', () => {
    it('should create ApiError from Error object', () => {
      const error = new Error('Something went wrong');

      const apiError = ErrorHandler.createApiError(error);

      expect(apiError.message).toBe('Something went wrong');
      expect(apiError.userMessage).toContain('unexpected error');
      expect(apiError.canRetry).toBe(false);
    });

    it('should create ApiError with custom properties', () => {
      const apiError = ErrorHandler.createApiError(
        'Custom error',
        400,
        'User friendly message',
        false
      );

      expect(apiError.message).toBe('Custom error');
      expect(apiError.statusCode).toBe(400);
      expect(apiError.userMessage).toBe('User friendly message');
      expect(apiError.canRetry).toBe(false);
    });
  });
});
