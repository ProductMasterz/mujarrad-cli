import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import cliProgress from 'cli-progress';
import * as path from 'path';
import { UploadService } from '../services/UploadService.js';
import { UploadApi } from '../api/generated/api.js';
import { SyncWorkspacesApi } from '../api/generated/index.js';
import { Configuration } from '../api/generated/configuration.js';
import { ConfigManager } from '../config/ConfigManager.js';
import { CredentialManager } from '../config/CredentialManager.js';
import { Logger } from '../utils/Logger.js';
import { VaultValidator } from '../utils/VaultValidator.js';
import { WorkspaceValidator } from '../services/WorkspaceValidator.js';
import { RemoteNodeFetcher } from '../services/RemoteNodeFetcher.js';
import { TransactionalDownloader } from '../services/TransactionalDownloader.js';
import { WorkspaceNotFoundError, AccessDeniedError, WorkspaceValidationError } from '../errors/WorkspaceErrors.js';

/**
 * Setup init command with Commander.js
 *
 * Provides init commands:
 * - init: Initialize Obsidian vault upload to workspace
 *
 * Usage:
 * ```bash
 * mujarrad init <vault-path> --workspace <slug>
 * mujarrad init /path/to/vault -w my-workspace
 * mujarrad init . -w my-workspace --batch-size 100
 * ```
 *
 * Features:
 * - Progress bar for batch uploads
 * - Session tracking and logging
 * - Error handling with actionable messages
 * - Validates vault path exists
 * - Requires authentication
 * - Retry logic for 500 errors
 *
 * @param program - Commander.js program instance
 * @param uploadService - Optional UploadService instance (for testing)
 */
