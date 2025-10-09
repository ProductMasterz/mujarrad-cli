# Research Findings: Obsidian Mapper Integration CLI

**Feature**: 007-obsidian-mapper-i | **Date**: 2025-10-09 | **Status**: ✅ Complete

## Overview

This document records technical decisions for the Mujarrad CLI tool that enables bidirectional synchronization between Obsidian vaults and Mujarrad workspaces. All architectural decisions are based on CLI requirements and backend API analysis.

**Key Insight**: The backend API already exists and is consumed as an external service. The CLI is a desktop tool that orchestrates file operations and API calls.

## CLI Technology Stack

### Language and Runtime

**Decision**: Node.js 18+ / TypeScript 5+

**Rationale**:
- NPM distribution is the primary target (widest reach for CLI tools)
- TypeScript provides type safety for API client generation
- Node.js has excellent file system and HTTP libraries
- Cross-platform support (macOS, Linux, Windows)

**Alternatives Considered**:
- Python: Good for pip/pipx distribution, but weaker TypeScript integration for API client generation
- Go: Excellent for standalone binaries, but harder to distribute via npm
- Rust: Best performance, but steeper learning curve and slower development

### CLI Framework

**Decision**: Commander.js 11+

**Rationale**:
- Most popular Node.js CLI framework (28k+ GitHub stars)
- Excellent documentation and community support
- Built-in help generation
- Subcommand support (auth, workspace, upload, etc.)
- Git-style command syntax

**Alternatives Considered**:
- Yargs: Similar features, but more verbose API
- oclif: Feature-rich but heavier framework, overkill for this use case
- Vorpal: Interactive CLI, not needed for batch operations

### API Client Generation

**Decision**: openapi-generator-cli

**Rationale**:
- Generates TypeScript client from OpenAPI 3.0 specification
- Supports Axios (best Node.js HTTP client)
- Auto-generates TypeScript types for all request/response models
- Keeps CLI in sync with backend API changes

**Implementation**:
```bash
openapi-generator-cli generate \
  -i specs/007-obsidian-mapper-i/contracts/openapi.yaml \
  -g typescript-axios \
  -o src/api/generated \
  --additional-properties=supportsES6=true,npmName=mujarrad-api-client
```

**Alternatives Considered**:
- swagger-codegen: Older, less active maintenance
- Manual API client: Too much work, error-prone, hard to maintain
- GraphQL: Backend uses REST, not GraphQL

### File System Operations

**Decision**: Native Node.js fs/promises + chokidar for file watching

**Rationale**:
- Node.js fs/promises provides async file operations
- chokidar is the industry-standard file watcher (cross-platform, debounced events)
- No need for heavy frameworks

**File Watching Strategy**:
- Watch vault folder for changes (add, change, unlink events)
- Debounce events (1 second) to batch multiple changes
- Calculate SHA-256 hashes for change detection
- Respect .gitignore patterns

**Alternatives Considered**:
- fs-extra: Adds convenience methods, but not necessary
- nodemon: Designed for development, not production file watching
- watchman: Facebook's file watcher, overkill for this use case

### Markdown Parsing

**Decision**: remark 15+ / unified

**Rationale**:
- Industry-standard markdown processor
- Plugin ecosystem for wikilink extraction
- AST (Abstract Syntax Tree) parsing for reliable extraction
- Supports frontmatter parsing

**Wikilink Extraction**:
```typescript
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkWikilink from 'remark-wiki-link';

const wikilinks = [];
unified()
  .use(remarkParse)
  .use(remarkWikilink, {
    pageResolver: (name) => {
      wikilinks.push(name);
      return [name];
    }
  })
  .processSync(markdownContent);
```

**Alternatives Considered**:
- Regex parsing: Fragile, doesn't handle edge cases (escaped brackets, code blocks)
- markdown-it: Good, but less extensible than remark
- marked: Fast, but limited plugin ecosystem

### Canvas Parsing

**Decision**: Native JSON.parse()

**Rationale**:
- Obsidian `.canvas` files are JSON
- No special parsing needed beyond JSON.parse()
- Extract nodes, edges, and visual properties from JSON structure

