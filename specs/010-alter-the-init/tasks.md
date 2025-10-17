# Implementation Tasks: Init Command Auto-Create Space

**Feature**: Init Command Auto-Create Space
**Branch**: `010-alter-the-init`
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)
**Date**: 2025-10-17

## Overview

This document provides a dependency-ordered task breakdown for implementing automatic space creation during `mujarrad init`. Tasks are organized by user story (P1, P2, P3) to enable independent implementation and testing of each feature increment.

**Test-Driven Development**: Following the constitution requirement (Principle III), tests must be written BEFORE implementation for all components.

**Total Tasks**: 43 (includes T022a split from original T022)
**Estimated Duration**: 3-5 days (assuming 1 developer)

---

## Task Organization

### Phase 1: Setup & Infrastructure (5 tasks)
Shared setup required before any user story implementation.

### Phase 2: Foundational Prerequisites (7 tasks)
Core components that ALL user stories depend on. Must complete before implementing any user story.

### Phase 3: User Story 1 - Auto-Create Space on Init (Priority: P1) (16 tasks)
MVP feature: Automatic space creation when space doesn't exist. Includes T022a for slug validation performance testing.

### Phase 4: User Story 2 - Customizable Metadata (Priority: P2) (8 tasks)
Optional metadata flags for better user experience.

### Phase 5: User Story 3 - Explicit Control (Priority: P3) (5 tasks)
Power user control with `--no-auto-create` flag.

### Phase 6: Polish & Integration (2 tasks)
Cross-cutting concerns and final integration.

---

## Phase 1: Setup & Infrastructure

**Objective**: Prepare development environment and shared tools before implementation.

**Tasks**:

### T001: [Setup] Verify Development Environment
**Description**: Ensure all development tools and dependencies are installed.
**File**: N/A (environment check)
**Actions**:
- Verify Node.js 18+ installed
- Verify TypeScript 5.3+ installed
- Verify Jest test framework configured
- Verify nock HTTP mocking library available
- Run `npm install` to ensure all dependencies present

**Validation**: `npm test` runs without errors, `tsc --version` shows 5.3+

---

### T002: [Setup] Review Existing Codebase Structure
**Description**: Familiarize with existing init command and space validation logic from spec 009.
**Files to Review**:
- `src/commands/init.ts` (existing init command)
- `src/services/SpaceValidator.ts` (from spec 009)
- `src/api/generated/api.ts` (OpenAPI client)
- `tests/unit/commands/init.test.ts` (existing tests)

**Actions**:
- Read init.ts to understand current command flow
- Read SpaceValidator.ts to understand validation logic
- Identify integration points for auto-creation

**Validation**: Can explain current init flow and where to add auto-creation logic

---

### T003: [Setup] Create Feature Branch Test Suite Structure
**Description**: Set up test directory structure for new components.
**Actions**:
- Create `tests/unit/utils/SlugValidator.test.ts` (empty placeholder)
- Create `tests/unit/services/SpaceCreationService.test.ts` (empty placeholder)
- Create `tests/integration/commands/init-auto-create.test.ts` (empty placeholder)
- Create `tests/contract/space-creation-api.test.ts` (empty placeholder)

**Validation**: All test files exist and can be imported

---

### T004: [Setup] Configure Jest for New Test Files
**Description**: Ensure Jest configuration recognizes new test files.
**File**: `jest.config.js` or `package.json`
**Actions**:
- Verify test path patterns include new test files
- Verify nock is configured for HTTP mocking
- Run `npm test` to ensure empty tests pass

**Validation**: `npm test` discovers and runs all new test files (should all pass as empty)

---

### T005: [Setup] Review Backend API Contract
**Description**: Read and understand the OpenAPI contract for space creation.
**File to Review**: `specs/010-alter-the-init/contracts/space-creation-api.yaml`
**Actions**:
- Read POST `/api/spaces` endpoint definition
- Note request schema: `{ slug, displayName?, description?, isPublic? }`
- Note response schemas: 201, 400, 409, 403, 500
- Note error code enums

**Validation**: Can describe request/response format and all error scenarios

---

## Phase 2: Foundational Prerequisites

**Objective**: Build core components that ALL user stories depend on. These tasks MUST complete before implementing any user story.

**Blocking**: User Story 1, 2, and 3 all require these components.

**Tasks**:

