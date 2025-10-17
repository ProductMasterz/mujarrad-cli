# Implementation Plan: Init Command Auto-Create Space

**Branch**: `010-alter-the-init` | **Date**: 2025-10-17 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/010-alter-the-init/spec.md`

**Note**: This template is filled in by the `/plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Enhance the `mujarrad init` command to automatically create spaces when they don't exist, eliminating the manual two-step process (create space on web → run init). This feature adds client-side slug validation, automatic space creation via backend API, optional metadata configuration (name and description), and explicit control via `--no-auto-create` flag for power users. The enhancement preserves full backward compatibility with existing init workflows while dramatically improving new user experience by enabling single-command vault initialization.

**Technical Approach**: Extend existing init command with pre-validation check for space existence. On 404 response, trigger automatic space creation via POST `/api/spaces` with retry logic and exponential backoff. Add new command-line flags (`--space-name`, `--space-description`, `--no-auto-create`) using Commander.js. Reuse existing SpaceValidator service for existence checks. Backend API dependency: POST `/api/spaces` endpoint must exist or be created. All changes maintain spec 009 validation logic for existing spaces.

## Technical Context

**Language/Version**: TypeScript 5.3+ with Node.js 18+
**Primary Dependencies**: Commander.js (CLI framework), Axios (HTTP client), Inquirer (interactive prompts), simple-git (optional Git operations), @napi-rs/keyring (credential storage), winston (logging)
**Storage**: Local filesystem (`~/.mujarrad/cache/` for cached data, `~/.mujarrad/logs/` for session logs)
**Testing**: Jest (unit + integration tests), nock (HTTP mocking for API calls)
**Target Platform**: Node.js CLI (macOS, Linux, Windows)
**Project Type**: Single project (CLI tool)
**Performance Goals**: Space creation <5 seconds (NFR-001), client-side validation <10ms (NFR-002)
**Constraints**: Backward compatible (zero breaking changes), atomic operations, network retry with exponential backoff
**Scale/Scope**: 18 functional requirements, 4 non-functional requirements, 1 new backend API endpoint dependency

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**This is a CLI tool, not a backend feature. The Mujarrad Backend Constitution does not apply directly to CLI implementation. However, relevant principles are adapted:**

### Adapted Principles for CLI Tool

**✅ API-First Design (Principle I - Adapted)**:
- CLI consumes backend REST API for space creation
- New backend endpoint required: POST `/api/spaces`
- Backend team must provide OpenAPI contract for space creation endpoint
- **Status**: DEPENDENT - Backend API contract required (see Dependencies section)

**✅ Test-Driven Development (Principle III - Applies)**:
- Unit tests required for space creation service, slug validation, retry logic
- Integration tests required for full init flow with auto-creation
- Contract tests required to validate API client against backend OpenAPI spec
- **Status**: PASS - Jest test framework in place, TDD workflow will be followed

**✅ Transactional Integrity (Principle IV - Adapted for CLI)**:
- Space creation must complete before upload begins (atomic operation)
- Retry logic with exponential backoff for network failures (FR-006)
- No partial state: either space exists or creation fails clearly
- **Status**: PASS - Design includes atomic creation + validation pattern

**✅ Security by Default (Principle V - Applies)**:
- Authentication tokens required for space creation API call
- Slug validation prevents injection attacks
- All API requests authenticated via existing keychain-stored tokens
- **Status**: PASS - Existing authentication infrastructure applies

**❌ Database Schema as Code (Principle II - Not Applicable)**:
- CLI does not manage database schema
- **Status**: N/A

**❌ Sample Data & Live Reference (Principle VI - Not Applicable)**:
- CLI tool does not include sample data
- **Status**: N/A

### Backend Dependencies

The following backend API endpoint is REQUIRED but may not yet exist. Backend development may be needed in parallel:

1. **POST `/api/spaces`** - Create new space (FR-002)
   - Request body: `{ slug, displayName?, description?, isPublic? }`
   - Response 201: `{ spaceId, slug, displayName, description, createdAt, owner }`
   - Response 400: Invalid slug format
   - Response 409: Slug already taken
   - Response 403: Account space limit reached
   - **Backend constitution compliance**: This endpoint must follow Mujarrad Backend Constitution Principle I (API-First Design) with OpenAPI contract defined before implementation.

### Constitution Compliance Summary

| Principle | Status | Notes |
|-----------|--------|-------|
| API-First Design | ✅ DEPENDENT | Backend POST `/api/spaces` endpoint required |
| Database Schema as Code | N/A | CLI tool does not manage schema |
| Test-Driven Development | ✅ PASS | Jest framework in place, TDD workflow planned |
| Transactional Integrity | ✅ PASS | Atomic creation before upload begins |
| Security by Default | ✅ PASS | Auth tokens + slug validation |
| Sample Data & Live Reference | N/A | CLI tool does not include sample data |

**Gate Status**: ✅ PASS (with backend dependency noted)

## Project Structure

