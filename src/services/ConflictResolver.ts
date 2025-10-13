/**
 * ConflictResolver service
 * Feature: 009-init-command-enhancement
 * Task: T039 - Implement ConflictResolver service
 *
 * Handles conflict resolution with multiple strategies:
 * - KEEP_LOCAL: Automatically keep local version
 * - KEEP_REMOTE: Automatically keep remote version
 * - SKIP: Skip conflicted files (no resolution)
 * - INTERACTIVE: Prompt user for each conflict (to be implemented)
 *
 * Provides:
 * - Content preview generation (first 500 chars)
 * - Diff summary (character count differences)
 * - Batch conflict resolution
 * - Structured logging
 */

import { ConflictStrategy } from '../types/sync.js';
import { Logger } from '../utils/Logger.js';

/**
 * Input for resolving a single conflict
 * @interface ConflictResolutionInput
 */
export interface ConflictResolutionInput {
    /**
     * File path (relative to vault root)
     */
    filePath: string;

    /**
     * Local file content (null if deleted locally)
     */
    localContent: string | null;

    /**
     * Remote file content (null if deleted remotely)
     */
    remoteContent: string | null;

    /**
     * Local file hash
     */
    localHash: string | null;

    /**
     * Remote file hash
     */
    remoteHash: string | null;
}

/**
 * Result of conflict resolution
 * @interface ConflictResolutionResult
 */
export interface ConflictResolutionResult {
    /**
     * File path
     */
    filePath: string;

    /**
     * Resolution strategy used
     */
    resolution: ConflictStrategy;

    /**
     * Chosen content (null if skipped)
     */
    chosenContent: string | null;

    /**
     * Chosen hash (null if skipped)
     */
    chosenHash: string | null;

    /**
     * Timestamp of resolution
     */
    timestamp: string;
}

/**
 * ConflictResolver - Handles conflict resolution with various strategies
 *
 * @class ConflictResolver
 */
export class ConflictResolver {
    private readonly logger: Logger;

    constructor(logger: Logger) {
        this.logger = logger;
    }

    /**
     * Resolve single conflict using specified strategy
     *
     * @param conflict - Conflict to resolve
     * @param strategy - Resolution strategy
     * @returns Promise<ConflictResolutionResult> - Resolution result
     */
    async resolveConflict(
        conflict: ConflictResolutionInput,
        strategy: ConflictStrategy
    ): Promise<ConflictResolutionResult> {
        this.logger.debug('Resolving conflict', {
            filePath: conflict.filePath,
            strategy
        });

        let chosenContent: string | null = null;
        let chosenHash: string | null = null;

        switch (strategy) {
            case ConflictStrategy.KEEP_LOCAL:
                chosenContent = conflict.localContent;
                chosenHash = conflict.localHash;
                break;

            case ConflictStrategy.KEEP_REMOTE:
                chosenContent = conflict.remoteContent;
                chosenHash = conflict.remoteHash;
                break;

            case ConflictStrategy.SKIP:
                // No content chosen - skip this file
                chosenContent = null;
                chosenHash = null;
                break;

            case ConflictStrategy.INTERACTIVE:
                // Interactive resolution not yet implemented
                // For now, default to SKIP
                this.logger.warn('INTERACTIVE strategy not yet implemented, defaulting to SKIP', {
                    filePath: conflict.filePath
                });
                chosenContent = null;
                chosenHash = null;
                break;

            default:
                throw new Error(`Unknown conflict strategy: ${strategy}`);
        }

        const result: ConflictResolutionResult = {
            filePath: conflict.filePath,
            resolution: strategy,
            chosenContent,
            chosenHash,
            timestamp: new Date().toISOString()
        };

        this.logger.info('Conflict resolved', {
            filePath: conflict.filePath,
            strategy,
            chosenHash
        });

        return result;
    }

    /**
     * Resolve multiple conflicts in batch using same strategy
     *
     * @param conflicts - Array of conflicts to resolve
     * @param strategy - Resolution strategy to apply to all
     * @returns Promise<ConflictResolutionResult[]> - Resolution results
     */
    async resolveConflicts(
        conflicts: ConflictResolutionInput[],
        strategy: ConflictStrategy
    ): Promise<ConflictResolutionResult[]> {
        if (conflicts.length === 0) {
            return [];
        }

        this.logger.info('Starting batch conflict resolution', {
            totalConflicts: conflicts.length,
            strategy
        });

        const results: ConflictResolutionResult[] = [];

        for (const conflict of conflicts) {
            const result = await this.resolveConflict(conflict, strategy);
            results.push(result);
        }

        this.logger.info('Batch conflict resolution complete', {
            totalConflicts: conflicts.length,
            strategy,
            resolved: results.filter(r => r.chosenContent !== null).length,
            skipped: results.filter(r => r.chosenContent === null).length
        });

        return results;
    }

    /**
     * Generate preview of file content (first 500 characters)
     *
     * Used for displaying conflict details to user.
     *
     * @param content - File content
     * @returns string - Preview with ellipsis if truncated
     */
    generatePreview(content: string | null): string {
        if (content === null) {
            return '(file deleted)';
        }

        if (content.length === 0) {
            return '';
        }

        const maxLength = 500;
        if (content.length <= maxLength) {
            return content;
        }

        return content.substring(0, maxLength) + '...';
    }

    /**
     * Generate diff summary showing character count differences
     *
     * Format: "+N / -M characters" where N is additions, M is deletions
     *
     * @param localContent - Local file content
     * @param remoteContent - Remote file content
     * @returns string - Diff summary
     */
    generateDiffSummary(localContent: string | null, remoteContent: string | null): string {
        const localLength = localContent?.length || 0;
        const remoteLength = remoteContent?.length || 0;

        if (localLength === remoteLength) {
            return 'No difference in length (content may differ)';
        }

        const diff = remoteLength - localLength;

        if (diff > 0) {
            return `+${diff} / -0 characters (remote longer)`;
        } else {
            return `+0 / ${diff} characters (local longer)`;
        }
    }
}
