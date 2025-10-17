/**
 * Integration tests for init command comparison phase
 * Feature: 009-init-command-enhancement
 * Task: T031 - Integration test for comparison phase
 *
 * Tests complete comparison flow:
 * 1. Fetch remote nodes
 * 2. Scan local vault
 * 3. Compare using three-way merge
 * 4. Display comparison summary
 * 5. Prompt user for confirmation before destructive operations
 *
 * Independent Test (from tasks.md):
 * Create space with "A.md" (content: "remote version"), create local vault
 * with "A.md" (content: "local version"), run `mujarrad init . --space test --sync`,
 * verify system displays "1 conflict detected: A.md (modified locally and remotely)".
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import nock from 'nock';
import { Logger } from '../../../src/utils/Logger.js';
import { VersionComparator } from '../../../src/services/VersionComparator.js';
import { RemoteNodeFetcher } from '../../../src/services/RemoteNodeFetcher.js';
import { VaultScanner } from '../../../src/filesystem/VaultScanner.js';
import { SyncSpacesApi } from '../../../src/api/generated/index.js';
import { Configuration } from '../../../src/api/generated/configuration.js';
import type { RemoteNode, LocalFile } from '../../../src/types/sync.js';

describe('Init Command - Comparison Phase (Integration)', () => {
    let tempVaultDir: string;
    let logger: Logger;
    let comparator: VersionComparator;
    let fetcher: RemoteNodeFetcher;
    let scanner: VaultScanner;
    const baseURL = 'https://api.mujarrad.test';
    const mockToken = 'mock-jwt-token';

    beforeEach(() => {
        // Create temporary vault directory
        tempVaultDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mujarrad-test-vault-'));
        fs.mkdirSync(path.join(tempVaultDir, '.obsidian'), { recursive: true });

        // Initialize services
        logger = new Logger();
        jest.spyOn(logger, 'debug').mockImplementation();
        jest.spyOn(logger, 'info').mockImplementation();
        jest.spyOn(logger, 'warn').mockImplementation();

        const apiConfig = new Configuration({
            basePath: baseURL,
            accessToken: mockToken
        });
        const spaceApi = new SyncSpacesApi(apiConfig);

        comparator = new VersionComparator(logger);
        fetcher = new RemoteNodeFetcher(spaceApi, logger);
        scanner = new VaultScanner(logger);

        // Mock HTTP requests
        nock.disableNetConnect();
    });

    afterEach(() => {
        // Clean up temp directory
        if (fs.existsSync(tempVaultDir)) {
            fs.rmSync(tempVaultDir, { recursive: true, force: true });
        }

        // Clean up nock mocks
        nock.cleanAll();
        nock.enableNetConnect();
    });

    describe('Independent Test - Conflict Detection', () => {
        /**
         * Independent Test from tasks.md:
         * Create space with "A.md" (content: "remote version"),
         * create local vault with "A.md" (content: "local version"),
         * verify system displays "1 conflict detected: A.md"
         */
        it('should detect conflict when A.md modified both locally and remotely', async () => {
            // Setup: Create local A.md
            const localContent = 'local version';
            fs.writeFileSync(path.join(tempVaultDir, 'A.md'), localContent, 'utf8');

            // Setup: Mock remote A.md
            const remoteContent = 'remote version';
            const remoteNodes: RemoteNode[] = [
                {
                    uuid: 'uuid-a',
                    title: 'A',
                    filePath: 'A.md',
                    content: remoteContent,
                    fileType: 'markdown',
                    hash: 'remote-hash-a',
                    ancestorHash: 'original-hash-a',
                    lastModified: new Date().toISOString()
                }
            ];

            nock(baseURL)
                .get('/api/spaces/test/nodes')
                .matchHeader('Authorization', `Bearer ${mockToken}`)
                .reply(200, {
                    data: remoteNodes,
                    pagination: { hasMore: false, nextCursor: null }
                });

            // Execute: Fetch remote nodes
            const fetchedNodes: RemoteNode[] = [];
            for await (const node of fetcher.fetchAllNodes('test')) {
                fetchedNodes.push(node);
            }

            // Execute: Scan local vault
            const localFiles = await scanner.scanVault(tempVaultDir);

            // Execute: Compare local and remote
            const comparisonInput = localFiles.map(localFile => {
                const remoteNode = fetchedNodes.find(n => n.filePath === localFile.relativePath);
                return {
                    filePath: localFile.relativePath,
                    localHash: localFile.hash,
                    remoteHash: remoteNode?.hash || null,
                    ancestorHash: remoteNode?.ancestorHash || null
                };
            });

            const result = comparator.compareFiles(comparisonInput);

            // Verify: Should detect 1 conflict
            expect(result.conflicted).toHaveLength(1);
            expect(result.conflicted[0].filePath).toBe('A.md');
            expect(result.conflicted[0].localHash).not.toBe(result.conflicted[0].remoteHash);

            // Verify: No other status
            expect(result.identical).toHaveLength(0);
            expect(result.localAhead).toHaveLength(0);
            expect(result.remoteAhead).toHaveLength(0);
        });
    });

    describe('Comparison scenarios', () => {
        it('should handle scenario: 5 identical, 2 local ahead, 3 remote ahead, 1 conflict', async () => {
            // Create 11 local files
            const localFiles = [
                { name: 'identical-1.md', content: 'same content 1' },
                { name: 'identical-2.md', content: 'same content 2' },
                { name: 'identical-3.md', content: 'same content 3' },
                { name: 'identical-4.md', content: 'same content 4' },
                { name: 'identical-5.md', content: 'same content 5' },
                { name: 'local-ahead-1.md', content: 'locally modified 1' },
                { name: 'local-ahead-2.md', content: 'locally modified 2' },
                { name: 'remote-ahead-1.md', content: 'original content 1' },
                { name: 'remote-ahead-2.md', content: 'original content 2' },
                { name: 'remote-ahead-3.md', content: 'original content 3' },
                { name: 'conflict.md', content: 'local version of conflict' }
            ];

            localFiles.forEach(file => {
                fs.writeFileSync(path.join(tempVaultDir, file.name), file.content, 'utf8');
            });

            // Mock remote nodes
            const remoteNodes: RemoteNode[] = [
                // Identical files (local and remote hashes match)
                ...Array.from({ length: 5 }, (_, i) => ({
                    uuid: `uuid-identical-${i + 1}`,
                    title: `identical-${i + 1}`,
                    filePath: `identical-${i + 1}.md`,
                    content: `same content ${i + 1}`,
                    fileType: 'markdown' as const,
                    hash: `hash-identical-${i + 1}`,
                    ancestorHash: `hash-identical-${i + 1}`,
                    lastModified: new Date().toISOString()
                })),
                // Local ahead files (local modified, remote unchanged)
                {
                    uuid: 'uuid-local-ahead-1',
                    title: 'local-ahead-1',
                    filePath: 'local-ahead-1.md',
                    content: 'original content',
                    fileType: 'markdown',
                    hash: 'hash-original-1',
                    ancestorHash: 'hash-original-1',
                    lastModified: new Date().toISOString()
                },
                {
                    uuid: 'uuid-local-ahead-2',
                    title: 'local-ahead-2',
                    filePath: 'local-ahead-2.md',
                    content: 'original content',
                    fileType: 'markdown',
                    hash: 'hash-original-2',
                    ancestorHash: 'hash-original-2',
                    lastModified: new Date().toISOString()
                },
                // Remote ahead files (remote modified, local unchanged)
                {
                    uuid: 'uuid-remote-ahead-1',
                    title: 'remote-ahead-1',
                    filePath: 'remote-ahead-1.md',
                    content: 'remotely modified 1',
                    fileType: 'markdown',
                    hash: 'hash-remote-mod-1',
                    ancestorHash: 'hash-original-remote-1',
                    lastModified: new Date().toISOString()
                },
                {
                    uuid: 'uuid-remote-ahead-2',
                    title: 'remote-ahead-2',
                    filePath: 'remote-ahead-2.md',
                    content: 'remotely modified 2',
                    fileType: 'markdown',
                    hash: 'hash-remote-mod-2',
                    ancestorHash: 'hash-original-remote-2',
                    lastModified: new Date().toISOString()
                },
                {
                    uuid: 'uuid-remote-ahead-3',
                    title: 'remote-ahead-3',
                    filePath: 'remote-ahead-3.md',
                    content: 'remotely modified 3',
                    fileType: 'markdown',
                    hash: 'hash-remote-mod-3',
                    ancestorHash: 'hash-original-remote-3',
                    lastModified: new Date().toISOString()
                },
                // Conflict file (both local and remote modified)
                {
                    uuid: 'uuid-conflict',
                    title: 'conflict',
                    filePath: 'conflict.md',
                    content: 'remote version of conflict',
                    fileType: 'markdown',
                    hash: 'hash-remote-conflict',
                    ancestorHash: 'hash-original-conflict',
                    lastModified: new Date().toISOString()
                }
            ];

            nock(baseURL)
                .get('/api/spaces/test/nodes')
                .matchHeader('Authorization', `Bearer ${mockToken}`)
                .reply(200, {
                    data: remoteNodes,
                    pagination: { hasMore: false, nextCursor: null }
                });

            // Fetch remote nodes
            const fetchedNodes: RemoteNode[] = [];
            for await (const node of fetcher.fetchAllNodes('test')) {
                fetchedNodes.push(node);
            }

            // Scan local vault
            const scannedFiles = await scanner.scanVault(tempVaultDir);

            // Build comparison input
            const comparisonInput = scannedFiles.map(localFile => {
                const remoteNode = fetchedNodes.find(n => n.filePath === localFile.relativePath);
                return {
                    filePath: localFile.relativePath,
                    localHash: localFile.hash,
                    remoteHash: remoteNode?.hash || null,
                    ancestorHash: remoteNode?.ancestorHash || null
                };
            });

            const result = comparator.compareFiles(comparisonInput);

            // Verify counts
            expect(result.identical).toHaveLength(5);
            expect(result.localAhead).toHaveLength(2);
            expect(result.remoteAhead).toHaveLength(3);
            expect(result.conflicted).toHaveLength(1);

            // Verify specific files
            expect(result.identical.map(f => f.filePath).sort()).toEqual([
                'identical-1.md',
                'identical-2.md',
                'identical-3.md',
                'identical-4.md',
                'identical-5.md'
            ]);

            expect(result.conflicted[0].filePath).toBe('conflict.md');
        });

        it('should handle local-only files (files not present remotely)', async () => {
            // Create 3 local files
            fs.writeFileSync(path.join(tempVaultDir, 'local-only-1.md'), 'local content 1', 'utf8');
            fs.writeFileSync(path.join(tempVaultDir, 'local-only-2.md'), 'local content 2', 'utf8');
            fs.writeFileSync(path.join(tempVaultDir, 'local-only-3.md'), 'local content 3', 'utf8');

            // Mock empty remote space
            nock(baseURL)
                .get('/api/spaces/test/nodes')
                .matchHeader('Authorization', `Bearer ${mockToken}`)
                .reply(200, {
                    data: [],
                    pagination: { hasMore: false, nextCursor: null }
                });

            // Fetch remote nodes (empty)
            const fetchedNodes: RemoteNode[] = [];
            for await (const node of fetcher.fetchAllNodes('test')) {
                fetchedNodes.push(node);
            }

            // Scan local vault
            const scannedFiles = await scanner.scanVault(tempVaultDir);

            // Build comparison input
            const comparisonInput = scannedFiles.map(localFile => ({
                filePath: localFile.relativePath,
                localHash: localFile.hash,
                remoteHash: null, // No remote node
                ancestorHash: null
            }));

            const result = comparator.compareFiles(comparisonInput);

            // All files should be LOCAL_ONLY (treated as LOCAL_AHEAD)
            expect(result.localAhead).toHaveLength(3);
            expect(result.identical).toHaveLength(0);
            expect(result.remoteAhead).toHaveLength(0);
            expect(result.conflicted).toHaveLength(0);
        });

        it('should handle remote-only files (files not present locally)', async () => {
            // Create empty vault (only .obsidian folder)
            // No local files

            // Mock 3 remote nodes
            const remoteNodes: RemoteNode[] = [
                {
                    uuid: 'uuid-remote-1',
                    title: 'remote-only-1',
                    filePath: 'remote-only-1.md',
                    content: 'remote content 1',
                    fileType: 'markdown',
                    hash: 'hash-remote-1',
                    ancestorHash: null,
                    lastModified: new Date().toISOString()
                },
                {
                    uuid: 'uuid-remote-2',
                    title: 'remote-only-2',
                    filePath: 'remote-only-2.md',
                    content: 'remote content 2',
                    fileType: 'markdown',
                    hash: 'hash-remote-2',
                    ancestorHash: null,
                    lastModified: new Date().toISOString()
                },
                {
                    uuid: 'uuid-remote-3',
                    title: 'remote-only-3',
                    filePath: 'remote-only-3.md',
                    content: 'remote content 3',
                    fileType: 'markdown',
                    hash: 'hash-remote-3',
                    ancestorHash: null,
                    lastModified: new Date().toISOString()
                }
            ];

            nock(baseURL)
                .get('/api/spaces/test/nodes')
                .matchHeader('Authorization', `Bearer ${mockToken}`)
                .reply(200, {
                    data: remoteNodes,
                    pagination: { hasMore: false, nextCursor: null }
                });

            // Fetch remote nodes
            const fetchedNodes: RemoteNode[] = [];
            for await (const node of fetcher.fetchAllNodes('test')) {
                fetchedNodes.push(node);
            }

            // Scan local vault (empty)
            const scannedFiles = await scanner.scanVault(tempVaultDir);
            expect(scannedFiles).toHaveLength(0);

            // Build comparison input from remote nodes
            const comparisonInput = fetchedNodes.map(remoteNode => ({
                filePath: remoteNode.filePath,
                localHash: null, // No local file
                remoteHash: remoteNode.hash,
                ancestorHash: remoteNode.ancestorHash
            }));

            const result = comparator.compareFiles(comparisonInput);

            // All files should be REMOTE_ONLY (treated as REMOTE_AHEAD)
            expect(result.remoteAhead).toHaveLength(3);
            expect(result.identical).toHaveLength(0);
            expect(result.localAhead).toHaveLength(0);
            expect(result.conflicted).toHaveLength(0);
        });
    });

    describe('Comparison summary display', () => {
        it('should provide structured summary for UI display', async () => {
            // Create mixed scenario
            fs.writeFileSync(path.join(tempVaultDir, 'A.md'), 'same', 'utf8');
            fs.writeFileSync(path.join(tempVaultDir, 'B.md'), 'local modified', 'utf8');

            const remoteNodes: RemoteNode[] = [
                {
                    uuid: 'uuid-a',
                    title: 'A',
                    filePath: 'A.md',
                    content: 'same',
                    fileType: 'markdown',
                    hash: 'hash-same',
                    ancestorHash: 'hash-same',
                    lastModified: new Date().toISOString()
                },
                {
                    uuid: 'uuid-b',
                    title: 'B',
                    filePath: 'B.md',
                    content: 'original',
                    fileType: 'markdown',
                    hash: 'hash-original',
                    ancestorHash: 'hash-original',
                    lastModified: new Date().toISOString()
                },
                {
                    uuid: 'uuid-c',
                    title: 'C',
                    filePath: 'C.md',
                    content: 'remote only',
                    fileType: 'markdown',
                    hash: 'hash-remote',
                    ancestorHash: null,
                    lastModified: new Date().toISOString()
                }
            ];

            nock(baseURL)
                .get('/api/spaces/test/nodes')
                .matchHeader('Authorization', `Bearer ${mockToken}`)
                .reply(200, {
                    data: remoteNodes,
                    pagination: { hasMore: false, nextCursor: null }
                });

            const fetchedNodes: RemoteNode[] = [];
            for await (const node of fetcher.fetchAllNodes('test')) {
                fetchedNodes.push(node);
            }

            const scannedFiles = await scanner.scanVault(tempVaultDir);

            // Build comparison input (include ALL files: local + remote-only)
            const allFilePaths = new Set([
                ...scannedFiles.map(f => f.relativePath),
                ...fetchedNodes.map(n => n.filePath)
            ]);

            const comparisonInput = Array.from(allFilePaths).map(filePath => {
                const localFile = scannedFiles.find(f => f.relativePath === filePath);
                const remoteNode = fetchedNodes.find(n => n.filePath === filePath);

                return {
                    filePath,
                    localHash: localFile?.hash || null,
                    remoteHash: remoteNode?.hash || null,
                    ancestorHash: remoteNode?.ancestorHash || null
                };
            });

            const result = comparator.compareFiles(comparisonInput);

            // Verify summary structure
            expect(result).toHaveProperty('identical');
            expect(result).toHaveProperty('localAhead');
            expect(result).toHaveProperty('remoteAhead');
            expect(result).toHaveProperty('conflicted');

            // Verify counts
            expect(result.identical).toHaveLength(1); // A.md
            expect(result.localAhead).toHaveLength(1); // B.md
            expect(result.remoteAhead).toHaveLength(1); // C.md
            expect(result.conflicted).toHaveLength(0);
        });
    });

    describe('Performance', () => {
        it('should handle comparison of 1,000 files efficiently (NFR-004)', async () => {
            // Create 1,000 local files
            for (let i = 0; i < 1000; i++) {
                fs.writeFileSync(
                    path.join(tempVaultDir, `file-${i}.md`),
                    `content ${i}`,
                    'utf8'
                );
            }

            // Mock 1,000 remote nodes
            const remoteNodes: RemoteNode[] = Array.from({ length: 1000 }, (_, i) => ({
                uuid: `uuid-${i}`,
                title: `file-${i}`,
                filePath: `file-${i}.md`,
                content: i % 2 === 0 ? `content ${i}` : `modified ${i}`,
                fileType: 'markdown' as const,
                hash: i % 2 === 0 ? `hash-${i}` : `hash-mod-${i}`,
                ancestorHash: `hash-${i}`,
                lastModified: new Date().toISOString()
            }));

            // Mock paginated response (2 pages of 500 each)
            nock(baseURL)
                .get('/api/spaces/test/nodes')
                .matchHeader('Authorization', `Bearer ${mockToken}`)
                .query({ limit: 100 })
                .reply(200, {
                    data: remoteNodes.slice(0, 100),
                    pagination: { hasMore: true, nextCursor: 'cursor-1' }
                });

            nock(baseURL)
                .get('/api/spaces/test/nodes')
                .query({ cursor: 'cursor-1', limit: 100 })
                .reply(200, {
                    data: remoteNodes.slice(100),
                    pagination: { hasMore: false, nextCursor: null }
                });

            // Measure performance
            const startTime = Date.now();

            // Fetch remote nodes
            const fetchedNodes: RemoteNode[] = [];
            for await (const node of fetcher.fetchAllNodes('test')) {
                fetchedNodes.push(node);
            }

            // Scan local vault
            const scannedFiles = await scanner.scanVault(tempVaultDir);

            // Build comparison input
            const comparisonInput = scannedFiles.map(localFile => {
                const remoteNode = fetchedNodes.find(n => n.filePath === localFile.relativePath);
                return {
                    filePath: localFile.relativePath,
                    localHash: localFile.hash,
                    remoteHash: remoteNode?.hash || null,
                    ancestorHash: remoteNode?.ancestorHash || null
                };
            });

            // Compare
            const result = comparator.compareFiles(comparisonInput);

            const duration = Date.now() - startTime;

            // Should complete in under 5 seconds (generous for I/O)
            expect(duration).toBeLessThan(5000);

            // Verify correct classification
            expect(result.identical).toHaveLength(500); // Even indices
            expect(result.remoteAhead).toHaveLength(500); // Odd indices
        });
    });
});
