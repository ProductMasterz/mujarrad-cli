import { simpleGit, SimpleGit } from 'simple-git';
import { SyncApi } from '../api/generated/api.js';
import { CacheManager } from '../utils/CacheManager.js';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface GitMetadata {
  hash: string;
  author: string;
  timestamp: string;
  message: string;
}

export interface Change {
  operation: 'CREATE' | 'UPDATE' | 'DELETE' | 'RENAME';
  filePath: string;
  oldPath?: string; // For RENAME operations
  nodeId?: string;
  content?: string;
  gitMetadata?: GitMetadata;
}

export interface RemoteChange {
  nodeId: string;
  operation: 'CREATE' | 'UPDATE' | 'DELETE';
  filePath: string;
  content: string;
  updatedAt: string;
}

export interface Conflict {
  nodeId: string;
  filePath: string;
  localContent: string;
  remoteContent: string;
  localTimestamp: string;
  remoteTimestamp: string;
}

export interface PushResult {
  versionsCreated: number;
  conflicts: Conflict[];
}

export interface PullResult {
  changes: RemoteChange[];
}

/**
 * SyncService - Handles bidirectional synchronization between local vault and Mujarrad backend
 *
 * Responsibilities:
 * - Detect local changes using Git diff
 * - Extract Git commit metadata (hash, author, timestamp, message)
 * - Push changes to backend with NodeVersion creation
 * - Pull remote changes from backend
 * - Apply remote changes to local files
 * - Manage sync timestamps via CacheManager
 *
 * Part of Phase 6: Sync Workflow (User Story 2)
 */
export class SyncService {
  private syncApi: SyncApi;

  constructor(syncApi: SyncApi) {
    this.syncApi = syncApi;
  }

  /**
   * Detect file changes using Git diff since last sync
   *
   * @param vaultPath - Absolute path to local vault
   * @param workspaceSlug - Workspace identifier for cache lookup
   * @returns Array of detected changes with Git metadata
   */
  async detectChanges(vaultPath: string, workspaceSlug: string): Promise<Change[]> {
    const git: SimpleGit = simpleGit(vaultPath);

    // Get last sync time from cache
    const lastSyncTime = await CacheManager.getLastSyncTime(workspaceSlug);
    if (!lastSyncTime) {
      throw new Error('No previous sync found. Run initial sync first.');
    }

    // Get Git diff since last sync
    const diffOutput = await git.diff(['--name-status', `HEAD@{${lastSyncTime}}..HEAD`]);

    if (!diffOutput || diffOutput.trim() === '') {
      return [];
    }

    // Get latest commit metadata
    const logResult = await git.log();
    const latestCommit = logResult.latest;

    const gitMetadata: GitMetadata = latestCommit ? {
      hash: latestCommit.hash,
      author: `${latestCommit.author_name} <${latestCommit.author_email}>`,
      timestamp: latestCommit.date,
      message: latestCommit.message
    } : {
      hash: '',
      author: '',
      timestamp: '',
      message: ''
    };

    // Parse diff output
    const lines = diffOutput.trim().split('\n');
    const changes: Change[] = [];

    for (const line of lines) {
      if (!line.trim()) continue;

      const parts = line.split('\t');
      const status = parts[0];

      let change: Change;

      if (status.startsWith('R')) {
        // Rename operation: R100\told-name.md\tnew-name.md
        const oldPath = parts[1];
        const newPath = parts[2];
        change = {
          operation: 'RENAME',
          filePath: newPath,
          oldPath: oldPath,
          gitMetadata
        };
      } else {
        const filePath = parts[1];

        if (status === 'M') {
          change = {
            operation: 'UPDATE',
            filePath,
            gitMetadata
          };
        } else if (status === 'A') {
          change = {
            operation: 'CREATE',
            filePath,
            gitMetadata
          };
        } else if (status === 'D') {
          change = {
            operation: 'DELETE',
            filePath,
            gitMetadata
          };
        } else {
          // Unknown status, skip
          continue;
        }
      }

      changes.push(change);
    }

    return changes;
  }

  /**
   * Push local changes to backend with NodeVersion creation
   *
   * Uses applySyncChanges API which handles both push and conflict resolution
   *
   * @param workspaceId - Workspace UUID
   * @param changes - Array of changes to push
   * @returns Result with versions created and any conflicts detected
   */
  async pushChanges(workspaceId: string, changes: Change[]): Promise<PushResult> {
    // Transform changes to API format
    const apiChanges = changes.map(change => ({
      nodeId: change.nodeId || '',
      operation: change.operation,
      content: change.content || '',
      gitCommitHash: change.gitMetadata?.hash || '',
      gitCommitMessage: change.gitMetadata?.message || '',
      gitCommitAuthor: change.gitMetadata?.author || '',
      gitCommitTimestamp: change.gitMetadata?.timestamp || ''
    }));

    // Call backend API - applySyncChanges handles both push and pull
    const response = await this.syncApi.applySyncChanges(workspaceId, {
      changes: apiChanges as any
    });

    return {
      versionsCreated: (response.data as any).versionsCreated || 0,
      conflicts: (response.data as any).conflicts || []
    };
  }

  /**
   * Pull remote changes from backend since last sync
   *
   * Note: In MVP, applySyncChanges returns remote changes in the same response
   *
   * @param workspaceId - Workspace UUID
   * @returns Remote changes to apply locally
   */
  async pullChanges(_workspaceId: string): Promise<PullResult> {
    // In MVP, we get remote changes from applySyncChanges response
    // For now, return empty (will be populated during actual sync)
    return {
      changes: []
    };
  }

  /**
   * Apply remote changes to local vault files
   *
   * @param vaultPath - Absolute path to local vault
   * @param remoteChanges - Changes from backend to apply
   */
  async applyRemoteChanges(vaultPath: string, remoteChanges: RemoteChange[]): Promise<void> {
    for (const change of remoteChanges) {
      const filePath = path.join(vaultPath, change.filePath);

      if (change.operation === 'DELETE') {
        // Delete local file
        await fs.unlink(filePath);
      } else {
        // CREATE or UPDATE - write content to file
        await fs.writeFile(filePath, change.content, 'utf-8');
      }
    }
  }

  /**
   * Complete sync operation by updating last sync timestamp
   *
   * @param workspaceSlug - Workspace identifier
   * @param timestamp - New sync timestamp (ISO-8601)
   */
  async completeSync(workspaceSlug: string, timestamp: string): Promise<void> {
    await CacheManager.setLastSyncTime(workspaceSlug, timestamp);
  }
}
