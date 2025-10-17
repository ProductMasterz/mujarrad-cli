import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import * as path from 'path';
import * as fs from 'fs/promises';
import { TemplateService } from '../services/TemplateService.js';
import { TemplateCloneWorkflow } from '../workflows/TemplateCloneWorkflow.js';
import { TemplatesApi, SpacesApi, CloneApi } from '../api/generated/api.js';
import { CloneService } from '../services/CloneService.js';
import { Configuration } from '../api/generated/configuration.js';
import { ConfigManager } from '../config/ConfigManager.js';
import { CredentialManager } from '../config/CredentialManager.js';
import { Logger } from '../utils/Logger.js';

/**
 * Setup template command with Commander.js
 *
 * Provides template commands:
 * - template list: List available space templates
 * - template clone: Clone space from template
 *
 * Usage:
 * ```bash
 * mujarrad template list
 * mujarrad template list --scope public
 * mujarrad template clone <target-path> --template <id> --name <name>
 * mujarrad template clone ./my-vault -t bmc-template-uuid -n "My Startup"
 * ```
 *
 * Features:
 * - List public and private templates
 * - Clone space from template with placeholders
 * - Progress tracking during clone
 * - Error handling with actionable messages
 *
 * @param program - Commander.js program instance
 * @param templateService - Optional TemplateService instance (for testing)
 * @param templateCloneWorkflow - Optional TemplateCloneWorkflow instance (for testing)
 */
