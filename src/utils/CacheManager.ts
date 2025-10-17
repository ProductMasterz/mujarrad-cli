import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

/**
 * Cache statistics for a space
 */
export interface CacheStats {
  /** Whether space data is cached */
  spaceCached: boolean;
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
 * CacheManager handles local caching of space data and sync metadata
 *
 * Features:
 * - Caches space structure locally in ~/.mujarrad/cache/{space-slug}/
 * - Stores last sync timestamp for incremental sync
 * - Maintains node UUID → file path mappings
 * - Provides cache invalidation methods
 * - Creates cache directory structure automatically
 *
 * Cache Structure:
 * ```
 * ~/.mujarrad/cache/
 *   {space-slug}/
 *     space.json      # Space structure
 *     sync.json          # Last sync timestamp
 *     mapping.json       # Node UUID → file path mappings
 * ```
 *
 * Usage:
 * ```typescript
 * // Cache space
 * await CacheManager.cacheSpace('my-space', spaceData);
 *
 * // Get cached space
 * const space = await CacheManager.getSpace('my-space');
 *
 * // Store sync time
 * await CacheManager.setLastSyncTime('my-space', new Date().toISOString());
 *
 * // Cache node mapping
 * await CacheManager.cacheNodeMapping('my-space', 'uuid-123', 'note.md');
 *
 * // Get file path for node
 * const filePath = await CacheManager.getFilePathForNode('my-space', 'uuid-123');
 *
 * // Clear cache
 * await CacheManager.clearSpaceCache('my-space');
 * ```
 *
 * Follows Constitution Principle III: TDD approach with comprehensive tests
 * Implements FR-CLI-021: Local space cache
 * Implements FR-CLI-022: Sync metadata storage
 * Implements FR-CLI-023: Node mapping cache
 */
export class CacheManager {
  /**
   * Get cache directory path for a space
   *
   * @param spaceSlug - Space identifier
   * @param baseCacheDir - Optional base cache directory (for testing)
   * @returns Full path to space cache directory
   */
  static getCacheDir(spaceSlug: string, baseCacheDir?: string): string {
    const baseDir = baseCacheDir || path.join(os.homedir(), '.mujarrad', 'cache');
    return path.join(baseDir, spaceSlug);
  }

  /**
   * Get cache file path for a space
   *
   * @param spaceSlug - Space identifier
   * @param fileName - Cache file name (e.g., 'space.json')
   * @param baseCacheDir - Optional base cache directory (for testing)
   * @returns Full path to cache file
   */
  private static getCachePath(spaceSlug: string, fileName: string, baseCacheDir?: string): string {
    return path.join(this.getCacheDir(spaceSlug, baseCacheDir), fileName);
  }

  /**
   * Ensure cache directory exists
   *
   * Creates directory structure if not present
   *
   * @param spaceSlug - Space identifier
   * @param baseCacheDir - Optional base cache directory (for testing)
   */
  static async ensureCacheDir(spaceSlug: string, baseCacheDir?: string): Promise<void> {
    const cacheDir = this.getCacheDir(spaceSlug, baseCacheDir);
    await fs.mkdir(cacheDir, { recursive: true });
  }

  /**
   * Cache space structure
   *
   * Stores complete space data as JSON
   *
   * @param spaceSlug - Space identifier
   * @param data - Space data to cache
   * @param baseCacheDir - Optional base cache directory (for testing)
   */
  static async cacheSpace(spaceSlug: string, data: any, baseCacheDir?: string): Promise<void> {
    const cachePath = this.getCachePath(spaceSlug, 'space.json', baseCacheDir);
    await fs.mkdir(path.dirname(cachePath), { recursive: true });
    await fs.writeFile(cachePath, JSON.stringify(data, null, 2), 'utf-8');
  }

