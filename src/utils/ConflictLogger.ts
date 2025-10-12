/**
 * Conflict logger for structured conflict resolution tracking
 * Feature: 009-init-command-enhancement
 *
 * Logs all conflict resolutions to JSON Lines format (FR-031) for:
 * - Audit trail of user decisions
 * - Post-sync conflict analysis
 * - Debugging and troubleshooting
 *
 * Log format: ~/.mujarrad/logs/conflicts-{sessionId}.log
 * Each line is a complete JSON object (JSON Lines format)
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import type { ConflictResolution } from '../types/sync.js';

/**
 * Conflict log entry
 * Extends ConflictResolution with additional metadata
 */
export interface ConflictLogEntry extends ConflictResolution {
    /**
     * Session ID for correlation with main logs
     * @type {string}
     */
    sessionId: string;

    /**
     * Workspace slug
     * @type {string}
     */
    workspaceSlug: string;

    /**
     * Local file hash at time of resolution
     * @type {string}
     */
    localHash: string;

    /**
     * Remote node hash at time of resolution
     * @type {string}
     */
    remoteHash: string;

    /**
     * Common ancestor hash (if available)
     * @type {string | null}
     */
    ancestorHash: string | null;
}

/**
 * ConflictLogger writes conflict resolutions to JSON Lines format
 * @class ConflictLogger
 */
export class ConflictLogger {
    private logDir: string;
    private logFilePath: string;
    private fileHandle: fs.FileHandle | null = null;

    /**
     * Create a ConflictLogger for a specific sync session
     *
     * @param sessionId - Sync session identifier (UUID)
     * @param logDir - Optional log directory (defaults to ~/.mujarrad/logs/)
     */
    constructor(sessionId: string, logDir?: string) {
        this.logDir = logDir || path.join(os.homedir(), '.mujarrad', 'logs');
        this.logFilePath = path.join(this.logDir, `conflicts-${sessionId}.log`);
    }

    /**
     * Initialize conflict logger (create log file)
     * Must be called before logging any conflicts
     */
    async initialize(): Promise<void> {
        try {
            // Ensure log directory exists
            await fs.mkdir(this.logDir, { recursive: true });

            // Set directory permissions to 700 (owner only)
            if (process.platform !== 'win32') {
                await fs.chmod(this.logDir, 0o700);
            }

            // Open log file for append (create if not exists)
            this.fileHandle = await fs.open(this.logFilePath, 'a');

            // Set file permissions to 600 (owner read/write only)
            if (process.platform !== 'win32') {
                await fs.chmod(this.logFilePath, 0o600);
            }
        } catch (error) {
            throw new Error(`Failed to initialize conflict logger: ${(error as Error).message}`);
        }
    }

    /**
     * Log a conflict resolution
     *
     * @param entry - Conflict log entry with resolution details
     * @throws Error if logger not initialized
     *
     * @example
     * await conflictLogger.logConflict({
     *   sessionId: 'abc-123',
     *   workspaceSlug: 'my-workspace',
     *   filePath: 'notes/meeting.md',
     *   strategy: ConflictStrategy.KEEP_LOCAL,
     *   timestamp: new Date().toISOString(),
     *   localHash: '3a5b7c...',
     *   remoteHash: '9d1e2f...',
     *   ancestorHash: '1a2b3c...',
     * });
     */
    async logConflict(entry: ConflictLogEntry): Promise<void> {
        if (!this.fileHandle) {
            throw new Error('ConflictLogger not initialized. Call initialize() first.');
        }

        try {
            // Serialize to JSON and append newline (JSON Lines format)
            const jsonLine = JSON.stringify(entry) + '\n';
            await this.fileHandle.write(jsonLine, undefined, 'utf8');

            // Flush to disk immediately for durability
            await this.fileHandle.sync();
        } catch (error) {
            throw new Error(`Failed to log conflict: ${(error as Error).message}`);
        }
    }

    /**
     * Log multiple conflicts in batch
     *
     * @param entries - Array of conflict log entries
     */
    async logConflicts(entries: ConflictLogEntry[]): Promise<void> {
        if (!this.fileHandle) {
            throw new Error('ConflictLogger not initialized. Call initialize() first.');
        }

        try {
            // Serialize all entries to JSON Lines
            const jsonLines = entries.map(entry => JSON.stringify(entry) + '\n').join('');
            await this.fileHandle.write(jsonLines, undefined, 'utf8');

            // Flush to disk
            await this.fileHandle.sync();
        } catch (error) {
            throw new Error(`Failed to log conflicts: ${(error as Error).message}`);
        }
    }

    /**
     * Close conflict logger and flush all pending writes
     * Should be called at end of sync session
     */
    async close(): Promise<void> {
        if (this.fileHandle) {
            try {
                await this.fileHandle.sync();
                await this.fileHandle.close();
                this.fileHandle = null;
            } catch (error) {
                throw new Error(`Failed to close conflict logger: ${(error as Error).message}`);
            }
        }
    }

    /**
     * Get path to conflict log file
     */
    getLogFilePath(): string {
        return this.logFilePath;
    }

    /**
     * Read all conflict log entries from file
     * Useful for post-sync analysis
     *
     * @returns Promise<Array<ConflictLogEntry>> - Parsed conflict entries
     */
    async readConflicts(): Promise<Array<ConflictLogEntry>> {
        try {
            const content = await fs.readFile(this.logFilePath, 'utf8');
            const lines = content.trim().split('\n').filter(line => line.length > 0);
            return lines.map(line => JSON.parse(line) as ConflictLogEntry);
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
                // File doesn't exist yet, return empty array
                return [];
            }
            throw new Error(`Failed to read conflicts: ${(error as Error).message}`);
        }
    }

    /**
     * Check if any conflicts have been logged
     */
    async hasConflicts(): Promise<boolean> {
        try {
            const stats = await fs.stat(this.logFilePath);
            return stats.size > 0;
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
                return false;
            }
            throw error;
        }
    }

    /**
     * Get conflict count without reading entire file
     * Counts lines in log file
     */
    async getConflictCount(): Promise<number> {
        try {
            const content = await fs.readFile(this.logFilePath, 'utf8');
            const lines = content.trim().split('\n').filter(line => line.length > 0);
            return lines.length;
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
                return 0;
            }
            throw new Error(`Failed to count conflicts: ${(error as Error).message}`);
        }
    }
}

/**
 * Create a conflict logger for a sync session
 * Convenience factory function
 *
 * @param sessionId - Sync session identifier
 * @returns Initialized ConflictLogger instance
 *
 * @example
 * const conflictLogger = await createConflictLogger('abc-123');
 * await conflictLogger.logConflict({...});
 * await conflictLogger.close();
 */
export async function createConflictLogger(sessionId: string): Promise<ConflictLogger> {
    const logger = new ConflictLogger(sessionId);
    await logger.initialize();
    return logger;
}