### T006: [Foundational] [TDD] Write Tests for SlugValidator
**Description**: Write comprehensive tests for slug validation logic BEFORE implementation.
**File**: `tests/unit/utils/SlugValidator.test.ts`
**Test Cases**:
- Valid slugs: "my-space", "kb-2025", "a", "a-b-c-1-2-3"
- Invalid characters: "My Space", "my_space", "my.space", "my@space"
- Length violations: "" (empty), "a".repeat(51) (too long)
- Reserved slugs: "admin", "api", "auth", "system", "public", "private", "space", "space", "user", "settings"
- Edge cases: "---", "123", "a-", "-a"

**Expected Interface**:
```typescript
class SlugValidator {
  validate(slug: string): SlugValidationResult;
  private isValidFormat(slug: string): boolean;
  private isReserved(slug: string): boolean;
}

interface SlugValidationResult {
  valid: boolean;
  errors: string[];
  format: string;
  minLength: number;
  maxLength: number;
}
```

**Validation**: Tests fail (red) because SlugValidator doesn't exist yet

---

### T007: [Foundational] Implement SlugValidator
**Description**: Implement slug validation logic to make tests pass.
**File**: `src/utils/SlugValidator.ts` (NEW)
**Requirements** (from FR-003, FR-004):
- Regex: `^[a-z0-9-]+$`
- Length: 1-50 characters
- Reserved list: ['admin', 'api', 'auth', 'system', 'public', 'private', 'space', 'space', 'user', 'settings']

**Actions**:
- Create SlugValidator class
- Implement validate() method
- Implement private helper methods
- Return detailed error messages per spec (NFR-003)

**Validation**: All T006 tests pass (green)

---

### T008: [Foundational] [TDD] Write Tests for SpaceCreationService - Core Logic
**Description**: Write tests for space creation service BEFORE implementation.
**File**: `tests/unit/services/SpaceCreationService.test.ts`
**Test Cases**:
- **Success**: Create space with minimal fields (slug only)
- **Success**: Create space with full metadata (slug, displayName, description)
- **Client defaults**: Verify displayName defaults to slug if not provided
- **Client defaults**: Verify description defaults to "" if not provided
- **Client defaults**: Verify isPublic defaults to false
- **Error 400**: Invalid slug format (backend validation)
- **Error 409**: Duplicate slug (already taken)
- **Error 403**: Account limit reached
- **Error 500**: Server error
- **Network error**: ECONNREFUSED, ETIMEDOUT

**Expected Interface**:
```typescript
class SpaceCreationService {
  constructor(spacesApi: SpacesApi, logger: Logger);
  async createSpace(request: SpaceCreationRequest): Promise<SpaceCreationResponse>;
  private applyDefaults(request: SpaceCreationRequest): Complete<SpaceCreationRequest>;
}

interface SpaceCreationRequest {
  slug: string;
  displayName?: string;
  description?: string;
  isPublic?: boolean;
}

interface SpaceCreationResponse {
  spaceId: string;
  slug: string;
  displayName: string;
  description: string;
  createdAt: string;
  owner: { userId: string; username: string };
}
```

**Mocking**: Use nock to mock POST `/api/spaces` responses

**Validation**: Tests fail (red) because SpaceCreationService doesn't exist

---

### T009: [Foundational] [TDD] Write Tests for SpaceCreationService - Retry Logic
**Description**: Write tests for retry behavior with exponential backoff BEFORE implementation.
**File**: `tests/unit/services/SpaceCreationService.test.ts` (extend)
**Test Cases** (from FR-006):
- **Retry on 500**: Server error triggers retry
- **Retry on 502/503**: Gateway errors trigger retry
- **Retry on network**: ECONNREFUSED, ETIMEDOUT trigger retry
- **No retry on 400**: Bad request fails immediately
- **No retry on 409**: Conflict fails immediately
- **No retry on 403**: Forbidden fails immediately
- **Backoff timing**: Verify delays are [1000ms, 2000ms, 4000ms]
- **Max attempts**: Verify 4 total attempts (initial + 3 retries)
- **Final failure**: After 3 retries, throw error with retry count

**Validation**: Tests fail (red) because retry logic doesn't exist

---