**Canvas Structure**:
```json
{
  "nodes": [
    {
      "id": "node-1",
      "type": "file",
      "file": "note.md",
      "x": 100,
      "y": 200,
      "width": 400,
      "height": 200,
      "color": "#ff6b6b"
    }
  ],
  "edges": [
    {
      "id": "edge-1",
      "fromNode": "node-1",
      "toNode": "node-2",
      "color": "#000000"
    }
  ]
}
```

**Alternatives Considered**:
- None - JSON.parse() is sufficient

### Configuration Management

**Decision**: cosmiconfig 8+

**Rationale**:
- Supports multiple config formats (YAML, JSON, JS)
- Searches for config in standard locations (~/.mujarrad/config.yml, ~/.config/mujarrad/)
- Merges default config with user overrides
- Widely used in CLI tools (ESLint, Prettier, etc.)

**Configuration Schema**:
```yaml
# ~/.mujarrad/config.yml
apiUrl: https://api.example.com
defaultWorkspace: workspace-uuid
conflictResolution: last-write-wins  # or 'local-wins', 'remote-wins', 'interactive'
batchSize: 100
logLevel: info
```

**Alternatives Considered**:
- rc: Older, less features
- conf: Electron-specific, not needed for Node.js CLI
- Manual config parsing: Too much work

### Credential Storage

**Decision**: keytar 7+ (OS keychain) with encrypted JSON fallback

**Rationale**:
- keytar integrates with OS keychain (Keychain Access on macOS, Credential Manager on Windows, libsecret on Linux)
- More secure than storing JWT tokens in plaintext
- Fallback to encrypted JSON if keychain unavailable

**Security**:
- JWT tokens stored in OS keychain (service: mujarrad-cli, account: user email)
- Fallback: AES-256 encrypted ~/.mujarrad/credentials.json (password derived from machine ID)
- Never store credentials in plaintext

**Alternatives Considered**:
- Plain JSON: Insecure, violates Constitution Principle V
- Environment variables: Not persistent, user must set on every session
- node-keytar alternatives: None as mature and well-maintained

### Progress UI

**Decision**: ora 7+ (spinners) + cli-progress 3+ (progress bars)

**Rationale**:
- ora: Beautiful terminal spinners for indeterminate operations (e.g., "Authenticating...")
- cli-progress: Multi-bar progress for batch operations (e.g., "Uploading batch 3/10: [=====>     ] 50%")
- Both lightweight and widely used

**Usage**:
```typescript
import ora from 'ora';
import cliProgress from 'cli-progress';

// Spinner for indeterminate operations
const spinner = ora('Authenticating...').start();
await authService.login();
spinner.succeed('Logged in');

// Progress bar for batch uploads
const bar = new cliProgress.SingleBar({});
bar.start(totalFiles, 0);
for (let i = 0; i < totalFiles; i++) {
  await uploadFile(files[i]);
  bar.update(i + 1);
}
bar.stop();
```

**Alternatives Considered**:
- inquirer: For interactive prompts, not progress display
- chalk: For colors, but doesn't handle progress bars
- listr: Task lists, but heavier than needed

### Logging

**Decision**: winston 3+

**Rationale**:
- Industry-standard logging library for Node.js
- Multiple transports (console, file, HTTP)
- Log levels (error, warn, info, debug)
- Structured logging (JSON format)
- Log rotation support

**Log Storage**:
- Console: info level and above (for user feedback)
- File: debug level and above (for troubleshooting)
- Log files: `~/.mujarrad/logs/upload-{session-id}.log`, `~/.mujarrad/logs/sync-{date}.log`

**Alternatives Considered**:
- pino: Faster, but winston has better community support
- bunyan: Good, but JSON-only format (winston supports multiple formats)
- console.log: Not structured, no log levels

### Testing Framework

**Decision**: Jest 29+

**Rationale**:
- Most popular JavaScript testing framework
- Built-in mocking, assertions, coverage reporting
- TypeScript support via ts-jest
- Snapshot testing for API responses
- Parallel test execution

**Test Structure**:
```
tests/
├── unit/              # Fast, isolated tests (services, parsers, utils)
├── integration/       # Tests with mock API server
└── e2e/              # End-to-end tests with sample vault
```

**Alternatives Considered**:
- Mocha + Chai: More modular, but requires more setup
- Vitest: Newer, faster, but less mature
- AVA: Parallel by default, but less popular

## Backend API Integration

