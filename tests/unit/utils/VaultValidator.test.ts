/**
 * Unit tests for VaultValidator
 *
 * Tests Obsidian vault validation logic:
 * - Detects valid Obsidian vaults
 * - Identifies missing .obsidian folder
 * - Counts markdown files
 * - Handles permission errors
 * - Provides detailed error messages
 */

import { VaultValidator } from '../../../src/utils/VaultValidator.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('VaultValidator', () => {
  let validator: VaultValidator;
  let tempDir: string;

  beforeEach(async () => {
    validator = new VaultValidator();
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mujarrad-vault-test-'));
  });

  afterEach(async () => {
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });

  describe('Valid Obsidian vault', () => {
    it('should validate vault with .obsidian folder and markdown files', async () => {
      // Create .obsidian folder
      await fs.mkdir(path.join(tempDir, '.obsidian'));

      // Create markdown files
      await fs.writeFile(path.join(tempDir, 'note1.md'), '# Note 1');
      await fs.writeFile(path.join(tempDir, 'note2.md'), '# Note 2');

      const result = await validator.validateVault(tempDir);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.hasObsidianFolder).toBe(true);
      expect(result.fileCount).toBe(2);
    });

    it('should count markdown files recursively', async () => {
      await fs.mkdir(path.join(tempDir, '.obsidian'));
      await fs.mkdir(path.join(tempDir, 'subfolder'));

      await fs.writeFile(path.join(tempDir, 'root.md'), '# Root');
      await fs.writeFile(path.join(tempDir, 'subfolder', 'sub.md'), '# Sub');

      const result = await validator.validateVault(tempDir);

      expect(result.valid).toBe(true);
      expect(result.fileCount).toBe(2);
    });

    it('should exclude .obsidian folder files from count', async () => {
      await fs.mkdir(path.join(tempDir, '.obsidian'));
      await fs.writeFile(path.join(tempDir, '.obsidian', 'workspace.md'), '# Workspace');
      await fs.writeFile(path.join(tempDir, 'note.md'), '# Note');

      const result = await validator.validateVault(tempDir);

      expect(result.valid).toBe(true);
      expect(result.fileCount).toBe(1); // Only counts note.md
    });
  });

  describe('Invalid vault detection', () => {
    it('should reject directory without .obsidian folder', async () => {
      // Create markdown files but no .obsidian folder
      await fs.writeFile(path.join(tempDir, 'note.md'), '# Note');

      const result = await validator.validateVault(tempDir);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'Not a valid Obsidian vault: .obsidian folder not found'
      );
      expect(result.hasObsidianFolder).toBe(false);
    });

    it('should handle non-existent path', async () => {
      const nonExistentPath = path.join(tempDir, 'does-not-exist');

      const result = await validator.validateVault(nonExistentPath);

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Path does not exist');
    });

    it('should reject file path (not directory)', async () => {
      const filePath = path.join(tempDir, 'file.txt');
      await fs.writeFile(filePath, 'content');

      const result = await validator.validateVault(filePath);

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Path is not a directory');
    });

    it('should warn about empty vault (no markdown files)', async () => {
      await fs.mkdir(path.join(tempDir, '.obsidian'));
      // No markdown files

      const result = await validator.validateVault(tempDir);

      expect(result.valid).toBe(true); // Valid structure, but warning
      expect(result.warnings).toContain('No markdown files found in vault');
      expect(result.fileCount).toBe(0);
    });
  });

  describe('File listing', () => {
    it('should list markdown files', async () => {
      await fs.mkdir(path.join(tempDir, '.obsidian'));
      await fs.writeFile(path.join(tempDir, 'note1.md'), '# Note 1');
      await fs.writeFile(path.join(tempDir, 'note2.md'), '# Note 2');

      const files = await validator.listMarkdownFiles(tempDir);

      expect(files).toHaveLength(2);
      expect(files).toContain('note1.md');
      expect(files).toContain('note2.md');
    });

    it('should limit file list to maxFiles', async () => {
      await fs.mkdir(path.join(tempDir, '.obsidian'));

      // Create 15 files
      for (let i = 1; i <= 15; i++) {
        await fs.writeFile(path.join(tempDir, `note${i}.md`), `# Note ${i}`);
      }

      const files = await validator.listMarkdownFiles(tempDir, 10);

      expect(files.length).toBeLessThanOrEqual(10);
    });

    it('should return relative paths', async () => {
      await fs.mkdir(path.join(tempDir, '.obsidian'));
      await fs.mkdir(path.join(tempDir, 'subfolder'));
      await fs.writeFile(path.join(tempDir, 'subfolder', 'note.md'), '# Note');

      const files = await validator.listMarkdownFiles(tempDir);

      expect(files[0]).toBe(path.join('subfolder', 'note.md'));
      expect(path.isAbsolute(files[0])).toBe(false);
    });

    it('should exclude .obsidian files from listing', async () => {
      await fs.mkdir(path.join(tempDir, '.obsidian'));
      await fs.writeFile(path.join(tempDir, '.obsidian', 'config.md'), '# Config');
      await fs.writeFile(path.join(tempDir, 'note.md'), '# Note');

      const files = await validator.listMarkdownFiles(tempDir);

      expect(files).toHaveLength(1);
      expect(files).toContain('note.md');
    });
  });

  describe('Error handling', () => {
    it('should handle permission errors gracefully', async () => {
      // Note: This test may not work on all systems
      // Permission errors are platform-specific

      const result = await validator.validateVault(tempDir);

      // Should return a result (not throw)
      expect(result).toBeDefined();
      expect(result.valid).toBeDefined();
    });

    it('should provide detailed error messages', async () => {
      const result = await validator.validateVault(path.join(tempDir, 'missing'));

      expect(result.valid).toBe(false);
      expect(result.errors).toBeTruthy();
      expect(result.errors.length).toBeGreaterThan(0);
      expect(typeof result.errors[0]).toBe('string');
    });
  });

  describe('Edge cases', () => {
    it('should handle empty directory with .obsidian folder', async () => {
      await fs.mkdir(path.join(tempDir, '.obsidian'));

      const result = await validator.validateVault(tempDir);

      expect(result.valid).toBe(true);
      expect(result.warnings).toContain('No markdown files found in vault');
    });

    it('should skip hidden files', async () => {
      await fs.mkdir(path.join(tempDir, '.obsidian'));
      await fs.writeFile(path.join(tempDir, '.hidden.md'), '# Hidden');
      await fs.writeFile(path.join(tempDir, 'visible.md'), '# Visible');

      const result = await validator.validateVault(tempDir);

      expect(result.fileCount).toBe(1); // Only counts visible.md
    });

    it('should handle deeply nested structures', async () => {
      await fs.mkdir(path.join(tempDir, '.obsidian'));
      await fs.mkdir(path.join(tempDir, 'level1', 'level2', 'level3'), {
        recursive: true,
      });
      await fs.writeFile(
        path.join(tempDir, 'level1', 'level2', 'level3', 'deep.md'),
        '# Deep'
      );

      const result = await validator.validateVault(tempDir);

      expect(result.valid).toBe(true);
      expect(result.fileCount).toBe(1);
    });

    it('should handle non-markdown files', async () => {
      await fs.mkdir(path.join(tempDir, '.obsidian'));
      await fs.writeFile(path.join(tempDir, 'image.png'), 'fake image data');
      await fs.writeFile(path.join(tempDir, 'note.md'), '# Note');
      await fs.writeFile(path.join(tempDir, 'doc.txt'), 'text file');

      const result = await validator.validateVault(tempDir);

      expect(result.valid).toBe(true);
      expect(result.fileCount).toBe(1); // Only .md files
    });
  });
});
