#!/usr/bin/env node

/**
 * Postinstall script - fixes ESM imports and displays welcome message
 *
 * Features:
 * - Fixes ESM imports in generated API files
 * - Only displays logo in TTY environments (not in CI/CD)
 * - Graceful failure - never blocks installation
 * - Fast execution (< 5 seconds)
 */

const fs = require('fs');
const path = require('path');

try {
  // Fix ESM imports in generated API files
  const apiDir = path.join(__dirname, '../dist/api/generated');

  if (fs.existsSync(apiDir)) {
    const filesToFix = ['api.js', 'base.js', 'common.js', 'configuration.js', 'index.js', 'sync-api-extension.js'];

    filesToFix.forEach(file => {
      const filePath = path.join(apiDir, file);
      if (fs.existsSync(filePath)) {
        let content = fs.readFileSync(filePath, 'utf8');

        // Fix imports: add .js extension if missing
        content = content.replace(
          /from\s+['"](\.[^'"]+)(?<!\.js)['"]/g,
          "from '$1.js'"
        );

        fs.writeFileSync(filePath, content);
      }
    });
  }

  // Only display in interactive terminals (not in CI/CD)
  if (process.stdout.isTTY) {
    const chalk = require('chalk');

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
}
