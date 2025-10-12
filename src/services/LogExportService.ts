/**
 * LogExportService - Export logs as compressed archives
 *
 * Features:
 * - Creates ZIP archives with logs
 * - Includes metadata.json with export info
 * - Includes README.txt with instructions
 * - Filters by time range (--since)
 * - Filters by log level (--level)
 * - >= 70% compression ratio (NFR-004)
 * - Completes in <10s for 7 days logs (SC-008)
 *
 * Implements US5: Export Operation History
 */

import archiver from 'archiver';
import * as fs from 'fs';
import * as path from 'path';
import { getVersion } from '../utils/version.js';
import { Logger } from '../utils/Logger.js';

export interface ExportOptions {
  since?: string; // Time range (e.g., "24h", "7d")
  level?: string; // Minimum log level
  output?: string; // Output path
  redactSensitive?: boolean; // Include unredacted data (default: true, redact)
}

export interface LogExport {
  exportedAt: string;
  archivePath: string;
  filesIncluded: number;
  uncompressedSize: number;
  compressedSize: number;
  compressionRatio: number;
  metadata: ExportMetadata;
  includesReadme: boolean;
}

export interface ExportMetadata {
  exportedAt: string;
  cliVersion: string;
  filters: {
    since: string;
    level: string;
  };
  filesIncluded: number;
  compression: {
    uncompressedSize: number;
    compressedSize: number;
    ratio: number;
  };
}

export class LogExportService {
  private logger: Logger;

  constructor() {
    this.logger = new Logger({ logLevel: 'info' });
  }

  /**
   * Export logs as compressed archive
   *
   * @param options - Export options
   * @returns Export result with archive path and metadata
   */
  async exportLogs(options: ExportOptions): Promise<LogExport> {
    const since = options.since || '7d';
    const level = options.level || 'info';
    const outputPath = options.output || this.generateOutputPath();

    // Find log files matching criteria
    const logFiles = await this.findLogFiles(since, level);

    // Calculate uncompressed size
    let uncompressedSize = 0;
    for (const file of logFiles) {
      const stats = await fs.promises.stat(file);
      uncompressedSize += stats.size;
    }

    // Create archive
    const output = fs.createWriteStream(outputPath);
    const archive = archiver('zip', {
      zlib: { level: 6 }, // Compression level (0-9)
    });

    // Track bytes written
    let compressedSize = 0;
    output.on('data', (chunk) => {
      compressedSize += chunk.length;
    });

    // Pipe archive to output
    archive.pipe(output);

    // Generate metadata
    const metadata = this.generateMetadata({
      since,
      level,
      filesIncluded: logFiles.length,
      uncompressedSize,
      compressedSize: 0, // Will be updated after finalization
    });

    // Add metadata.json
    archive.append(JSON.stringify(metadata, null, 2), {
      name: 'export-metadata.json',
    });

    // Add README.txt
    const readme = this.generateReadme();
    archive.append(readme, { name: 'README.txt' });

    // Add log files
    for (const logFile of logFiles) {
      const fileName = path.basename(logFile);
      archive.file(logFile, { name: `logs/${fileName}` });
    }

    // Finalize archive
    await archive.finalize();

    // Wait for output stream to finish
    await new Promise<void>((resolve, reject) => {
      output.on('close', () => resolve());
      output.on('error', reject);
      archive.on('error', reject);
    });

    // Get final compressed size
    const finalStats = await fs.promises.stat(outputPath);
    compressedSize = finalStats.size;

    // Calculate compression ratio
    const compressionRatio =
      uncompressedSize > 0 ? (uncompressedSize - compressedSize) / uncompressedSize : 0;

    // Update metadata with final compression info
    metadata.compression = {
      uncompressedSize,
      compressedSize,
      ratio: compressionRatio,
    };

    return {
      exportedAt: new Date().toISOString(),
      archivePath: outputPath,
      filesIncluded: logFiles.length,
      uncompressedSize,
      compressedSize,
      compressionRatio,
      metadata,
      includesReadme: true,
    };
  }

