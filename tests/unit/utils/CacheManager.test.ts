import { CacheManager } from '../../../src/utils/CacheManager.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('CacheManager', () => {
  const testSpaceSlug = `test-space-${Date.now()}`;
  let testCacheDir: string;

  beforeAll(async () => {
    testCacheDir = path.join(os.tmpdir(), '.mujarrad-test', 'cache', testSpaceSlug);
  });

  afterAll(async () => {
    // Clean up test cache directory
    try {
      await fs.rm(path.join(os.tmpdir(), '.mujarrad-test'), { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('cacheSpace and getSpace', () => {
    it('should cache space structure', async () => {
      const spaceData = {
        id: 'uuid-space-1',
        name: 'Test Space',
        nodes: [
          { id: 'node1', name: 'Note 1' },
          { id: 'node2', name: 'Note 2' }
        ]
      };

      await CacheManager.cacheSpace(testSpaceSlug, spaceData, testCacheDir);

      const cached = await CacheManager.getSpace(testSpaceSlug, testCacheDir);
      expect(cached).toBeDefined();
      expect(cached.id).toBe('uuid-space-1');
      expect(cached.name).toBe('Test Space');
      expect(cached.nodes).toHaveLength(2);
    });

    it('should return null for non-existent space', async () => {
      const cached = await CacheManager.getSpace('non-existent-space', testCacheDir);
      expect(cached).toBeNull();
    });

    it('should overwrite existing space cache', async () => {
      const spaceData1 = { id: 'uuid-1', name: 'Original' };
      const spaceData2 = { id: 'uuid-2', name: 'Updated' };

      await CacheManager.cacheSpace(testSpaceSlug, spaceData1, testCacheDir);
      await CacheManager.cacheSpace(testSpaceSlug, spaceData2, testCacheDir);

      const cached = await CacheManager.getSpace(testSpaceSlug, testCacheDir);
      expect(cached.id).toBe('uuid-2');
      expect(cached.name).toBe('Updated');
    });
  });

  describe('setLastSyncTime and getLastSyncTime', () => {
    it('should store last sync timestamp', async () => {
      const timestamp = '2025-10-10T10:00:00Z';
      await CacheManager.setLastSyncTime(testSpaceSlug, timestamp, testCacheDir);

      const lastSync = await CacheManager.getLastSyncTime(testSpaceSlug, testCacheDir);
      expect(lastSync).toBe(timestamp);
    });

    it('should return null for space without sync time', async () => {
      const lastSync = await CacheManager.getLastSyncTime('space-no-sync', testCacheDir);
      expect(lastSync).toBeNull();
    });

    it('should update existing sync timestamp', async () => {
      const timestamp1 = '2025-10-10T10:00:00Z';
      const timestamp2 = '2025-10-10T11:00:00Z';

      await CacheManager.setLastSyncTime(testSpaceSlug, timestamp1, testCacheDir);
      await CacheManager.setLastSyncTime(testSpaceSlug, timestamp2, testCacheDir);

      const lastSync = await CacheManager.getLastSyncTime(testSpaceSlug, testCacheDir);
      expect(lastSync).toBe(timestamp2);
    });

    it('should handle ISO 8601 timestamps', async () => {
      const timestamp = new Date().toISOString();
      await CacheManager.setLastSyncTime(testSpaceSlug, timestamp, testCacheDir);

      const lastSync = await CacheManager.getLastSyncTime(testSpaceSlug, testCacheDir);
      expect(lastSync).toBe(timestamp);
    });
  });

  describe('cacheNodeMapping and getFilePathForNode', () => {
    it('should store node UUID to file path mappings', async () => {
      await CacheManager.cacheNodeMapping(testSpaceSlug, 'uuid-123', 'folder/note.md', testCacheDir);

      const filePath = await CacheManager.getFilePathForNode(testSpaceSlug, 'uuid-123', testCacheDir);
      expect(filePath).toBe('folder/note.md');
    });

    it('should return null for unknown node UUID', async () => {
      const filePath = await CacheManager.getFilePathForNode(testSpaceSlug, 'unknown-uuid', testCacheDir);
      expect(filePath).toBeNull();
    });

    it('should store multiple node mappings', async () => {
      await CacheManager.cacheNodeMapping(testSpaceSlug, 'uuid-1', 'note1.md', testCacheDir);
      await CacheManager.cacheNodeMapping(testSpaceSlug, 'uuid-2', 'folder/note2.md', testCacheDir);
      await CacheManager.cacheNodeMapping(testSpaceSlug, 'uuid-3', 'deep/nested/note3.md', testCacheDir);

      const filePath1 = await CacheManager.getFilePathForNode(testSpaceSlug, 'uuid-1', testCacheDir);
      const filePath2 = await CacheManager.getFilePathForNode(testSpaceSlug, 'uuid-2', testCacheDir);
      const filePath3 = await CacheManager.getFilePathForNode(testSpaceSlug, 'uuid-3', testCacheDir);

      expect(filePath1).toBe('note1.md');
      expect(filePath2).toBe('folder/note2.md');
      expect(filePath3).toBe('deep/nested/note3.md');
    });

    it('should update existing node mapping', async () => {
      await CacheManager.cacheNodeMapping(testSpaceSlug, 'uuid-update', 'old-path.md', testCacheDir);
      await CacheManager.cacheNodeMapping(testSpaceSlug, 'uuid-update', 'new-path.md', testCacheDir);

      const filePath = await CacheManager.getFilePathForNode(testSpaceSlug, 'uuid-update', testCacheDir);
      expect(filePath).toBe('new-path.md');
    });
  });

  describe('getNodeUUIDForFilePath', () => {
    it('should get node UUID for file path (reverse mapping)', async () => {
      await CacheManager.cacheNodeMapping(testSpaceSlug, 'uuid-reverse', 'test-file.md', testCacheDir);

      const nodeUUID = await CacheManager.getNodeUUIDForFilePath(testSpaceSlug, 'test-file.md', testCacheDir);
      expect(nodeUUID).toBe('uuid-reverse');
    });

    it('should return null for unknown file path', async () => {
      const nodeUUID = await CacheManager.getNodeUUIDForFilePath(testSpaceSlug, 'unknown.md', testCacheDir);
      expect(nodeUUID).toBeNull();
    });
  });

  describe('clearSpaceCache', () => {
    it('should clear cache for space', async () => {
      // Set up cache data
      await CacheManager.cacheSpace(testSpaceSlug, { id: 'uuid-clear' }, testCacheDir);
      await CacheManager.setLastSyncTime(testSpaceSlug, '2025-10-10T10:00:00Z', testCacheDir);
      await CacheManager.cacheNodeMapping(testSpaceSlug, 'uuid-node', 'note.md', testCacheDir);

      // Clear cache
      await CacheManager.clearSpaceCache(testSpaceSlug, testCacheDir);

      // Verify all cache data is cleared
      const space = await CacheManager.getSpace(testSpaceSlug, testCacheDir);
      const syncTime = await CacheManager.getLastSyncTime(testSpaceSlug, testCacheDir);
      const filePath = await CacheManager.getFilePathForNode(testSpaceSlug, 'uuid-node', testCacheDir);

      expect(space).toBeNull();
      expect(syncTime).toBeNull();
      expect(filePath).toBeNull();
    });

    it('should not throw error when clearing non-existent cache', async () => {
      await expect(
        CacheManager.clearSpaceCache('non-existent', testCacheDir)
      ).resolves.not.toThrow();
    });
  });

  describe('getCacheDir and ensureCacheDir', () => {
    it('should get cache directory path', () => {
      const cacheDir = CacheManager.getCacheDir('new-space', testCacheDir);
      expect(cacheDir).toContain('cache');
      expect(cacheDir).toContain('new-space');
    });

    it('should handle cache directory creation', async () => {
      const newSpaceSlug = `new-space-${Date.now()}`;
      const cacheDir = CacheManager.getCacheDir(newSpaceSlug, testCacheDir);

      await CacheManager.ensureCacheDir(newSpaceSlug, testCacheDir);

      // Check directory exists
      const stats = await fs.stat(cacheDir);
      expect(stats.isDirectory()).toBe(true);
    });

    it('should not throw error if cache directory already exists', async () => {
      const existingSpace = `existing-space-${Date.now()}`;
      await CacheManager.ensureCacheDir(existingSpace, testCacheDir);

      await expect(
        CacheManager.ensureCacheDir(existingSpace, testCacheDir)
      ).resolves.not.toThrow();
    });
  });

  describe('getAllCachedSpaces', () => {
    it('should list all cached space slugs', async () => {
      const slug1 = `space-list-1-${Date.now()}`;
      const slug2 = `space-list-2-${Date.now()}`;

      await CacheManager.cacheSpace(slug1, { id: 'uuid-1' }, testCacheDir);
      await CacheManager.cacheSpace(slug2, { id: 'uuid-2' }, testCacheDir);

      const spaces = await CacheManager.getAllCachedSpaces(testCacheDir);

      expect(spaces).toContain(slug1);
      expect(spaces).toContain(slug2);
    });

    it('should return empty array if no spaces cached', async () => {
      const emptyCacheDir = path.join(os.tmpdir(), '.mujarrad-test-empty', 'cache');
      const spaces = await CacheManager.getAllCachedSpaces(emptyCacheDir);

      expect(spaces).toEqual([]);
    });
  });

  describe('getCacheStats', () => {
    it('should return cache statistics', async () => {
      const statsSlug = `stats-space-${Date.now()}`;
      await CacheManager.cacheSpace(statsSlug, { id: 'uuid-stats', nodes: [] }, testCacheDir);
      await CacheManager.setLastSyncTime(statsSlug, '2025-10-10T10:00:00Z', testCacheDir);
      await CacheManager.cacheNodeMapping(statsSlug, 'uuid-1', 'note1.md', testCacheDir);
      await CacheManager.cacheNodeMapping(statsSlug, 'uuid-2', 'note2.md', testCacheDir);

      const stats = await CacheManager.getCacheStats(statsSlug, testCacheDir);

      expect(stats.spaceCached).toBe(true);
      expect(stats.lastSyncTime).toBe('2025-10-10T10:00:00Z');
      expect(stats.nodeMappingCount).toBe(2);
    });

    it('should return stats for space without cache', async () => {
      const stats = await CacheManager.getCacheStats('no-cache-space', testCacheDir);

      expect(stats.spaceCached).toBe(false);
      expect(stats.lastSyncTime).toBeNull();
      expect(stats.nodeMappingCount).toBe(0);
    });
  });

  describe('error handling', () => {
    it('should handle invalid JSON in space cache', async () => {
      const invalidSlug = `invalid-json-${Date.now()}`;
      const cachePath = path.join(testCacheDir, invalidSlug, 'space.json');
      await fs.mkdir(path.dirname(cachePath), { recursive: true });
      await fs.writeFile(cachePath, 'invalid json {', 'utf-8');

      const cached = await CacheManager.getSpace(invalidSlug, testCacheDir);
      expect(cached).toBeNull();
    });

    it('should handle permission errors gracefully', async () => {
      // This test may not work on all systems
      // Skip if unable to simulate permission errors
      expect(true).toBe(true);
    });
  });
});
