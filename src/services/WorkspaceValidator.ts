/**
 * WorkspaceValidator service
 * Feature: 009-init-command-enhancement
 * Task: T014 - Implement WorkspaceValidator service
 *
 * Validates workspace existence and user permissions before vault upload.
 * Implements pre-flight validation (FR-001, FR-002, FR-003, FR-004, FR-005)
 */

import { SyncWorkspacesApi, type WorkspaceMetadata } from '../api/generated/index.js';
import { WorkspaceNotFoundError, AccessDeniedError, WorkspaceValidationError } from '../errors/WorkspaceErrors.js';
import { Logger } from '../utils/Logger.js';

/**
 * WorkspaceValidator validates workspace before vault upload
 * @class WorkspaceValidator
 */
export class WorkspaceValidator {
    private readonly workspaceApi: SyncWorkspacesApi;
    private readonly logger: Logger;
    private readonly maxRetries: number = 3;
    private readonly retryableErrorCodes: string[] = ['ETIMEDOUT', 'ECONNRESET', 'ENOTFOUND', 'ECONNREFUSED'];

    constructor(workspaceApi: SyncWorkspacesApi, logger: Logger) {
        this.workspaceApi = workspaceApi;
        this.logger = logger;
    }

    /**
     * Validate workspace exists and user has write permissions
     * Implements FR-001, FR-002, FR-003, FR-004
     *
     * @param slug - Workspace slug (URL-safe identifier)
     * @returns Promise<WorkspaceMetadata> - Workspace metadata if validation succeeds
     * @throws WorkspaceNotFoundError - If workspace doesn't exist (404)
     * @throws AccessDeniedError - If user lacks write permissions (403)
     * @throws WorkspaceValidationError - For other validation failures
     */
    async validateWorkspace(slug: string): Promise<WorkspaceMetadata> {
        // Validate slug format first (client-side validation)
        this.validateSlugFormat(slug);

        // Log validation start (FR-005)
        this.logger.logWorkspaceValidationStart(slug);

        let lastError: any;
        let attempt = 0;

        // Retry loop for network errors (FR-002 - handle timeouts)
        while (attempt < this.maxRetries) {
            try {
                // Call workspace metadata API
                const response = await this.workspaceApi.getWorkspaceMetadata(slug);
                const workspace = response.data;

                // Verify user has write permissions (FR-004)
                if (!workspace.userPermissions.canWrite) {
                    const error = new AccessDeniedError(
                        slug,
                        `You do not have write access to this workspace. Current permissions: ${JSON.stringify(workspace.userPermissions)}`
                    );
                    this.logger.logWorkspaceValidationFailure(slug, error.message);
                    throw error;
                }

                // Log successful validation (FR-005)
                this.logger.logWorkspaceValidationSuccess(slug, workspace.nodeCount);

                return workspace;
            } catch (error: any) {
                lastError = error;

                // Handle HTTP error responses
                if (error.response) {
                    const status = error.response.status;
                    const errorData = error.response.data;

                    if (status === 404) {
                        // Workspace not found (FR-003)
                        const notFoundError = new WorkspaceNotFoundError(slug);
                        this.logger.logWorkspaceValidationFailure(slug, notFoundError.message);
                        throw notFoundError;
                    } else if (status === 403) {
                        // Access denied (FR-004)
                        const accessError = new AccessDeniedError(
                            slug,
                            errorData?.error || `Access denied to workspace '${slug}'`
                        );
                        this.logger.logWorkspaceValidationFailure(slug, accessError.message);
                        throw accessError;
                    } else if (status === 401) {
                        // Unauthorized - authentication issue
                        const authError = new WorkspaceValidationError(
                            errorData?.error || 'Authentication required. Please log in with \'mujarrad auth login\'',
                            'UNAUTHORIZED'
                        );
                        this.logger.logWorkspaceValidationFailure(slug, authError.message);
                        throw authError;
                    } else if (status >= 500) {
                        // Server error - may be retryable
                        if (attempt < this.maxRetries - 1) {
                            this.logger.logNetworkRetry('workspace validation', attempt + 1, this.maxRetries);
                            await this.exponentialBackoff(attempt);
                            attempt++;
                            continue;
                        }

                        const serverError = new WorkspaceValidationError(
                            errorData?.error || 'Internal server error occurred',
                            'SERVER_ERROR',
                            error
                        );
                        this.logger.logWorkspaceValidationFailure(slug, serverError.message);
                        throw serverError;
                    }

                    // Other HTTP errors
                    const httpError = new WorkspaceValidationError(
                        errorData?.error || `Workspace validation failed with status ${status}`,
                        'HTTP_ERROR',
                        error
                    );
                    this.logger.logWorkspaceValidationFailure(slug, httpError.message);
                    throw httpError;
                }

                // Handle network errors (timeouts, connection failures)
                if (this.isRetryableNetworkError(error) && attempt < this.maxRetries - 1) {
                    this.logger.logNetworkRetry('workspace validation', attempt + 1, this.maxRetries);
                    await this.exponentialBackoff(attempt);
                    attempt++;
                    continue;
                }

                // Non-retryable network error or retries exhausted
                break;
            }
        }

        // All retries exhausted
        const failureMessage = this.isRetryableNetworkError(lastError)
            ? `Unable to verify workspace: network timeout after ${this.maxRetries} attempts`
            : `Unable to verify workspace: ${lastError.message}`;

        const validationError = new WorkspaceValidationError(
            failureMessage,
            'NETWORK_ERROR',
            lastError
        );

        this.logger.logWorkspaceValidationFailure(slug, validationError.message);
        throw validationError;
    }

    /**
     * Validate slug format (client-side validation)
     * Slug must be 3-50 characters, lowercase alphanumeric with hyphens
     *
     * @param slug - Workspace slug to validate
     * @throws WorkspaceValidationError - If slug format is invalid
     */
    private validateSlugFormat(slug: string): void {
        const slugPattern = /^[a-z0-9-]{3,50}$/;

        if (!slug || typeof slug !== 'string') {
            throw new WorkspaceValidationError(
                'Workspace slug is required',
                'INVALID_SLUG'
            );
        }

        if (!slugPattern.test(slug)) {
            throw new WorkspaceValidationError(
                `Invalid workspace slug format. Slug must be 3-50 characters, lowercase alphanumeric with hyphens. Got: '${slug}'`,
                'INVALID_SLUG'
            );
        }
    }

    /**
     * Check if error is retryable network error
     * Retryable errors: ETIMEDOUT, ECONNRESET, ENOTFOUND, ECONNREFUSED
     *
     * @param error - Error to check
     * @returns boolean - True if error is retryable
     */
    private isRetryableNetworkError(error: any): boolean {
        return error && this.retryableErrorCodes.includes(error.code);
    }

    /**
     * Exponential backoff delay between retry attempts
     * Delay: 1s, 2s, 4s, 8s...
     *
     * @param attempt - Current attempt number (0-indexed)
     * @returns Promise<void> - Resolves after delay
     */
    private async exponentialBackoff(attempt: number): Promise<void> {
        const delayMs = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s, ...
        await new Promise(resolve => setTimeout(resolve, delayMs));
    }
}
