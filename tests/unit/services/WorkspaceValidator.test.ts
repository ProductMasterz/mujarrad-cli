/**
 * Unit tests for WorkspaceValidator service
 * Feature: 009-init-command-enhancement
 * Task: T011 - Unit test for WorkspaceValidator service
 *
 * Purpose: Test workspace validation logic with mocked API responses
 * Tests FR-001, FR-002, FR-003, FR-004, FR-005, NFR-001
 *
 * TDD approach: These tests are written BEFORE implementation and should FAIL initially
 */

import { WorkspaceValidator } from '../../../src/services/WorkspaceValidator.js';
import { SyncWorkspacesApi, type WorkspaceMetadata } from '../../../src/api/generated/index.js';
import { WorkspaceNotFoundError, AccessDeniedError, WorkspaceValidationError } from '../../../src/errors/WorkspaceErrors.js';
import { Logger } from '../../../src/utils/Logger.js';

// Mock Logger
jest.mock('../../../src/utils/Logger.js');

describe('WorkspaceValidator', () => {
    let workspaceValidator: WorkspaceValidator;
    let mockWorkspaceApi: jest.Mocked<SyncWorkspacesApi>;
    let mockLogger: jest.Mocked<Logger>;

    beforeEach(() => {
        // Clear all mocks
        jest.clearAllMocks();

        // Create mock SyncWorkspacesApi
        mockWorkspaceApi = {
            getWorkspaceMetadata: jest.fn(),
        } as any;

        // Create mock Logger
        mockLogger = {
            logWorkspaceValidationStart: jest.fn(),
            logWorkspaceValidationSuccess: jest.fn(),
            logWorkspaceValidationFailure: jest.fn(),
            logNetworkRetry: jest.fn(),
            info: jest.fn(),
            error: jest.fn(),
        } as any;

        // Create WorkspaceValidator with mocked dependencies
        workspaceValidator = new WorkspaceValidator(mockWorkspaceApi, mockLogger);
    });

    describe('validateWorkspace', () => {
        const validWorkspace: WorkspaceMetadata = {
            slug: 'my-workspace',
            name: 'My Workspace',
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

        it('should return workspace metadata on successful validation (FR-001, FR-005)', async () => {
            // Mock successful API response
            mockWorkspaceApi.getWorkspaceMetadata.mockResolvedValue({
                data: validWorkspace,
            } as any);

            // Call validation
            const result = await workspaceValidator.validateWorkspace('my-workspace');

            // Verify API was called with correct slug
            expect(mockWorkspaceApi.getWorkspaceMetadata).toHaveBeenCalledWith('my-workspace');
            expect(mockWorkspaceApi.getWorkspaceMetadata).toHaveBeenCalledTimes(1);

            // Verify result matches workspace metadata
            expect(result).toEqual(validWorkspace);
            expect(result.slug).toBe('my-workspace');
            expect(result.name).toBe('My Workspace');
            expect(result.nodeCount).toBe(42);

            // Verify logging (FR-005)
            expect(mockLogger.logWorkspaceValidationStart).toHaveBeenCalledWith('my-workspace');
            expect(mockLogger.logWorkspaceValidationSuccess).toHaveBeenCalledWith('my-workspace', 42);
        });

        it('should throw WorkspaceNotFoundError on 404 response (FR-003)', async () => {
            // Mock 404 error response
            const error404 = {
                response: {
                    status: 404,
                    data: {
                        error: "Workspace 'invalid-workspace' not found",
                        code: 'WORKSPACE_NOT_FOUND',
                    },
                },
            };

            mockWorkspaceApi.getWorkspaceMetadata.mockRejectedValue(error404);

            // Verify WorkspaceNotFoundError is thrown
            await expect(
                workspaceValidator.validateWorkspace('invalid-workspace')
            ).rejects.toThrow(WorkspaceNotFoundError);

            await expect(
                workspaceValidator.validateWorkspace('invalid-workspace')
            ).rejects.toThrow("Workspace 'invalid-workspace' not found");

            // Verify error logging
            expect(mockLogger.logWorkspaceValidationStart).toHaveBeenCalledWith('invalid-workspace');
            expect(mockLogger.logWorkspaceValidationFailure).toHaveBeenCalledWith(
                'invalid-workspace',
                expect.stringContaining('not found')
            );
        });

        it('should throw AccessDeniedError on 403 response (FR-004)', async () => {
            // Mock 403 error response
            const error403 = {
                response: {
                    status: 403,
                    data: {
                        error: "Access denied to workspace 'restricted-workspace'",
                        code: 'WORKSPACE_ACCESS_DENIED',
                    },
                },
            };

            mockWorkspaceApi.getWorkspaceMetadata.mockRejectedValue(error403);

            // Verify AccessDeniedError is thrown
            await expect(
                workspaceValidator.validateWorkspace('restricted-workspace')
            ).rejects.toThrow(AccessDeniedError);

            await expect(
                workspaceValidator.validateWorkspace('restricted-workspace')
            ).rejects.toThrow('Access denied');

            // Verify error logging
            expect(mockLogger.logWorkspaceValidationFailure).toHaveBeenCalledWith(
                'restricted-workspace',
                expect.stringContaining('Access denied')
            );
        });

        it('should retry on network timeout and eventually succeed (NFR-001)', async () => {
            // Mock first two calls fail with timeout, third succeeds
            mockWorkspaceApi.getWorkspaceMetadata
                .mockRejectedValueOnce({ code: 'ETIMEDOUT', message: 'Timeout' })
                .mockRejectedValueOnce({ code: 'ETIMEDOUT', message: 'Timeout' })
                .mockResolvedValueOnce({ data: validWorkspace } as any);

            // Call validation
            const result = await workspaceValidator.validateWorkspace('my-workspace');

            // Verify retries occurred
            expect(mockWorkspaceApi.getWorkspaceMetadata).toHaveBeenCalledTimes(3);

            // Verify retry logging
            expect(mockLogger.logNetworkRetry).toHaveBeenCalledTimes(2);
            expect(mockLogger.logNetworkRetry).toHaveBeenNthCalledWith(1, 'workspace validation', 1, 3);
            expect(mockLogger.logNetworkRetry).toHaveBeenNthCalledWith(2, 'workspace validation', 2, 3);

            // Verify eventual success
            expect(result).toEqual(validWorkspace);
            expect(mockLogger.logWorkspaceValidationSuccess).toHaveBeenCalled();
        });

        it('should throw WorkspaceValidationError after 3 failed retry attempts', async () => {
            // Mock all 3 attempts fail with timeout
            mockWorkspaceApi.getWorkspaceMetadata.mockRejectedValue({
                code: 'ETIMEDOUT',
                message: 'Request timeout',
            });

            // Verify error is thrown after retries exhausted
            await expect(
                workspaceValidator.validateWorkspace('my-workspace')
            ).rejects.toThrow(WorkspaceValidationError);

            await expect(
                workspaceValidator.validateWorkspace('my-workspace')
            ).rejects.toThrow('Unable to verify workspace: network timeout after 3 attempts');

            // Verify all retry attempts were made
            expect(mockWorkspaceApi.getWorkspaceMetadata).toHaveBeenCalledTimes(3);
            expect(mockLogger.logNetworkRetry).toHaveBeenCalledTimes(2); // 2 retries after initial attempt

            // Verify failure logging
            expect(mockLogger.logWorkspaceValidationFailure).toHaveBeenCalledWith(
                'my-workspace',
                expect.stringContaining('timeout after 3 attempts')
            );
        });

        it('should implement exponential backoff between retry attempts', async () => {
            const startTime = Date.now();

            // Mock first two calls fail, third succeeds
            mockWorkspaceApi.getWorkspaceMetadata
                .mockRejectedValueOnce({ code: 'ECONNRESET', message: 'Connection reset' })
                .mockRejectedValueOnce({ code: 'ECONNRESET', message: 'Connection reset' })
                .mockResolvedValueOnce({ data: validWorkspace } as any);

            await workspaceValidator.validateWorkspace('my-workspace');

            const elapsedTime = Date.now() - startTime;

            // Verify exponential backoff delays occurred
            // First retry: 1 second, Second retry: 2 seconds = minimum 3 seconds total
            expect(elapsedTime).toBeGreaterThanOrEqual(3000);

            expect(mockWorkspaceApi.getWorkspaceMetadata).toHaveBeenCalledTimes(3);
        });

        it('should complete validation within 5 seconds for successful requests (NFR-001)', async () => {
            mockWorkspaceApi.getWorkspaceMetadata.mockResolvedValue({
                data: validWorkspace,
            } as any);

            const startTime = Date.now();
            await workspaceValidator.validateWorkspace('my-workspace');
            const elapsedTime = Date.now() - startTime;

            // Verify completion within 5 seconds (NFR-001)
            expect(elapsedTime).toBeLessThan(5000);
        });

        it('should throw WorkspaceValidationError on 401 unauthorized', async () => {
            const error401 = {
                response: {
                    status: 401,
                    data: {
                        error: 'Authentication required',
                        code: 'UNAUTHORIZED',
                    },
                },
            };

            mockWorkspaceApi.getWorkspaceMetadata.mockRejectedValue(error401);

            await expect(
                workspaceValidator.validateWorkspace('my-workspace')
            ).rejects.toThrow(WorkspaceValidationError);

            await expect(
                workspaceValidator.validateWorkspace('my-workspace')
            ).rejects.toThrow('Authentication required');
        });

        it('should throw WorkspaceValidationError on 500 server error', async () => {
            const error500 = {
                response: {
                    status: 500,
                    data: {
                        error: 'Internal server error',
                        code: 'INTERNAL_SERVER_ERROR',
                    },
                },
            };

            mockWorkspaceApi.getWorkspaceMetadata.mockRejectedValue(error500);

            await expect(
                workspaceValidator.validateWorkspace('my-workspace')
            ).rejects.toThrow(WorkspaceValidationError);

            await expect(
                workspaceValidator.validateWorkspace('my-workspace')
            ).rejects.toThrow('server error');
        });

        it('should verify user has write permissions (FR-004)', async () => {
            const workspaceNoWrite: WorkspaceMetadata = {
                ...validWorkspace,
                userPermissions: {
                    canRead: true,
                    canWrite: false, // No write permission
                    canDelete: false,
                    canShare: false,
                },
            };

            mockWorkspaceApi.getWorkspaceMetadata.mockResolvedValue({
                data: workspaceNoWrite,
            } as any);

            // Verify AccessDeniedError is thrown when canWrite is false
            await expect(
                workspaceValidator.validateWorkspace('my-workspace')
            ).rejects.toThrow(AccessDeniedError);

            await expect(
                workspaceValidator.validateWorkspace('my-workspace')
            ).rejects.toThrow('You do not have write access to this workspace');
        });

        it('should handle network errors without retry for non-timeout errors', async () => {
            const networkError = {
                code: 'ENOTFOUND',
                message: 'DNS lookup failed',
            };

            mockWorkspaceApi.getWorkspaceMetadata.mockRejectedValue(networkError);

            await expect(
                workspaceValidator.validateWorkspace('my-workspace')
            ).rejects.toThrow(WorkspaceValidationError);

            // Verify only 1 attempt (no retries for non-timeout errors)
            expect(mockWorkspaceApi.getWorkspaceMetadata).toHaveBeenCalledTimes(1);
            expect(mockLogger.logNetworkRetry).not.toHaveBeenCalled();
        });

        it('should validate slug format before making API call', async () => {
            // Invalid slugs (should fail validation before API call)
            const invalidSlugs = [
                '', // Empty
                'ab', // Too short (< 3 chars)
                'a'.repeat(51), // Too long (> 50 chars)
                'My Workspace', // Contains spaces
                'workspace_test', // Contains underscore
                'Workspace-Test', // Contains uppercase
            ];

            for (const slug of invalidSlugs) {
                await expect(
                    workspaceValidator.validateWorkspace(slug)
                ).rejects.toThrow('Invalid workspace slug');

                // Verify API was not called
                expect(mockWorkspaceApi.getWorkspaceMetadata).not.toHaveBeenCalled();
            }
        });

        it('should accept valid slug formats', async () => {
            const validSlugs = [
                'abc', // Minimum length
                'my-workspace-123', // Alphanumeric with hyphens
                'workspace', // Simple lowercase
                'a'.repeat(50), // Maximum length
            ];

            mockWorkspaceApi.getWorkspaceMetadata.mockResolvedValue({
                data: validWorkspace,
            } as any);

            for (const slug of validSlugs) {
                jest.clearAllMocks();

                await expect(
                    workspaceValidator.validateWorkspace(slug)
                ).resolves.not.toThrow();

                // Verify API was called
                expect(mockWorkspaceApi.getWorkspaceMetadata).toHaveBeenCalledWith(slug);
            }
        });
    });
});