### T010: [Foundational] Implement SpaceCreationService - Core Logic
**Description**: Implement basic space creation to pass T008 tests.
**File**: `src/services/SpaceCreationService.ts` (NEW)
**Requirements**:
- Constructor accepts SpacesApi and Logger
- createSpace() method calls POST `/api/spaces`
- applyDefaults() method fills missing fields with defaults
- Error handling for 400, 409, 403, 500 status codes
- Log all attempts to ~/.mujarrad/logs/ (NFR-004)

**Actions**:
- Create SpaceCreationService class
- Implement createSpace() method
- Implement applyDefaults() private method
- Add error type checking
- Add logging with winston

**Validation**: T008 tests pass (green)

---

### T011: [Foundational] Implement SpaceCreationService - Retry Logic
**Description**: Add retry logic with exponential backoff to pass T009 tests.
**File**: `src/services/SpaceCreationService.ts` (extend)
**Requirements** (from FR-006):
- Retry count: 3 (total 4 attempts)
- Backoff delays: [1000ms, 2000ms, 4000ms]
- Retry only on: 500+, network errors
- No retry on: 400, 409, 403, 401

**Actions**:
- Add retry wrapper around API call
- Implement exponential backoff with setTimeout
- Log each retry attempt with attempt number
- Throw final error with retry count after exhaustion

**Validation**: T009 tests pass (green)

---

### T012: [Foundational] [TDD] Write Contract Tests for Space Creation API
**Description**: Write tests validating CLI behavior against backend OpenAPI contract.
**File**: `tests/contract/space-creation-api.test.ts` (NEW)
**Test Cases**:
- Request schema matches OpenAPI (slug required, others optional)
- Response 201 schema matches OpenAPI (all fields present)
- Error responses match OpenAPI error formats
- Authentication header included (Bearer token)

**Actions**:
- Load contract from `specs/010-alter-the-init/contracts/space-creation-api.yaml`
- Use OpenAPI validator library to check request/response schemas
- Mock backend responses per contract examples

**Validation**: Tests fail (red) until T010-T011 implemented correctly

---

## Phase 3: User Story 1 - Auto-Create Space on Init (Priority: P1)

**Goal**: Enable automatic space creation when space doesn't exist during `mujarrad init`.

**Independent Test Criteria**: Run `mujarrad init ./test-vault --space brand-new-space` where "brand-new-space" doesn't exist. System should create space automatically and proceed with upload, displaying "Created new space: brand-new-space".

**Depends On**: Phase 2 (Foundational) must complete first.

**Tasks**:

### T013: [US1] [TDD] Write Tests for Init Command - Space Creation Path
**Description**: Write tests for init command with auto-creation logic BEFORE implementation.
**File**: `tests/unit/commands/init.test.ts` (extend existing)
**Test Cases**:
- **Space does not exist (404)**: Auto-create triggered, creation succeeds, upload proceeds
- **Space exists (200)**: Skip creation, validate normally, upload proceeds
- **Invalid slug format**: Fail before API call with validation error
- **Slug too long (>50 chars)**: Fail before API call with validation error
- **Reserved slug ("admin")**: Fail before API call with validation error
- **Creation fails (409)**: Display "Space already taken" error, abort init
- **Creation fails (403)**: Display "Account limit" error, abort init
- **Creation succeeds, re-validation fails**: Display error "Creation succeeded but validation failed"

**Mocking**:
- Mock SlugValidator
- Mock SpaceValidator.validateSpace()
- Mock SpaceCreationService.createSpace()
- Mock UploadService (to verify upload proceeds)

**Validation**: Tests fail (red) because auto-creation logic not implemented in init.ts

---

### T014: [US1] Add New Flags to Init Command
**Description**: Add command-line flags for auto-creation feature.
**File**: `src/commands/init.ts` (modify)
**Requirements** (from FR-008, FR-009, FR-013):
- Add `--space-name <name>` option (optional)
- Add `--space-description <text>` option (optional)
- Add `--no-auto-create` flag (optional, boolean)

**Actions**:
- Use Commander.js `.option()` to add flags
- Ensure flags are optional (not required)
- Update command help text with new flags

**Validation**: `mujarrad init --help` shows new flags

---

### T015: [US1] Integrate SlugValidator into Init Command
**Description**: Add client-side slug validation before any API calls.
**File**: `src/commands/init.ts` (modify)
**Requirements** (from FR-003, FR-004):
- Import SlugValidator
- Validate slug before space existence check
- Fail fast with clear error message if validation fails
- Display error with format requirements and examples (NFR-003)

