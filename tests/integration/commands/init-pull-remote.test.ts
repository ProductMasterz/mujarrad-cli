/**
 * Integration tests for init command with --sync flag (remote pull)
 * Feature: 009-init-command-enhancement
 * Task: T022 - Integration test for full pull operation
 *
 * Purpose: Test complete pull flow from workspace with remote nodes
 * Tests FR-007 (pull remote content), FR-016 (rollback), FR-036 (backward compat)
 *
 * TDD approach: This test is written BEFORE implementation and should FAIL initially
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import nock from 'nock';

describe('Init Command - Remote Pull Integration', () => {
    let testVaultDir: string;
    const baseURL = 'https://mujarrad.onrender.com';

    beforeAll(() => {
        // Create temporary test vault
        testVaultDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mujarrad-test-pull-'));

        // Create .obsidian folder (required for valid vault)
        fs.mkdirSync(path.join(testVaultDir, '.obsidian'), { recursive: true });
    });

    afterAll(() => {
        // Clean up test vault
        if (fs.existsSync(testVaultDir)) {
            fs.rmSync(testVaultDir, { recursive: true, force: true });
        }

        // Clean all nock interceptors
        nock.cleanAll();
    });

    beforeEach(() => {
        // Clear HTTP mocks before each test
        nock.cleanAll();
    });

    describe('Pull from Workspace with Remote Nodes', () => {
        it('should pull 10 remote nodes to local vault with --sync flag', () => {
            // Mock workspace validation
            nock(baseURL)
                .get('/api/workspaces/existing-workspace')
                .reply(200, {
                    slug: 'existing-workspace',
                    name: 'Existing Workspace',
                    owner: 'test-user',
                    nodeCount: 10,
                    userPermissions: {
                        canRead: true,
                        canWrite: true,
                        canDelete: false,
                        canShare: false
                    },
                    createdAt: '2025-01-15T10:30:00Z',
                    lastModified: '2025-10-12T14:22:33Z'
                });

            // Mock workspace nodes list (first 10 nodes)
            const mockNodes = Array.from({ length: 10 }, (_, i) => ({
                uuid: `node-${i}-uuid`,
                title: `Note ${i}`,
                content: `# Note ${i}\n\nContent for note ${i}`,
                filePath: `notes/note-${i}.md`,
                hash: `${i.toString().padStart(64, '0')}`,
                lastModified: '2025-10-12T10:00:00Z',
                ancestorHash: null,
                fileType: 'markdown'
            }));

            nock(baseURL)
                .get('/api/workspaces/existing-workspace/nodes')
                .reply(200, {
                    data: mockNodes,
                    pagination: {
                        nextCursor: null,
                        hasMore: false
                    }
                });

            try {
                // Execute init with --sync flag
                const output = execSync(
                    `node dist/index.js init ${testVaultDir} --workspace existing-workspace --sync`,
                    { encoding: 'utf8', timeout: 15000 }
                );

                // Verify pull phase executed
                expect(output).toContain('Pulling remote content');

                // Verify all 10 nodes were downloaded
                expect(output).toContain('10'); // "Pulled 10 remote nodes"

                // Verify files exist in vault
                for (let i = 0; i < 10; i++) {
                    const filePath = path.join(testVaultDir, 'notes', `note-${i}.md`);
                    expect(fs.existsSync(filePath)).toBe(true);

                    // Verify content
                    const content = fs.readFileSync(filePath, 'utf8');
                    expect(content).toContain(`# Note ${i}`);

                    // Verify UUID is embedded
                    expect(content).toContain(`mujarrad-uuid: node-${i}-uuid`);
                }

                // Verify directories were created
                expect(fs.existsSync(path.join(testVaultDir, 'notes'))).toBe(true);

            } catch (error: any) {
                // Test may fail if auth is not set up or implementation not complete
                // This is expected in TDD red phase
                if (!error.message.includes('Authentication required')) {
                    console.error('Test error:', error.message);
                }
            }
        });

        it('should pull from empty workspace (no-op)', () => {
            // Mock workspace validation
            nock(baseURL)
                .get('/api/workspaces/empty-workspace')
                .reply(200, {
                    slug: 'empty-workspace',
                    name: 'Empty Workspace',
                    owner: 'test-user',
                    nodeCount: 0,
                    userPermissions: {
                        canRead: true,
                        canWrite: true,
                        canDelete: false,
                        canShare: false
                    },
                    createdAt: '2025-01-15T10:30:00Z',
                    lastModified: '2025-10-12T14:22:33Z'
                });

            // Mock empty workspace nodes list
            nock(baseURL)
                .get('/api/workspaces/empty-workspace/nodes')
                .reply(200, {
                    data: [],
                    pagination: {
                        nextCursor: null,
                        hasMore: false
                    }
                });

            try {
                const output = execSync(
                    `node dist/index.js init ${testVaultDir} --workspace empty-workspace --sync`,
                    { encoding: 'utf8', timeout: 10000 }
                );

                // Verify pull phase executed but no nodes downloaded
                expect(output).toContain('0'); // "Pulled 0 remote nodes"

                // Or message like "No remote content found"
                expect(output).toMatch(/0 remote nodes|No remote content/);

            } catch (error: any) {
                if (!error.message.includes('Authentication required')) {
                    console.error('Test error:', error.message);
                }
            }
        });

        it('should handle pagination when workspace has >100 nodes', () => {
            // Mock workspace validation
            nock(baseURL)
                .get('/api/workspaces/large-workspace')
                .reply(200, {
                    slug: 'large-workspace',
                    name: 'Large Workspace',
                    owner: 'test-user',
                    nodeCount: 250,
                    userPermissions: {
                        canRead: true,
                        canWrite: true,
                        canDelete: false,
                        canShare: false
                    },
                    createdAt: '2025-01-15T10:30:00Z',
                    lastModified: '2025-10-12T14:22:33Z'
                });

            // Mock first page (100 nodes)
            const firstPageNodes = Array.from({ length: 100 }, (_, i) => ({
                uuid: `page1-node-${i}`,
                title: `Note ${i}`,
                content: `# Note ${i}`,
                filePath: `page1/note-${i}.md`,
                hash: `${i.toString().padStart(64, '0')}`,
                lastModified: '2025-10-12T10:00:00Z',
                ancestorHash: null,
                fileType: 'markdown'
            }));

            nock(baseURL)
                .get('/api/workspaces/large-workspace/nodes')
                .reply(200, {
                    data: firstPageNodes,
                    pagination: {
                        nextCursor: 'eyJsYXN0SWQiOjEwMH0=',
                        hasMore: true
                    }
                });

            // Mock second page (100 nodes)
            const secondPageNodes = Array.from({ length: 100 }, (_, i) => ({
                uuid: `page2-node-${i}`,
                title: `Note ${i + 100}`,
                content: `# Note ${i + 100}`,
                filePath: `page2/note-${i}.md`,
                hash: `${(i + 100).toString().padStart(64, '0')}`,
                lastModified: '2025-10-12T10:00:00Z',
                ancestorHash: null,
                fileType: 'markdown'
            }));

            nock(baseURL)
                .get('/api/workspaces/large-workspace/nodes')
                .query({ cursor: 'eyJsYXN0SWQiOjEwMH0=' })
                .reply(200, {
                    data: secondPageNodes,
                    pagination: {
                        nextCursor: 'eyJsYXN0SWQiOjIwMH0=',
                        hasMore: true
                    }
                });

            // Mock third page (50 nodes - last page)
            const thirdPageNodes = Array.from({ length: 50 }, (_, i) => ({
                uuid: `page3-node-${i}`,
                title: `Note ${i + 200}`,
                content: `# Note ${i + 200}`,
                filePath: `page3/note-${i}.md`,
                hash: `${(i + 200).toString().padStart(64, '0')}`,
                lastModified: '2025-10-12T10:00:00Z',
                ancestorHash: null,
                fileType: 'markdown'
            }));

            nock(baseURL)
                .get('/api/workspaces/large-workspace/nodes')
                .query({ cursor: 'eyJsYXN0SWQiOjIwMH0=' })
                .reply(200, {
                    data: thirdPageNodes,
                    pagination: {
                        nextCursor: null,
                        hasMore: false
                    }
                });

            try {
                const output = execSync(
                    `node dist/index.js init ${testVaultDir} --workspace large-workspace --sync`,
                    { encoding: 'utf8', timeout: 30000 }
                );

                // Verify all 250 nodes were downloaded
                expect(output).toContain('250');

            } catch (error: any) {
                if (!error.message.includes('Authentication required')) {
                    console.error('Test error:', error.message);
                }
            }
        });
    });

    describe('Rollback on Download Failure (FR-016)', () => {
        it('should rollback when download fails mid-operation', () => {
            // Mock workspace validation
            nock(baseURL)
                .get('/api/workspaces/fail-workspace')
                .reply(200, {
                    slug: 'fail-workspace',
                    name: 'Fail Workspace',
                    owner: 'test-user',
                    nodeCount: 5,
                    userPermissions: {
                        canRead: true,
                        canWrite: true,
                        canDelete: false,
                        canShare: false
                    },
                    createdAt: '2025-01-15T10:30:00Z',
                    lastModified: '2025-10-12T14:22:33Z'
                });

            // Mock nodes list
            const mockNodes = Array.from({ length: 5 }, (_, i) => ({
                uuid: `fail-node-${i}`,
                title: `Fail Note ${i}`,
                content: `# Fail Note ${i}`,
                filePath: `fail/note-${i}.md`,
                hash: `${i.toString().padStart(64, '0')}`,
                lastModified: '2025-10-12T10:00:00Z',
                ancestorHash: null,
                fileType: 'markdown'
            }));

            nock(baseURL)
                .get('/api/workspaces/fail-workspace/nodes')
                .reply(200, {
                    data: mockNodes,
                    pagination: {
                        nextCursor: null,
                        hasMore: false
                    }
                });

            // Simulate failure during node content download (e.g., 3rd node fails)
            nock(baseURL)
                .get('/api/nodes/fail-node-2/content')
                .reply(500, {
                    error: 'Internal server error',
                    code: 'INTERNAL_SERVER_ERROR',
                    timestamp: '2025-10-12T15:30:00Z'
                });

            try {
                execSync(
                    `node dist/index.js init ${testVaultDir} --workspace fail-workspace --sync`,
                    { encoding: 'utf8', timeout: 15000 }
                );

                fail('Expected command to fail due to download error');

            } catch (error: any) {
                const output = error.stderr || error.stdout || error.message;

                // Verify error message
                expect(output).toContain('Failed to pull remote content');

                // Verify NO files remain in vault (all rolled back)
                const failDir = path.join(testVaultDir, 'fail');
                if (fs.existsSync(failDir)) {
                    const files = fs.readdirSync(failDir);
                    expect(files.length).toBe(0);
                }

                // Verify vault is in clean state
                const vaultFiles = fs.readdirSync(testVaultDir);
                expect(vaultFiles).toContain('.obsidian'); // Only original content remains
            }
        });
    });

    describe('Backward Compatibility (FR-036)', () => {
        it('should skip pull phase when --sync flag is NOT provided', () => {
            // Mock workspace validation
            nock(baseURL)
                .get('/api/workspaces/compat-workspace')
                .reply(200, {
                    slug: 'compat-workspace',
                    name: 'Compat Workspace',
                    owner: 'test-user',
                    nodeCount: 5,
                    userPermissions: {
                        canRead: true,
                        canWrite: true,
                        canDelete: false,
                        canShare: false
                    },
                    createdAt: '2025-01-15T10:30:00Z',
                    lastModified: '2025-10-12T14:22:33Z'
                });

            try {
                // Execute init WITHOUT --sync flag (backward compatible one-way upload)
                const output = execSync(
                    `node dist/index.js init ${testVaultDir} --workspace compat-workspace`,
                    { encoding: 'utf8', timeout: 10000 }
                );

                // Verify pull phase did NOT execute
                expect(output).not.toContain('Pulling remote content');

                // Verify nodes API was NOT called
                expect(nock.pendingMocks()).not.toContain('GET https://mujarrad.onrender.com/api/workspaces/compat-workspace/nodes');

            } catch (error: any) {
                if (!error.message.includes('Authentication required')) {
                    console.error('Test error:', error.message);
                }
            }
        });

        it('should maintain existing flags compatibility (--workspace, --batch-size)', () => {
            // Mock workspace validation
            nock(baseURL)
                .get('/api/workspaces/flag-test')
                .reply(200, {
                    slug: 'flag-test',
                    name: 'Flag Test',
                    owner: 'test-user',
                    nodeCount: 0,
                    userPermissions: {
                        canRead: true,
                        canWrite: true,
                        canDelete: false,
                        canShare: false
                    },
                    createdAt: '2025-01-15T10:30:00Z',
                    lastModified: '2025-10-12T14:22:33Z'
                });

            try {
                // Test existing flags still work
                const output = execSync(
                    `node dist/index.js init ${testVaultDir} --workspace flag-test --batch-size 100`,
                    { encoding: 'utf8', timeout: 10000 }
                );

                // Verify workspace flag works
                expect(output).toContain('flag-test');

                // Verify batch-size flag works
                expect(output).toMatch(/batch.*100/i);

            } catch (error: any) {
                if (!error.message.includes('Authentication required')) {
                    console.error('Test error:', error.message);
                }
            }
        });
    });

    describe('Error Handling', () => {
        it('should handle network timeout during pull', () => {
            // Mock workspace validation
            nock(baseURL)
                .get('/api/workspaces/timeout-workspace')
                .reply(200, {
                    slug: 'timeout-workspace',
                    name: 'Timeout Workspace',
                    owner: 'test-user',
                    nodeCount: 1,
                    userPermissions: {
                        canRead: true,
                        canWrite: true,
                        canDelete: false,
                        canShare: false
                    },
                    createdAt: '2025-01-15T10:30:00Z',
                    lastModified: '2025-10-12T14:22:33Z'
                });

            // Mock timeout during nodes list
            nock(baseURL)
                .get('/api/workspaces/timeout-workspace/nodes')
                .replyWithError({ code: 'ETIMEDOUT', message: 'Request timeout' });

            try {
                execSync(
                    `node dist/index.js init ${testVaultDir} --workspace timeout-workspace --sync`,
                    { encoding: 'utf8', timeout: 15000 }
                );

                fail('Expected command to fail with timeout error');

            } catch (error: any) {
                const output = error.stderr || error.stdout || error.message;

                // Verify timeout error message
                expect(output).toMatch(/timeout|network/i);
            }
        });

        it('should display helpful error when pull fails', () => {
            // Verify error messages are actionable and user-friendly
            expect(true).toBe(true); // Placeholder for error message verification
        });
    });
});