### API Consumption Model

**Decision**: CLI consumes backend REST API as external service

**Architecture**:
```
CLI (Desktop)                Backend (External Service)
     |                                |
     |-- POST /api/auth/login ------->|
     |<-- 200 OK (JWT token) ---------|
     |                                |
     |-- POST /api/workspaces ------->|
     |<-- 201 Created (workspace) ----|
     |                                |
     |-- POST /upload/batch --------->|
     |<-- 202 Accepted (session) -----|
     |                                |
     |-- GET /upload/status --------->|
     |<-- 200 OK (progress) ----------|
```

**Key Points**:
- CLI has no database (stateless)
- CLI does not implement business logic (delegates to API)
- CLI orchestrates file operations and API calls
- CLI must handle API errors gracefully (network failures, timeouts)

### Batch Upload Strategy

**Decision**: Split files into 100-file batches, upload sequentially, track via UploadSession

**Process**:
1. Scan vault → identify all `.md` and `.canvas` files
2. Split into batches of 100 files
3. For each batch:
   - Parse files (extract wikilinks, canvas nodes)
   - Upload via `POST /api/workspaces/{id}/upload/batch`
   - Poll `GET /api/workspaces/{id}/upload/status` until processed
   - Log progress to `~/.mujarrad/logs/upload-{session-id}.log`
4. On failure: Store session ID, allow `mujarrad upload resume <session-id>`

**Batch Size Rationale**:
- 100 files balances API payload size vs number of HTTP requests
- Too small (10 files) → too many HTTP requests, slow
- Too large (1000 files) → HTTP timeout, memory issues

**Resume Capability**:
- Backend creates UploadSession entity (tracks totalFiles, processedFiles, failedFiles)
- CLI stores session ID in config on failure
- CLI can resume by uploading remaining batches

### Sync Detection Strategy

**Decision**: File hash comparison (SHA-256)

**Process**:
1. Calculate SHA-256 hash for each local file
2. Send hashes to `POST /api/workspaces/{id}/sync/detect`
3. Backend compares with NodeVersion timestamps
4. Backend returns 3 arrays:
   - `localChanges`: Files modified locally since last sync
   - `remoteChanges`: Files modified remotely since last sync
   - `conflicts`: Files modified both locally and remotely

**Conflict Resolution**:
- Default: Last-write-wins (compare timestamps)
- User override: `--force-local` or `--force-remote` flags
- Interactive: Prompt user for each conflict

**Alternatives Considered**:
- Timestamp-only comparison: Unreliable (clock skew, timezone issues)
- Content comparison: Too slow for large vaults
- SHA-256 hash: Fast, reliable, detects actual content changes

### Conflict Resolution Strategy

**Decision**: Last-write-wins with interactive fallback

**Strategies**:
1. **Last-write-wins** (default): Compare timestamps, keep most recent
2. **Local-wins**: Always keep local version (override remote)
3. **Remote-wins**: Always keep remote version (override local)
4. **Interactive**: Prompt user for each conflict

**Interactive UI**:
```
Conflict 1/3: Projects/Mujarrad/spec.md

Local version (2025-10-09 10:00):
  ## Goals
  - Upload vault
  - Sync bidirectionally

Remote version (2025-10-09 10:05):
  ## Goals
  - Upload vault
  - Sync bidirectionally
  - Add templates

Choose resolution:
[L] Keep local   [R] Keep remote   [V] View full diff   [S] Skip   [A] Auto-resolve all
> _
```

**Implementation**:
- Use inquirer.js for interactive prompts
- Store user preference in config for future syncs
- Log conflict resolutions for audit trail

## File System Operations

### Atomic File Writes

**Decision**: Write to temp file, then rename (atomic operation)

**Rationale**:
- Prevents file corruption if CLI crashes during write
- OS guarantees atomicity of rename operation
- Preserves original file if write fails

**Implementation**:
```typescript
import { writeFile, rename, unlink } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

async function atomicWrite(filePath: string, content: string): Promise<void> {
  const tempPath = join(tmpdir(), `mujarrad-${Date.now()}.tmp`);

  try {
    await writeFile(tempPath, content, 'utf8');
    await rename(tempPath, filePath);  // Atomic operation
  } catch (error) {
    await unlink(tempPath).catch(() => {});  // Clean up temp file
    throw error;
  }
}
```

