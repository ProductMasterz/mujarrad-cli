/**
 * Contract tests for Space API endpoints
 * Feature: 009-init-command-enhancement
 * Task: T010 - Contract test for GET /api/spaces/{slug}
 *
 * Purpose: Verify API client integration with backend space metadata endpoint
 * Tests space validation contract (FR-001, FR-003, FR-004)
 *
 * These tests mock HTTP responses to verify:
 * - Successful 200 response with SpaceMetadata schema
 * - 404 response for non-existent space
 * - 403 response for access denied
 * - Response schemas match contracts/backend-api.yaml
 */

import nock from 'nock';
import { SyncSpacesApi, type SpaceMetadata } from '../../src/api/generated/index.js';
import { Configuration } from '../../src/api/generated/configuration.js';

describe('Space API Contract Tests', () => {
    let spaceApi: SyncSpacesApi;
    const baseURL = 'https://mujarrad.onrender.com';
    const mockToken = 'test-jwt-token';

    beforeEach(() => {
        // Clear all HTTP mocks before each test
        nock.cleanAll();

        // Create API instance with test configuration
        const config = new Configuration({
            basePath: baseURL,
            accessToken: mockToken,
        });
        spaceApi = new SyncSpacesApi(config);
    });

    afterEach(() => {
        // Verify all mocked requests were called
        if (!nock.isDone()) {
            console.error('Pending mocks:', nock.pendingMocks());
        }
        nock.cleanAll();
    });

    describe('GET /api/spaces/{slug} - Space Metadata', () => {
        it('should return SpaceMetadata on successful 200 response', async () => {
            const mockSpace: SpaceMetadata = {
                slug: 'my-knowledge-base',
                name: 'My Knowledge Base',
                owner: 'john-doe',
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

            // Mock successful GET request
            nock(baseURL)
                .get('/api/spaces/my-knowledge-base')
                .matchHeader('Authorization', `Bearer ${mockToken}`)
                .reply(200, mockSpace);

            // Call API method
            const response = await spaceApi.getSpaceMetadata('my-knowledge-base');

            // Verify response structure matches SpaceMetadata interface
            expect(response.data).toEqual(mockSpace);
            expect(response.data.slug).toBe('my-knowledge-base');
            expect(response.data.name).toBe('My Knowledge Base');
            expect(response.data.owner).toBe('john-doe');
            expect(response.data.nodeCount).toBe(42);

            // Verify userPermissions structure (FR-004 - check write permission)
            expect(response.data.userPermissions).toBeDefined();
            expect(response.data.userPermissions.canRead).toBe(true);
            expect(response.data.userPermissions.canWrite).toBe(true);
            expect(response.data.userPermissions.canDelete).toBe(false);
            expect(response.data.userPermissions.canShare).toBe(false);

            // Verify timestamps are ISO 8601 format
            expect(response.data.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
            expect(response.data.lastModified).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
        });

        it('should throw error on 404 response for non-existent space (FR-003)', async () => {
            const errorResponse = {
                error: "Space 'invalid-space' not found",
                code: 'SPACE_NOT_FOUND',
                timestamp: '2025-10-12T15:30:00Z',
            };

            // Mock 404 NOT FOUND response
            nock(baseURL)
                .get('/api/spaces/invalid-space')
                .matchHeader('Authorization', `Bearer ${mockToken}`)
                .reply(404, errorResponse);

            // Verify API throws error for 404
            await expect(
                spaceApi.getSpaceMetadata('invalid-space')
            ).rejects.toThrow();

            // Verify error contains space not found information
            try {
                await spaceApi.getSpaceMetadata('invalid-space');
            } catch (error: any) {
                expect(error.response.status).toBe(404);
                expect(error.response.data.code).toBe('SPACE_NOT_FOUND');
                expect(error.response.data.error).toContain('invalid-space');
                expect(error.response.data.error).toContain('not found');
            }
        });

        it('should throw error on 403 response for access denied (FR-004)', async () => {
            const errorResponse = {
                error: "Access denied to space 'my-knowledge-base'. Contact the space owner for permissions.",
                code: 'SPACE_ACCESS_DENIED',
                timestamp: '2025-10-12T15:30:00Z',
            };

            // Mock 403 FORBIDDEN response
            nock(baseURL)
                .get('/api/spaces/my-knowledge-base')
                .matchHeader('Authorization', `Bearer ${mockToken}`)
                .reply(403, errorResponse);

            // Verify API throws error for 403
            await expect(
                spaceApi.getSpaceMetadata('my-knowledge-base')
            ).rejects.toThrow();

            // Verify error contains access denied information
            try {
                await spaceApi.getSpaceMetadata('my-knowledge-base');
            } catch (error: any) {
                expect(error.response.status).toBe(403);
                expect(error.response.data.code).toBe('SPACE_ACCESS_DENIED');
                expect(error.response.data.error).toContain('Access denied');
            }
        });

        it('should throw error on 401 unauthorized (missing/invalid token)', async () => {
            const errorResponse = {
                error: "Authentication required. Please log in with 'mujarrad auth login'",
                code: 'UNAUTHORIZED',
                timestamp: '2025-10-12T15:30:00Z',
            };

            // Mock 401 UNAUTHORIZED response
            nock(baseURL)
                .get('/api/spaces/my-knowledge-base')
                .matchHeader('Authorization', `Bearer ${mockToken}`)
                .reply(401, errorResponse);

            // Verify API throws error for 401
            await expect(
                spaceApi.getSpaceMetadata('my-knowledge-base')
            ).rejects.toThrow();

            try {
                await spaceApi.getSpaceMetadata('my-knowledge-base');
            } catch (error: any) {
                expect(error.response.status).toBe(401);
                expect(error.response.data.code).toBe('UNAUTHORIZED');
            }
        });

        it('should throw error on 500 internal server error', async () => {
            const errorResponse = {
                error: 'An unexpected error occurred. Please try again later.',
                code: 'INTERNAL_SERVER_ERROR',
                timestamp: '2025-10-12T15:30:00Z',
            };

            // Mock 500 SERVER ERROR response
            nock(baseURL)
                .get('/api/spaces/my-knowledge-base')
                .matchHeader('Authorization', `Bearer ${mockToken}`)
                .reply(500, errorResponse);

            // Verify API throws error for 500
            await expect(
                spaceApi.getSpaceMetadata('my-knowledge-base')
            ).rejects.toThrow();

            try {
                await spaceApi.getSpaceMetadata('my-knowledge-base');
            } catch (error: any) {
                expect(error.response.status).toBe(500);
                expect(error.response.data.code).toBe('INTERNAL_SERVER_ERROR');
            }
        });

        it('should validate slug parameter format', async () => {
            // Valid slug patterns (lowercase alphanumeric with hyphens)
            const validSlugs = ['my-space', 'test123', 'space-with-numbers-123'];

            // Note: Parameter validation happens in the API implementation
            // This test verifies the contract allows valid slugs
            for (const slug of validSlugs) {
                nock(baseURL)
                    .get(`/api/spaces/${slug}`)
                    .matchHeader('Authorization', `Bearer ${mockToken}`)
                    .reply(200, {
                        slug,
                        name: 'Test Space',
                        owner: 'test-user',
                        nodeCount: 0,
                        userPermissions: {
                            canRead: true,
                            canWrite: true,
                            canDelete: false,
                            canShare: false,
                        },
                        createdAt: '2025-01-01T00:00:00Z',
                        lastModified: '2025-01-01T00:00:00Z',
                    });

                await expect(
                    spaceApi.getSpaceMetadata(slug)
                ).resolves.not.toThrow();
            }
        });

        it('should include Authorization header with JWT token', async () => {
            // Mock request and verify Authorization header
            const scope = nock(baseURL)
                .get('/api/spaces/test-space')
                .matchHeader('Authorization', (val) => {
                    expect(val).toBe(`Bearer ${mockToken}`);
                    return val === `Bearer ${mockToken}`;
                })
                .reply(200, {
                    slug: 'test-space',
                    name: 'Test',
                    owner: 'user',
                    nodeCount: 0,
                    userPermissions: {
                        canRead: true,
                        canWrite: true,
                        canDelete: false,
                        canShare: false,
                    },
                    createdAt: '2025-01-01T00:00:00Z',
                    lastModified: '2025-01-01T00:00:00Z',
                });

            await spaceApi.getSpaceMetadata('test-space');
            expect(scope.isDone()).toBe(true);
        });

        it('should handle network timeouts gracefully', async () => {
            // Mock request that times out
            nock(baseURL)
                .get('/api/spaces/my-knowledge-base')
                .matchHeader('Authorization', `Bearer ${mockToken}`)
                .replyWithError({
                    code: 'ETIMEDOUT',
                    message: 'Request timeout',
                });

            // Verify timeout error is propagated
            await expect(
                spaceApi.getSpaceMetadata('my-knowledge-base')
            ).rejects.toThrow();

            try {
                await spaceApi.getSpaceMetadata('my-knowledge-base');
            } catch (error: any) {
                expect(error.code).toBe('ETIMEDOUT');
                expect(error.message).toContain('timeout');
            }
        });

        it('should verify response schema matches OpenAPI spec', async () => {
            const mockResponse: SpaceMetadata = {
                slug: 'test-space',
                name: 'Test Space',
                owner: 'test-owner',
                nodeCount: 100,
                userPermissions: {
                    canRead: true,
                    canWrite: true,
                    canDelete: true,
                    canShare: true,
                },
                createdAt: '2025-01-01T00:00:00Z',
                lastModified: '2025-10-12T00:00:00Z',
            };

            nock(baseURL)
                .get('/api/spaces/test-space')
                .matchHeader('Authorization', `Bearer ${mockToken}`)
                .reply(200, mockResponse);

            const response = await spaceApi.getSpaceMetadata('test-space');

            // Verify all required fields per OpenAPI spec
            const data = response.data;
            expect(data).toHaveProperty('slug');
            expect(data).toHaveProperty('name');
            expect(data).toHaveProperty('owner');
            expect(data).toHaveProperty('nodeCount');
            expect(data).toHaveProperty('userPermissions');
            expect(data).toHaveProperty('createdAt');
            expect(data).toHaveProperty('lastModified');

            // Verify types
            expect(typeof data.slug).toBe('string');
            expect(typeof data.name).toBe('string');
            expect(typeof data.owner).toBe('string');
            expect(typeof data.nodeCount).toBe('number');
            expect(typeof data.userPermissions).toBe('object');
            expect(typeof data.createdAt).toBe('string');
            expect(typeof data.lastModified).toBe('string');

            // Verify userPermissions structure
            expect(data.userPermissions).toHaveProperty('canRead');
            expect(data.userPermissions).toHaveProperty('canWrite');
            expect(data.userPermissions).toHaveProperty('canDelete');
            expect(data.userPermissions).toHaveProperty('canShare');
            expect(typeof data.userPermissions.canRead).toBe('boolean');
            expect(typeof data.userPermissions.canWrite).toBe('boolean');
            expect(typeof data.userPermissions.canDelete).toBe('boolean');
            expect(typeof data.userPermissions.canShare).toBe('boolean');
        });
    });
});
