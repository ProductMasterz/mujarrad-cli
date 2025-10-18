/**
 * SpaceCreationService
 * Feature: 010-alter-the-init
 * Tasks: T010-T011 - Implement space creation service with retry logic
 *
 * Purpose: Handle automatic space creation with retry and exponential backoff
 * Implements FR-002, FR-005, FR-006, FR-007 (space creation, logging, retry, error handling)
 */

import axios from 'axios';
import { Logger } from '../utils/Logger.js';

/**
 * Space creation request
 */
export interface SpaceCreationRequest {
    slug: string;
    displayName?: string;
    description?: string;
    isPublic?: boolean;
}

/**
 * Space creation response from backend
 */
export interface SpaceCreationResponse {
    spaceId: string;
    slug: string;
    displayName: string;
    description: string;
    createdAt: string;
    owner: {
        userId: string;
        username: string;
    };
}

/**
 * Complete space creation request with all defaults applied
 */
interface CompleteSpaceCreationRequest {
    slug: string;
    displayName: string;
    description: string;
    isPublic: boolean;
}

/**
 * SpaceCreationService handles space creation with retry logic
 *
 * Features:
 * - Client-side defaults for optional fields (FR-002)
 * - Exponential backoff retry for server/network errors (FR-006)
 * - Comprehensive error handling (FR-007)
 * - Structured logging (NFR-004)
 */
export class SpaceCreationService {
    private readonly logger: Logger;
    private readonly API_BASE_URL = 'https://mujarrad.onrender.com';
    private readonly MAX_RETRIES = 3;
    private readonly BACKOFF_DELAYS = [1000, 2000, 4000]; // Exponential: 1s, 2s, 4s
    private readonly token: string | null;

    constructor(logger: Logger, token?: string | null) {
        this.logger = logger;
        this.token = token || null;
    }

    /**
     * Create a new space
     *
     * @param request - Space creation request
     * @returns Promise<SpaceCreationResponse> - Created space details
     * @throws Error on creation failure (400, 409, 403, 500+, network errors)
     *
     * Implements FR-002: Space creation via POST /api/spaces
     * Implements FR-006: Retry with exponential backoff (3 retries, 1s, 2s, 4s)
     * Implements FR-007: Error handling for all failure scenarios
     */
    async createSpace(request: SpaceCreationRequest): Promise<SpaceCreationResponse> {
        // Apply client-side defaults
        const completeRequest = this.applyDefaults(request);

        let attempt = 0;

        // Retry loop: 4 total attempts (initial + 3 retries)
        while (attempt < this.MAX_RETRIES + 1) {
            attempt++;

            this.logger.logSpaceCreationAttempt(completeRequest.slug, attempt);

            try {
                // Build headers with authentication
                const headers: Record<string, string> = {
                    'Content-Type': 'application/json'
                };

                // Add Bearer token if available
                if (this.token) {
                    headers['Authorization'] = `Bearer ${this.token}`;
                }

                // Call backend API
                const response = await axios.post<SpaceCreationResponse>(
                    `${this.API_BASE_URL}/api/spaces`,
                    completeRequest,
                    {
                        headers,
                        timeout: 30000 // 30 second timeout
                    }
                );

                // Success - log and return
                this.logger.logSpaceCreationSuccess(completeRequest.slug, response.data.spaceId);
                return response.data;

            } catch (error: any) {
                // Handle HTTP errors
                if (axios.isAxiosError(error) && error.response) {
                    const statusCode = error.response.status;
                    const errorMessage = error.response.data?.error || error.message;

                    // Client errors (4xx) - don't retry
                    if (statusCode >= 400 && statusCode < 500) {
                        this.logger.logSpaceCreationFailure(completeRequest.slug, statusCode, errorMessage);
                        throw new Error(errorMessage);
                    }

                    // Server errors (5xx) - retry with exponential backoff
                    if (statusCode >= 500) {
                        if (attempt <= this.MAX_RETRIES) {
                            const retryIndex = attempt - 1;
                            this.logger.logNetworkRetry('space creation', attempt, this.MAX_RETRIES + 1);

                            // Apply exponential backoff delay
                            if (retryIndex < this.BACKOFF_DELAYS.length) {
                                await this.delay(this.BACKOFF_DELAYS[retryIndex]);
                            }

                            continue; // Retry
                        }

                        // Max retries exhausted
                        const finalError = `${errorMessage} (failed after 3 retries)`;
                        this.logger.logSpaceCreationFailure(completeRequest.slug, statusCode, finalError);
                        throw new Error(finalError);
                    }
                }

                // Network errors (ECONNREFUSED, ETIMEDOUT, etc.) - retry
                if (this.isRetryableNetworkError(error)) {
                    if (attempt <= this.MAX_RETRIES) {
                        const retryIndex = attempt - 1;
                        this.logger.logNetworkRetry('space creation', attempt, this.MAX_RETRIES + 1);

                        // Apply exponential backoff delay
                        if (retryIndex < this.BACKOFF_DELAYS.length) {
                            await this.delay(this.BACKOFF_DELAYS[retryIndex]);
                        }

                        continue; // Retry
                    }

                    // Max retries exhausted
                    const finalError = `Network error: ${error.message} (failed after 3 retries)`;
                    this.logger.logSpaceCreationFailure(completeRequest.slug, 0, finalError);
                    throw new Error(finalError);
                }

                // Unknown error - don't retry
                const errorMessage = error.message || 'Unknown error';
                this.logger.logSpaceCreationFailure(completeRequest.slug, 0, errorMessage);
                throw new Error(errorMessage);
            }
        }

        // Should never reach here, but TypeScript requires a return
        throw new Error(`Space creation failed after ${this.MAX_RETRIES} retries`);
    }

    /**
     * Apply default values to optional fields
     *
     * @param request - Partial space creation request
     * @returns Complete request with all fields populated
     * @private
     *
     * Defaults (FR-002):
     * - displayName: defaults to slug if not provided
     * - description: defaults to empty string if not provided
     * - isPublic: defaults to false if not provided
     */
    private applyDefaults(request: SpaceCreationRequest): CompleteSpaceCreationRequest {
        return {
            slug: request.slug,
            displayName: request.displayName || request.slug,
            description: request.description || '',
            isPublic: request.isPublic !== undefined ? request.isPublic : false
        };
    }

    /**
     * Check if error is retryable network error
     *
     * @param error - Error to check
     * @returns true if error is retryable
     * @private
     *
     * Retryable errors: ECONNREFUSED, ETIMEDOUT, ECONNRESET, etc.
     */
    private isRetryableNetworkError(error: any): boolean {
        const retryableCodes = ['ECONNREFUSED', 'ETIMEDOUT', 'ECONNRESET', 'ENETUNREACH'];
        return error && retryableCodes.includes(error.code);
    }

    /**
     * Delay execution for specified milliseconds
     *
     * @param ms - Milliseconds to delay
     * @returns Promise that resolves after delay
     * @private
     */
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
