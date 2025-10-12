/**
 * VersionInfo - Enhanced version information display
 *
 * Features:
 * - Display version number with level (alpha/beta/stable)
 * - Show Node.js version and platform
 * - Formatted output for CLI display
 *
 * Implements FR-035: Enhanced version command
 */
import chalk from 'chalk';
import { getVersion } from './version.js';
import { AlphaDisclaimer } from './AlphaDisclaimer.js';

export interface VersionInfoData {
  version: string;
  versionLevel: 'alpha' | 'beta' | 'stable';
  nodeVersion: string;
  platform: string;
}

export class VersionInfo {
  /**
   * Get comprehensive version information
   *
   * @returns Version info including version, level, Node.js version, and platform
   */
  static getVersionInfo(): VersionInfoData {
    const version = getVersion();
    const versionLevel = AlphaDisclaimer.parseVersionLevel(version);

    return {
      version,
      versionLevel,
      nodeVersion: process.version,
      platform: process.platform,
    };
  }

  /**
   * Format version info as human-readable string
   *
   * @returns Formatted version information
   */
  static formatVersionOutput(): string {
    const info = this.getVersionInfo();
    let output = '';

    // Version header
    output += chalk.bold(`Mujarrad CLI v${info.version}`);

    // Version level badge (alpha/beta only)
    if (info.versionLevel === 'alpha') {
      output += ` ${chalk.yellow('[ALPHA]')}`;
    } else if (info.versionLevel === 'beta') {
      output += ` ${chalk.cyan('[BETA]')}`;
    }

    output += '\n\n';

    // Build info
    output += chalk.gray('Build Information:\n');
    output += chalk.gray(`  Node.js: ${info.nodeVersion}\n`);
    output += chalk.gray(`  Platform: ${info.platform}\n`);

    return output;
  }

  /**
   * Display version info to console
   */
  static displayVersionInfo(): void {
    console.log(this.formatVersionOutput());
  }
}
