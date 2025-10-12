# Implementation Tasks: CLI Observability, Documentation & Alpha Release Management

**Feature**: 008-from-cli-side
**Branch**: `008-from-cli-side`
**Date**: 2025-10-12
**Status**: Ready for Implementation

## Overview

This document provides a dependency-ordered task breakdown for implementing CLI observability features. Tasks are organized by user story to enable independent implementation and testing of each feature increment.

**Development Approach**: Test-Driven Development (TDD) per Constitution Principle III
- Write failing tests first
- Implement minimal code to pass
- Refactor
- Commit

**Total Tasks**: 65
**Estimated Duration**: 4 weeks (working in parallel across user stories)

---

## Phase 1: Setup & Dependencies (Week 1, Days 1-2)

### T001 - Install New Dependencies [P]
**Story**: Setup
**File**: `package.json`
**Description**: Add new npm dependencies required for this feature
**Dependencies**: None
**Estimated Time**: 15 minutes

**Dependencies to add**:
```json
{
  "dependencies": {
    "fast-redact": "^3.5.0",
    "archiver": "^7.0.1",
    "winston-daily-rotate-file": "^7.0.0"
  },
  "devDependencies": {
    "@types/archiver": "^6.0.2",
    "ci-info": "^4.1.0",
    "nock": "^13.5.0",
    "@types/nock": "^11.1.0"
  }
}
```

**Acceptance**: `npm install` completes without errors, all dependencies in package-lock.json

---

### T002 - Update TypeScript Config Types [P]
**Story**: Setup
**File**: `src/config/types.ts`
**Description**: Add DisclaimerAcknowledgment interface to Config type
**Dependencies**: None
**Estimated Time**: 10 minutes

**Changes**:
```typescript
export interface DisclaimerAcknowledgment {
  acknowledgedVersion: string;
  acknowledgedAt: string;
  versionLevel: 'alpha' | 'beta' | 'stable';
}

export interface Config {
  // ... existing fields
  disclaimerAcknowledgment?: DisclaimerAcknowledgment;
}
```

**Acceptance**: TypeScript compiles without errors, Config type includes new field

---

### T003 - Configure Jest for Integration Tests [P]
**Story**: Setup
**File**: `jest.config.cjs`
**Description**: Update Jest configuration to support unit, integration, and performance test separation
**Dependencies**: None
**Estimated Time**: 20 minutes

**Changes**:
```javascript
module.exports = {
  projects: [
    {
      displayName: 'unit',
      testMatch: ['**/tests/unit/**/*.test.ts'],
      setupFilesAfterEnv: ['<rootDir>/tests/setup/unit-setup.ts'],
    },
    {
      displayName: 'integration',
      testMatch: ['**/tests/integration/**/*.test.ts'],
      setupFilesAfterEnv: ['<rootDir>/tests/setup/integration-setup.ts'],
    },
    {
      displayName: 'performance',
      testMatch: ['**/tests/performance/**/*.test.ts'],
    }
  ]
};
```

**Acceptance**: `npm test` runs only unit tests, `npm run test:integration` runs integration tests

---

## Phase 2: Foundational Infrastructure (Week 1, Days 2-3)

**Note**: These tasks MUST complete before user story implementation can begin

### T004 - Create SessionManager Utility
**Story**: Foundational [Blocks US1]
**File**: `src/utils/SessionManager.ts`
**Description**: Implement session ID generation and management using crypto.randomUUID()
**Dependencies**: T002
**Estimated Time**: 45 minutes

**Implementation**:
```typescript
import { randomUUID } from 'crypto';

export class SessionManager {
  static generateSessionId(): string {
    return randomUUID(); // UUID v4 format
  }

  static createSessionMetadata(commandName: string): SessionMetadata {
    return {
      sessionId: this.generateSessionId(),
      commandName,
      startTime: new Date().toISOString(),
      cliVersion: getVersion(),
      nodeVersion: process.version,
      platform: process.platform,
      workingDirectory: process.cwd(),
      environment: detectEnvironment()
    };
  }
}
```

**Tests**: `tests/unit/utils/SessionManager.test.ts`
- ✓ generateSessionId returns valid UUID v4
- ✓ UUID format matches pattern
- ✓ Each call generates unique ID
- ✓ createSessionMetadata includes all required fields

**Acceptance**: All tests pass, session IDs are valid UUIDs

---

### T005 - Enhance Logger with Session Tracking
**Story**: Foundational [Blocks US1]
**File**: `src/utils/Logger.ts`
**Description**: Replace winston File transport with winston-daily-rotate-file, add session support
**Dependencies**: T001, T004
**Estimated Time**: 1 hour

**Implementation**:
```typescript
import DailyRotateFile from 'winston-daily-rotate-file';

// Replace native File transport with:
const transport = new DailyRotateFile({
  filename: path.join(this.logDir, `mujarrad-${process.pid}-%DATE%.log`),
  datePattern: 'YYYY-MM-DD-HH',
  maxSize: '10m',
  maxFiles: '7d',
  zippedArchive: false,
  auditFile: path.join(this.logDir, `.audit-${process.pid}.json`)
});

// Enhance child logger to include sessionId
export function createSessionLogger(sessionId: string): Logger {
  return logger.child({ sessionId });
}
```

**Tests**: `tests/unit/utils/Logger.test.ts`
- ✓ Creates log files with process ID in filename
- ✓ Rotates logs daily
- ✓ Child logger includes sessionId in all entries
- ✓ Log file permissions are 700
- ✓ Async logging doesn't block operations

**Acceptance**: Logs written to `~/.mujarrad/logs/mujarrad-{pid}-YYYY-MM-DD.log`, session ID appears in all entries

---

### T006 - Implement Sensitive Data Redaction
**Story**: Foundational [Blocks US1]
**File**: `src/utils/Logger.ts` (redaction format)
**Description**: Add fast-redact and regex-based redaction to winston format chain
**Dependencies**: T001, T005
**Estimated Time**: 1.5 hours

