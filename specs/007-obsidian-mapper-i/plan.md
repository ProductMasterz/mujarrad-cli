# Implementation Plan: Obsidian Mapper Integration CLI

**Branch**: `007-obsidian-mapper-i` | **Date**: 2025-10-09 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/007-obsidian-mapper-i/spec.md`

**Note**: This template is filled in by the `/plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Implement a **desktop CLI tool** for bidirectional synchronization between Obsidian vaults and Mujarrad workspaces. The CLI enables users to upload Obsidian notes, folders, and canvases to Mujarrad backend, clone workspaces back to Obsidian, and maintain bidirectional sync with conflict resolution. Key capabilities include batch file uploads, progress tracking with resume capability, automated sync workflows, template application, and version history management.

**Critical Note**: This project is the **CLI tool only**. The backend REST API is a separate project (see `contracts/openapi.yaml` for API specification). The CLI consumes backend APIs to orchestrate desktop operations.

## Technical Context

**Language/Version**: Node.js 18+ / TypeScript 5+

**Primary Dependencies**:
- **CLI Framework**: Commander.js 11+ (command parsing and help generation)
- **API Client**: Axios 1.6+ (HTTP client for backend API calls)
- **Code Generation**: openapi-generator-cli (auto-generate TypeScript client from OpenAPI spec)
- **File System**: chokidar 3+ (file watching for continuous sync)
- **Markdown Parsing**: remark 15+ / unified (parse markdown, extract frontmatter and wikilinks)
- **Canvas Parsing**: Native JSON parsing (Obsidian `.canvas` files are JSON)
- **Configuration**: cosmiconfig 8+ (YAML/JSON config file management)
- **Credentials**: keytar 7+ (secure credential storage via OS keychain)
- **Progress UI**: ora 7+ (spinners), cli-progress 3+ (progress bars)
- **Logging**: winston 3+ (structured logging to `~/.mujarrad/logs/`)
- **Testing**: Jest 29+ (unit tests), Supertest (E2E API tests)

**Storage**:
- Configuration: `~/.mujarrad/config.yml`
- Credentials: OS keychain via keytar (fallback: `~/.mujarrad/credentials.json` encrypted)
- Mappings: `.mujarrad/mappings.json` (file path ↔ Node UUID bidirectional map)
- Logs: `~/.mujarrad/logs/` (upload, sync, error logs)

**Testing**:
- Jest (unit tests for services, parsers, utilities)
- Supertest (integration tests with mock backend)
- Sample vault E2E tests (using Constitution Principle VI sample vault)
- Mock API server (using openapi.yaml contracts)

**Target Platform**: Desktop (macOS, Linux, Windows)

**Project Type**: CLI tool (distributed via npm, later pip and standalone binaries)

**Performance Goals**:
- 1000-file vault upload in <5 minutes (NFR-001)
- 1000-node workspace clone in <3 minutes (NFR-002)
- Sync detection within 10 seconds of file change (NFR-003)
- CLI startup time <1 second

**Constraints**:
- Must work offline for vault scanning and local operations
- Must handle network interruptions gracefully (resume capability)
- Must support 10,000-file vaults without memory overflow (streaming processing)
- Must not corrupt local vault files under any circumstances

**Scale/Scope**:
- Support vaults up to 10,000 files (NFR-006)
- Handle canvases with up to 500 nodes (NFR-007)
- Deeply nested folders up to 20 levels (NFR-008)
- Notes with up to 1000 wikilinks (NFR-009)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Status**: ✅ **PASS** - Constitution v1.1.0 ratified 2025-10-09

### Principle Compliance

**I. API-First Design**
- ✅ CLI consumes backend API defined in `contracts/openapi.yaml`
- ✅ TypeScript API client auto-generated from OpenAPI specification
- ✅ No CLI-specific API changes (CLI adapts to backend contract)

**II. Database Schema as Code**
- N/A - CLI is stateless (no database, only file system and config files)
- ✅ Backend handles schema migrations (CLI consumes API regardless of schema version)

**III. Test-Driven Development (NON-NEGOTIABLE)**
- ✅ Test structure defined: unit/, integration/, e2e/
- ✅ Sample vault E2E tests planned (Constitution Principle VI)
- ⚠️ TDD cycle must be enforced during implementation (tests before code)

**IV. Transactional Integrity**
- ✅ CLI tracks operations via backend UploadSession and SyncSession entities
- ✅ Resume capability for failed uploads/syncs via session IDs
- ✅ Local file writes use atomic operations (temp file → rename)