### Documentation (this feature)

```
specs/010-alter-the-init/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (technical decisions)
├── data-model.md        # Phase 1 output (entities and state)
├── quickstart.md        # Phase 1 output (setup and usage guide)
├── contracts/           # Phase 1 output (backend API contract - reference)
│   └── space-creation-api.yaml # OpenAPI spec for POST /api/spaces
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)

```
src/
├── commands/
│   ├── init.ts                    # EXISTING - Main init command (to be enhanced)
│   └── auth.ts                    # EXISTING - Authentication commands
├── services/
│   ├── SpaceValidator.ts          # EXISTING (from spec 009) - Validates space existence
│   ├── SpaceCreationService.ts    # NEW - Handles automatic space creation
│   └── UploadService.ts           # EXISTING - Upload orchestration (unchanged)
├── api/
│   └── generated/
│       ├── api.ts                 # EXISTING - OpenAPI generated client (to be regenerated)
│       └── configuration.ts       # EXISTING - API configuration
├── config/
│   ├── ConfigManager.ts           # EXISTING - CLI configuration
│   └── CredentialManager.ts       # EXISTING - Keychain access
└── utils/
    ├── Logger.ts                  # EXISTING - Winston logger
    └── SlugValidator.ts           # NEW - Client-side slug validation

tests/
├── unit/
│   ├── commands/
│   │   └── init.test.ts           # EXISTING - Init command tests (to be extended)
│   ├── services/
│   │   └── SpaceCreationService.test.ts  # NEW
│   └── utils/
│       └── SlugValidator.test.ts         # NEW
├── integration/
│   ├── commands/
│   │   └── init-auto-create.test.ts      # NEW - Full auto-creation flow
│   └── ...
└── contract/
    └── space-creation-api.test.ts        # NEW - Validate against backend contract
