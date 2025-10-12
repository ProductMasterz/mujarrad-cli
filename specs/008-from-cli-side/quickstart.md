# Quickstart Guide: CLI Observability & Alpha Release Management

**Feature**: 008-from-cli-side
**Branch**: `008-from-cli-side`
**Date**: 2025-10-12

## Overview

This guide provides step-by-step instructions for developers working on the CLI observability feature. It covers development setup, local testing, pre-release validation, and npm publishing.

---

## Prerequisites

### Required Software
- **Node.js**: 18.0.0 or higher
- **npm**: 8.0.0 or higher
- **TypeScript**: 5.3.0 or higher (installed via devDependencies)
- **Git**: For version control

### Optional Tools
- **jq**: JSON command-line processor (for viewing logs)
- **GitHub CLI (gh)**: For CI/CD integration

### Check Prerequisites
```bash
node --version   # Should be >= 18.0.0
npm --version    # Should be >= 8.0.0
git --version
```

---

## Development Setup

### 1. Clone and Install Dependencies

```bash
# Clone the repository
git clone https://github.com/mujarrad/mujarrad-cli.git
cd mujarrad-cli

# Checkout feature branch
git checkout 008-from-cli-side

# Install dependencies
npm install

# This will install:
# - winston, winston-daily-rotate-file (logging)
# - fast-redact (sensitive data redaction)
# - archiver (log export compression)
# - ora, cli-progress, chalk (UI)
# - nock, ci-info (testing)
# - jest, ts-jest, @types/* (development)
```

### 2. Build TypeScript

```bash
# Compile TypeScript to JavaScript
npm run build

# Output: dist/ directory with compiled .js files
```

### 3. Link for Local Testing

```bash
# Create global symlink for local development
npm link

# Now you can run 'mujarrad' command globally using local code
mujarrad --version
```

---

## Project Structure

```
mujarrad-cli/
├── src/
│   ├── commands/          # CLI command implementations
│   │   ├── auth.ts       # Existing
│   │   ├── upload.ts     # Enhanced (init functionality)
│   │   ├── clone.ts      # Existing
│   │   ├── sync.ts       # Existing
│   │   ├── template.ts   # Existing
│   │   └── logs.ts       # NEW - log management
│   ├── services/          # Business logic
│   │   ├── AuthService.ts       # Existing
│   │   ├── UploadService.ts     # Enhanced logging
│   │   ├── CloneService.ts      # Enhanced logging
│   │   ├── SyncService.ts       # Enhanced logging
│   │   ├── TemplateService.ts   # Enhanced logging
│   │   └── LogExportService.ts  # NEW
│   ├── utils/             # Utilities
│   │   ├── Logger.ts            # Enhanced (session tracking)
│   │   ├── ProgressBar.ts       # Enhanced (ETA, TTY detection)
│   │   ├── SessionManager.ts    # NEW
│   │   └── AlphaDisclaimer.ts   # NEW
│   ├── config/            # Configuration
│   │   ├── ConfigManager.ts
│   │   ├── types.ts       # Enhanced (DisclaimerAcknowledgment)
│   │   └── ...
│   └── index.ts           # Main entry point
├── tests/
│   ├── unit/              # Unit tests (mocked)
│   ├── integration/       # Integration tests (real staging API)
│   ├── performance/       # Performance benchmarks
│   └── e2e/               # End-to-end smoke tests
├── scripts/
│   ├── postinstall.js     # NEW - npm postinstall script
│   └── test-commands.sh   # NEW - pre-release validation
├── specs/
│   └── 008-from-cli-side/ # Feature documentation
│       ├── spec.md
│       ├── plan.md
│       ├── research.md
│       ├── data-model.md
│       ├── quickstart.md  # This file
│       └── contracts/
└── package.json
```

---

## Running Locally

### Development Mode (Watch for Changes)

```bash
# Run without compilation (uses tsx for TypeScript execution)
npm run dev

# This runs: tsx src/index.ts
# Useful for rapid development iteration
```

### Test Specific Command

```bash
# After npm link, test any command
mujarrad --version
mujarrad --help
mujarrad auth status
mujarrad logs export --help
```

### Debug Mode with Verbose Logging

```bash
# Set log level to debug for detailed output
MUJARRAD_LOG_LEVEL=debug mujarrad auth login --email test@example.com
```

### View Local Logs

```bash
# Logs are written to ~/.mujarrad/logs/
cat ~/.mujarrad/logs/mujarrad-*.log | jq '.'

# Filter by session ID
cat ~/.mujarrad/logs/mujarrad-*.log | jq 'select(.sessionId == "abc-123")'

# Filter by log level
cat ~/.mujarrad/logs/mujarrad-*.log | jq 'select(.level == "error")'
```

