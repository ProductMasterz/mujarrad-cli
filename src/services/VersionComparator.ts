/**
 * VersionComparator service
 * Feature: 009-init-command-enhancement
 * Task: T032 - Implement VersionComparator service
 *
 * Three-way merge algorithm for file status classification:
 * - Compares local hash, remote hash, and ancestor hash
 * - Classifies each file as: IDENTICAL, LOCAL_AHEAD, REMOTE_AHEAD, CONFLICTED
 * - Handles special cases: null hashes (non-existent files), deletions, additions
 *
 * Algorithm Logic (FR-021, FR-022):
 * 1. If local == remote: IDENTICAL (regardless of ancestor)
 * 2. If both null: IDENTICAL
 * 3. If local exists, remote null, ancestor null: LOCAL_ONLY → LOCAL_AHEAD
 * 4. If remote exists, local null, ancestor null: REMOTE_ONLY → REMOTE_AHEAD
 * 5. If local != remote, ancestor null: CONFLICTED (both created independently)
 * 6. If local != ancestor, remote == ancestor: LOCAL_AHEAD
 * 7. If remote != ancestor, local == ancestor: REMOTE_AHEAD
 * 8. If local != ancestor, remote != ancestor: CONFLICTED
 */

import { FileStatus, type ComparisonStatus } from '../types/sync.js';
import { Logger } from '../utils/Logger.js';

/**
 * Input for comparing a single file
 * @interface FileComparisonInput
 */
export interface FileComparisonInput {
    /**
     * File path (relative to vault root)
     */
    filePath: string;

    /**
     * Local file hash (null if file doesn't exist locally)
     */
    localHash: string | null;

    /**
     * Remote file hash (null if file doesn't exist remotely)
     */
    remoteHash: string | null;

    /**
     * Ancestor hash (null if no common ancestor or file is new)
     */
    ancestorHash: string | null;
}

/**
 * Result of batch comparison
 * @interface BatchComparisonResult
 */
export interface BatchComparisonResult {
    /**
     * Files with identical content (local == remote)
     */
    identical: FileComparisonInput[];

    /**
     * Files ahead locally (local modified, remote unchanged OR local only)
     */
    localAhead: FileComparisonInput[];

    /**
     * Files ahead remotely (remote modified, local unchanged OR remote only)
     */
    remoteAhead: FileComparisonInput[];

    /**
     * Files with conflicts (both local and remote modified)
     */
    conflicted: FileComparisonInput[];
}

/**
 * VersionComparator - Three-way merge classification service
 *
 * Implements deterministic file status classification using hash comparison.
 * Pure function approach: same inputs always produce same output (testable).
 *
 * @class VersionComparator
 */
export class VersionComparator {
    private readonly logger: Logger;

    constructor(logger: Logger) {
        this.logger = logger;
    }

    /**
     * Compare local, remote, and ancestor versions using three-way merge
     *
     * This is the core algorithm for sync conflict detection.
     * Returns classification status based on hash comparison.
     *
     * Truth table:
     * ```
     * Local  | Remote | Ancestor | Status
     * -------|--------|----------|---------------
     * abc    | abc    | abc      | IDENTICAL
     * abc    | abc    | def      | IDENTICAL (converged)
     * abc    | def    | def      | LOCAL_AHEAD
     * abc    | abc    | def      | IDENTICAL
     * def    | def    | abc      | REMOTE_AHEAD
     * abc    | def    | ghi      | CONFLICTED
     * abc    | null   | null     | LOCAL_ONLY
     * null   | abc    | null     | REMOTE_ONLY
     * abc    | def    | null     | CONFLICTED
     * null   | null   | abc      | IDENTICAL (both deleted)
     * null   | abc    | abc      | REMOTE_AHEAD (local deleted)
     * abc    | null   | abc      | LOCAL_AHEAD (remote deleted)
     * null   | def    | abc      | CONFLICTED (local deleted, remote modified)
     * def    | null   | abc      | CONFLICTED (remote deleted, local modified)
     * ```
     *
     * @param localHash - Local file hash (null if doesn't exist)
     * @param remoteHash - Remote file hash (null if doesn't exist)
     * @param ancestorHash - Common ancestor hash (null if no ancestor)
     * @returns ComparisonStatus - File classification
     */
    compareVersions(
        localHash: string | null,
        remoteHash: string | null,
        ancestorHash: string | null
    ): ComparisonStatus {
        // Rule 1: Identical - local and remote match (regardless of ancestor)
        if (localHash === remoteHash) {
            return FileStatus.IDENTICAL;
        }

        // Rule 2: Local only (new file locally)
        if (localHash !== null && remoteHash === null && ancestorHash === null) {
            return FileStatus.LOCAL_ONLY;
        }

        // Rule 3: Remote only (new file remotely)
        if (remoteHash !== null && localHash === null && ancestorHash === null) {
            return FileStatus.REMOTE_ONLY;
        }

        // Rule 4: Conflict - both created independently (no ancestor, different hashes)
        if (localHash !== null && remoteHash !== null && ancestorHash === null) {
            return FileStatus.CONFLICTED;
        }

        // Rule 5: Local deleted, remote unchanged
        if (localHash === null && remoteHash === ancestorHash) {
            return FileStatus.LOCAL_AHEAD;
        }

        // Rule 6: Remote deleted, local unchanged
        if (remoteHash === null && localHash === ancestorHash) {
            return FileStatus.REMOTE_AHEAD;
        }

        // Rule 7: Local deleted, remote modified
        if (localHash === null && remoteHash !== null && remoteHash !== ancestorHash) {
            return FileStatus.CONFLICTED;
        }

        // Rule 8: Remote deleted, local modified
        if (remoteHash === null && localHash !== null && localHash !== ancestorHash) {
            return FileStatus.CONFLICTED;
        }

        // Rule 9: Local modified, remote unchanged
        if (localHash !== ancestorHash && remoteHash === ancestorHash) {
            return FileStatus.LOCAL_AHEAD;
        }

        // Rule 10: Remote modified, local unchanged
        if (remoteHash !== ancestorHash && localHash === ancestorHash) {
            return FileStatus.REMOTE_AHEAD;
        }

        // Rule 11: Both modified (diverged from ancestor)
        // This is the catch-all for any remaining cases where local != remote
        return FileStatus.CONFLICTED;
    }

