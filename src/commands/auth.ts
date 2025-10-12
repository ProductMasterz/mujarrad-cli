import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import { AuthService } from '../services/AuthService.js';
import { AuthenticationApi } from '../api/generated/api.js';
import { Configuration } from '../api/generated/configuration.js';
import { ConfigManager } from '../config/ConfigManager.js';

/**
 * Setup auth command with Commander.js
 *
 * Provides authentication commands:
 * - auth login: Authenticate user with email/password
 * - auth register: Register new user account
 * - auth logout: Clear stored credentials
 * - auth status: Show authentication status
 *
 * @param program - Commander.js program instance
 * @param authService - Optional AuthService instance (for testing)
 */
export function authCommand(program: Command, authService?: AuthService): void {
  // Get or create auth service
  const getAuthService = async (): Promise<AuthService> => {
    if (authService) {
      return authService;
    }

    const config = await new ConfigManager().load();
    const apiConfig = new Configuration({
      basePath: config.apiBaseUrl
    });
    const authApi = new AuthenticationApi(apiConfig);
    return new AuthService(authApi);
  };

  const auth = program
    .command('auth')
    .description('Authentication commands for Mujarrad')
    .addHelpText('after', `
Examples:
  $ mujarrad auth login
    Log in with your email and password

  $ mujarrad auth register
    Create a new Mujarrad account

  $ mujarrad auth status
    Check if you're currently logged in

  $ mujarrad auth logout
    Log out from your account

Notes:
  • Credentials are stored securely in your system keychain
  • Authentication tokens expire after 30 days
  • Use 'mujarrad auth status' to verify login state
    `);

  // auth login
  auth
    .command('login')
    .description('Login to Mujarrad with email and password')
    .action(async () => {
      try {
        console.log(chalk.blue('Login to Mujarrad\n'));

        const answers: any = await (inquirer.prompt as any)([
          {
            type: 'input',
            name: 'email',
            message: 'Email:',
            validate: (input: string) => {
              const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
              return emailRegex.test(input) || 'Please enter a valid email address';
            }
          },
          {
            type: 'password',
            name: 'password',
            message: 'Password:',
            mask: '*',
            validate: (input: string) => {
              return input.length >= 8 || 'Password must be at least 8 characters';
            }
          }
        ]);

        const service = await getAuthService();
        const result = await service.login(answers.email, answers.password);

        console.log(chalk.green('\n✓ Logged in successfully!'));
        console.log(chalk.gray(`Welcome back, ${result.user.name || result.user.email}!`));
      } catch (error: any) {
        console.error(chalk.red('\n✗ Login failed:'), error.message);
        process.exit(1);
      }
    });

  // auth register
  auth
    .command('register')
    .description('Register a new Mujarrad account')
    .action(async () => {
      try {
        console.log(chalk.blue('Register for Mujarrad\n'));

        const answers: any = await (inquirer.prompt as any)([
          {
            type: 'input',
            name: 'email',
            message: 'Email:',
            validate: (input: string) => {
              const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
              return emailRegex.test(input) || 'Please enter a valid email address';
            }
          },
          {
            type: 'input',
            name: 'name',
            message: 'Full Name:',
            validate: (input: string) => {
              return input.trim().length > 0 || 'Name is required';
            }
          },
          {
            type: 'password',
            name: 'password',
            message: 'Password:',
            mask: '*',
            validate: (input: string) => {
              return input.length >= 8 || 'Password must be at least 8 characters';
            }
          },
          {
            type: 'password',
            name: 'confirmPassword',
            message: 'Confirm Password:',
            mask: '*',
            validate: (input: string, answers: any) => {
              return input === answers.password || 'Passwords do not match';
            }
          }
        ]);

        // Check password match
        if (answers.password !== answers.confirmPassword) {
          console.error(chalk.red('\n✗ Passwords do not match'));
          process.exit(1);
        }

        const service = await getAuthService();
        const result = await service.register(answers.email, answers.password, answers.name);

        console.log(chalk.green('\n✓ Registration successful!'));
        console.log(chalk.gray(`Welcome, ${result.user.name}!`));
        console.log(chalk.gray('You are now logged in.'));
      } catch (error: any) {
        console.error(chalk.red('\n✗ Registration failed:'), error.message);
        process.exit(1);
      }
    });

  // auth logout
  auth
    .command('logout')
    .description('Logout from Mujarrad')
    .action(async () => {
      try {
        const service = await getAuthService();
        await service.logout();
        console.log(chalk.green('✓ Successfully logged out'));
      } catch (error: any) {
        // Even if logout fails, inform user they're logged out
        console.log(chalk.green('✓ Successfully logged out'));
      }
    });

  // auth status
  auth
    .command('status')
    .description('Show authentication status')
    .action(async () => {
      try {
        const service = await getAuthService();
        const isAuthenticated = await service.isAuthenticated();

        if (isAuthenticated) {
          const user = await service.getCurrentUser();

          console.log(chalk.green('✓ Authenticated'));
          console.log(chalk.gray(`\nUser: ${user.name || 'N/A'}`));
          console.log(chalk.gray(`Email: ${user.email}`));
          console.log(chalk.gray(`ID: ${user.id}`));
        } else {
          console.log(chalk.yellow('✗ Not authenticated'));
          console.log(chalk.gray('\nRun "mujarrad auth login" to authenticate'));
        }
      } catch (error: any) {
        console.error(chalk.red('✗ Error checking authentication status:'), error.message);
        process.exit(1);
      }
    });
}