export function templateCommand(
  program: Command,
  templateService?: TemplateService,
  templateCloneWorkflow?: TemplateCloneWorkflow
): void {
  const logger = new Logger();

  // Get or create template service
  const getTemplateService = async (): Promise<TemplateService> => {
    if (templateService) {
      return templateService;
    }

    const config = await new ConfigManager().load();
    const credentialManager = new CredentialManager();
    const token = await credentialManager.getToken();

    const apiConfig = new Configuration({
      basePath: config.apiBaseUrl,
      accessToken: token || undefined
    });
    const templatesApi = new TemplatesApi(apiConfig);
    return new TemplateService(templatesApi);
  };

  // Get or create template clone workflow
  const getTemplateCloneWorkflow = async (): Promise<TemplateCloneWorkflow> => {
    if (templateCloneWorkflow) {
      return templateCloneWorkflow;
    }

    const config = await new ConfigManager().load();
    const credentialManager = new CredentialManager();
    const token = await credentialManager.getToken();

    const apiConfig = new Configuration({
      basePath: config.apiBaseUrl,
      accessToken: token || undefined
    });
    const templatesApi = new TemplatesApi(apiConfig);
    const spacesApi = new SpacesApi(apiConfig);
    const cloneApi = new CloneApi(apiConfig);
    const cloneService = new CloneService(cloneApi);

    return new TemplateCloneWorkflow(templatesApi, spacesApi, cloneService);
  };

  // Create template parent command
  const templateCmd = program
    .command('template')
    .description('Manage space templates')
    .addHelpText('after', `
Examples:
  $ mujarrad template list
    List all public templates

  $ mujarrad template list --scope all
    List all available templates (public and private)

  $ mujarrad template clone ./vault -t bmc-template-uuid -n "My Startup"
    Clone space from Business Model Canvas template

Notes:
  • Public templates are available to all users
  • Private templates are only visible to their creators
  • Template cloning creates a new space with pre-filled content
  • Use template list to find template IDs
    `);

  // Template list command
  templateCmd
    .command('list')
    .alias('ls')
    .description('List available space templates')
    .option('--scope <scope>', 'Filter by scope (public, private, all)', 'public')
    .option('--tags <tags>', 'Filter by tags (comma-separated)')
    .action(async (options: any) => {
      const spinner = ora();

      try {
        spinner.start('Loading templates...');

        const service = await getTemplateService();

        const tags = options.tags ? options.tags.split(',').map((t: string) => t.trim()) : undefined;

        const templates = await service.list({
          scope: options.scope,
          tags
        });

        spinner.stop();

        if (templates.length === 0) {
          console.log(chalk.yellow('\nNo templates found'));
          console.log(chalk.gray('Try changing your filter criteria\n'));
          return;
        }

        console.log(chalk.blue(`\n${templates.length} template(s) found:\n`));

        // Format templates for display
        const formattedTemplates = templates.map(template => ({
          ID: template.id,
          Name: template.name,
          Description: template.description || 'No description',
          Tags: template.tags ? template.tags.join(', ') : 'None',
          'Usage Count': template.usageCount,
          Contexts: template.contextTemplatesCount,
          Public: template.isPublic ? 'Yes' : 'No'
        }));

        console.table(formattedTemplates);

        console.log(chalk.gray(`\nUse "mujarrad template clone" to create a space from a template\n`));

        logger.info('Listed templates', {
          count: templates.length,
          scope: options.scope,
          tags: options.tags
        });

      } catch (error: any) {
        if (spinner.isSpinning) {
          spinner.fail();
        }

        logger.error('Template list failed', { error: error.message, stack: error.stack });

        console.error(chalk.red('\n✗ Failed to list templates:'), error.message);

        if (error.response) {
          const status = error.response.status;
          if (status === 401 || status === 403) {
            console.log(chalk.red('\n✗ Authentication required'));
            console.log(chalk.gray('Public template listing requires authentication in the current API version.'));
            console.log(chalk.yellow('\nTip: Try logging in with "mujarrad auth login" to access templates.'));
            console.log(chalk.gray('If you\'re already logged in, your session may have expired.\n'));
          } else if (status >= 500) {
            console.log(chalk.red('\n✗ Server error'));
            console.log(chalk.gray('The server is experiencing issues. Please try again later.'));
            console.log(chalk.gray('If the problem persists, check https://status.mujarrad.com\n'));
          }
        } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
          console.log(chalk.gray('\nNetwork error. Check your internet connection and API configuration.'));
        }

        console.log();
        process.exit(1);
      }
    });

  // Template clone command
  templateCmd
    .command('clone')
    .description('Clone space from template')
    .argument('<target-path>', 'Target vault directory path')
    .requiredOption('-t, --template <id>', 'Template ID to clone from')
    .requiredOption('-n, --name <name>', 'Name for the new space')
    .option('-d, --description <description>', 'Description for the new space')
    .action(async (targetPath: string, options: any) => {
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

        // Validate target path
        spinner.start('Validating target path...');
        const absoluteTargetPath = path.resolve(targetPath);

        // Check if directory exists and is empty
        try {
          const stats = await fs.stat(absoluteTargetPath);
          if (stats.isDirectory()) {
            const files = await fs.readdir(absoluteTargetPath);
            if (files.length > 0) {
              spinner.warn();
              console.warn(chalk.yellow('\n⚠ Target directory is not empty'));
              console.log(chalk.gray('Cloning may overwrite existing files\n'));
            }
          }
        } catch (error: any) {
          // Directory doesn't exist - will be created
        }
        spinner.succeed(`Target path: ${absoluteTargetPath}`);

        // Get workflow instance
        const workflow = await getTemplateCloneWorkflow();

        // Start clone
        console.log(chalk.blue(`\nCloning from template: ${options.template}`));
        console.log(chalk.gray(`Space name: ${options.name}`));
        if (options.description) {
          console.log(chalk.gray(`Description: ${options.description}`));
        }
        console.log();

        spinner.start('Creating space from template...');

        const result = await workflow.execute(
          options.template,
          {
            spaceName: options.name,
            spaceDescription: options.description,
            placeholders: {} // TODO: Add interactive placeholder prompt in future
          },
          absoluteTargetPath
        );

        spinner.stop();

        if (!result.success) {
          console.error(chalk.red('✗ Template clone failed'));
          console.log(chalk.gray('\nCheck the logs for details\n'));
          process.exit(1);
        }

        const duration = Math.round(result.duration / 1000);
        console.log(chalk.green(`✓ Template clone complete! (${duration}s)`));
        console.log(chalk.gray(`\nSpace ID: ${chalk.white(result.spaceId)}`));
        console.log(chalk.gray(`Nodes cloned: ${chalk.white(result.totalNodes.toString())}`));
        console.log(chalk.gray(`Vault location: ${absoluteTargetPath}`));
        console.log(chalk.gray('\nYou can now open this folder in Obsidian\n'));

        logger.info('Template clone completed', {
          templateId: options.template,
          spaceId: result.spaceId,
          spaceSlug: result.spaceSlug,
          targetPath: absoluteTargetPath,
          nodesCloned: result.totalNodes,
          duration
        });

      } catch (error: any) {
        if (spinner.isSpinning) {
          spinner.fail();
        }

        logger.error('Template clone failed', { error: error.message, stack: error.stack });

        console.error(chalk.red('\n✗ Template clone failed:'), error.message);

        if (error.response) {
          const status = error.response.status;
          if (status === 401) {
            console.log(chalk.gray('\nAuthentication expired. Run "mujarrad auth login" to re-authenticate'));
          } else if (status === 404) {
            console.log(chalk.gray(`\nTemplate "${options.template}" not found. Check the template ID.`));
          } else if (status === 403) {
            console.log(chalk.red('\n✗ Access denied'));
            console.log(chalk.gray('You may not have permission to use this template.'));
            console.log(chalk.yellow('\nTip: Try logging in with "mujarrad auth login" if you haven\'t already.'));
            console.log(chalk.gray('If you\'re already logged in, contact the space owner for access.\n'));
          } else if (status >= 500) {
            console.log(chalk.red('\n✗ Server error after multiple retries'));
            console.log(chalk.gray('The server is experiencing issues. Please try again later.'));
            console.log(chalk.gray('If the problem persists, check https://status.mujarrad.com\n'));
          }
        } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
          console.log(chalk.gray('\nNetwork error. Check your internet connection and API configuration.'));
        }

        console.log();
        process.exit(1);
      }
    });
}
