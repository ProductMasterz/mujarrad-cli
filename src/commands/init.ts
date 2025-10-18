import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import cliProgress from 'cli-progress';
import * as path from 'path';
import { UploadService } from '../services/UploadService.js';
import { UploadApi } from '../api/generated/api.js';
import { SpacesApi } from '../api/generated/index.js';
import { Configuration } from '../api/generated/configuration.js';
import { ConfigManager } from '../config/ConfigManager.js';
import { CredentialManager } from '../config/CredentialManager.js';
import { Logger } from '../utils/Logger.js';
import { VaultValidator } from '../utils/VaultValidator.js';
import { SlugValidator } from '../utils/SlugValidator.js';
import { SpaceValidator } from '../services/SpaceValidator.js';
import { SpaceResolver } from '../services/SpaceResolver.js';
import { ConfigManager as SpaceConfigManager } from '../services/ConfigManager.js';
import { RemoteNodeFetcher } from '../services/RemoteNodeFetcher.js';
import { TransactionalDownloader } from '../services/TransactionalDownloader.js';
import { VersionComparator } from '../services/VersionComparator.js';
import { LocalFileHasher } from '../utils/LocalFileHasher.js';
import { VaultScanner } from '../filesystem/VaultScanner.js';
import { ConflictResolver } from '../services/ConflictResolver.js';
import { ConflictStrategy } from '../types/sync.js';

