import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

/**
 * Cache statistics for a workspace
 */
export interface CacheStats {
  /** Whether workspace data is cached */
  workspaceCached: boolean;
  /** Last sync timestamp if available */
  lastSyncTime: string | null;
  /** Number of node mappings stored */
  nodeMappingCount: number;
}

/**
 * Node mapping entry (UUID to file path)
 */
interface NodeMapping {
  [nodeUUID: string]: string;
}

/**
 * Sync metadata
 */
interface SyncMetadata {
  lastSync: string;
}

/**
 * CacheManager handles local caching of workspace data and sync metadata
 *
 * Features:
 * - Caches workspace structure locally in ~/.mujarrad/cache/{workspace-slug}/
 * - Stores last sync timestamp for incremental sync
 * - Maintains node UUID → file path mappings
 * - Provides cache invalidation methods
 * - Creates cache directory structure automatically
 *
 * Cache Structure:
 * ```
 * ~/.mujarrad/cache/
 *   {workspace-slug}/
 *     workspace.json      # Workspace structure
 *     sync.json          # Last sync timestamp
 *     mapping.json       # Node UUID → file path mappings
 * ```
 *
 * Usage:
 * ```typescript
 * // Cache workspace
 * await CacheManager.cacheWorkspace('my-workspace', workspaceData);
 *
 * // Get cached workspace
 * const workspace = await CacheManager.getWorkspace('my-workspace');
 *
 * // Store sync time
 * await CacheManager.setLastSyncTime('my-workspace', new Date().toISOString());
 *
 * // Cache node mapping
 * await CacheManager.cacheNodeMapping('my-workspace', 'uuid-123', 'note.md');
 *
 * // Get file path for node
 * const filePath = await CacheManager.getFilePathForNode('my-workspace', 'uuid-123');
 *
 * // Clear cache
 * await CacheManager.clearWorkspaceCache('my-workspace');
 * ```
 *
 * Follows Constitution Principle III: TDD approach with comprehensive tests
 * Implements FR-CLI-021: Local workspace cache
 * Implements FR-CLI-022: Sync metadata storage
 * Implements FR-CLI-023: Node mapping cache
 */
export class CacheManager {
  /**
   * Get cache directory path for a workspace
   *
   * @param workspaceSlug - Workspace identifier
   * @param baseCacheDir - Optional base cache directory (for testing)
   * @returns Full path to workspace cache directory
   */
  static getCacheDir(workspaceSlug: string, baseCacheDir?: string): string {
    const baseDir = baseCacheDir || path.join(os.homedir(), '.mujarrad', 'cache');
    return path.join(baseDir, workspaceSlug);
  }

  /**
   * Get cache file path for a workspace
   *
   * @param workspaceSlug - Workspace identifier
   * @param fileName - Cache file name (e.g., 'workspace.json')
   * @param baseCacheDir - Optional base cache directory (for testing)
   * @returns Full path to cache file
   */
  private static getCachePath(workspaceSlug: string, fileName: string, baseCacheDir?: string): string {
    return path.join(this.getCacheDir(workspaceSlug, baseCacheDir), fileName);
  }

  /**
   * Ensure cache directory exists
   *
   * Creates directory structure if not present
   *
   * @param workspaceSlug - Workspace identifier
   * @param baseCacheDir - Optional base cache directory (for testing)
   */
  static async ensureCacheDir(workspaceSlug: string, baseCacheDir?: string): Promise<void> {
    const cacheDir = this.getCacheDir(workspaceSlug, baseCacheDir);
    await fs.mkdir(cacheDir, { recursive: true });
  }

  /**
   * Cache workspace structure
   *
   * Stores complete workspace data as JSON
   *
   * @param workspaceSlug - Workspace identifier
   * @param data - Workspace data to cache
   * @param baseCacheDir - Optional base cache directory (for testing)
   */
  static async cacheWorkspace(workspaceSlug: string, data: any, baseCacheDir?: string): Promise<void> {
    const cachePath = this.getCachePath(workspaceSlug, 'workspace.json', baseCacheDir);
    await fs.mkdir(path.dirname(cachePath), { recursive: true });
    await fs.writeFile(cachePath, JSON.stringify(data, null, 2), 'utf-8');
  }

  /**
   * Get cached workspace structure
   *
   * @param workspaceSlug - Workspace identifier
   * @param baseCacheDir - Optional base cache directory (for testing)
   * @returns Cached workspace data or null if not found
   */
  static async getWorkspace(workspaceSlug: string, baseCacheDir?: string): Promise<any> {
    const cachePath = this.getCachePath(workspaceSlug, 'workspace.json', baseCacheDir);
    try {
      const content = await fs.readFile(cachePath, 'utf-8');
      return JSON.parse(content);
    } catch (error: any) {
      // Return null if file doesn't exist or JSON is invalid
      return null;
    }
  }

  /**
   * Set last sync timestamp
   *
   * @param workspaceSlug - Workspace identifier
   * @param timestamp - ISO 8601 timestamp
   * @param baseCacheDir - Optional base cache directory (for testing)
   */
  static async setLastSyncTime(workspaceSlug: string, timestamp: string, baseCacheDir?: string): Promise<void> {
    const cachePath = this.getCachePath(workspaceSlug, 'sync.json', baseCacheDir);
    await fs.mkdir(path.dirname(cachePath), { recursive: true });
    const syncData: SyncMetadata = { lastSync: timestamp };
    await fs.writeFile(cachePath, JSON.stringify(syncData, null, 2), 'utf-8');
  }