**Actions**:
- Instantiate SlugValidator
- Call validator.validate(slug) after parsing flags
- If invalid, display errors from validation result and exit code 1

**Validation**: `mujarrad init ./vault --space "My Space!"` fails immediately with format error (no API call)

---

### T016: [US1] Integrate SpaceCreationService into Init Command
**Description**: Add auto-creation logic when space doesn't exist.
**File**: `src/commands/init.ts` (modify)
**Requirements** (from FR-001, FR-002, FR-005):
- Import SpaceCreationService
- Call after space validation returns 404
- Pass slug and metadata flags to creation request
- Apply client-side defaults (displayName=slug, description="", isPublic=false)
- Display confirmation message after successful creation (FR-005)
- Re-validate space exists after creation

**Actions**:
- Add `try { validateSpace() } catch (404) { createSpace() }` logic
- Construct SpaceCreationRequest from flags
- Call spaceCreationService.createSpace(request)
- On success, display `✓ Created new space: {slug}` (chalk.green)
- Call validateSpace() again to confirm creation
- If re-validation fails, throw error

**Validation**: Partial T013 tests pass (auto-creation path)

---

### T017: [US1] Add Error Handling for Creation Failures
**Description**: Handle all space creation error scenarios with actionable messages.
**File**: `src/commands/init.ts` (modify)
**Requirements** (from FR-007, NFR-003, Edge Cases):
- Catch 400 errors: Display format error with examples
- Catch 409 errors: Display "slug taken" with suggestions
- Catch 403 errors: Display "account limit" error with message format: "Space creation failed: account limit reached (X/Y spaces used). Upgrade your plan or delete unused spaces at https://www.mujarrad.com/spaces"
- Catch 500+ errors: Display server error with retry suggestion
- Catch network errors: Display connection error

**Actions**:
- Wrap createSpace() in try-catch
- Switch on error status code
- Display detailed error messages per NFR-003 requirements
- For 403 errors: Parse backend response for currentSpaces/maxSpaces and format error message exactly as specified in edge cases
- Exit with appropriate exit codes

**Validation**: T013 tests for error handling pass, including validation of account limit message format

---

### T018: [US1] Preserve Backward Compatibility for Existing Spaces
**Description**: Ensure existing space validation works unchanged.
**File**: `src/commands/init.ts` (verify)
**Requirements** (from FR-016):
- When space exists (200), skip creation logic entirely
- Proceed with normal validation and upload (spec 009 behavior)
- No behavior change for existing workflows

**Actions**:
- Verify space validation path unchanged
- Verify upload proceeds normally after validation
- No new logic in the "space exists" path

**Validation**: Existing init.test.ts tests still pass (regression test)

---

### T019: [US1] [TDD] Write Integration Test - Create + Upload Flow
**Description**: Write end-to-end test for full auto-creation workflow BEFORE final integration.
**File**: `tests/integration/commands/init-auto-create.test.ts` (NEW)
**Test Cases**:
- **Full success path**: Space doesn't exist → create → validate → upload succeeds
- **Creation + upload**: Verify both creation AND upload occur in correct order
- **Rollback on upload failure**: If upload fails after creation, space still exists (no rollback)

**Mocking**:
- Mock backend POST `/api/spaces` (201 response)
- Mock backend GET `/api/spaces/{slug}` (404 then 200)
- Mock backend upload endpoints
- Use temp filesystem for test vault

**Validation**: Test fails (red) until T020 completes

---

### T020: [US1] Complete Init Command Auto-Creation Integration
**Description**: Final integration to connect all pieces and pass integration test.
**File**: `src/commands/init.ts` (verify all pieces connected)
**Actions**:
- Verify control flow: validate slug → check existence → create if 404 → validate again → upload
- Verify error handling complete
- Verify logging complete
- Run T019 integration test

**Validation**: T019 integration test passes (green)

---

### T021: [US1] Add Logging for Space Creation Attempts
**Description**: Log all creation attempts for debugging.
**File**: `src/services/SpaceCreationService.ts` (extend logging)
**Requirements** (from NFR-004):
- Log success with spaceId, slug, displayName
- Log failures with error code and message
- Log retry attempts with attempt number
- Log to `~/.mujarrad/logs/space-creation-{date}.log`
- Use JSON Lines format

**Actions**:
- Extend existing Logger.ts if needed
- Add structured logging in SpaceCreationService
- Verify log files created in ~/.mujarrad/logs/

