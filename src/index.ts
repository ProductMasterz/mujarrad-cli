#!/usr/bin/env node

import { Command } from 'commander';
import { displayBanner } from './utils/logo.js';
import { getVersion } from './utils/version.js';
import { migrateConfig } from './utils/configMigration.js';
import { SessionManager } from './utils/SessionManager.js';
import { Logger, createSessionLogger } from './utils/Logger.js';
import { AlphaDisclaimer } from './utils/AlphaDisclaimer.js';
import { VersionInfo } from './utils/versionInfo.js';
import { ConfigManager } from './config/ConfigManager.js';
import { authCommand } from './commands/auth.js';
import { uploadCommand } from './commands/upload.js';
import { cloneCommand } from './commands/clone.js';
import { syncCommand } from './commands/sync.js';
import { templateCommand } from './commands/template.js';

/**
 * Mujarrad CLI - Obsidian Knowledge Graph Integration
 *
 * Main entry point for the CLI application
 */

async function main() {
  // Initialize session tracking
  const commandName = process.argv.slice(2).join(' ') || 'unknown';
  const session = SessionManager.createSessionMetadata(commandName);
  const logger = new Logger();
  const sessionLogger = createSessionLogger(logger, session.sessionId);

  // Log CLI start
  sessionLogger.info('CLI command started', {
    command: commandName,
    version: getVersion(),
    args: process.argv.slice(2),
  });

  try {
    // Migrate config if needed (silent - no output)
    await migrateConfig();

    // Check and show alpha/beta disclaimer if needed
    const configManager = new ConfigManager();
    const config = await configManager.load();
    const currentVersion = getVersion();

    if (await AlphaDisclaimer.shouldShow(currentVersion, config)) {
      // Auto-accept if flag or env var present
      if (AlphaDisclaimer.canAutoAccept()) {
        sessionLogger.info('Alpha disclaimer auto-accepted', {
          version: currentVersion,
          method: AlphaDisclaimer.hasAcceptFlag() ? 'flag' : 'env-var',
        });
        await AlphaDisclaimer.recordAcknowledgment(currentVersion, config);
      } else {
        // Prompt user to accept
        const accepted = await AlphaDisclaimer.prompt(currentVersion);

        if (!accepted) {
          sessionLogger.info('Alpha disclaimer declined by user', {
            version: currentVersion,
          });
          console.log('\nCLI execution cancelled. Alpha disclaimer must be accepted to continue.\n');
          await logger.shutdown();
          process.exit(1);
        }

        sessionLogger.info('Alpha disclaimer accepted by user', {
          version: currentVersion,
        });
        await AlphaDisclaimer.recordAcknowledgment(currentVersion, config);
      }
    }

    // Display brand logo
    displayBanner();

    // Create Commander.js program
    const program = new Command();

    program
      .name('mujarrad')
      .description('Obsidian Knowledge Graph Integration with Mujarrad\n\nSync your Obsidian vaults with Mujarrad workspaces for knowledge graph visualization and collaboration.')
      .version(getVersion(), '-v, --version', 'Display version information')
      .addHelpText('after', `
Examples:
  $ mujarrad auth login
  $ mujarrad upload ./my-vault --workspace my-workspace
  $ mujarrad clone my-workspace ./local-folder
  $ mujarrad sync ./my-vault --workspace my-workspace

Documentation:
  Visit https://www.mujarrad.com for complete documentation

Troubleshooting:
  • Authentication issues: Run 'mujarrad auth status' to check login state
  • Upload failures: Check vault structure and network connectivity
  • Log location: ~/.mujarrad/logs/
  • Export logs: mujarrad logs export (coming soon)
  • Report issues: https://github.com/mujarrad/mujarrad-cli/issues
      `);

    // Add enhanced version command
    program
      .command('version')
      .description('Display detailed version information')
      .action(() => {
        VersionInfo.displayVersionInfo();
      });

    // Register commands
    authCommand(program);
    uploadCommand(program);
    cloneCommand(program);
    syncCommand(program);
    templateCommand(program);

    // Parse arguments
    await program.parseAsync(process.argv);

    // Log successful completion
    sessionLogger.info('CLI command completed', {
      exitCode: 0,
      duration: Date.now() - new Date(session.startTime).getTime(),
    });

    // Gracefully shutdown logger
    await logger.shutdown();

    process.exit(0);
  } catch (error) {
    // Log error
    sessionLogger.error('CLI command failed', {
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name,
      } : error,
      exitCode: 1,
      duration: Date.now() - new Date(session.startTime).getTime(),
    });

    // Gracefully shutdown logger
    await logger.shutdown();

    console.error('Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error instanceof Error ? error.message : error);
  process.exit(1);
});