**Implementation**:
```typescript
import fastRedact from 'fast-redact';

const SENSITIVE_PATHS = [
  'headers.authorization',
  'headers.cookie',
  'body.password',
  'body.apiKey',
  // ... all paths from research.md
];

const redactObject = fastRedact({ paths: SENSITIVE_PATHS, censor: '[REDACTED]' });

const SENSITIVE_PATTERNS = [
  { pattern: /eyJ[A-Za-z0-9-_]+\.eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_.+/]*/g, name: 'JWT' },
  { pattern: /bearer\s+[a-zA-Z0-9\-._~+/]+=*/gi, name: 'Bearer Token' },
  // ... all patterns from research.md
];

const redactionFormat = winston.format((info) => {
  const cloned = JSON.parse(JSON.stringify(info));
  redactObject(cloned);
  // Apply regex patterns...
  return cloned;
})();

// Add FIRST in format chain
format: winston.format.combine(
  redactionFormat,
  winston.format.timestamp(),
  winston.format.json()
)
```

**Tests**: `tests/unit/utils/Logger.test.ts` (redaction tests)
- ✓ JWT tokens are redacted
- ✓ Bearer tokens are redacted
- ✓ API keys are redacted
- ✓ Passwords are redacted
- ✓ Headers.authorization is redacted
- ✓ Non-sensitive data is preserved
- ✓ Performance overhead <15%

**Acceptance**: Sensitive data automatically redacted in all logs, no credentials visible

---

### T007 - Create Test Setup Files
**Story**: Foundational [Blocks US8]
**Files**: `tests/setup/unit-setup.ts`, `tests/setup/integration-setup.ts`
**Description**: Create Jest setup files for unit and integration test environments
**Dependencies**: T003
**Estimated Time**: 30 minutes

**unit-setup.ts**:
```typescript
import nock from 'nock';

beforeAll(() => {
  nock.disableNetConnect();
  nock.enableNetConnect('127.0.0.1');
});

afterAll(() => {
  nock.enableNetConnect();
});

afterEach(() => {
  nock.cleanAll();
});
```

**integration-setup.ts**:
```typescript
beforeAll(async () => {
  const apiUrl = process.env.MUJARRAD_API_BASE_URL;
  if (!apiUrl || !apiUrl.includes('staging')) {
    throw new Error('Integration tests must run against staging API');
  }
});
```

**Acceptance**: Unit tests use Nock, integration tests verify staging API

---

## Phase 3: User Story 1 - Debug Failed Operations [P1] (Week 1, Days 3-4)

**Goal**: Enable developers to debug CLI errors using detailed session logs
**Independent Test**: Run upload with invalid credentials, verify detailed logs created with session ID

### T008 - [US1] Test: Session-Based Logging
**Story**: US1
**File**: `tests/unit/utils/Logger.test.ts`
**Description**: Write tests for session-based logging functionality
**Dependencies**: T004, T005
**Estimated Time**: 30 minutes
**TDD**: Test BEFORE implementation

**Test Cases**:
- ✓ Each CLI command creates unique session ID
- ✓ All log entries include sessionId field
- ✓ Session logs include command name, start/end time, exit code
- ✓ Multiple concurrent sessions write to separate log files

---

### T009 - [US1] Enhance index.ts with Session Init
**Story**: US1
**File**: `src/index.ts`
**Description**: Initialize session tracking in main CLI entry point
**Dependencies**: T008 (test must pass)
**Estimated Time**: 30 minutes

**Implementation**:
```typescript
import { SessionManager } from './utils/SessionManager.js';
import { Logger } from './utils/Logger.js';

async function main() {
  const commandName = process.argv[2] || 'unknown';
  const session = SessionManager.createSessionMetadata(commandName);
  const logger = new Logger();
  const sessionLogger = logger.child({ sessionId: session.sessionId });

  sessionLogger.info('CLI command started', { command: commandName });

  try {
    // ... existing CLI logic
    sessionLogger.info('CLI command completed', { exitCode: 0 });
    process.exit(0);
  } catch (error) {
    sessionLogger.error('CLI command failed', { error, exitCode: 1 });
    process.exit(1);
  }
}
```

**Acceptance**: Every CLI command execution creates a session, logs include sessionId

---

### T010 - [US1] Test: Enhanced Service Logging
**Story**: US1
**Files**: `tests/unit/services/*.test.ts`
**Description**: Write tests for enhanced logging in all service classes
**Dependencies**: T009
**Estimated Time**: 45 minutes
**TDD**: Test BEFORE implementation

**Test Cases** (for each service):
- ✓ API requests logged with method, URL, headers (redacted)
- ✓ API responses logged with status, duration
- ✓ Errors logged with stack trace
- ✓ File operations logged with file path

---

### T011 - [US1] Enhance AuthService Logging [P]
**Story**: US1
**File**: `src/services/AuthService.ts`
**Description**: Add detailed logging to authentication service
**Dependencies**: T010 (test must pass)
**Estimated Time**: 20 minutes

**Implementation**: Add logger.debug() calls for API requests/responses

---

### T012 - [US1] Enhance UploadService Logging [P]
**Story**: US1
**File**: `src/services/UploadService.ts`
**Description**: Add detailed logging to upload service
**Dependencies**: T010 (test must pass)
**Estimated Time**: 20 minutes

---

### T013 - [US1] Enhance CloneService Logging [P]
**Story**: US1
**File**: `src/services/CloneService.ts`
**Description**: Add detailed logging to clone service
**Dependencies**: T010 (test must pass)
**Estimated Time**: 20 minutes

---

### T014 - [US1] Enhance SyncService Logging [P]
**Story**: US1
**File**: `src/services/SyncService.ts`
**Description**: Add detailed logging to sync service
**Dependencies**: T010 (test must pass)
**Estimated Time**: 20 minutes

---

### T015 - [US1] Enhance TemplateService Logging [P]
**Story**: US1
**File**: `src/services/TemplateService.ts`
**Description**: Add detailed logging to template service
**Dependencies**: T010 (test must pass)
**Estimated Time**: 20 minutes