**Validation**: Run creation attempt, verify log file created with correct format

---

### T022: [US1] [TDD] Write Performance Tests for Space Creation Speed
**Description**: Write tests verifying space creation completes within time budget.
**File**: `tests/performance/space-creation.test.ts` (NEW)
**Test Cases** (from NFR-001, SC-001, SC-002):
- Space creation completes in <5 seconds (success path) - NFR-001
- Full init flow (validate + create + re-validate + upload) completes in <30 seconds - SC-001
- 95th percentile creation time <5 seconds across 20 test runs - SC-002

**Actions**:
- Use Jest `performance.now()` to measure timing
- Mock backend with realistic latencies (100-200ms per API call)
- Run multiple iterations for p95 calculation
- Assert time budgets not exceeded

**Validation**: Tests run and measure timings (may fail if too slow)

---

### T022a: [US1] [TDD] Write Performance Tests for Slug Validation Speed
**Description**: Write tests verifying client-side slug validation completes within time budget.
**File**: `tests/unit/utils/SlugValidator.test.ts` (extend)
**Test Cases** (from NFR-002):
- Slug validation completes in <10ms (no API call)
- Validation timing is consistent across valid and invalid slugs
- Reserved slug check completes in <1ms

**Actions**:
- Add performance test section to existing SlugValidator tests
- Use `performance.now()` to measure validation timing
- Test with various slug lengths (1 char, 25 chars, 50 chars)
- Assert <10ms threshold for all cases

**Validation**: Tests run and measure validation timings (should pass easily)

---

### T023: [US1] Optimize Performance if Needed
**Description**: If T022 tests fail, optimize slow operations.
**File**: Various (if needed)
**Actions**:
- Profile slow operations
- Optimize regex matching (unlikely bottleneck)
- Optimize API call sequencing (parallel where possible)
- Reduce logging overhead

**Validation**: T022 performance tests pass

---

### T024: [US1] Update User-Facing Error Messages
**Description**: Ensure all error messages follow NFR-003 guidance (actionable next steps).
**File**: `src/commands/init.ts` (verify messages)
**Requirements** (from NFR-003):
- Include examples for format errors
- Include suggestions for slug conflicts
- Include links for account limits
- Use chalk for colored output (red errors, yellow warnings, gray hints)

**Actions**:
- Review all error messages in init.ts
- Verify format matches spec examples
- Verify chalk colors used correctly

**Validation**: Manual test all error scenarios, verify message quality

---

### T025: [US1] Write User Documentation for Auto-Creation
**Description**: Document new auto-creation behavior for users.
**File**: `README.md` (update)
**Actions**:
- Add section on automatic space creation
- Update init command examples with new workflow
- Add troubleshooting section for creation errors
- Reference quickstart.md for detailed examples

**Validation**: README is clear and accurate

---

### T026: [US1] [Checkpoint] User Story 1 Complete - Run Full Test Suite
**Description**: Verify all User Story 1 requirements met.
**Actions**:
- Run `npm test` (all tests pass)
- Run manual test: `mujarrad init ./test-vault --space new-space` (creation succeeds)
- Verify acceptance scenarios from spec:
  - AS1: Space doesn't exist → auto-create → upload ✓
  - AS2: Space exists → validate normally ✓
  - AS3: Slug taken → error message ✓
  - AS4: Invalid slug → error message ✓
- **Independent Test**: Run spec's independent test scenario successfully

**Validation**: All User Story 1 tests pass, feature works end-to-end

---

### T027: [US1] Tag User Story 1 MVP Release
**Description**: Create git tag for minimal viable product (US1 only).
**Actions**:
- Commit all US1 changes
- Create tag: `git tag v1.0.0-us1-mvp`
- Document MVP scope in CHANGELOG

**Validation**: MVP tag exists, code works without US2/US3

---

## Phase 4: User Story 2 - Customizable Metadata (Priority: P2)

**Goal**: Allow users to provide human-readable name and description for new spaces.

**Independent Test Criteria**: Run `mujarrad init ./vault --space kb --space-name "Knowledge Base" --space-description "Work notes"` and verify created space has provided metadata.

**Depends On**: User Story 1 (Phase 3) must complete first.

**Tasks**:

