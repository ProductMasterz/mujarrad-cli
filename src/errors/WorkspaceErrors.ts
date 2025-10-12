/**
 * Custom error classes for workspace validation
 * Feature: 009-init-command-enhancement
 * Task: T013 - Create custom error classes
 *
 * These errors provide specific error types for workspace validation failures,
 * enabling proper error handling and user-friendly messages.
 */

/**
 * WorkspaceNotFoundError - thrown when workspace does not exist (404)
 * Maps to FR-003: System MUST fail with exit code 4 and clear error message
 * if workspace does not exist
 */
export class WorkspaceNotFoundError extends Error {
    public readonly code: string = 'WORKSPACE_NOT_FOUND';
    public readonly statusCode: number = 404;

    constructor(workspaceSlug: string) {
        super(`Workspace '${workspaceSlug}' not found`);
        this.name = 'WorkspaceNotFoundError';

        // Maintain proper stack trace for where error was thrown (V8 only)
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, WorkspaceNotFoundError);
        }
    }
}

/**
 * AccessDeniedError - thrown when user lacks permissions (403)
 * Maps to FR-004: System MUST check user has upload permissions to workspace
 */
export class AccessDeniedError extends Error {
    public readonly code: string = 'WORKSPACE_ACCESS_DENIED';
    public readonly statusCode: number = 403;

    constructor(workspaceSlug: string, message?: string) {
        const defaultMessage = `Access denied to workspace '${workspaceSlug}'. Contact the workspace owner for permissions.`;
        super(message || defaultMessage);
        this.name = 'AccessDeniedError';

        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, AccessDeniedError);
        }
    }
}

/**
 * WorkspaceValidationError - generic validation error
 * Used for network errors, server errors, and other validation failures
 * Maps to FR-001, FR-002
 */
export class WorkspaceValidationError extends Error {
    public readonly code: string;
    public readonly statusCode?: number;
    public readonly originalError?: Error;

    constructor(message: string, code: string = 'VALIDATION_FAILED', originalError?: Error) {
        super(message);
        this.name = 'WorkspaceValidationError';
        this.code = code;
        this.originalError = originalError;

        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, WorkspaceValidationError);
        }
    }
}