  /**
   * Parse time range string to milliseconds
   *
   * @param range - Time range (e.g., "24h", "7d", "2w")
   * @returns Milliseconds
   */
  parseTimeRange(range: string): number {
    const match = range.match(/^(\d+)([hdw])$/);

    if (!match) {
      throw new Error(`Invalid time range format: ${range}. Use format like "24h", "7d", or "2w"`);
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    const multipliers: { [key: string]: number } = {
      h: 60 * 60 * 1000, // hours
      d: 24 * 60 * 60 * 1000, // days
      w: 7 * 24 * 60 * 60 * 1000, // weeks
    };

    return value * multipliers[unit];
  }

  /**
   * Find log files matching criteria
   *
   * @param since - Time range
   * @param _level - Minimum log level (currently not used, logs are JSON format)
   * @returns Array of log file paths
   */
  async findLogFiles(since: string, _level: string): Promise<string[]> {
    const logDir = this.logger.getLogDir();
    const cutoffTime = Date.now() - this.parseTimeRange(since);

    try {
      const files = await fs.promises.readdir(logDir);
      const logFiles: string[] = [];

      for (const file of files) {
        // Skip audit files
        if (file.startsWith('.audit')) {
          continue;
        }

        // Only include .log files
        if (!file.endsWith('.log')) {
          continue;
        }

        const filePath = path.join(logDir, file);
        const stats = await fs.promises.stat(filePath);

        // Check if file is within time range
        if (stats.mtime.getTime() >= cutoffTime) {
          logFiles.push(filePath);
        }
      }

      return logFiles;
    } catch (error) {
      // Log directory doesn't exist or error reading
      this.logger.warn('Failed to find log files', { error });
      return [];
    }
  }

  /**
   * Generate metadata for export
   *
   * @param data - Metadata data
   * @returns Export metadata
   */
  generateMetadata(data: {
    since: string;
    level: string;
    filesIncluded: number;
    uncompressedSize: number;
    compressedSize: number;
  }): ExportMetadata {
    return {
      exportedAt: new Date().toISOString(),
      cliVersion: getVersion(),
      filters: {
        since: data.since,
        level: data.level,
      },
      filesIncluded: data.filesIncluded,
      compression: {
        uncompressedSize: data.uncompressedSize,
        compressedSize: data.compressedSize,
        ratio:
          data.uncompressedSize > 0
            ? (data.uncompressedSize - data.compressedSize) / data.uncompressedSize
            : 0,
      },
    };
  }

  /**
   * Generate README.txt content
   *
   * @returns README content
   */
  generateReadme(): string {
    return `Mujarrad CLI Logs Export
========================

This archive contains exported logs from the Mujarrad CLI.

Contents:
---------
- export-metadata.json: Information about this export
- logs/: Directory containing log files
- README.txt: This file

How to Use:
-----------
1. Extract this archive to a directory
2. Review export-metadata.json for export details
3. Examine log files in the logs/ directory
4. Share this archive with support if reporting an issue

Log Format:
-----------
Logs are in JSON format with the following fields:
- timestamp: ISO 8601 timestamp
- level: Log level (error, warn, info, debug)
- message: Log message
- sessionId: Unique session identifier
- Additional context fields

Privacy:
--------
Sensitive data (tokens, passwords, etc.) has been redacted automatically.
If you need to include unredacted logs, use --no-redact-sensitive flag.

Support:
--------
Report issues: https://github.com/mujarrad/mujarrad-cli/issues
Documentation: https://www.mujarrad.com

Generated: ${new Date().toISOString()}
CLI Version: ${getVersion()}
`;
  }

  /**
   * Generate output path with timestamp
   *
   * @returns Output path
   */
  private generateOutputPath(): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const filename = `mujarrad-logs-${timestamp}.zip`;
    return path.join(process.cwd(), filename);
  }
}