---

### T016 - [US1] Integration Test: Debug Failed Upload
**Story**: US1
**File**: `tests/integration/commands/debug-failed-upload.integration.test.ts`
**Description**: End-to-end test of debug workflow with real API failure
**Dependencies**: T011-T015
**Estimated Time**: 30 minutes

**Test**:
- Given invalid credentials
- When upload command fails
- Then log file contains session ID, API request/response, error stack trace
- And developer can identify failure cause from logs alone

**Acceptance**: US1 complete - developers can debug 90% of errors using logs (SC-001)

---

**CHECKPOINT**: User Story 1 Complete ✅
- Session-based logging implemented
- All services log API requests/responses
- Sensitive data automatically redacted
- Logs stored in ~/.mujarrad/logs/ with rotation

---

## Phase 4: User Story 2 - CLI Installation Progress [P1] (Week 1, Day 4)

**Goal**: Display Mujarrad logo and progress during npm installation
**Independent Test**: Run `npm install -g mujarrad-cli` and verify logo appears

### T017 - [US2] Test: Postinstall Script
**Story**: US2
**File**: `tests/unit/scripts/postinstall.test.ts`
**Description**: Write tests for postinstall script behavior
**Dependencies**: T007
**Estimated Time**: 30 minutes
**TDD**: Test BEFORE implementation

**Test Cases**:
- ✓ Logo displays in TTY environments
- ✓ No output in non-TTY (CI/CD)
- ✓ Graceful failure doesn't block installation
- ✓ Success message includes version number

---

### T018 - [US2] Create Postinstall Script
**Story**: US2
**File**: `scripts/postinstall.js`
**Description**: Implement npm postinstall script with logo and welcome message
**Dependencies**: T017 (test must pass)
**Estimated Time**: 45 minutes

**Implementation**:
```javascript
// scripts/postinstall.js
try {
  if (process.stdout.isTTY) {
    const chalk = require('chalk');
    const { displayBanner } = require('../dist/utils/logo.js');

    console.log('\n');
    displayBanner(); // Existing logo function
    console.log(chalk.cyan.bold('🎉 Mujarrad CLI installed successfully!\n'));
    console.log('Get started: ' + chalk.green('mujarrad --help'));
    console.log('Documentation: ' + chalk.blue('https://www.mujarrad.com\n'));
  }
} catch (error) {
  // Silent failure - don't block installation
}
```

**Acceptance**: Logo displays during install, no errors, <5 seconds (NFR-003)

---

### T019 - [US2] Update package.json Scripts
**Story**: US2
**File**: `package.json`
**Description**: Add postinstall script to package.json
**Dependencies**: T018
**Estimated Time**: 5 minutes

**Changes**:
```json
{
  "scripts": {
    "postinstall": "node scripts/postinstall.js || exit 0"
  }
}
```

---

### T020 - [US2] Integration Test: Install Experience
**Story**: US2
**File**: `tests/integration/npm-install.integration.test.ts`
**Description**: Test actual npm pack + install workflow
**Dependencies**: T019
**Estimated Time**: 30 minutes

**Test**:
- npm pack
- npm install -g ./mujarrad-cli-*.tgz
- Verify logo displayed
- npm uninstall -g mujarrad-cli

**Acceptance**: US2 complete - Installation displays branding (SC-005)

---

**CHECKPOINT**: User Story 2 Complete ✅
- Postinstall script displays logo
- Works across npm, yarn, pnpm
- Gracefully handles failures

---

## Phase 5: User Story 6 - Alpha Version Status [P1] (Week 1, Day 5)

**Goal**: Display alpha disclaimer on first run, track acknowledgment
**Independent Test**: First run shows disclaimer, subsequent runs don't

### T021 - [US6] Test: AlphaDisclaimer Utility
**Story**: US6
**File**: `tests/unit/utils/AlphaDisclaimer.test.ts`
**Description**: Write tests for disclaimer management logic
**Dependencies**: T002
**Estimated Time**: 45 minutes
**TDD**: Test BEFORE implementation

**Test Cases**:
- ✓ First run triggers disclaimer prompt
- ✓ shouldShowDisclaimer returns true on first run
- ✓ shouldShowDisclaimer returns false after acknowledgment
- ✓ Version level change (alpha → beta) triggers disclaimer again
- ✓ Patch update (alpha.1 → alpha.2) doesn't trigger
- ✓ --accept-disclaimer flag bypasses prompt
- ✓ MUJARRAD_ACCEPT_DISCLAIMER env var bypasses prompt

---

### T022 - [US6] Create AlphaDisclaimer Utility
**Story**: US6
**File**: `src/utils/AlphaDisclaimer.ts`
**Description**: Implement disclaimer detection and prompt logic
**Dependencies**: T021 (test must pass)
**Estimated Time**: 1 hour

**Implementation**:
```typescript
import inquirer from 'inquirer';
import { ConfigManager } from '../config/ConfigManager.js';

export class AlphaDisclaimer {
  static async shouldShow(version: string, config: Config): Promise<boolean> {
    if (!config.disclaimerAcknowledgment) return true;

    const currentLevel = this.parseVersionLevel(version);
    const acknowledgedLevel = config.disclaimerAcknowledgment.versionLevel;

    return currentLevel !== acknowledgedLevel;
  }

  static async prompt(version: string): Promise<boolean> {
    console.log(chalk.yellow('\n⚠️  ALPHA SOFTWARE WARNING ⚠️\n'));
    console.log('Mujarrad CLI is currently in alpha development.');
    console.log('- Features may change without notice');
    console.log('- Breaking changes may occur between versions\n');

    const { confirm } = await inquirer.prompt([{
      type: 'confirm',
      name: 'confirm',
      message: 'Do you accept these terms?',
      default: false
    }]);

    return confirm;
  }

  static async recordAcknowledgment(version: string): Promise<void> {
    const configManager = new ConfigManager();
    const config = await configManager.load();

    config.disclaimerAcknowledgment = {
      acknowledgedVersion: version,
      acknowledgedAt: new Date().toISOString(),
      versionLevel: this.parseVersionLevel(version)
    };

    await configManager.save(config);
  }
}
```

