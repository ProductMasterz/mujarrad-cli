/**
 * TypeScript interfaces for Init Command Enhancement (009-init-command-enhancement)
 *
 * This file defines all entities used in bidirectional sync operations:
 * - Workspace Metadata (FR-001, FR-004, FR-005)
 * - Remote Node (FR-007, FR-014, FR-019)
 * - Local File (FR-021, FR-022)
 * - Comparison Result (FR-021, FR-022, FR-023, FR-024)
 * - Conflict Resolution (FR-026-FR-035)
 *
 * These interfaces provide type safety for the sync feature implementation.
 */

import type { WorkspaceMetadata as ApiWorkspaceMetadata, RemoteNode as ApiRemoteNode } from '../api/generated/index.js';

/**
 * Workspace metadata for pre-flight verification
 * Re-export from API client with additional CLI-specific methods
 */
export type WorkspaceMetadata = ApiWorkspaceMetadata;

/**
 * Remote node representation
 * Re-export from API client with additional CLI-specific methods
 */
export type RemoteNode = ApiRemoteNode;

/**
 * Local file representation in Obsidian vault
 * @interface LocalFile
 */
export interface LocalFile {
    /**
     * Absolute path to file on local filesystem
     * @type {string}
     */
    absolutePath: string;

    /**
     * Relative path within vault (forward slashes, no leading slash)
     * Matches RemoteNode.filePath format
     * @type {string}
     * @example "meetings/2025-10-12.md"
     */
    relativePath: string;

    /**
     * File content (markdown or canvas JSON)
     * @type {string}
     */
    content: string;

    /**
     * SHA-256 hash of content (lowercase hex)
     * @type {string}
     */
    hash: string;

    /**
     * ISO 8601 timestamp of last modification (from filesystem mtime)
     * @type {string}
     */
    lastModified: string;

    /**
     * File type (markdown or canvas)
     * @type {string}
     */
    fileType: 'markdown' | 'canvas';

    /**
     * UUID from embedded comment (if exists locally)
     * Used to match local files with remote nodes
     * @type {string | null}
     */
    embeddedUuid: string | null;
}

/**
 * Comparison status classification
 * See FR-022 for classification rules
 */
export enum ComparisonStatus {
    /**
     * Local and remote have identical content (same hash)
     * Action: Skip upload (FR-025)
     */
    IDENTICAL = 'IDENTICAL',

    /**
     * File only exists locally, not in remote workspace
     * Action: Upload to remote
     */
    LOCAL_ONLY = 'LOCAL_ONLY',

    /**
     * File only exists remotely, not in local vault
     * Action: Download to local (FR-014)
     */
    REMOTE_ONLY = 'REMOTE_ONLY',

    /**
     * Local has new edits, remote unchanged from common ancestor
     * Action: Upload local version (FR-012, FR-013)
     */
    LOCAL_AHEAD = 'LOCAL_AHEAD',

    /**
     * Remote has new edits, local unchanged from common ancestor
     * Action: Download remote version (FR-011)
     */
    REMOTE_AHEAD = 'REMOTE_AHEAD',

    /**
     * Both local and remote have diverged from common ancestor
     * Action: Conflict resolution required (FR-009, FR-010, FR-023)
     */
    CONFLICTED = 'CONFLICTED',
}

/**
 * Comparison result for a single file
 * Represents the diff between local and remote versions
 * @interface ComparisonResult
 */
export interface ComparisonResult {
    /**
     * File path (relative within vault)
     * @type {string}
     */
    filePath: string;

    /**
     * Classification status
     * @type {ComparisonStatus}
     */
    status: ComparisonStatus;

    /**
     * Local file reference (null if REMOTE_ONLY)
     * @type {LocalFile | null}
     */
    localFile: LocalFile | null;

    /**
     * Remote node reference (null if LOCAL_ONLY)
     * @type {RemoteNode | null}
     */
    remoteNode: RemoteNode | null;

    /**
     * Common ancestor hash (for divergence detection)
     * Null if no ancestor exists or status is LOCAL_ONLY/REMOTE_ONLY
     * @type {string | null}
     */
    ancestorHash: string | null;

    /**
     * Human-readable explanation of comparison result
     * @type {string}
     * @example "Local version has new edits, remote unchanged from common ancestor"
     */
    explanation: string;
}

/**
 * Conflict resolution strategy
 * See FR-026-FR-029 for strategy definitions
 */
export enum ConflictStrategy {
    /**
     * Prompt user interactively for each conflict (default)
     * Used when no --strategy flag provided (FR-026)
     */
    INTERACTIVE = 'INTERACTIVE',

    /**
     * Auto-resolve all conflicts by keeping local versions
     * Triggered by --strategy KEEP_LOCAL flag (FR-027)
     */
    KEEP_LOCAL = 'KEEP_LOCAL',

    /**
     * Auto-resolve all conflicts by keeping remote versions
     * Triggered by --strategy KEEP_REMOTE flag (FR-028)
     */
    KEEP_REMOTE = 'KEEP_REMOTE',

    /**
     * Skip all conflicts without resolution
     * Triggered by --strategy SKIP flag (FR-029)
     */
    SKIP = 'SKIP',
}

/**
 * User's decision for a specific conflict
 * @interface ConflictResolution
 */
export interface ConflictResolution {
    /**
     * File path of conflicted file
     * @type {string}
     */
    filePath: string;

    /**
     * Chosen resolution strategy
     * @type {ConflictStrategy}
     */
    strategy: ConflictStrategy;

    /**
     * ISO 8601 timestamp of resolution decision
     * @type {string}
     */
    timestamp: string;

    /**
     * Optional reason/note from user
     * @type {string | undefined}
     */
    reason?: string;
}

