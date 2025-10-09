# Production-Grade TypeScript CLI Best Practices Research

## Executive Summary

This document provides comprehensive research findings and recommendations for building the Mujarrad CLI tool using Commander.js and TypeScript. The research covers project structure, progress indicators, cross-platform compatibility, error handling, help output design, and testing strategies.

---

## Table of Contents

1. [Project Structure & Organization](#1-project-structure--organization)
2. [Progress Indicators for Long-Running Operations](#2-progress-indicators-for-long-running-operations)
3. [Cross-Platform File Permissions](#3-cross-platform-file-permissions)
4. [Error Handling & Exit Codes](#4-error-handling--exit-codes)
5. [Help Output & Discoverability](#5-help-output--discoverability)
6. [Testing Strategies](#6-testing-strategies)
7. [Recommended Dependencies](#7-recommended-dependencies)
8. [Implementation Roadmap](#8-implementation-roadmap)

---

## 1. Project Structure & Organization

### Recommended Structure for Mujarrad CLI

```
mujarrad-cli/
├── src/
│   ├── index.ts                    # Main entry point with shebang
│   ├── cli.ts                      # Commander.js configuration
│   ├── commands/                   # Command implementations
│   │   ├── upload.ts
│   │   ├── clone.ts
│   │   ├── sync.ts
│   │   ├── pull.ts
│   │   ├── templates.ts
│   │   ├── share.ts
│   │   └── history.ts
│   ├── core/                       # Core business logic
│   │   ├── auth/
│   │   │   ├── credentials.ts
│   │   │   └── session.ts
│   │   ├── sync/
│   │   │   ├── detector.ts
│   │   │   └── applier.ts
│   │   └── workspace/
│   │       ├── manager.ts
│   │       └── validator.ts
│   ├── utils/                      # Utilities
│   │   ├── logger.ts              # Pino logger setup
│   │   ├── progress.ts            # Progress indicator wrapper
│   │   ├── errors.ts              # Custom error classes
│   │   ├── config.ts              # Config management
│   │   └── fs-utils.ts            # Cross-platform file operations
│   ├── types/                      # TypeScript type definitions
│   │   ├── commands.ts
│   │   └── config.ts
│   └── api/                        # Generated API client
│       └── generated/
├── dist/                           # Compiled JavaScript
├── tests/
│   ├── unit/
│   ├── integration/
│   └── fixtures/
├── docs/
├── package.json
├── tsconfig.json
└── jest.config.js
```

### Rationale

**Separation of Concerns:**
- `commands/` contains thin command handlers that delegate to core logic
- `core/` contains business logic, testable without CLI context
- `utils/` provides cross-cutting concerns like logging and progress

**Testability:**
- Command handlers can be unit tested by mocking core modules
- Core logic can be tested independently
- Integration tests can invoke CLI through child_process

**Scalability:**
- Adding new commands is straightforward
- Shared functionality lives in utils/
- Generated API client is isolated in api/

### Main Entry Point Pattern

**src/index.ts:**
```typescript
#!/usr/bin/env node
import { runCLI } from './cli.js';

async function main() {
  try {
    await runCLI();
  } catch (error) {
    // Global error handler
    console.error('Fatal error:', error);
    process.exitCode = 1;
  }
}

main();
```

**src/cli.ts:**
```typescript
import { Command } from 'commander';
import { uploadCommand } from './commands/upload.js';
import { cloneCommand } from './commands/clone.js';
import { syncCommand } from './commands/sync.js';
import { pullCommand } from './commands/pull.js';
import { templatesCommand } from './commands/templates.js';
import { shareCommand } from './commands/share.js';
import { historyCommand } from './commands/history.js';
import { logger } from './utils/logger.js';
import { loadConfig } from './utils/config.js';

export async function runCLI() {
  const program = new Command();

  program
    .name('mujarrad')
    .description('Obsidian Knowledge Graph Integration CLI')
    .version('1.0.0')
    .hook('preAction', async (thisCommand) => {
      // Initialize global state before any command
      await loadConfig();
    });

  // Register commands
  program.addCommand(uploadCommand());
  program.addCommand(cloneCommand());
  program.addCommand(syncCommand());
  program.addCommand(pullCommand());
  program.addCommand(templatesCommand());
  program.addCommand(shareCommand());
  program.addCommand(historyCommand());

  // Parse arguments
  await program.parseAsync(process.argv);
}
```

### Command Organization Pattern

**Separate File Approach (Recommended):**

Each command in its own file provides better organization and maintainability for 7+ commands.

**src/commands/upload.ts:**
```typescript
import { Command } from 'commander';
import { logger } from '../utils/logger.js';
import { createProgressBar } from '../utils/progress.js';
import { WorkspaceUploader } from '../core/workspace/uploader.js';
import { CLIError } from '../utils/errors.js';

export function uploadCommand(): Command {
  return new Command('upload')
    .description('Upload Obsidian vault to Mujarrad workspace')
    .argument('<path>', 'Path to Obsidian vault')
    .option('-w, --workspace <id>', 'Workspace ID')
    .option('--no-progress', 'Disable progress indicator')
    .action(async (vaultPath: string, options) => {
      try {
        logger.info('Starting vault upload', { vaultPath, workspace: options.workspace });

        const uploader = new WorkspaceUploader();
        const progress = createProgressBar({
          total: 100,
          format: 'Uploading [{bar}] {percentage}% | ETA: {eta}s | {value}/{total} files'
        });

        if (options.progress) {
          progress.start();
        }

        await uploader.upload(vaultPath, {
          workspaceId: options.workspace,
          onProgress: (current, total) => {
            if (options.progress) {
              progress.update(current);
            }
          }
        });

        if (options.progress) {
          progress.stop();
        }

        logger.info('Upload completed successfully');
        console.log('✅ Vault uploaded successfully');
      } catch (error) {
        if (error instanceof CLIError) {
          logger.error('Upload failed', { error: error.message, code: error.code });
          console.error(`❌ ${error.message}`);
          console.error(`💡 ${error.remediation}`);
          process.exitCode = error.exitCode;
        } else {
          throw error;
        }
      }
    });
}
```

### Subcommand Organization

For commands with subcommands (like `templates`):

**src/commands/templates.ts:**
```typescript
import { Command } from 'commander';

export function templatesCommand(): Command {
  const templates = new Command('templates')
    .description('Manage workspace templates');

  templates
    .command('list')
    .description('List available templates')
    .action(async () => {
      // Implementation
    });

  templates
    .command('create')
    .description('Create a new template')
    .argument('<name>', 'Template name')
    .action(async (name: string) => {
      // Implementation
    });

  templates
    .command('apply')
    .description('Apply template to workspace')
    .argument('<template-id>', 'Template ID')
    .argument('<workspace-id>', 'Workspace ID')
    .action(async (templateId: string, workspaceId: string) => {
      // Implementation
    });

  return templates;
}
```

---

## 2. Progress Indicators for Long-Running Operations

### Library Comparison

| Feature | ora | cli-progress | Recommendation |
|---------|-----|--------------|----------------|
| **Type** | Spinner | Progress Bar | Use both |
| **Best For** | Indeterminate operations | Determinate operations | Context-dependent |
| **Performance** | Lightweight | Slightly heavier | Both acceptable |
| **API** | Simple, Promise-friendly | More configuration | ora for simplicity |
| **Multi-progress** | No (single spinner) | Yes (multiple bars) | cli-progress for multi-track |

### Recommended Approach: Hybrid Strategy

**Use ora for:**
- Indeterminate operations (waiting for API response)
- Simple status updates
- Operations where progress percentage is unknown

**Use cli-progress for:**
- File uploads with known total size
- Downloads with progress tracking
- Operations with clear completion metrics

### Implementation

**src/utils/progress.ts:**
```typescript
import ora, { Ora } from 'ora';
import cliProgress from 'cli-progress';
import chalk from 'chalk';

export interface SpinnerOptions {
  text: string;
  color?: 'cyan' | 'yellow' | 'green' | 'red';
}

export interface ProgressBarOptions {
  total: number;
  format?: string;
}

/**
 * Create a spinner for indeterminate operations
 */
export function createSpinner(options: SpinnerOptions): Ora {
  return ora({
    text: options.text,
    color: options.color || 'cyan',
  });
}

/**
 * Create a progress bar for determinate operations
 */
export function createProgressBar(options: ProgressBarOptions): cliProgress.SingleBar {
  return new cliProgress.SingleBar({
    format: options.format ||
      chalk.cyan('{bar}') + ' | {percentage}% | {value}/{total}',
    barCompleteChar: '\u2588',
    barIncompleteChar: '\u2591',
    hideCursor: true,
  });
}

/**
 * Execute async operation with spinner
 */
export async function withSpinner<T>(
  text: string,
  operation: () => Promise<T>,
  options?: { successText?: string; failText?: string }
): Promise<T> {
  const spinner = ora(text).start();

  try {
    const result = await operation();
    spinner.succeed(options?.successText || text);
    return result;
  } catch (error) {
    spinner.fail(options?.failText || 'Operation failed');
    throw error;
  }
}

/**
 * Execute async operation with progress bar
 */
export async function withProgress<T>(
  total: number,
  operation: (updateProgress: (current: number) => void) => Promise<T>
): Promise<T> {
  const bar = new cliProgress.SingleBar({
    format: chalk.cyan('{bar}') + ' | {percentage}% | {value}/{total}',
    barCompleteChar: '\u2588',
    barIncompleteChar: '\u2591',
  });

  bar.start(total, 0);

  try {
    const result = await operation((current) => bar.update(current));
    bar.stop();
    return result;
  } catch (error) {
    bar.stop();
    throw error;
  }
}
```

### Usage Examples

**Spinner for API calls:**
```typescript
import { withSpinner } from '../utils/progress.js';

const workspaces = await withSpinner(
  'Fetching workspaces...',
  () => api.workspaces.list(),
  { successText: 'Workspaces loaded' }
);
```

**Progress bar for uploads:**
```typescript
import { createProgressBar } from '../utils/progress.js';

const progress = createProgressBar({
  total: totalFiles,
  format: 'Uploading [{bar}] {percentage}% | {value}/{total} files | ETA: {eta}s'
});

progress.start(totalFiles, 0);

for (const [index, file] of files.entries()) {
  await uploadFile(file);
  progress.update(index + 1);
}

progress.stop();
console.log('✅ Upload complete');
```

**Combined approach for clone (3-minute operation):**
```typescript
// Phase 1: Preparing (spinner)
const spinner = createSpinner({ text: 'Analyzing workspace...' });
spinner.start();
const manifest = await api.workspace.getManifest(workspaceId);
spinner.succeed(`Found ${manifest.files.length} files`);

// Phase 2: Downloading (progress bar)
const progress = createProgressBar({
  total: manifest.files.length,
  format: 'Downloading [{bar}] {percentage}% | {value}/{total} files'
});

progress.start(manifest.files.length, 0);

for (const [index, file] of manifest.files.entries()) {
  await downloadFile(file);
  progress.update(index + 1);
}

progress.stop();
console.log('✅ Clone completed');
```

### Best Practices

1. **Always show progress for operations > 5 seconds** (as per requirements)
2. **Use spinners when total is unknown**, progress bars when determinable
3. **Update text during operation** to show current phase
4. **Always stop spinners/bars** before exit (use try/finally)
5. **Don't mix progress output with logs** - use logger to file only during progress

---

## 3. Cross-Platform File Permissions

### Key Findings

**Critical Limitation:**
> "File permissions are not cross-platform in Node.js"
> - `fs.chmod()` only works on Unix (macOS, Linux)
> - Windows has fundamentally different permission model (ACLs, not POSIX)
> - Setting mode `0600` on Windows has very limited effect

### Recommended Approach

**For credentials.json security (mode 600 requirement):**

**src/utils/fs-utils.ts:**
```typescript
import fs from 'fs/promises';
import { execSync } from 'child_process';
import path from 'path';
import os from 'os';

/**
 * Securely write credentials file with appropriate permissions
 *
 * On Unix: Sets chmod 600 (owner read/write only)
 * On Windows: Uses icacls to restrict access to current user
 */
export async function writeCredentialsFile(
  filePath: string,
  data: object
): Promise<void> {
  const isWindows = process.platform === 'win32';

  // Ensure directory exists
  await fs.mkdir(path.dirname(filePath), { recursive: true });

  // Write file
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');

  if (isWindows) {
    // Windows: Use icacls to restrict permissions
    try {
      const username = os.userInfo().username;

      // Remove inheritance
      execSync(`icacls "${filePath}" /inheritance:r`, { stdio: 'pipe' });

      // Grant current user full control
      execSync(`icacls "${filePath}" /grant "${username}:F"`, { stdio: 'pipe' });

      // Remove all other users/groups
      execSync(`icacls "${filePath}" /remove "Users" "Authenticated Users" "Everyone"`, {
        stdio: 'pipe',
        // Ignore errors if groups don't exist
        windowsHide: true
      });
    } catch (error) {
      // Log warning but don't fail - Windows permissions are best-effort
      console.warn('⚠️  Could not set Windows file permissions. Ensure credentials file is secure.');
    }
  } else {
    // Unix: Use chmod 600
    await fs.chmod(filePath, 0o600);
  }
}

/**
 * Verify credentials file has secure permissions
 */
export async function verifyCredentialsPermissions(filePath: string): Promise<boolean> {
  const isWindows = process.platform === 'win32';

  if (isWindows) {
    // On Windows, we can't reliably verify permissions through Node.js
    // Just check file exists
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  } else {
    // Unix: Check mode is 600
    try {
      const stats = await fs.stat(filePath);
      const mode = stats.mode & 0o777; // Get permission bits
      return mode === 0o600;
    } catch {
      return false;
    }
  }
}

/**
 * Get config directory path (~/.mujarrad)
 */
export function getConfigDir(): string {
  return path.join(os.homedir(), '.mujarrad');
}

/**
 * Get credentials file path (~/.mujarrad/credentials.json)
 */
export function getCredentialsPath(): string {
  return path.join(getConfigDir(), 'credentials.json');
}

/**
 * Get logs directory path (~/.mujarrad/logs/)
 */
export function getLogsDir(): string {
  return path.join(getConfigDir(), 'logs');
}
```

### Usage Example

**src/core/auth/credentials.ts:**
```typescript
import { writeCredentialsFile, getCredentialsPath, verifyCredentialsPermissions } from '../../utils/fs-utils.js';
import { logger } from '../../utils/logger.js';

export interface Credentials {
  apiKey: string;
  userId: string;
  expiresAt: string;
}

export async function saveCredentials(credentials: Credentials): Promise<void> {
  const credPath = getCredentialsPath();

  await writeCredentialsFile(credPath, credentials);

  const isSecure = await verifyCredentialsPermissions(credPath);
  if (!isSecure) {
    logger.warn('Credentials file permissions may not be secure');
    if (process.platform !== 'win32') {
      throw new Error('Failed to set secure permissions on credentials file');
    }
  }

  logger.info('Credentials saved securely', { path: credPath });
}

export async function loadCredentials(): Promise<Credentials | null> {
  const credPath = getCredentialsPath();

  try {
    const data = await fs.readFile(credPath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null; // File doesn't exist
    }
    throw error;
  }
}
```

### Alternative: Use Secure Storage Libraries

For enhanced cross-platform security, consider:

- **keytar** - Native module for credential storage (uses Keychain on macOS, Credential Vault on Windows)
- **node-keytar** - Cross-platform credential storage
- **Downside:** Native dependencies complicate distribution

**Recommendation for Mujarrad:**
- Use the file-based approach above for simplicity
- Warn Windows users about manual security verification
- Document manual security steps in README

---

## 4. Error Handling & Exit Codes

### Exit Code Conventions

| Exit Code | Meaning | When to Use |
|-----------|---------|-------------|
| 0 | Success | Operation completed successfully |
| 1 | General error | Unspecified errors, uncaught exceptions |
| 2 | Invalid usage | Bad command-line arguments |
| 64-78 | Specific errors | Following BSD conventions (optional) |

**Recommendation:** Use codes 0, 1, and 2 consistently. Reserve specific codes (64-78) for critical errors if needed.

### Custom Error Classes

**src/utils/errors.ts:**
```typescript
/**
 * Base class for all CLI errors
 */
export class CLIError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly exitCode: number = 1,
    public readonly remediation?: string
  ) {
    super(message);
    this.name = 'CLIError';
  }
}

/**
 * Authentication errors
 */
export class AuthenticationError extends CLIError {
  constructor(message: string, remediation?: string) {
    super(message, 'AUTH_ERROR', 1, remediation || 'Run "mujarrad login" to authenticate');
    this.name = 'AuthenticationError';
  }
}

/**
 * Validation errors (user input)
 */
export class ValidationError extends CLIError {
  constructor(message: string, remediation?: string) {
    super(message, 'VALIDATION_ERROR', 2, remediation);
    this.name = 'ValidationError';
  }
}

/**
 * Network/API errors
 */
export class NetworkError extends CLIError {
  constructor(message: string, remediation?: string) {
    super(
      message,
      'NETWORK_ERROR',
      1,
      remediation || 'Check your internet connection and try again'
    );
    this.name = 'NetworkError';
  }
}

/**
 * File system errors
 */
export class FileSystemError extends CLIError {
  constructor(message: string, remediation?: string) {
    super(message, 'FS_ERROR', 1, remediation);
    this.name = 'FileSystemError';
  }
}

/**
 * Workspace errors
 */
export class WorkspaceError extends CLIError {
  constructor(message: string, remediation?: string) {
    super(message, 'WORKSPACE_ERROR', 1, remediation);
    this.name = 'WorkspaceError';
  }
}
```

### Error Handling Patterns

**Pattern 1: Try-Catch with Specific Error Types**

```typescript
import { AuthenticationError, NetworkError, ValidationError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import chalk from 'chalk';

export async function executeCommand(/* ... */) {
  try {
    // Command logic
    await performOperation();
    console.log(chalk.green('✅ Success!'));
  } catch (error) {
    if (error instanceof CLIError) {
      // Known CLI error - show user-friendly message
      logger.error(error.code, { message: error.message });
      console.error(chalk.red(`❌ ${error.message}`));

      if (error.remediation) {
        console.error(chalk.yellow(`💡 ${error.remediation}`));
      }

      process.exitCode = error.exitCode;
    } else if (error instanceof Error) {
      // Unknown error - show generic message and log details
      logger.error('UNKNOWN_ERROR', { error: error.message, stack: error.stack });
      console.error(chalk.red('❌ An unexpected error occurred'));
      console.error(chalk.yellow('💡 Check logs at ~/.mujarrad/logs/ for details'));
      process.exitCode = 1;
    } else {
      // Non-Error thrown - very rare
      logger.error('UNKNOWN_ERROR', { error: String(error) });
      console.error(chalk.red('❌ An unexpected error occurred'));
      process.exitCode = 1;
    }
  }
}
```

**Pattern 2: Global Error Handlers**

**src/index.ts:**
```typescript
#!/usr/bin/env node
import { runCLI } from './cli.js';
import { logger } from './utils/logger.js';
import chalk from 'chalk';

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('UNCAUGHT_EXCEPTION', { error: error.message, stack: error.stack });
  console.error(chalk.red('❌ Fatal error:'), error.message);
  console.error(chalk.yellow('💡 Check logs at ~/.mujarrad/logs/ for details'));
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason) => {
  logger.error('UNHANDLED_REJECTION', { reason: String(reason) });
  console.error(chalk.red('❌ Fatal error:'), String(reason));
  console.error(chalk.yellow('💡 Check logs at ~/.mujarrad/logs/ for details'));
  process.exit(1);
});

async function main() {
  try {
    await runCLI();
  } catch (error) {
    // This catch is a last resort - commands should handle their own errors
    logger.error('CLI_ERROR', { error: String(error) });
    console.error(chalk.red('❌ CLI error:'), String(error));
    process.exitCode = 1;
  }
}

main();
```

**Pattern 3: Use process.exitCode Instead of process.exit()**

**Best Practice:**
```typescript
// ✅ Good - allows cleanup and async operations to complete
process.exitCode = 1;

// ❌ Bad - forces immediate exit, may lose data
process.exit(1);
```

**When to use process.exit():**
Only in global error handlers for truly fatal errors.

### Error Message Guidelines

1. **Be specific about what went wrong:**
   - ❌ "Upload failed"
   - ✅ "Upload failed: Workspace 'abc-123' not found"

2. **Provide actionable remediation:**
   - ❌ "Authentication error"
   - ✅ "Authentication error: Invalid API key\n💡 Run 'mujarrad login' to re-authenticate"

3. **Use consistent formatting:**
   - ❌ Error messages (use red ✖)
   - ✅ Success messages (use green ✔)
   - 💡 Remediation/hints (use yellow)

4. **Log detailed errors, show simple errors:**
   - Log: Full stack trace, request details, context
   - Console: User-friendly message with next steps

---

## 5. Help Output & Discoverability

### Commander.js Help Customization

**src/cli.ts:**
```typescript
import { Command } from 'commander';
import chalk from 'chalk';

export async function runCLI() {
  const program = new Command();

  program
    .name('mujarrad')
    .description('Obsidian Knowledge Graph Integration CLI - Sync your vaults with Mujarrad workspaces')
    .version('1.0.0', '-v, --version', 'Display version number')
    .helpOption('-h, --help', 'Display help information')
    .addHelpText('before', `
${chalk.cyan.bold('Mujarrad CLI')} - Obsidian Vault Synchronization
    `)
    .addHelpText('after', `
${chalk.bold('Examples:')}
  ${chalk.gray('$')} mujarrad upload ./my-vault --workspace abc-123
  ${chalk.gray('$')} mujarrad clone abc-123 ./cloned-vault
  ${chalk.gray('$')} mujarrad sync ./my-vault
  ${chalk.gray('$')} mujarrad templates list

${chalk.bold('Documentation:')}
  ${chalk.cyan('https://docs.mujarrad.com/cli')}

${chalk.bold('Issues:')}
  ${chalk.cyan('https://github.com/mujarrad/mujarrad-cli/issues')}
    `);

  // Configure help formatting
  program.configureHelp({
    sortSubcommands: true,
    sortOptions: true,
    showGlobalOptions: true,
  });

  // Group commands by category
  program.addHelpText('after', `
${chalk.bold('Command Categories:')}
  ${chalk.cyan('Workspace Operations:')} upload, clone, pull, sync
  ${chalk.cyan('Template Management:')} templates
  ${chalk.cyan('Collaboration:')} share
  ${chalk.cyan('Version Control:')} history
  `);

  // Register commands with detailed help...

  await program.parseAsync(process.argv);
}
```

### Command-Specific Help

**src/commands/upload.ts:**
```typescript
export function uploadCommand(): Command {
  return new Command('upload')
    .description('Upload Obsidian vault to Mujarrad workspace')
    .argument('<path>', 'Path to Obsidian vault directory')
    .option('-w, --workspace <id>', 'Target workspace ID (required)')
    .option('--no-progress', 'Disable progress indicator')
    .option('--dry-run', 'Simulate upload without making changes')
    .option('--exclude <patterns...>', 'File patterns to exclude (e.g., "*.tmp" ".obsidian/cache")')
    .addHelpText('after', `
${chalk.bold('Examples:')}
  ${chalk.gray('$')} mujarrad upload ./my-vault --workspace abc-123
  ${chalk.gray('$')} mujarrad upload ./notes --workspace abc-123 --exclude "*.tmp" ".trash"
  ${chalk.gray('$')} mujarrad upload ./vault --dry-run

${chalk.bold('Notes:')}
  - Upload may take several minutes for large vaults
  - Progress indicator shows upload status (disable with --no-progress)
  - Use --dry-run to preview what will be uploaded
    `)
    .action(async (vaultPath: string, options) => {
      // Implementation
    });
}
```

### Subcommand Help Organization

**src/commands/templates.ts:**
```typescript
export function templatesCommand(): Command {
  const templates = new Command('templates')
    .description('Manage workspace templates')
    .addHelpText('after', `
${chalk.bold('Examples:')}
  ${chalk.gray('$')} mujarrad templates list
  ${chalk.gray('$')} mujarrad templates create "My Template"
  ${chalk.gray('$')} mujarrad templates apply tmpl-123 workspace-456

${chalk.bold('Template Use Cases:')}
  - Create reusable vault structures
  - Share organizational patterns with teams
  - Quickly bootstrap new workspaces
    `);

  templates
    .command('list')
    .description('List all available templates')
    .option('-f, --format <type>', 'Output format (table|json)', 'table')
    .action(async (options) => {
      // Implementation
    });

  templates
    .command('create')
    .description('Create a new template from a workspace')
    .argument('<name>', 'Template name')
    .option('-w, --workspace <id>', 'Source workspace ID')
    .option('-d, --description <text>', 'Template description')
    .action(async (name: string, options) => {
      // Implementation
    });

  templates
    .command('apply')
    .description('Apply template to a workspace')
    .argument('<template-id>', 'Template ID')
    .argument('<workspace-id>', 'Target workspace ID')
    .option('--overwrite', 'Overwrite existing files')
    .action(async (templateId: string, workspaceId: string, options) => {
      // Implementation
    });

  return templates;
}
```

### Help Discoverability Best Practices

1. **Show help when no command provided:**
```typescript
program.action(() => {
  program.help();
});
```

2. **Show command help when args missing:**
```typescript
.action(async (vaultPath: string | undefined, options) => {
  if (!vaultPath) {
    console.error(chalk.red('Error: Missing required argument <path>'));
    uploadCommand().help();
  }
  // ...
})
```

3. **Use consistent terminology:**
   - "workspace" not "workspace/project/space"
   - "vault" not "vault/folder/directory"

4. **Group related commands:**
   - Use command categories in help text
   - Consider using `.command()` with `.alias()` for common operations

5. **Include examples in every help output:**
   - Show common use cases
   - Include real-world scenarios

---

## 6. Testing Strategies

### Testing Pyramid for CLI Tools

```
        /\
       /  \
      / E2E \ (10%)
     /______\
    /        \
   /   Integ  \ (30%)
  /____________\
 /              \
/      Unit      \ (60%)
/__________________\
```

### Unit Testing

**Focus:** Test core logic in isolation (60% of tests)

**src/core/workspace/validator.test.ts:**
```typescript
import { describe, it, expect } from '@jest/globals';
import { WorkspaceValidator } from './validator';
import { ValidationError } from '../../utils/errors';

describe('WorkspaceValidator', () => {
  const validator = new WorkspaceValidator();

  describe('validateVaultPath', () => {
    it('should accept valid Obsidian vault path', () => {
      expect(() => {
        validator.validateVaultPath('/path/to/vault');
      }).not.toThrow();
    });

    it('should reject non-existent paths', () => {
      expect(() => {
        validator.validateVaultPath('/nonexistent/path');
      }).toThrow(ValidationError);
    });

    it('should reject paths without .obsidian folder', () => {
      expect(() => {
        validator.validateVaultPath('/path/without/obsidian');
      }).toThrow(ValidationError);
    });
  });

  describe('validateWorkspaceId', () => {
    it('should accept valid workspace ID format', () => {
      expect(() => {
        validator.validateWorkspaceId('ws-abc123def456');
      }).not.toThrow();
    });

    it('should reject invalid ID format', () => {
      expect(() => {
        validator.validateWorkspaceId('invalid-id');
      }).toThrow(ValidationError);
    });
  });
});
```

### Integration Testing

**Focus:** Test command execution with mocked API (30% of tests)

**tests/integration/upload.test.ts:**
```typescript
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { uploadCommand } from '../../src/commands/upload';
import { WorkspaceUploader } from '../../src/core/workspace/uploader';
import fs from 'fs/promises';

// Mock the API
jest.mock('../../src/api/generated');

describe('Upload Command Integration', () => {
  let mockUploader: jest.Mocked<WorkspaceUploader>;

  beforeEach(() => {
    mockUploader = {
      upload: jest.fn().mockResolvedValue({ success: true }),
    } as any;
  });

  it('should upload vault successfully', async () => {
    const command = uploadCommand();

    // Simulate command execution
    await command.parseAsync([
      'node',
      'cli',
      'upload',
      './fixtures/test-vault',
      '--workspace',
      'ws-test123'
    ]);

    expect(mockUploader.upload).toHaveBeenCalledWith(
      './fixtures/test-vault',
      expect.objectContaining({
        workspaceId: 'ws-test123'
      })
    );
  });

  it('should handle missing workspace ID', async () => {
    const command = uploadCommand();

    await expect(
      command.parseAsync(['node', 'cli', 'upload', './fixtures/test-vault'])
    ).rejects.toThrow('Missing required option: --workspace');
  });
});
```

### E2E Testing

**Focus:** Test actual CLI execution (10% of tests)

**tests/e2e/cli.test.ts:**
```typescript
import { describe, it, expect } from '@jest/globals';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);
const CLI_PATH = path.join(__dirname, '../../dist/index.js');

describe('CLI E2E Tests', () => {
  it('should display help when no command provided', async () => {
    const { stdout } = await execAsync(`node ${CLI_PATH}`);

    expect(stdout).toContain('Mujarrad CLI');
    expect(stdout).toContain('upload');
    expect(stdout).toContain('clone');
    expect(stdout).toContain('sync');
  });

  it('should display version with -v flag', async () => {
    const { stdout } = await execAsync(`node ${CLI_PATH} -v`);

    expect(stdout).toMatch(/\d+\.\d+\.\d+/);
  });

  it('should exit with code 2 for invalid command', async () => {
    try {
      await execAsync(`node ${CLI_PATH} invalid-command`);
      fail('Should have thrown error');
    } catch (error: any) {
      expect(error.code).toBe(2);
    }
  });

  it('should handle SIGINT gracefully', async () => {
    const child = exec(`node ${CLI_PATH} upload ./fixtures/large-vault`);

    setTimeout(() => {
      child.kill('SIGINT');
    }, 100);

    const { code } = await new Promise((resolve) => {
      child.on('exit', (code, signal) => {
        resolve({ code, signal });
      });
    });

    expect(code).toBe(130); // Standard SIGINT exit code
  });
});
```

### Testing Utilities

**tests/helpers/cli-runner.ts:**
```typescript
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);
const CLI_PATH = path.join(__dirname, '../../dist/index.js');

export interface CLIResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

/**
 * Execute CLI command and return result
 */
export async function runCLI(args: string[]): Promise<CLIResult> {
  const command = `node ${CLI_PATH} ${args.join(' ')}`;

  try {
    const { stdout, stderr } = await execAsync(command);
    return { stdout, stderr, exitCode: 0 };
  } catch (error: any) {
    return {
      stdout: error.stdout || '',
      stderr: error.stderr || '',
      exitCode: error.code || 1
    };
  }
}

/**
 * Execute CLI command with timeout
 */
export async function runCLIWithTimeout(
  args: string[],
  timeoutMs: number
): Promise<CLIResult> {
  const command = `node ${CLI_PATH} ${args.join(' ')}`;

  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Timeout')), timeoutMs);
  });

  return Promise.race([
    runCLI(args),
    timeout
  ]);
}
```

### Jest Configuration

**jest.config.js:**
```javascript
export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/api/generated/**',
    '!src/types/**'
  ],
  coverageThresholds: {
    global: {
      branches: 70,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1' // Handle .js imports in .ts files
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  testTimeout: 10000,
  globalTeardown: '<rootDir>/tests/teardown.ts'
};
```

### Test Setup and Teardown

**tests/setup.ts:**
```typescript
import { getLogsDir, getConfigDir } from '../src/utils/fs-utils';
import fs from 'fs/promises';

beforeAll(async () => {
  // Set test environment variables
  process.env.MUJARRAD_CONFIG_DIR = './test-config';
  process.env.MUJARRAD_LOG_LEVEL = 'silent';

  // Create test directories
  await fs.mkdir(getConfigDir(), { recursive: true });
  await fs.mkdir(getLogsDir(), { recursive: true });
});
```

**tests/teardown.ts:**
```typescript
import { getConfigDir } from '../src/utils/fs-utils';
import fs from 'fs/promises';

export default async function teardown() {
  // Clean up test directories
  try {
    await fs.rm(getConfigDir(), { recursive: true, force: true });
  } catch (error) {
    console.error('Cleanup error:', error);
  }
}
```

### Testing Best Practices

1. **Test command parsing separately from execution:**
   - Unit test argument validation
   - Mock command actions for faster tests

2. **Use fixtures for file-based tests:**
   - Create `tests/fixtures/` with sample vaults
   - Reset fixtures between tests

3. **Mock external dependencies:**
   - API calls
   - File system operations (when not testing FS specifically)
   - Network requests

4. **Test error scenarios:**
   - Invalid arguments
   - Network failures
   - Permission errors

5. **Don't test Commander.js internals:**
   - Focus on your command logic
   - Trust Commander.js to parse arguments correctly

---

## 7. Recommended Dependencies

### Production Dependencies

```json
{
  "dependencies": {
    "commander": "^12.0.0",         // CLI framework (latest v12)
    "ora": "^8.0.1",                // Spinners for indeterminate operations
    "cli-progress": "^3.12.0",      // Progress bars for determinate operations
    "chalk": "^5.3.0",              // Terminal colors (ESM only)
    "pino": "^8.19.0",              // High-performance logging
    "pino-pretty": "^11.0.0",       // Pretty logging for development
    "axios": "^1.6.7",              // HTTP client (already installed)
    "fs-extra": "^11.2.0",          // Enhanced file system operations
    "globby": "^14.0.1",            // File pattern matching
    "inquirer": "^9.2.15",          // Interactive prompts (if needed)
    "date-fns": "^3.3.1"            // Date utilities for logging
  }
}
```

### Development Dependencies

```json
{
  "devDependencies": {
    "@types/node": "^20.11.17",
    "@types/jest": "^29.5.12",
    "@types/fs-extra": "^11.0.4",
    "typescript": "^5.3.3",
    "tsx": "^4.7.1",                // TypeScript executor for dev
    "jest": "^29.7.0",
    "ts-jest": "^29.1.2",
    "eslint": "^8.56.0",
    "@typescript-eslint/parser": "^6.21.0",
    "@typescript-eslint/eslint-plugin": "^6.21.0",
    "prettier": "^3.2.5"
  }
}
```

### Rationale

**Commander.js v12:**
- Latest version with TypeScript support
- Improved help output customization
- Better error handling

**ora + cli-progress:**
- Complementary libraries for different use cases
- ora for spinners (indeterminate)
- cli-progress for bars (determinate)

**Pino over Winston:**
- 5-10x faster than Winston
- JSON-structured logging by default
- Lower CPU overhead for production
- Excellent for CLI tools with file logging

**chalk v5:**
- Most popular terminal styling library
- ESM-only (matches your package.json type: "module")
- Lightweight and reliable

**fs-extra:**
- Adds useful methods like `ensureDir`, `copy`, `move`
- Reduces boilerplate for common file operations
- Good cross-platform support

**globby:**
- Modern glob pattern matching
- Better API than traditional glob libraries
- Good for finding files to upload/sync

---

## 8. Implementation Roadmap

### Phase 1: Foundation (Week 1)

1. **Setup project structure:**
   - Create directories: commands/, core/, utils/, types/
   - Setup logger with Pino
   - Create fs-utils with cross-platform helpers

2. **Implement core utilities:**
   - Error classes (CLIError, ValidationError, etc.)
   - Progress indicator wrapper
   - Config management
   - Credentials handling

3. **Setup testing infrastructure:**
   - Configure Jest
   - Create test helpers
   - Add fixtures directory

### Phase 2: Authentication & Basic Commands (Week 2)

1. **Implement authentication:**
   - Login command
   - Logout command
   - Credentials storage with secure permissions
   - Session management

2. **Implement workspace listing:**
   - List workspaces command
   - Table output formatting
   - JSON output option

### Phase 3: Core Operations (Week 3-4)

1. **Implement upload command:**
   - File scanning and filtering
   - Progress bar for upload
   - Batch upload optimization
   - Error handling with retry

2. **Implement clone command:**
   - Workspace manifest retrieval
   - File download with progress
   - Local vault creation
   - Conflict detection

3. **Implement sync command:**
   - Two-way sync detection
   - Conflict resolution UI
   - Progress indication
   - Dry-run mode

### Phase 4: Advanced Features (Week 5-6)

1. **Implement templates:**
   - List templates
   - Create from workspace
   - Apply to workspace
   - Template validation

2. **Implement sharing:**
   - Share workspace with users
   - Permission management
   - Share link generation

3. **Implement history:**
   - List versions
   - Rollback to version
   - Diff between versions

### Phase 5: Polish & Release (Week 7)

1. **Comprehensive testing:**
   - Unit tests (80% coverage)
   - Integration tests
   - E2E tests
   - Manual testing on all platforms

2. **Documentation:**
   - README with examples
   - API documentation
   - Troubleshooting guide
   - Contributing guidelines

3. **Release preparation:**
   - CI/CD setup
   - NPM package publishing
   - Homebrew formula (macOS)
   - Chocolatey package (Windows)

---

## Appendix A: Logger Setup

**src/utils/logger.ts:**
```typescript
import pino from 'pino';
import { getLogsDir } from './fs-utils.js';
import path from 'path';
import fs from 'fs/promises';

const LOG_LEVEL = process.env.MUJARRAD_LOG_LEVEL || 'info';
const IS_DEVELOPMENT = process.env.NODE_ENV === 'development';

async function ensureLogDir() {
  const logsDir = getLogsDir();
  await fs.mkdir(logsDir, { recursive: true });
  return logsDir;
}

async function createLogger() {
  const logsDir = await ensureLogDir();
  const logFile = path.join(logsDir, `mujarrad-${new Date().toISOString().split('T')[0]}.log`);

  // File transport for all logs
  const fileTransport = pino.transport({
    target: 'pino/file',
    options: { destination: logFile }
  });

  // Pretty transport for development
  const prettyTransport = pino.transport({
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname'
    }
  });

  const transport = IS_DEVELOPMENT
    ? pino.multistream([
        { stream: fileTransport },
        { stream: prettyTransport }
      ])
    : fileTransport;

  return pino({
    level: LOG_LEVEL,
    timestamp: pino.stdTimeFunctions.isoTime
  }, transport);
}

export const logger = await createLogger();
```

---

## Appendix B: Complete Upload Command Example

**src/commands/upload.ts:**
```typescript
import { Command } from 'commander';
import { logger } from '../utils/logger.js';
import { createProgressBar, createSpinner } from '../utils/progress.js';
import { WorkspaceUploader } from '../core/workspace/uploader.js';
import { WorkspaceValidator } from '../core/workspace/validator.js';
import { CLIError, ValidationError, AuthenticationError } from '../utils/errors.js';
import { loadCredentials } from '../core/auth/credentials.js';
import chalk from 'chalk';
import fs from 'fs/promises';

export function uploadCommand(): Command {
  return new Command('upload')
    .description('Upload Obsidian vault to Mujarrad workspace')
    .argument('<path>', 'Path to Obsidian vault directory')
    .option('-w, --workspace <id>', 'Target workspace ID (required)')
    .option('--no-progress', 'Disable progress indicator')
    .option('--dry-run', 'Simulate upload without making changes')
    .option('--exclude <patterns...>', 'File patterns to exclude')
    .addHelpText('after', `
${chalk.bold('Examples:')}
  ${chalk.gray('$')} mujarrad upload ./my-vault --workspace abc-123
  ${chalk.gray('$')} mujarrad upload ./notes --workspace abc-123 --exclude "*.tmp" ".trash"
  ${chalk.gray('$')} mujarrad upload ./vault --dry-run
    `)
    .action(async (vaultPath: string, options) => {
      const startTime = Date.now();

      try {
        // 1. Validate authentication
        const credentials = await loadCredentials();
        if (!credentials) {
          throw new AuthenticationError(
            'Not authenticated',
            'Run "mujarrad login" to authenticate'
          );
        }

        // 2. Validate inputs
        if (!options.workspace) {
          throw new ValidationError(
            'Missing required option: --workspace <id>',
            'Specify the target workspace ID with --workspace'
          );
        }

        const validator = new WorkspaceValidator();

        const spinner = createSpinner({
          text: 'Validating vault...'
        });
        spinner.start();

        await validator.validateVaultPath(vaultPath);
        await validator.validateWorkspaceId(options.workspace);

        spinner.succeed('Vault validated');

        // 3. Scan files
        spinner.text = 'Scanning files...';
        spinner.start();

        const uploader = new WorkspaceUploader();
        const files = await uploader.scanFiles(vaultPath, {
          exclude: options.exclude || []
        });

        spinner.succeed(`Found ${files.length} files to upload`);

        // 4. Dry run
        if (options.dryRun) {
          console.log(chalk.cyan('\n📋 Dry run - files that would be uploaded:'));
          files.forEach(file => console.log(`  ${file.relativePath}`));
          console.log(chalk.yellow('\n⚠️  No changes made (dry run mode)'));
          return;
        }

        // 5. Upload with progress
        if (!options.progress) {
          // No progress - just upload
          await uploader.upload(vaultPath, {
            workspaceId: options.workspace,
            files
          });
        } else {
          // Show progress bar
          const progress = createProgressBar({
            total: files.length,
            format: `Uploading [${chalk.cyan('{bar}')}] {percentage}% | {value}/{total} files | ETA: {eta}s`
          });

          progress.start(files.length, 0);

          await uploader.upload(vaultPath, {
            workspaceId: options.workspace,
            files,
            onProgress: (current) => {
              progress.update(current);
            }
          });

          progress.stop();
        }

        // 6. Success
        const duration = ((Date.now() - startTime) / 1000).toFixed(1);
        logger.info('Upload completed', {
          workspace: options.workspace,
          fileCount: files.length,
          duration
        });

        console.log(chalk.green(`\n✅ Successfully uploaded ${files.length} files in ${duration}s`));
        console.log(chalk.cyan(`   View at: https://app.mujarrad.com/workspace/${options.workspace}`));

      } catch (error) {
        if (error instanceof CLIError) {
          logger.error(error.code, {
            message: error.message,
            workspace: options.workspace
          });

          console.error(chalk.red(`\n❌ ${error.message}`));

          if (error.remediation) {
            console.error(chalk.yellow(`💡 ${error.remediation}`));
          }

          process.exitCode = error.exitCode;
        } else if (error instanceof Error) {
          logger.error('UPLOAD_ERROR', {
            error: error.message,
            stack: error.stack
          });

          console.error(chalk.red('\n❌ Upload failed'));
          console.error(chalk.yellow('💡 Check logs at ~/.mujarrad/logs/ for details'));

          process.exitCode = 1;
        } else {
          logger.error('UNKNOWN_ERROR', { error: String(error) });
          console.error(chalk.red('\n❌ An unexpected error occurred'));
          process.exitCode = 1;
        }
      }
    });
}
```

---

## Summary & Key Decisions

### 1. **Project Structure**
- ✅ Separate commands into individual files under `commands/`
- ✅ Business logic in `core/`, utilities in `utils/`
- ✅ Type definitions in `types/`

### 2. **Progress Indicators**
- ✅ Use **ora** for spinners (indeterminate operations)
- ✅ Use **cli-progress** for progress bars (determinate operations)
- ✅ Always show progress for operations > 5 seconds

### 3. **Cross-Platform Permissions**
- ✅ Use `fs.chmod(0o600)` on Unix
- ✅ Use `icacls` via child_process on Windows
- ✅ Warn users but don't fail on Windows permission errors

### 4. **Error Handling**
- ✅ Custom error classes with exit codes
- ✅ User-friendly messages with remediation steps
- ✅ Use `process.exitCode` instead of `process.exit()`
- ✅ Log detailed errors, show simple messages

### 5. **Help Output**
- ✅ Customize with `addHelpText()` and examples
- ✅ Group commands by category
- ✅ Include documentation links

### 6. **Testing**
- ✅ 60% unit tests (core logic)
- ✅ 30% integration tests (command execution)
- ✅ 10% E2E tests (actual CLI execution)
- ✅ Use Jest with ts-jest

### 7. **Logging**
- ✅ Use **Pino** for performance
- ✅ Log to `~/.mujarrad/logs/`
- ✅ Structured JSON logging

---

## Next Steps

1. **Install recommended dependencies:**
   ```bash
   npm install commander ora cli-progress pino pino-pretty fs-extra globby
   npm install -D @types/fs-extra
   ```

2. **Create project structure:**
   ```bash
   mkdir -p src/{commands,core/{auth,sync,workspace},utils,types}
   ```

3. **Implement foundation:**
   - Logger setup
   - Error classes
   - Progress indicator wrapper
   - File system utilities

4. **Start with authentication:**
   - Login command
   - Credentials storage
   - Session management

5. **Gradually implement commands** following the roadmap

---

**Document Version:** 1.0
**Last Updated:** 2025-10-10
**Researched By:** Claude Code
**Target CLI:** Mujarrad CLI v1.0
