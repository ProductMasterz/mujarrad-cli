import { ResponseValidator } from '../../../src/utils/ResponseValidator.js';

describe('ResponseValidator', () => {
  describe('validate', () => {
    it('should validate successful responses', () => {
      const response = {
        success: true,
        data: { id: 'uuid-123', name: 'Test' },
        timestamp: '2025-10-10T10:00:00Z'
      };

      expect(ResponseValidator.validate(response)).toBe(true);
    });

    it('should detect missing required fields in success response', () => {
      const response = { success: true }; // Missing data

      expect(() => ResponseValidator.validate(response))
        .toThrow('Missing required field: data');
    });

    it('should validate error responses', () => {
      const response = {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Resource not found',
          timestamp: '2025-10-10T10:00:00Z'
        }
      };

      expect(ResponseValidator.validate(response)).toBe(true);
    });

    it('should detect missing required fields in error response', () => {
      const response = {
        success: false,
        error: {
          code: 'ERROR_CODE'
          // Missing message
        }
      };

      expect(() => ResponseValidator.validate(response))
        .toThrow('Invalid error response format');
    });

    it('should detect malformed JSON with invalid success type', () => {
      const response = { success: 'yes' }; // Invalid type

      expect(() => ResponseValidator.validate(response))
        .toThrow('Invalid response format');
    });

    it('should detect missing success field', () => {
      const response = { data: { id: '123' } }; // Missing success

      expect(() => ResponseValidator.validate(response))
        .toThrow('Invalid response format: missing success field');
    });

    it('should validate error response without error object', () => {
      const response = {
        success: false
        // Missing error object
      };

      expect(() => ResponseValidator.validate(response))
        .toThrow('Invalid error response format');
    });

    it('should validate error response with missing error code', () => {
      const response = {
        success: false,
        error: {
          message: 'Error message'
          // Missing code
        }
      };

      expect(() => ResponseValidator.validate(response))
        .toThrow('Invalid error response format');
    });

    it('should validate success response with null data', () => {
      const response = {
        success: true,
        data: null
      };

      expect(() => ResponseValidator.validate(response))
        .toThrow('Missing required field: data');
    });

    it('should validate success response with nested data', () => {
      const response = {
        success: true,
        data: {
          user: { id: 'uuid', email: 'test@example.com' },
          workspace: { id: 'ws-uuid', name: 'My Workspace' }
        },
        timestamp: '2025-10-10T10:00:00Z'
      };

      expect(ResponseValidator.validate(response)).toBe(true);
    });

    it('should validate error response with details', () => {
      const response = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: {
            fields: ['email', 'password']
          },
          timestamp: '2025-10-10T10:00:00Z'
        }
      };

      expect(ResponseValidator.validate(response)).toBe(true);
    });
  });

  describe('isSuccessResponse', () => {
    it('should return true for success responses', () => {
      const response = {
        success: true,
        data: { id: 'uuid' },
        timestamp: '2025-10-10T10:00:00Z'
      };

      expect(ResponseValidator.isSuccessResponse(response)).toBe(true);
    });

    it('should return false for error responses', () => {
      const response = {
        success: false,
        error: {
          code: 'ERROR',
          message: 'Error occurred',
          timestamp: '2025-10-10T10:00:00Z'
        }
      };

      expect(ResponseValidator.isSuccessResponse(response)).toBe(false);
    });

    it('should return false for invalid responses', () => {
      const response = { data: 'test' };

      expect(ResponseValidator.isSuccessResponse(response)).toBe(false);
    });
  });

  describe('isErrorResponse', () => {
    it('should return true for error responses', () => {
      const response = {
        success: false,
        error: {
          code: 'ERROR',
          message: 'Error occurred',
          timestamp: '2025-10-10T10:00:00Z'
        }
      };

      expect(ResponseValidator.isErrorResponse(response)).toBe(true);
    });

    it('should return false for success responses', () => {
      const response = {
        success: true,
        data: { id: 'uuid' },
        timestamp: '2025-10-10T10:00:00Z'
      };

      expect(ResponseValidator.isErrorResponse(response)).toBe(false);
    });

    it('should return false for invalid responses', () => {
      const response = { data: 'test' };

      expect(ResponseValidator.isErrorResponse(response)).toBe(false);
    });
  });

  describe('getErrorMessage', () => {
    it('should extract error message from error response', () => {
      const response = {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Resource not found',
          timestamp: '2025-10-10T10:00:00Z'
        }
      };

      expect(ResponseValidator.getErrorMessage(response)).toBe('Resource not found');
    });

    it('should return generic message for success response', () => {
      const response = {
        success: true,
        data: { id: 'uuid' },
        timestamp: '2025-10-10T10:00:00Z'
      };

      expect(ResponseValidator.getErrorMessage(response)).toBe('No error occurred');
    });

    it('should return generic message for invalid response', () => {
      const response = { data: 'test' };

      expect(ResponseValidator.getErrorMessage(response)).toBe('Unknown error');
    });
  });

  describe('getErrorCode', () => {
    it('should extract error code from error response', () => {
      const response = {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Resource not found',
          timestamp: '2025-10-10T10:00:00Z'
        }
      };

      expect(ResponseValidator.getErrorCode(response)).toBe('NOT_FOUND');
    });

    it('should return undefined for success response', () => {
      const response = {
        success: true,
        data: { id: 'uuid' },
        timestamp: '2025-10-10T10:00:00Z'
      };

      expect(ResponseValidator.getErrorCode(response)).toBeUndefined();
    });

    it('should return undefined for invalid response', () => {
      const response = { data: 'test' };

      expect(ResponseValidator.getErrorCode(response)).toBeUndefined();
    });
  });

  describe('extractData', () => {
    it('should extract data from success response', () => {
      const response = {
        success: true,
        data: { id: 'uuid-123', name: 'Test Item' },
        timestamp: '2025-10-10T10:00:00Z'
      };

      const data = ResponseValidator.extractData(response);

      expect(data).toEqual({ id: 'uuid-123', name: 'Test Item' });
    });

    it('should throw error for error response', () => {
      const response = {
        success: false,
        error: {
          code: 'ERROR',
          message: 'Error occurred',
          timestamp: '2025-10-10T10:00:00Z'
        }
      };

      expect(() => ResponseValidator.extractData(response))
        .toThrow('Cannot extract data from error response');
    });

    it('should throw error for invalid response', () => {
      const response = { data: 'test' };

      expect(() => ResponseValidator.extractData(response))
        .toThrow('Invalid response format');
    });
  });

  describe('type guards', () => {
    it('should narrow type to SuccessResponse when isSuccessResponse returns true', () => {
      const response: any = {
        success: true,
        data: { id: 'uuid' },
        timestamp: '2025-10-10T10:00:00Z'
      };

      if (ResponseValidator.isSuccessResponse(response)) {
        // TypeScript should infer response as SuccessResponse<any>
        expect((response.data as any).id).toBe('uuid');
      }
    });

    it('should narrow type to ErrorResponse when isErrorResponse returns true', () => {
      const response: any = {
        success: false,
        error: {
          code: 'ERROR',
          message: 'Error occurred',
          timestamp: '2025-10-10T10:00:00Z'
        }
      };

      if (ResponseValidator.isErrorResponse(response)) {
        // TypeScript should infer response as ErrorResponse
        expect(response.error.code).toBe('ERROR');
      }
    });
  });
});
