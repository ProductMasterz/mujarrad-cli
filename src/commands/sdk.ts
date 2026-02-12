/**
 * SDK Command — Project scaffolding and API key management for developers.
 *
 * Follows the exact pattern from src/commands/template.ts.
 *
 * Subcommands:
 *   mujarrad sdk init <project-name>  — Scaffold a new project
 *   mujarrad sdk keygen               — Generate a new API key pair
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { SdkService } from '../services/SdkService.js';
import { ConfigManager } from '../config/ConfigManager.js';
import { CredentialManager } from '../config/CredentialManager.js';
import { Logger } from '../utils/Logger.js';

export function sdkCommand(program: Command): void {
  const logger = new Logger();

  const getSdkService = async (): Promise<SdkService> => {
    const config = await new ConfigManager().load();
    const credentialManager = new CredentialManager();
    const token = await credentialManager.getToken();

    if (!token) {
      throw new Error('Not authenticated. Run "mujarrad auth login" first.');
    }

    return new SdkService({
      apiBaseUrl: config.apiBaseUrl,
      token,
    });
  };

  const sdkCmd = program
    .command('sdk')
    .description('Developer SDK tools — scaffold projects and manage API keys')
    .addHelpText('after', `
Examples:
  $ mujarrad sdk init my-app
    Scaffold a new Mujarrad SDK project

  $ mujarrad sdk keygen
    Generate a new API key pair

  $ mujarrad sdk keygen --name "production"
    Generate a named API key pair

Notes:
  • You must be logged in (mujarrad auth login) before using SDK commands
  • API secret keys are shown only once — save them securely
  • Projects are created with a working example using @mujarrad/sdk
    `);

  // sdk init <project-name>
  sdkCmd
    .command('init')
    .description('Scaffold a new Mujarrad SDK project')
    .argument('<project-name>', 'Name for the new project directory')
    .action(async (projectName: string) => {
      const spinner = ora();

      try {
        // 1. Check auth
        spinner.start('Checking authentication...');
        const service = await getSdkService();
        spinner.succeed('Authenticated');

        // 2. Create or get space
        spinner.start(`Setting up space "${projectName}"...`);
        const space = await service.ensureSpace(projectName);
        spinner.succeed(`Space ready: ${space.slug}`);

        // 3. Generate API keys
        spinner.start('Generating API keys...');
        const keys = await service.generateApiKeys(projectName);
        spinner.succeed('API keys generated');

        // 4. Scaffold project
        spinner.start('Scaffolding project...');
        const projectDir = await service.scaffoldProject(projectName, space.slug, keys);
        spinner.succeed('Project created');

        // 5. Summary
        console.log(chalk.green(`\n✓ Project "${projectName}" is ready!\n`));
        console.log(chalk.gray('  Directory:  ') + projectDir);
        console.log(chalk.gray('  Space:      ') + space.slug);
        console.log(chalk.gray('  Public Key: ') + keys.publicKey);
        console.log(chalk.yellow('\n  ⚠ Secret key saved to .env — shown only once'));
        console.log(chalk.blue('\n  Next steps:'));
        console.log(chalk.gray('    cd ') + projectName);
        console.log(chalk.gray('    npm install'));
        console.log(chalk.gray('    npm start'));
        console.log();

        logger.info('SDK project initialized', {
          projectName,
          spaceSlug: space.slug,
          keyId: keys.id,
        });
      } catch (error: any) {
        if (spinner.isSpinning) spinner.fail();

        logger.error('SDK init failed', { error: error.message, stack: error.stack });
        console.error(chalk.red('\n✗ SDK init failed:'), error.message);

        if (error.message?.includes('Not authenticated')) {
          console.log(chalk.gray('\nRun "mujarrad auth login" to authenticate\n'));
        } else if (error.response?.status === 401) {
          console.log(chalk.gray('\nSession expired. Run "mujarrad auth login" to re-authenticate\n'));
        } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
          console.log(chalk.gray('\nNetwork error. Check your internet connection.\n'));
        }

        process.exit(1);
      }
    });

  // sdk keygen
  sdkCmd
    .command('keygen')
    .description('Generate a new API key pair')
    .option('--name <name>', 'Name for the API key')
    .action(async (options: any) => {
      const spinner = ora();

      try {
        spinner.start('Checking authentication...');
        const service = await getSdkService();
        spinner.succeed('Authenticated');

        spinner.start('Generating API keys...');
        const keys = await service.generateApiKeys(options.name);
        spinner.succeed('API keys generated');

        console.log(chalk.green('\n✓ New API key pair created\n'));
        console.log(chalk.gray('  Name:       ') + (keys.name || 'default'));
        console.log(chalk.gray('  Public Key: ') + keys.publicKey);
        console.log(chalk.gray('  Secret Key: ') + keys.secretKey);
        console.log(chalk.yellow('\n  ⚠ Save the secret key now — it will not be shown again'));
        console.log();

        logger.info('API keys generated', { keyId: keys.id, name: options.name });
      } catch (error: any) {
        if (spinner.isSpinning) spinner.fail();

        logger.error('SDK keygen failed', { error: error.message, stack: error.stack });
        console.error(chalk.red('\n✗ Key generation failed:'), error.message);

        if (error.message?.includes('Not authenticated')) {
          console.log(chalk.gray('\nRun "mujarrad auth login" to authenticate\n'));
        }

        process.exit(1);
      }
    });
}