export function initCommand(program: Command, uploadService?: UploadService): void {
  const logger = new Logger();

  // Get or create upload service
  const getUploadService = async (): Promise<UploadService> => {
    if (uploadService) {
      return uploadService;
    }

    const config = await new ConfigManager().load();
    const credentialManager = new CredentialManager();
    const token = await credentialManager.getToken();

    const apiConfig = new Configuration({
      basePath: config.apiBaseUrl,
      accessToken: token || undefined
    });
    const uploadApi = new UploadApi(apiConfig);
    return new UploadService(uploadApi);
  };

  /**
   * Retry logic for 500 errors
   * Attempts operation up to 3 times with exponential backoff
   */
  async function retryOn500<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        lastError = error;

        // Only retry on 500 errors
        if (error.response?.status >= 500 && error.response?.status < 600) {
          if (attempt < maxRetries) {
            const delay = baseDelay * Math.pow(2, attempt - 1);
            logger.warn(`Server error (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms...`, {
              status: error.response.status,
              attempt
            });
            console.log(chalk.yellow(`  ⚠ Server error, retrying in ${delay / 1000}s... (attempt ${attempt}/${maxRetries})`));
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
        }

        // Don't retry other errors
        throw error;
      }
    }

    throw lastError;
  }

  program
    .command('init')
    .description('Initialize Obsidian vault upload to workspace')
    .argument('<vault-path>', 'Path to Obsidian vault directory')
    .requiredOption('-w, --workspace <slug>', 'Workspace slug')
    .option('-b, --batch-size <size>', 'Number of files per batch', '50')
    .option('-s, --sync', 'Enable bidirectional sync (pull remote content before upload)', false)
    .addHelpText('after', `
Examples:
  $ mujarrad init ./my-vault --workspace my-workspace
    One-way upload (default): Upload local vault to workspace

  $ mujarrad init ./my-vault -w my-workspace --sync
    Bidirectional sync: Pull remote content, then upload local changes

  $ mujarrad init ~/Documents/Obsidian/MyVault -w work-notes --sync
    Sync vault with absolute path

  $ mujarrad init . -w project --batch-size 100 --sync
    Sync with larger batch size

Process (without --sync):
  1. Verifies workspace exists and you have write access (fast check)
  2. Validates vault structure (must contain .obsidian folder)
  3. Scans vault for markdown and canvas files
  4. Uploads files in batches to the workspace

Process (with --sync):
  1. Verifies workspace exists and you have write access (fast check)
  2. Pulls remote content from workspace to local vault
  3. Validates vault structure (must contain .obsidian folder)
  4. Scans vault for markdown and canvas files
  5. Uploads files in batches to the workspace

Notes:
  • Workspace must exist before uploading (create at https://www.mujarrad.com)
  • Workspace slug must be 3-50 characters, lowercase alphanumeric with hyphens
  • Default batch size is 50 files
  • Progress is tracked and can be resumed if interrupted
  • Automatically retries on network timeouts and server errors
  • Pre-flight workspace verification prevents wasted processing time

Exit Codes:
  • 0: Success
  • 1: General error (authentication, network, validation)
  • 3: Vault validation failed
  • 4: Workspace not found or access denied
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

        // Validate workspace BEFORE scanning vault (FR-001, US1)
        // This provides fast feedback if workspace doesn't exist (FR-003)
        spinner.start(chalk.blue('Verifying workspace...'));

        const config = await new ConfigManager().load();
        const apiConfig = new Configuration({
          basePath: config.apiBaseUrl,
          accessToken: token || undefined
        });

        const workspaceApi = new SyncWorkspacesApi(apiConfig);
        const workspaceValidator = new WorkspaceValidator(workspaceApi, logger);

        try {
          const workspaceMetadata = await workspaceValidator.validateWorkspace(options.workspace);

          // Display workspace verification success (FR-005)
          spinner.succeed(chalk.green(
            `Workspace verified: ${chalk.white(workspaceMetadata.name)} ` +
            chalk.gray(`(${workspaceMetadata.nodeCount} existing nodes)`)
          ));

          logger.info('Workspace validation successful', {
            workspaceSlug: options.workspace,
            workspaceName: workspaceMetadata.name,
            nodeCount: workspaceMetadata.nodeCount,
            owner: workspaceMetadata.owner
          });
        } catch (error: any) {
          spinner.fail(chalk.red('Workspace verification failed'));

          // Handle specific workspace validation errors (FR-003, FR-004)
          if (error instanceof WorkspaceNotFoundError) {
            console.error(chalk.red(`\n✗ Workspace '${options.workspace}' not found`));
            console.log(chalk.gray('\nTip: Check the workspace slug or create a new workspace at https://www.mujarrad.com\n'));
            process.exit(4); // Exit code 4 for workspace not found (FR-003)
          } else if (error instanceof AccessDeniedError) {
            console.error(chalk.red('\n✗ Access denied to workspace'));
            console.log(chalk.yellow(`\nYou do not have write access to workspace '${options.workspace}'.`));
            console.log(chalk.gray('Contact the workspace owner for permissions.\n'));
            process.exit(4); // Exit code 4 for access denied
          } else if (error instanceof WorkspaceValidationError) {
            console.error(chalk.red(`\n✗ Workspace validation failed: ${error.message}`));

            if (error.message.includes('Authentication required')) {
              console.log(chalk.gray('\nRun "mujarrad auth login" to authenticate\n'));
              process.exit(1);
            } else if (error.message.includes('Invalid workspace slug')) {
              console.log(chalk.gray('\nWorkspace slug must be 3-50 characters, lowercase alphanumeric with hyphens\n'));
              process.exit(1);
            } else if (error.message.includes('timeout')) {
              console.log(chalk.gray('\nNetwork timeout occurred. Check your internet connection and try again.\n'));
              process.exit(1);
            }

            console.log(); // Empty line
            process.exit(1);
          } else {
            // Unknown error
            throw error;
          }
        }

        // Pull remote content if --sync flag is enabled (FR-007, T025)
        if (options.sync) {
          spinner.start(chalk.blue('Pulling remote content...'));

          try {
            // Create RemoteNodeFetcher and TransactionalDownloader
            const fetcher = new RemoteNodeFetcher(workspaceApi, logger);
            const downloader = new TransactionalDownloader(logger);

            // Collect nodes (streaming for memory efficiency)
            const remoteNodes = [];
            let nodeCount = 0;

            for await (const node of fetcher.fetchAllNodes(options.workspace)) {
              remoteNodes.push(node);
              nodeCount++;

              // Update spinner with progress
              if (nodeCount % 100 === 0) {
                spinner.text = chalk.blue(`Pulling remote content... (${nodeCount} nodes)`);
              }
            }

            spinner.succeed(chalk.green(`Fetched ${nodeCount} remote nodes`));

            if (nodeCount > 0) {
              // Download nodes to vault
              spinner.start(chalk.blue('Downloading remote content to vault...'));

              const downloadResult = await downloader.downloadNodesAtomically(
                remoteNodes,
                path.resolve(vaultPath)
              );

              if (downloadResult.success) {
                const sizeMB = (downloadResult.totalBytes / (1024 * 1024)).toFixed(2);
                spinner.succeed(chalk.green(
                  `Pulled ${downloadResult.downloadedCount} remote nodes (${sizeMB} MB)`
                ));

                logger.info('Remote content pull completed', {
                  workspaceSlug: options.workspace,
                  downloadedCount: downloadResult.downloadedCount,
                  totalBytes: downloadResult.totalBytes,
                  duration: downloadResult.duration
                });
              } else {
                spinner.fail(chalk.red('Failed to download remote content'));
                console.error(chalk.red(`\n✗ Download failed: ${downloadResult.errorMessage}`));

                if (downloadResult.rolledBack) {
                  console.log(chalk.yellow('All changes were rolled back. Vault is in original state.'));
                }

                logger.error('Remote content download failed', {
                  workspaceSlug: options.workspace,
                  error: downloadResult.errorMessage,
                  rolledBack: downloadResult.rolledBack
                });

                process.exit(1);
              }
            } else {
              spinner.succeed(chalk.gray('No remote content to pull (workspace is empty)'));
            }

          } catch (error: any) {
            spinner.fail(chalk.red('Failed to pull remote content'));

            logger.error('Remote content pull failed', {
              workspaceSlug: options.workspace,
              error: error.message,
              stack: error.stack
            });

            console.error(chalk.red(`\n✗ Pull failed: ${error.message}\n`));
            process.exit(1);
          }
        }

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
        console.log(chalk.blue(`\nInitializing vault upload to workspace: ${options.workspace}`));
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

        // Perform upload with retry logic
        const startTime = Date.now();
        const summary = await retryOn500(async () => {
          return await service.uploadVault(
            options.workspace,
            absoluteVaultPath,
            batchSize
          );
        });

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
            console.log(chalk.red('\n✗ Access denied'));
            console.log(chalk.gray('You may not have permission to upload to this workspace.'));
            console.log(chalk.yellow('\nTip: Try logging in with "mujarrad auth login" if you haven\'t already.'));
            console.log(chalk.gray('If you\'re already logged in, contact the workspace owner for access.\n'));
          } else if (status === 413) {
            console.log(chalk.gray('\nPayload too large. Try reducing the batch size with --batch-size'));
          } else if (status >= 500) {
            console.log(chalk.red('\n✗ Server error after multiple retries'));
            console.log(chalk.gray('The server is experiencing issues. Please try again later.'));
            console.log(chalk.gray('If the problem persists, check https://status.mujarrad.com\n'));
          }
        } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
          console.log(chalk.gray('\nNetwork error. Check your internet connection and API configuration.'));
        }

        console.log(); // Empty line
        process.exit(1);
      }
    });
}