**V. Security by Default**
- ✅ JWT tokens stored in OS keychain (keytar library)
- ✅ HTTPS-only communication with backend (TLS 1.2+)
- ✅ User-provided vault paths validated before file operations
- ✅ No plaintext credentials in config files

**VI. Sample Data & Live Reference**
- ✅ E2E tests use sample vault: `/Users/mac/Developer/Software-Projects/Wider Projects/Wider-Mujarrad`
- ✅ Integration tests verify Business Model Canvas and Value Proposition Canvas uploads
- ✅ Performance tests use realistic vault structure from sample

### No Violations

All constitution principles align with CLI requirements. CLI delegates backend concerns (schema, transactions) to API.

## Project Structure

### Documentation (this feature)

```
specs/007-obsidian-mapper-i/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── cli-architecture.md  # Phase 1 output (/plan command)
├── cli-commands.md      # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
│   └── openapi.yaml     # Backend API specification (for client generation)
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)

```
mujarrad-cli/
├── src/
│   ├── commands/
│   │   ├── auth.ts                    # Auth commands (login, logout, status)
│   │   ├── workspace.ts               # Workspace commands (list, create, delete, link)
│   │   ├── upload.ts                  # Upload commands (upload, status, resume)
│   │   ├── clone.ts                   # Clone commands (clone, status)
│   │   ├── sync.ts                    # Sync commands (sync, --watch, --dry-run)
│   │   ├── template.ts                # Template commands (list, create, apply)
│   │   └── history.ts                 # Version history commands (history, rollback, diff)
│   ├── services/
│   │   ├── AuthService.ts             # Authentication and token management
│   │   ├── WorkspaceService.ts        # Workspace CRUD operations
│   │   ├── UploadService.ts           # Batch upload orchestration
│   │   ├── CloneService.ts            # Workspace export and download
│   │   ├── SyncService.ts             # Bidirectional sync logic
│   │   ├── TemplateService.ts         # Template CRUD and instantiation
│   │   └── VersionService.ts          # Git history and rollback
│   ├── api/
│   │   ├── generated/                 # Auto-generated from openapi.yaml
│   │   │   ├── api.ts                 # API client classes
│   │   │   └── models.ts              # TypeScript types
│   │   ├── client.ts                  # Axios wrapper with interceptors
│   │   ├── interceptors.ts            # Auth token injection, error handling
│   │   └── retry.ts                   # Exponential backoff retry logic
│   ├── filesystem/
│   │   ├── VaultScanner.ts            # Recursive vault folder scanning
│   │   ├── MarkdownParser.ts          # Parse .md files, extract wikilinks
│   │   ├── CanvasParser.ts            # Parse .canvas JSON files
│   │   ├── FileWriter.ts              # Atomic file writes (temp → rename)
│   │   ├── MappingManager.ts          # .mujarrad/mappings.json CRUD
│   │   └── FileWatcher.ts             # chokidar wrapper for --watch mode
│   ├── config/
│   │   ├── ConfigManager.ts           # ~/.mujarrad/config.yml management
│   │   ├── CredentialManager.ts       # OS keychain via keytar
│   │   └── defaults.ts                # Default config values
│   ├── workflows/
│   │   ├── InitialUploadWorkflow.ts   # Pattern 1: Initial vault upload
│   │   ├── ContinuousSyncWorkflow.ts  # Pattern 2: Continuous sync (--watch)
│   │   ├── TemplateCloneWorkflow.ts   # Pattern 3: Template instantiation
│   │   ├── ConflictResolutionUI.ts    # Pattern 4: Interactive conflict UI
│   │   └── TemplateApplyWorkflow.ts   # Pattern 5: Apply template to workspace
│   ├── utils/
│   │   ├── Logger.ts                  # Winston wrapper for structured logs
│   │   ├── ProgressBar.ts             # cli-progress wrapper
│   │   ├── Spinner.ts                 # ora wrapper
│   │   ├── ErrorHandler.ts            # Global error handling
│   │   ├── Validator.ts               # Input validation (paths, emails, etc.)
│   │   └── AutoUpdater.ts             # Check for new CLI versions (npm registry)
│   └── index.ts                       # Main CLI entry point
├── tests/
│   ├── unit/
│   │   ├── services/
│   │   ├── filesystem/
│   │   ├── workflows/
│   │   └── utils/
│   ├── integration/
│   │   ├── api/                       # Mock backend API tests
│   │   ├── vault/                     # Vault scanning and parsing tests
│   │   └── config/                    # Config and credential tests
│   ├── e2e/
│   │   ├── upload.test.ts             # Upload sample vault E2E
│   │   ├── sync.test.ts               # Bidirectional sync E2E
│   │   ├── template.test.ts           # Template application E2E
│   │   └── fixtures/
│   │       └── sample-vault/          # Symlink to Constitution Principle VI vault
│   └── mocks/
│       ├── api-server.ts              # Mock backend using openapi.yaml
│       └── vault-generator.ts         # Generate test vaults programmatically
├── docs/
│   ├── cli-quickstart.md              # User guide for first-time setup
│   ├── cli-commands.md                # Complete command reference
│   ├── workflows.md                   # Automated workflow patterns
│   └── troubleshooting.md             # Common errors and solutions
├── .github/
│   └── workflows/
│       ├── test.yml                   # CI: run Jest tests
│       ├── publish-npm.yml            # Publish to npm registry
│       └── release.yml                # Create GitHub release with binaries
├── package.json                       # NPM package definition
├── tsconfig.json                      # TypeScript configuration
├── jest.config.js                     # Jest configuration
├── .npmignore                         # Exclude tests and docs from npm package
├── README.md                          # CLI overview and installation
└── LICENSE                            # MIT License
```

**Structure Decision**: Monorepo CLI tool project. No backend code in this repository. Backend API is consumed as external service (https://mujarrad.onrender.com).

## Complexity Tracking

*Fill ONLY if Constitution Check has violations that must be justified*

No violations to track. All constitution principles align with CLI requirements.

## Phase 0: Research

**Status**: ✅ **COMPLETE** (2025-10-09)

### Research Summary

All 8 research topics resolved via backend API analysis and CLI framework research. Key finding: **Backend API already exists** at https://mujarrad.onrender.com - CLI consumes this API.

**Primary Sources**:
- `contracts/openapi.yaml`: Complete backend API specification (1315 lines)
- Existing API: https://mujarrad.onrender.com/swagger-ui/index.html
- Sample Vault: `/Users/mac/Developer/Software-Projects/Wider Projects/Wider-Mujarrad` (Constitution Principle VI)

### Key Decisions (Documented in research.md)

1. **CLI Framework**: Commander.js (most popular Node.js CLI framework, 28k+ GitHub stars)
2. **API Client Generation**: openapi-generator-cli (generates TypeScript client from openapi.yaml)
3. **Batch Upload Strategy**: Split into 100-file batches, upload via `POST /api/workspaces/{id}/upload/batch`, track via UploadSession
4. **Credential Storage**: keytar (OS keychain integration), fallback to encrypted JSON
5. **Sync Detection**: File hash comparison (SHA-256), send hashes to `POST /api/workspaces/{id}/sync/detect`
6. **Conflict Resolution**: Interactive CLI prompts using inquirer.js, default to last-write-wins
7. **File Watching**: chokidar (cross-platform file watcher, debounced events)
8. **Auto-Update**: Compare local version with npm registry, prompt user to upgrade

### Research Output

See `research.md` for complete CLI-specific research including:
- CLI framework comparison (Commander vs Yargs vs oclif)
- API client generation tools (openapi-generator vs swagger-codegen)
- Credential storage security analysis
- File watching performance benchmarks
- NPM distribution best practices

**No open research questions remain** - ready for CLI implementation.

## Phase 1: Design Artifacts

**Status**: ✅ **COMPLETE** (2025-10-09)

### CLI Architecture

See `cli-architecture.md` for complete architecture documentation.

**Layer 1: Command Layer** (`src/commands/`)
- Parse user input via Commander.js
- Validate arguments (paths, emails, UUIDs)
- Display help text and examples
- Delegate to service layer

**Layer 2: Service Layer** (`src/services/`)
- AuthService: Login/logout, token refresh, credential management
- WorkspaceService: Workspace CRUD via API
- UploadService: Batch upload orchestration, progress tracking
- CloneService: Workspace export and file writing
- SyncService: Change detection, conflict resolution
- TemplateService: Template CRUD and instantiation
- VersionService: Git history queries via API

**Layer 3: Workflow Layer** (`src/workflows/`)
- Orchestrate multi-step operations
- Handle retries and error recovery
- Display progress UI (spinners, progress bars)
- Log detailed operation traces

**Layer 4: API Client Layer** (`src/api/`)
- Auto-generated TypeScript client from `contracts/openapi.yaml`
- Request/response interceptors (auth token, error mapping)
- Retry logic with exponential backoff
- Timeout handling

**Layer 5: File System Layer** (`src/filesystem/`)
- VaultScanner: Recursive vault scanning (respects .gitignore)
- MarkdownParser: Extract frontmatter, wikilinks using remark
- CanvasParser: Parse `.canvas` JSON, extract nodes/edges
- FileWriter: Atomic writes (prevent corruption)
- MappingManager: CRUD for `.mujarrad/mappings.json`

### CLI Commands

See `cli-commands.md` for complete command reference with examples.

**Authentication**:
```bash
mujarrad auth login                    # Authenticate with backend
mujarrad auth logout                   # Clear stored credentials
mujarrad auth status                   # Check current authentication
```

**Workspace**:
```bash
mujarrad workspace list                # List all workspaces
mujarrad workspace create <name>       # Create new workspace
mujarrad workspace delete <id>         # Delete workspace
mujarrad workspace link <vault-path>   # Link local vault to workspace
```

**Upload** (Obsidian → Mujarrad):
```bash
mujarrad upload <vault-path>           # Upload entire vault
mujarrad upload <vault-path> --watch   # Watch for changes and auto-sync
mujarrad upload status <session-id>    # Check upload progress
mujarrad upload resume <session-id>    # Resume failed upload
```

**Clone** (Mujarrad → Obsidian):
```bash
mujarrad clone <workspace-id> <dest>   # Clone workspace to local folder
mujarrad clone status <job-id>         # Check clone progress
```

**Sync** (Bidirectional):
```bash
mujarrad sync                          # Sync current vault (detect changes both ways)
mujarrad sync --dry-run               # Show what would change without applying
mujarrad sync --watch                 # Continuous sync mode (watch for file changes)
mujarrad sync --force-local           # Local wins all conflicts
mujarrad sync --force-remote          # Remote wins all conflicts
```

**Template**:
```bash
mujarrad template list                 # List available templates
mujarrad template create <name>        # Create template from workspace
mujarrad template apply <template-id>  # Apply template to current workspace
```

**Version History**:
```bash
mujarrad history <file-path>           # Show Git history for file
mujarrad rollback <file-path> <version> # Rollback file to version
mujarrad diff <file-path> <version>    # Show diff between versions
```

### Automated Workflow Patterns

See `workflows.md` for detailed workflow documentation.

#### **Pattern 1: Initial Vault Upload**

**User Command**: `mujarrad upload /path/to/vault`

**Workflow Steps**:
1. **Scan vault**: VaultScanner recursively finds all `.md` and `.canvas` files
2. **Create session**: POST `/api/workspaces/{id}/upload/batch` (empty batch to create UploadSession)
3. **Split into batches**: Group files into batches of 100
4. **For each batch**:
   - Parse markdown files → extract wikilinks, frontmatter
   - Parse canvas files → extract nodes, edges, visual properties
   - Upload batch via POST `/api/workspaces/{id}/upload/batch`
   - Poll GET `/api/workspaces/{id}/upload/status` until batch processed
   - Update progress bar (e.g., "Uploading batch 3/10... 300/1000 files")
   - Log to `~/.mujarrad/logs/upload-{session-id}.log`
5. **On completion**: Write `.mujarrad/mappings.json` (file path ↔ Node UUID)
6. **On failure**: Store session ID in config, allow `mujarrad upload resume <session-id>`

**Error Handling**:
- Network timeout → retry batch with exponential backoff (3 attempts)
- API 409 Conflict (duplicate file) → skip file, continue batch
- API 500 Internal Server Error → abort batch, mark session as FAILED
- CTRL+C (user interrupt) → gracefully stop, save session ID for resume

#### **Pattern 2: Continuous Sync**

**User Command**: `mujarrad sync --watch`

**Workflow Steps**:
1. **Initial sync**: Detect changes via POST `/api/workspaces/{id}/sync/detect`
2. **Resolve conflicts**: If conflicts found, run ConflictResolutionUI
3. **Apply changes**: POST `/api/workspaces/{id}/sync/apply`
4. **Start file watcher**: chokidar watches vault folder for changes
5. **On file change detected**:
   - Debounce events (wait 1 second for batch of changes)
   - Calculate file hashes (SHA-256)
   - POST `/api/workspaces/{id}/sync/detect` with changed file hashes
   - If no conflicts → auto-apply changes
   - If conflicts → prompt user (interactive or auto-resolve based on config)
6. **Log sync events**: `~/.mujarrad/logs/sync-{date}.log`
7. **Handle errors**: Network loss → queue changes locally, retry when online

**Performance**: Debounce file events to avoid excessive API calls (e.g., saving file triggers 3 events → wait 1 second → batch into 1 API call)

#### **Pattern 3: Clone Workspace from Template**

**User Command**: `mujarrad template apply weekly-review`

**Workflow Steps**:
1. **Find template**: GET `/api/templates?name=weekly-review`
2. **Prompt for placeholders**:
   ```
   Template requires 2 values:
   - week_of (date): 2025-10-15
   - year (integer): 2025
   ```
3. **Instantiate template**: POST `/api/workspaces/{id}/instantiate` with placeholders
4. **Poll export status**: GET `/api/workspaces/{id}/export/status` until COMPLETED
5. **Download workspace**: GET `/api/workspaces/{id}/export/download` (ZIP file)
6. **Extract locally**: Unzip to `./weekly-review-2025-10-15/`
7. **Write mappings**: `.mujarrad/mappings.json`
8. **Success message**: "Workspace created in ./weekly-review-2025-10-15/"

#### **Pattern 4: Conflict Resolution UI**

**User Command**: `mujarrad sync` (when conflicts detected)

**Workflow Steps**:
1. **Detect conflicts**: POST `/api/workspaces/{id}/sync/detect` returns conflicts array
2. **For each conflict**:
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
3. **User input**: Press L/R/V/S/A
4. **If 'A' (auto-resolve)**: Prompt for strategy:
   ```
   Auto-resolve strategy:
   [1] Last write wins (recommended)
   [2] Local always wins
   [3] Remote always wins
   > _
   ```
5. **Record decisions**: Build changes array for `/sync/apply`
6. **Apply changes**: POST `/api/workspaces/{id}/sync/apply` with conflict resolutions
7. **Update local files**: Write remote changes to local vault
8. **Update mappings**: `.mujarrad/mappings.json`

#### **Pattern 5: Template Application (Clone)**

**User Command**: `mujarrad clone <workspace-id> <dest-folder>`

**Workflow Steps**:
1. **Request export**: POST `/api/workspaces/{id}/export` with format=obsidian
2. **Poll status**: GET `/api/workspaces/{id}/export/status` (show progress bar)
3. **Download ZIP**: GET `/api/workspaces/{id}/export/download` when status=COMPLETED
4. **Extract files**: Unzip to `<dest-folder>`
5. **Verify structure**:
   - All `.md` files extracted
   - All `.canvas` files extracted
   - Folder structure preserved
   - `.mujarrad/mappings.json` present
6. **Success message**: "Workspace cloned to <dest-folder>/ (1,234 files)"

**Error Handling**:
- Export job fails → retry with exponential backoff
- Download interrupted → resume from byte offset (HTTP Range header)
- Disk full → abort, clean up partial files

### API Contracts

See `contracts/openapi.yaml` (lines 1-1315) for complete backend API specification.

**CLI uses these endpoint categories**:
1. ✅ Authentication APIs: `/api/auth/login`, `/api/auth/logout`
2. ✅ Workspace APIs: `/api/workspaces` (list, create, delete)
3. ✅ Upload APIs: `/api/workspaces/{id}/upload/batch`, `/api/workspaces/{id}/upload/status`
4. ✅ Clone APIs: `/api/workspaces/{id}/export`, `/api/workspaces/{id}/export/status`, `/api/workspaces/{id}/export/download`
5. ✅ Sync APIs: `/api/workspaces/{id}/sync/detect`, `/api/workspaces/{id}/sync/apply`
6. ✅ Template APIs: `/api/templates`, `/api/workspaces/{id}/instantiate`
7. ✅ Version History APIs: `/api/nodes/{id}/versions`, `/api/nodes/{id}/rollback`

**API Client Generation**:
```bash
# Generate TypeScript client from openapi.yaml
npm run generate-api-client

