/**
 * Contract tests for GET /api/spaces/{slug}/nodes pagination
 * Feature: 009-init-command-enhancement
 * Task: T018 - Contract test for space nodes pagination
 *
 * Purpose: Verify API client integration with backend space nodes endpoint
 * Tests FR-007 (remote content pull), FR-019 (metadata caching), NFR-004 (10,000+ nodes)
 *
 * TDD approach: This test is written BEFORE implementation and should FAIL initially
 */

import nock from 'nock';
import { SyncSpacesApi, Configuration } from '../../src/api/generated/index.js';

describe('Contract: GET /api/spaces/{slug}/nodes - Pagination', () => {
    let spaceApi: SyncSpacesApi;
    const baseURL = 'https://mujarrad.onrender.com';
    const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.token';

    beforeAll(() => {
        const config = new Configuration({
            basePath: baseURL,
            accessToken: mockToken
        });
        spaceApi = new SyncSpacesApi(config);
    });

    afterEach(() => {
        nock.cleanAll();
    });

    describe('Paginated Responses', () => {
        it('should return first page of nodes with nextCursor', async () => {
            const mockResponse = {
                data: [
                    {
                        uuid: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
                        title: 'Meeting Notes',
                        content: '# Meeting Notes\n\nDiscussed project roadmap...',
                        filePath: 'meetings/2025-10-12.md',
                        hash: '3a5b7c9d1e2f4a6b8c0d2e4f6a8b0c2d4e6f8a0b2c4d6e8f0a2b4c6d8e0f2a4',
                        lastModified: '2025-10-12T14:00:00Z',
                        ancestorHash: null,
                        fileType: 'markdown',
                        metadata: {
                            tags: ['meeting', 'roadmap'],
                            frontmatter: {
                                date: '2025-10-12',
                                attendees: ['Alice', 'Bob']
                            }
                        }
                    },
                    {
                        uuid: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
                        title: 'Project Canvas',
                        content: '{"nodes":[],"edges":[]}',
                        filePath: 'projects/roadmap.canvas',
                        hash: '4b6c8d0e2f4a6b8c0d2e4f6a8b0c2d4e6f8a0b2c4d6e8f0a2b4c6d8e0f2a4b',
                        lastModified: '2025-10-11T16:30:00Z',
                        ancestorHash: null,
                        fileType: 'canvas',
                        metadata: {}
                    }
                ],
                pagination: {
                    nextCursor: 'eyJsYXN0SWQiOjEwMH0=',
                    hasMore: true
                }
            };

            nock(baseURL)
                .get('/api/spaces/my-space/nodes')
                .matchHeader('Authorization', `Bearer ${mockToken}`)
                .reply(200, mockResponse);

            const response = await spaceApi.listSpaceNodes('my-space');

            expect(response.data.data).toHaveLength(2);
            expect(response.data.data[0].uuid).toBe('a1b2c3d4-e5f6-7890-abcd-ef1234567890');
            expect(response.data.data[0].fileType).toBe('markdown');
            expect(response.data.pagination.nextCursor).toBe('eyJsYXN0SWQiOjEwMH0=');
            expect(response.data.pagination.hasMore).toBe(true);
        });

        it('should return second page with cursor parameter', async () => {
            const mockResponse = {
                data: [
                    {
                        uuid: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
                        title: 'Second Page Note',
                        content: '# Second Page\n\nMore content...',
                        filePath: 'notes/page2.md',
                        hash: '5c7d9e0f2a4b6c8d0e2f4a6b8c0d2e4f6a8b0c2d4e6f8a0b2c4d6e8f0a2b4c',
                        lastModified: '2025-10-10T12:00:00Z',
                        ancestorHash: null,
                        fileType: 'markdown',
                        metadata: {}
                    }
                ],
                pagination: {
                    nextCursor: null,
                    hasMore: false
                }
            };

            nock(baseURL)
                .get('/api/spaces/my-space/nodes')
                .query({ cursor: 'eyJsYXN0SWQiOjEwMH0=' })
                .matchHeader('Authorization', `Bearer ${mockToken}`)
                .reply(200, mockResponse);

            const response = await spaceApi.listSpaceNodes('my-space', 'eyJsYXN0SWQiOjEwMH0=');

            expect(response.data.data).toHaveLength(1);
            expect(response.data.pagination.nextCursor).toBeNull();
            expect(response.data.pagination.hasMore).toBe(false);
        });

        it('should handle last page with cursor=null', async () => {
            const mockResponse = {
                data: [
                    {
                        uuid: 'd4e5f6a7-b8c9-0123-def1-234567890123',
                        title: 'Last Page Note',
                        content: '# Last Note\n\nFinal content...',
                        filePath: 'notes/last.md',
                        hash: '6d8e0f2a4b6c8d0e2f4a6b8c0d2e4f6a8b0c2d4e6f8a0b2c4d6e8f0a2b4c6d',
                        lastModified: '2025-10-09T10:00:00Z',
                        ancestorHash: null,
                        fileType: 'markdown',
                        metadata: {}
                    }
                ],
                pagination: {
                    nextCursor: null,
                    hasMore: false
                }
            };

            nock(baseURL)
                .get('/api/spaces/my-space/nodes')
                .query({ cursor: 'eyJsYXN0SWQiOjIwMH0=' })
                .matchHeader('Authorization', `Bearer ${mockToken}`)
                .reply(200, mockResponse);

            const response = await spaceApi.listSpaceNodes('my-space', 'eyJsYXN0SWQiOjIwMH0=');

            // Last page should have nextCursor = null and hasMore = false
            expect(response.data.pagination.nextCursor).toBeNull();
            expect(response.data.pagination.hasMore).toBe(false);
        });

        it('should handle empty space (0 nodes)', async () => {
            const mockResponse = {
                data: [],
                pagination: {
                    nextCursor: null,
                    hasMore: false
                }
            };

            nock(baseURL)
                .get('/api/spaces/empty-space/nodes')
                .matchHeader('Authorization', `Bearer ${mockToken}`)
                .reply(200, mockResponse);

            const response = await spaceApi.listSpaceNodes('empty-space');

            expect(response.data.data).toHaveLength(0);
            expect(response.data.pagination.nextCursor).toBeNull();
            expect(response.data.pagination.hasMore).toBe(false);
        });

        it('should support limit parameter for page size control', async () => {
            const mockResponse = {
                data: [
                    {
                        uuid: 'e5f6a7b8-c9d0-1234-ef12-345678901234',
                        title: 'Custom Limit Note',
                        content: '# Custom Limit\n\nTesting page size...',
                        filePath: 'notes/limit-test.md',
                        hash: '7e9f0a2b4c6d8e0f2a4b6c8d0e2f4a6b8c0d2e4f6a8b0c2d4e6f8a0b2c4d6e',
                        lastModified: '2025-10-08T09:00:00Z',
                        ancestorHash: null,
                        fileType: 'markdown',
                        metadata: {}
                    }
                ],
                pagination: {
                    nextCursor: 'eyJsYXN0SWQiOjUwfQ==',
                    hasMore: true
                }
            };

            nock(baseURL)
                .get('/api/spaces/my-space/nodes')
                .query({ limit: 50 })
                .matchHeader('Authorization', `Bearer ${mockToken}`)
                .reply(200, mockResponse);

            const response = await spaceApi.listSpaceNodes('my-space', undefined, 50);

            expect(response.data.data).toHaveLength(1);
            expect(response.data.pagination.nextCursor).toBe('eyJsYXN0SWQiOjUwfQ==');
        });
    });

    describe('Error Responses', () => {
        it('should handle 404 space not found', async () => {
            nock(baseURL)
                .get('/api/spaces/nonexistent/nodes')
                .matchHeader('Authorization', `Bearer ${mockToken}`)
                .reply(404, {
                    error: "Space 'nonexistent' not found",
                    code: 'SPACE_NOT_FOUND',
                    timestamp: '2025-10-12T15:30:00Z'
                });

            await expect(spaceApi.listSpaceNodes('nonexistent')).rejects.toThrow();
        });

        it('should handle 403 forbidden (no access to space)', async () => {
            nock(baseURL)
                .get('/api/spaces/restricted/nodes')
                .matchHeader('Authorization', `Bearer ${mockToken}`)
                .reply(403, {
                    error: 'You do not have read access to this space',
                    code: 'FORBIDDEN',
                    timestamp: '2025-10-12T15:30:00Z'
                });

            await expect(spaceApi.listSpaceNodes('restricted')).rejects.toThrow();
        });

        it('should handle 401 unauthorized (invalid/expired token)', async () => {
            nock(baseURL)
                .get('/api/spaces/my-space/nodes')
                .matchHeader('Authorization', `Bearer ${mockToken}`)
                .reply(401, {
                    error: "Authentication required. Please log in with 'mujarrad auth login'",
                    code: 'UNAUTHORIZED',
                    timestamp: '2025-10-12T15:30:00Z'
                });

            await expect(spaceApi.listSpaceNodes('my-space')).rejects.toThrow();
        });

        it('should handle 500 internal server error', async () => {
            nock(baseURL)
                .get('/api/spaces/my-space/nodes')
                .matchHeader('Authorization', `Bearer ${mockToken}`)
                .reply(500, {
                    error: 'An unexpected error occurred. Please try again later.',
                    code: 'INTERNAL_SERVER_ERROR',
                    timestamp: '2025-10-12T15:30:00Z'
                });

            await expect(spaceApi.listSpaceNodes('my-space')).rejects.toThrow();
        });
    });

    describe('Schema Validation', () => {
        it('should validate PaginatedNodesResponse schema structure', async () => {
            const mockResponse = {
                data: [
                    {
                        uuid: 'f6a7b8c9-d0e1-2345-f123-456789012345',
                        title: 'Schema Test',
                        content: '# Schema Test\n\nValidating response structure...',
                        filePath: 'test/schema.md',
                        hash: '8f0a2b4c6d8e0f2a4b6c8d0e2f4a6b8c0d2e4f6a8b0c2d4e6f8a0b2c4d6e8f0',
                        lastModified: '2025-10-07T08:00:00Z',
                        ancestorHash: '1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2',
                        fileType: 'markdown',
                        metadata: {
                            tags: ['test'],
                            frontmatter: { author: 'Test User' }
                        }
                    }
                ],
                pagination: {
                    nextCursor: 'eyJsYXN0SWQiOjEwfQ==',
                    hasMore: true
                }
            };

            nock(baseURL)
                .get('/api/spaces/my-space/nodes')
                .matchHeader('Authorization', `Bearer ${mockToken}`)
                .reply(200, mockResponse);

            const response = await spaceApi.listSpaceNodes('my-space');

            // Validate response structure matches PaginatedNodesResponse schema
            expect(response.data).toHaveProperty('data');
            expect(response.data).toHaveProperty('pagination');
            expect(Array.isArray(response.data.data)).toBe(true);

            // Validate RemoteNode schema structure
            const node = response.data.data[0];
            expect(node).toHaveProperty('uuid');
            expect(node).toHaveProperty('title');
            expect(node).toHaveProperty('content');
            expect(node).toHaveProperty('filePath');
            expect(node).toHaveProperty('hash');
            expect(node).toHaveProperty('lastModified');
            expect(node).toHaveProperty('ancestorHash');
            expect(node).toHaveProperty('fileType');
            expect(node).toHaveProperty('metadata');

            // Validate hash format (64 character lowercase hex)
            expect(node.hash).toMatch(/^[a-f0-9]{64}$/);

            // Validate UUID format
            expect(node.uuid).toMatch(/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/);

            // Validate fileType enum
            expect(['markdown', 'canvas']).toContain(node.fileType);

            // Validate pagination structure
            expect(response.data.pagination).toHaveProperty('nextCursor');
            expect(response.data.pagination).toHaveProperty('hasMore');
            expect(typeof response.data.pagination.hasMore).toBe('boolean');
        });

        it('should handle ancestorHash as null (new file, no history)', async () => {
            const mockResponse = {
                data: [
                    {
                        uuid: 'a7b8c9d0-e1f2-3456-1234-567890123456',
                        title: 'New File',
                        content: '# New File\n\nNo version history yet...',
                        filePath: 'new/file.md',
                        hash: '9a0b2c4d6e8f0a2b4c6d8e0f2a4b6c8d0e2f4a6b8c0d2e4f6a8b0c2d4e6f8a0',
                        lastModified: '2025-10-06T07:00:00Z',
                        ancestorHash: null,
                        fileType: 'markdown',
                        metadata: {}
                    }
                ],
                pagination: {
                    nextCursor: null,
                    hasMore: false
                }
            };

            nock(baseURL)
                .get('/api/spaces/my-space/nodes')
                .matchHeader('Authorization', `Bearer ${mockToken}`)
                .reply(200, mockResponse);

            const response = await spaceApi.listSpaceNodes('my-space');

            const node = response.data.data[0];
            expect(node.ancestorHash).toBeNull();
        });
    });

    describe('Performance & Memory Efficiency (NFR-004)', () => {
        it('should handle large space with 500 nodes per page', async () => {
            // Generate 500 mock nodes to simulate large space
            const mockNodes = Array.from({ length: 500 }, (_, i) => ({
                uuid: `${i.toString().padStart(8, '0')}-0000-0000-0000-000000000000`,
                title: `Node ${i}`,
                content: `# Node ${i}\n\nContent for node ${i}`,
                filePath: `nodes/node-${i}.md`,
                hash: `${i.toString().padStart(64, '0')}`,
                lastModified: '2025-10-05T06:00:00Z',
                ancestorHash: null,
                fileType: 'markdown' as const,
                metadata: {}
            }));

            const mockResponse = {
                data: mockNodes,
                pagination: {
                    nextCursor: 'eyJsYXN0SWQiOjUwMH0=',
                    hasMore: true
                }
            };

            nock(baseURL)
                .get('/api/spaces/large-space/nodes')
                .query({ limit: 500 })
                .matchHeader('Authorization', `Bearer ${mockToken}`)
                .reply(200, mockResponse);

            const response = await spaceApi.listSpaceNodes('large-space', undefined, 500);

            expect(response.data.data).toHaveLength(500);
            expect(response.data.pagination.hasMore).toBe(true);
        });
    });
});
