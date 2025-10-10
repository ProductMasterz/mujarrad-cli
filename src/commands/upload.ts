import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import cliProgress from 'cli-progress';
import * as path from 'path';
import * as fs from 'fs/promises';
import { UploadService } from '../services/UploadService.js';
import { UploadApi } from '../api/generated/api.js';
import { Configuration } from '../api/generated/configuration.js';
import { ConfigManager } from '../config/ConfigManager.js';
import { CredentialManager } from '../config/CredentialManager.js';
import { Logger } from '../utils/Logger.js';

/**
 * Setup upload command with Commander.js
 *
 * Provides upload commands:
 * - upload: Upload Obsidian vault to workspace
 *
 * Usage:
 * ```bash
 * mujarrad upload <vault-path> --workspace <slug>
 * mujarrad upload /path/to/vault -w my-workspace
 * mujarrad upload . -w my-workspace --batch-size 100
 * ```
 *
 * Features:
 * - Progress bar for batch uploads
 * - Session tracking and logging
 * - Error handling with actionable messages
 * - Validates vault path exists
 * - Requires authentication
 *
 * @param program - Commander.js program instance
 * @param uploadService - Optional UploadService instance (for testing)
 */
export function uploadCommand(program: Command, uploadService?: UploadService): void {
  const logger = new Logger();

  // Get or create upload service
  const getUploadService = async (): Promise<UploadService> => {
    if (uploadService) {
      return uploadService;
    }

    const config = await new ConfigManager().load();
    const apiConfig = new Configuration({
      basePath: config.apiBaseUrl
    });
    const uploadApi = new UploadApi(apiConfig);
    return new UploadService(uploadApi);
  };

  program
    .command('upload')
    .description('Upload Obsidian vault to workspace')
    .argument('<vault-path>', 'Path to Obsidian vault directory')
    .requiredOption('-w, --workspace <slug>', 'Workspace slug')
    .option('-b, --batch-size <size>', 'Number of files per batch', '50')
    .action(async (vaultPath: string, options: any) => {
      const spinner = ora();
      let progressBar: cliProgress.SingleBar | null = null;

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

        // Validate vault path
        spinner.start('Validating vault path...');
        const absoluteVaultPath = path.resolve(vaultPath);
        try {
          const stats = await fs.stat(absoluteVaultPath);
          if (!stats.isDirectory()) {
            spinner.fail();
            console.error(chalk.red(`\n✗ Path is not a directory: ${absoluteVaultPath}\n`));
            process.exit(1);
          }
        } catch (error: any) {
          spinner.fail();
          console.error(chalk.red(`\n✗ Vault path does not exist: ${absoluteVaultPath}\n`));
          process.exit(1);
        }
        spinner.succeed(`Vault path: ${absoluteVaultPath}`);

        // Parse batch size
        const batchSize = parseInt(options.batchSize, 10);
        if (isNaN(batchSize) || batchSize <= 0) {
          console.error(chalk.red('\n✗ Invalid batch size. Must be a positive integer.\n'));
          process.exit(1);
        }

        // Get upload service
        const service = await getUploadService();

        // Start upload with progress tracking
        console.log(chalk.blue(`\nUploading vault to workspace: ${options.workspace}`));
        console.log(chalk.gray(`Batch size: ${batchSize}\n`));

        // Create progress bar
        progressBar = new cliProgress.SingleBar({
          format: 'Upload Progress |' + chalk.cyan('{bar}') + '| {percentage}% | {value}/{total} nodes | Batch {batch}',
          barCompleteChar: '\u2588',
          barIncompleteChar: '\u2591',
          hideCursor: true
        });

        // Track progress (we'll update this as we scan)
        spinner.start('Scanning vault...');

        // Perform upload
        const startTime = Date.now();
        const summary = await service.uploadVault(
          options.workspace,
          absoluteVaultPath,
          batchSize
        );

        // Stop spinner and start progress bar if we have files
        if (summary.totalNodesCreated > 0 || summary.totalErrors > 0) {
          spinner.stop();
          const totalNodes = summary.totalNodesCreated + summary.totalErrors;
          progressBar.start(totalNodes, summary.totalNodesCreated, {
            batch: `${Math.ceil(summary.totalNodesCreated / batchSize)}`
          });
          progressBar.update(summary.totalNodesCreated);
          progressBar.stop();
        } else {
          spinner.warn('No files found to upload');
        }

        // Display results
        const duration = Math.round((summary.duration || (Date.now() - startTime)) / 1000);
        console.log(chalk.green(`\n✓ Upload complete! (${duration}s)`));
        console.log(chalk.gray(`\nNodes created: ${chalk.white(summary.totalNodesCreated.toString())}`));

        if (summary.totalErrors > 0) {
          console.log(chalk.yellow(`Errors: ${summary.totalErrors}`));
          console.log(chalk.gray('\nRun "mujarrad sync status" for detailed error information'));
        }

        if (summary.sessionId) {
          console.log(chalk.gray(`Session ID: ${summary.sessionId}`));
          logger.info('Upload completed', {
            workspaceSlug: options.workspace,
            sessionId: summary.sessionId,
            nodesCreated: summary.totalNodesCreated,
            errors: summary.totalErrors,
            duration
          });
        }

        console.log(); // Empty line

      } catch (error: any) {
        // Stop any active UI elements
        if (spinner.isSpinning) {
          spinner.fail();
        }
        if (progressBar) {
          progressBar.stop();
        }

        // Log error
        logger.error('Upload failed', { error: error.message, stack: error.stack });

        // User-friendly error messages
        console.error(chalk.red('\n✗ Upload failed:'), error.message);

        if (error.response) {
          const status = error.response.status;
          if (status === 401) {
            console.log(chalk.gray('\nAuthentication expired. Run "mujarrad auth login" to re-authenticate'));
          } else if (status === 404) {
            console.log(chalk.gray(`\nWorkspace "${options.workspace}" not found. Check the workspace slug.`));
          } else if (status === 403) {
            console.log(chalk.gray('\nAccess denied. You may not have permission to upload to this workspace.'));
          } else if (status === 413) {
            console.log(chalk.gray('\nPayload too large. Try reducing the batch size with --batch-size'));
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