**Acceptance**: Disclaimer prompt works, acknowledgment persisted to config

---

### T023 - [US6] Integrate Disclaimer into index.ts
**Story**: US6
**File**: `src/index.ts`
**Description**: Add disclaimer check before executing commands
**Dependencies**: T022
**Estimated Time**: 30 minutes

**Implementation**:
```typescript
async function main() {
  await migrateConfig();

  // Check disclaimer before showing banner
  if (await AlphaDisclaimer.shouldShow(getVersion(), config)) {
    if (!hasAcceptFlag()) {
      const accepted = await AlphaDisclaimer.prompt(getVersion());
      if (!accepted) {
        console.log(chalk.red('Disclaimer not accepted. Exiting.'));
        process.exit(7); // User cancelled
      }
      await AlphaDisclaimer.recordAcknowledgment(getVersion());
    }
  }

  displayBanner();
  // ... rest of CLI
}
```

---

### T024 - [US6] Test: Enhanced Version Command
**Story**: US6
**File**: `tests/unit/commands/version.test.ts`
**Description**: Test version command with alpha warnings
**Dependencies**: T023
**Estimated Time**: 20 minutes
**TDD**: Test BEFORE implementation

---

### T025 - [US6] Enhance Version Command
**Story**: US6
**File**: `src/utils/version.ts`
**Description**: Add alpha warning to version output
**Dependencies**: T024 (test must pass)
**Estimated Time**: 20 minutes

**Output**:
```
mujarrad CLI v1.0.0-alpha.1

⚠️  ALPHA SOFTWARE ⚠️
This is pre-release software. Use at your own risk.
Report issues: https://github.com/mujarrad/mujarrad-cli/issues

Node.js v18.19.0
Platform: darwin (macOS)
```

---

### T026 - [US6] Integration Test: Disclaimer Workflow
**Story**: US6
**File**: `tests/integration/disclaimer.integration.test.ts`
**Description**: End-to-end disclaimer acceptance test
**Dependencies**: T025
**Estimated Time**: 30 minutes

**Test**:
- Clean config directory
- Run command, verify prompt appears
- Simulate acceptance
- Verify config saved
- Run command again, verify no prompt

**Acceptance**: US6 complete - 100% of users see disclaimer (SC-003)

---

**CHECKPOINT**: User Story 6 Complete ✅
- Alpha disclaimer prompts on first run
- Acknowledgment persisted
- Version command shows warnings

---

## Phase 6: User Story 3 - Learn CLI Commands [P1] (Week 2, Days 1-2)

**Goal**: Comprehensive help documentation for all commands
**Independent Test**: `mujarrad --help` and `mujarrad <command> --help` show examples

### T027 - [US3] Test: Enhanced Help System
**Story**: US3
**File**: `tests/unit/commands/help.test.ts`
**Description**: Write tests for comprehensive help output
**Dependencies**: T007
**Estimated Time**: 45 minutes
**TDD**: Test BEFORE implementation

**Test Cases**:
- ✓ `mujarrad --help` lists all commands
- ✓ Each command has description
- ✓ Each command has at least 2 examples (FR-031)
- ✓ Help includes troubleshooting section
- ✓ Help includes links to documentation
- ✓ Invalid command shows "Did you mean?" suggestion

---

### T028 - [US3] Enhance Global Help [P]
**Story**: US3
**File**: `src/index.ts` (Commander.js configuration)
**Description**: Add comprehensive global help with examples and troubleshooting
**Dependencies**: T027 (test must pass)
**Estimated Time**: 1 hour

**Implementation**: Update program.description() and add examples using Commander.js API

---

### T029 - [US3] Enhance Auth Command Help [P]
**Story**: US3
**File**: `src/commands/auth.ts`
**Description**: Add detailed help and examples to auth command
**Dependencies**: T027 (test must pass)
**Estimated Time**: 30 minutes

---

### T030 - [US3] Enhance Upload Command Help [P]
**Story**: US3
**File**: `src/commands/upload.ts`
**Description**: Add detailed help and examples to init/upload command
**Dependencies**: T027 (test must pass)
**Estimated Time**: 30 minutes

---

### T031 - [US3] Enhance Clone Command Help [P]
**Story**: US3
**File**: `src/commands/clone.ts`
**Description**: Add detailed help and examples to clone command
**Dependencies**: T027 (test must pass)
**Estimated Time**: 30 minutes

---

### T032 - [US3] Enhance Sync Command Help [P]
**Story**: US3
**File**: `src/commands/sync.ts`
**Description**: Add detailed help and examples to sync command
**Dependencies**: T027 (test must pass)
**Estimated Time**: 30 minutes

---

### T033 - [US3] Enhance Template Command Help [P]
**Story**: US3
**File**: `src/commands/template.ts`
**Description**: Add detailed help and examples to template command
**Dependencies**: T027 (test must pass)
**Estimated Time**: 30 minutes

---

### T034 - [US3] Integration Test: Help Workflow
**Story**: US3
**File**: `tests/integration/help.integration.test.ts`
**Description**: Verify help output includes all required elements
**Dependencies**: T028-T033
**Estimated Time**: 30 minutes

**Test**: Parse help output, verify all commands have >= 2 examples

**Acceptance**: US3 complete - New users complete first command in 5 min (SC-002)

---

**CHECKPOINT**: User Story 3 Complete ✅
- All commands have comprehensive help
- At least 2 examples per command
- Troubleshooting guidance included

---

## Phase 7: User Story 4 - Monitor Real-Time Progress [P2] (Week 2, Days 2-3)

**Goal**: Progress bars with ETA for long-running operations
**Independent Test**: Upload 100+ files, verify progress updates