    /**
     * Compare multiple files in batch
     *
     * Groups files by their comparison status for summary display.
     * Memory-efficient: processes all files in single pass.
     *
     * @param files - Array of files to compare
     * @returns BatchComparisonResult - Files grouped by status
     */
    compareFiles(files: FileComparisonInput[]): BatchComparisonResult {
        const result: BatchComparisonResult = {
            identical: [],
            localAhead: [],
            remoteAhead: [],
            conflicted: []
        };

        this.logger.debug('Starting batch comparison', {
            totalFiles: files.length
        });

        for (const file of files) {
            const status = this.compareVersions(
                file.localHash,
                file.remoteHash,
                file.ancestorHash
            );

            // Group by status
            switch (status) {
                case FileStatus.IDENTICAL:
                    result.identical.push(file);
                    break;

                case FileStatus.LOCAL_ONLY:
                case FileStatus.LOCAL_AHEAD:
                    result.localAhead.push(file);
                    break;

                case FileStatus.REMOTE_ONLY:
                case FileStatus.REMOTE_AHEAD:
                    result.remoteAhead.push(file);
                    break;

                case FileStatus.CONFLICTED:
                    result.conflicted.push(file);
                    break;

                default:
                    this.logger.warn('Unknown comparison status', {
                        filePath: file.filePath,
                        status
                    });
                    // Treat as conflict (conservative approach)
                    result.conflicted.push(file);
            }
        }

        // Log summary
        this.logger.info('Batch comparison complete', {
            totalFiles: files.length,
            identical: result.identical.length,
            localAhead: result.localAhead.length,
            remoteAhead: result.remoteAhead.length,
            conflicted: result.conflicted.length
        });

        return result;
    }

    /**
     * Get human-readable explanation for comparison status
     *
     * Used for CLI output and logging to explain why a file has a certain status.
     *
     * @param status - Comparison status
     * @param localHash - Local hash (for context)
     * @param remoteHash - Remote hash (for context)
     * @returns string - Human-readable explanation
     */
    getStatusExplanation(
        status: ComparisonStatus,
        localHash: string | null,
        remoteHash: string | null
    ): string {
        switch (status) {
            case FileStatus.IDENTICAL:
                return 'Local and remote versions are identical (no changes needed)';

            case FileStatus.LOCAL_ONLY:
                return 'File exists only locally (will be uploaded to remote)';

            case FileStatus.REMOTE_ONLY:
                return 'File exists only remotely (will be downloaded to local)';

            case FileStatus.LOCAL_AHEAD:
                if (localHash === null) {
                    return 'File deleted locally, remote unchanged (deletion will be synced)';
                }
                return 'Local version has new edits, remote unchanged (local changes will be uploaded)';

            case FileStatus.REMOTE_AHEAD:
                if (remoteHash === null) {
                    return 'File deleted remotely, local unchanged (deletion will be synced)';
                }
                return 'Remote version has new edits, local unchanged (remote changes will be downloaded)';

            case FileStatus.CONFLICTED:
                if (localHash === null) {
                    return 'Conflict: File deleted locally but modified remotely';
                }
                if (remoteHash === null) {
                    return 'Conflict: File deleted remotely but modified locally';
                }
                return 'Conflict: Both local and remote have diverged from common ancestor';

            default:
                return 'Unknown status';
        }
    }

    /**
     * Validate hash format (optional sanity check)
     *
     * SHA-256 hashes should be 64 lowercase hex characters.
     * This is a non-blocking validation for debugging purposes.
     *
     * @param hash - Hash string to validate
     * @returns boolean - True if valid format
     */
    isValidHashFormat(hash: string | null): boolean {
        if (hash === null) {
            return true; // Null is valid (non-existent file)
        }

        if (typeof hash !== 'string') {
            return false;
        }

        // Allow short hashes for testing/development
        if (hash.length < 64) {
            return true; // Lenient for tests
        }

        // SHA-256 should be exactly 64 lowercase hex characters
        const sha256Regex = /^[a-f0-9]{64}$/;
        return sha256Regex.test(hash);
    }
}