### T028: [US2] [TDD] Write Tests for Metadata Flag Handling
**Description**: Write tests for metadata flags BEFORE implementation.
**File**: `tests/unit/commands/init.test.ts` (extend)
**Test Cases**:
- **Full metadata provided**: slug, displayName, description all passed to creation
- **Partial metadata (name only)**: displayName set, description defaults to ""
- **Partial metadata (description only)**: displayName defaults to slug, description set
- **No metadata**: Both default (displayName=slug, description="")
- **Metadata + existing space**: Warning displayed, flags ignored, upload proceeds (FR-012)

**Validation**: Tests fail (red) because metadata logic not implemented

---

### T029: [US2] Implement Metadata Flag Handling in Init Command
**Description**: Pass metadata flags to SpaceCreationService.
**File**: `src/commands/init.ts` (modify)
**Requirements** (from FR-008, FR-009, FR-010, FR-011):
- Read `--space-name` and `--space-description` from options
- Pass to SpaceCreationRequest
- Apply defaults in SpaceCreationService (already implemented in T010)

**Actions**:
- Extract spaceName and spaceDescription from options
- Construct SpaceCreationRequest with all fields
- Rely on SpaceCreationService.applyDefaults() for missing values

**Validation**: T028 tests for metadata passing pass

---

### T030: [US2] Implement Warning for Metadata Flags on Existing Spaces
**Description**: Warn user if metadata flags provided for existing space.
**File**: `src/commands/init.ts` (modify)
**Requirements** (from FR-012):
- Detect when space exists AND (spaceName OR spaceDescription provided)
- Display warning: `⚠️  Space already exists. Metadata flags ignored`
- Use chalk.yellow for warning
- Continue with upload (non-fatal)

**Actions**:
- Add conditional after space validation succeeds
- Check if options.spaceName or options.spaceDescription present
- Display warning message if present

**Validation**: T028 test for warning passes

---

### T031: [US2] [TDD] Write Integration Test for Metadata Workflow
**Description**: Write end-to-end test for metadata customization.
**File**: `tests/integration/commands/init-auto-create.test.ts` (extend)
**Test Cases**:
- Create space with full metadata → verify backend receives all fields
- Create space with partial metadata → verify defaults applied correctly
- Metadata flags ignored for existing space → verify warning shown, flags not sent to backend

**Mocking**:
- Mock POST `/api/spaces` and capture request body
- Verify request body includes provided metadata

**Validation**: Test fails (red) until T029-T030 complete

---

### T032: [US2] Complete Metadata Integration
**Description**: Final integration for metadata feature.
**Actions**:
- Run T031 integration test
- Fix any issues discovered
- Verify T028 unit tests pass

**Validation**: T031 integration test passes (green)

---

### T033: [US2] Update Quickstart with Metadata Examples
**Description**: Add examples of metadata flags to user documentation.
**File**: `specs/010-alter-the-init/quickstart.md` (verify)
**Actions**:
- Verify quickstart.md includes metadata examples (already written in Phase 1)
- Add to README.md if missing

**Validation**: Quickstart has clear metadata examples

---

### T034: [US2] [Checkpoint] User Story 2 Complete - Test Metadata Feature
**Description**: Verify all User Story 2 requirements met.
**Actions**:
- Run `npm test` (all tests pass)
- Run manual test: `mujarrad init ./vault --space kb --space-name "KB" --space-description "Notes"` (metadata set correctly)
- Verify acceptance scenarios from spec:
  - AS1: Full metadata provided → space created with metadata ✓
  - AS2: No metadata → defaults applied ✓
  - AS3: Metadata + existing space → warning shown, flags ignored ✓
- **Independent Test**: Run spec's independent test scenario successfully

**Validation**: All User Story 2 tests pass, feature works end-to-end

---

### T035: [US2] Tag User Story 2 Release
**Description**: Create git tag including US1 + US2.
**Actions**:
- Commit all US2 changes
- Create tag: `git tag v1.0.0-us2`

**Validation**: Tag exists, US1 + US2 features work

---

## Phase 5: User Story 3 - Explicit Control (Priority: P3)

**Goal**: Allow power users to disable auto-creation with `--no-auto-create` flag.

**Independent Test Criteria**: Run `mujarrad init . --space nonexistent --no-auto-create` and verify it fails immediately without creating the space.

**Depends On**: User Story 1 (Phase 3) must complete first. US2 is independent and can be done in parallel.

**Tasks**:

