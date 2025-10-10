import inquirer from 'inquirer';
import { Logger } from '../utils/Logger.js';
import * as crypto from 'crypto';

export type ConflictType =
  | 'CONCURRENT_EDIT'
  | 'DELETE_MODIFY_CONFLICT'
  | 'METADATA_MISMATCH'
  | 'MOVE_MODIFY_CONFLICT';

export type ResolutionStrategy =
  | 'KEEP_LOCAL'
  | 'KEEP_REMOTE'
  | 'PROMPT_USER'
  | 'MANUAL_MERGE'
  | 'NO_CONFLICT';

export interface Conflict {
  type: ConflictType;
  nodeId: string;
  filePath: string;
  oldPath?: string;
  localContent: string;
  remoteContent: string;
  localTimestamp: string;
  remoteTimestamp: string;
}

export interface ConflictResolution {
  strategy: ResolutionStrategy;
  content?: string;
  reason: string;
  requiresUserEdit?: boolean;
}

export interface VersionInfo {
  nodeId: string;
  filePath: string;
  content: string;
  timestamp: string;
}

/**
 * ConflictResolver - Implements conflict detection and resolution per H1 decision tree
 *
 * Decision Tree (from spec.md lines 317-358):
 * 1. Timestamp diff >1s: Auto-resolve (keep newer)
 * 2. Timestamp diff <1s: Hybrid mode (prompt user)
 * 3. Same timestamp: Content hash comparison
 * 4. Fallback triggers: DELETE_MODIFY, UUID_MISMATCH, MOVE_MODIFY → Prompt user
 *
 * Part of Phase 6: Sync Workflow (User Story 2)
 */
export class ConflictResolver {
  private logger: Logger;

  constructor() {
    this.logger = new Logger();
  }

  /**
   * Detect if local and remote versions conflict
   *
   * @param local - Local version info
   * @param remote - Remote version info
   * @returns Conflict object if conflict detected, null otherwise
   */
  detectConflict(local: VersionInfo, remote: VersionInfo): Conflict | null {
    // No conflict if content is identical
    if (local.content === remote.content) {
      return null;
    }

    // Concurrent edit conflict
    return {
      type: 'CONCURRENT_EDIT',
      nodeId: local.nodeId,
      filePath: local.filePath,
      localContent: local.content,
      remoteContent: remote.content,
      localTimestamp: local.timestamp,
      remoteTimestamp: remote.timestamp
    };
  }

  /**
   * Auto-resolve conflict using decision tree
   *
   * @param conflict - Conflict to resolve
   * @returns Resolution with strategy and content
   */
  autoResolve(conflict: Conflict): ConflictResolution {
    // Handle fallback triggers first
    if (conflict.type === 'DELETE_MODIFY_CONFLICT') {
      return {
        strategy: 'PROMPT_USER',
        reason: 'File deleted locally but modified remotely. Restore remote version?'
      };
    }

    if (conflict.type === 'METADATA_MISMATCH') {
      return {
        strategy: 'PROMPT_USER',
        reason: 'UUID mismatch detected. This may indicate file corruption.'
      };
    }

    if (conflict.type === 'MOVE_MODIFY_CONFLICT') {
      return {
        strategy: 'PROMPT_USER',
        reason: 'File moved AND content changed. Apply both changes?'
      };
    }

    // Concurrent edit resolution
    const localTime = new Date(conflict.localTimestamp).getTime();
    const remoteTime = new Date(conflict.remoteTimestamp).getTime();
    const diffMs = Math.abs(remoteTime - localTime);
    const diffSeconds = diffMs / 1000;

    // Same timestamp: Compare content hashes
    if (diffMs === 0) {
      const localHash = this.computeHash(conflict.localContent);
      const remoteHash = this.computeHash(conflict.remoteContent);

      if (localHash === remoteHash) {
        return {
          strategy: 'NO_CONFLICT',
          content: conflict.localContent,
          reason: 'Identical content'
        };
      }

      // Hash differs but timestamp same: Prompt user
      return {
        strategy: 'PROMPT_USER',
        reason: 'Timestamps identical but content differs - timestamps within 1 second'
      };
    }

    // Timestamp diff <1 second: Hybrid mode (prompt user)
    if (diffSeconds < 1) {
      return {
        strategy: 'PROMPT_USER',
        reason: `Timestamps within 1 second (${diffMs}ms apart) - requires manual resolution`
      };
    }

    // Timestamp diff >1 second: Last-write-wins (keep newer)
    const isRemoteNewer = remoteTime > localTime;

    return {
      strategy: isRemoteNewer ? 'KEEP_REMOTE' : 'KEEP_LOCAL',
      content: isRemoteNewer ? conflict.remoteContent : conflict.localContent,
      reason: isRemoteNewer
        ? `Remote is newer by ${diffSeconds.toFixed(0)} seconds`
        : `Local is newer by ${diffSeconds.toFixed(0)} seconds`
    };
  }