### T035 - [US4] Test: ProgressBar with ETA
**Story**: US4
**File**: `tests/unit/utils/ProgressBar.test.ts`
**Description**: Write tests for enhanced progress bar functionality
**Dependencies**: T007
**Estimated Time**: 45 minutes
**TDD**: Test BEFORE implementation

**Test Cases**:
- ✓ Progress bar shows percentage
- ✓ ETA calculated after 30 seconds
- ✓ Current file name displayed
- ✓ Non-TTY fallback: periodic text updates
- ✓ CI env detected, structured JSON output
- ✓ --no-progress flag disables output

---

### T036 - [US4] Enhance ProgressBar Utility
**Story**: US4
**File**: `src/utils/ProgressBar.ts`
**Description**: Add ETA calculation and TTY detection
**Dependencies**: T001, T035 (test must pass)
**Estimated Time**: 1.5 hours

**Implementation**:
```typescript
import ciInfo from 'ci-info';

export class ProgressManager {
  private startTime: number;
  private isInteractive: boolean;
  private isCI: boolean;

  constructor() {
    this.isCI = ciInfo.isCI;
    this.isInteractive = Boolean(process.stdout.isTTY) && !this.isCI;
  }

  createProgressBar(total: number) {
    if (this.isInteractive) {
      return new cliProgress.SingleBar({});
    } else {
      return {
        update: (current) => {
          // Periodic logging every 10s
        }
      };
    }
  }

  calculateETA(current: number, total: number): string {
    const elapsed = Date.now() - this.startTime;
    const rate = current / elapsed;
    const remaining = (total - current) / rate;
    return formatDuration(remaining);
  }
}
```

**Acceptance**: Progress shows ETA after 30s, works in TTY and CI

---

### T037 - [US4] Integrate Progress into UploadService [P]
**Story**: US4
**File**: `src/services/UploadService.ts`
**Description**: Add progress tracking to file upload operations
**Dependencies**: T036
**Estimated Time**: 30 minutes

---

### T038 - [US4] Integrate Progress into CloneService [P]
**Story**: US4
**File**: `src/services/CloneService.ts`
**Description**: Add progress tracking to file clone operations
**Dependencies**: T036
**Estimated Time**: 30 minutes

---

### T039 - [US4] Integrate Progress into SyncService [P]
**Story**: US4
**File**: `src/services/SyncService.ts`
**Description**: Add progress tracking to sync operations
**Dependencies**: T036
**Estimated Time**: 30 minutes

---

### T040 - [US4] Integration Test: Progress Workflow
**Story**: US4
**File**: `tests/integration/progress.integration.test.ts`
**Description**: Verify progress tracking with large vault
**Dependencies**: T037-T039
**Estimated Time**: 30 minutes

**Test**: Upload 100 files, verify progress updates at least 1Hz (FR-026)

**Acceptance**: US4 complete - Progress updates 1Hz minimum (SC-006)

---

**CHECKPOINT**: User Story 4 Complete ✅
- Progress bars show percentage
- ETA displayed after 30 seconds
- Graceful degradation in CI/CD

---

## Phase 8: User Story 5 - Export Operation History [P2] (Week 2, Days 3-4)

**Goal**: Export logs as compressed archives for debugging
**Independent Test**: `mujarrad logs export` creates ZIP with logs

### T041 - [US5] Test: LogExportService
**Story**: US5
**File**: `tests/unit/services/LogExportService.test.ts`
**Description**: Write tests for log export functionality
**Dependencies**: T007
**Estimated Time**: 1 hour
**TDD**: Test BEFORE implementation

**Test Cases**:
- ✓ Creates ZIP archive with logs
- ✓ Includes metadata.json with export info
- ✓ Includes README.txt with instructions
- ✓ Filters by --since parameter
- ✓ Filters by --level parameter
- ✓ Compression ratio >= 70% (NFR-004)
- ✓ Export completes in <10s for 7 days logs (SC-008)

---

### T042 - [US5] Create LogExportService
**Story**: US5
**File**: `src/services/LogExportService.ts`
**Description**: Implement log compression and export functionality
**Dependencies**: T001, T041 (test must pass)
**Estimated Time**: 2 hours

**Implementation**:
```typescript
import archiver from 'archiver';

export class LogExportService {
  async exportLogs(options: ExportOptions): Promise<LogExport> {
    const logFiles = await this.findLogFiles(options.since, options.level);
    const outputPath = options.output || this.generateOutputPath();

    const output = fs.createWriteStream(outputPath);
    const archive = archiver('zip', { zlib: { level: 6 } });

    archive.pipe(output);

    // Add metadata
    archive.append(JSON.stringify(metadata), { name: 'export-metadata.json' });

    // Add README
    archive.append(readme, { name: 'README.txt' });

    // Add log files
    for (const logFile of logFiles) {
      archive.file(logFile, { name: `logs/${path.basename(logFile)}` });
    }

    await archive.finalize();

    return {
      exportedAt: new Date().toISOString(),
      archivePath: outputPath,
      compressionRatio: this.calculateRatio(uncompressed, compressed),
      // ... other metadata
    };
  }
}
```

**Acceptance**: Service creates valid ZIP archives with >70% compression

---

### T043 - [US5] Test: Logs Command
**Story**: US5
**File**: `tests/unit/commands/logs.test.ts`
**Description**: Write tests for logs CLI command
**Dependencies**: T042
**Estimated Time**: 30 minutes
**TDD**: Test BEFORE implementation

---

### T044 - [US5] Create Logs Command
**Story**: US5
**File**: `src/commands/logs.ts`
**Description**: Implement `mujarrad logs export` CLI command
**Dependencies**: T042, T043 (test must pass)
**Estimated Time**: 45 minutes