### T036: [US3] [TDD] Write Tests for --no-auto-create Flag
**Description**: Write tests for explicit control flag BEFORE implementation.
**File**: `tests/unit/commands/init.test.ts` (extend)
**Test Cases**:
- **Flag set + space doesn't exist (404)**: Fail immediately with "Auto-creation disabled" error (FR-014)
- **Flag set + space exists (200)**: Validate normally, proceed with upload (no behavior change)
- **Flag NOT set + space doesn't exist (404)**: Auto-create triggered (default behavior - FR-015)

**Validation**: Tests fail (red) because flag logic not implemented

---

### T037: [US3] Implement --no-auto-create Flag Logic
**Description**: Add conditional logic to disable auto-creation.
**File**: `src/commands/init.ts` (modify)
**Requirements** (from FR-013, FR-014, FR-015):
- Check if options.noAutoCreate is true
- If true AND space doesn't exist, fail with error and exit code 4
- If false (default), proceed with auto-creation

**Actions**:
- Read options.noAutoCreate (added in T014)
- Add conditional before SpaceCreationService call
- If flag set, throw error with message per FR-014
- Exit code 4 (same as "space not found" in spec 009)

**Validation**: T036 tests pass

---

### T038: [US3] [TDD] Write Integration Test for --no-auto-create
**Description**: Write end-to-end test for explicit control.
**File**: `tests/integration/commands/init-auto-create.test.ts` (extend)
**Test Cases**:
- Flag set, space missing → fails immediately, no creation attempt, no upload
- Flag set, space exists → proceeds normally

**Mocking**:
- Verify POST `/api/spaces` NOT called when flag set and space missing

**Validation**: Test fails (red) until T037 complete

---

### T039: [US3] [Checkpoint] User Story 3 Complete - Test Explicit Control
**Description**: Verify all User Story 3 requirements met.
**Actions**:
- Run `npm test` (all tests pass)
- Run manual test: `mujarrad init ./vault --space missing --no-auto-create` (fails immediately)
- Run manual test: `mujarrad init ./vault --space existing --no-auto-create` (proceeds normally)
- Verify acceptance scenarios from spec:
  - AS1: Flag set + space missing → error ✓
  - AS2: Flag set + space exists → proceeds normally ✓
  - AS3: Flag not set + space missing → auto-create ✓
- **Independent Test**: Run spec's independent test scenario successfully

**Validation**: All User Story 3 tests pass, feature works end-to-end

---

### T040: [US3] Tag User Story 3 Release
**Description**: Create git tag including US1 + US2 + US3 (complete feature).
**Actions**:
- Commit all US3 changes
- Create tag: `git tag v1.0.0-complete`

**Validation**: Tag exists, all three user stories work

---

## Phase 6: Polish & Integration

**Objective**: Final integration, documentation, and release preparation.

**Tasks**:

### T041: [Polish] Run Full Test Suite and Fix Regressions
**Description**: Comprehensive test run to catch any regressions.
**Actions**:
- Run `npm test` (all tests pass)
- Run `npm run test:integration` if separate
- Run `npm run test:performance` if separate
- Fix any failing tests

**Validation**: 100% test pass rate

---

### T042: [Polish] Final Documentation Review and Release Prep
**Description**: Ensure all documentation is complete and accurate.
**Files**: README.md, CHANGELOG.md, quickstart.md
**Actions**:
- Update CHANGELOG with all changes (US1, US2, US3)
- Verify README examples work
- Verify quickstart.md examples work
- Add migration notes for users upgrading from previous versions
- Tag final release: `git tag v1.0.0`

**Validation**: Documentation is complete and accurate, final tag created

---

## Task Dependency Graph

```
Phase 1 (Setup)
  T001 → T002 → T003 → T004 → T005
         ↓
Phase 2 (Foundational - BLOCKING)
  T006 → T007 (SlugValidator)
  T008 → T009 → T010 → T011 (SpaceCreationService)
  T012 (Contract Tests)
         ↓
Phase 3 (User Story 1 - MVP)
  T013 → T014 → T015 → T016 → T017 → T018 → T019 → T020 → T021 → T022 → T023 → T024 → T025 → T026 → T027
                                                            ↓ (parallel)
                                                           T022a
         ↓                                           ↓
Phase 4 (User Story 2 - Metadata)            Phase 5 (User Story 3 - Control)
  T028 → T029 → T030 → T031 → T032 → T033 → T034 → T035   T036 → T037 → T038 → T039 → T040
                                      ↓                                          ↓
Phase 6 (Polish)
                                T041 → T042
```

