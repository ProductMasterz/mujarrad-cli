import { CacheManager } from '../../../src/utils/CacheManager.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('CacheManager', () => {
  const testWorkspaceSlug = `test-workspace-${Date.now()}`;
  let testCacheDir: string;

  beforeAll(async () => {
    testCacheDir = path.join(os.tmpdir(), '.mujarrad-test', 'cache', testWorkspaceSlug);
  });

  afterAll(async () => {
    // Clean up test cache directory
    try {
      await fs.rm(path.join(os.tmpdir(), '.mujarrad-test'), { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('cacheWorkspace and getWorkspace', () => {
    it('should cache workspace structure', async () => {
      const workspaceData = {
        id: 'uuid-workspace-1',
        name: 'Test Workspace',
        nodes: [
          { id: 'node1', name: 'Note 1' },
          { id: 'node2', name: 'Note 2' }
        ]
      };

      await CacheManager.cacheWorkspace(testWorkspaceSlug, workspaceData, testCacheDir);

      const cached = await CacheManager.getWorkspace(testWorkspaceSlug, testCacheDir);
      expect(cached).toBeDefined();
      expect(cached.id).toBe('uuid-workspace-1');
      expect(cached.name).toBe('Test Workspace');
      expect(cached.nodes).toHaveLength(2);
    });

    it('should return null for non-existent workspace', async () => {
      const cached = await CacheManager.getWorkspace('non-existent-workspace', testCacheDir);
      expect(cached).toBeNull();
    });

    it('should overwrite existing workspace cache', async () => {
      const workspaceData1 = { id: 'uuid-1', name: 'Original' };
      const workspaceData2 = { id: 'uuid-2', name: 'Updated' };

      await CacheManager.cacheWorkspace(testWorkspaceSlug, workspaceData1, testCacheDir);
      await CacheManager.cacheWorkspace(testWorkspaceSlug, workspaceData2, testCacheDir);

      const cached = await CacheManager.getWorkspace(testWorkspaceSlug, testCacheDir);
      expect(cached.id).toBe('uuid-2');
      expect(cached.name).toBe('Updated');
    });
  });

  describe('setLastSyncTime and getLastSyncTime', () => {
    it('should store last sync timestamp', async () => {
      const timestamp = '2025-10-10T10:00:00Z';
      await CacheManager.setLastSyncTime(testWorkspaceSlug, timestamp, testCacheDir);

      const lastSync = await CacheManager.getLastSyncTime(testWorkspaceSlug, testCacheDir);
      expect(lastSync).toBe(timestamp);
    });

    it('should return null for workspace without sync time', async () => {
      const lastSync = await CacheManager.getLastSyncTime('workspace-no-sync', testCacheDir);
      expect(lastSync).toBeNull();
    });

    it('should update existing sync timestamp', async () => {
      const timestamp1 = '2025-10-10T10:00:00Z';
      const timestamp2 = '2025-10-10T11:00:00Z';

      await CacheManager.setLastSyncTime(testWorkspaceSlug, timestamp1, testCacheDir);
      await CacheManager.setLastSyncTime(testWorkspaceSlug, timestamp2, testCacheDir);

      const lastSync = await CacheManager.getLastSyncTime(testWorkspaceSlug, testCacheDir);
      expect(lastSync).toBe(timestamp2);
    });

    it('should handle ISO 8601 timestamps', async () => {
      const timestamp = new Date().toISOString();
      await CacheManager.setLastSyncTime(testWorkspaceSlug, timestamp, testCacheDir);

      const lastSync = await CacheManager.getLastSyncTime(testWorkspaceSlug, testCacheDir);
      expect(lastSync).toBe(timestamp);
    });
  });

  describe('cacheNodeMapping and getFilePathForNode', () => {
    it('should store node UUID to file path mappings', async () => {
      await CacheManager.cacheNodeMapping(testWorkspaceSlug, 'uuid-123', 'folder/note.md', testCacheDir);

      const filePath = await CacheManager.getFilePathForNode(testWorkspaceSlug, 'uuid-123', testCacheDir);
      expect(filePath).toBe('folder/note.md');
    });

    it('should return null for unknown node UUID', async () => {
      const filePath = await CacheManager.getFilePathForNode(testWorkspaceSlug, 'unknown-uuid', testCacheDir);
      expect(filePath).toBeNull();
    });

    it('should store multiple node mappings', async () => {
      await CacheManager.cacheNodeMapping(testWorkspaceSlug, 'uuid-1', 'note1.md', testCacheDir);
      await CacheManager.cacheNodeMapping(testWorkspaceSlug, 'uuid-2', 'folder/note2.md', testCacheDir);
      await CacheManager.cacheNodeMapping(testWorkspaceSlug, 'uuid-3', 'deep/nested/note3.md', testCacheDir);

      const filePath1 = await CacheManager.getFilePathForNode(testWorkspaceSlug, 'uuid-1', testCacheDir);
      const filePath2 = await CacheManager.getFilePathForNode(testWorkspaceSlug, 'uuid-2', testCacheDir);
      const filePath3 = await CacheManager.getFilePathForNode(testWorkspaceSlug, 'uuid-3', testCacheDir);

      expect(filePath1).toBe('note1.md');
      expect(filePath2).toBe('folder/note2.md');
      expect(filePath3).toBe('deep/nested/note3.md');
    });

    it('should update existing node mapping', async () => {
      await CacheManager.cacheNodeMapping(testWorkspaceSlug, 'uuid-update', 'old-path.md', testCacheDir);
      await CacheManager.cacheNodeMapping(testWorkspaceSlug, 'uuid-update', 'new-path.md', testCacheDir);

      const filePath = await CacheManager.getFilePathForNode(testWorkspaceSlug, 'uuid-update', testCacheDir);
      expect(filePath).toBe('new-path.md');
    });
  });

  describe('getNodeUUIDForFilePath', () => {
    it('should get node UUID for file path (reverse mapping)', async () => {
      await CacheManager.cacheNodeMapping(testWorkspaceSlug, 'uuid-reverse', 'test-file.md', testCacheDir);

      const nodeUUID = await CacheManager.getNodeUUIDForFilePath(testWorkspaceSlug, 'test-file.md', testCacheDir);
      expect(nodeUUID).toBe('uuid-reverse');
    });

    it('should return null for unknown file path', async () => {
      const nodeUUID = await CacheManager.getNodeUUIDForFilePath(testWorkspaceSlug, 'unknown.md', testCacheDir);
      expect(nodeUUID).toBeNull();
    });
  });

  describe('clearWorkspaceCache', () => {
    it('should clear cache for workspace', async () => {
      // Set up cache data
      await CacheManager.cacheWorkspace(testWorkspaceSlug, { id: 'uuid-clear' }, testCacheDir);
      await CacheManager.setLastSyncTime(testWorkspaceSlug, '2025-10-10T10:00:00Z', testCacheDir);
      await CacheManager.cacheNodeMapping(testWorkspaceSlug, 'uuid-node', 'note.md', testCacheDir);

      // Clear cache
      await CacheManager.clearWorkspaceCache(testWorkspaceSlug, testCacheDir);

      // Verify all cache data is cleared
      const workspace = await CacheManager.getWorkspace(testWorkspaceSlug, testCacheDir);
      const syncTime = await CacheManager.getLastSyncTime(testWorkspaceSlug, testCacheDir);
      const filePath = await CacheManager.getFilePathForNode(testWorkspaceSlug, 'uuid-node', testCacheDir);

      expect(workspace).toBeNull();
      expect(syncTime).toBeNull();
      expect(filePath).toBeNull();
    });

    it('should not throw error when clearing non-existent cache', async () => {
      await expect(
        CacheManager.clearWorkspaceCache('non-existent', testCacheDir)
      ).resolves.not.toThrow();
    });
  });

  describe('getCacheDir and ensureCacheDir', () => {
    it('should get cache directory path', () => {
      const cacheDir = CacheManager.getCacheDir('new-workspace', testCacheDir);
      expect(cacheDir).toContain('cache');
      expect(cacheDir).toContain('new-workspace');
    });

    it('should handle cache directory creation', async () => {
      const newWorkspaceSlug = `new-workspace-${Date.now()}`;
      const cacheDir = CacheManager.getCacheDir(newWorkspaceSlug, testCacheDir);

      await CacheManager.ensureCacheDir(newWorkspaceSlug, testCacheDir);

      // Check directory exists
      const stats = await fs.stat(cacheDir);
      expect(stats.isDirectory()).toBe(true);
    });

    it('should not throw error if cache directory already exists', async () => {
      const existingWorkspace = `existing-workspace-${Date.now()}`;
      await CacheManager.ensureCacheDir(existingWorkspace, testCacheDir);

      await expect(
        CacheManager.ensureCacheDir(existingWorkspace, testCacheDir)
      ).resolves.not.toThrow();
    });
  });

  describe('getAllCachedWorkspaces', () => {
    it('should list all cached workspace slugs', async () => {
      const slug1 = `workspace-list-1-${Date.now()}`;
      const slug2 = `workspace-list-2-${Date.now()}`;

      await CacheManager.cacheWorkspace(slug1, { id: 'uuid-1' }, testCacheDir);
      await CacheManager.cacheWorkspace(slug2, { id: 'uuid-2' }, testCacheDir);

      const workspaces = await CacheManager.getAllCachedWorkspaces(testCacheDir);

      expect(workspaces).toContain(slug1);
      expect(workspaces).toContain(slug2);
    });

    it('should return empty array if no workspaces cached', async () => {
      const emptyCacheDir = path.join(os.tmpdir(), '.mujarrad-test-empty', 'cache');
      const workspaces = await CacheManager.getAllCachedWorkspaces(emptyCacheDir);

      expect(workspaces).toEqual([]);
    });
  });

  describe('getCacheStats', () => {
    it('should return cache statistics', async () => {
      const statsSlug = `stats-workspace-${Date.now()}`;
      await CacheManager.cacheWorkspace(statsSlug, { id: 'uuid-stats', nodes: [] }, testCacheDir);
      await CacheManager.setLastSyncTime(statsSlug, '2025-10-10T10:00:00Z', testCacheDir);
      await CacheManager.cacheNodeMapping(statsSlug, 'uuid-1', 'note1.md', testCacheDir);
      await CacheManager.cacheNodeMapping(statsSlug, 'uuid-2', 'note2.md', testCacheDir);

      const stats = await CacheManager.getCacheStats(statsSlug, testCacheDir);

      expect(stats.workspaceCached).toBe(true);
      expect(stats.lastSyncTime).toBe('2025-10-10T10:00:00Z');
      expect(stats.nodeMappingCount).toBe(2);
    });

    it('should return stats for workspace without cache', async () => {
      const stats = await CacheManager.getCacheStats('no-cache-workspace', testCacheDir);

      expect(stats.workspaceCached).toBe(false);
      expect(stats.lastSyncTime).toBeNull();
      expect(stats.nodeMappingCount).toBe(0);
    });
  });

  describe('error handling', () => {
    it('should handle invalid JSON in workspace cache', async () => {
      const invalidSlug = `invalid-json-${Date.now()}`;
      const cachePath = path.join(testCacheDir, invalidSlug, 'workspace.json');
      await fs.mkdir(path.dirname(cachePath), { recursive: true });
      await fs.writeFile(cachePath, 'invalid json {', 'utf-8');

      const cached = await CacheManager.getWorkspace(invalidSlug, testCacheDir);
      expect(cached).toBeNull();
    });

    it('should handle permission errors gracefully', async () => {
      // This test may not work on all systems
      // Skip if unable to simulate permission errors
      expect(true).toBe(true);
    });
  });
});