```

**Structure Decision**: Single project structure maintained. This is a CLI enhancement within existing TypeScript/Node.js codebase. Two new components added: `SpaceCreationService` for creation logic and `SlugValidator` for client-side validation. Existing `SpaceValidator` service (from spec 009) will be extended to handle auto-creation workflow. Backend API client will be regenerated from updated OpenAPI specification once POST `/api/spaces` endpoint is available.

## Complexity Tracking

*No constitution violations requiring justification. All design choices align with adapted CLI principles.*

---

## Phase 0: Research & Technical Decisions

**Status**: COMPLETE

**Objective**: Resolve all technical unknowns and establish patterns for automatic space creation with retry logic and error handling.

### Research Tasks

1. **Backend Space Creation API Design**
   - **Unknown**: Exact API request/response format for POST `/api/spaces`
   - **Research**: Determine required vs. optional fields (slug required, displayName/description/isPublic optional)
   - **Decision Required**: Default values for optional fields (displayName defaults to slug, description to empty string, isPublic to false)
   - **Alternatives**: Require all fields vs. use server-side defaults vs. use client-side defaults

2. **Slug Validation Regex Pattern**
   - **Unknown**: Exact slug validation rules (character whitelist, length limits, reserved slugs)
   - **Research**: Backend validation rules to match client-side validation
   - **Decision Required**: Regex pattern (current spec suggests `^[a-z0-9-]+$`), min/max length (spec suggests max 50 chars), reserved slug list (e.g., "admin", "api", "system")
   - **Alternatives**: Client-side validation only vs. backend validation only vs. both (defense in depth)

3. **Retry Strategy for Network Failures**
   - **Unknown**: Optimal retry count and backoff timing for space creation failures
   - **Research**: Industry best practices for HTTP retry with exponential backoff
   - **Decision Required**: Retry count (spec suggests 3), backoff timing (spec suggests 1s, 2s, 4s), which status codes to retry (500+, network errors) vs. which to fail immediately (400, 409)
   - **Alternatives**: Fixed delay vs. exponential backoff vs. jittered backoff

4. **Error Message Design for User Guidance**
   - **Unknown**: How to format error messages for different failure scenarios (invalid slug, duplicate slug, account limit, network error)
   - **Research**: CLI error message best practices, actionable error guidance patterns
   - **Decision Required**: Message templates with contextual next steps (e.g., suggest alternative slugs, link to web interface for quota upgrades)
   - **Alternatives**: Terse error messages vs. verbose guidance vs. interactive error recovery

5. **Integration with Existing Spec 009 Validation**
   - **Unknown**: How to elegantly integrate auto-creation into existing validation flow without breaking backward compatibility
   - **Research**: Conditional logic patterns, feature flag strategies
   - **Decision Required**: Control flow sequence (validate existence → if 404 and auto-create enabled → create → validate again → proceed)
   - **Alternatives**: Separate code paths vs. unified flow with branches vs. strategy pattern

6. **Metadata Flag Handling for Existing Spaces**
   - **Unknown**: Should CLI warn, error, or silently ignore `--space-name`/`--space-description` flags when space already exists
   - **Research**: CLI flag handling best practices, user experience for ignored flags
   - **Decision Required**: Warning message vs. silent ignore (spec suggests warning: "Space already exists. Metadata flags ignored")
   - **Alternatives**: Error and fail vs. warn and continue vs. update existing space metadata (out of scope)

7. **Logging Strategy for Creation Attempts**
   - **Unknown**: What details to log for successful and failed space creation attempts
   - **Research**: Logging best practices for CLI tools, debug vs. info vs. error levels
   - **Decision Required**: Log format (JSON lines), log location (`~/.mujarrad/logs/`), what to log (slug, timestamp, success/failure, error details, retry attempts)
   - **Alternatives**: Structured logging (JSON) vs. plain text vs. no logging

8. **Interaction with --sync Flag**
   - **Unknown**: How auto-created spaces interact with sync workflow (spec 009)
   - **Research**: Verify that new empty spaces work correctly with sync logic
   - **Decision Required**: Confirm that sync on empty space behaves as expected (uploads all local files, no conflicts)
   - **Alternatives**: Special handling for new spaces vs. treat same as existing empty spaces

**Output**: research.md documenting all decisions with rationale and alternatives considered

---

## Phase 1: Design & Contracts

**Status**: COMPLETE

**Objective**: Define data models, API contracts, and quickstart guide for implementation.

### Deliverables

1. **data-model.md**
   - Entity: SpaceCreationRequest (slug: string, displayName?: string, description?: string, isPublic: boolean = false)
   - Entity: SpaceCreationResponse (spaceId: UUID, slug: string, displayName: string, description: string, createdAt: ISO-8601, owner: { userId, username })
   - Entity: SpaceValidationResult (status: EXISTS | NOT_FOUND | FORBIDDEN | CONFLICT | SERVER_ERROR, statusCode: number, existingSpace?: SpaceMetadata)
   - Entity: SlugValidationResult (valid: boolean, errors: string[], format: "lowercase-alphanumeric-hyphen", minLength: 1, maxLength: 50)
   - State Machine: Space Creation Flow (VALIDATE_SLUG → CHECK_EXISTENCE → [if 404 and auto-create] CREATE_SPACE → VALIDATE_AGAIN → PROCEED_INIT | [if exists] PROCEED_INIT)
   - Validation Rules: From FR-001 to FR-018 and NFR-001 to NFR-004

2. **contracts/space-creation-api.yaml**
   - OpenAPI 3.0 specification for POST `/api/spaces` endpoint:
     - Request body schema: `{ slug, displayName?, description?, isPublic? }`
     - Response 201 schema: `{ spaceId, slug, displayName, description, createdAt, owner }`
     - Response 400 schema: Invalid slug format error
     - Response 409 schema: Duplicate slug error
     - Response 403 schema: Account limit error
     - Response 500+ schema: Server error
   - Authentication: JWT Bearer token required
   - Example request/response payloads
   - **Note**: This is a REFERENCE contract for the CLI to validate against. Actual backend implementation follows Mujarrad Backend Constitution.

3. **quickstart.md**
   - Installation: `npm install -g mujarrad-cli@latest`
   - Authentication: `mujarrad auth login`
   - **NEW: Auto-create space on init**:
     - Basic: `mujarrad init ./my-vault --space my-new-space`
     - With metadata: `mujarrad init ./my-vault --space my-space --space-name "My Knowledge Base" --space-description "Personal notes"`
     - With sync: `mujarrad init ./my-vault --space new-space --sync`
     - Disable auto-create: `mujarrad init ./my-vault --space existing-space --no-auto-create`
   - **Existing workflows (unchanged)**:
     - Init to existing space: `mujarrad init ./my-vault --space existing-space`
   - Troubleshooting:
     - "Space already taken": Try different slug
     - "Invalid slug format": Use lowercase letters, numbers, hyphens only
     - "Account limit reached": Upgrade plan or delete unused spaces
     - "Network error": Check connection and retry
   - Examples: Real-world scenarios with expected output for new vs. existing spaces

**Output**: data-model.md, contracts/space-creation-api.yaml, quickstart.md

---

## Phase 2: Task Generation

**Status**: READY (run `/tasks` command to generate implementation breakdown)

**Note**: This phase is NOT executed by `/plan`. After Phase 0 and Phase 1 are complete, run `/tasks` command to generate dependency-ordered implementation tasks in tasks.md.

---

## Next Steps

1. ✅ Run `/plan` command (COMPLETE)
2. ✅ Execute Phase 0: Research technical decisions (COMPLETE - research.md created)
3. ✅ Execute Phase 1: Generate data model and contracts (COMPLETE - data-model.md, contracts/space-creation-api.yaml, quickstart.md created)
4. ⏭️ Review plan.md, research.md, data-model.md, contracts/, quickstart.md
5. ⏭️ Run `/tasks` command to generate implementation tasks
6. ⏭️ Begin TDD implementation cycle per tasks.md

**Current Status**: Planning complete. Ready for `/tasks` command to generate implementation breakdown.