**Critical Path**: T001 → ... → T012 → T013 → ... → T027 (User Story 1 MVP)

**Parallel Opportunities**:
- Phase 4 (US2) and Phase 5 (US3) can run in parallel after Phase 3 completes
- Within Phase 2: T006-T007 [P] with T008-T011 (different files)
- Within Phase 3: T022 (space creation perf) [P] with T022a (slug validation perf)
- Within Phase 3: T022-T022a-T023 (performance) [P] with T024-T025 (documentation)

---

## Parallel Execution Examples

### Phase 2 Parallelization
```
Developer A: T006 → T007 (SlugValidator)
Developer B: T008 → T009 → T010 → T011 (SpaceCreationService)
Both meet at T012 (Contract Tests)
```

### Phase 3+4+5 Parallelization (After Phase 3 Complete)
```
Developer A: Phase 4 (US2) - T028 → T035
Developer B: Phase 5 (US3) - T036 → T040
Both meet at Phase 6 (T041-T042)
```

---

## Implementation Strategy

### Recommended Approach: MVP First

1. **Week 1**: Complete Phase 1-2-3 (Setup + Foundational + User Story 1)
   - Delivers core value: automatic space creation
   - Independently testable and shippable
   - Tag: `v1.0.0-us1-mvp`

2. **Week 2**: Complete Phase 4-5-6 (User Story 2 + 3 + Polish)
   - Adds convenience (metadata) and control (--no-auto-create)
   - Tag: `v1.0.0-complete`

### Alternative: Parallel User Stories (if 2+ developers)

1. **Developer A**: Phase 1-2-3 (US1 MVP)
2. **Developer B**: Prepare for Phase 4 (read docs, plan tests)
3. Once Phase 3 complete:
   - **Developer A**: Phase 4 (US2)
   - **Developer B**: Phase 5 (US3)
4. Both converge on Phase 6

---

## Test Coverage Goals

- **Unit Tests**: 100% coverage for new components (SlugValidator, SpaceCreationService)
- **Integration Tests**: All user story acceptance scenarios covered
- **Contract Tests**: Backend API contract validated
- **Performance Tests**: NFR-001 and NFR-002 verified
- **Regression Tests**: Existing init.test.ts still passes (backward compatibility)

**Total Test Files**: 4
- `SlugValidator.test.ts` (T006-T007)
- `SpaceCreationService.test.ts` (T008-T011)
- `init-auto-create.test.ts` (T019, T031, T038)
- `space-creation-api.test.ts` (T012)

---

## Success Criteria Checklist

- [ ] **SC-001**: New users initialize in <30 seconds (single command)
- [ ] **SC-002**: Space creation completes in <5 seconds (95% of requests)
- [ ] **SC-003**: Zero "space not found" errors when auto-create enabled
- [ ] **SC-004**: 90% of users succeed on first attempt
- [ ] **SC-005**: Clear error messages for all failure scenarios
- [ ] **SC-006**: 100% backward compatibility maintained

---

## Estimated Timeline

| Phase | Tasks | Estimated Time |
|-------|-------|----------------|
| Phase 1: Setup | 5 | 2-3 hours |
| Phase 2: Foundational | 7 | 1 day |
| Phase 3: User Story 1 (MVP) | 16 | 2 days |
| Phase 4: User Story 2 | 8 | 0.5 day |
| Phase 5: User Story 3 | 5 | 0.5 day |
| Phase 6: Polish | 2 | 0.5 day |
| **Total** | **43** | **5 days** |

**Assumptions**: 1 developer, 6-8 hours/day, includes testing and documentation.

---

## Notes

- **TDD Required**: All implementation tasks have corresponding test tasks BEFORE them
- **Independent Stories**: US2 and US3 can be implemented independently after US1 MVP
- **MVP Shippable**: Phase 3 (US1) delivers complete, shippable feature
- **Backward Compatibility**: Existing init workflows unchanged (FR-016, FR-017)
- **Backend Dependency**: POST `/api/spaces` endpoint must exist (coordinate with backend team)

**Ready to implement!** Start with Phase 1 (Setup) and follow TDD workflow: Test → Implement → Refactor → Repeat.