# Behind the scenes:
openapi-generator-cli generate \
  -i specs/007-obsidian-mapper-i/contracts/openapi.yaml \
  -g typescript-axios \
  -o src/api/generated \
  --additional-properties=supportsES6=true,npmName=mujarrad-api-client
```

### Quickstart Guide

See `quickstart.md` for CLI installation and first-time setup.

**Covers**:
- NPM installation: `npm install -g mujarrad-cli`
- First-time setup: `mujarrad auth login`
- Upload first vault: `mujarrad upload /path/to/vault`
- Clone workspace: `mujarrad clone <workspace-id> ./my-vault`
- Continuous sync: `mujarrad sync --watch`
- Template application: `mujarrad template apply <template-id>`
- Troubleshooting common errors

## Phase 2: Task Breakdown

**Status**: ⏳ **READY** (requires `/tasks` command)

All Phase 0 and Phase 1 artifacts complete. Ready to generate dependency-ordered implementation tasks.

**Expected Task Categories**:
1. **Project Setup**: Initialize npm project, TypeScript config, Jest config
2. **API Client**: Generate TypeScript client from openapi.yaml
3. **Configuration**: ConfigManager, CredentialManager (keytar integration)
4. **File System**: VaultScanner, MarkdownParser, CanvasParser, FileWriter, MappingManager
5. **Services**: AuthService, WorkspaceService, UploadService, CloneService, SyncService, TemplateService, VersionService
6. **Commands**: auth, workspace, upload, clone, sync, template, history (Commander.js)
7. **Workflows**: InitialUploadWorkflow, ContinuousSyncWorkflow, TemplateCloneWorkflow, ConflictResolutionUI, TemplateApplyWorkflow
8. **Utilities**: Logger, ProgressBar, Spinner, ErrorHandler, Validator, AutoUpdater
9. **Testing**: Unit tests (Jest), Integration tests (mock API), E2E tests (sample vault)
10. **Documentation**: README, cli-quickstart.md, cli-commands.md, workflows.md
11. **Distribution**: npm package, GitHub Actions CI/CD, auto-update mechanism

## Distribution Strategy

### Phase 1: NPM Package (First Release)

**Target**: Node.js developers and power users

**Installation**:
```bash
# Global installation
npm install -g mujarrad-cli