  /**
   * Get last sync timestamp
   *
   * @param workspaceSlug - Workspace identifier
   * @param baseCacheDir - Optional base cache directory (for testing)
   * @returns ISO 8601 timestamp or null if not found
   */
  static async getLastSyncTime(workspaceSlug: string, baseCacheDir?: string): Promise<string | null> {
    const cachePath = this.getCachePath(workspaceSlug, 'sync.json', baseCacheDir);
    try {
      const content = await fs.readFile(cachePath, 'utf-8');
      const syncData: SyncMetadata = JSON.parse(content);
      return syncData.lastSync;
    } catch (error: any) {
      return null;
    }
  }

  /**
   * Cache node UUID to file path mapping
   *
   * Stores mapping for reverse lookup during sync
   *
   * @param workspaceSlug - Workspace identifier
   * @param nodeUUID - Node UUID
   * @param filePath - File path relative to vault root
   * @param baseCacheDir - Optional base cache directory (for testing)
   */
  static async cacheNodeMapping(
    workspaceSlug: string,
    nodeUUID: string,
    filePath: string,
    baseCacheDir?: string
  ): Promise<void> {
    const cachePath = this.getCachePath(workspaceSlug, 'mapping.json', baseCacheDir);
    await fs.mkdir(path.dirname(cachePath), { recursive: true });

    // Load existing mappings
    let mappings: NodeMapping = {};
    try {
      const content = await fs.readFile(cachePath, 'utf-8');
      mappings = JSON.parse(content);
    } catch (error: any) {
      // File doesn't exist yet, start with empty mappings
    }

    // Add or update mapping
    mappings[nodeUUID] = filePath;

    // Save updated mappings
    await fs.writeFile(cachePath, JSON.stringify(mappings, null, 2), 'utf-8');
  }

  /**
   * Get file path for node UUID
   *
   * @param workspaceSlug - Workspace identifier
   * @param nodeUUID - Node UUID
   * @param baseCacheDir - Optional base cache directory (for testing)
   * @returns File path or null if not found
   */
  static async getFilePathForNode(
    workspaceSlug: string,
    nodeUUID: string,
    baseCacheDir?: string
  ): Promise<string | null> {
    const cachePath = this.getCachePath(workspaceSlug, 'mapping.json', baseCacheDir);
    try {
      const content = await fs.readFile(cachePath, 'utf-8');
      const mappings: NodeMapping = JSON.parse(content);
      return mappings[nodeUUID] || null;
    } catch (error: any) {
      return null;
    }
  }

  /**
   * Get node UUID for file path (reverse mapping)
   *
   * @param workspaceSlug - Workspace identifier
   * @param filePath - File path relative to vault root
   * @param baseCacheDir - Optional base cache directory (for testing)
   * @returns Node UUID or null if not found
   */
  static async getNodeUUIDForFilePath(
    workspaceSlug: string,
    filePath: string,
    baseCacheDir?: string
  ): Promise<string | null> {
    const cachePath = this.getCachePath(workspaceSlug, 'mapping.json', baseCacheDir);
    try {
      const content = await fs.readFile(cachePath, 'utf-8');
      const mappings: NodeMapping = JSON.parse(content);

      // Search for file path in mappings
      for (const [nodeUUID, cachedFilePath] of Object.entries(mappings)) {
        if (cachedFilePath === filePath) {
          return nodeUUID;
        }
      }

      return null;
    } catch (error: any) {
      return null;
    }
  }

  /**
   * Clear all cache for a workspace
   *
   * Removes workspace data, sync metadata, and node mappings
   *
   * @param workspaceSlug - Workspace identifier
   * @param baseCacheDir - Optional base cache directory (for testing)
   */
  static async clearWorkspaceCache(workspaceSlug: string, baseCacheDir?: string): Promise<void> {
    const cacheDir = this.getCacheDir(workspaceSlug, baseCacheDir);
    try {
      await fs.rm(cacheDir, { recursive: true, force: true });
    } catch (error: any) {
      // Ignore errors (directory might not exist)
    }
  }

  /**
   * Get list of all cached workspace slugs
   *
   * @param baseCacheDir - Optional base cache directory (for testing)
   * @returns Array of workspace slugs
   */
  static async getAllCachedWorkspaces(baseCacheDir?: string): Promise<string[]> {
    const baseDir = baseCacheDir || path.join(os.homedir(), '.mujarrad', 'cache');

    try {
      const entries = await fs.readdir(baseDir, { withFileTypes: true });
      return entries.filter(entry => entry.isDirectory()).map(entry => entry.name);
    } catch (error: any) {
      // Cache directory doesn't exist yet
      return [];
    }
  }

  /**
   * Get cache statistics for a workspace
   *
   * @param workspaceSlug - Workspace identifier
   * @param baseCacheDir - Optional base cache directory (for testing)
   * @returns Cache statistics
   */
  static async getCacheStats(workspaceSlug: string, baseCacheDir?: string): Promise<CacheStats> {
    const workspace = await this.getWorkspace(workspaceSlug, baseCacheDir);
    const lastSyncTime = await this.getLastSyncTime(workspaceSlug, baseCacheDir);

    // Count node mappings
    let nodeMappingCount = 0;
    const cachePath = this.getCachePath(workspaceSlug, 'mapping.json', baseCacheDir);
    try {
      const content = await fs.readFile(cachePath, 'utf-8');
      const mappings: NodeMapping = JSON.parse(content);
      nodeMappingCount = Object.keys(mappings).length;
    } catch (error: any) {
      // No mappings file
    }

    return {
      workspaceCached: workspace !== null,
      lastSyncTime,
      nodeMappingCount
    };
  }
}
