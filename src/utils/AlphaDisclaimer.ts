/**
 * AlphaDisclaimer - Manages alpha/beta version disclaimers
 *
 * Features:
 * - Shows disclaimer on first run
 * - Shows disclaimer when version level changes (alpha → beta → stable)
 * - Skips disclaimer for patch updates within same level
 * - Supports auto-accept via flag or env var
 *
 * Follows Constitution Principle III: TDD approach
 * Implements FR-034: Alpha version disclaimer
 */
import chalk from 'chalk';
import inquirer from 'inquirer';
import { Config, VersionLevel } from '../config/types.js';
import { ConfigManager } from '../config/ConfigManager.js';

export class AlphaDisclaimer {
  /**
   * Parse version level from version string
   *
   * @param version - Version string (e.g., "1.0.0-alpha.1", "1.0.0-beta", "1.0.0")
   * @returns Version level (alpha, beta, or stable)
   */
  static parseVersionLevel(version: string): VersionLevel {
    if (version.includes('alpha')) {
      return 'alpha';
    } else if (version.includes('beta')) {
      return 'beta';
    } else {
      return 'stable';
    }
  }

  /**
   * Check if disclaimer should be shown
   *
   * Shows disclaimer when:
   * - No acknowledgment exists (first run)
   * - Version level has changed (alpha → beta, beta → stable)
   *
   * @param version - Current version
   * @param config - User configuration
   * @returns True if disclaimer should be shown
   */
  static async shouldShow(version: string, config: Config): Promise<boolean> {
    // No acknowledgment - first run
    if (!config.disclaimerAcknowledgment) {
      return true;
    }

    // Check if version level has changed
    const currentLevel = this.parseVersionLevel(version);
    const acknowledgedLevel = config.disclaimerAcknowledgment.versionLevel;

    return currentLevel !== acknowledgedLevel;
  }

  /**
   * Check if --accept-disclaimer flag is present
   *
   * @returns True if flag is present
   */
  static hasAcceptFlag(): boolean {
    return process.argv.some(arg =>
      arg === '--accept-disclaimer' || arg.startsWith('--accept-disclaimer=')
    );
  }

  /**
   * Check if MUJARRAD_ACCEPT_DISCLAIMER env var is set
   *
   * @returns True if env var is truthy
   */
  static hasAcceptEnvVar(): boolean {
    const value = process.env.MUJARRAD_ACCEPT_DISCLAIMER;
    return value === 'true' || value === '1';
  }

  /**
   * Check if disclaimer can be auto-accepted
   *
   * @returns True if flag or env var allows auto-accept
   */
  static canAutoAccept(): boolean {
    return this.hasAcceptFlag() || this.hasAcceptEnvVar();
  }

  /**
   * Get disclaimer text for version
   *
   * @param version - Version string
   * @returns Formatted disclaimer text
   */
  static getDisclaimerText(version: string): string {
    const level = this.parseVersionLevel(version);
    const levelUpper = level.toUpperCase();

    let text = chalk.yellow(`\n⚠️  ${levelUpper} SOFTWARE WARNING ⚠️\n\n`);
    text += `Mujarrad CLI ${chalk.bold(version)} is currently in ${level} development.\n\n`;

    if (level === 'alpha') {
      text += chalk.gray('• Features may change without notice\n');
      text += chalk.gray('• Breaking changes may occur between versions\n');
      text += chalk.gray('• Use at your own risk\n');
      text += chalk.gray('• Report issues: https://github.com/mujarrad/mujarrad-cli/issues\n');
    } else if (level === 'beta') {
      text += chalk.gray('• API may change in minor releases\n');
      text += chalk.gray('• Breaking changes will be documented\n');
      text += chalk.gray('• Suitable for testing and feedback\n');
      text += chalk.gray('• Report issues: https://github.com/mujarrad/mujarrad-cli/issues\n');
    }

    return text;
  }

  /**
   * Prompt user to accept disclaimer
   *
   * @param version - Current version
   * @returns True if user accepts, false otherwise
   */
  static async prompt(version: string): Promise<boolean> {
    console.log(this.getDisclaimerText(version));

    const { accepted } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'accepted',
        message: 'Do you accept these terms and wish to continue?',
        default: false,
      },
    ]);

    return accepted;
  }

  /**
   * Record disclaimer acknowledgment in config
   *
   * @param version - Version that was acknowledged
   * @param config - User configuration to update
   */
  static async recordAcknowledgment(version: string, config: Config): Promise<void> {
    const configManager = new ConfigManager();

    config.disclaimerAcknowledgment = {
      acknowledgedVersion: version,
      acknowledgedAt: new Date().toISOString(),
      versionLevel: this.parseVersionLevel(version),
    };

    await configManager.save(config);
  }
}
