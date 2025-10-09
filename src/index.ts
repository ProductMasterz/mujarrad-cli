#!/usr/bin/env node

import { displayBanner } from './utils/logo.js';

/**
 * Mujarrad CLI - Obsidian Knowledge Graph Integration
 *
 * Main entry point for the CLI application
 */

async function main() {
  // Display brand logo
  displayBanner();

  console.log('Welcome to Mujarrad CLI!\n');
  console.log('Available commands:');
  console.log('  mujarrad auth login          - Authenticate with Mujarrad');
  console.log('  mujarrad workspace create    - Create a new workspace');
  console.log('  mujarrad upload <path>       - Upload Obsidian vault');
  console.log('  mujarrad clone <path>        - Clone workspace to local vault');
  console.log('  mujarrad sync <path>         - Sync changes with Mujarrad');
  console.log('  mujarrad template list       - List available templates');
  console.log('  mujarrad --help              - Show help\n');
}

main().catch((error) => {
  console.error('Error:', error.message);
  process.exit(1);
});
