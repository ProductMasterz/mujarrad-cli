/**
 * Unit tests for LocalFileHasher utility
 * Feature: 009-init-command-enhancement
 * Task: T033 - Unit test for LocalFileHasher
 *
 * Tests:
 * - SHA-256 hash computation (streaming and in-memory)
 * - UUID extraction from markdown files
 * - Batch file processing
 * - Hash verification
 * - Error handling
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { LocalFileHasher } from '../../../src/utils/LocalFileHasher.js';
import { Logger } from '../../../src/utils/Logger.js';

describe('LocalFileHasher', () => {
    let hasher: LocalFileHasher;
    let mockLogger: Logger;
    let tempDir: string;

    beforeEach(() => {
        mockLogger = new Logger();
        jest.spyOn(mockLogger, 'debug').mockImplementation();
        jest.spyOn(mockLogger, 'info').mockImplementation();
        jest.spyOn(mockLogger, 'warn').mockImplementation();
        jest.spyOn(mockLogger, 'error').mockImplementation();

        hasher = new LocalFileHasher(mockLogger);

        // Create temp directory for test files
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hasher-test-'));
    });

    afterEach(() => {
        // Clean up temp directory
        if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    });

    describe('computeHash', () => {
        it('should compute SHA-256 hash of file content', async () => {
            const testFile = path.join(tempDir, 'test.md');
            fs.writeFileSync(testFile, 'Hello World', 'utf8');

            const hash = await hasher.computeHash(testFile);

            // Expected SHA-256 of "Hello World"
            expect(hash).toBe('a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e');
            expect(hash).toHaveLength(64);
            expect(hash).toMatch(/^[a-f0-9]{64}$/);
        });

        it('should compute different hashes for different content', async () => {
            const file1 = path.join(tempDir, 'file1.md');
            const file2 = path.join(tempDir, 'file2.md');

            fs.writeFileSync(file1, 'Content A', 'utf8');
            fs.writeFileSync(file2, 'Content B', 'utf8');

            const hash1 = await hasher.computeHash(file1);
            const hash2 = await hasher.computeHash(file2);

            expect(hash1).not.toBe(hash2);
        });

        it('should compute same hash for identical content', async () => {
            const file1 = path.join(tempDir, 'file1.md');
            const file2 = path.join(tempDir, 'file2.md');

            fs.writeFileSync(file1, 'Same content', 'utf8');
            fs.writeFileSync(file2, 'Same content', 'utf8');

            const hash1 = await hasher.computeHash(file1);
            const hash2 = await hasher.computeHash(file2);

            expect(hash1).toBe(hash2);
        });

        it('should handle large files efficiently (streaming)', async () => {
            const largeFile = path.join(tempDir, 'large.md');
            const largeContent = 'x'.repeat(10 * 1024 * 1024); // 10 MB
            fs.writeFileSync(largeFile, largeContent, 'utf8');

            const startTime = Date.now();
            const hash = await hasher.computeHash(largeFile);
            const duration = Date.now() - startTime;

            expect(hash).toHaveLength(64);
            expect(duration).toBeLessThan(2000); // Should complete in <2s
        });

        it('should reject promise on file read error', async () => {
            const nonExistentFile = path.join(tempDir, 'does-not-exist.md');

            await expect(hasher.computeHash(nonExistentFile)).rejects.toThrow();
        });
    });

    describe('computeHashFromContent', () => {
        it('should compute hash from string content', () => {
            const content = 'Test content';
            const hash = hasher.computeHashFromContent(content);

            expect(hash).toHaveLength(64);
            expect(hash).toMatch(/^[a-f0-9]{64}$/);
        });

        it('should match streaming hash for same content', async () => {
            const content = 'Consistent hashing test';
            const file = path.join(tempDir, 'test.md');
            fs.writeFileSync(file, content, 'utf8');

            const streamHash = await hasher.computeHash(file);
            const contentHash = hasher.computeHashFromContent(content);

            expect(streamHash).toBe(contentHash);
        });

        it('should handle empty string', () => {
            const hash = hasher.computeHashFromContent('');
            expect(hash).toHaveLength(64);
            // SHA-256 of empty string
            expect(hash).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
        });

        it('should handle Unicode characters', () => {
            const content = '你好世界 🚀';
            const hash = hasher.computeHashFromContent(content);

            expect(hash).toHaveLength(64);
            expect(hash).toMatch(/^[a-f0-9]{64}$/);
        });
    });

    describe('extractEmbeddedUuid', () => {
        it('should extract UUID from HTML comment in markdown', () => {
            const content = `---
title: Test Note
---
<!-- mujarrad-uuid: 123e4567-e89b-12d3-a456-426614174000 -->

# Heading

Content here.`;

            const uuid = hasher.extractEmbeddedUuid(content, 'markdown');

            expect(uuid).toBe('123e4567-e89b-12d3-a456-426614174000');
        });

        it('should extract UUID with extra whitespace', () => {
            const content = '<!--   mujarrad-uuid:   abc-123-def   -->';
            const uuid = hasher.extractEmbeddedUuid(content, 'markdown');

            expect(uuid).toBe('abc-123-def');
        });

        it('should return null if no UUID found', () => {
            const content = '# Just a regular note\n\nNo UUID here.';
            const uuid = hasher.extractEmbeddedUuid(content, 'markdown');

            expect(uuid).toBeNull();
        });

        it('should return null for canvas files (no UUID extraction)', () => {
            const content = '{"nodes": []}'; // Canvas JSON
            const uuid = hasher.extractEmbeddedUuid(content, 'canvas');

            expect(uuid).toBeNull();
        });

        it('should handle multiple UUID comments (return first)', () => {
            const content = `<!-- mujarrad-uuid: first-uuid -->
# Note
<!-- mujarrad-uuid: second-uuid -->`;

            const uuid = hasher.extractEmbeddedUuid(content, 'markdown');

            expect(uuid).toBe('first-uuid');
        });

        it('should be case-insensitive', () => {
            const content = '<!-- MUJARRAD-UUID: UPPER-CASE-UUID -->';
            const uuid = hasher.extractEmbeddedUuid(content, 'markdown');

            expect(uuid).toBe('UPPER-CASE-UUID');
        });
    });

    describe('processFile', () => {
        it('should process markdown file and return LocalFile object', async () => {
            const testFile = path.join(tempDir, 'note.md');
            const content = `---
title: Test Note
---
<!-- mujarrad-uuid: test-uuid-123 -->

# Content`;

            fs.writeFileSync(testFile, content, 'utf8');

            const result = await hasher.processFile(
                testFile,
                'note.md',
                'markdown'
            );

            expect(result.absolutePath).toBe(testFile);
            expect(result.relativePath).toBe('note.md');
            expect(result.content).toBe(content);
            expect(result.hash).toHaveLength(64);
            expect(result.fileType).toBe('markdown');
            expect(result.embeddedUuid).toBe('test-uuid-123');
            expect(result.lastModified).toMatch(/^\d{4}-\d{2}-\d{2}T/);
        });

        it('should process canvas file without UUID extraction', async () => {
            const canvasFile = path.join(tempDir, 'canvas.canvas');
            const content = '{"nodes": [], "edges": []}';

            fs.writeFileSync(canvasFile, content, 'utf8');

            const result = await hasher.processFile(
                canvasFile,
                'canvas.canvas',
                'canvas'
            );

            expect(result.fileType).toBe('canvas');
            expect(result.embeddedUuid).toBeNull();
            expect(result.content).toBe(content);
        });

        it('should throw error if file does not exist', async () => {
            const nonExistent = path.join(tempDir, 'does-not-exist.md');

            await expect(
                hasher.processFile(nonExistent, 'does-not-exist.md', 'markdown')
            ).rejects.toThrow(/Failed to process file/);
        });
    });

    describe('processFiles', () => {
        it('should process multiple files in batch', async () => {
            // Create 3 test files
            const file1 = path.join(tempDir, 'file1.md');
            const file2 = path.join(tempDir, 'file2.md');
            const file3 = path.join(tempDir, 'file3.canvas');

            fs.writeFileSync(file1, '# File 1', 'utf8');
            fs.writeFileSync(file2, '# File 2', 'utf8');
            fs.writeFileSync(file3, '{"nodes": []}', 'utf8');

            const files = [
                { absolutePath: file1, relativePath: 'file1.md', fileType: 'markdown' as const },
                { absolutePath: file2, relativePath: 'file2.md', fileType: 'markdown' as const },
                { absolutePath: file3, relativePath: 'file3.canvas', fileType: 'canvas' as const }
            ];

            const results = await hasher.processFiles(files);

            expect(results).toHaveLength(3);
            expect(results[0].relativePath).toBe('file1.md');
            expect(results[1].relativePath).toBe('file2.md');
            expect(results[2].relativePath).toBe('file3.canvas');
        });

        it('should continue processing after encountering error', async () => {
            const goodFile = path.join(tempDir, 'good.md');
            const badFile = path.join(tempDir, 'does-not-exist.md');

            fs.writeFileSync(goodFile, '# Good file', 'utf8');

            const files = [
                { absolutePath: goodFile, relativePath: 'good.md', fileType: 'markdown' as const },
                { absolutePath: badFile, relativePath: 'bad.md', fileType: 'markdown' as const }
            ];

            const results = await hasher.processFiles(files);

            // Should only have 1 successful result
            expect(results).toHaveLength(1);
            expect(results[0].relativePath).toBe('good.md');

            // Should log error for failed file
            expect(mockLogger.error).toHaveBeenCalledWith(
                'Failed to process file in batch',
                expect.objectContaining({
                    relativePath: 'bad.md'
                })
            );
        });

        it('should handle empty file list', async () => {
            const results = await hasher.processFiles([]);

            expect(results).toHaveLength(0);
        });

        it('should log batch processing summary', async () => {
            const file1 = path.join(tempDir, 'test.md');
            fs.writeFileSync(file1, 'test', 'utf8');

            await hasher.processFiles([
                { absolutePath: file1, relativePath: 'test.md', fileType: 'markdown' as const }
            ]);

            expect(mockLogger.info).toHaveBeenCalledWith(
                'Starting batch file processing',
                expect.objectContaining({ totalFiles: 1 })
            );

            expect(mockLogger.info).toHaveBeenCalledWith(
                'Batch file processing complete',
                expect.objectContaining({
                    totalFiles: 1,
                    successCount: 1,
                    failedCount: 0
                })
            );
        });
    });

    describe('verifyHash', () => {
        it('should return true if hash matches', async () => {
            const testFile = path.join(tempDir, 'verify.md');
            const content = 'Verify this content';
            fs.writeFileSync(testFile, content, 'utf8');

            const expectedHash = hasher.computeHashFromContent(content);
            const result = await hasher.verifyHash(testFile, expectedHash);

            expect(result).toBe(true);
        });

        it('should return false if hash does not match', async () => {
            const testFile = path.join(tempDir, 'verify.md');
            fs.writeFileSync(testFile, 'Original content', 'utf8');

            const wrongHash = hasher.computeHashFromContent('Different content');
            const result = await hasher.verifyHash(testFile, wrongHash);

            expect(result).toBe(false);

            // Should log warning
            expect(mockLogger.warn).toHaveBeenCalledWith(
                'Hash mismatch detected',
                expect.objectContaining({
                    filePath: testFile,
                    expectedHash: wrongHash
                })
            );
        });

        it('should return false if file does not exist', async () => {
            const nonExistent = path.join(tempDir, 'does-not-exist.md');
            const result = await hasher.verifyHash(nonExistent, 'any-hash');

            expect(result).toBe(false);
            expect(mockLogger.error).toHaveBeenCalledWith(
                'Failed to verify hash',
                expect.any(Object)
            );
        });
    });

    describe('Performance', () => {
        it('should handle 100 files efficiently', async () => {
            // Create 100 test files
            const files = Array.from({ length: 100 }, (_, i) => {
                const filePath = path.join(tempDir, `file-${i}.md`);
                fs.writeFileSync(filePath, `Content ${i}`, 'utf8');
                return {
                    absolutePath: filePath,
                    relativePath: `file-${i}.md`,
                    fileType: 'markdown' as const
                };
            });

            const startTime = Date.now();
            const results = await hasher.processFiles(files);
            const duration = Date.now() - startTime;

            expect(results).toHaveLength(100);
            expect(duration).toBeLessThan(3000); // Should complete in <3s
        });
    });
});
