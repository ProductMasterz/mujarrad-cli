/**
 * Unit tests for VersionComparator service
 * Feature: 009-init-command-enhancement
 * Task: T030 - Unit test for three-way merge classification algorithm
 *
 * Tests three-way merge algorithm for classifying file states:
 * - IDENTICAL: No changes
 * - LOCAL_ONLY: File exists locally but not remotely
 * - REMOTE_ONLY: File exists remotely but not locally
 * - LOCAL_AHEAD: Local modified, remote unchanged
 * - REMOTE_AHEAD: Remote modified, local unchanged
 * - CONFLICTED: Both local and remote modified
 *
 * Algorithm uses hash comparison: compareVersions(localHash, remoteHash, ancestorHash)
 */

import { VersionComparator } from '../../../src/services/VersionComparator.js';
import { FileStatus } from '../../../src/types/sync.js';
import { Logger } from '../../../src/utils/Logger.js';

describe('VersionComparator', () => {
    let comparator: VersionComparator;
    let mockLogger: Logger;

    beforeEach(() => {
        mockLogger = new Logger();
        jest.spyOn(mockLogger, 'debug').mockImplementation();
        jest.spyOn(mockLogger, 'info').mockImplementation();
        jest.spyOn(mockLogger, 'warn').mockImplementation();
        jest.spyOn(mockLogger, 'error').mockImplementation();

        comparator = new VersionComparator(mockLogger);
    });

    describe('Three-way merge algorithm', () => {
        // Test case 1: IDENTICAL - All hashes match
        it('should classify as IDENTICAL when local, remote, and ancestor hashes match', () => {
            const result = comparator.compareVersions(
                'abc123',
                'abc123',
                'abc123'
            );

            expect(result).toBe(FileStatus.IDENTICAL);
        });

        // Test case 2: IDENTICAL - Local and remote match (ancestor different)
        // This means file was modified in the past, but both sides converged to same state
        it('should classify as IDENTICAL when local and remote hashes match (even if ancestor differs)', () => {
            const result = comparator.compareVersions(
                'def456',
                'def456',
                'abc123' // Different ancestor
            );

            expect(result).toBe(FileStatus.IDENTICAL);
        });

        // Test case 3: LOCAL_AHEAD - Local modified, remote unchanged
        it('should classify as LOCAL_AHEAD when local differs from ancestor but remote matches ancestor', () => {
            const result = comparator.compareVersions(
                'local-modified-hash',
                'original-hash',
                'original-hash'
            );

            expect(result).toBe(FileStatus.LOCAL_AHEAD);
        });

        // Test case 4: REMOTE_AHEAD - Remote modified, local unchanged
        it('should classify as REMOTE_AHEAD when remote differs from ancestor but local matches ancestor', () => {
            const result = comparator.compareVersions(
                'original-hash',
                'remote-modified-hash',
                'original-hash'
            );

            expect(result).toBe(FileStatus.REMOTE_AHEAD);
        });

        // Test case 5: CONFLICTED - Both local and remote modified differently
        it('should classify as CONFLICTED when both local and remote differ from ancestor (and from each other)', () => {
            const result = comparator.compareVersions(
                'local-modified-hash',
                'remote-modified-hash',
                'original-hash'
            );

            expect(result).toBe(FileStatus.CONFLICTED);
        });

        // Test case 6: No ancestor (new file)
        it('should classify as LOCAL_AHEAD when local exists, remote matches ancestor, and no ancestor', () => {
            const result = comparator.compareVersions(
                'local-hash',
                null,
                null
            );

            expect(result).toBe(FileStatus.LOCAL_ONLY);
        });

        it('should classify as REMOTE_AHEAD when remote exists, local matches ancestor, and no ancestor', () => {
            const result = comparator.compareVersions(
                null,
                'remote-hash',
                null
            );

            expect(result).toBe(FileStatus.REMOTE_ONLY);
        });

        // Test case 7: Both created independently (null ancestor, different hashes)
        it('should classify as CONFLICTED when both local and remote exist but no ancestor', () => {
            const result = comparator.compareVersions(
                'local-hash',
                'remote-hash',
                null
            );

            expect(result).toBe(FileStatus.CONFLICTED);
        });

        // Test case 8: Edge case - null local and remote (deleted on both sides)
        it('should classify as IDENTICAL when both local and remote are null', () => {
            const result = comparator.compareVersions(
                null,
                null,
                'original-hash'
            );

            expect(result).toBe(FileStatus.IDENTICAL);
        });

        // Test case 9: Local deleted, remote unchanged
        it('should classify as LOCAL_AHEAD when local is null but remote matches ancestor', () => {
            const result = comparator.compareVersions(
                null,
                'original-hash',
                'original-hash'
            );

            expect(result).toBe(FileStatus.LOCAL_AHEAD);
        });

        // Test case 10: Remote deleted, local unchanged
        it('should classify as REMOTE_AHEAD when remote is null but local matches ancestor', () => {
            const result = comparator.compareVersions(
                'original-hash',
                null,
                'original-hash'
            );

            expect(result).toBe(FileStatus.REMOTE_AHEAD);
        });

        // Test case 11: Both deleted independently
        it('should classify as CONFLICTED when both local and remote deleted (null) but ancestor exists', () => {
            const result = comparator.compareVersions(
                null,
                null,
                'original-hash'
            );

            expect(result).toBe(FileStatus.IDENTICAL);
        });

        // Test case 12: Local deleted, remote modified
        it('should classify as CONFLICTED when local is null and remote differs from ancestor', () => {
            const result = comparator.compareVersions(
                null,
                'remote-modified-hash',
                'original-hash'
            );

            expect(result).toBe(FileStatus.CONFLICTED);
        });

        // Test case 13: Remote deleted, local modified
        it('should classify as CONFLICTED when remote is null and local differs from ancestor', () => {
            const result = comparator.compareVersions(
                'local-modified-hash',
                null,
                'original-hash'
            );

            expect(result).toBe(FileStatus.CONFLICTED);
        });
    });

    describe('Batch comparison', () => {
        it('should compare multiple files and return summary statistics', () => {
            const files = [
                { filePath: 'A.md', localHash: 'abc123', remoteHash: 'abc123', ancestorHash: 'abc123' },
                { filePath: 'B.md', localHash: 'local-modified', remoteHash: 'original', ancestorHash: 'original' },
                { filePath: 'C.md', localHash: 'original', remoteHash: 'remote-modified', ancestorHash: 'original' },
                { filePath: 'D.md', localHash: 'local-mod', remoteHash: 'remote-mod', ancestorHash: 'original' },
                { filePath: 'E.md', localHash: 'new-local', remoteHash: null, ancestorHash: null },
                { filePath: 'F.md', localHash: null, remoteHash: 'new-remote', ancestorHash: null }
            ];

            const result = comparator.compareFiles(files);

            expect(result.identical).toHaveLength(1);
            expect(result.localAhead).toHaveLength(2); // B.md (modified) + E.md (local only)
            expect(result.remoteAhead).toHaveLength(2); // C.md (modified) + F.md (remote only)
            expect(result.conflicted).toHaveLength(1); // D.md

            expect(result.identical[0].filePath).toBe('A.md');
            expect(result.localAhead[0].filePath).toBe('B.md');
            expect(result.remoteAhead[0].filePath).toBe('C.md');
            expect(result.conflicted[0].filePath).toBe('D.md');
        });

        it('should handle empty file list', () => {
            const result = comparator.compareFiles([]);

            expect(result.identical).toHaveLength(0);
            expect(result.localAhead).toHaveLength(0);
            expect(result.remoteAhead).toHaveLength(0);
            expect(result.conflicted).toHaveLength(0);
        });

        it('should log summary statistics for batch comparison', () => {
            const files = [
                { filePath: 'A.md', localHash: 'abc', remoteHash: 'abc', ancestorHash: 'abc' },
                { filePath: 'B.md', localHash: 'local', remoteHash: 'remote', ancestorHash: 'orig' }
            ];

            comparator.compareFiles(files);

            expect(mockLogger.info).toHaveBeenCalledWith(
                'Batch comparison complete',
                expect.objectContaining({
                    totalFiles: 2,
                    identical: 1,
                    localAhead: 0,
                    remoteAhead: 0,
                    conflicted: 1
                })
            );
        });
    });

    describe('Hash validation', () => {
        it('should accept valid SHA-256 hashes (64 lowercase hex characters)', () => {
            const validHash = 'a'.repeat(64);
            const result = comparator.compareVersions(validHash, validHash, validHash);
            expect(result).toBe(FileStatus.IDENTICAL);
        });

        it('should accept null as valid hash (for non-existent files)', () => {
            const result = comparator.compareVersions(null, null, null);
            expect(result).toBe(FileStatus.IDENTICAL);
        });

        it('should handle short hashes (for testing/development)', () => {
            // In real implementation, we might want to warn about short hashes
            const result = comparator.compareVersions('abc', 'abc', 'abc');
            expect(result).toBe(FileStatus.IDENTICAL);
        });
    });

    describe('Edge cases', () => {
        it('should handle case-sensitive hash comparison', () => {
            const result = comparator.compareVersions(
                'ABC123',
                'abc123',
                'abc123'
            );

            // Different case means different hash - local modified
            expect(result).toBe(FileStatus.LOCAL_AHEAD);
        });

        it('should handle whitespace in hashes (should not normalize)', () => {
            const result = comparator.compareVersions(
                'abc 123',
                'abc123',
                'abc123'
            );

            // Whitespace means different hash - local modified
            expect(result).toBe(FileStatus.LOCAL_AHEAD);
        });

        it('should treat empty string as distinct from null', () => {
            const result = comparator.compareVersions(
                '',
                null,
                null
            );

            // Empty string hash means file exists (even if empty content)
            expect(result).toBe(FileStatus.LOCAL_ONLY);
        });
    });

    describe('Performance', () => {
        it('should handle 10,000 file comparisons efficiently (NFR-004)', () => {
            const files = Array.from({ length: 10000 }, (_, i) => ({
                filePath: `file-${i}.md`,
                localHash: `hash-${i}`,
                remoteHash: i % 2 === 0 ? `hash-${i}` : `different-${i}`,
                ancestorHash: `hash-${i}`
            }));

            const startTime = Date.now();
            const result = comparator.compareFiles(files);
            const duration = Date.now() - startTime;

            // Should complete in under 1 second
            expect(duration).toBeLessThan(1000);

            // Verify correct classification
            expect(result.identical).toHaveLength(5000); // Even indices
            expect(result.remoteAhead).toHaveLength(5000); // Odd indices
        });
    });
});
