import { VaultScanner } from '../../../src/filesystem/VaultScanner.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('VaultScanner', () => {
  let testVaultPath: string;

  // Helper to create test vault structure
  async function createTestVault(structure: Record<string, string>): Promise<string> {
    const vaultPath = path.join(os.tmpdir(), `test-vault-${Date.now()}`);
    await fs.mkdir(vaultPath, { recursive: true });

    for (const [filePath, content] of Object.entries(structure)) {
      const fullPath = path.join(vaultPath, filePath);
      const dir = path.dirname(fullPath);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(fullPath, content, 'utf-8');
    }

    return vaultPath;
  }

  // Helper to clean up test vault
  async function cleanupTestVault(vaultPath: string): Promise<void> {
    try {
      await fs.rm(vaultPath, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  }

  afterEach(async () => {
    if (testVaultPath) {
      await cleanupTestVault(testVaultPath);
    }
  });

  describe('scan', () => {
    it('should find all .md and .canvas files recursively', async () => {
      testVaultPath = await createTestVault({
        'note1.md': '# Note 1',
        'folder/note2.md': '# Note 2',
        'canvas.canvas': '{"nodes": []}',
        'nested/deep/note3.md': '# Note 3'
      });

      const scanner = new VaultScanner(testVaultPath);
      const files = await scanner.scan();

      expect(files).toHaveLength(4);

      const filePaths = files.map(f => f.relativePath);
      expect(filePaths).toContain('note1.md');
      expect(filePaths).toContain(path.join('folder', 'note2.md'));
      expect(filePaths).toContain('canvas.canvas');
      expect(filePaths).toContain(path.join('nested', 'deep', 'note3.md'));
    });

    it('should ignore non-.md and non-.canvas files', async () => {
      testVaultPath = await createTestVault({
        'note.md': '# Note',
        'image.png': 'fake image data',
        'doc.pdf': 'fake pdf data',
        'script.js': 'console.log("test")',
        'data.json': '{"key": "value"}',
        'canvas.canvas': '{"nodes": []}'
      });

      const scanner = new VaultScanner(testVaultPath);
      const files = await scanner.scan();

      expect(files).toHaveLength(2);
      expect(files.map(f => f.relativePath)).toEqual(
        expect.arrayContaining(['note.md', 'canvas.canvas'])
      );
    });

    it('should compute SHA-256 hash for each file', async () => {
      testVaultPath = await createTestVault({
        'note.md': '# Test Note\nThis is content.'
      });

      const scanner = new VaultScanner(testVaultPath);
      const files = await scanner.scan();

      expect(files).toHaveLength(1);
      expect(files[0].hash).toMatch(/^[a-f0-9]{64}$/);

      // Verify hash is consistent
      const files2 = await scanner.scan();
      expect(files2[0].hash).toBe(files[0].hash);
    });

    it('should include file size and modification time', async () => {
      testVaultPath = await createTestVault({
        'note.md': '# Note with content\nSome text here.'
      });

      const scanner = new VaultScanner(testVaultPath);
      const files = await scanner.scan();

      expect(files).toHaveLength(1);
      expect(files[0].size).toBeGreaterThan(0);
      expect(files[0].modifiedTime).toBeDefined();
      expect(typeof files[0].modifiedTime.getTime).toBe('function');
      expect(files[0].modifiedTime.getTime()).toBeGreaterThan(0);
    });

    it('should handle empty vault', async () => {
      testVaultPath = await createTestVault({});

      const scanner = new VaultScanner(testVaultPath);
      const files = await scanner.scan();

      expect(files).toEqual([]);
    });

    it('should handle vault with only folders', async () => {
      testVaultPath = path.join(os.tmpdir(), `test-vault-${Date.now()}`);
      await fs.mkdir(path.join(testVaultPath, 'folder1', 'folder2'), { recursive: true });

      const scanner = new VaultScanner(testVaultPath);
      const files = await scanner.scan();

      expect(files).toEqual([]);
    });

    it('should handle symlinks gracefully', async () => {
      testVaultPath = await createTestVault({
        'note.md': '# Note',
        'folder/note2.md': '# Note 2'
      });

      // Create symlink (if supported)
      try {
        await fs.symlink(
          path.join(testVaultPath, 'note.md'),
          path.join(testVaultPath, 'link.md')
        );
      } catch (error) {
        // Skip test if symlinks not supported
        return;
      }

      const scanner = new VaultScanner(testVaultPath);
      const files = await scanner.scan();

      // Should find original files but skip symlinks
      expect(files.length).toBeGreaterThanOrEqual(2);
    });

    it('should provide absolute and relative paths', async () => {
      testVaultPath = await createTestVault({
        'note.md': '# Note',
        'folder/note2.md': '# Note 2'
      });

      const scanner = new VaultScanner(testVaultPath);
      const files = await scanner.scan();

      files.forEach(file => {
        expect(file.absolutePath).toContain(testVaultPath);
        expect(path.isAbsolute(file.absolutePath)).toBe(true);
        expect(path.isAbsolute(file.relativePath)).toBe(false);
      });
    });

    it('should handle files with unicode characters in names', async () => {
      testVaultPath = await createTestVault({
        'note-日本語.md': '# Japanese',
        'émoji-😀.md': '# Emoji',
        'folder/文件.md': '# Chinese'
      });

      const scanner = new VaultScanner(testVaultPath);
      const files = await scanner.scan();

      expect(files).toHaveLength(3);
    });
  });

  describe('buildHierarchy', () => {
    it('should build folder hierarchy tree', async () => {
      testVaultPath = await createTestVault({
        'note1.md': '# Root Note',
        'folder1/note2.md': '# Folder 1 Note',
        'folder1/subfolder/note3.md': '# Subfolder Note',
        'folder2/note4.md': '# Folder 2 Note'
      });

      const scanner = new VaultScanner(testVaultPath);
      const hierarchy = await scanner.buildHierarchy();

      expect(hierarchy.name).toBe(path.basename(testVaultPath));
      expect(hierarchy.type).toBe('directory');
      expect(hierarchy.children).toHaveProperty('folder1');
      expect(hierarchy.children).toHaveProperty('folder2');
      expect(hierarchy.children['folder1'].children).toHaveProperty('subfolder');
    });

    it('should include files in hierarchy', async () => {
      testVaultPath = await createTestVault({
        'note1.md': '# Note 1',
        'folder/note2.md': '# Note 2',
        'folder/canvas.canvas': '{"nodes": []}'
      });

      const scanner = new VaultScanner(testVaultPath);
      const hierarchy = await scanner.buildHierarchy();

      expect(hierarchy.files).toContainEqual(
        expect.objectContaining({ relativePath: 'note1.md' })
      );
      expect(hierarchy.children['folder'].files).toHaveLength(2);
    });

    it('should handle empty vault hierarchy', async () => {
      testVaultPath = await createTestVault({});

      const scanner = new VaultScanner(testVaultPath);
      const hierarchy = await scanner.buildHierarchy();

      expect(hierarchy.type).toBe('directory');
      expect(hierarchy.files).toEqual([]);
      expect(Object.keys(hierarchy.children)).toHaveLength(0);
    });
  });

  describe('getStats', () => {
    it('should return vault statistics', async () => {
      testVaultPath = await createTestVault({
        'note1.md': '# Note 1\nContent here.',
        'note2.md': '# Note 2',
        'folder/note3.md': '# Note 3',
        'canvas.canvas': '{"nodes": []}',
        'folder/canvas2.canvas': '{"nodes": []}'
      });

      const scanner = new VaultScanner(testVaultPath);
      const stats = await scanner.getStats();

      expect(stats.totalFiles).toBe(5);
      expect(stats.markdownFiles).toBe(3);
      expect(stats.canvasFiles).toBe(2);
      expect(stats.totalSize).toBeGreaterThan(0);
      expect(stats.folderCount).toBeGreaterThanOrEqual(1);
    });

    it('should handle empty vault stats', async () => {
      testVaultPath = await createTestVault({});

      const scanner = new VaultScanner(testVaultPath);
      const stats = await scanner.getStats();

      expect(stats.totalFiles).toBe(0);
      expect(stats.markdownFiles).toBe(0);
      expect(stats.canvasFiles).toBe(0);
      expect(stats.totalSize).toBe(0);
      expect(stats.folderCount).toBe(0);
    });
  });

  describe('error handling', () => {
    it('should throw error for non-existent vault path', async () => {
      const nonExistentPath = '/path/that/does/not/exist';
      const scanner = new VaultScanner(nonExistentPath);

      await expect(scanner.scan()).rejects.toThrow();
    });

    it('should throw error for file path instead of directory', async () => {
      testVaultPath = await createTestVault({ 'note.md': '# Note' });
      const filePath = path.join(testVaultPath, 'note.md');

      const scanner = new VaultScanner(filePath);

      await expect(scanner.scan()).rejects.toThrow();
    });
  });
});