**Implementation**:
```typescript
export function logsCommand(program: Command) {
  program
    .command('logs')
    .description('Log management commands')
    .addCommand(
      program
        .command('export')
        .description('Export logs as compressed archive')
        .option('--since <range>', 'Time range filter (e.g., "24h", "7d")', '7d')
        .option('--level <level>', 'Minimum log level', 'info')
        .option('--output <path>', 'Output path')
        .option('--no-redact-sensitive', 'Include unredacted data (CAUTION)')
        .action(async (options) => {
          const service = new LogExportService();
          const result = await service.exportLogs(options);
          console.log(`✓ Logs exported: ${result.archivePath}`);
          console.log(`  Size: ${formatBytes(result.compressedSize)} (${result.compressionRatio * 100}% compression)`);
        })
    );
}
```

---

### T045 - [US5] Integration Test: Log Export Workflow
**Story**: US5
**File**: `tests/integration/logs-export.integration.test.ts`
**Description**: End-to-end log export test
**Dependencies**: T044
**Estimated Time**: 30 minutes

**Test**:
- Run several CLI commands to generate logs
- Export logs with various filters
- Verify archive structure matches spec
- Extract and verify contents

**Acceptance**: US5 complete - Logs exported in <10s (SC-008)

---

**CHECKPOINT**: User Story 5 Complete ✅
- Log export command implemented
- ZIP format with >70% compression
- Metadata and README included

---

## Phase 9: User Story 7 - Initialize and Upload Vault [P1] (Week 3, Days 1-2)

**Goal**: Enhanced init command with progress tracking
**Independent Test**: `mujarrad init ./vault --workspace test` shows progress

### T046 - [US7] Test: Enhanced Upload Command
**Story**: US7
**File**: `tests/unit/commands/upload.test.ts`
**Description**: Write tests for init command functionality
**Dependencies**: T036
**Estimated Time**: 45 minutes
**TDD**: Test BEFORE implementation

**Test Cases**:
- ✓ Validates vault structure before upload
- ✓ Shows initialization progress
- ✓ Shows upload progress
- ✓ Combined statistics at end
- ✓ Graceful failure if validation fails
- ✓ All operations logged

---

### T047 - [US7] Enhance Upload Command for Init
**Story**: US7
**File**: `src/commands/upload.ts`
**Description**: Add vault initialization and validation to upload command
**Dependencies**: T036, T046 (test must pass)
**Estimated Time**: 1 hour

**Implementation**:
```typescript
async function initCommand(vaultPath: string, workspace: string) {
  const logger = getSessionLogger();
  const progress = new ProgressManager();

  // Phase 1: Initialize
  logger.info('Initializing vault', { vaultPath });
  const spinner = progress.createSpinner('Initializing vault...');
  spinner.start();

  const files = await scanVault(vaultPath);
  const validation = await validateVault(files);

  if (!validation.valid) {
    spinner.fail('Validation failed');
    console.error(validation.errors);
    process.exit(3);
  }

  spinner.succeed(`Found ${files.length} files`);

  // Phase 2: Upload
  logger.info('Starting upload', { fileCount: files.length });
  const uploadProgress = progress.createProgressBar(files.length);

  await uploadFiles(files, uploadProgress);

  // Summary
  console.log(`✓ Upload complete`);
  console.log(`  Files: ${files.length}`);
  console.log(`  Time: ${duration}s`);
}
```

---

### T048 - [US7] Integration Test: Init Workflow
**Story**: US7
**File**: `tests/integration/init.integration.test.ts`
**Description**: End-to-end init command test
**Dependencies**: T047
**Estimated Time**: 45 minutes

**Test**: Run init on sample vault, verify validation → upload flow

**Acceptance**: US7 complete - Init command works with progress

---

**CHECKPOINT**: User Story 7 Complete ✅
- Init command validates then uploads
- Separate progress for each phase
- Combined statistics shown

---

## Phase 10: User Story 8 - Pre-Release Validation [P1] (Week 3, Days 2-4)

**Goal**: Integration test suite for all commands
**Independent Test**: `npm run test:all-commands` passes

### T049 - [US8] Test: Auth Integration
**Story**: US8
**File**: `tests/integration/commands/auth.integration.test.ts`
**Description**: Integration tests for auth command against staging API
**Dependencies**: T007
**Estimated Time**: 45 minutes
**TDD**: Test BEFORE enhancements

**Test Cases** (REAL staging API):
- ✓ Login with valid credentials
- ✓ Login with invalid credentials fails
- ✓ Logout clears credentials
- ✓ Status shows authenticated user

---

### T050 - [US8] Test: Upload Integration
**Story**: US8
**File**: `tests/integration/commands/upload.integration.test.ts`
**Description**: Integration tests for upload/init command against staging API
**Dependencies**: T047
**Estimated Time**: 1 hour

**Test Cases**:
- ✓ Upload small vault (<10 files)
- ✓ Upload large vault (100+ files)
- ✓ Upload with invalid workspace fails
- ✓ Progress tracking works
- ✓ All files uploaded successfully

---

### T051 - [US8] Test: Clone Integration
**Story**: US8
**File**: `tests/integration/commands/clone.integration.test.ts`
**Description**: Integration tests for clone command
**Dependencies**: T007
**Estimated Time**: 45 minutes

---

### T052 - [US8] Test: Sync Integration
**Story**: US8
**File**: `tests/integration/commands/sync.integration.test.ts`
**Description**: Integration tests for sync command
**Dependencies**: T007
**Estimated Time**: 45 minutes

---

### T053 - [US8] Test: Template Integration
**Story**: US8
**File**: `tests/integration/commands/template.integration.test.ts`
**Description**: Integration tests for template command
**Dependencies**: T007
**Estimated Time**: 45 minutes

---

### T054 - [US8] Test: Logs Integration
**Story**: US8
**File**: `tests/integration/commands/logs.integration.test.ts`
**Description**: Integration tests for logs export command
**Dependencies**: T045
**Estimated Time**: 30 minutes

---

### T055 - [US8] Create Test Report Generator
**Story**: US8
**File**: `tests/utils/TestReportGenerator.ts`
**Description**: Generate test reports in JSON and Markdown formats
**Dependencies**: T049-T054
**Estimated Time**: 1 hour

