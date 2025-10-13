/**
 * Unit tests for ConflictResolver service
 * Feature: 009-init-command-enhancement
 * Task: T038 - Unit test for conflict resolution logic
 *
 * Tests:
 * - INTERACTIVE strategy: prompt user for each conflict
 * - KEEP_LOCAL strategy: automatically keep local version
 * - KEEP_REMOTE strategy: automatically keep remote version
 * - SKIP strategy: skip conflicted files
 * - Batch resolution with mixed strategies
 * - User confirmation prompts
 * - Content preview generation
 */

import { ConflictResolver, type ConflictResolutionInput } from '../../../src/services/ConflictResolver.js';
import { ConflictStrategy } from '../../../src/types/sync.js';
import { Logger } from '../../../src/utils/Logger.js';

describe('ConflictResolver', () => {
    let resolver: ConflictResolver;
    let mockLogger: Logger;

    beforeEach(() => {
        mockLogger = new Logger();
        jest.spyOn(mockLogger, 'debug').mockImplementation();
        jest.spyOn(mockLogger, 'info').mockImplementation();
        jest.spyOn(mockLogger, 'warn').mockImplementation();
        jest.spyOn(mockLogger, 'error').mockImplementation();

        resolver = new ConflictResolver(mockLogger);
    });

    describe('KEEP_LOCAL strategy', () => {
        it('should resolve conflict by keeping local version', async () => {
            const conflict: ConflictResolutionInput = {
                filePath: 'conflict.md',
                localContent: 'Local version of content',
                remoteContent: 'Remote version of content',
                localHash: 'local-hash-123',
                remoteHash: 'remote-hash-456'
            };

            const result = await resolver.resolveConflict(conflict, ConflictStrategy.KEEP_LOCAL);

            expect(result.filePath).toBe('conflict.md');
            expect(result.resolution).toBe(ConflictStrategy.KEEP_LOCAL);
            expect(result.chosenContent).toBe('Local version of content');
            expect(result.chosenHash).toBe('local-hash-123');
        });

        it('should batch resolve multiple conflicts with KEEP_LOCAL', async () => {
            const conflicts: ConflictResolutionInput[] = [
                {
                    filePath: 'A.md',
                    localContent: 'Local A',
                    remoteContent: 'Remote A',
                    localHash: 'hash-local-a',
                    remoteHash: 'hash-remote-a'
                },
                {
                    filePath: 'B.md',
                    localContent: 'Local B',
                    remoteContent: 'Remote B',
                    localHash: 'hash-local-b',
                    remoteHash: 'hash-remote-b'
                }
            ];

            const results = await resolver.resolveConflicts(conflicts, ConflictStrategy.KEEP_LOCAL);

            expect(results).toHaveLength(2);
            expect(results[0].chosenContent).toBe('Local A');
            expect(results[1].chosenContent).toBe('Local B');
            expect(results.every(r => r.resolution === ConflictStrategy.KEEP_LOCAL)).toBe(true);
        });
    });

    describe('KEEP_REMOTE strategy', () => {
        it('should resolve conflict by keeping remote version', async () => {
            const conflict: ConflictResolutionInput = {
                filePath: 'conflict.md',
                localContent: 'Local version of content',
                remoteContent: 'Remote version of content',
                localHash: 'local-hash-123',
                remoteHash: 'remote-hash-456'
            };

            const result = await resolver.resolveConflict(conflict, ConflictStrategy.KEEP_REMOTE);

            expect(result.filePath).toBe('conflict.md');
            expect(result.resolution).toBe(ConflictStrategy.KEEP_REMOTE);
            expect(result.chosenContent).toBe('Remote version of content');
            expect(result.chosenHash).toBe('remote-hash-456');
        });

        it('should batch resolve multiple conflicts with KEEP_REMOTE', async () => {
            const conflicts: ConflictResolutionInput[] = [
                {
                    filePath: 'A.md',
                    localContent: 'Local A',
                    remoteContent: 'Remote A',
                    localHash: 'hash-local-a',
                    remoteHash: 'hash-remote-a'
                },
                {
                    filePath: 'B.md',
                    localContent: 'Local B',
                    remoteContent: 'Remote B',
                    localHash: 'hash-local-b',
                    remoteHash: 'hash-remote-b'
                }
            ];

            const results = await resolver.resolveConflicts(conflicts, ConflictStrategy.KEEP_REMOTE);

            expect(results).toHaveLength(2);
            expect(results[0].chosenContent).toBe('Remote A');
            expect(results[1].chosenContent).toBe('Remote B');
            expect(results.every(r => r.resolution === ConflictStrategy.KEEP_REMOTE)).toBe(true);
        });
    });

    describe('SKIP strategy', () => {
        it('should resolve conflict by skipping (no content chosen)', async () => {
            const conflict: ConflictResolutionInput = {
                filePath: 'conflict.md',
                localContent: 'Local version of content',
                remoteContent: 'Remote version of content',
                localHash: 'local-hash-123',
                remoteHash: 'remote-hash-456'
            };

            const result = await resolver.resolveConflict(conflict, ConflictStrategy.SKIP);

            expect(result.filePath).toBe('conflict.md');
            expect(result.resolution).toBe(ConflictStrategy.SKIP);
            expect(result.chosenContent).toBeNull();
            expect(result.chosenHash).toBeNull();
        });

        it('should batch skip multiple conflicts', async () => {
            const conflicts: ConflictResolutionInput[] = [
                {
                    filePath: 'A.md',
                    localContent: 'Local A',
                    remoteContent: 'Remote A',
                    localHash: 'hash-local-a',
                    remoteHash: 'hash-remote-a'
                },
                {
                    filePath: 'B.md',
                    localContent: 'Local B',
                    remoteContent: 'Remote B',
                    localHash: 'hash-local-b',
                    remoteHash: 'hash-remote-b'
                }
            ];

            const results = await resolver.resolveConflicts(conflicts, ConflictStrategy.SKIP);

            expect(results).toHaveLength(2);
            expect(results[0].chosenContent).toBeNull();
            expect(results[1].chosenContent).toBeNull();
            expect(results.every(r => r.resolution === ConflictStrategy.SKIP)).toBe(true);
        });
    });

    describe('Content preview generation', () => {
        it('should generate preview of first 500 characters', () => {
            const longContent = 'a'.repeat(1000);
            const preview = resolver.generatePreview(longContent);

            expect(preview).toHaveLength(503); // 500 + '...'
            expect(preview.endsWith('...')).toBe(true);
        });

        it('should return full content if less than 500 characters', () => {
            const shortContent = 'Short content here';
            const preview = resolver.generatePreview(shortContent);

            expect(preview).toBe(shortContent);
            expect(preview.endsWith('...')).toBe(false);
        });

        it('should handle empty content', () => {
            const preview = resolver.generatePreview('');
            expect(preview).toBe('');
        });

        it('should preserve newlines in preview', () => {
            const content = 'Line 1\nLine 2\nLine 3';
            const preview = resolver.generatePreview(content);

            expect(preview).toContain('\n');
            expect(preview).toBe(content);
        });
    });

    describe('Diff summary generation', () => {
        it('should generate diff summary showing character differences', () => {
            const localContent = 'a'.repeat(100);
            const remoteContent = 'b'.repeat(150);

            const summary = resolver.generateDiffSummary(localContent, remoteContent);

            expect(summary).toContain('+50'); // 50 more characters in remote
            expect(summary).toMatch(/\+\d+.*-\d+/); // Format: +N / -M
        });

        it('should handle identical content', () => {
            const content = 'Same content';
            const summary = resolver.generateDiffSummary(content, content);

            expect(summary).toContain('No difference');
        });

        it('should handle empty content', () => {
            const summary = resolver.generateDiffSummary('', '');
            expect(summary).toContain('No difference');
        });

        it('should show local longer', () => {
            const localContent = 'a'.repeat(200);
            const remoteContent = 'b'.repeat(100);

            const summary = resolver.generateDiffSummary(localContent, remoteContent);

            expect(summary).toContain('-100'); // 100 fewer characters in remote
        });
    });

    describe('Logging', () => {
        it('should log resolution decision for KEEP_LOCAL', async () => {
            const conflict: ConflictResolutionInput = {
                filePath: 'test.md',
                localContent: 'local',
                remoteContent: 'remote',
                localHash: 'hash-local',
                remoteHash: 'hash-remote'
            };

            await resolver.resolveConflict(conflict, ConflictStrategy.KEEP_LOCAL);

            expect(mockLogger.info).toHaveBeenCalledWith(
                'Conflict resolved',
                expect.objectContaining({
                    filePath: 'test.md',
                    strategy: ConflictStrategy.KEEP_LOCAL
                })
            );
        });

        it('should log batch resolution summary', async () => {
            const conflicts: ConflictResolutionInput[] = [
                {
                    filePath: 'A.md',
                    localContent: 'Local A',
                    remoteContent: 'Remote A',
                    localHash: 'hash-a-local',
                    remoteHash: 'hash-a-remote'
                },
                {
                    filePath: 'B.md',
                    localContent: 'Local B',
                    remoteContent: 'Remote B',
                    localHash: 'hash-b-local',
                    remoteHash: 'hash-b-remote'
                }
            ];

            await resolver.resolveConflicts(conflicts, ConflictStrategy.KEEP_LOCAL);

            expect(mockLogger.info).toHaveBeenCalledWith(
                'Batch conflict resolution complete',
                expect.objectContaining({
                    totalConflicts: 2,
                    strategy: ConflictStrategy.KEEP_LOCAL
                })
            );
        });
    });

    describe('Edge cases', () => {
        it('should handle null content (deleted files)', async () => {
            const conflict: ConflictResolutionInput = {
                filePath: 'deleted.md',
                localContent: null,
                remoteContent: 'Remote content',
                localHash: null,
                remoteHash: 'hash-remote'
            };

            const result = await resolver.resolveConflict(conflict, ConflictStrategy.KEEP_REMOTE);

            expect(result.chosenContent).toBe('Remote content');
            expect(result.chosenHash).toBe('hash-remote');
        });

        it('should handle empty conflicts array', async () => {
            const results = await resolver.resolveConflicts([], ConflictStrategy.KEEP_LOCAL);
            expect(results).toHaveLength(0);
        });

        it('should handle Unicode content in preview', () => {
            const unicodeContent = '你好世界 🚀 émojis';
            const preview = resolver.generatePreview(unicodeContent);

            expect(preview).toBe(unicodeContent);
        });
    });

    describe('Performance', () => {
        it('should resolve 100 conflicts quickly', async () => {
            const conflicts: ConflictResolutionInput[] = Array.from({ length: 100 }, (_, i) => ({
                filePath: `file-${i}.md`,
                localContent: `Local content ${i}`,
                remoteContent: `Remote content ${i}`,
                localHash: `hash-local-${i}`,
                remoteHash: `hash-remote-${i}`
            }));

            const startTime = Date.now();
            const results = await resolver.resolveConflicts(conflicts, ConflictStrategy.KEEP_LOCAL);
            const duration = Date.now() - startTime;

            expect(results).toHaveLength(100);
            expect(duration).toBeLessThan(1000); // Should complete in <1s
        });
    });
});
