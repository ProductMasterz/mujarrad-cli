#!/usr/bin/env node

/**
 * Postinstall script - displays logo and welcome message
 *
 * Features:
 * - Only runs in TTY environments (not in CI/CD)
 * - Graceful failure - never blocks installation
 * - Fast execution (< 5 seconds)
 * - Displays Mujarrad logo and getting started info
 */

try {
  // Only display in interactive terminals (not in CI/CD)
  if (process.stdout.isTTY) {
    const chalk = require('chalk');
    const path = require('path');

    // Import displayBanner from compiled dist
    const { displayBanner } = require('../dist/utils/logo.js');

    console.log('\n');
    displayBanner();
    console.log(chalk.cyan.bold('🎉 Mujarrad CLI installed successfully!\n'));
    console.log('Get started: ' + chalk.green('mujarrad --help'));
    console.log('Documentation: ' + chalk.blue('https://www.mujarrad.com\n'));
  }
} catch (error) {
  // Silent failure - don't block installation if anything goes wrong
  // This ensures installation completes even if:
  // - chalk is not available
  // - logo.js is not compiled yet
  // - any other unexpected error occurs
}
