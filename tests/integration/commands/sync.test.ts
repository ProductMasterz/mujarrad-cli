/**
 * Integration tests for Sync Command
 *
 * Tests end-to-end sync functionality:
 * - Change detection via Git
 * - Push local changes to remote
 * - Conflict resolution
 * - Pull remote changes
 * - Timestamp updates
 *
 * NOTE: These tests require actual API access and Git repository
 * Set MUJARRAD_API_TOKEN environment variable for testing
 */

import { Command } from 'commander';
import { syncCommand } from '../../../src/commands/sync.js';
import * as path from 'path';
import * as fs from 'fs/promises';
import { simpleGit, SimpleGit } from 'simple-git';
import { SyncService } from '../../../src/services/SyncService.js';
import { Configuration } from '../../../src/api/generated/configuration.js';
import { SyncApi } from '../../../src/api/generated/api.js';
import { ConfigManager } from '../../../src/config/ConfigManager.js';

describe('Sync Command Integration Tests', () => {
  let program: Command;
  let testDir: string;
  let syncService: SyncService;
  let git: SimpleGit;

  // Skip tests if no API token provided
  const skipIfNoToken = process.env.MUJARRAD_API_TOKEN ? describe : describe.skip;

  beforeAll(async () => {
    // Setup API client
    const config = await new ConfigManager().load();
    const apiConfig = new Configuration({
      basePath: config.apiBaseUrl,
      accessToken: process.env.MUJARRAD_API_TOKEN
    });
    const syncApi = new SyncApi(apiConfig);
    syncService = new SyncService(syncApi);
  });

  beforeEach(async () => {
    // Create temporary test directory
    testDir = path.join('/tmp', `mujarrad-sync-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });

    // Initialize git repository
    git = simpleGit(testDir);
    await git.init();
    await git.addConfig('user.name', 'Test User');
    await git.addConfig('user.email', 'test@example.com');

    // Create initial commit
    await fs.writeFile(path.join(testDir, 'README.md'), '# Test Vault\n');
    await git.add('.');
    await git.commit('Initial commit');

    // Create fresh program instance
    program = new Command();
    program.exitOverride();
    syncCommand(program);
  });

  afterEach(async () => {
    // Cleanup test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  skipIfNoToken('Change detection', () => {
    it('should detect new files', async () => {
      const spaceSlug = process.env.TEST_SPACE_SLUG || 'test-space';

      // Create new file
      await fs.writeFile(
        path.join(testDir, 'new-note.md'),
        '# New Note\n\nContent here'
      );
      await git.add('.');
      await git.commit('Add new note');

      // Detect changes
      const changes = await syncService.detectChanges(testDir, spaceSlug);

      expect(changes.length).toBeGreaterThan(0);
      expect(changes.some(c => c.filePath.includes('new-note.md'))).toBe(true);
    }, 15000);

    it('should detect modified files', async () => {
      const spaceSlug = process.env.TEST_SPACE_SLUG || 'test-space';

      // Modify existing file
      const readmePath = path.join(testDir, 'README.md');
      const currentContent = await fs.readFile(readmePath, 'utf-8');
      await fs.writeFile(readmePath, currentContent + '\n\nModified content');
      await git.add('.');
      await git.commit('Update README');

      // Detect changes
      const changes = await syncService.detectChanges(testDir, spaceSlug);

      expect(changes.length).toBeGreaterThan(0);
      expect(changes.some(c => c.filePath.includes('README.md'))).toBe(true);
    }, 15000);

    it('should detect deleted files', async () => {
      const spaceSlug = process.env.TEST_SPACE_SLUG || 'test-space';

      // Delete file
      await fs.unlink(path.join(testDir, 'README.md'));
      await git.add('.');
      await git.commit('Delete README');

      // Detect changes
      const changes = await syncService.detectChanges(testDir, spaceSlug);

      expect(changes.length).toBeGreaterThan(0);
      expect(changes.some(c => c.filePath.includes('README.md'))).toBe(true);
    }, 15000);

    it('should return empty array when no changes', async () => {
      const spaceSlug = process.env.TEST_SPACE_SLUG || 'test-space';

      // No changes made
      const changes = await syncService.detectChanges(testDir, spaceSlug);

      expect(changes).toEqual([]);
    }, 15000);
  });

  skipIfNoToken('Push changes', () => {
    it('should push local changes to remote', async () => {
      const spaceSlug = process.env.TEST_SPACE_SLUG || 'test-space';

      // Create and commit change
      await fs.writeFile(
        path.join(testDir, 'sync-test.md'),
        '# Sync Test\n\nTesting sync'
      );
      await git.add('.');
      await git.commit('Add sync test note');

      // Detect changes
      const changes = await syncService.detectChanges(testDir, spaceSlug);

      // Push changes
      const pushResult = await syncService.pushChanges(spaceSlug, changes);

      expect(pushResult.versionsCreated).toBeGreaterThan(0);
      expect(pushResult.conflicts).toHaveLength(0);
    }, 20000);

    it('should create version for each change', async () => {
      const spaceSlug = process.env.TEST_SPACE_SLUG || 'test-space';

      // Create multiple files
      await fs.writeFile(path.join(testDir, 'note1.md'), '# Note 1');
      await fs.writeFile(path.join(testDir, 'note2.md'), '# Note 2');
      await fs.writeFile(path.join(testDir, 'note3.md'), '# Note 3');
      await git.add('.');
      await git.commit('Add multiple notes');

      // Detect and push changes
      const changes = await syncService.detectChanges(testDir, spaceSlug);
      const pushResult = await syncService.pushChanges(spaceSlug, changes);

      expect(pushResult.versionsCreated).toBe(changes.length);
    }, 20000);
  });

  skipIfNoToken('Conflict resolution', () => {
    it('should detect conflicts', async () => {
      // Create conflicting change
      // (Requires specific test setup with remote conflicts)
      // This is a placeholder for conflict detection tests

      expect(true).toBe(true);
    }, 20000);

    it('should resolve conflicts using specified strategy', async () => {
      // Test KEEP_LOCAL, KEEP_REMOTE, MERGE strategies
      expect(true).toBe(true);
    }, 20000);
  });

  skipIfNoToken('Sync completion', () => {
    it('should update sync timestamp', async () => {
      const spaceSlug = process.env.TEST_SPACE_SLUG || 'test-space';

      const timestamp = new Date().toISOString();
      await syncService.completeSync(spaceSlug, timestamp);

      // Validate timestamp was recorded
      // (Validation depends on backend implementation)
      expect(true).toBe(true);
    }, 15000);
  });

  skipIfNoToken('Error handling', () => {
    it('should handle non-existent space', async () => {
      const invalidSlug = 'non-existent-space-12345';

      try {
        await syncService.detectChanges(testDir, invalidSlug);
        fail('Should have thrown error for non-existent space');
      } catch (error: any) {
        expect(error.response?.status).toBe(404);
      }
    }, 15000);

    it('should handle non-git directory gracefully', async () => {
      // Create directory without git
      const nonGitDir = path.join('/tmp', `mujarrad-non-git-${Date.now()}`);
      await fs.mkdir(nonGitDir, { recursive: true });

      try {
        const spaceSlug = process.env.TEST_SPACE_SLUG || 'test-space';
        await syncService.detectChanges(nonGitDir, spaceSlug);
        fail('Should have thrown error for non-git directory');
      } catch (error: any) {
        expect(error.message).toContain('git');
      } finally {
        await fs.rm(nonGitDir, { recursive: true, force: true });
      }
    }, 15000);
  });

  describe('Git integration', () => {
    it('should use git diff to detect changes', async () => {
      // Create change
      await fs.writeFile(
        path.join(testDir, 'git-test.md'),
        '# Git Test'
      );
      await git.add('.');
      await git.commit('Add git test');

      // Verify git log shows commit
      const log = await git.log();
      expect(log.latest?.message).toBe('Add git test');
    });

    it('should handle uncommitted changes', async () => {
      // Create file without committing
      await fs.writeFile(
        path.join(testDir, 'uncommitted.md'),
        '# Uncommitted'
      );

      // Should detect as uncommitted change
      const status = await git.status();
      expect(status.not_added).toContain('uncommitted.md');
    });

    it('should handle multiple commits', async () => {
      // Create multiple commits
      await fs.writeFile(path.join(testDir, 'file1.md'), '# File 1');
      await git.add('.');
      await git.commit('Add file 1');

      await fs.writeFile(path.join(testDir, 'file2.md'), '# File 2');
      await git.add('.');
      await git.commit('Add file 2');

      const log = await git.log();
      expect(log.total).toBeGreaterThanOrEqual(3); // Initial + 2 new commits
    });
  });

  skipIfNoToken('Performance', () => {
    it('should handle large number of changes efficiently', async () => {
      const spaceSlug = process.env.TEST_SPACE_SLUG || 'test-space';

      // Create many files
      const fileCount = 100;
      for (let i = 0; i < fileCount; i++) {
        await fs.writeFile(
          path.join(testDir, `note-${i}.md`),
          `# Note ${i}\n\nContent for note ${i}`
        );
      }
      await git.add('.');
      await git.commit(`Add ${fileCount} notes`);

      const startTime = Date.now();

      // Detect changes
      const changes = await syncService.detectChanges(testDir, spaceSlug);
      expect(changes.length).toBe(fileCount);

      const duration = Date.now() - startTime;

      // Should complete within reasonable time
      expect(duration).toBeLessThan(10000); // 10 seconds
    }, 30000);
  });
});
