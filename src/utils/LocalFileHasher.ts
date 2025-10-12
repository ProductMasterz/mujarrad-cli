/**
 * LocalFileHasher utility
 * Feature: 009-init-command-enhancement
 * Task: T033 - Create LocalFileHasher utility
 *
 * Computes SHA-256 hashes for local files and extracts embedded UUIDs.
 * Used by comparison phase to generate hashes for local vault files.
 *
 * Features:
 * - SHA-256 hash computation (lowercase hex)
 * - UUID extraction from HTML comments (markdown files only)
 * - Memory-efficient streaming for large files
 * - Batch processing support
 */

import * as fs from 'fs';
import * as crypto from 'crypto';
import type { LocalFile } from '../types/sync.js';
import { Logger } from './Logger.js';

/**
 * LocalFileHasher - Compute hashes and extract metadata from local files
 *
 * @class LocalFileHasher
 */
export class LocalFileHasher {
    private readonly logger: Logger;

    constructor(logger: Logger) {
        this.logger = logger;
    }

    /**
     * Compute SHA-256 hash of file content
     *
     * Uses streaming for memory efficiency with large files.
     * Returns lowercase hex string (64 characters).
     *
     * @param filePath - Absolute path to file
     * @returns Promise<string> - SHA-256 hash (lowercase hex)
     */
    async computeHash(filePath: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const hash = crypto.createHash('sha256');
            const stream = fs.createReadStream(filePath);

            stream.on('data', (chunk) => {
                hash.update(chunk);
            });

            stream.on('end', () => {
                const hexHash = hash.digest('hex');
                this.logger.debug('Hash computed', {
                    filePath,
                    hash: hexHash
                });
                resolve(hexHash);
            });

            stream.on('error', (error) => {
                this.logger.error('Failed to compute hash', {
                    filePath,
                    error: error.message
                });
                reject(error);
            });
        });
    }

    /**
     * Compute hash from string content (non-streaming)
     *
     * Used when content is already in memory (e.g., after reading file).
     *
     * @param content - File content string
     * @returns string - SHA-256 hash (lowercase hex)
     */
    computeHashFromContent(content: string): string {
        const hash = crypto.createHash('sha256');
        hash.update(content, 'utf8');
        return hash.digest('hex');
    }

    /**
     * Extract UUID from markdown file content
     *
     * Looks for HTML comment in format: <!-- mujarrad-uuid: {uuid} -->
     * Returns null if no UUID found or file is not markdown.
     *
     * @param content - File content
     * @param fileType - File type (markdown or canvas)
     * @returns string | null - Extracted UUID or null
     */
    extractEmbeddedUuid(content: string, fileType: 'markdown' | 'canvas'): string | null {
        // Canvas files don't have embedded UUIDs
        if (fileType === 'canvas') {
            return null;
        }

        // Look for UUID comment in markdown (flexible format)
        // Matches: <!-- mujarrad-uuid: {uuid} --> with optional whitespace
        const uuidRegex = /<!--\s*mujarrad-uuid:\s*([a-zA-Z0-9-]+)\s*-->/i;
        const match = content.match(uuidRegex);

        if (match) {
            const uuid = match[1].trim();
            this.logger.debug('Extracted embedded UUID', { uuid });
            return uuid;
        }

        return null;
    }

    /**
     * Process single file and compute hash with metadata
     *
     * Reads file, computes hash, extracts UUID (if markdown).
     * Returns LocalFile object ready for comparison.
     *
     * @param absolutePath - Absolute path to file
     * @param relativePath - Relative path within vault
     * @param fileType - File type (markdown or canvas)
     * @returns Promise<LocalFile> - File with hash and metadata
     */
    async processFile(
        absolutePath: string,
        relativePath: string,
        fileType: 'markdown' | 'canvas'
    ): Promise<LocalFile> {
        try {
            // Read file content
            const content = fs.readFileSync(absolutePath, 'utf8');

            // Compute hash
            const hash = this.computeHashFromContent(content);

            // Extract UUID
            const embeddedUuid = this.extractEmbeddedUuid(content, fileType);

            // Get file stats for lastModified
            const stats = fs.statSync(absolutePath);
            const lastModified = stats.mtime.toISOString();

            this.logger.debug('Processed file', {
                relativePath,
                hash,
                embeddedUuid,
                fileType,
                sizeBytes: content.length
            });

            return {
                absolutePath,
                relativePath,
                content,
                hash,
                lastModified,
                fileType,
                embeddedUuid
            };

        } catch (error: any) {
            this.logger.error('Failed to process file', {
                absolutePath,
                relativePath,
                error: error.message
            });
            throw new Error(`Failed to process file ${relativePath}: ${error.message}`);
        }
    }

    /**
     * Process multiple files in batch
     *
     * Processes all files sequentially (to avoid memory issues with large vaults).
     * Returns array of LocalFile objects.
     *
     * @param files - Array of file paths to process
     * @returns Promise<LocalFile[]> - Processed files with hashes
     */
    async processFiles(
        files: Array<{ absolutePath: string; relativePath: string; fileType: 'markdown' | 'canvas' }>
    ): Promise<LocalFile[]> {
        this.logger.info('Starting batch file processing', {
            totalFiles: files.length
        });

        const results: LocalFile[] = [];

        for (const file of files) {
            try {
                const processedFile = await this.processFile(
                    file.absolutePath,
                    file.relativePath,
                    file.fileType
                );
                results.push(processedFile);
            } catch (error: any) {
                // Log error but continue processing other files
                this.logger.error('Failed to process file in batch', {
                    relativePath: file.relativePath,
                    error: error.message
                });
                // Don't throw - continue with other files
            }
        }

        this.logger.info('Batch file processing complete', {
            totalFiles: files.length,
            successCount: results.length,
            failedCount: files.length - results.length
        });

        return results;
    }

    /**
     * Verify hash matches expected value
     *
     * Used for integrity checking after download or sync.
     *
     * @param filePath - Absolute path to file
     * @param expectedHash - Expected SHA-256 hash
     * @returns Promise<boolean> - True if hash matches
     */
    async verifyHash(filePath: string, expectedHash: string): Promise<boolean> {
        try {
            const actualHash = await this.computeHash(filePath);
            const matches = actualHash === expectedHash;

            if (!matches) {
                this.logger.warn('Hash mismatch detected', {
                    filePath,
                    expectedHash,
                    actualHash
                });
            }

            return matches;
        } catch (error: any) {
            this.logger.error('Failed to verify hash', {
                filePath,
                error: error.message
            });
            return false;
        }
    }
}
