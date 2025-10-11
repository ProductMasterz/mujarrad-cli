#!/usr/bin/env node

import { Command } from 'commander';
import { displayBanner } from './utils/logo.js';
import { getVersion } from './utils/version.js';
import { migrateConfig } from './utils/configMigration.js';
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
  // Migrate config if needed (silent - no output)
  await migrateConfig();

  // Display brand logo
  displayBanner();

  // Create Commander.js program
  const program = new Command();

  program
    .name('mujarrad')
    .description('Obsidian Knowledge Graph Integration with Mujarrad')
    .version(getVersion());

  // Register commands
  authCommand(program);
  uploadCommand(program);
  cloneCommand(program);
  syncCommand(program);
  templateCommand(program);

  // Parse arguments
  await program.parseAsync(process.argv);
}

main().catch((error) => {
  console.error('Error:', error.message);
  process.exit(1);
});