  /**
   * Resolve conflict interactively with user prompt
   *
   * @param conflict - Conflict to resolve
   * @returns Resolution based on user choice
   */
  async resolveInteractive(conflict: Conflict): Promise<ConflictResolution> {
    const choices = [
      { name: 'Keep local changes', value: 'local' },
      { name: 'Keep remote changes', value: 'remote' },
      { name: 'Manual merge (edit file)', value: 'merge' }
    ];

    const answer = await inquirer.prompt([
      {
        type: 'list',
        name: 'choice',
        message: `Conflict detected in ${conflict.filePath}. Choose resolution:`,
        choices
      }
    ]);

    switch (answer.choice) {
      case 'local':
        return {
          strategy: 'KEEP_LOCAL',
          content: conflict.localContent,
          reason: 'User chose local'
        };

      case 'remote':
        return {
          strategy: 'KEEP_REMOTE',
          content: conflict.remoteContent,
          reason: 'User chose remote'
        };

      case 'merge':
        return {
          strategy: 'MANUAL_MERGE',
          reason: 'User will manually merge',
          requiresUserEdit: true
        };

      default:
        return {
          strategy: 'KEEP_LOCAL',
          content: conflict.localContent,
          reason: 'Default to local'
        };
    }
  }

  /**
   * Append UUID suffix to filename for name conflict resolution
   *
   * @param fileName - Original filename
   * @param uuid - UUID to append (first 8 chars used)
   * @returns New filename with UUID suffix
   */
  appendUUIDSuffix(fileName: string, uuid: string): string {
    const suffix = uuid.substring(0, 8);
    const lastDotIndex = fileName.lastIndexOf('.');

    if (lastDotIndex === -1) {
      // No extension
      return `${fileName}-${suffix}`;
    }

    // Has extension: insert before extension
    const baseName = fileName.substring(0, lastDotIndex);
    const extension = fileName.substring(lastDotIndex);
    return `${baseName}-${suffix}${extension}`;
  }

  /**
   * Log conflict resolution to sync log
   *
   * @param conflict - The conflict that was resolved
   * @param resolution - How it was resolved
   * @param sessionId - Sync session ID for log correlation
   */
  logResolution(conflict: Conflict, resolution: ConflictResolution, sessionId: string): void {
    // Auto-resolved if reason contains "newer" (timestamp-based decision)
    const isAutoResolved = resolution.reason.includes('newer') || resolution.reason.includes('Identical');

    if (isAutoResolved) {
      this.logger.info('CONFLICT AUTO-RESOLVED', {
        file: conflict.filePath,
        resolution: resolution.strategy === 'KEEP_REMOTE' ? 'Remote wins' : 'Local wins',
        reason: resolution.reason,
        sessionId,
        localTimestamp: conflict.localTimestamp,
        remoteTimestamp: conflict.remoteTimestamp
      });
    } else {
      this.logger.info('CONFLICT USER-RESOLVED', {
        file: conflict.filePath,
        userChoice: resolution.strategy === 'KEEP_LOCAL' ? 'Keep local' :
                    resolution.strategy === 'KEEP_REMOTE' ? 'Keep remote' : 'Manual merge',
        sessionId
      });
    }
  }

  /**
   * Compute SHA-256 hash of content for comparison
   *
   * @param content - Content to hash
   * @returns Hex-encoded hash
   */
  private computeHash(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }
}