---

## Testing

### Unit Tests (Fast, Mocked)

```bash
# Run all unit tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode for TDD
npm run test:watch

# Run specific test file
npx jest tests/unit/utils/Logger.test.ts
```

**Unit tests use Nock to mock HTTP requests**:
```typescript
// Example: tests/unit/services/AuthService.test.ts
import nock from 'nock';

beforeEach(() => {
  nock('https://mujarrad.onrender.com')
    .post('/api/v1/auth/login')
    .reply(200, { accessToken: 'mock-token' });
});
```

### Integration Tests (Real Staging API)

```bash
# Set staging API URL
export MUJARRAD_API_BASE_URL=https://staging.mujarrad.com

# Set test credentials (ask team for staging test account)
export TEST_USER_EMAIL=test-cli@mujarrad.com
export TEST_USER_PASSWORD=staging-test-password

# Run integration tests
npm run test:integration

# This runs: jest --testPathPattern=tests/integration --runInBand
# --runInBand: Run tests sequentially (important for API tests)
```

**Integration tests use REAL API calls**:
```typescript
// Example: tests/integration/commands/auth.integration.test.ts
describe('auth command integration', () => {
  it('should authenticate with real staging API', async () => {
    const authService = new AuthService();
    const result = await authService.login(
      process.env.TEST_USER_EMAIL!,
      process.env.TEST_USER_PASSWORD!
    );

    expect(result.accessToken).toBeTruthy();
  });
});
```

### Performance Tests

```bash
# Run performance benchmarks
npm run test:performance

# Tests logging performance, compression speed, etc.
```

### All Tests (Pre-Commit)

```bash
# Run complete test suite
npm run test:all

# This runs:
# 1. Unit tests (fast, mocked)
# 2. Integration tests (staging API)
# 3. Performance tests
```

---

## Environment Variables

### Development

Create `.env` file (git-ignored):
```bash
# API Configuration
MUJARRAD_API_BASE_URL=https://staging.mujarrad.com

# Test Credentials (staging only)
TEST_USER_EMAIL=test-cli@mujarrad.com
TEST_USER_PASSWORD=staging-test-password

# Logging
MUJARRAD_LOG_LEVEL=debug

# CI/CD Flags (for testing)
CI=false
MUJARRAD_ACCEPT_DISCLAIMER=true
```

Load with:
```bash
# Option 1: Export manually
export MUJARRAD_API_BASE_URL=https://staging.mujarrad.com

# Option 2: Use dotenv (if added to project)
source .env
```

### CI/CD (GitHub Actions)

Set as GitHub Secrets:
- `STAGING_API_URL`: https://staging.mujarrad.com
- `TEST_USER_EMAIL`: test-cli@mujarrad.com
- `TEST_USER_PASSWORD`: <staging password>
- `NPM_TOKEN`: <npm publish token>

---

## Logging During Development

### Enable Session Tracking

```typescript
// In any service or command
import { Logger } from '../utils/Logger.js';
import { randomUUID } from 'crypto';

const logger = new Logger();
const sessionId = randomUUID();
const sessionLogger = logger.child({ sessionId });

// All logs now include sessionId automatically
sessionLogger.info('Operation started', { operation: 'upload' });
sessionLogger.debug('Processing file', { filePath: '/path/to/file.md' });
sessionLogger.error('Operation failed', { error: someError });
```

### View Logs in Real-Time

```bash
# Tail log file
tail -f ~/.mujarrad/logs/mujarrad-*.log | jq '.'

# Filter for specific session
tail -f ~/.mujarrad/logs/mujarrad-*.log | jq 'select(.sessionId == "abc-123")'

# Only show errors
tail -f ~/.mujarrad/logs/mujarrad-*.log | jq 'select(.level == "error")'
```

### Test Log Export

```bash
# Generate some logs
mujarrad auth status
mujarrad --help

# Export logs
mujarrad logs export --output ./test-logs.zip

# Extract and verify
unzip -l ./test-logs.zip
unzip ./test-logs.zip -d ./test-logs
cat ./test-logs/logs/*.log | jq '.'
```

---

## Pre-Release Validation

### 1. Version Bump

```bash
# For alpha releases, use alpha suffix
npm version 1.0.0-alpha.1  # First alpha
npm version 1.0.0-alpha.2  # Second alpha
npm version 1.0.0-beta.1   # First beta
npm version 1.0.0          # Stable release

# This updates package.json and creates git tag
```