  /**
   * Get cached space structure
   *
   * @param spaceSlug - Space identifier
   * @param baseCacheDir - Optional base cache directory (for testing)
   * @returns Cached space data or null if not found
   */
  static async getSpace(spaceSlug: string, baseCacheDir?: string): Promise<any> {
    const cachePath = this.getCachePath(spaceSlug, 'space.json', baseCacheDir);
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
   * @param spaceSlug - Space identifier
   * @param timestamp - ISO 8601 timestamp
   * @param baseCacheDir - Optional base cache directory (for testing)
   */
  static async setLastSyncTime(spaceSlug: string, timestamp: string, baseCacheDir?: string): Promise<void> {
    const cachePath = this.getCachePath(spaceSlug, 'sync.json', baseCacheDir);
    await fs.mkdir(path.dirname(cachePath), { recursive: true });
    const syncData: SyncMetadata = { lastSync: timestamp };
    await fs.writeFile(cachePath, JSON.stringify(syncData, null, 2), 'utf-8');
  }

  /**
   * Get last sync timestamp
   *
   * @param spaceSlug - Space identifier
   * @param baseCacheDir - Optional base cache directory (for testing)
   * @returns ISO 8601 timestamp or null if not found
   */
  static async getLastSyncTime(spaceSlug: string, baseCacheDir?: string): Promise<string | null> {
    const cachePath = this.getCachePath(spaceSlug, 'sync.json', baseCacheDir);
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
   * @param spaceSlug - Space identifier
   * @param nodeUUID - Node UUID
   * @param filePath - File path relative to vault root
   * @param baseCacheDir - Optional base cache directory (for testing)
   */
  static async cacheNodeMapping(
    spaceSlug: string,
    nodeUUID: string,
    filePath: string,
    baseCacheDir?: string
  ): Promise<void> {
    const cachePath = this.getCachePath(spaceSlug, 'mapping.json', baseCacheDir);
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
   * @param spaceSlug - Space identifier
   * @param nodeUUID - Node UUID
   * @param baseCacheDir - Optional base cache directory (for testing)
   * @returns File path or null if not found
   */
  static async getFilePathForNode(
    spaceSlug: string,
    nodeUUID: string,
    baseCacheDir?: string
  ): Promise<string | null> {
    const cachePath = this.getCachePath(spaceSlug, 'mapping.json', baseCacheDir);
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
   * @param spaceSlug - Space identifier
   * @param filePath - File path relative to vault root
   * @param baseCacheDir - Optional base cache directory (for testing)
   * @returns Node UUID or null if not found
   */
  static async getNodeUUIDForFilePath(
    spaceSlug: string,
    filePath: string,
    baseCacheDir?: string
  ): Promise<string | null> {
    const cachePath = this.getCachePath(spaceSlug, 'mapping.json', baseCacheDir);
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
   * Clear all cache for a space
   *
   * Removes space data, sync metadata, and node mappings
   *
   * @param spaceSlug - Space identifier
   * @param baseCacheDir - Optional base cache directory (for testing)
   */
  static async clearSpaceCache(spaceSlug: string, baseCacheDir?: string): Promise<void> {
    const cacheDir = this.getCacheDir(spaceSlug, baseCacheDir);
    try {
      await fs.rm(cacheDir, { recursive: true, force: true });
    } catch (error: any) {
      // Ignore errors (directory might not exist)
    }
  }

  /**
   * Get list of all cached space slugs
   *
   * @param baseCacheDir - Optional base cache directory (for testing)
   * @returns Array of space slugs
   */
  static async getAllCachedSpaces(baseCacheDir?: string): Promise<string[]> {
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
   * Get cache statistics for a space
   *
   * @param spaceSlug - Space identifier
   * @param baseCacheDir - Optional base cache directory (for testing)
   * @returns Cache statistics
   */
  static async getCacheStats(spaceSlug: string, baseCacheDir?: string): Promise<CacheStats> {
    const space = await this.getSpace(spaceSlug, baseCacheDir);
    const lastSyncTime = await this.getLastSyncTime(spaceSlug, baseCacheDir);

    // Count node mappings
    let nodeMappingCount = 0;
    const cachePath = this.getCachePath(spaceSlug, 'mapping.json', baseCacheDir);
    try {
      const content = await fs.readFile(cachePath, 'utf-8');
      const mappings: NodeMapping = JSON.parse(content);
      nodeMappingCount = Object.keys(mappings).length;
    } catch (error: any) {
      // No mappings file
    }

    return {
      spaceCached: space !== null,
      lastSyncTime,
      nodeMappingCount
    };
  }
}
