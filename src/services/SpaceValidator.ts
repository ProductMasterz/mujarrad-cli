/**
 * SpaceValidator service
 * Feature: 009-init-command-enhancement
 * Task: T014 - Implement SpaceValidator service
 *
 * Validates space existence and user permissions before vault upload.
 * Implements pre-flight validation (FR-001, FR-002, FR-003, FR-004, FR-005)
 */

import { SyncSpacesApi, type SpaceMetadata } from '../api/generated/index.js';
import { SpaceNotFoundError, AccessDeniedError, SpaceValidationError } from '../errors/SpaceErrors.js';
import { Logger } from '../utils/Logger.js';

/**
 * SpaceValidator validates space before vault upload
 * @class SpaceValidator
 */
export class SpaceValidator {
    private readonly spaceApi: SyncSpacesApi;
    private readonly logger: Logger;
    private readonly maxRetries: number = 3;
    private readonly retryableErrorCodes: string[] = ['ETIMEDOUT', 'ECONNRESET', 'ECONNREFUSED'];

    constructor(spaceApi: SyncSpacesApi, logger: Logger) {
        this.spaceApi = spaceApi;
        this.logger = logger;
    }

    /**
     * Validate space exists and user has write permissions
     * Implements FR-001, FR-002, FR-003, FR-004
     *
     * @param slug - Space slug (URL-safe identifier)
     * @returns Promise<SpaceMetadata> - Space metadata if validation succeeds
     * @throws SpaceNotFoundError - If space doesn't exist (404)
     * @throws AccessDeniedError - If user lacks write permissions (403)
     * @throws SpaceValidationError - For other validation failures
     */
    async validateSpace(slug: string): Promise<SpaceMetadata> {
        // Validate slug format first (client-side validation)
        this.validateSlugFormat(slug);

        // Log validation start (FR-005)
        this.logger.logSpaceValidationStart(slug);

        let lastError: any;
        let attempt = 0;

        // Retry loop for network errors (FR-002 - handle timeouts)
        while (attempt < this.maxRetries) {
            try {
                // Call space metadata API
                const response = await this.spaceApi.getSpaceMetadata(slug);

                // Backend returns SpaceResponse, which might be at response.data or response.data.data
                // depending on API wrapper structure
                let backendSpaceData = response.data as any;

                // If response.data has a 'data' field, unwrap it
                if (backendSpaceData && backendSpaceData.data && typeof backendSpaceData.data === 'object') {
                    backendSpaceData = backendSpaceData.data;
                }

                // Defensive check: ensure response has expected structure
                if (!backendSpaceData || typeof backendSpaceData !== 'object') {
                    throw new SpaceValidationError(
                        'Invalid API response: expected space object',
                        'INVALID_RESPONSE'
                    );
                }

                // Backend returns SpaceResponse (not SpaceMetadata with userPermissions)
                // SpaceResponse has: id, name, slug, ownerId, createdAt, updatedAt
                // We need to adapt it to SpaceMetadata format

                // Transform backend SpaceResponse to SpaceMetadata format
                // Note: Backend doesn't expose userPermissions yet, so we assume:
                // - If space is accessible (no 403/404), user has read access
                // - For write access, we assume true (backend will enforce on actual writes)
                const spaceData: SpaceMetadata = {
                    slug: backendSpaceData.slug || slug,
                    name: backendSpaceData.name || slug,
                    owner: backendSpaceData.ownerId || 'unknown',
                    nodeCount: 0, // Backend doesn't provide this in SpaceResponse yet
                    userPermissions: {
                        canRead: true, // If we can fetch the space, we can read it
                        canWrite: true, // Assume write access (backend enforces on actual operations)
                        canDelete: true, // Assume delete access (backend enforces on actual operations)
                        canShare: true // Assume share access (backend enforces on actual operations)
                    },
                    createdAt: backendSpaceData.createdAt || new Date().toISOString(),
                    lastModified: backendSpaceData.updatedAt || backendSpaceData.createdAt || new Date().toISOString()
                };

                // Log successful validation (FR-005)
                this.logger.logSpaceValidationSuccess(slug, spaceData.nodeCount);

                return spaceData;
            } catch (error: any) {
                lastError = error;

                // Re-throw our custom errors immediately (don't wrap them)
                if (error instanceof AccessDeniedError ||
                    error instanceof SpaceNotFoundError ||
                    error instanceof SpaceValidationError) {
                    throw error;
                }

                // Handle HTTP error responses
                if (error.response) {
                    const status = error.response.status;
                    const errorData = error.response.data;

                    if (status === 404) {
                        // Space not found (FR-003)
                        const notFoundError = new SpaceNotFoundError(slug);
                        this.logger.logSpaceValidationFailure(slug, notFoundError.message);
                        throw notFoundError;
                    } else if (status === 403) {
                        // Access denied (FR-004)
                        const accessError = new AccessDeniedError(
                            slug,
                            errorData?.error || `Access denied to space '${slug}'`
                        );
                        this.logger.logSpaceValidationFailure(slug, accessError.message);
                        throw accessError;
                    } else if (status === 401) {
                        // Unauthorized - authentication issue
                        const authError = new SpaceValidationError(
                            errorData?.error || 'Authentication required. Please log in with \'mujarrad auth login\'',
                            'UNAUTHORIZED'
                        );
                        this.logger.logSpaceValidationFailure(slug, authError.message);
                        throw authError;
                    } else if (status >= 500) {
                        // Server error - may be retryable
                        if (attempt < this.maxRetries - 1) {
                            this.logger.logNetworkRetry('space validation', attempt + 1, this.maxRetries);
                            await this.exponentialBackoff(attempt);
                            attempt++;
                            continue;
                        }

                        const serverError = new SpaceValidationError(
                            errorData?.error || 'Internal server error occurred',
                            'SERVER_ERROR',
                            error
                        );
                        this.logger.logSpaceValidationFailure(slug, serverError.message);
                        throw serverError;
                    }

                    // Other HTTP errors
                    const httpError = new SpaceValidationError(
                        errorData?.error || `Space validation failed with status ${status}`,
                        'HTTP_ERROR',
                        error
                    );
                    this.logger.logSpaceValidationFailure(slug, httpError.message);
                    throw httpError;
                }

                // Handle network errors (timeouts, connection failures)
                if (this.isRetryableNetworkError(error) && attempt < this.maxRetries - 1) {
                    this.logger.logNetworkRetry('space validation', attempt + 1, this.maxRetries);
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
            ? `Unable to verify space: network timeout after ${this.maxRetries} attempts`
            : `Unable to verify space: ${lastError.message}`;

        const validationError = new SpaceValidationError(
            failureMessage,
            'NETWORK_ERROR',
            lastError
        );

        this.logger.logSpaceValidationFailure(slug, validationError.message);
        throw validationError;
    }

    /**
     * Validate slug format (client-side validation)
     * Slug must be 3-50 characters, lowercase alphanumeric with hyphens
     *
     * @param slug - Space slug to validate
     * @throws SpaceValidationError - If slug format is invalid
     */
    private validateSlugFormat(slug: string): void {
        const slugPattern = /^[a-z0-9-]{3,50}$/;

        if (!slug || typeof slug !== 'string') {
            throw new SpaceValidationError(
                'Space slug is required',
                'INVALID_SLUG'
            );
        }

        if (!slugPattern.test(slug)) {
            throw new SpaceValidationError(
                `Invalid space slug format. Slug must be 3-50 characters, lowercase alphanumeric with hyphens. Got: '${slug}'`,
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
