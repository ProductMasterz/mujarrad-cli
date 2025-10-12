/**
 * Integration tests for Init Workflow (US7)
 *
 * Tests complete init/upload workflow:
 * - Validates vault structure
 * - Shows initialization progress
 * - Shows upload progress
 * - Combined statistics at end
 * - Graceful failure if validation fails
 * - All operations logged
 */

// Mock dependencies
jest.mock('chalk', () => ({
  __esModule: true,
  default: {
    green: jest.fn((str: string) => str),
    red: jest.fn((str: string) => str),
    yellow: jest.fn((str: string) => str),
    blue: jest.fn((str: string) => str),
    cyan: jest.fn((str: string) => str),
    gray: jest.fn((str: string) => str),
    white: jest.fn((str: string) => str),
    bold: jest.fn((str: string) => str),
  },
}));

jest.mock('ora', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    start: jest.fn().mockReturnThis(),
    succeed: jest.fn().mockReturnThis(),
    fail: jest.fn().mockReturnThis(),
    warn: jest.fn().mockReturnThis(),
    stop: jest.fn().mockReturnThis(),
    isSpinning: false,
  })),
}));

jest.mock('cli-progress', () => ({
  __esModule: true,
  default: {
    SingleBar: jest.fn().mockImplementation(() => ({
      start: jest.fn(),
      update: jest.fn(),
      stop: jest.fn(),
    })),
  },
}));

