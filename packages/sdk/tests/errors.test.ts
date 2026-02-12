import {
  MujarradError,
  AuthenticationError,
  NotFoundError,
  ValidationError,
  RateLimitError,
  ServerError,
  NetworkError,
} from '../src/errors.js';

describe('SDK Errors', () => {
  describe('MujarradError', () => {
    it('should create base error with message', () => {
      const err = new MujarradError('test error');
      expect(err.message).toBe('test error');
      expect(err.name).toBe('MujarradError');
      expect(err.statusCode).toBeUndefined();
      expect(err.canRetry).toBe(false);
    });

    it('should accept statusCode and canRetry', () => {
      const err = new MujarradError('test', 500, true);
      expect(err.statusCode).toBe(500);
      expect(err.canRetry).toBe(true);
    });

    it('should be instanceof Error', () => {
      const err = new MujarradError('test');
      expect(err).toBeInstanceOf(Error);
    });
  });

  describe('AuthenticationError', () => {
    it('should have status 401 and not retryable', () => {
      const err = new AuthenticationError();
      expect(err.statusCode).toBe(401);
      expect(err.canRetry).toBe(false);
      expect(err.name).toBe('AuthenticationError');
    });

    it('should accept custom message', () => {
      const err = new AuthenticationError('Invalid key');
      expect(err.message).toBe('Invalid key');
    });

    it('should be instanceof MujarradError', () => {
      const err = new AuthenticationError();
      expect(err).toBeInstanceOf(MujarradError);
    });
  });

  describe('NotFoundError', () => {
    it('should have status 404 and not retryable', () => {
      const err = new NotFoundError();
      expect(err.statusCode).toBe(404);
      expect(err.canRetry).toBe(false);
      expect(err.name).toBe('NotFoundError');
    });
  });

  describe('ValidationError', () => {
    it('should have status 400 and carry validation errors', () => {
      const err = new ValidationError('Bad request', ['field1 required', 'field2 invalid']);
      expect(err.statusCode).toBe(400);
      expect(err.canRetry).toBe(false);
      expect(err.errors).toEqual(['field1 required', 'field2 invalid']);
      expect(err.name).toBe('ValidationError');
    });

    it('should default to empty errors array', () => {
      const err = new ValidationError();
      expect(err.errors).toEqual([]);
    });
  });

  describe('RateLimitError', () => {
    it('should have status 429 and be retryable', () => {
      const err = new RateLimitError();
      expect(err.statusCode).toBe(429);
      expect(err.canRetry).toBe(true);
      expect(err.name).toBe('RateLimitError');
    });

    it('should carry retryAfter value', () => {
      const err = new RateLimitError('Slow down', 30);
      expect(err.retryAfter).toBe(30);
    });
  });

  describe('ServerError', () => {
    it('should have status 500 and be retryable', () => {
      const err = new ServerError();
      expect(err.statusCode).toBe(500);
      expect(err.canRetry).toBe(true);
      expect(err.name).toBe('ServerError');
    });

    it('should accept custom status code', () => {
      const err = new ServerError('Bad gateway', 502);
      expect(err.statusCode).toBe(502);
    });
  });

  describe('NetworkError', () => {
    it('should have no status code and be retryable', () => {
      const err = new NetworkError();
      expect(err.statusCode).toBeUndefined();
      expect(err.canRetry).toBe(true);
      expect(err.name).toBe('NetworkError');
    });
  });
});
