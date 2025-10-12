import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import cliProgress from 'cli-progress';
import * as path from 'path';
import { UploadService } from '../services/UploadService.js';
import { UploadApi } from '../api/generated/api.js';
import { Configuration } from '../api/generated/configuration.js';
import { ConfigManager } from '../config/ConfigManager.js';
import { CredentialManager } from '../config/CredentialManager.js';
import { Logger } from '../utils/Logger.js';
import { VaultValidator } from '../utils/VaultValidator.js';

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
    .addHelpText('after', `
Examples:
  $ mujarrad upload ./my-vault --workspace my-workspace
    Upload vault from current directory

  $ mujarrad upload ~/Documents/Obsidian/MyVault -w work-notes
    Upload vault with absolute path

  $ mujarrad upload . -w project --batch-size 100
    Upload current directory with larger batch size

Notes:
  • Vault must be an Obsidian vault (contains .obsidian folder)
  • Workspace must exist before uploading
  • Default batch size is 50 files
  • Progress is tracked and can be resumed if interrupted
    `)
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

        // Validate vault structure (US7)
        spinner.start('Validating vault structure...');
        const absoluteVaultPath = path.resolve(vaultPath);

        const validator = new VaultValidator(logger);
        const validation = await validator.validateVault(absoluteVaultPath);

        if (!validation.valid) {
          spinner.fail('Vault validation failed');
          console.error(chalk.red('\n✗ Vault validation failed:\n'));

          // Display errors
          validation.errors.forEach(error => {
            console.error(chalk.red(`  • ${error}`));
          });

          // Display warnings if any
          if (validation.warnings.length > 0) {
            console.log(chalk.yellow('\nWarnings:'));
            validation.warnings.forEach(warning => {
              console.log(chalk.yellow(`  • ${warning}`));
            });
          }

          console.log(chalk.gray('\nTip: Make sure the directory is a valid Obsidian vault with a .obsidian folder.\n'));

          logger.error('Vault validation failed', {
            vaultPath: absoluteVaultPath,
            errors: validation.errors,
            warnings: validation.warnings
          });

          process.exit(3); // Exit code 3 for validation errors
        }

        // Display warnings even if validation passed
        if (validation.warnings.length > 0) {
          spinner.warn('Vault validated with warnings');
          validation.warnings.forEach(warning => {
            console.log(chalk.yellow(`  ⚠ ${warning}`));
          });
        } else {
          spinner.succeed(`Vault validated: ${validation.fileCount} markdown files found`);
        }

        logger.info('Vault validation successful', {
          vaultPath: absoluteVaultPath,
          fileCount: validation.fileCount,
          hasObsidianFolder: validation.hasObsidianFolder
        });

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