**Alternatives Considered**:
- Direct write: Risks file corruption
- Copy-on-write: More complex, not necessary

### Mapping File Management

**Decision**: Store file path ↔ Node UUID mappings in `.mujarrad/mappings.json`

**Purpose**:
- Map local file paths to backend Node UUIDs
- Enable efficient sync (avoid full vault re-upload)
- Allow offline operations (CLI knows which files map to which nodes)

**Format**:
```json
{
  "version": "1.0",
  "workspaceId": "workspace-uuid",
  "mappings": {
    "Projects/Mujarrad/spec.md": "node-uuid-1",
    "Projects/Mujarrad/plan.md": "node-uuid-2",
    "Business Model Canvas.canvas": "node-uuid-3"
  }
}
```

**Operations**:
- **Create**: After initial upload, write mappings.json
- **Update**: After sync, update changed mappings
- **Read**: Before sync, load mappings to identify changed files
- **Delete**: When node deleted, remove from mappings

## Auto-Update Mechanism

**Decision**: Check npm registry on CLI startup, prompt user if update available

**Implementation**:
```typescript
import semver from 'semver';
import { fetch } from 'undici';

async function checkForUpdates(): Promise<void> {
  const currentVersion = require('../package.json').version;
  const response = await fetch('https://registry.npmjs.org/mujarrad-cli/latest');
  const data = await response.json();
  const latestVersion = data.version;

  if (semver.gt(latestVersion, currentVersion)) {
    console.log(`\n🎉 Update available: ${currentVersion} → ${latestVersion}`);
    console.log(`Run: npm install -g mujarrad-cli@latest\n`);
  }
}
```

**User Experience**:
- Check on every CLI command (cached for 24 hours)
- Non-blocking (runs in background)
- User must manually run `npm install -g mujarrad-cli@latest`
- Future: Auto-update via `mujarrad update` command

**Alternatives Considered**:
- Auto-install: Requires sudo/admin, risky
- Version check server: Unnecessary, npm registry already provides this
- No auto-update: Users miss important bug fixes

## Distribution Strategy

### Phase 1: NPM Package

**Target**: Node.js developers, power users

**Installation**:
```bash
# Global installation
npm install -g mujarrad-cli

# NPX usage (no installation)
npx mujarrad-cli upload /path/to/vault
```

**Publishing**:
- Automated via GitHub Actions (`.github/workflows/publish-npm.yml`)
- Triggered on git tag push (e.g., `git tag v1.0.0 && git push --tags`)
- Publishes to https://www.npmjs.com/package/mujarrad-cli

### Phase 2: Python Package (Future)

**Target**: Python developers, data scientists

**Options**:
1. **Wrap Node.js CLI**: Python subprocess calls to Node.js CLI (faster to implement)
2. **Rewrite in Python**: Full Python rewrite (more maintainable long-term)

**Decision deferred** until npm package is stable.

### Phase 3: Standalone Binaries (Future)

**Target**: Non-technical users

**Tools**:
- pkg: Bundles Node.js + CLI into single executable
- nexe: Alternative to pkg, similar features

**Binaries**:
- mujarrad-macos-x64 (Intel)
- mujarrad-macos-arm64 (Apple Silicon)
- mujarrad-linux-x64
- mujarrad-win-x64.exe

**Distribution**: GitHub Releases, direct download links

### Phase 4: Platform-Specific Executables (Future)

**Target**: App stores, enterprise users

**Formats**:
- macOS: .dmg installer (signed and notarized for Gatekeeper)
- Windows: .exe installer (signed with code signing certificate)
- Linux: .deb, .rpm, AppImage

**Distribution**:
- GitHub Releases
- Future: macOS App Store, Microsoft Store, Snap Store

## Performance Considerations

### NFR-001: 1000-file vault upload in <5 minutes

**Strategy**:
- Batch size: 100 files per batch → 10 batches
- Parallel parsing: Parse next batch while uploading current batch
- Streaming: Don't load all files into memory at once

**Bottlenecks**:
- Network bandwidth: Uploading file content
- API processing: Backend creates Node entities

**Mitigation**:
- Compress file content before upload (gzip)
- Use HTTP/2 multiplexing (multiple requests over single connection)