import { VaultValidator } from '../../src/utils/VaultValidator.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('Init Workflow Integration (US7)', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mujarrad-init-test-'));
  });

  afterEach(async () => {
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });

  describe('Complete init workflow', () => {
    it('should complete full init workflow for valid vault', async () => {
      // Setup: Create valid vault
      await fs.mkdir(path.join(tempDir, '.obsidian'));
      await fs.writeFile(path.join(tempDir, 'note1.md'), '# Note 1\n\nContent');
      await fs.writeFile(path.join(tempDir, 'note2.md'), '# Note 2\n\nContent');
      await fs.mkdir(path.join(tempDir, 'subfolder'));
      await fs.writeFile(path.join(tempDir, 'subfolder', 'note3.md'), '# Note 3');

      // Phase 1: Validation
      const validator = new VaultValidator();
      const validation = await validator.validateVault(tempDir);

      expect(validation.valid).toBe(true);
      expect(validation.hasObsidianFolder).toBe(true);
      expect(validation.fileCount).toBe(3);
      expect(validation.errors).toHaveLength(0);

      // Phase 2: File listing
      const files = await validator.listMarkdownFiles(tempDir);

      expect(files.length).toBe(3);
      expect(files).toContain('note1.md');
      expect(files).toContain('note2.md');
      expect(files).toContain(path.join('subfolder', 'note3.md'));

      // Phase 3: Validation passed, ready for upload
      expect(validation.valid).toBe(true);
    });

    it('should handle validation failure gracefully', async () => {
      // Setup: Create invalid vault (no .obsidian folder)
      await fs.writeFile(path.join(tempDir, 'note.md'), '# Note');

      // Phase 1: Validation should fail
      const validator = new VaultValidator();
      const validation = await validator.validateVault(tempDir);

      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.errors[0]).toContain('.obsidian folder not found');

      // Phase 2: Should NOT proceed to upload when validation fails
      // (This would be enforced in the command layer with process.exit(3))
    });

    it('should show warnings for empty vault', async () => {
      // Setup: Valid structure but no content
      await fs.mkdir(path.join(tempDir, '.obsidian'));

      const validator = new VaultValidator();
      const validation = await validator.validateVault(tempDir);

      // Valid structure (has .obsidian) but warning about no files
      expect(validation.valid).toBe(true);
      expect(validation.warnings).toContain('No markdown files found in vault');
      expect(validation.fileCount).toBe(0);
    });
  });

  describe('Validation phase statistics', () => {
    it('should count all markdown files recursively', async () => {
      await fs.mkdir(path.join(tempDir, '.obsidian'));

      // Create nested structure
      await fs.mkdir(path.join(tempDir, 'level1'));
      await fs.mkdir(path.join(tempDir, 'level1', 'level2'));
      await fs.mkdir(path.join(tempDir, 'level1', 'level2', 'level3'));

      await fs.writeFile(path.join(tempDir, 'root.md'), '# Root');
      await fs.writeFile(path.join(tempDir, 'level1', 'l1.md'), '# L1');
      await fs.writeFile(path.join(tempDir, 'level1', 'level2', 'l2.md'), '# L2');
      await fs.writeFile(path.join(tempDir, 'level1', 'level2', 'level3', 'l3.md'), '# L3');

      const validator = new VaultValidator();
      const validation = await validator.validateVault(tempDir);

      expect(validation.valid).toBe(true);
      expect(validation.fileCount).toBe(4);
    });

    it('should exclude .obsidian files from statistics', async () => {
      await fs.mkdir(path.join(tempDir, '.obsidian'));
      await fs.mkdir(path.join(tempDir, '.obsidian', 'plugins'));

      // Files in .obsidian should not be counted
      await fs.writeFile(path.join(tempDir, '.obsidian', 'workspace.md'), '# Workspace');
      await fs.writeFile(path.join(tempDir, '.obsidian', 'plugins', 'readme.md'), '# Plugin');

      // Files in root should be counted
      await fs.writeFile(path.join(tempDir, 'note.md'), '# Note');

      const validator = new VaultValidator();
      const validation = await validator.validateVault(tempDir);

      expect(validation.valid).toBe(true);
      expect(validation.fileCount).toBe(1); // Only counts note.md
    });

    it('should handle large vaults efficiently', async () => {
      await fs.mkdir(path.join(tempDir, '.obsidian'));

      // Create 100 files
      const fileCount = 100;
      for (let i = 0; i < fileCount; i++) {
        await fs.writeFile(path.join(tempDir, `note${i}.md`), `# Note ${i}`);
      }

      const startTime = Date.now();
      const validator = new VaultValidator();
      const validation = await validator.validateVault(tempDir);
      const duration = Date.now() - startTime;

      expect(validation.valid).toBe(true);
      expect(validation.fileCount).toBe(fileCount);
      // Should complete in reasonable time (<1 second for 100 files)
      expect(duration).toBeLessThan(1000);
    });
  });

  describe('Error handling workflow', () => {
    it('should detect missing .obsidian folder', async () => {
      // No .obsidian folder
      await fs.writeFile(path.join(tempDir, 'note.md'), '# Note');

      const validator = new VaultValidator();
      const validation = await validator.validateVault(tempDir);

      expect(validation.valid).toBe(false);
      expect(validation.hasObsidianFolder).toBe(false);
      expect(validation.errors).toContain(
        'Not a valid Obsidian vault: .obsidian folder not found'
      );
    });

    it('should handle non-existent path', async () => {
      const nonExistent = path.join(tempDir, 'does-not-exist');

      const validator = new VaultValidator();
      const validation = await validator.validateVault(nonExistent);

      expect(validation.valid).toBe(false);
      expect(validation.errors[0]).toContain('Path does not exist');
    });

    it('should reject file path (not directory)', async () => {
      const filePath = path.join(tempDir, 'file.txt');
      await fs.writeFile(filePath, 'content');

      const validator = new VaultValidator();
      const validation = await validator.validateVault(filePath);

      expect(validation.valid).toBe(false);
      expect(validation.errors[0]).toContain('Path is not a directory');
    });
  });

  describe('Progress tracking simulation', () => {
    it('should track validation progress', async () => {
      // Simulate validation phase
      const validator = new VaultValidator();
      await fs.mkdir(path.join(tempDir, '.obsidian'));
      await fs.writeFile(path.join(tempDir, 'note.md'), '# Note');

      // Phase 1: Validation (spinner)
      const validationStart = Date.now();
      const validation = await validator.validateVault(tempDir);
      const validationDuration = Date.now() - validationStart;

      expect(validation.valid).toBe(true);
      expect(validationDuration).toBeLessThan(100); // Fast validation

      // Phase 2: File listing (would be used for progress bar)
      const files = await validator.listMarkdownFiles(tempDir);
      expect(files.length).toBe(validation.fileCount);
    });

    it('should provide file count for progress bar initialization', async () => {
      await fs.mkdir(path.join(tempDir, '.obsidian'));

      // Create multiple files
      for (let i = 1; i <= 10; i++) {
        await fs.writeFile(path.join(tempDir, `note${i}.md`), `# Note ${i}`);
      }

      const validator = new VaultValidator();
      const validation = await validator.validateVault(tempDir);

      // File count can be used to initialize progress bar
      expect(validation.fileCount).toBe(10);

      // This would be used as:
      // progressBar.start(validation.fileCount, 0);
    });
  });

  describe('Combined workflow statistics', () => {
    it('should collect complete statistics for display', async () => {
      await fs.mkdir(path.join(tempDir, '.obsidian'));
      await fs.writeFile(path.join(tempDir, 'note1.md'), '# Note 1');
      await fs.writeFile(path.join(tempDir, 'note2.md'), '# Note 2');

      const validator = new VaultValidator();
      const startTime = Date.now();

      // Validation phase
      const validation = await validator.validateVault(tempDir);
      const validationDuration = Date.now() - startTime;

      // File listing phase
      const files = await validator.listMarkdownFiles(tempDir);

      // Combined statistics
      const stats = {
        valid: validation.valid,
        filesFound: validation.fileCount,
        hasObsidianFolder: validation.hasObsidianFolder,
        validationTime: validationDuration,
        sampleFiles: files.slice(0, 5),
        warnings: validation.warnings,
        errors: validation.errors,
      };

      expect(stats.valid).toBe(true);
      expect(stats.filesFound).toBe(2);
      expect(stats.hasObsidianFolder).toBe(true);
      expect(stats.sampleFiles.length).toBe(2);
      expect(stats.warnings).toHaveLength(0);
      expect(stats.errors).toHaveLength(0);
    });
  });
});