# NPX usage (no installation)
npx mujarrad-cli upload /path/to/vault
```

**Publishing**:
```bash
# Bump version
npm version minor

# Publish to npm registry
npm publish

# GitHub Actions: .github/workflows/publish-npm.yml
# Triggers on: git tag push (e.g., v1.0.0)
```

**Auto-Update**:
```typescript
// src/utils/AutoUpdater.ts
async checkForUpdates() {
  const currentVersion = require('../../package.json').version;
  const latestVersion = await fetch('https://registry.npmjs.org/mujarrad-cli/latest')
    .then(r => r.json())
    .then(data => data.version);

  if (semver.gt(latestVersion, currentVersion)) {
    console.log(`Update available: ${currentVersion} → ${latestVersion}`);
    console.log('Run: npm install -g mujarrad-cli@latest');
  }
}
```

### Phase 2: Python Package (Future)

**Target**: Python developers and data scientists

**Installation**:
```bash
pip install mujarrad-cli
# OR
pipx install mujarrad-cli
```

**Implementation**: Wrap Node.js CLI with Python subprocess calls, or rewrite in Python (future decision)

### Phase 3: Standalone Binaries (Future)

**Target**: Non-technical users

**Tools**: pkg (Node.js to binary) or nexe

**Binaries**:
- `mujarrad-macos-x64`
- `mujarrad-linux-x64`
- `mujarrad-win-x64.exe`

**Distribution**: GitHub Releases, direct download links

### Phase 4: Platform-Specific Executables (Future)

**Target**: App store distribution

**Formats**:
- macOS: `.dmg` installer, signed and notarized
- Windows: `.exe` installer, signed with code signing certificate
- Linux: `.deb`, `.rpm`, AppImage

**Distribution**:
- macOS App Store (future)
- Microsoft Store (future)
- Snap Store / Flathub (Linux)

## Notes

- ✅ Phase 0 (Research) complete - CLI framework and API client decisions made
- ✅ Phase 1 (Design) complete - cli-architecture.md, cli-commands.md, workflows.md, quickstart.md generated
- ✅ Constitution v1.1.0 ratified - all principles compliant (including Principle VI sample vault testing)
- ⏳ Phase 2 (Tasks) ready - run `/tasks` to generate implementation breakdown
- This plan covers **CLI tool only** - backend API is external dependency
- 9 clarifications remain unresolved in spec.md (backend concerns, not CLI concerns)
- CLI must gracefully handle backend API changes (defensive programming, version compatibility checks)
