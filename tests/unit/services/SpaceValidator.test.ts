/**
 * Unit tests for SpaceValidator service
 * Feature: 009-init-command-enhancement
 * Task: T011 - Unit test for SpaceValidator service
 *
 * Purpose: Test space validation logic with mocked API responses
 * Tests FR-001, FR-002, FR-003, FR-004, FR-005, NFR-001
 *
 * TDD approach: These tests are written BEFORE implementation and should FAIL initially
 */

import { SpaceValidator } from '../../../src/services/SpaceValidator.js';
import { SyncSpacesApi, type SpaceMetadata } from '../../../src/api/generated/index.js';
import { SpaceNotFoundError, AccessDeniedError, SpaceValidationError } from '../../../src/errors/SpaceErrors.js';
import { Logger } from '../../../src/utils/Logger.js';

// Mock Logger
jest.mock('../../../src/utils/Logger.js');

describe('SpaceValidator', () => {
    let spaceValidator: SpaceValidator;
    let mockSpaceApi: jest.Mocked<SyncSpacesApi>;
    let mockLogger: jest.Mocked<Logger>;

    beforeEach(() => {
        // Clear all mocks
        jest.clearAllMocks();

        // Create mock SyncSpacesApi
        mockSpaceApi = {
            getSpaceMetadata: jest.fn(),
        } as any;

        // Create mock Logger
        mockLogger = {
            logSpaceValidationStart: jest.fn(),
            logSpaceValidationSuccess: jest.fn(),
            logSpaceValidationFailure: jest.fn(),
            logNetworkRetry: jest.fn(),
            info: jest.fn(),
            error: jest.fn(),
        } as any;

        // Create SpaceValidator with mocked dependencies
        spaceValidator = new SpaceValidator(mockSpaceApi, mockLogger);
    });

    describe('validateSpace', () => {
        const validSpace: SpaceMetadata = {
            slug: 'my-space',
            name: 'My Space',
            owner: 'test-user',
            nodeCount: 42,
            userPermissions: {
                canRead: true,
                canWrite: true,
                canDelete: false,
                canShare: false,
            },
            createdAt: '2025-01-15T10:30:00Z',
            lastModified: '2025-10-12T14:22:33Z',
        };

        it('should return space metadata on successful validation (FR-001, FR-005)', async () => {
            // Mock successful API response
            mockSpaceApi.getSpaceMetadata.mockResolvedValue({
                data: validSpace,
            } as any);

            // Call validation
            const result = await spaceValidator.validateSpace('my-space');

            // Verify API was called with correct slug
            expect(mockSpaceApi.getSpaceMetadata).toHaveBeenCalledWith('my-space');
            expect(mockSpaceApi.getSpaceMetadata).toHaveBeenCalledTimes(1);

            // Verify result matches space metadata
            expect(result).toEqual(validSpace);
            expect(result.slug).toBe('my-space');
            expect(result.name).toBe('My Space');
            expect(result.nodeCount).toBe(42);

            // Verify logging (FR-005)
            expect(mockLogger.logSpaceValidationStart).toHaveBeenCalledWith('my-space');
            expect(mockLogger.logSpaceValidationSuccess).toHaveBeenCalledWith('my-space', 42);
        });

        it('should throw SpaceNotFoundError on 404 response (FR-003)', async () => {
            // Mock 404 error response
            const error404 = {
                response: {
                    status: 404,
                    data: {
                        error: "Space 'invalid-space' not found",
                        code: 'SPACE_NOT_FOUND',
                    },
                },
            };

            mockSpaceApi.getSpaceMetadata.mockRejectedValue(error404);

            // Verify SpaceNotFoundError is thrown
            await expect(
                spaceValidator.validateSpace('invalid-space')
            ).rejects.toThrow(SpaceNotFoundError);

            await expect(
                spaceValidator.validateSpace('invalid-space')
            ).rejects.toThrow("Space 'invalid-space' not found");

            // Verify error logging
            expect(mockLogger.logSpaceValidationStart).toHaveBeenCalledWith('invalid-space');
            expect(mockLogger.logSpaceValidationFailure).toHaveBeenCalledWith(
                'invalid-space',
                expect.stringContaining('not found')
            );
        });

        it('should throw AccessDeniedError on 403 response (FR-004)', async () => {
            // Mock 403 error response
            const error403 = {
                response: {
                    status: 403,
                    data: {
                        error: "Access denied to space 'restricted-space'",
                        code: 'SPACE_ACCESS_DENIED',
                    },
                },
            };

            mockSpaceApi.getSpaceMetadata.mockRejectedValue(error403);

            // Verify AccessDeniedError is thrown
            await expect(
                spaceValidator.validateSpace('restricted-space')
            ).rejects.toThrow(AccessDeniedError);

            await expect(
                spaceValidator.validateSpace('restricted-space')
            ).rejects.toThrow('Access denied');

            // Verify error logging
            expect(mockLogger.logSpaceValidationFailure).toHaveBeenCalledWith(
                'restricted-space',
                expect.stringContaining('Access denied')
            );
        });

        it('should retry on network timeout and eventually succeed (NFR-001)', async () => {
            // Mock first two calls fail with timeout, third succeeds
            mockSpaceApi.getSpaceMetadata
                .mockRejectedValueOnce({ code: 'ETIMEDOUT', message: 'Timeout' })
                .mockRejectedValueOnce({ code: 'ETIMEDOUT', message: 'Timeout' })
                .mockResolvedValueOnce({ data: validSpace } as any);

            // Call validation
            const result = await spaceValidator.validateSpace('my-space');

            // Verify retries occurred
            expect(mockSpaceApi.getSpaceMetadata).toHaveBeenCalledTimes(3);

            // Verify retry logging
            expect(mockLogger.logNetworkRetry).toHaveBeenCalledTimes(2);
            expect(mockLogger.logNetworkRetry).toHaveBeenNthCalledWith(1, 'space validation', 1, 3);
            expect(mockLogger.logNetworkRetry).toHaveBeenNthCalledWith(2, 'space validation', 2, 3);

            // Verify eventual success
            expect(result).toEqual(validSpace);
            expect(mockLogger.logSpaceValidationSuccess).toHaveBeenCalled();
        });

        it('should throw SpaceValidationError after 3 failed retry attempts', async () => {
            // Mock all 3 attempts fail with timeout
            mockSpaceApi.getSpaceMetadata.mockRejectedValue({
                code: 'ETIMEDOUT',
                message: 'Request timeout',
            });

            // Verify error is thrown after retries exhausted
            try {
                await spaceValidator.validateSpace('my-space');
                fail('Expected SpaceValidationError to be thrown');
            } catch (error: any) {
                expect(error).toBeInstanceOf(SpaceValidationError);
                expect(error.message).toContain('Unable to verify space: network timeout after 3 attempts');
            }

            // Verify all retry attempts were made
            expect(mockSpaceApi.getSpaceMetadata).toHaveBeenCalledTimes(3);
            expect(mockLogger.logNetworkRetry).toHaveBeenCalledTimes(2); // 2 retries after initial attempt

            // Verify failure logging
            expect(mockLogger.logSpaceValidationFailure).toHaveBeenCalledWith(
                'my-space',
                expect.stringContaining('timeout after 3 attempts')
            );
        });

        it('should implement exponential backoff between retry attempts', async () => {
            const startTime = Date.now();

            // Mock first two calls fail, third succeeds
            mockSpaceApi.getSpaceMetadata
                .mockRejectedValueOnce({ code: 'ECONNRESET', message: 'Connection reset' })
                .mockRejectedValueOnce({ code: 'ECONNRESET', message: 'Connection reset' })
                .mockResolvedValueOnce({ data: validSpace } as any);

            await spaceValidator.validateSpace('my-space');

            const elapsedTime = Date.now() - startTime;

            // Verify exponential backoff delays occurred
            // First retry: 1 second, Second retry: 2 seconds = minimum 3 seconds total
            expect(elapsedTime).toBeGreaterThanOrEqual(3000);

            expect(mockSpaceApi.getSpaceMetadata).toHaveBeenCalledTimes(3);
        });

        it('should complete validation within 5 seconds for successful requests (NFR-001)', async () => {
            mockSpaceApi.getSpaceMetadata.mockResolvedValue({
                data: validSpace,
            } as any);

            const startTime = Date.now();
            await spaceValidator.validateSpace('my-space');
            const elapsedTime = Date.now() - startTime;

            // Verify completion within 5 seconds (NFR-001)
            expect(elapsedTime).toBeLessThan(5000);
        });

        it('should throw SpaceValidationError on 401 unauthorized', async () => {
            const error401 = {
                response: {
                    status: 401,
                    data: {
                        error: 'Authentication required',
                        code: 'UNAUTHORIZED',
                    },
                },
            };

            mockSpaceApi.getSpaceMetadata.mockRejectedValue(error401);

            await expect(
                spaceValidator.validateSpace('my-space')
            ).rejects.toThrow(SpaceValidationError);

            await expect(
                spaceValidator.validateSpace('my-space')
            ).rejects.toThrow('Authentication required');
        });

        it('should throw SpaceValidationError on 500 server error', async () => {
            const error500 = {
                response: {
                    status: 500,
                    data: {
                        error: 'Internal server error',
                        code: 'INTERNAL_SERVER_ERROR',
                    },
                },
            };

            mockSpaceApi.getSpaceMetadata.mockRejectedValue(error500);

            await expect(
                spaceValidator.validateSpace('my-space')
            ).rejects.toThrow(SpaceValidationError);

            await expect(
                spaceValidator.validateSpace('my-space')
            ).rejects.toThrow('server error');
        });

        it('should verify user has write permissions (FR-004)', async () => {
            const spaceNoWrite: SpaceMetadata = {
                ...validSpace,
                userPermissions: {
                    canRead: true,
                    canWrite: false, // No write permission
                    canDelete: false,
                    canShare: false,
                },
            };

            mockSpaceApi.getSpaceMetadata.mockResolvedValue({
                data: spaceNoWrite,
            } as any);

            // Verify AccessDeniedError is thrown when canWrite is false
            await expect(
                spaceValidator.validateSpace('my-space')
            ).rejects.toThrow(AccessDeniedError);

            await expect(
                spaceValidator.validateSpace('my-space')
            ).rejects.toThrow('You do not have write access to this space');
        });

        it('should handle network errors without retry for non-timeout errors', async () => {
            const networkError = {
                code: 'ENOTFOUND',
                message: 'DNS lookup failed',
            };

            mockSpaceApi.getSpaceMetadata.mockRejectedValue(networkError);

            await expect(
                spaceValidator.validateSpace('my-space')
            ).rejects.toThrow(SpaceValidationError);

            // Verify only 1 attempt (no retries for non-timeout errors)
            expect(mockSpaceApi.getSpaceMetadata).toHaveBeenCalledTimes(1);
            expect(mockLogger.logNetworkRetry).not.toHaveBeenCalled();
        });

        it('should validate slug format before making API call', async () => {
            // Test empty slug separately (different error message)
            await expect(
                spaceValidator.validateSpace('')
            ).rejects.toThrow('Space slug is required');
            expect(mockSpaceApi.getSpaceMetadata).not.toHaveBeenCalled();

            jest.clearAllMocks();

            // Invalid slugs (should fail validation before API call)
            const invalidSlugs = [
                'ab', // Too short (< 3 chars)
                'a'.repeat(51), // Too long (> 50 chars)
                'My Space', // Contains spaces
                'space_test', // Contains underscore
                'Space-Test', // Contains uppercase
            ];

            for (const slug of invalidSlugs) {
                await expect(
                    spaceValidator.validateSpace(slug)
                ).rejects.toThrow('Invalid space slug');

                // Verify API was not called
                expect(mockSpaceApi.getSpaceMetadata).not.toHaveBeenCalled();
                jest.clearAllMocks();
            }
        });

        it('should accept valid slug formats', async () => {
            const validSlugs = [
                'abc', // Minimum length
                'my-space-123', // Alphanumeric with hyphens
                'space', // Simple lowercase
                'a'.repeat(50), // Maximum length
            ];

            mockSpaceApi.getSpaceMetadata.mockResolvedValue({
                data: validSpace,
            } as any);

            for (const slug of validSlugs) {
                jest.clearAllMocks();

                await expect(
                    spaceValidator.validateSpace(slug)
                ).resolves.not.toThrow();

                // Verify API was called
                expect(mockSpaceApi.getSpaceMetadata).toHaveBeenCalledWith(slug);
            }
        });
    });
});
