/**
 * Contract tests for GET /api/nodes/{uuid}/content
 * Feature: 009-init-command-enhancement
 * Task: T019 - Contract test for node content download
 *
 * Purpose: Verify API client integration with backend node content endpoint
 * Tests content download for markdown and canvas files during remote pull phase
 *
 * TDD approach: This test is written BEFORE implementation and should FAIL initially
 */

import nock from 'nock';
import { SyncNodesApi, Configuration } from '../../src/api/generated/index.js';

describe('Contract: GET /api/nodes/{uuid}/content - Node Content Download', () => {
    let nodesApi: SyncNodesApi;
    const baseURL = 'https://mujarrad.onrender.com';
    const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.token';

    beforeAll(() => {
        const config = new Configuration({
            basePath: baseURL,
            accessToken: mockToken
        });
        nodesApi = new SyncNodesApi(config);
    });

    afterEach(() => {
        nock.cleanAll();
    });

    describe('Markdown Content Download', () => {
        it('should download markdown content with text/markdown content-type', async () => {
            const mockContent = `# Meeting Notes

Discussed project roadmap for Q4 2025.

## Action Items
- Review design mockups
- Schedule follow-up meeting`;

            const nodeUuid = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

            nock(baseURL)
                .get(`/api/nodes/${nodeUuid}/content`)
                .matchHeader('Authorization', `Bearer ${mockToken}`)
                .reply(200, mockContent, {
                    'Content-Type': 'text/markdown; charset=utf-8'
                });

            const response = await nodesApi.downloadNodeContent(nodeUuid);

            expect(response.data).toBe(mockContent);
            expect(response.headers['content-type']).toContain('text/markdown');
        });

        it('should download markdown with frontmatter', async () => {
            const mockContent = `---
title: Important Meeting
date: 2025-10-12
tags: [meeting, roadmap]
author: Alice
---

# Important Meeting

Meeting content here...`;

            const nodeUuid = 'b2c3d4e5-f6a7-8901-bcde-f12345678901';

            nock(baseURL)
                .get(`/api/nodes/${nodeUuid}/content`)
                .matchHeader('Authorization', `Bearer ${mockToken}`)
                .reply(200, mockContent, {
                    'Content-Type': 'text/markdown'
                });

            const response = await nodesApi.downloadNodeContent(nodeUuid);

            expect(response.data).toContain('---');
            expect(response.data).toContain('title: Important Meeting');
            expect(response.data).toContain('# Important Meeting');
        });

        it('should download empty markdown file', async () => {
            const mockContent = '';

            const nodeUuid = 'c3d4e5f6-a7b8-9012-cdef-123456789012';

            nock(baseURL)
                .get(`/api/nodes/${nodeUuid}/content`)
                .matchHeader('Authorization', `Bearer ${mockToken}`)
                .reply(200, mockContent, {
                    'Content-Type': 'text/markdown'
                });

            const response = await nodesApi.downloadNodeContent(nodeUuid);

            expect(response.data).toBe('');
        });
    });

    describe('Canvas Content Download', () => {
        it('should download canvas JSON with application/json content-type', async () => {
            const mockCanvasContent = {
                nodes: [
                    {
                        id: 'node1',
                        type: 'text',
                        text: 'Sample canvas node',
                        x: 0,
                        y: 0,
                        width: 250,
                        height: 100
                    },
                    {
                        id: 'node2',
                        type: 'text',
                        text: 'Another node',
                        x: 300,
                        y: 0,
                        width: 250,
                        height: 100
                    }
                ],
                edges: [
                    {
                        id: 'edge1',
                        fromNode: 'node1',
                        toNode: 'node2'
                    }
                ]
            };

            const nodeUuid = 'd4e5f6a7-b8c9-0123-def1-234567890123';

            nock(baseURL)
                .get(`/api/nodes/${nodeUuid}/content`)
                .matchHeader('Authorization', `Bearer ${mockToken}`)
                .reply(200, mockCanvasContent, {
                    'Content-Type': 'application/json; charset=utf-8'
                });

            const response = await nodesApi.downloadNodeContent(nodeUuid);

            // Response should be JSON object
            expect(response.data).toHaveProperty('nodes');
            expect(response.data).toHaveProperty('edges');
            expect(response.data.nodes).toHaveLength(2);
            expect(response.data.edges).toHaveLength(1);
            expect(response.headers['content-type']).toContain('application/json');
        });

        it('should download empty canvas (no nodes or edges)', async () => {
            const mockCanvasContent = {
                nodes: [],
                edges: []
            };

            const nodeUuid = 'e5f6a7b8-c9d0-1234-ef12-345678901234';

            nock(baseURL)
                .get(`/api/nodes/${nodeUuid}/content`)
                .matchHeader('Authorization', `Bearer ${mockToken}`)
                .reply(200, mockCanvasContent, {
                    'Content-Type': 'application/json'
                });

            const response = await nodesApi.downloadNodeContent(nodeUuid);

            expect(response.data.nodes).toHaveLength(0);
            expect(response.data.edges).toHaveLength(0);
        });

        it('should download complex canvas with multiple node types', async () => {
            const mockCanvasContent = {
                nodes: [
                    {
                        id: 'text-node',
                        type: 'text',
                        text: 'Text node',
                        x: 0,
                        y: 0,
                        width: 250,
                        height: 100
                    },
                    {
                        id: 'file-node',
                        type: 'file',
                        file: 'path/to/file.md',
                        x: 300,
                        y: 0,
                        width: 250,
                        height: 100
                    },
                    {
                        id: 'link-node',
                        type: 'link',
                        url: 'https://example.com',
                        x: 600,
                        y: 0,
                        width: 250,
                        height: 100
                    },
                    {
                        id: 'group-node',
                        type: 'group',
                        label: 'Group 1',
                        x: 0,
                        y: 200,
                        width: 500,
                        height: 300
                    }
                ],
                edges: [
                    {
                        id: 'edge1',
                        fromNode: 'text-node',
                        toNode: 'file-node'
                    },
                    {
                        id: 'edge2',
                        fromNode: 'file-node',
                        toNode: 'link-node'
                    }
                ]
            };

            const nodeUuid = 'f6a7b8c9-d0e1-2345-f123-456789012345';

            nock(baseURL)
                .get(`/api/nodes/${nodeUuid}/content`)
                .matchHeader('Authorization', `Bearer ${mockToken}`)
                .reply(200, mockCanvasContent, {
                    'Content-Type': 'application/json'
                });

            const response = await nodesApi.downloadNodeContent(nodeUuid);

            expect(response.data.nodes).toHaveLength(4);
            expect(response.data.edges).toHaveLength(2);

            // Verify different node types
            const nodeTypes = response.data.nodes.map((n: any) => n.type);
            expect(nodeTypes).toContain('text');
            expect(nodeTypes).toContain('file');
            expect(nodeTypes).toContain('link');
            expect(nodeTypes).toContain('group');
        });
    });

    describe('Error Responses', () => {
        it('should handle 404 node not found', async () => {
            const nodeUuid = 'nonexistent-uuid-1234-5678-abcdefghijkl';

            nock(baseURL)
                .get(`/api/nodes/${nodeUuid}/content`)
                .matchHeader('Authorization', `Bearer ${mockToken}`)
                .reply(404, {
                    error: 'Node not found',
                    code: 'NODE_NOT_FOUND',
                    timestamp: '2025-10-12T15:30:00Z'
                });

            await expect(nodesApi.downloadNodeContent(nodeUuid)).rejects.toThrow();
        });

        it('should handle 403 forbidden (no access to node)', async () => {
            const nodeUuid = 'a7b8c9d0-e1f2-3456-1234-567890123456';

            nock(baseURL)
                .get(`/api/nodes/${nodeUuid}/content`)
                .matchHeader('Authorization', `Bearer ${mockToken}`)
                .reply(403, {
                    error: 'You do not have read access to this node',
                    code: 'FORBIDDEN',
                    timestamp: '2025-10-12T15:30:00Z'
                });

            await expect(nodesApi.downloadNodeContent(nodeUuid)).rejects.toThrow();
        });

        it('should handle 401 unauthorized (invalid/expired token)', async () => {
            const nodeUuid = 'b8c9d0e1-f2a3-4567-2345-678901234567';

            nock(baseURL)
                .get(`/api/nodes/${nodeUuid}/content`)
                .matchHeader('Authorization', `Bearer ${mockToken}`)
                .reply(401, {
                    error: "Authentication required. Please log in with 'mujarrad auth login'",
                    code: 'UNAUTHORIZED',
                    timestamp: '2025-10-12T15:30:00Z'
                });

            await expect(nodesApi.downloadNodeContent(nodeUuid)).rejects.toThrow();
        });

        it('should handle 500 internal server error', async () => {
            const nodeUuid = 'c9d0e1f2-a3b4-5678-3456-789012345678';

            nock(baseURL)
                .get(`/api/nodes/${nodeUuid}/content`)
                .matchHeader('Authorization', `Bearer ${mockToken}`)
                .reply(500, {
                    error: 'An unexpected error occurred. Please try again later.',
                    code: 'INTERNAL_SERVER_ERROR',
                    timestamp: '2025-10-12T15:30:00Z'
                });

            await expect(nodesApi.downloadNodeContent(nodeUuid)).rejects.toThrow();
        });
    });

    describe('Authorization Header', () => {
        it('should include Bearer token in Authorization header', async () => {
            const mockContent = '# Test Content';
            const nodeUuid = 'd0e1f2a3-b4c5-6789-4567-890123456789';

            nock(baseURL)
                .get(`/api/nodes/${nodeUuid}/content`)
                .matchHeader('Authorization', `Bearer ${mockToken}`)
                .reply(200, mockContent, {
                    'Content-Type': 'text/markdown'
                });

            const response = await nodesApi.downloadNodeContent(nodeUuid);

            expect(response.data).toBe(mockContent);
        });

        it('should fail without Authorization header', async () => {
            const nodeUuid = 'e1f2a3b4-c5d6-7890-5678-901234567890';

            // Create API instance without token
            const unauthConfig = new Configuration({
                basePath: baseURL
            });
            const unauthNodesApi = new SyncNodesApi(unauthConfig);

            nock(baseURL)
                .get(`/api/nodes/${nodeUuid}/content`)
                .reply(401, {
                    error: 'Missing authentication token',
                    code: 'UNAUTHORIZED',
                    timestamp: '2025-10-12T15:30:00Z'
                });

            await expect(unauthNodesApi.downloadNodeContent(nodeUuid)).rejects.toThrow();
        });
    });

    describe('Large Content Handling', () => {
        it('should handle large markdown files (>1MB)', async () => {
            // Generate large content (approximately 1.5MB)
            const largeContent = '# Large File\n\n' + 'A'.repeat(1500000);
            const nodeUuid = 'f2a3b4c5-d6e7-8901-6789-012345678901';

            nock(baseURL)
                .get(`/api/nodes/${nodeUuid}/content`)
                .matchHeader('Authorization', `Bearer ${mockToken}`)
                .reply(200, largeContent, {
                    'Content-Type': 'text/markdown'
                });

            const response = await nodesApi.downloadNodeContent(nodeUuid);

            expect(response.data.length).toBeGreaterThan(1000000);
            expect(response.data).toContain('# Large File');
        });

        it('should handle large canvas JSON (>1MB)', async () => {
            // Generate large canvas with many nodes
            const nodes = Array.from({ length: 1000 }, (_, i) => ({
                id: `node-${i}`,
                type: 'text',
                text: `Node ${i} with some content to increase size`,
                x: i * 100,
                y: Math.floor(i / 10) * 100,
                width: 250,
                height: 100
            }));

            const edges = Array.from({ length: 999 }, (_, i) => ({
                id: `edge-${i}`,
                fromNode: `node-${i}`,
                toNode: `node-${i + 1}`
            }));

            const largeCanvas = { nodes, edges };
            const nodeUuid = 'a3b4c5d6-e7f8-9012-7890-123456789012';

            nock(baseURL)
                .get(`/api/nodes/${nodeUuid}/content`)
                .matchHeader('Authorization', `Bearer ${mockToken}`)
                .reply(200, largeCanvas, {
                    'Content-Type': 'application/json'
                });

            const response = await nodesApi.downloadNodeContent(nodeUuid);

            expect(response.data.nodes).toHaveLength(1000);
            expect(response.data.edges).toHaveLength(999);
        });
    });

    describe('Special Characters and Encoding', () => {
        it('should handle markdown with special characters and Unicode', async () => {
            const mockContent = `# Test with Special Characters

Unicode: 你好世界 🌍 Привет мир

Special chars: ∑ ∫ ∂ ∇ √ ≈ ≠ ≤ ≥

Code block with special chars:
\`\`\`
const regex = /[a-zA-Z0-9@#$%^&*()]/;
\`\`\`

Emoji: 🎉 🚀 ✨ 🔥 💡`;

            const nodeUuid = 'b4c5d6e7-f8a9-0123-8901-234567890123';

            nock(baseURL)
                .get(`/api/nodes/${nodeUuid}/content`)
                .matchHeader('Authorization', `Bearer ${mockToken}`)
                .reply(200, mockContent, {
                    'Content-Type': 'text/markdown; charset=utf-8'
                });

            const response = await nodesApi.downloadNodeContent(nodeUuid);

            expect(response.data).toContain('你好世界');
            expect(response.data).toContain('🌍');
            expect(response.data).toContain('∑ ∫ ∂');
            expect(response.data).toContain('🎉 🚀 ✨');
        });

        it('should handle canvas with special characters in node text', async () => {
            const mockCanvas = {
                nodes: [
                    {
                        id: 'node1',
                        type: 'text',
                        text: '特殊文字 Special chars: @#$%^&*()',
                        x: 0,
                        y: 0,
                        width: 250,
                        height: 100
                    }
                ],
                edges: []
            };

            const nodeUuid = 'c5d6e7f8-a9b0-1234-9012-345678901234';

            nock(baseURL)
                .get(`/api/nodes/${nodeUuid}/content`)
                .matchHeader('Authorization', `Bearer ${mockToken}`)
                .reply(200, mockCanvas, {
                    'Content-Type': 'application/json; charset=utf-8'
                });

            const response = await nodesApi.downloadNodeContent(nodeUuid);

            expect(response.data.nodes[0].text).toContain('特殊文字');
            expect(response.data.nodes[0].text).toContain('@#$%^&*()');
        });
    });
});
