/**
 * Mujarrad SDK Errors
 *
 * Typed error classes mapped from HTTP status codes.
 * Pattern inspired by mujarrad-cli/src/utils/ErrorHandler.ts.
 */

export class MujarradError extends Error {
  public readonly statusCode?: number;
  public readonly canRetry: boolean;

  constructor(message: string, statusCode?: number, canRetry = false) {
    super(message);
    this.name = 'MujarradError';
    this.statusCode = statusCode;
    this.canRetry = canRetry;
  }
}

export class AuthenticationError extends MujarradError {
  constructor(message = 'Authentication failed. Check your API key and secret.') {
    super(message, 401, false);
    this.name = 'AuthenticationError';
  }
}

export class NotFoundError extends MujarradError {
  constructor(message = 'The requested resource was not found.') {
    super(message, 404, false);
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends MujarradError {
  public readonly errors: string[];

  constructor(message = 'Validation failed.', errors: string[] = []) {
    super(message, 400, false);
    this.name = 'ValidationError';
    this.errors = errors;
  }
}

export class RateLimitError extends MujarradError {
  public readonly retryAfter?: number;

  constructor(message = 'Rate limit exceeded.', retryAfter?: number) {
    super(message, 429, true);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

export class ServerError extends MujarradError {
  constructor(message = 'An internal server error occurred.', statusCode = 500) {
    super(message, statusCode, true);
    this.name = 'ServerError';
  }
}

export class NetworkError extends MujarradError {
  constructor(message = 'A network error occurred. Check your connection.') {
    super(message, undefined, true);
    this.name = 'NetworkError';
  }
}