**Implementation**:
```typescript
export class TestReportGenerator {
  static async generateReport(results: TestResult[]): Promise<TestReport> {
    const report: TestReport = {
      reportId: randomUUID(),
      executedAt: new Date().toISOString(),
      environment: process.env.MUJARRAD_API_BASE_URL?.includes('staging') ? 'staging' : 'production',
      results,
      overallStatus: results.every(r => r.status === 'PASS') ? 'PASS' : 'FAIL',
      duration: results.reduce((sum, r) => sum + r.duration, 0),
      cliVersion: getVersion()
    };

    // Write JSON
    await fs.writeFile(`tests/reports/test-report-${timestamp}.json`, JSON.stringify(report, null, 2));

    // Write Markdown
    await fs.writeFile(`tests/reports/test-report-${timestamp}.md`, this.formatMarkdown(report));

    return report;
  }
}
```

---

### T056 - [US8] Create Pre-Release Validation Script
**Story**: US8
**File**: `scripts/test-commands.sh`
**Description**: Bash script for comprehensive pre-release validation
**Dependencies**: T055
**Estimated Time**: 45 minutes

**Implementation**:
```bash
#!/bin/bash
set -e

echo "🔍 Pre-Release Validation"

# 1. Unit tests
echo "1️⃣ Running unit tests..."
npm test

# 2. Staging integration tests
echo "2️⃣ Running integration tests..."
MUJARRAD_API_BASE_URL=https://staging.mujarrad.com npm run test:integration

# 3. Build
echo "3️⃣ Building..."
npm run build

# 4. Pack and test install
echo "4️⃣ Testing installation..."
npm pack
PACKAGE=$(ls mujarrad-cli-*.tgz)
npm install -g $PACKAGE
mujarrad --version
mujarrad --help
npm uninstall -g mujarrad-cli
rm $PACKAGE

echo "✅ All checks passed!"
```

---

### T057 - [US8] Update package.json Test Scripts
**Story**: US8
**File**: `package.json`
**Description**: Add test:all-commands script
**Dependencies**: T056
**Estimated Time**: 10 minutes

**Changes**:
```json
{
  "scripts": {
    "test": "jest --testPathPattern=tests/unit",
    "test:integration": "jest --testPathPattern=tests/integration --runInBand",
    "test:performance": "jest --testPathPattern=tests/performance",
    "test:all": "npm test && npm run test:integration && npm run test:performance",
    "test:all-commands": "./scripts/test-commands.sh"
  }
}
```

---

### T058 - [US8] Create CI/CD Workflow (Optional)
**Story**: US8
**File**: `.github/workflows/test.yml`
**Description**: GitHub Actions workflow for automated testing
**Dependencies**: T057
**Estimated Time**: 1 hour

**Implementation**: Full CI/CD pipeline with unit, integration, and pre-release tests

---

### T059 - [US8] Integration Test: Full Pre-Release Workflow
**Story**: US8
**File**: Manual execution
**Description**: Run complete pre-release validation locally
**Dependencies**: T058
**Estimated Time**: 30 minutes

**Test**: Execute `npm run test:all-commands` and verify all tests pass

**Acceptance**: US8 complete - Pre-release validation catches 95% of regressions (SC-007)

---

**CHECKPOINT**: User Story 8 Complete ✅
- Integration tests for all commands
- Test report generator
- Pre-release validation script
- test:all-commands npm script

---

## Phase 11: Polish & Cross-Cutting Concerns (Week 4)

### T060 - Update .npmignore
**Story**: Polish
**File**: `.npmignore`
**Description**: Ensure tests and specs excluded from npm package
**Dependencies**: None
**Estimated Time**: 10 minutes
**Parallelizable**: [P]

**Changes**:
```
tests/
specs/
.specify/
*.test.ts
*.test.js
```

---

### T061 - Update README with Alpha Disclaimer
**Story**: Polish
**File**: `README.md`
**Description**: Add prominent alpha warning and updated documentation
**Dependencies**: None
**Estimated Time**: 30 minutes
**Parallelizable**: [P]

---

### T062 - Update package.json Metadata
**Story**: Polish
**File**: `package.json`
**Description**: Update version to 1.1.0-alpha.1, add alpha warning to description
**Dependencies**: None
**Estimated Time**: 10 minutes

**Changes**:
```json
{
  "version": "1.1.0-alpha.1",
  "description": "⚠️ ALPHA: Obsidian Knowledge Graph Integration CLI - Sync your Obsidian vaults with Mujarrad workspaces"
}
```

---

### T063 - Performance Test: Logging Overhead
**Story**: Polish
**File**: `tests/performance/logging.perf.test.ts`
**Description**: Benchmark logging performance impact
**Dependencies**: T006
**Estimated Time**: 45 minutes
**Parallelizable**: [P]

**Test**:
- Measure overhead of session logging
- Measure overhead of redaction
- Verify <15% impact (NFR-001)

---

### T064 - Update Config Migration
**Story**: Polish
**File**: `src/utils/configMigration.ts`
**Description**: Add migration for DisclaimerAcknowledgment field
**Dependencies**: T002
**Estimated Time**: 30 minutes

**Implementation**: Handle existing users upgrading from v1.0.5 to v1.1.0-alpha.1

---

### T065 - Final Integration Test: Complete Workflow
**Story**: Polish
**File**: Manual execution
**Description**: End-to-end test of complete feature
**Dependencies**: All previous tasks
**Estimated Time**: 1 hour

**Test Workflow**:
1. Clean install: `npm pack && npm install -g ./mujarrad-cli-*.tgz`
2. Verify postinstall logo displays
3. Run `mujarrad --version`, verify alpha warning
4. First command triggers disclaimer
5. Accept disclaimer
6. Run `mujarrad init test-vault --workspace test`
7. Verify progress tracking works
8. Check logs created: `ls ~/.mujarrad/logs/`
9. Export logs: `mujarrad logs export`
10. Verify archive created
11. Run `npm run test:all-commands`
12. Verify all tests pass

**Acceptance**: Complete feature works end-to-end

