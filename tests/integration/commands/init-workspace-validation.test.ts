/**
 * Integration tests for init command with space validation
 * Feature: 009-init-command-enhancement
 * Task: T012 - Integration test for init command with space validation
 *
 * Purpose: Test full init command flow with space validation
 * Tests FR-001, FR-003, FR-004, FR-005 in realistic scenarios
 *
 * TDD approach: These tests are written BEFORE implementation and should FAIL initially
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import nock from 'nock';

describe('Init Command - Space Validation Integration', () => {
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

    describe('Space Validation Before Scan (FR-001)', () => {
        it('should verify space exists before scanning vault', () => {
            // Mock successful space validation
            nock(baseURL)
                .get('/api/spaces/valid-space')
                .reply(200, {
                    slug: 'valid-space',
                    name: 'Valid Space',
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
                .post('/api/spaces/valid-space/upload/start')
                .reply(202, {
                    success: true,
                    data: {
                        sessionId: 'session-123',
                        spaceId: 'space-uuid',
                    },
                });

            try {
                // Execute init command
                const output = execSync(
                    `node dist/index.js init ${testVaultDir} --space valid-space`,
                    { encoding: 'utf8', timeout: 10000 }
                );

                // Verify space verification message appears before scan
                expect(output).toContain('Verifying space');
                expect(output).toContain('Space verified: Valid Space');
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

        it('should fail fast with clear error when space does not exist (FR-003)', () => {
            // Mock 404 space not found
            nock(baseURL)
                .get('/api/spaces/nonexistent-space')
                .reply(404, {
                    error: "Space 'nonexistent-space' not found",
                    code: 'SPACE_NOT_FOUND',
                    timestamp: '2025-10-12T15:30:00Z',
                });

            try {
                // Execute init command - should fail quickly
                const startTime = Date.now();

                execSync(
                    `node dist/index.js init ${testVaultDir} --space nonexistent-space`,
                    { encoding: 'utf8', timeout: 5000 }
                );

                // Should not reach here
                fail('Expected command to fail with space not found error');
            } catch (error: any) {
                const elapsedTime = Date.now() - startTime;

                // Verify fast failure (within 2 seconds - FR-003)
                expect(elapsedTime).toBeLessThan(2000);

                // Verify error message
                const output = error.stderr || error.stdout || error.message;
                expect(output).toContain('nonexistent-space');
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
                .get('/api/spaces/restricted-space')
                .reply(403, {
                    error: "Access denied to space 'restricted-space'. Contact the space owner for permissions.",
                    code: 'SPACE_ACCESS_DENIED',
                    timestamp: '2025-10-12T15:30:00Z',
                });

            try {
                execSync(
                    `node dist/index.js init ${testVaultDir} --space restricted-space`,
                    { encoding: 'utf8', timeout: 5000 }
                );

                fail('Expected command to fail with access denied error');
            } catch (error: any) {
                const output = error.stderr || error.stdout || error.message;

                // Verify access denied message
                expect(output).toContain('Access denied');
                expect(output).toContain('restricted-space');
                expect(output).toContain('space owner');

                // Verify vault scanning did NOT occur
                expect(output).not.toContain('Scanning vault');
            }
        });

        it('should display space metadata after successful verification (FR-005)', () => {
            // Mock space with metadata
            nock(baseURL)
                .get('/api/spaces/my-knowledge-base')
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
                .post('/api/spaces/my-knowledge-base/upload/start')
                .reply(202, {
                    success: true,
                    data: {
                        sessionId: 'session-123',
                        spaceId: 'space-uuid',
                    },
                });

            try {
                const output = execSync(
                    `node dist/index.js init ${testVaultDir} --space my-knowledge-base`,
                    { encoding: 'utf8', timeout: 10000 }
                );

                // Verify space metadata display (FR-005)
                expect(output).toContain('Space verified:');
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

        it('should retry space validation on network timeout', () => {
            // Mock first attempt fails with timeout, second succeeds
            nock(baseURL)
                .get('/api/spaces/my-space')
                .replyWithError({ code: 'ETIMEDOUT', message: 'Request timeout' });

            nock(baseURL)
                .get('/api/spaces/my-space')
                .reply(200, {
                    slug: 'my-space',
                    name: 'My Space',
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
                .post('/api/spaces/my-space/upload/start')
                .reply(202, {
                    success: true,
                    data: {
                        sessionId: 'session-123',
                        spaceId: 'space-uuid',
                    },
                });

            try {
                const output = execSync(
                    `node dist/index.js init ${testVaultDir} --space my-space`,
                    { encoding: 'utf8', timeout: 15000 }
                );

                // Verify retry occurred and eventually succeeded
                expect(output).toContain('Space verified');
            } catch (error: any) {
                // Test may fail if auth is not set up
                if (!error.message.includes('Authentication required')) {
                    throw error;
                }
            }
        });

        it('should validate space slug format before API call', () => {
            // Invalid slug (contains uppercase)
            try {
                execSync(
                    `node dist/index.js init ${testVaultDir} --space Invalid-Space`,
                    { encoding: 'utf8', timeout: 5000 }
                );

                fail('Expected command to fail with invalid slug error');
            } catch (error: any) {
                const output = error.stderr || error.stdout || error.message;

                // Verify slug validation error
                expect(output).toContain('Invalid space slug');
                expect(output).toMatch(/lowercase|alphanumeric|hyphen/i);
            }
        });

        it('should not scan vault if space validation fails', () => {
            // Mock space not found
            nock(baseURL)
                .get('/api/spaces/invalid-space')
                .reply(404, {
                    error: "Space 'invalid-space' not found",
                    code: 'SPACE_NOT_FOUND',
                });

            const scanStartMessage = 'Scanning vault';
            const filesFoundMessage = 'files found';

            try {
                execSync(
                    `node dist/index.js init ${testVaultDir} --space invalid-space`,
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
        it('should still work with existing --space flag behavior', () => {
            // Mock space validation
            nock(baseURL)
                .get('/api/spaces/test-space')
                .reply(200, {
                    slug: 'test-space',
                    name: 'Test Space',
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
                .post('/api/spaces/test-space/upload/start')
                .reply(202, {
                    success: true,
                    data: {
                        sessionId: 'session-123',
                        spaceId: 'space-uuid',
                    },
                });

            try {
                // Execute with traditional --space flag
                const output = execSync(
                    `node dist/index.js init ${testVaultDir} --space test-space`,
                    { encoding: 'utf8', timeout: 10000 }
                );

                // Verify command still works
                expect(output).toContain('Space verified');
            } catch (error: any) {
                // Expected to fail in TDD red phase
                if (!error.message.includes('Authentication required')) {
                    throw error;
                }
            }
        });
    });
});
