/**
 * Contract tests for GET /api/nodes/{uuid}/versions/compare
 * Feature: 009-init-command-enhancement
 * Task: T020 - Contract test for node version comparison
 *
 * Purpose: Verify API client integration with backend version comparison endpoint
 * Tests three-way merge ancestor detection (FR-008, FR-009, FR-010)
 *
 * TDD approach: This test is written BEFORE implementation and should FAIL initially
 */

import nock from 'nock';
import { SyncNodesApi, Configuration } from '../../src/api/generated/index.js';

describe('Contract: GET /api/nodes/{uuid}/versions/compare - Version Comparison', () => {
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

    describe('Version Comparison Status Types', () => {
        it('should return IDENTICAL status when hashes match', async () => {
            const nodeUuid = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
            const localHash = 'abc1234567890abcdef1234567890abcdef1234567890abcdef1234567890abc';

            const mockResponse = {
                nodeUuid,
                remoteHash: 'abc1234567890abcdef1234567890abcdef1234567890abcdef1234567890abc',
                localHash: 'abc1234567890abcdef1234567890abcdef1234567890abcdef1234567890abc',
                ancestorHash: 'abc1234567890abcdef1234567890abcdef1234567890abcdef1234567890abc',
                divergenceAnalysis: {
                    status: 'IDENTICAL',
                    localModified: false,
                    remoteModified: false,
                    explanation: 'Local and remote have identical content'
                }
            };

            nock(baseURL)
                .get(`/api/nodes/${nodeUuid}/versions/compare`)
                .query({ localHash })
                .matchHeader('Authorization', `Bearer ${mockToken}`)
                .reply(200, mockResponse);

            const response = await nodesApi.compareNodeVersions(nodeUuid, localHash);

            expect(response.data.divergenceAnalysis.status).toBe('IDENTICAL');
            expect(response.data.divergenceAnalysis.localModified).toBe(false);
            expect(response.data.divergenceAnalysis.remoteModified).toBe(false);
            expect(response.data.remoteHash).toBe(response.data.localHash);
        });

        it('should return LOCAL_AHEAD when local modified, remote unchanged', async () => {
            const nodeUuid = 'b2c3d4e5-f6a7-8901-bcde-f12345678901';
            const localHash = 'abc123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
            const remoteHash = '789abcdef0123456789abcdef0123456789abcdef0123456789abcdef012345';
            const ancestorHash = '789abcdef0123456789abcdef0123456789abcdef0123456789abcdef012345';

            const mockResponse = {
                nodeUuid,
                remoteHash,
                localHash,
                ancestorHash,
                divergenceAnalysis: {
                    status: 'LOCAL_AHEAD',
                    localModified: true,
                    remoteModified: false,
                    explanation: 'Local version has new edits, remote unchanged from common ancestor'
                }
            };

            nock(baseURL)
                .get(`/api/nodes/${nodeUuid}/versions/compare`)
                .query({ localHash })
                .matchHeader('Authorization', `Bearer ${mockToken}`)
                .reply(200, mockResponse);

            const response = await nodesApi.compareNodeVersions(nodeUuid, localHash);

            expect(response.data.divergenceAnalysis.status).toBe('LOCAL_AHEAD');
            expect(response.data.divergenceAnalysis.localModified).toBe(true);
            expect(response.data.divergenceAnalysis.remoteModified).toBe(false);
            expect(response.data.remoteHash).toBe(response.data.ancestorHash);
            expect(response.data.localHash).not.toBe(response.data.ancestorHash);
        });

        it('should return REMOTE_AHEAD when remote modified, local unchanged', async () => {
            const nodeUuid = 'c3d4e5f6-a7b8-9012-cdef-123456789012';
            const localHash = '789abcdef0123456789abcdef0123456789abcdef0123456789abcdef012345';
            const remoteHash = 'def456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
            const ancestorHash = '789abcdef0123456789abcdef0123456789abcdef0123456789abcdef012345';

            const mockResponse = {
                nodeUuid,
                remoteHash,
                localHash,
                ancestorHash,
                divergenceAnalysis: {
                    status: 'REMOTE_AHEAD',
                    localModified: false,
                    remoteModified: true,
                    explanation: 'Remote version has new edits, local unchanged from common ancestor'
                }
            };

            nock(baseURL)
                .get(`/api/nodes/${nodeUuid}/versions/compare`)
                .query({ localHash })
                .matchHeader('Authorization', `Bearer ${mockToken}`)
                .reply(200, mockResponse);

            const response = await nodesApi.compareNodeVersions(nodeUuid, localHash);

            expect(response.data.divergenceAnalysis.status).toBe('REMOTE_AHEAD');
            expect(response.data.divergenceAnalysis.localModified).toBe(false);
            expect(response.data.divergenceAnalysis.remoteModified).toBe(true);
            expect(response.data.localHash).toBe(response.data.ancestorHash);
            expect(response.data.remoteHash).not.toBe(response.data.ancestorHash);
        });

        it('should return CONFLICTED when both local and remote modified', async () => {
            const nodeUuid = 'd4e5f6a7-b8c9-0123-def1-234567890123';
            const localHash = 'abc123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
            const remoteHash = 'def456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
            const ancestorHash = '789xyz9876543210fedcba9876543210fedcba9876543210fedcba9876543210';

            const mockResponse = {
                nodeUuid,
                remoteHash,
                localHash,
                ancestorHash,
                divergenceAnalysis: {
                    status: 'CONFLICTED',
                    localModified: true,
                    remoteModified: true,
                    explanation: 'Both local and remote have diverged from common ancestor'
                }
            };

            nock(baseURL)
                .get(`/api/nodes/${nodeUuid}/versions/compare`)
                .query({ localHash })
                .matchHeader('Authorization', `Bearer ${mockToken}`)
                .reply(200, mockResponse);

            const response = await nodesApi.compareNodeVersions(nodeUuid, localHash);

            expect(response.data.divergenceAnalysis.status).toBe('CONFLICTED');
            expect(response.data.divergenceAnalysis.localModified).toBe(true);
            expect(response.data.divergenceAnalysis.remoteModified).toBe(true);
            expect(response.data.localHash).not.toBe(response.data.ancestorHash);
            expect(response.data.remoteHash).not.toBe(response.data.ancestorHash);
            expect(response.data.localHash).not.toBe(response.data.remoteHash);
        });

        it('should return CONFLICTED with null ancestorHash (no common ancestor)', async () => {
            const nodeUuid = 'e5f6a7b8-c9d0-1234-ef12-345678901234';
            const localHash = 'abc123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
            const remoteHash = 'def456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

            const mockResponse = {
                nodeUuid,
                remoteHash,
                localHash,
                ancestorHash: null,
                divergenceAnalysis: {
                    status: 'CONFLICTED',
                    localModified: true,
                    remoteModified: true,
                    explanation: 'No common ancestor found - files created independently'
                }
            };

            nock(baseURL)
                .get(`/api/nodes/${nodeUuid}/versions/compare`)
                .query({ localHash })
                .matchHeader('Authorization', `Bearer ${mockToken}`)
                .reply(200, mockResponse);

            const response = await nodesApi.compareNodeVersions(nodeUuid, localHash);

            expect(response.data.divergenceAnalysis.status).toBe('CONFLICTED');
            expect(response.data.ancestorHash).toBeNull();
            expect(response.data.localHash).not.toBe(response.data.remoteHash);
        });
    });

    describe('Hash Format Validation', () => {
        it('should accept valid 64-character lowercase hex hash', async () => {
            const nodeUuid = 'f6a7b8c9-d0e1-2345-f123-456789012345';
            const validHash = '1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2';

            const mockResponse = {
                nodeUuid,
                remoteHash: validHash,
                localHash: validHash,
                ancestorHash: validHash,
                divergenceAnalysis: {
                    status: 'IDENTICAL',
                    localModified: false,
                    remoteModified: false,
                    explanation: 'Local and remote have identical content'
                }
            };

            nock(baseURL)
                .get(`/api/nodes/${nodeUuid}/versions/compare`)
                .query({ localHash: validHash })
                .matchHeader('Authorization', `Bearer ${mockToken}`)
                .reply(200, mockResponse);

            const response = await nodesApi.compareNodeVersions(nodeUuid, validHash);

            // Verify hash format matches pattern ^[a-f0-9]{64}$
            expect(response.data.localHash).toMatch(/^[a-f0-9]{64}$/);
            expect(response.data.remoteHash).toMatch(/^[a-f0-9]{64}$/);
            expect(response.data.ancestorHash).toMatch(/^[a-f0-9]{64}$/);
        });

        it('should handle ancestorHash as null', async () => {
            const nodeUuid = 'a7b8c9d0-e1f2-3456-1234-567890123456';
            const localHash = '2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b';

            const mockResponse = {
                nodeUuid,
                remoteHash: '3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3',
                localHash,
                ancestorHash: null,
                divergenceAnalysis: {
                    status: 'CONFLICTED',
                    localModified: true,
                    remoteModified: true,
                    explanation: 'No common ancestor found'
                }
            };

            nock(baseURL)
                .get(`/api/nodes/${nodeUuid}/versions/compare`)
                .query({ localHash })
                .matchHeader('Authorization', `Bearer ${mockToken}`)
                .reply(200, mockResponse);

            const response = await nodesApi.compareNodeVersions(nodeUuid, localHash);

            expect(response.data.ancestorHash).toBeNull();
        });
    });

    describe('Error Responses', () => {
        it('should handle 404 node not found', async () => {
            const nodeUuid = 'nonexistent-uuid-1234-5678-abcdefghijkl';
            const localHash = '4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4';

            nock(baseURL)
                .get(`/api/nodes/${nodeUuid}/versions/compare`)
                .query({ localHash })
                .matchHeader('Authorization', `Bearer ${mockToken}`)
                .reply(404, {
                    error: 'Node not found or user has no access',
                    code: 'NODE_NOT_FOUND',
                    timestamp: '2025-10-12T15:30:00Z'
                });

            await expect(nodesApi.compareNodeVersions(nodeUuid, localHash)).rejects.toThrow();
        });

        it('should handle 403 forbidden (no access to node)', async () => {
            const nodeUuid = 'b8c9d0e1-f2a3-4567-2345-678901234567';
            const localHash = '5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5';

            nock(baseURL)
                .get(`/api/nodes/${nodeUuid}/versions/compare`)
                .query({ localHash })
                .matchHeader('Authorization', `Bearer ${mockToken}`)
                .reply(403, {
                    error: 'You do not have access to this node',
                    code: 'FORBIDDEN',
                    timestamp: '2025-10-12T15:30:00Z'
                });

            await expect(nodesApi.compareNodeVersions(nodeUuid, localHash)).rejects.toThrow();
        });

        it('should handle 401 unauthorized (invalid/expired token)', async () => {
            const nodeUuid = 'c9d0e1f2-a3b4-5678-3456-789012345678';
            const localHash = '6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6';

            nock(baseURL)
                .get(`/api/nodes/${nodeUuid}/versions/compare`)
                .query({ localHash })
                .matchHeader('Authorization', `Bearer ${mockToken}`)
                .reply(401, {
                    error: "Authentication required. Please log in with 'mujarrad auth login'",
                    code: 'UNAUTHORIZED',
                    timestamp: '2025-10-12T15:30:00Z'
                });

            await expect(nodesApi.compareNodeVersions(nodeUuid, localHash)).rejects.toThrow();
        });

        it('should handle 500 internal server error', async () => {
            const nodeUuid = 'd0e1f2a3-b4c5-6789-4567-890123456789';
            const localHash = '7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7';

            nock(baseURL)
                .get(`/api/nodes/${nodeUuid}/versions/compare`)
                .query({ localHash })
                .matchHeader('Authorization', `Bearer ${mockToken}`)
                .reply(500, {
                    error: 'An unexpected error occurred. Please try again later.',
                    code: 'INTERNAL_SERVER_ERROR',
                    timestamp: '2025-10-12T15:30:00Z'
                });

            await expect(nodesApi.compareNodeVersions(nodeUuid, localHash)).rejects.toThrow();
        });
    });

    describe('Authorization Header', () => {
        it('should include Bearer token in Authorization header', async () => {
            const nodeUuid = 'e1f2a3b4-c5d6-7890-5678-901234567890';
            const localHash = '8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8';

            const mockResponse = {
                nodeUuid,
                remoteHash: localHash,
                localHash,
                ancestorHash: localHash,
                divergenceAnalysis: {
                    status: 'IDENTICAL',
                    localModified: false,
                    remoteModified: false,
                    explanation: 'Identical'
                }
            };

            nock(baseURL)
                .get(`/api/nodes/${nodeUuid}/versions/compare`)
                .query({ localHash })
                .matchHeader('Authorization', `Bearer ${mockToken}`)
                .reply(200, mockResponse);

            const response = await nodesApi.compareNodeVersions(nodeUuid, localHash);

            expect(response.data.nodeUuid).toBe(nodeUuid);
        });

        it('should fail without Authorization header', async () => {
            const nodeUuid = 'f2a3b4c5-d6e7-8901-6789-012345678901';
            const localHash = '9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9';

            // Create API instance without token
            const unauthConfig = new Configuration({
                basePath: baseURL
            });
            const unauthNodesApi = new SyncNodesApi(unauthConfig);

            nock(baseURL)
                .get(`/api/nodes/${nodeUuid}/versions/compare`)
                .query({ localHash })
                .reply(401, {
                    error: 'Missing authentication token',
                    code: 'UNAUTHORIZED',
                    timestamp: '2025-10-12T15:30:00Z'
                });

            await expect(unauthNodesApi.compareNodeVersions(nodeUuid, localHash)).rejects.toThrow();
        });
    });

    describe('Response Schema Validation', () => {
        it('should validate VersionComparisonResponse schema structure', async () => {
            const nodeUuid = 'a3b4c5d6-e7f8-9012-7890-123456789012';
            const localHash = '0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0';

            const mockResponse = {
                nodeUuid,
                remoteHash: '1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1',
                localHash,
                ancestorHash: '2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2',
                divergenceAnalysis: {
                    status: 'LOCAL_AHEAD',
                    localModified: true,
                    remoteModified: false,
                    explanation: 'Local version has new edits'
                }
            };

            nock(baseURL)
                .get(`/api/nodes/${nodeUuid}/versions/compare`)
                .query({ localHash })
                .matchHeader('Authorization', `Bearer ${mockToken}`)
                .reply(200, mockResponse);

            const response = await nodesApi.compareNodeVersions(nodeUuid, localHash);

            // Validate required fields
            expect(response.data).toHaveProperty('nodeUuid');
            expect(response.data).toHaveProperty('remoteHash');
            expect(response.data).toHaveProperty('localHash');
            expect(response.data).toHaveProperty('ancestorHash');
            expect(response.data).toHaveProperty('divergenceAnalysis');

            // Validate divergenceAnalysis structure
            expect(response.data.divergenceAnalysis).toHaveProperty('status');
            expect(response.data.divergenceAnalysis).toHaveProperty('localModified');
            expect(response.data.divergenceAnalysis).toHaveProperty('remoteModified');
            expect(response.data.divergenceAnalysis).toHaveProperty('explanation');

            // Validate status enum values
            expect(['IDENTICAL', 'LOCAL_AHEAD', 'REMOTE_AHEAD', 'CONFLICTED']).toContain(
                response.data.divergenceAnalysis.status
            );

            // Validate boolean types
            expect(typeof response.data.divergenceAnalysis.localModified).toBe('boolean');
            expect(typeof response.data.divergenceAnalysis.remoteModified).toBe('boolean');

            // Validate string types
            expect(typeof response.data.divergenceAnalysis.explanation).toBe('string');
        });

        it('should validate all status enum values are accepted', async () => {
            const statuses = ['IDENTICAL', 'LOCAL_AHEAD', 'REMOTE_AHEAD', 'CONFLICTED'];

            for (const status of statuses) {
                const nodeUuid = `b4c5d6e7-f8a9-0123-8901-23456789${statuses.indexOf(status).toString().padStart(4, '0')}`;
                const localHash = `${statuses.indexOf(status).toString().padStart(64, '0')}`;

                const mockResponse = {
                    nodeUuid,
                    remoteHash: localHash,
                    localHash,
                    ancestorHash: localHash,
                    divergenceAnalysis: {
                        status,
                        localModified: status !== 'IDENTICAL',
                        remoteModified: status === 'REMOTE_AHEAD' || status === 'CONFLICTED',
                        explanation: `Testing ${status} status`
                    }
                };

                nock(baseURL)
                    .get(`/api/nodes/${nodeUuid}/versions/compare`)
                    .query({ localHash })
                    .matchHeader('Authorization', `Bearer ${mockToken}`)
                    .reply(200, mockResponse);

                const response = await nodesApi.compareNodeVersions(nodeUuid, localHash);

                expect(response.data.divergenceAnalysis.status).toBe(status);
            }
        });
    });

    describe('Query Parameter Handling', () => {
        it('should send localHash as query parameter', async () => {
            const nodeUuid = 'c5d6e7f8-a9b0-1234-9012-345678901234';
            const localHash = '3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3';

            const mockResponse = {
                nodeUuid,
                remoteHash: localHash,
                localHash,
                ancestorHash: localHash,
                divergenceAnalysis: {
                    status: 'IDENTICAL',
                    localModified: false,
                    remoteModified: false,
                    explanation: 'Identical'
                }
            };

            // Verify query parameter is sent correctly
            nock(baseURL)
                .get(`/api/nodes/${nodeUuid}/versions/compare`)
                .query({ localHash })
                .matchHeader('Authorization', `Bearer ${mockToken}`)
                .reply(200, mockResponse);

            const response = await nodesApi.compareNodeVersions(nodeUuid, localHash);

            expect(response.data.localHash).toBe(localHash);
        });
    });
});