/**
 * Comparison summary for display (FR-024)
 * @interface ComparisonSummary
 */
export interface ComparisonSummary {
    /**
     * Total files compared
     * @type {number}
     */
    total: number;

    /**
     * Count of identical files (skipped)
     * @type {number}
     */
    identical: number;

    /**
     * Count of local-only files (will upload)
     * @type {number}
     */
    localOnly: number;

    /**
     * Count of remote-only files (downloaded)
     * @type {number}
     */
    remoteOnly: number;

    /**
     * Count of local-ahead files (will upload)
     * @type {number}
     */
    localAhead: number;

    /**
     * Count of remote-ahead files (downloaded)
     * @type {number}
     */
    remoteAhead: number;

    /**
     * Count of conflicted files (require resolution)
     * @type {number}
     */
    conflicted: number;
}

/**
 * Sync session metadata
 * Tracks entire init --sync operation
 * @interface SyncSession
 */
export interface SyncSession {
    /**
     * Unique session ID (UUID v4)
     * @type {string}
     */
    sessionId: string;

    /**
     * Workspace slug being synced
     * @type {string}
     */
    workspaceSlug: string;

    /**
     * Local vault absolute path
     * @type {string}
     */
    vaultPath: string;

    /**
     * ISO 8601 timestamp of sync start
     * @type {string}
     */
    startedAt: string;

    /**
     * ISO 8601 timestamp of sync completion (null if in progress)
     * @type {string | null}
     */
    completedAt: string | null;

    /**
     * Comparison summary
     * @type {ComparisonSummary}
     */
    summary: ComparisonSummary;

    /**
     * All comparison results
     * @type {Array<ComparisonResult>}
     */
    comparisonResults: Array<ComparisonResult>;

    /**
     * Conflict resolutions (if any)
     * @type {Array<ConflictResolution>}
     */
    conflictResolutions: Array<ConflictResolution>;

    /**
     * Files skipped due to timeout or user choice
     * @type {Array<string>}
     */
    skippedFiles: Array<string>;

    /**
     * Sync operation status
     * @type {string}
     */
    status: 'in_progress' | 'completed' | 'failed' | 'aborted';

    /**
     * Error message if status is 'failed'
     * @type {string | undefined}
     */
    errorMessage?: string;
}

/**
 * Sync operation result
 * Returned after successful sync completion
 * @interface SyncOperationResult
 */
export interface SyncOperationResult {
    /**
     * Session metadata
     * @type {SyncSession}
     */
    session: SyncSession;

    /**
     * Files uploaded to remote
     * @type {Array<string>}
     */
    uploaded: Array<string>;

    /**
     * Files downloaded from remote
     * @type {Array<string>}
     */
    downloaded: Array<string>;

    /**
     * Files skipped (identical or user choice)
     * @type {Array<string>}
     */
    skipped: Array<string>;

    /**
     * Files with unresolved conflicts
     * @type {Array<string>}
     */
    unresolvedConflicts: Array<string>;
}

/**
 * Interactive prompt options for conflict resolution
 * Used by inquirer for user interaction (FR-030)
 * @interface ConflictPromptOptions
 */
export interface ConflictPromptOptions {
    /**
     * Conflicted file path
     * @type {string}
     */
    filePath: string;

    /**
     * Local file content preview (first 500 chars)
     * @type {string}
     */
    localPreview: string;

    /**
     * Remote file content preview (first 500 chars)
     * @type {string}
     */
    remotePreview: string;

    /**
     * Character-level diff summary
     * @type {string}
     * @example "+125 / -87 characters"
     */
    diffSummary: string;

    /**
     * Available choices for user
     * @type {Array<string>}
     */
    choices: Array<'KEEP_LOCAL' | 'KEEP_REMOTE' | 'SKIP'>;
}

/**
 * Download staging area for transactional downloads
 * See FR-015, FR-016 for rollback requirements
 * @interface DownloadStaging
 */
export interface DownloadStaging {
    /**
     * Staging directory path (temporary)
     * @type {string}
     */
    stagingDir: string;

    /**
     * Files staged for atomic move to final location
     * @type {Array<StagedFile>}
     */
    stagedFiles: Array<StagedFile>;

    /**
     * Whether staging area is locked (download in progress)
     * @type {boolean}
     */
    locked: boolean;
}

/**
 * Single file in staging area
 * @interface StagedFile
 */
export interface StagedFile {
    /**
     * File path in staging directory
     * @type {string}
     */
    stagingPath: string;

    /**
     * Final destination path in vault
     * @type {string}
     */
    finalPath: string;

    /**
     * Remote node UUID (for tracking)
     * @type {string}
     */
    nodeUuid: string;

    /**
     * Expected content hash (for verification)
     * @type {string}
     */
    expectedHash: string;
}

/**
 * Result of download operation
 * Returned by TransactionalDownloader after successful/failed download
 * @interface DownloadResult
 */
export interface DownloadResult {
    /**
     * Whether download completed successfully
     * @type {boolean}
     */
    success: boolean;

    /**
     * Number of nodes downloaded
     * @type {number}
     */
    downloadedCount: number;

    /**
     * Paths of files downloaded (relative to vault root)
     * @type {Array<string>}
     */
    downloadedFiles: Array<string>;

    /**
     * Total size in bytes
     * @type {number}
     */
    totalBytes: number;

    /**
     * Duration in milliseconds
     * @type {number}
     */
    duration: number;

    /**
     * Error message if success is false
     * @type {string | undefined}
     */
    errorMessage?: string;

    /**
     * Whether rollback occurred (due to error mid-operation)
     * @type {boolean}
     */
    rolledBack: boolean;
}