### 2. Build and Test

```bash
# Clean previous builds
rm -rf dist/

# Build
npm run build

# Run all tests
npm run test:all
```

### 3. Test Installation Locally

```bash
# Create tarball (simulates npm publish)
npm pack

# This creates: mujarrad-cli-1.0.0-alpha.1.tgz

# Test global installation
npm install -g ./mujarrad-cli-1.0.0-alpha.1.tgz

# Verify installation
mujarrad --version
mujarrad --help

# Test postinstall script displays correctly
# (Logo and welcome message should appear)

# Uninstall when done
npm uninstall -g mujarrad-cli
```

### 4. Pre-Release Checklist

Use the automated script:
```bash
# scripts/test-commands.sh
#!/bin/bash
set -e

echo "🔍 Pre-Release Validation"

# 1. Unit tests
echo "1️⃣ Running unit tests..."
npm test

# 2. Staging integration tests
echo "2️⃣ Running integration tests on staging..."
MUJARRAD_API_BASE_URL=https://staging.mujarrad.com npm run test:integration

# 3. Build verification
echo "3️⃣ Building package..."
npm run build

# 4. Pack and test installation
echo "4️⃣ Testing package installation..."
npm pack
PACKAGE_FILE=$(ls mujarrad-cli-*.tgz)
npm install -g $PACKAGE_FILE

# 5. Smoke test installed CLI
echo "5️⃣ Running smoke tests..."
mujarrad --version
mujarrad --help
mujarrad auth status

# 6. Cleanup
npm uninstall -g mujarrad-cli
rm $PACKAGE_FILE

echo "✅ All pre-release checks passed!"
echo "📦 Ready to publish: npm publish --tag alpha"
```

Run it:
```bash
chmod +x scripts/test-commands.sh
./scripts/test-commands.sh
```

---

## Publishing to npm

### Alpha Release

```bash
# 1. Ensure you're logged in to npm
npm whoami
# If not logged in:
npm login

# 2. Run pre-release validation
./scripts/test-commands.sh

# 3. Publish with alpha tag
npm publish --tag alpha

# This publishes as: mujarrad-cli@1.0.0-alpha.1
# Users install with: npm install -g mujarrad-cli@alpha
```

### Beta Release

```bash
# 1. Version bump
npm version 1.0.0-beta.1

# 2. Build and test
npm run build
npm run test:all

# 3. Publish with beta tag
npm publish --tag beta

# Users install with: npm install -g mujarrad-cli@beta
```

### Stable Release

```bash
# 1. Version bump (remove prerelease suffix)
npm version 1.0.0

# 2. Full validation
./scripts/test-commands.sh

# 3. Publish to latest tag
npm publish

# This publishes as: mujarrad-cli@1.0.0 (latest)
# Users install with: npm install -g mujarrad-cli
```

### Verify Publication

```bash
# Check npm registry
npm view mujarrad-cli

# View specific version
npm view mujarrad-cli@1.0.0-alpha.1

# List all versions
npm view mujarrad-cli versions
```

---

## Troubleshooting

### Issue: TypeScript Compilation Errors

```bash
# Clean and rebuild
rm -rf dist/
npm run build

# Check for type errors
npx tsc --noEmit
```

### Issue: Tests Failing

```bash
# Clear Jest cache
npx jest --clearCache

# Run tests with verbose output
npm test -- --verbose

# Run specific test file
npx jest tests/unit/utils/Logger.test.ts --verbose
```

### Issue: Integration Tests Timeout

```bash
# Check network connectivity
curl https://staging.mujarrad.com/health

# Check environment variables
echo $MUJARRAD_API_BASE_URL
echo $TEST_USER_EMAIL

# Increase Jest timeout
npx jest --testPathPattern=tests/integration --testTimeout=30000
```

### Issue: npm link Not Working

```bash
# Unlink
npm unlink

# Rebuild and relink
npm run build
npm link

# Check global packages
npm ls -g mujarrad-cli
```

### Issue: Postinstall Script Not Running

```bash
# Test postinstall manually
node scripts/postinstall.js

# Check TTY detection
node -e "console.log('isTTY:', process.stdout.isTTY)"

# Verify script in package.json
cat package.json | jq '.scripts.postinstall'
```

### Issue: Logs Not Being Created

```bash
# Check log directory exists
ls -la ~/.mujarrad/logs/

# Create if missing
mkdir -p ~/.mujarrad/logs/

# Check permissions
ls -ld ~/.mujarrad/logs/

# Should be: drwx------ (700)
```

### Issue: Session ID Not Appearing in Logs