---

**FINAL CHECKPOINT**: Feature Complete ✅

---

## Dependencies

### User Story Dependencies

```
Setup (T001-T003) → Foundational (T004-T007) → All User Stories can proceed in parallel

US1 (Debug): T004, T005, T006 → T008-T016
US2 (Install): T001 → T017-T020
US6 (Alpha): T002 → T021-T026
US3 (Help): T007 → T027-T034
US4 (Progress): T001, T007 → T035-T040
US5 (Export): T001, T007 → T041-T045
US7 (Init): T036 → T046-T048
US8 (Testing): T007, T047 → T049-T059
Polish: All → T060-T065
```

### Critical Path

**Week 1**:
- Setup → Foundational → US1 → US2 → US6

**Week 2**:
- US3 → US4 → US5

**Week 3**:
- US7 → US8

**Week 4**:
- Polish & Final Testing

---

## Parallel Execution Opportunities

### Week 1 (after Foundational complete):
- **Parallel Group 1**: T011, T012, T013, T014, T015 (service logging enhancements)
- **Parallel Group 2**: T017, T021 (postinstall and disclaimer tests)
- **Parallel Group 3**: T028, T029, T030, T031, T032, T033 (help enhancements)

### Week 2:
- **Parallel Group 4**: T037, T038, T039 (progress integration)
- **Parallel Group 5**: T060, T061 (documentation updates)

### Week 3:
- **Parallel Group 6**: T049, T051, T052, T053, T054 (integration tests)

### Week 4:
- **Parallel Group 7**: T060, T061, T063 (polish tasks)

---

## Implementation Strategy

### MVP Scope (Minimum Viable Product)
**Goal**: Shippable alpha.1 with core debugging functionality

**Include**:
- US1: Debug Failed Operations (P1) ✅
- US2: CLI Installation Progress (P1) ✅
- US6: Alpha Version Status (P1) ✅
- US3: Learn CLI Commands (P1) ✅

**Defer to alpha.2**:
- US4: Monitor Real-Time Progress (P2)
- US5: Export Operation History (P2)

**Deliverable**: alpha.1 with session logging, postinstall branding, alpha disclaimers, and help documentation

### Incremental Delivery

**Alpha 1 (Week 1-2)**:
- Phase 1: Setup
- Phase 2: Foundational
- Phase 3: US1
- Phase 4: US2
- Phase 5: US6
- Phase 6: US3
- Phase 11: Basic Polish

**Alpha 2 (Week 2-3)**:
- Phase 7: US4
- Phase 8: US5
- Phase 9: US7
- Phase 11: Additional Polish

**Alpha 3 (Week 3-4)**:
- Phase 10: US8
- Phase 11: Final Polish

---

## Testing Strategy

### Test Coverage Requirements
- **Unit Tests**: 80% minimum coverage (Adapted Principle III)
- **Integration Tests**: All CLI commands (FR-044)
- **Performance Tests**: Logging overhead <15% (NFR-001)

### Test Execution Order
1. **Unit Tests** (T008, T010, T017, T021, T024, T027, T035, T041, T043, T046) - BEFORE implementation
2. **Implementation** (T009, T011-T015, T018, T022, T025, T028-T033, etc.)
3. **Integration Tests** (T016, T020, T026, T034, T040, T045, T048, T049-T054)
4. **Performance Tests** (T063)

### Continuous Testing
- Run `npm test` after each task completion
- Run `npm run test:integration` after completing each user story
- Run `npm run test:all-commands` before alpha release

---

## Risk Mitigation

### Identified Risks (from spec.md)

**R1: Log file growth** → Mitigated by T005 (log rotation with 7-day retention)
**R2: Performance impact** → Mitigated by T006 (async logging), verified by T063
**R3: Sensitive data exposure** → Mitigated by T006 (automatic redaction)
**R4: Installation failures** → Mitigated by T018 (graceful postinstall failure)
**R5: Test environment instability** → Mitigated by T007 (test setup with retries)
**R6: Disclaimer fatigue** → Mitigated by T022 (one-time per level change)

---

## Success Metrics

Track these metrics during implementation:

- **SC-001**: Can users debug 90% of errors using logs? → Verify with US1 integration test
- **SC-002**: Do users complete first command in 5 min? → Verify with US3 integration test
- **SC-003**: Do 100% see disclaimer? → Verify with US6 integration test
- **SC-004**: Do 80% of bug reports include logs? → Track post-release
- **SC-005**: Installation confirms in 30s? → Verify with US2 integration test
- **SC-006**: Progress updates 1Hz? → Verify with US4 integration test
- **SC-007**: Pre-release catches 95% regressions? → Verify with US8 tests
- **SC-008**: Log export in <10s? → Verify with US5 integration test
- **SC-009**: 100% commands have examples? → Verify with US3 tests
- **SC-010**: 30% fewer "not responding" issues? → Track post-release

---

## Next Steps

1. **Review this tasks.md** with team
2. **Begin implementation** with Phase 1 (Setup)
3. **Follow TDD approach**: Write tests before implementation
4. **Track progress**: Update task status as you complete each one
5. **Run tests continuously**: After each task completion
6. **Create checkpoints**: After completing each user story
7. **Release alpha.1**: After completing MVP scope (US1, US2, US3, US6)

---

## Notes

- All file paths are relative to repository root
- [P] markers indicate parallelizable tasks
- Tests MUST be written before implementation (TDD)
- Each user story is independently testable
- Integration tests use REAL staging API (not mocks)
- Sensitive data redaction is automatic (security by default)
- Log rotation prevents unbounded disk usage
- Progress indicators degrade gracefully in CI/CD
- Alpha disclaimer shown only on level changes
- Pre-release validation required before npm publish

---

**Generated**: 2025-10-12
**Total Tasks**: 65
**Phases**: 11
**User Stories**: 8 (6 P1, 2 P2)
**Estimated Duration**: 4 weeks
**MVP Scope**: US1, US2, US3, US6 (alpha.1)
