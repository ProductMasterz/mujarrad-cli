/**
 * Custom error classes for space validation
 * Feature: 009-init-command-enhancement
 * Task: T013 - Create custom error classes
 *
 * These errors provide specific error types for space validation failures,
 * enabling proper error handling and user-friendly messages.
 */

/**
 * SpaceNotFoundError - thrown when space does not exist (404)
 * Maps to FR-003: System MUST fail with exit code 4 and clear error message
 * if space does not exist
 */
export class SpaceNotFoundError extends Error {
    public readonly code: string = 'SPACE_NOT_FOUND';
    public readonly statusCode: number = 404;

    constructor(spaceSlug: string) {
        super(`Space '${spaceSlug}' not found`);
        this.name = 'SpaceNotFoundError';

        // Maintain proper stack trace for where error was thrown (V8 only)
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, SpaceNotFoundError);
        }
    }
}

/**
 * AccessDeniedError - thrown when user lacks permissions (403)
 * Maps to FR-004: System MUST check user has upload permissions to space
 */
export class AccessDeniedError extends Error {
    public readonly code: string = 'SPACE_ACCESS_DENIED';
    public readonly statusCode: number = 403;

    constructor(spaceSlug: string, message?: string) {
        const defaultMessage = `Access denied to space '${spaceSlug}'. Contact the space owner for permissions.`;
        super(message || defaultMessage);
        this.name = 'AccessDeniedError';

        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, AccessDeniedError);
        }
    }
}

/**
 * SpaceValidationError - generic validation error
 * Used for network errors, server errors, and other validation failures
 * Maps to FR-001, FR-002
 */
export class SpaceValidationError extends Error {
    public readonly code: string;
    public readonly statusCode?: number;
    public readonly originalError?: Error;

    constructor(message: string, code: string = 'VALIDATION_FAILED', originalError?: Error) {
        super(message);
        this.name = 'SpaceValidationError';
        this.code = code;
        this.originalError = originalError;

        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, SpaceValidationError);
        }
    }
}
