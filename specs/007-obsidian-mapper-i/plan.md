# Implementation Plan: Obsidian Mapper Integration

**Branch**: `007-obsidian-mapper-i` | **Date**: 2025-10-10 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/007-obsidian-mapper-i/spec.md`

**Note**: This template is filled in by the `/plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Implement a TypeScript CLI tool that enables bidirectional synchronization between Obsidian vaults (local markdown files, folders, canvas visualizations) and Mujarrad spaces (cloud-based knowledge graph storage). The CLI handles local file system operations, Git version control, Obsidian format parsing (markdown, canvas JSON), and REST API communication with the existing Mujarrad Spring Boot backend. Key features include: vault upload with batch processing, space cloning to local Obsidian format, incremental sync with Git integration, canvas visual preservation via JSONB storage, template-based space creation, and automatic content generation (canvas-to-file conversion, auto-context folder creation).

## Technical Context

**Language/Version**: TypeScript 5.3+ with Node.js 18+
**Primary Dependencies**: axios (HTTP client), chalk (CLI formatting), commander (CLI framework), simple-git (Git operations), gray-matter (frontmatter parsing)
**Storage**: Local file system (Obsidian vaults) + remote PostgreSQL 14 (via REST API to Spring Boot backend)
**Testing**: Jest 29.7+ with ts-jest for unit/integration tests
**Target Platform**: Cross-platform CLI (macOS, Linux, Windows)
**Project Type**: Single TypeScript project (CLI tool) consuming REST APIs from separate Spring Boot backend
**Performance Goals**: Upload 1000 files in <5 minutes (NFR-001), clone 1000 nodes in <3 minutes (NFR-002), sync changes in <10 seconds (NFR-003), API response <500ms p95 (NFR-004)
**Constraints**: UTF-8 encoding only, Git 2.20+ required, file permissions 600 for credentials, HTTPS/TLS 1.2+ for API calls, batch uploads with backend-determined sizes
**Scale/Scope**: Support vaults up to 10,000 files (NFR-006), canvases with 500 nodes (NFR-007), 20-level folder depth (NFR-008), 1000 wikilinks per note (NFR-009)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Principle I: API-First Design ✅
**Status**: PASS - Backend API contracts already exist in spec (8 endpoint categories, 25+ endpoints defined)
- OpenAPI 3.0 specification required in Phase 1
- CLI is API consumer, backend owns contracts
- **Action**: Generate OpenAPI spec from spec.md API definitions in Phase 1

### Principle II: Database Schema as Code ✅
**Status**: PASS - Backend responsibility, not CLI concern
- CLI does not directly access PostgreSQL
- CLI interacts via REST API only
- Backend enforces Flyway migrations (separate project)

### Principle III: Test-Driven Development (TDD) ✅
**Status**: PASS - Committed to TDD workflow
- Jest + ts-jest configured for unit/integration tests
- 80% coverage minimum required
- **Action**: Write tests before implementation for all services

### Principle IV: Transactional Integrity ✅
**Status**: PASS - Handled at both CLI and backend levels
- CLI implements rollback via Git reset on sync failure (FR-CLI-024)
- Backend ensures transactional operations via @Transactional
- Session entities (UploadSession, SyncSession) track progress
- **Action**: Implement local rollback logic in CLI error handlers

### Principle V: Security by Default ✅
**Status**: PASS - Security requirements defined
- Credentials stored with 600 permissions (NFR-016)
- HTTPS/TLS 1.2+ for all API calls (NFR-017)
- JWT tokens for authentication (backend implements)
- **Action**: Implement secure token storage in ~/.mujarrad/credentials.json

### Principle VI: Sample Data & Live Reference ✅
**Status**: PASS - Sample vault available for integration tests
- Sample vault: /Users/mac/Developer/Software-Projects/Wider Projects/Wider-Mujarrad
- Integration tests can use real BMC/VPC canvas files
- **Action**: Reference sample vault in integration test setup

## Project Structure

### Documentation (this feature)

```
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```
src/
├── api/                      # Generated TypeScript API client from OpenAPI
│   └── generated/            # (Task 1.1 - COMPLETE per IMPLEMENTATION_STATUS.md)
├── commands/                 # CLI command implementations
│   ├── upload.ts            # mujarrad upload
│   ├── clone.ts             # mujarrad clone
│   ├── sync.ts              # mujarrad sync
│   ├── pull.ts              # mujarrad pull
│   ├── templates.ts         # mujarrad templates list
│   └── share.ts             # mujarrad share
├── config/                   # Configuration management (Task 1.2)
│   ├── ConfigManager.ts     # Credentials, API base URL, cache paths
│   └── types.ts             # Config type definitions
├── filesystem/               # File system operations
│   ├── VaultScanner.ts      # Recursive .md/.canvas file discovery
│   ├── MarkdownParser.ts    # Frontmatter, wikilinks, metadata extraction
│   ├── CanvasParser.ts      # Canvas JSON parsing and validation
│   └── MetadataEmbedder.ts  # UUID injection as HTML comments
├── services/                 # Business logic services
│   ├── UploadService.ts     # Batch upload orchestration
│   ├── CloneService.ts      # Space-to-vault conversion
│   ├── SyncService.ts       # Bidirectional sync logic
│   ├── GitService.ts        # Git operations (init, commit, log, diff)
│   ├── AuthService.ts       # Token management, refresh logic
│   └── TemplateService.ts   # Template listing and cloning
├── workflows/                # High-level workflows
│   ├── UploadWorkflow.ts    # Upload orchestration (scan → batch → upload)
│   ├── CloneWorkflow.ts     # Clone orchestration (fetch → reconstruct → git init)
│   └── SyncWorkflow.ts      # Sync orchestration (detect → push → pull)
├── utils/                    # Utility functions
│   ├── logger.ts            # Logging to ~/.mujarrad/logs/
│   ├── retry.ts             # Exponential backoff retry logic
│   ├── progress.ts          # Progress indicators for long operations
│   └── validation.ts        # UTF-8 encoding check, UUID validation
└── index.ts                  # CLI entry point (commander setup)

tests/
├── unit/                     # Unit tests (80% coverage target)
│   ├── services/
│   ├── filesystem/
│   └── utils/
├── integration/              # Integration tests with sample vault
│   ├── upload.test.ts       # Test with sample BMC vault
│   ├── clone.test.ts
│   └── sync.test.ts
└── contract/                 # API contract tests (validate OpenAPI compliance)
    └── api.test.ts

~/.mujarrad/                  # User data directory (created by CLI)
├── credentials.json         # JWT tokens (600 permissions)
├── cache/                   # Local space cache
│   └── {space-slug}/
│       ├── structure.json   # Cached node/attribute structure
│       └── last-sync.txt    # Last sync timestamp
└── logs/                    # Operation logs
    ├── upload-{session-id}.log
    └── sync-{session-id}.log
```

**Structure Decision**: Single TypeScript project following 5-layer architecture:
1. **API Layer** (`src/api/`): Generated TypeScript client from OpenAPI spec
2. **Commands Layer** (`src/commands/`): CLI command handlers
3. **Services Layer** (`src/services/`): Business logic (upload, clone, sync, auth, git)
4. **Filesystem Layer** (`src/filesystem/`): Obsidian format parsing and file operations
5. **Utils Layer** (`src/utils/`): Cross-cutting concerns (logging, retry, validation)

This structure separates API communication, business logic, file I/O, and CLI interface for testability and maintainability.

## Complexity Tracking

*Fill ONLY if Constitution Check has violations that must be justified*

**No violations**: All constitution principles satisfied. No complexity tracking required.
