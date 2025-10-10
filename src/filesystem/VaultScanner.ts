import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';

/**
 * Information about a scanned file
 */
export interface FileInfo {
  /** Absolute path to the file */
  absolutePath: string;
  /** Path relative to vault root */
  relativePath: string;
  /** SHA-256 hash of file content */
  hash: string;
  /** File size in bytes */
  size: number;
  /** Last modification time */
  modifiedTime: Date;
  /** File extension (.md or .canvas) */
  extension: string;
}

/**
 * Hierarchical folder structure
 */
export interface FolderNode {
  /** Folder or file name */
  name: string;
  /** Type of node */
  type: 'directory' | 'file';
  /** Files in this directory */
  files: FileInfo[];
  /** Child directories */
  children: Record<string, FolderNode>;
}

/**
 * Vault statistics
 */
export interface VaultStats {
  /** Total number of files */
  totalFiles: number;
  /** Number of markdown files */
  markdownFiles: number;
  /** Number of canvas files */
  canvasFiles: number;
  /** Total size in bytes */
  totalSize: number;
  /** Number of folders */
  folderCount: number;
}

/**
 * VaultScanner recursively scans Obsidian vault directories
 *
 * Features:
 * - Recursive directory scanning
 * - Filters for .md and .canvas files
 * - Computes SHA-256 hashes for content integrity
 * - Builds folder hierarchy tree
 * - Provides vault statistics
 * - Handles symlinks and special files gracefully
 *
 * Usage:
 * ```typescript
 * const scanner = new VaultScanner('/path/to/vault');
 * const files = await scanner.scan();
 * const hierarchy = await scanner.buildHierarchy();
 * const stats = await scanner.getStats();
 * ```
 *
 * Follows Constitution Principle III: TDD approach with comprehensive tests
 * Implements FR-CLI-005: Vault scanning and file discovery
 */
export class VaultScanner {
  private vaultPath: string;

  constructor(vaultPath: string) {
    this.vaultPath = vaultPath;
  }

  /**
   * Scan vault directory recursively for .md and .canvas files
   *
   * @returns Array of file information
   * @throws Error if vault path doesn't exist or is not a directory
   */
  async scan(): Promise<FileInfo[]> {
    // Verify vault path exists and is a directory
    const stats = await fs.stat(this.vaultPath);
    if (!stats.isDirectory()) {
      throw new Error(`Path is not a directory: ${this.vaultPath}`);
    }

    const files: FileInfo[] = [];
    await this.scanDirectory(this.vaultPath, '', files);
    return files;
  }

  /**
   * Build hierarchical folder structure
   *
   * @returns Root folder node with nested children
   */
  async buildHierarchy(): Promise<FolderNode> {
    const files = await this.scan();

    const root: FolderNode = {
      name: path.basename(this.vaultPath),
      type: 'directory',
      files: [],
      children: {}
    };

    // Build hierarchy from file list
    for (const file of files) {
      this.addFileToHierarchy(root, file);
    }

    return root;
  }

  /**
   * Get vault statistics
   *
   * @returns Vault statistics including file counts and sizes
   */
  async getStats(): Promise<VaultStats> {
    const files = await this.scan();

    const stats: VaultStats = {
      totalFiles: files.length,
      markdownFiles: files.filter(f => f.extension === '.md').length,
      canvasFiles: files.filter(f => f.extension === '.canvas').length,
      totalSize: files.reduce((sum, f) => sum + f.size, 0),
      folderCount: 0
    };

    // Count unique folders
    const folders = new Set<string>();
    for (const file of files) {
      const dir = path.dirname(file.relativePath);
      if (dir && dir !== '.') {
        const parts = dir.split(path.sep);
        for (let i = 0; i < parts.length; i++) {
          folders.add(parts.slice(0, i + 1).join(path.sep));
        }
      }
    }
    stats.folderCount = folders.size;

    return stats;
  }

  /**
   * Recursively scan directory for files
   *
   * @param dirPath - Absolute directory path
   * @param relativePath - Relative path from vault root
   * @param files - Array to accumulate file info
   */
  private async scanDirectory(
    dirPath: string,
    relativePath: string,
    files: FileInfo[]
  ): Promise<void> {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const absolutePath = path.join(dirPath, entry.name);
      const entryRelativePath = relativePath
        ? path.join(relativePath, entry.name)
        : entry.name;

      try {
        // Handle regular files
        if (entry.isFile()) {
          const extension = path.extname(entry.name);

          // Filter for .md and .canvas files only
          if (extension === '.md' || extension === '.canvas') {
            const fileInfo = await this.getFileInfo(absolutePath, entryRelativePath, extension);
            files.push(fileInfo);
          }
        }
        // Recursively scan directories (but not symlinks)
        else if (entry.isDirectory() && !entry.isSymbolicLink()) {
          await this.scanDirectory(absolutePath, entryRelativePath, files);
        }
        // Skip symlinks and other special files
      } catch (error: any) {
        // Skip files that can't be accessed (permissions, etc.)
        console.warn(`Skipping ${absolutePath}: ${error.message}`);
      }
    }
  }

  /**
   * Get file information including hash and metadata
   *
   * @param absolutePath - Absolute file path
   * @param relativePath - Relative path from vault root
   * @param extension - File extension
   * @returns File information
   */
  private async getFileInfo(
    absolutePath: string,
    relativePath: string,
    extension: string
  ): Promise<FileInfo> {
    // Read file content and stats
    const [content, stats] = await Promise.all([
      fs.readFile(absolutePath),
      fs.stat(absolutePath)
    ]);

    // Compute SHA-256 hash
    const hash = crypto.createHash('sha256').update(content).digest('hex');

    return {
      absolutePath,
      relativePath,
      hash,
      size: stats.size,
      modifiedTime: stats.mtime,
      extension
    };
  }

  /**
   * Add file to hierarchy tree
   *
   * @param root - Root folder node
   * @param file - File to add
   */
  private addFileToHierarchy(root: FolderNode, file: FileInfo): void {
    const parts = file.relativePath.split(path.sep);
    const folderParts = parts.slice(0, -1);

    // Navigate/create folder structure
    let currentNode = root;
    for (const part of folderParts) {
      if (!currentNode.children[part]) {
        currentNode.children[part] = {
          name: part,
          type: 'directory',
          files: [],
          children: {}
        };
      }
      currentNode = currentNode.children[part];
    }

    // Add file to appropriate folder
    currentNode.files.push(file);
  }
}