```bash
# Verify child logger usage
cat src/commands/auth.ts | grep "logger.child"

# Check log output
cat ~/.mujarrad/logs/mujarrad-*.log | jq 'select(.sessionId)'

# If empty, ensure commands create session loggers:
const sessionId = randomUUID();
const sessionLogger = logger.child({ sessionId });
```

---

## Debugging Tips

### Debug with Node.js Inspector

```bash
# Run with Node debugger
node --inspect dist/index.js --help

# Then open chrome://inspect in Chrome
# Click "inspect" to open DevTools
```

### Debug Tests

```bash
# Debug specific test
node --inspect-brk node_modules/.bin/jest tests/unit/utils/Logger.test.ts --runInBand

# Open chrome://inspect
```

### Enable Verbose Winston Logging

```typescript
// In src/utils/Logger.ts
this.winston = winston.createLogger({
  level: 'debug',
  format: winston.format.combine(
    winston.format.colorize(),  // Add colors for console
    winston.format.simple()      // Human-readable format
  ),
  transports: [
    new winston.transports.Console()  // Log to console too
  ]
});
```

### Check for Memory Leaks

```bash
# Run with Node memory profiler
node --inspect --expose-gc dist/index.js logs export

# Use Chrome DevTools Memory profiler
# Take heap snapshots before/after operations
```

---

## Best Practices

### 1. Test-Driven Development

```bash
# Write failing test first
npx jest tests/unit/services/LogExportService.test.ts --watch

# Implement minimal code to pass
# Refactor
# Commit
```

### 2. Commit Message Format

```bash
git commit -m "feat: add session ID generation using crypto.randomUUID"
git commit -m "fix: resolve log rotation file locking on Windows"
git commit -m "test: add integration tests for log export command"
git commit -m "docs: update quickstart guide with debugging tips"

# Use conventional commits: feat, fix, test, docs, refactor, chore
```

### 3. Branch Workflow

```bash
# Create feature branch from 008-from-cli-side
git checkout 008-from-cli-side
git pull origin 008-from-cli-side

# Create sub-branch for specific task
git checkout -b 008-session-tracking

# Work on feature
# Commit changes
git add .
git commit -m "feat: implement session tracking"

# Push to remote
git push origin 008-session-tracking

# Create PR to merge into 008-from-cli-side (not main)
```

### 4. Code Review Checklist

Before submitting PR:
- [ ] All tests pass (`npm run test:all`)
- [ ] TypeScript compiles without errors
- [ ] No linting errors (`npm run lint`)
- [ ] Code coverage >= 80% for new code
- [ ] Documentation updated (JSDoc comments)
- [ ] Manual testing performed
- [ ] No console.log statements left in code (use logger)
- [ ] Sensitive data redaction tested

---

## Quick Reference

### Key Commands

```bash
# Development
npm run dev                    # Run in dev mode (tsx)
npm run build                  # Compile TypeScript
npm link                       # Link for global testing

# Testing
npm test                       # Unit tests (fast)
npm run test:integration       # Integration tests (staging API)
npm run test:all               # All tests
npm run test:coverage          # Coverage report

# Pre-Release
npm version 1.0.0-alpha.1      # Bump version
npm pack                       # Create tarball
npm publish --tag alpha        # Publish alpha release

# Debugging
tail -f ~/.mujarrad/logs/*.log | jq '.'  # Watch logs
mujarrad --version                        # Check version
mujarrad --help                           # View help
```

### Important Files

- `src/index.ts`: Main CLI entry point
- `src/utils/Logger.ts`: Logging infrastructure
- `src/commands/logs.ts`: Log export command
- `package.json`: Version and dependencies
- `tests/`: All test files
- `~/.mujarrad/logs/`: Log file location
- `~/.mujarrad/config.json`: CLI configuration

### Useful Links

- Repository: https://github.com/mujarrad/mujarrad-cli
- Documentation: https://www.mujarrad.com/docs
- Issue Tracker: https://github.com/mujarrad/mujarrad-cli/issues
- npm Package: https://www.npmjs.com/package/mujarrad-cli

---

## Next Steps

After completing local development and testing:

1. **Push changes** to feature branch
2. **Create Pull Request** to merge into main
3. **Run CI/CD pipeline** (GitHub Actions)
4. **Code review** by team
5. **Merge to main** after approval
6. **Publish to npm** with appropriate tag

For questions or issues, refer to:
- `specs/008-from-cli-side/spec.md` - Full feature specification
- `specs/008-from-cli-side/plan.md` - Implementation plan
- Team Slack channel or open a GitHub issue
