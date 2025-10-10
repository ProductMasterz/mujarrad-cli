import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import * as path from 'path';
import * as fs from 'fs/promises';
import { simpleGit } from 'simple-git';
import { CloneService } from '../services/CloneService.js';
import { CloneApi } from '../api/generated/api.js';
import { Configuration } from '../api/generated/configuration.js';
import { ConfigManager } from '../config/ConfigManager.js';
import { CredentialManager } from '../config/CredentialManager.js';
import { Logger } from '../utils/Logger.js';

/**
 * Setup clone command with Commander.js
 *
 * Provides clone commands:
 * - clone: Clone Mujarrad workspace to Obsidian vault
 *
 * Usage:
 * ```bash
 * mujarrad clone <target-path> --workspace <slug>
 * mujarrad clone /path/to/vault -w my-workspace
 * mujarrad clone ./my-vault -w my-workspace --no-git
 * ```
 *
 * Features:
 * - Exports workspace from Mujarrad
 * - Creates local Obsidian vault
 * - Initializes Git repository (optional)
 * - Progress tracking during clone
 * - Error handling with actionable messages
 *
 * @param program - Commander.js program instance
 * @param cloneService - Optional CloneService instance (for testing)
 */
export function cloneCommand(program: Command, cloneService?: CloneService): void {
  const logger = new Logger();

  // Get or create clone service
  const getCloneService = async (): Promise<CloneService> => {
    if (cloneService) {
      return cloneService;
    }

    const config = await new ConfigManager().load();
    const apiConfig = new Configuration({
      basePath: config.apiBaseUrl
    });
    const cloneApi = new CloneApi(apiConfig);
    return new CloneService(cloneApi);
  };

  program
    .command('clone')
    .description('Clone Mujarrad workspace to Obsidian vault')
    .argument('<target-path>', 'Target vault directory path')
    .requiredOption('-w, --workspace <slug>', 'Workspace slug to clone')
    .option('--no-git', 'Skip Git repository initialization')
    .option('--include-history', 'Include version history in export')
    .action(async (targetPath: string, options: any) => {
      const spinner = ora();

      try {
        // Validate authentication
        spinner.start('Checking authentication...');
        const credentialManager = new CredentialManager();
        const token = await credentialManager.getToken();
        if (!token) {
          spinner.fail();
          console.error(chalk.red('\n✗ Not authenticated'));
          console.log(chalk.gray('Run "mujarrad auth login" to authenticate\n'));
          process.exit(1);
        }
        spinner.succeed('Authenticated');

        // Validate target path
        spinner.start('Validating target path...');
        const absoluteTargetPath = path.resolve(targetPath);

        // Check if directory exists and is empty
        try {
          const stats = await fs.stat(absoluteTargetPath);
          if (stats.isDirectory()) {
            const files = await fs.readdir(absoluteTargetPath);
            if (files.length > 0) {
              spinner.warn();
              console.warn(chalk.yellow('\n⚠ Target directory is not empty'));
              console.log(chalk.gray('Cloning into existing directory may overwrite files\n'));
            }
          }
        } catch (error: any) {
          // Directory doesn't exist - create it
          await fs.mkdir(absoluteTargetPath, { recursive: true });
        }
        spinner.succeed(`Target path: ${absoluteTargetPath}`);

        // Get clone service
        const service = await getCloneService();

        // Start clone
        console.log(chalk.blue(`\nCloning workspace: ${options.workspace}`));
        if (options.includeHistory) {
          console.log(chalk.gray('Including version history'));
        }
        console.log();

        spinner.start('Initiating export...');

        const summary = await service.cloneWorkspace(
          options.workspace,
          absoluteTargetPath,
          options.includeHistory || false
        );

        spinner.stop();

        if (!summary.success) {
          console.error(chalk.red('✗ Clone failed'));
          console.log(chalk.gray('\nCheck the logs for details\n'));
          process.exit(1);
        }

        const duration = Math.round(summary.duration / 1000);
        console.log(chalk.green(`✓ Clone complete! (${duration}s)`));
        console.log(chalk.gray(`\nNodes cloned: ${chalk.white(summary.totalNodes.toString())}`));

        // Initialize Git repository if requested
        if (options.git !== false) {
          spinner.start('Initializing Git repository...');

          try {
            const git = simpleGit(absoluteTargetPath);
            await git.init();
            await git.add('./*');
            await git.commit('Initial commit from Mujarrad clone\n\nCloned from workspace: ' + options.workspace);

            spinner.succeed('Git repository initialized');
            logger.info('Git repository initialized', {
              workspaceSlug: options.workspace,
              targetPath: absoluteTargetPath
            });
          } catch (gitError: any) {
            spinner.warn('Git initialization failed');
            console.log(chalk.yellow('Note: Git repository could not be initialized'));
            console.log(chalk.gray('You can initialize it manually later with "git init"\n'));
            logger.warn('Git initialization failed', { error: gitError.message });
          }
        }

        console.log(chalk.gray(`\nVault location: ${absoluteTargetPath}`));
        console.log(chalk.gray('You can now open this folder in Obsidian\n'));

        logger.info('Clone completed', {
          workspaceSlug: options.workspace,
          targetPath: absoluteTargetPath,
          nodesCloned: summary.totalNodes,
          duration
        });

      } catch (error: any) {
        // Stop any active UI elements
        if (spinner.isSpinning) {
          spinner.fail();
        }

        // Log error
        logger.error('Clone failed', { error: error.message, stack: error.stack });

        // User-friendly error messages
        console.error(chalk.red('\n✗ Clone failed:'), error.message);

        if (error.response) {
          const status = error.response.status;
          if (status === 401) {
            console.log(chalk.gray('\nAuthentication expired. Run "mujarrad auth login" to re-authenticate'));
          } else if (status === 404) {
            console.log(chalk.gray(`\nWorkspace "${options.workspace}" not found. Check the workspace slug.`));
          } else if (status === 403) {
            console.log(chalk.gray('\nAccess denied. You may not have permission to clone this workspace.'));
          } else if (status >= 500) {
            console.log(chalk.gray('\nServer error. Please try again later.'));
          }
        } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
          console.log(chalk.gray('\nNetwork error. Check your internet connection and API configuration.'));
        }

        console.log(); // Empty line
        process.exit(1);
      }
    });
}