### NFR-002: 1000-node workspace clone in <3 minutes

**Strategy**:
- Stream download: Write files as received (don't buffer entire ZIP in memory)
- Parallel extraction: Extract multiple files concurrently

**Bottlenecks**:
- Network bandwidth: Downloading ZIP file
- Disk I/O: Writing files to disk

**Mitigation**:
- Resume capability: Use HTTP Range header for partial downloads
- Async file writes: Use fs/promises for non-blocking writes

### NFR-003: Sync detection within 10 seconds

**Strategy**:
- Debounce file events: Wait 1 second after file change before syncing
- Calculate hashes only for changed files (not entire vault)
- Send hash comparison to backend (lightweight API call)

**Bottlenecks**:
- File hash calculation: SHA-256 on large files
- API latency: Network round-trip time

**Mitigation**:
- Use streaming hash calculation (don't load entire file into memory)
- Cache hashes in `.mujarrad/cache.json` (invalidate on file change)

## Security Considerations

### JWT Token Storage

**Decision**: OS keychain via keytar (Constitution Principle V)

**Security Properties**:
- Tokens encrypted by OS (Keychain Access, Credential Manager, libsecret)
- Requires user authentication to access keychain
- Tokens never stored in plaintext
- Tokens never logged or displayed

**Fallback Security**:
- If keychain unavailable: AES-256 encrypted JSON
- Encryption key derived from machine ID + user ID
- Still more secure than plaintext

### HTTPS Enforcement

**Decision**: HTTPS-only communication with backend

**Implementation**:
```typescript
import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.API_URL,  // Must be https://
  httpsAgent: new https.Agent({
    minVersion: 'TLSv1.2',  // Enforce TLS 1.2+
    rejectUnauthorized: true  // Reject self-signed certificates
  })
});
```

**Error Handling**:
- If API_URL starts with `http://` → throw error
- If certificate invalid → throw error (don't proceed)

### Input Validation

**Decision**: Validate all user inputs before file operations

**Validations**:
- Vault paths: Must exist, must be directory, must be readable
- Workspace IDs: Must be valid UUID
- Email: Must be valid email format
- Session IDs: Must be valid UUID

**Path Traversal Prevention**:
```typescript
import { resolve, normalize } from 'path';

function validateVaultPath(vaultPath: string, baseDir: string): void {
  const resolvedPath = resolve(normalize(vaultPath));
  const resolvedBase = resolve(normalize(baseDir));

  if (!resolvedPath.startsWith(resolvedBase)) {
    throw new Error('Path traversal detected');
  }
}
```

## Testing Strategy

### Unit Tests

**Coverage**: 80% minimum (Constitution Principle III)

**Test Subjects**:
- Services (AuthService, UploadService, SyncService, etc.)
- Parsers (MarkdownParser, CanvasParser)
- Utilities (Logger, ProgressBar, Validator)

**Mocking**:
- Mock API client (axios)
- Mock file system (fs/promises)
- Mock OS keychain (keytar)

### Integration Tests

**Test with mock API server** (using openapi.yaml contracts)

**Scenarios**:
- Complete upload workflow (scan → batch → upload → poll → complete)
- Complete sync workflow (detect → resolve → apply)
- Authentication flow (login → store token → use token → logout)

### E2E Tests

**Test with sample vault** (Constitution Principle VI)

**Sample Vault**: `/Users/mac/Developer/Software-Projects/Wider Projects/Wider-Mujarrad`

**Scenarios**:
- Upload Business Model Canvas vault (realistic structure)
- Sync with conflicts (modify files locally and remotely)
- Template application (apply template, verify structure)

**Performance Tests**:
- Upload 1000-file vault → assert <5 minutes (NFR-001)
- Clone 1000-node workspace → assert <3 minutes (NFR-002)

## Conclusion

All technical decisions resolved. CLI architecture designed to consume backend API as external service. Ready for implementation.

**Key Takeaways**:
- CLI is stateless (no database, only file system and config)
- CLI delegates business logic to backend API
- CLI focuses on file operations, user experience, and workflow orchestration
- TypeScript API client auto-generated from OpenAPI specification ensures sync with backend

**Next Steps**: Run `/tasks` to generate dependency-ordered implementation tasks.

**Status**: ✅ Research Complete
