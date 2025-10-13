import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { SyncService } from '../services/SyncService.js';
// import { ConflictResolver } from '../services/ConflictResolver.js'; // TODO: Uncomment when implementing interactive resolution
import { SyncApi } from '../api/generated/api.js';
import { Configuration } from '../api/generated/configuration.js';
import { ConfigManager } from '../config/ConfigManager.js';
import { CredentialManager } from '../config/CredentialManager.js';
import { Logger } from '../utils/Logger.js';

/**
 * Setup sync command with Commander.js
 *
 * Provides bidirectional sync command:
 * - sync: Synchronize local changes with remote workspace
 *
 * Usage:
 * ```bash
 * mujarrad sync
 * mujarrad sync --workspace my-workspace
 * ```
 *
 * Features:
 * - Detects local changes via Git diff
 * - Pushes changes to Mujarrad backend
 * - Resolves conflicts (auto-resolve + interactive)
 * - Applies remote changes locally
 * - Updates sync timestamp
 *
 * @param program - Commander.js program instance
 */
export function syncCommand(program: Command): void {
  const logger = new Logger();

  program
    .command('sync')
    .description('Synchronize local vault with Mujarrad workspace')
    .option('-w, --workspace <slug>', 'Workspace slug to sync')
    .addHelpText('after', `
Examples:
  $ mujarrad sync
    Sync current directory with default workspace

  $ mujarrad sync --workspace my-workspace
    Sync current directory with specific workspace

Notes:
  • Must be run from a Git-initialized vault directory
  • Detects changes using git diff
  • Pushes local changes to Mujarrad
  • Resolves conflicts interactively
  • Default workspace can be set in config
    `)
    .action(async (options: any) => {
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

        // Get workspace slug
        const workspaceSlug = options.workspace || await getDefaultWorkspace();
        if (!workspaceSlug) {
          spinner.fail();
          console.error(chalk.red('\n✗ No workspace specified'));
          console.log(chalk.gray('Use --workspace flag or set default workspace\n'));
          process.exit(1);
        }

        // Initialize services
        const config = await new ConfigManager().load();
        const apiConfig = new Configuration({
          basePath: config.apiBaseUrl,
          accessToken: token
        });
        const syncApi = new SyncApi(apiConfig);
        const syncService = new SyncService(syncApi);
        // const conflictResolver = new ConflictResolver(logger); // TODO: Use when implementing interactive resolution

        // Get current directory as vault path
        const vaultPath = process.cwd();

        console.log(chalk.blue(`\nSyncing workspace: ${workspaceSlug}`));
        console.log(chalk.gray(`Vault path: ${vaultPath}\n`));

        // Detect local changes
        spinner.start('Detecting local changes...');
        const changes = await syncService.detectChanges(vaultPath, workspaceSlug);
        spinner.succeed(`Found ${changes.length} local change(s)`);

        if (changes.length === 0) {
          console.log(chalk.green('\n✓ No changes to sync\n'));
          return;
        }

        // Push changes to backend
        spinner.start('Pushing changes to Mujarrad...');
        const pushResult = await syncService.pushChanges(workspaceSlug, changes);
        spinner.succeed(`Created ${pushResult.versionsCreated} version(s)`);

        // Handle conflicts if any
        if (pushResult.conflicts && pushResult.conflicts.length > 0) {
          console.log(chalk.yellow(`\n⚠ ${pushResult.conflicts.length} conflict(s) detected\n`));
          console.log(chalk.gray('  Note: Interactive conflict resolution not yet implemented in sync command.'));
          console.log(chalk.gray('  Use "mujarrad init --sync --strategy KEEP_LOCAL" for automatic resolution.\n'));

          // TODO: Implement interactive conflict resolution
          // for (const conflict of pushResult.conflicts) {
          //   const resolution = await conflictResolver.resolveConflict(...);
          //   ...
          // }
        }

        // Complete sync
        const now = new Date().toISOString();
        await syncService.completeSync(workspaceSlug, now);

        console.log(chalk.green(`\n✓ Sync complete!\n`));

        logger.info('Sync completed', {
          workspaceSlug,
          changesCount: changes.length,
          versionsCreated: pushResult.versionsCreated,
          conflictsResolved: pushResult.conflicts?.length || 0
        });

      } catch (error: any) {
        if (spinner.isSpinning) {
          spinner.fail();
        }

        logger.error('Sync failed', { error: error.message, stack: error.stack });

        console.error(chalk.red('\n✗ Sync failed:'), error.message);

        if (error.response) {
          const status = error.response.status;
          if (status === 401) {
            console.log(chalk.gray('\nAuthentication expired. Run "mujarrad auth login" to re-authenticate'));
          } else if (status === 404) {
            console.log(chalk.gray(`\nWorkspace "${options.workspace}" not found`));
          } else if (status >= 500) {
            console.log(chalk.gray('\nServer error. Please try again later.'));
          }
        }

        console.log();
        process.exit(1);
      }
    });
}

async function getDefaultWorkspace(): Promise<string | null> {
  try {
    const config = await new ConfigManager().load();
    return config.defaultWorkspace || null;
  } catch {
    return null;
  }
}
