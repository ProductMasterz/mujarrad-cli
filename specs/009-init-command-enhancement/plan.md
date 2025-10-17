# Implementation Plan: Init Command Enhancement

**Branch**: `009-init-command-enhancement` | **Date**: 2025-10-12 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/009-init-command-enhancement/spec.md`

**Note**: This template is filled in by the `/plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Transform the `mujarrad init` command from one-way vault upload into a comprehensive bidirectional synchronization tool. The enhancement adds pre-flight space validation, remote content pull with version history tracking, three-way merge detection using backend-provided common ancestor information, interactive conflict resolution with timeout handling, and transactional download operations with rollback on failure. This addresses critical production issues where users waste time uploading to non-existent spaces, lose remote edits during initialization, and face confusion about conflict handling.

**Technical Approach**: Extend existing CLI TypeScript codebase with new synchronization logic that queries backend version history API to detect divergence between local and remote states. Implement transactional staging directory pattern for atomic downloads with rollback capability. Reuse existing UploadService, SyncService, and ConflictResolver classes where possible. Backend development required for version history API endpoint.

## Technical Context

**Language/Version**: TypeScript 5.3+ with Node.js 18+
**Primary Dependencies**: Commander.js (CLI framework), Axios (HTTP client), Inquirer (interactive prompts), Ora (spinners), cli-progress (progress bars), Chalk (colors), simple-git (Git operations - optional), gray-matter (frontmatter parsing), @napi-rs/keyring (credential storage), winston (logging)
**Storage**: Local filesystem (~/.mujarrad/cache/ for node mappings, ~/.mujarrad/logs/ for conflict logs), remote PostgreSQL database via REST API
**Testing**: Jest (unit + integration tests), nock (HTTP mocking)
**Target Platform**: Node.js CLI (macOS, Linux, Windows)
**Project Type**: Single project (CLI tool)
**Performance Goals**: Space verification <2 seconds, pull 500 nodes in <60 seconds, handle 10,000 remote nodes without memory issues
**Constraints**: Must maintain backward compatibility (one-way upload when --sync omitted), atomic file operations (no partial writes), rollback on any download failure
**Scale/Scope**: 37 functional requirements, 5 non-functional requirements, 4 new backend API dependencies

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**This is a CLI tool, not a backend feature. The Mujarrad Backend Constitution does not apply directly to CLI implementation. However, relevant principles are adapted:**

### Adapted Principles for CLI Tool

**✅ API-First Design (Principle I - Adapted)**:
- CLI consumes existing backend REST APIs
- New backend endpoints required: GET `/api/spaces/{slug}`, GET `/api/spaces/{slug}/nodes`, GET `/api/nodes/{uuid}/versions/compare`
- Backend team must provide OpenAPI contracts for new endpoints before CLI integration
- **Status**: DEPENDENT - Backend API contracts required (see Dependencies section)

**✅ Test-Driven Development (Principle III - Applies)**:
- Unit tests required for all service methods (space verification, version comparison, conflict resolution)
- Integration tests required for file system operations (transactional download, rollback)
- Contract tests required to validate API client behavior against backend OpenAPI specs
- **Status**: PASS - Jest test framework already in place, TDD workflow will be followed

**✅ Transactional Integrity (Principle IV - Adapted for CLI)**:
- All download operations must use staging directory and atomic file moves
- Rollback on any failure during sync operation (FR-015, FR-016)
- Session tracking via backend UploadSession/SyncSession entities
- **Status**: PASS - Design includes transactional staging pattern

**✅ Security by Default (Principle V - Applies)**:
- Authentication tokens stored securely in system keychain via @napi-rs/keyring
- All API requests include authentication token
- Space access verified by backend before operations
- **Status**: PASS - Existing authentication infrastructure in place

**❌ Database Schema as Code (Principle II - Not Applicable)**:
- CLI does not manage database schema
- **Status**: N/A

**❌ Sample Data & Live Reference (Principle VI - Not Applicable)**:
- CLI tool does not include sample data
- **Status**: N/A

### Backend Dependencies

The following backend API endpoints are REQUIRED but do not yet exist. Backend development must be completed in parallel or before CLI implementation:

1. **GET `/api/spaces/{slug}`** - Space metadata retrieval (FR-001)
2. **GET `/api/spaces/{slug}/nodes`** - List all space nodes with pagination (FR-007)
3. **GET `/api/nodes/{uuid}/versions/compare`** - Node version comparison for common ancestor detection (FR-008)
4. **GET `/api/nodes/{uuid}/content`** - Download individual node content (dependency from spec)

**Backend constitution compliance**: These new endpoints must follow Mujarrad Backend Constitution Principle I (API-First Design) with OpenAPI contracts defined before implementation.

### Constitution Compliance Summary

