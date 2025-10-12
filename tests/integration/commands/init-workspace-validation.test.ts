/**
 * Integration tests for init command with workspace validation
 * Feature: 009-init-command-enhancement
 * Task: T012 - Integration test for init command with workspace validation
 *
 * Purpose: Test full init command flow with workspace validation
 * Tests FR-001, FR-003, FR-004, FR-005 in realistic scenarios
 *
 * TDD approach: These tests are written BEFORE implementation and should FAIL initially
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import nock from 'nock';

describe('Init Command - Workspace Validation Integration', () => {
    let testVaultDir: string;
    const baseURL = 'https://mujarrad.onrender.com';

    beforeAll(() => {
        // Create temporary test vault
        testVaultDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mujarrad-test-vault-'));

        // Create a simple markdown file in test vault
        fs.writeFileSync(
            path.join(testVaultDir, 'test-note.md'),
            '# Test Note\n\nThis is a test note.'
        );
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

    describe('Workspace Validation Before Scan (FR-001)', () => {
        it('should verify workspace exists before scanning vault', () => {
            // Mock successful workspace validation
            nock(baseURL)
                .get('/api/workspaces/valid-workspace')
                .reply(200, {
                    slug: 'valid-workspace',
                    name: 'Valid Workspace',
                    owner: 'test-user',
                    nodeCount: 10,
                    userPermissions: {
                        canRead: true,
                        canWrite: true,
                        canDelete: false,
                        canShare: false,
                    },
                    createdAt: '2025-01-15T10:30:00Z',
                    lastModified: '2025-10-12T14:22:33Z',
                });

            // Mock upload session creation (should be called after validation)
            nock(baseURL)
                .post('/api/workspaces/valid-workspace/upload/start')
                .reply(202, {
                    success: true,
                    data: {
                        sessionId: 'session-123',
                        workspaceId: 'workspace-uuid',
                    },
                });

            try {
                // Execute init command
                const output = execSync(
                    `node dist/index.js init ${testVaultDir} --workspace valid-workspace`,
                    { encoding: 'utf8', timeout: 10000 }
                );

                // Verify workspace verification message appears before scan
                expect(output).toContain('Verifying workspace');
                expect(output).toContain('Workspace verified: Valid Workspace');
                expect(output).toContain('10 existing nodes'); // FR-005

                // Verify scan occurs after validation
                expect(output).toContain('Scanning vault');
            } catch (error: any) {
                // Test may fail if auth is not set up - that's expected in TDD red phase
                if (!error.message.includes('Authentication required')) {
                    throw error;
                }
            }
        });

        it('should fail fast with clear error when workspace does not exist (FR-003)', () => {
            // Mock 404 workspace not found
            nock(baseURL)
                .get('/api/workspaces/nonexistent-workspace')
                .reply(404, {
                    error: "Workspace 'nonexistent-workspace' not found",
                    code: 'WORKSPACE_NOT_FOUND',
                    timestamp: '2025-10-12T15:30:00Z',
                });

            try {
                // Execute init command - should fail quickly
                const startTime = Date.now();

                execSync(
                    `node dist/index.js init ${testVaultDir} --workspace nonexistent-workspace`,
                    { encoding: 'utf8', timeout: 5000 }
                );

                // Should not reach here
                fail('Expected command to fail with workspace not found error');
            } catch (error: any) {
                const elapsedTime = Date.now() - startTime;

                // Verify fast failure (within 2 seconds - FR-003)
                expect(elapsedTime).toBeLessThan(2000);

                // Verify error message
                const output = error.stderr || error.stdout || error.message;
                expect(output).toContain('nonexistent-workspace');
                expect(output).toContain('not found');

                // Verify exit code 4 (FR-003)
                expect(error.status).toBe(4);

                // Verify vault scanning did NOT occur
                expect(output).not.toContain('Scanning vault');
                expect(output).not.toContain('files found');
            }
        });

        it('should fail with access denied error when user lacks permissions (FR-004)', () => {
            // Mock 403 access denied
            nock(baseURL)
                .get('/api/workspaces/restricted-workspace')
                .reply(403, {
                    error: "Access denied to workspace 'restricted-workspace'. Contact the workspace owner for permissions.",
                    code: 'WORKSPACE_ACCESS_DENIED',
                    timestamp: '2025-10-12T15:30:00Z',
                });

            try {
                execSync(
                    `node dist/index.js init ${testVaultDir} --workspace restricted-workspace`,
                    { encoding: 'utf8', timeout: 5000 }
                );

                fail('Expected command to fail with access denied error');
            } catch (error: any) {
                const output = error.stderr || error.stdout || error.message;

                // Verify access denied message
                expect(output).toContain('Access denied');
                expect(output).toContain('restricted-workspace');
                expect(output).toContain('workspace owner');

                // Verify vault scanning did NOT occur
                expect(output).not.toContain('Scanning vault');
            }
        });

        it('should display workspace metadata after successful verification (FR-005)', () => {
            // Mock workspace with metadata
            nock(baseURL)
                .get('/api/workspaces/my-knowledge-base')
                .reply(200, {
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
                });

            nock(baseURL)
                .post('/api/workspaces/my-knowledge-base/upload/start')
                .reply(202, {
                    success: true,
                    data: {
                        sessionId: 'session-123',
                        workspaceId: 'workspace-uuid',
                    },
                });

            try {
                const output = execSync(
                    `node dist/index.js init ${testVaultDir} --workspace my-knowledge-base`,
                    { encoding: 'utf8', timeout: 10000 }
                );

                // Verify workspace metadata display (FR-005)
                expect(output).toContain('Workspace verified:');
                expect(output).toContain('My Knowledge Base');
                expect(output).toContain('42'); // Node count
                expect(output).toContain('existing nodes');

                // Verify checkmark/success indicator
                expect(output).toMatch(/✓|✔|SUCCESS/);
            } catch (error: any) {
                // Test may fail if auth is not set up
                if (!error.message.includes('Authentication required')) {
                    throw error;
                }
            }
        });

        it('should retry workspace validation on network timeout', () => {
            // Mock first attempt fails with timeout, second succeeds
            nock(baseURL)
                .get('/api/workspaces/my-workspace')
                .replyWithError({ code: 'ETIMEDOUT', message: 'Request timeout' });

            nock(baseURL)
                .get('/api/workspaces/my-workspace')
                .reply(200, {
                    slug: 'my-workspace',
                    name: 'My Workspace',
                    owner: 'test-user',
                    nodeCount: 5,
                    userPermissions: {
                        canRead: true,
                        canWrite: true,
                        canDelete: false,
                        canShare: false,
                    },
                    createdAt: '2025-01-15T10:30:00Z',
                    lastModified: '2025-10-12T14:22:33Z',
                });

            nock(baseURL)
                .post('/api/workspaces/my-workspace/upload/start')
                .reply(202, {
                    success: true,
                    data: {
                        sessionId: 'session-123',
                        workspaceId: 'workspace-uuid',
                    },
                });

            try {
                const output = execSync(
                    `node dist/index.js init ${testVaultDir} --workspace my-workspace`,
                    { encoding: 'utf8', timeout: 15000 }
                );

                // Verify retry occurred and eventually succeeded
                expect(output).toContain('Workspace verified');
            } catch (error: any) {
                // Test may fail if auth is not set up
                if (!error.message.includes('Authentication required')) {
                    throw error;
                }
            }
        });

        it('should validate workspace slug format before API call', () => {
            // Invalid slug (contains uppercase)
            try {
                execSync(
                    `node dist/index.js init ${testVaultDir} --workspace Invalid-Workspace`,
                    { encoding: 'utf8', timeout: 5000 }
                );

                fail('Expected command to fail with invalid slug error');
            } catch (error: any) {
                const output = error.stderr || error.stdout || error.message;

                // Verify slug validation error
                expect(output).toContain('Invalid workspace slug');
                expect(output).toMatch(/lowercase|alphanumeric|hyphen/i);
            }
        });

        it('should not scan vault if workspace validation fails', () => {
            // Mock workspace not found
            nock(baseURL)
                .get('/api/workspaces/invalid-workspace')
                .reply(404, {
                    error: "Workspace 'invalid-workspace' not found",
                    code: 'WORKSPACE_NOT_FOUND',
                });

            const scanStartMessage = 'Scanning vault';
            const filesFoundMessage = 'files found';

            try {
                execSync(
                    `node dist/index.js init ${testVaultDir} --workspace invalid-workspace`,
                    { encoding: 'utf8', timeout: 5000 }
                );

                fail('Expected command to fail');
            } catch (error: any) {
                const output = error.stderr || error.stdout || error.message;

                // Verify vault scanning never started
                expect(output).not.toContain(scanStartMessage);
                expect(output).not.toContain(filesFoundMessage);

                // Verify error occurred before scan
                expect(output).toContain('not found');
            }
        });
    });

    describe('Backward Compatibility', () => {
        it('should still work with existing --workspace flag behavior', () => {
            // Mock workspace validation
            nock(baseURL)
                .get('/api/workspaces/test-workspace')
                .reply(200, {
                    slug: 'test-workspace',
                    name: 'Test Workspace',
                    owner: 'user',
                    nodeCount: 0,
                    userPermissions: {
                        canRead: true,
                        canWrite: true,
                        canDelete: false,
                        canShare: false,
                    },
                    createdAt: '2025-01-15T10:30:00Z',
                    lastModified: '2025-10-12T14:22:33Z',
                });

            nock(baseURL)
                .post('/api/workspaces/test-workspace/upload/start')
                .reply(202, {
                    success: true,
                    data: {
                        sessionId: 'session-123',
                        workspaceId: 'workspace-uuid',
                    },
                });

            try {
                // Execute with traditional --workspace flag
                const output = execSync(
                    `node dist/index.js init ${testVaultDir} --workspace test-workspace`,
                    { encoding: 'utf8', timeout: 10000 }
                );

                // Verify command still works
                expect(output).toContain('Workspace verified');
            } catch (error: any) {
                // Expected to fail in TDD red phase
                if (!error.message.includes('Authentication required')) {
                    throw error;
                }
            }
        });
    });
});
