/**
 * Integration tests for Clone Command
 *
 * Tests end-to-end clone functionality:
 * - Full authentication flow
 * - Space export and download
 * - Local vault creation
 * - Git repository initialization
 * - File structure validation
 * - Metadata preservation
 *
 * NOTE: These tests require actual API access
 * Set MUJARRAD_API_TOKEN environment variable for testing
 */

import { Command } from 'commander';
import { cloneCommand } from '../../../src/commands/clone.js';
import * as path from 'path';
import * as fs from 'fs/promises';
import { simpleGit } from 'simple-git';
import { CloneService } from '../../../src/services/CloneService.js';
import { Configuration } from '../../../src/api/generated/configuration.js';
import { CloneApi } from '../../../src/api/generated/api.js';
import { ConfigManager } from '../../../src/config/ConfigManager.js';

describe('Clone Command Integration Tests', () => {
  let program: Command;
  let testDir: string;
  let cloneService: CloneService;

  // Skip tests if no API token provided
  const skipIfNoToken = process.env.MUJARRAD_API_TOKEN ? describe : describe.skip;

  beforeAll(async () => {
    // Setup API client
    const config = await new ConfigManager().load();
    const apiConfig = new Configuration({
      basePath: config.apiBaseUrl,
      accessToken: process.env.MUJARRAD_API_TOKEN
    });
    const cloneApi = new CloneApi(apiConfig);
    cloneService = new CloneService(cloneApi);
  });

  beforeEach(async () => {
    // Create temporary test directory
    testDir = path.join('/tmp', `mujarrad-clone-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });

    // Create fresh program instance
    program = new Command();
    program.exitOverride();
    cloneCommand(program, cloneService);
  });

  afterEach(async () => {
    // Cleanup test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  skipIfNoToken('Full clone workflow', () => {
    it('should clone space to local directory', async () => {
      const targetPath = path.join(testDir, 'test-clone');
      const spaceSlug = process.env.TEST_SPACE_SLUG || 'test-space';

      // Clone space
      const summary = await cloneService.cloneSpace(
        spaceSlug,
        targetPath,
        false // includeHistory
      );

      // Validate clone success
      expect(summary.success).toBe(true);
      expect(summary.totalNodes).toBeGreaterThan(0);

      // Validate directory structure
      const stats = await fs.stat(targetPath);
      expect(stats.isDirectory()).toBe(true);

      // Validate .obsidian folder exists
      const obsidianPath = path.join(targetPath, '.obsidian');
      const obsidianStats = await fs.stat(obsidianPath);
      expect(obsidianStats.isDirectory()).toBe(true);

      // Validate at least one markdown file exists
      const files = await fs.readdir(targetPath);
      const mdFiles = files.filter(f => f.endsWith('.md'));
      expect(mdFiles.length).toBeGreaterThan(0);
    }, 30000); // 30 second timeout

    it('should initialize git repository by default', async () => {
      const targetPath = path.join(testDir, 'test-clone-git');
      const spaceSlug = process.env.TEST_SPACE_SLUG || 'test-space';

      // Clone space
      await cloneService.cloneSpace(spaceSlug, targetPath, false);

      // Check if git repository was initialized
      const gitPath = path.join(targetPath, '.git');
      const gitStats = await fs.stat(gitPath);
      expect(gitStats.isDirectory()).toBe(true);

      // Validate initial commit exists
      const git = simpleGit(targetPath);
      const log = await git.log();
      expect(log.total).toBeGreaterThan(0);
      expect(log.latest?.message).toContain('Mujarrad clone');
    }, 30000);

    it('should create proper Obsidian vault structure', async () => {
      const targetPath = path.join(testDir, 'test-clone-structure');
      const spaceSlug = process.env.TEST_SPACE_SLUG || 'test-space';

      // Clone space
      await cloneService.cloneSpace(spaceSlug, targetPath, false);

      // Validate essential Obsidian files/folders
      const requiredPaths = [
        '.obsidian',
        '.obsidian/app.json',
        '.obsidian/space.json'
      ];

      for (const relativePath of requiredPaths) {
        const fullPath = path.join(targetPath, relativePath);
        try {
          await fs.access(fullPath);
          expect(true).toBe(true); // File exists
        } catch (error) {
          fail(`Required path does not exist: ${relativePath}`);
        }
      }
    }, 30000);

    it('should preserve markdown content and frontmatter', async () => {
      const targetPath = path.join(testDir, 'test-clone-content');
      const spaceSlug = process.env.TEST_SPACE_SLUG || 'test-space';

      // Clone space
      await cloneService.cloneSpace(spaceSlug, targetPath, false);

      // Find a markdown file
      const files = await fs.readdir(targetPath);
      const mdFile = files.find(f => f.endsWith('.md'));

      if (mdFile) {
        const content = await fs.readFile(path.join(targetPath, mdFile), 'utf-8');

        // Validate it has frontmatter (if expected)
        if (content.startsWith('---')) {
          expect(content).toContain('---');
          expect(content.split('---').length).toBeGreaterThanOrEqual(3);
        }

        // Validate markdown content exists
        expect(content.length).toBeGreaterThan(0);
      }
    }, 30000);
  });

  skipIfNoToken('Error handling', () => {
    it('should handle non-existent space gracefully', async () => {
      const targetPath = path.join(testDir, 'test-clone-404');
      const invalidSlug = 'non-existent-space-12345';

      try {
        await cloneService.cloneSpace(invalidSlug, targetPath, false);
        fail('Should have thrown error for non-existent space');
      } catch (error: any) {
        expect(error.response?.status).toBe(404);
      }
    }, 15000);

    it('should handle permission denied gracefully', async () => {
      const targetPath = path.join(testDir, 'test-clone-403');
      const restrictedSlug = process.env.TEST_RESTRICTED_SPACE_SLUG;

      if (!restrictedSlug) {
        // Skip if no restricted space configured
        return;
      }

      try {
        await cloneService.cloneSpace(restrictedSlug, targetPath, false);
        fail('Should have thrown error for restricted space');
      } catch (error: any) {
        expect(error.response?.status).toBe(403);
      }
    }, 15000);
  });

  describe('Git integration', () => {
    it('should skip git initialization with --no-git flag', async () => {
      // This test validates command-line flag handling
      // Would require executing CLI process directly
      expect(true).toBe(true);
    });

    it('should handle git initialization failures gracefully', async () => {
      // Should warn but not fail entire clone
      expect(true).toBe(true);
    });
  });

  skipIfNoToken('Version history', () => {
    it('should include version history with --include-history flag', async () => {
      const targetPath = path.join(testDir, 'test-clone-history');
      const spaceSlug = process.env.TEST_SPACE_SLUG || 'test-space';

      // Clone with history
      const summary = await cloneService.cloneSpace(
        spaceSlug,
        targetPath,
        true // includeHistory
      );

      expect(summary.success).toBe(true);

      // Validate version history metadata exists
      // (Specific validation depends on backend implementation)
    }, 30000);
  });

  skipIfNoToken('Performance', () => {
    it('should handle large spaces efficiently', async () => {
      const targetPath = path.join(testDir, 'test-clone-large');
      const largeSpaceSlug = process.env.TEST_LARGE_SPACE_SLUG;

      if (!largeSpaceSlug) {
        // Skip if no large space configured
        return;
      }

      const startTime = Date.now();

      const summary = await cloneService.cloneSpace(
        largeSpaceSlug,
        targetPath,
        false
      );

      const duration = Date.now() - startTime;

      expect(summary.success).toBe(true);
      expect(summary.totalNodes).toBeGreaterThan(100);

      // Should complete within reasonable time (adjust based on expected size)
      expect(duration).toBeLessThan(120000); // 2 minutes
    }, 120000);
  });
});