/**
 * Setup init command with Commander.js
 *
 * Provides init commands:
 * - init: Initialize Obsidian vault upload to space
 *
 * Usage:
 * ```bash
 * mujarrad init <vault-path> --space <slug>
 * mujarrad init /path/to/vault -w my-space
 * mujarrad init . -w my-space --batch-size 100
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
    .description('Initialize Obsidian vault upload to space')
    .argument('<vault-path>', 'Path to Obsidian vault directory')
    .requiredOption('-w, --space <slug>', 'Space slug')
    .option('-b, --batch-size <size>', 'Number of files per batch', '50')
    .option('-s, --sync', 'Enable bidirectional sync (pull remote content before upload)', false)
    .option('--strategy <strategy>', 'Conflict resolution strategy: KEEP_LOCAL, KEEP_REMOTE, SKIP (only with --sync)', 'SKIP')
    .option('--space-name <name>', 'Display name for new space (only used if space is auto-created)')
    .option('--space-description <text>', 'Description for new space (only used if space is auto-created)')
    .option('--no-auto-create', 'Disable automatic space creation (fail if space does not exist)')
    .addHelpText('after', `
Examples:
  $ mujarrad init ./my-vault --space my-space
    One-way upload (default): Upload local vault to space
    If space doesn't exist, it will be created automatically

  $ mujarrad init ./my-vault -w kb --space-name "Knowledge Base" --space-description "Work notes"
    Create new space with custom name and description

  $ mujarrad init ./my-vault -w my-space --no-auto-create
    Fail immediately if space doesn't exist (disable auto-creation)

  $ mujarrad init ./my-vault -w my-space --sync
    Bidirectional sync: Pull remote content, then upload local changes

  $ mujarrad init ~/Documents/Obsidian/MyVault -w work-notes --sync
    Sync vault with absolute path

  $ mujarrad init . -w project --batch-size 100 --sync
    Sync with larger batch size

  $ mujarrad init ./my-vault -w my-space --sync --strategy KEEP_LOCAL
    Sync and automatically keep local version for conflicts

  $ mujarrad init ./my-vault -w my-space --sync --strategy KEEP_REMOTE
    Sync and automatically keep remote version for conflicts

Process (without --sync):
  1. Verifies space exists and you have write access (fast check)
  2. Validates vault structure (must contain .obsidian folder)
  3. Scans vault for markdown and canvas files
  4. Uploads files in batches to the space

Process (with --sync):
  1. Verifies space exists and you have write access (fast check)
  2. Pulls remote content from space to local vault
  3. Validates vault structure (must contain .obsidian folder)
  4. Compares local and remote state (three-way merge)
  5. Displays sync summary (identical, local changes, remote changes, conflicts)
  6. Uploads local changes in batches to the space

Notes:
  • If space doesn't exist, it will be created automatically (unless --no-auto-create is used)
  • Space slug must be 1-50 characters, lowercase alphanumeric with hyphens
  • Use --space-name and --space-description to customize new space metadata
  • Use --no-auto-create to disable automatic space creation (fail if space missing)
  • Default batch size is 50 files
  • Progress is tracked and can be resumed if interrupted
  • Automatically retries on network timeouts and server errors
  • Pre-flight space verification prevents wasted processing time
  • --strategy flag only applies when --sync is enabled
  • Default strategy is SKIP (conflicts are skipped)
  • KEEP_LOCAL: Automatically keeps local version for all conflicts
  • KEEP_REMOTE: Automatically keeps remote version for all conflicts

Exit Codes:
  • 0: Success
  • 1: General error (authentication, network, validation)
  • 3: Vault validation failed
  • 4: Space not found or access denied
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

        // T015: Client-side slug validation (FR-003, FR-004)
        // Validate slug format BEFORE any API calls
        spinner.start('Validating space slug...');
        const slugValidator = new SlugValidator();
        const slugValidation = slugValidator.validate(options.space);

        if (!slugValidation.valid) {
          spinner.fail(chalk.red('Invalid space slug'));
          console.error(chalk.red('\n✗ Space slug validation failed:\n'));

          // Display all validation errors
          slugValidation.errors.forEach(error => {
            console.error(chalk.red(`  • ${error}`));
          });

          // Display format requirements and examples (NFR-003)
          console.log(chalk.gray('\nSlug format requirements:'));
          console.log(chalk.gray(`  • ${slugValidation.format}`));
          console.log(chalk.gray(`  • Length: ${slugValidation.minLength}-${slugValidation.maxLength} characters`));
          console.log(chalk.gray('\nValid examples:'));
          console.log(chalk.gray('  • my-space'));
          console.log(chalk.gray('  • kb-2025'));
          console.log(chalk.gray('  • project-notes\n'));

          logger.error('Slug validation failed', {
            slug: options.space,
            errors: slugValidation.errors
          });

          process.exit(1);
        }

        spinner.succeed('Slug validated');

        // Validate and resolve slug to UUID (FR-001, FR-002)
        spinner.start(chalk.blue('Verifying space...'));

        const config = await new ConfigManager().load();
        const apiConfig = new Configuration({
          basePath: config.apiBaseUrl,
          accessToken: token || undefined
        });

        const spaceApi = new SpacesApi(apiConfig);
        const spaceConfigManager = new SpaceConfigManager();
        const spaceResolver = new SpaceResolver(spaceApi, spaceConfigManager, logger);
        const spaceValidator = new SpaceValidator(spaceResolver, logger);

        let spaceUuid: string;

        try {
          // Validate and resolve slug to UUID
          spaceUuid = await spaceValidator.validateSpace(options.space);

          spinner.succeed(chalk.green(`Space verified: ${chalk.white(options.space)}`));

          logger.info('Space validation successful', {
            spaceSlug: options.space,
            spaceUuid
          });

        } catch (error: any) {
          // Handle space validation failures
          spinner.fail(chalk.red('Space validation failed'));

          const errorMessage = error.message || 'Unknown error';

          console.error(chalk.red(`\n✗ ${errorMessage}\n`));

          logger.error('Space validation failed', {
            spaceSlug: options.space,
            error: errorMessage,
            stack: error.stack
          });

          process.exit(1);
        }

        // Pull remote content if --sync flag is enabled (FR-007, T025)
        if (options.sync) {
          spinner.start(chalk.blue('Pulling remote content...'));

          try {
            // Create RemoteNodeFetcher and TransactionalDownloader
            const fetcher = new RemoteNodeFetcher(spaceApi, logger);
            const downloader = new TransactionalDownloader(logger);

            // Collect nodes (streaming for memory efficiency)
            const remoteNodes = [];
            let nodeCount = 0;

            for await (const node of fetcher.fetchAllNodes(spaceUuid)) {
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
                  spaceSlug: options.space,
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
                  spaceSlug: options.space,
                  error: downloadResult.errorMessage,
                  rolledBack: downloadResult.rolledBack
                });

                process.exit(1);
              }
            } else {
              spinner.succeed(chalk.gray('No remote content to pull (space is empty)'));
            }

          } catch (error: any) {
            spinner.fail(chalk.red('Failed to pull remote content'));

            logger.error('Remote content pull failed', {
              spaceSlug: options.space,
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

        // Compare local and remote state if --sync flag is enabled (FR-021, FR-022, T034-T037)
        if (options.sync) {
          spinner.start(chalk.blue('Comparing local and remote state...'));

          try {
            // Create services for comparison
            const vaultScanner = new VaultScanner(absoluteVaultPath);
            const fileHasher = new LocalFileHasher(logger);
            const comparator = new VersionComparator(logger);
            const fetcher = new RemoteNodeFetcher(spaceApi, logger);

            // Scan local vault for files
            const scannedFiles = await vaultScanner.scan();

            // Process local files to compute hashes
            const localFilesInput = scannedFiles.map((f: any) => ({
              absolutePath: f.absolutePath,
              relativePath: f.relativePath,
              fileType: (f.extension === '.md' ? 'markdown' : 'canvas') as 'markdown' | 'canvas'
            }));
            const localFiles = await fileHasher.processFiles(localFilesInput);

            // Fetch remote nodes
            const remoteNodes: any[] = [];
            for await (const node of fetcher.fetchAllNodes(spaceUuid)) {
              remoteNodes.push(node);
            }

            // Build comparison input (combine local and remote file paths)
            const allFilePaths = new Set([
              ...localFiles.map(f => f.relativePath),
              ...remoteNodes.map(n => n.filePath)
            ]);

            const comparisonInput = Array.from(allFilePaths).map(filePath => {
              const localFile = localFiles.find(f => f.relativePath === filePath);
              const remoteNode = remoteNodes.find(n => n.filePath === filePath);

              return {
                filePath,
                localHash: localFile?.hash || null,
                remoteHash: remoteNode?.hash || null,
                ancestorHash: remoteNode?.ancestorHash || null
              };
            });

            // Perform comparison
            const comparisonResult = comparator.compareFiles(comparisonInput);

            // Display comparison summary (FR-024)
            spinner.succeed(chalk.green('Comparison complete'));
            console.log(chalk.blue('\n📊 Sync Summary:'));
            console.log(chalk.gray(`  • ${chalk.white(comparisonResult.identical.length)} files unchanged (will skip)`));
            console.log(chalk.cyan(`  • ${chalk.white(comparisonResult.localAhead.length)} files to upload (local changes)`));
            console.log(chalk.yellow(`  • ${chalk.white(comparisonResult.remoteAhead.length)} files already pulled (remote changes)`));

            // Handle conflicts with conflict resolution (FR-026-FR-029, T040-T047)
            if (comparisonResult.conflicted.length > 0) {
              console.log(chalk.red(`  • ${chalk.white(comparisonResult.conflicted.length)} conflicts detected`));

              // Parse and validate strategy
              const strategyInput = (options.strategy || 'SKIP').toUpperCase();
              let strategy: ConflictStrategy;

              if (strategyInput === 'KEEP_LOCAL') {
                strategy = ConflictStrategy.KEEP_LOCAL;
              } else if (strategyInput === 'KEEP_REMOTE') {
                strategy = ConflictStrategy.KEEP_REMOTE;
              } else if (strategyInput === 'SKIP') {
                strategy = ConflictStrategy.SKIP;
              } else {
                console.log(chalk.red(`\n✗ Invalid strategy: ${strategyInput}`));
                console.log(chalk.gray('Valid strategies: KEEP_LOCAL, KEEP_REMOTE, SKIP\n'));
                process.exit(1);
              }

              // Display strategy being used
              if (strategy === ConflictStrategy.SKIP) {
                console.log(chalk.gray('\n  Strategy: SKIP (conflicts will be skipped)'));
              } else if (strategy === ConflictStrategy.KEEP_LOCAL) {
                console.log(chalk.cyan('\n  Strategy: KEEP_LOCAL (local version will be kept for all conflicts)'));
              } else if (strategy === ConflictStrategy.KEEP_REMOTE) {
                console.log(chalk.yellow('\n  Strategy: KEEP_REMOTE (remote version will be kept for all conflicts)'));
              }

              // Resolve conflicts
              spinner.start(chalk.blue('Resolving conflicts...'));

              const conflictResolver = new ConflictResolver(logger);
              const conflictsToResolve = comparisonResult.conflicted.map(conflict => {
                const localFile = localFiles.find(f => f.relativePath === conflict.filePath);
                const remoteNode = remoteNodes.find(n => n.filePath === conflict.filePath);

                return {
                  filePath: conflict.filePath,
                  localContent: localFile?.content || null,
                  remoteContent: remoteNode?.content || null,
                  localHash: conflict.localHash,
                  remoteHash: conflict.remoteHash
                };
              });

              const resolutions = await conflictResolver.resolveConflicts(conflictsToResolve, strategy);

              const resolvedCount = resolutions.filter(r => r.chosenContent !== null).length;
              const skippedCount = resolutions.filter(r => r.chosenContent === null).length;

              spinner.succeed(chalk.green('Conflicts resolved'));

              if (resolvedCount > 0) {
                console.log(chalk.cyan(`  • ${chalk.white(resolvedCount)} conflicts resolved`));
              }
              if (skippedCount > 0) {
                console.log(chalk.gray(`  • ${chalk.white(skippedCount)} conflicts skipped`));
              }

              logger.info('Conflict resolution complete', {
                spaceSlug: options.space,
                strategy,
                totalConflicts: comparisonResult.conflicted.length,
                resolved: resolvedCount,
                skipped: skippedCount
              });
            }

            console.log(); // Empty line

            logger.info('Comparison summary', {
              spaceSlug: options.space,
              identical: comparisonResult.identical.length,
              localAhead: comparisonResult.localAhead.length,
              remoteAhead: comparisonResult.remoteAhead.length,
              conflicted: comparisonResult.conflicted.length
            });

          } catch (error: any) {
            spinner.fail(chalk.red('Comparison failed'));
            console.error(chalk.red(`\n✗ Failed to compare local and remote state: ${error.message}\n`));

            logger.error('Comparison failed', {
              spaceSlug: options.space,
              error: error.message,
              stack: error.stack
            });

            process.exit(1);
          }
        }

        // Parse batch size
        const batchSize = parseInt(options.batchSize, 10);
        if (isNaN(batchSize) || batchSize <= 0) {
          console.error(chalk.red('\n✗ Invalid batch size. Must be a positive integer.\n'));
          process.exit(1);
        }

        // Get upload service
        const service = await getUploadService();

        // Start upload with progress tracking
        console.log(chalk.blue(`\nInitializing vault upload to space: ${options.space}`));
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

        // Perform upload with retry logic (use spaceUuid, not slug)
        const startTime = Date.now();
        const summary = await retryOn500(async () => {
          return await service.uploadVault(
            spaceUuid,  // Use UUID from space validation/resolution
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
            spaceSlug: options.space,
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
            console.log(chalk.gray(`\nSpace "${options.space}" not found. Check the space slug.`));
          } else if (status === 403) {
            console.log(chalk.red('\n✗ Access denied'));
            console.log(chalk.gray('You may not have permission to upload to this space.'));
            console.log(chalk.yellow('\nTip: Try logging in with "mujarrad auth login" if you haven\'t already.'));
            console.log(chalk.gray('If you\'re already logged in, contact the space owner for access.\n'));
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