| Principle | Status | Notes |
|-----------|--------|-------|
| API-First Design | ✅ DEPENDENT | Backend endpoints required (4 new endpoints) |
| Database Schema as Code | N/A | CLI tool does not manage schema |
| Test-Driven Development | ✅ PASS | Jest framework in place, TDD workflow planned |
| Transactional Integrity | ✅ PASS | Staging directory + rollback design |
| Security by Default | ✅ PASS | Keychain storage + auth tokens |
| Sample Data & Live Reference | N/A | CLI tool does not include sample data |

**Gate Status**: ✅ PASS (with backend dependency noted)

## Project Structure

### Documentation (this feature)

```
specs/009-init-command-enhancement/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (technical decisions)
├── data-model.md        # Phase 1 output (entities and state)
├── quickstart.md        # Phase 1 output (setup and usage guide)
├── contracts/           # Phase 1 output (backend API contracts - reference)
│   └── backend-api.yaml # OpenAPI spec for required backend endpoints
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)

```
src/
├── commands/
│   ├── init.ts                    # EXISTING - Main init command (to be enhanced)
│   ├── sync.ts                    # EXISTING - Sync command (logic to reuse)
│   └── auth.ts                    # EXISTING - Authentication commands
├── services/
│   ├── UploadService.ts           # EXISTING - Upload orchestration (to be extended)
│   ├── SyncService.ts             # EXISTING - Sync logic (to be reused)
│   ├── ConflictResolver.ts        # EXISTING - Conflict resolution (to be reused)
│   ├── SpaceValidator.ts      # NEW - Pre-flight space verification
│   ├── VersionComparator.ts       # NEW - Three-way merge detection
│   └── TransactionalDownloader.ts # NEW - Atomic download with rollback
├── filesystem/
│   ├── VaultScanner.ts            # EXISTING - Vault scanning
│   ├── MetadataManager.ts         # EXISTING - UUID extraction/embedding
│   ├── MarkdownParser.ts          # EXISTING - Frontmatter/wikilink parsing
│   └── CanvasParser.ts            # EXISTING - Canvas file parsing
├── api/
│   └── generated/
│       ├── api.ts                 # EXISTING - OpenAPI generated client (to be regenerated)
│       └── configuration.ts       # EXISTING - API configuration
├── config/
│   ├── ConfigManager.ts           # EXISTING - CLI configuration
│   └── CredentialManager.ts       # EXISTING - Keychain access
└── utils/
    ├── Logger.ts                  # EXISTING - Winston logger
    ├── CacheManager.ts            # EXISTING - Node mapping cache
    └── VaultValidator.ts          # EXISTING - Vault structure validation

tests/
├── unit/
│   ├── commands/
│   │   └── init.test.ts           # EXISTING - Init command tests (to be extended)
│   ├── services/
│   │   ├── SpaceValidator.test.ts      # NEW
│   │   ├── VersionComparator.test.ts       # NEW
│   │   └── TransactionalDownloader.test.ts # NEW
│   └── ...
├── integration/
│   ├── commands/
│   │   └── init-sync.test.ts      # NEW - Full sync flow integration test
│   └── ...
└── contract/
    └── backend-api.test.ts        # NEW - Validate CLI against backend OpenAPI spec
