/**
 * VaultValidator - Validate Obsidian vault structure
 *
 * Validates that a directory is a valid Obsidian vault:
 * - Contains .obsidian folder
 * - Contains at least one markdown file
 * - Structure is accessible
 *
 * Implements US7: Initialize and Upload Vault
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { Logger } from './Logger.js';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  fileCount?: number;
  hasObsidianFolder?: boolean;
}

export class VaultValidator {
  private logger: Logger;

  constructor(logger?: Logger) {
    this.logger = logger || new Logger();
  }

  /**
   * Validate that a path is a valid Obsidian vault
   *
   * @param vaultPath - Absolute path to vault directory
   * @returns Validation result with errors and warnings
   */
  async validateVault(vaultPath: string): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    this.logger.debug('Validating vault structure', { vaultPath });

    try {
      // Check if path exists
      let stats;
      try {
        stats = await fs.stat(vaultPath);
      } catch (error: any) {
        errors.push(`Path does not exist: ${vaultPath}`);
        return { valid: false, errors, warnings };
      }

      // Check if path is a directory
      if (!stats.isDirectory()) {
        errors.push(`Path is not a directory: ${vaultPath}`);
        return { valid: false, errors, warnings };
      }

      // Check for .obsidian folder
      const obsidianPath = path.join(vaultPath, '.obsidian');
      let hasObsidianFolder = false;

      try {
        const obsidianStats = await fs.stat(obsidianPath);
        if (obsidianStats.isDirectory()) {
          hasObsidianFolder = true;
          this.logger.debug('Found .obsidian folder', { obsidianPath });
        }
      } catch (error: any) {
        errors.push('Not a valid Obsidian vault: .obsidian folder not found');
        this.logger.warn('Missing .obsidian folder', { vaultPath });
      }

      // Scan for markdown files
      let fileCount = 0;
      try {
        fileCount = await this.countMarkdownFiles(vaultPath);
        this.logger.debug('Markdown file count', { fileCount });

        if (fileCount === 0) {
          warnings.push('No markdown files found in vault');
        }
      } catch (error: any) {
        errors.push(`Error scanning vault: ${error.message}`);
        this.logger.error('Failed to scan vault', {
          vaultPath,
          error: error.message,
        });
      }

      // Check read permissions
      try {
        await fs.access(vaultPath, fs.constants.R_OK);
      } catch (error: any) {
        errors.push('Cannot read vault: Permission denied');
        this.logger.error('Permission denied', { vaultPath });
      }

      const valid = errors.length === 0;

      if (valid) {
        this.logger.info('Vault validation successful', {
          vaultPath,
          hasObsidianFolder,
          fileCount,
        });
      } else {
        this.logger.warn('Vault validation failed', {
          vaultPath,
          errors,
          warnings,
        });
      }

      return {
        valid,
        errors,
        warnings,
        fileCount,
        hasObsidianFolder,
      };
    } catch (error: any) {
      errors.push(`Unexpected error during validation: ${error.message}`);
      this.logger.error('Validation error', {
        vaultPath,
        error: error.message,
        stack: error.stack,
      });

      return { valid: false, errors, warnings };
    }
  }

  /**
   * Count markdown files in vault (recursive)
   *
   * @param dirPath - Directory path
   * @param excludeObsidian - Exclude .obsidian folder
   * @returns Number of markdown files found
   */
  private async countMarkdownFiles(
    dirPath: string,
    excludeObsidian: boolean = true
  ): Promise<number> {
    let count = 0;

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        // Skip .obsidian folder
        if (excludeObsidian && entry.name === '.obsidian') {
          continue;
        }

        // Skip hidden files/folders (except .obsidian which we already checked)
        if (entry.name.startsWith('.')) {
          continue;
        }

        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
          // Recursively count files in subdirectories
          count += await this.countMarkdownFiles(fullPath, excludeObsidian);
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
          count++;
        }
      }
    } catch (error: any) {
      this.logger.warn('Error reading directory', {
        dirPath,
        error: error.message,
      });
      // Return partial count
    }

    return count;
  }

  /**
   * Get list of markdown files in vault (for display purposes)
   *
   * @param vaultPath - Vault path
   * @param maxFiles - Maximum files to return
   * @returns Array of relative file paths
   */
  async listMarkdownFiles(vaultPath: string, maxFiles: number = 10): Promise<string[]> {
    const files: string[] = [];

    try {
      await this.collectMarkdownFiles(vaultPath, vaultPath, files, maxFiles);
    } catch (error: any) {
      this.logger.error('Failed to list markdown files', {
        vaultPath,
        error: error.message,
      });
    }

    return files;
  }

  /**
   * Recursively collect markdown files
   *
   * @param basePath - Base vault path
   * @param currentPath - Current directory path
   * @param files - Array to collect files into
   * @param maxFiles - Maximum files to collect
   */
  private async collectMarkdownFiles(
    basePath: string,
    currentPath: string,
    files: string[],
    maxFiles: number
  ): Promise<void> {
    if (files.length >= maxFiles) {
      return;
    }

    try {
      const entries = await fs.readdir(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        if (files.length >= maxFiles) {
          break;
        }

        // Skip .obsidian and hidden files
        if (entry.name.startsWith('.')) {
          continue;
        }

        const fullPath = path.join(currentPath, entry.name);

        if (entry.isDirectory()) {
          await this.collectMarkdownFiles(basePath, fullPath, files, maxFiles);
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
          const relativePath = path.relative(basePath, fullPath);
          files.push(relativePath);
        }
      }
    } catch (error: any) {
      // Silently skip directories we can't read
    }
  }
}
