/**
 * Hash utility for content comparison and integrity verification
 * Feature: 009-init-command-enhancement
 *
 * Provides SHA-256 hashing for:
 * - File content comparison (FR-021, FR-022)
 * - Integrity verification during downloads (FR-016)
 * - Three-way merge ancestor detection (FR-008, FR-009)
 *
 * All hashes are lowercase hexadecimal (64 characters) matching backend format.
 */

import crypto from 'crypto';
import fs from 'fs/promises';

/**
 * Compute SHA-256 hash of string content
 *
 * @param content - String content to hash
 * @returns Lowercase hex SHA-256 hash (64 characters)
 *
 * @example
 * const hash = computeHash("# My Note\n\nContent here");
 * // Returns: "3a5b7c9d1e2f4a6b8c0d2e4f6a8b0c2d4e6f8a0b2c4d6e8f0a2b4c6d8e0f2a4"
 */
export function computeHash(content: string): string {
    return crypto
        .createHash('sha256')
        .update(content, 'utf8')
        .digest('hex')
        .toLowerCase();
}

/**
 * Compute SHA-256 hash of file content
 *
 * @param filePath - Absolute path to file
 * @returns Promise<string> - Lowercase hex SHA-256 hash
 * @throws Error if file cannot be read
 *
 * @example
 * const hash = await computeFileHash("/path/to/vault/note.md");
 */
export async function computeFileHash(filePath: string): Promise<string> {
    try {
        const content = await fs.readFile(filePath, 'utf8');
        return computeHash(content);
    } catch (error) {
        throw new Error(`Failed to compute hash for file ${filePath}: ${(error as Error).message}`);
    }
}

/**
 * Verify file content matches expected hash
 *
 * Used during transactional downloads (FR-016) to verify
 * staged files before moving to final location.
 *
 * @param filePath - Absolute path to file
 * @param expectedHash - Expected SHA-256 hash (lowercase hex)
 * @returns Promise<boolean> - True if hashes match
 *
 * @example
 * const isValid = await verifyFileHash(
 *   "/tmp/staging/note.md",
 *   "3a5b7c9d1e2f4a6b8c0d2e4f6a8b0c2d4e6f8a0b2c4d6e8f0a2b4c6d8e0f2a4"
 * );
 */
export async function verifyFileHash(
    filePath: string,
    expectedHash: string
): Promise<boolean> {
    try {
        const actualHash = await computeFileHash(filePath);
        return actualHash === expectedHash.toLowerCase();
    } catch (error) {
        // If file cannot be read, verification fails
        return false;
    }
}

/**
 * Compare two hashes for equality
 *
 * Normalizes both hashes to lowercase before comparison
 * to handle potential case inconsistencies.
 *
 * @param hash1 - First hash (any case)
 * @param hash2 - Second hash (any case)
 * @returns boolean - True if hashes are equal
 *
 * @example
 * const isEqual = compareHashes(localHash, remoteHash);
 */
export function compareHashes(hash1: string, hash2: string): boolean {
    return hash1.toLowerCase() === hash2.toLowerCase();
}

/**
 * Validate hash format
 *
 * Checks if a string is a valid SHA-256 hash:
 * - Exactly 64 characters
 * - Only hexadecimal characters (0-9, a-f, A-F)
 *
 * @param hash - Hash string to validate
 * @returns boolean - True if valid SHA-256 hash format
 *
 * @example
 * const isValid = isValidHash("3a5b7c9d...");
 */
export function isValidHash(hash: string): boolean {
    return /^[a-fA-F0-9]{64}$/.test(hash);
}

/**
 * Compute hash with null safety
 *
 * Convenience wrapper that returns null if content is null/undefined
 * instead of throwing an error. Useful for optional fields.
 *
 * @param content - String content to hash (nullable)
 * @returns string | null - Hash or null if content is null/undefined
 *
 * @example
 * const hash = computeHashSafe(ancestorContent);
 * // Returns null if ancestorContent is null
 */
export function computeHashSafe(content: string | null | undefined): string | null {
    if (content === null || content === undefined) {
        return null;
    }
    return computeHash(content);
}

/**
 * Batch compute hashes for multiple files
 *
 * Efficiently computes hashes for many files in parallel.
 * Useful during vault scanning.
 *
 * @param filePaths - Array of absolute file paths
 * @param concurrency - Maximum parallel hash computations (default: 10)
 * @returns Promise<Map<string, string>> - Map of filePath → hash
 *
 * @example
 * const hashes = await batchComputeFileHashes([
 *   "/vault/note1.md",
 *   "/vault/note2.md",
 * ], 5);
 * const note1Hash = hashes.get("/vault/note1.md");
 */
export async function batchComputeFileHashes(
    filePaths: string[],
    concurrency: number = 10
): Promise<Map<string, string>> {
    const results = new Map<string, string>();

    // Process files in chunks to limit parallelism
    for (let i = 0; i < filePaths.length; i += concurrency) {
        const chunk = filePaths.slice(i, i + concurrency);
        const chunkResults = await Promise.allSettled(
            chunk.map(async (filePath) => {
                const hash = await computeFileHash(filePath);
                return { filePath, hash };
            })
        );

        // Store successful results, ignore failures
        for (const result of chunkResults) {
            if (result.status === 'fulfilled') {
                results.set(result.value.filePath, result.value.hash);
            }
        }
    }

    return results;
}