```

**Structure Decision**: Single project structure maintained. This is a CLI enhancement within existing TypeScript/Node.js codebase. Three new service classes added for space validation, version comparison, and transactional downloads. Existing services (UploadService, SyncService, ConflictResolver) will be extended/reused. Backend API client will be regenerated from updated OpenAPI specification once backend endpoints are available.

## Complexity Tracking

*No constitution violations requiring justification. All design choices align with adapted CLI principles.*

---

## Phase 0: Research & Technical Decisions

**Status**: COMPLETE

**Objective**: Resolve all technical unknowns and establish architectural patterns for bidirectional synchronization with backend version history.

### Research Tasks

1. **Backend Version History API Design**
   - **Unknown**: Exact API response format for GET `/api/nodes/{uuid}/versions`
   - **Research**: Investigate optimal response structure (full version history vs. just common ancestor hash)
   - **Decision Required**: How backend provides ancestor information (options: return all versions and let CLI find ancestor, or backend calculates ancestor and returns single hash)

2. **Transactional Download Pattern**
   - **Unknown**: Best practice for atomic file operations with rollback in Node.js
   - **Research**: Investigate staging directory patterns, temp file strategies, atomic rename operations
   - **Alternatives**: Write to temp directory + rename vs. write directly + delete on rollback vs. file system transactions

3. **Version Comparison Algorithm**
   - **Unknown**: How to determine "local ahead" vs. "remote ahead" vs. "diverged" using only hashes and timestamps
   - **Research**: Three-way merge algorithms, Git merge-base patterns, hash-based divergence detection
   - **Decision Required**: Whether timestamp comparison alone is sufficient or if we need full version graph traversal

4. **Interactive Prompt Timeout Implementation**
   - **Unknown**: How to implement 120-second timeout with graceful skip in Inquirer.js
   - **Research**: Inquirer timeout patterns, async timeout handling, user experience for timed-out prompts
   - **Alternatives**: Set timeout on prompt vs. wrap prompt in Promise.race vs. use custom Inquirer plugin

5. **Backend API Pagination Strategy**
   - **Unknown**: Expected pagination format for GET `/api/spaces/{slug}/nodes` (potentially 10,000+ nodes)
   - **Research**: Cursor-based vs. offset-based pagination, streaming downloads, memory-efficient processing
   - **Decision Required**: How to handle spaces exceeding memory limits (NFR-004: handle 10,000 nodes)

6. **Conflict Resolution Storage**
   - **Unknown**: Format for logging skipped conflicts for later manual resolution
   - **Research**: Log file formats, conflict metadata structure, user workflow for resolving skipped conflicts
   - **Decision Required**: Whether to store conflicts in local database/cache or just log files

7. **Backward Compatibility Testing**
   - **Unknown**: How to ensure existing `mujarrad init` behavior (without --sync) remains unchanged
   - **Research**: Regression testing strategies, feature flag patterns, version compatibility tests
   - **Decision Required**: Whether to use feature flags or conditional logic based on flag presence

8. **Git Integration (Optional Dependency)**
   - **Unknown**: Fallback behavior when Git is not available for change detection
   - **Research**: Hash-based change detection vs. timestamp comparison vs. requiring Git
   - **Decision Required**: Whether Git is truly optional or should be required for --sync mode

**Output**: research.md documenting all decisions with rationale and alternatives considered

---

## Phase 1: Design & Contracts

**Status**: COMPLETE

**Objective**: Define data models, API contracts, and quickstart guide for implementation.

### Deliverables

1. **data-model.md**
   - Entity: SpaceMetadata (slug, name, owner, nodeCount, userPermissions)
   - Entity: RemoteNode (uuid, title, content, filePath, hash, lastModified, ancestorHash)
   - Entity: LocalFile (absolutePath, relativePath, content, hash, modificationTimestamp)
   - Entity: ComparisonResult (filePath, classification: IDENTICAL | LOCAL_ONLY | REMOTE_ONLY | LOCAL_AHEAD | REMOTE_AHEAD | CONFLICTED, localRef, remoteRef, ancestorHash)
   - Entity: ConflictResolution (filePath, strategy: KEEP_LOCAL | KEEP_REMOTE | SKIP, timestamp, reason)
   - Entity: SyncSession (sessionId, spaceSlug, startTime, downloadedNodes, uploadedNodes, skippedConflicts, status: IN_PROGRESS | COMPLETED | FAILED)
   - State Machine: Sync Operation States (VALIDATING_SPACE → PULLING_REMOTE → COMPARING → RESOLVING_CONFLICTS → UPLOADING_LOCAL → COMPLETED/FAILED)
   - Validation Rules: From FR-001 to FR-037 and NFR-001 to NFR-005

2. **contracts/backend-api.yaml**
   - OpenAPI 3.0 specification for 4 required backend endpoints:
     - GET `/api/spaces/{slug}` (space metadata)
     - GET `/api/spaces/{slug}/nodes` (list nodes with pagination)
     - GET `/api/nodes/{uuid}/versions` (version history)
     - GET `/api/nodes/{uuid}/content` (download content)
   - Request/response schemas with examples
   - Error response formats (400, 401, 403, 404, 500)
   - Authentication requirements (JWT Bearer token)
   - **Note**: This is a REFERENCE contract for the CLI to validate against. Actual backend implementation follows Mujarrad Backend Constitution.

3. **quickstart.md**
   - Installation: `npm install -g mujarrad-cli@latest`
   - Authentication: `mujarrad auth login`
   - Space setup: Create space via web UI
   - One-way upload (backward compatible): `mujarrad init . --space my-space`
   - Bidirectional sync (new): `mujarrad init . --space my-space --sync`
   - Conflict resolution strategies: `--strategy KEEP_LOCAL | KEEP_REMOTE | SKIP`
   - Troubleshooting: Common errors (space not found, network failures, timeout)
   - Examples: Real-world scenarios with expected output

**Output**: data-model.md, contracts/backend-api.yaml, quickstart.md

---

## Phase 2: Task Generation

**Status**: READY (run `/tasks` command to generate implementation breakdown)

**Note**: This phase is NOT executed by `/plan`. After Phase 0 and Phase 1 are complete, run `/tasks` command to generate dependency-ordered implementation tasks in tasks.md.

---

## Next Steps

1. ✅ Run `/plan` command (COMPLETE)
2. ✅ Execute Phase 0: Research technical decisions (COMPLETE - research.md created)
3. ✅ Execute Phase 1: Generate data model and contracts (COMPLETE - data-model.md, contracts/backend-api.yaml, quickstart.md created)
4. ⏭️ Review plan.md, research.md, data-model.md, contracts/, quickstart.md
5. ⏭️ Run `/tasks` command to generate implementation tasks
6. ⏭️ Begin TDD implementation cycle per tasks.md

**Current Status**: Planning complete. Ready for `/tasks` command to generate implementation breakdown.
