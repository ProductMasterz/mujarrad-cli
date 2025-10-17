# Data Model: Init Command Auto-Create Space

**Feature**: Init Command Auto-Create Space
**Date**: 2025-10-17
**Status**: COMPLETE

## Overview

This document defines all entities, state machines, and validation rules for the automatic space creation feature. All models are technology-agnostic and focus on business logic.

---

## Entities

### SpaceCreationRequest

Represents the parameters for creating a new space via CLI.

**Fields**:
- `slug`: string (required) - URL-safe identifier for the space
- `displayName`: string (optional, defaults to slug) - Human-readable name shown in UI
- `description`: string (optional, defaults to "") - Brief description of space purpose
- `isPublic`: boolean (optional, defaults to false) - Visibility setting (private by default)

**Validation Rules** (from FR-003, FR-004, FR-010, FR-011):
- `slug` MUST match regex `^[a-z0-9-]+$` (lowercase alphanumeric + hyphens only)
- `slug` length MUST be 1-50 characters
- `slug` MUST NOT be in reserved list: ['admin', 'api', 'auth', 'system', 'public', 'private', 'space', 'space', 'user', 'settings']
- If `displayName` not provided, use `slug` as default
- If `description` not provided, use empty string as default
- If `isPublic` not provided, use `false` as default

**Example**:
```typescript
{
  slug: "my-knowledge-base",
  displayName: "My Knowledge Base",
  description: "Personal notes and research",
  isPublic: false
}
```

---

### SpaceCreationResponse

Represents the backend response after successful space creation.

**Fields**:
- `spaceId`: UUID (required) - Unique identifier for the created space
- `slug`: string (required) - URL-safe identifier (matches request slug)
- `displayName`: string (required) - Human-readable name
- `description`: string (required) - Space description (may be empty)
- `createdAt`: ISO-8601 timestamp (required) - When space was created
- `owner`: object (required) - Space owner information
  - `userId`: UUID - Owner's user ID
  - `username`: string - Owner's username

**Source**: Backend POST `/api/spaces` response

**Example**:
```typescript
{
  spaceId: "550e8400-e29b-41d4-a716-446655440000",
  slug: "my-knowledge-base",
  displayName: "My Knowledge Base",
  description: "Personal notes and research",
  createdAt: "2025-10-17T10:30:45.000Z",
  owner: {
    userId: "660e8400-e29b-41d4-a716-446655440111",
    username: "john.doe"
  }
}
```

---

### SpaceValidationResult

Represents the result of validating space existence before or after creation.

**Fields**:
- `status`: enum (required) - Validation outcome
  - `EXISTS` - Space exists and user has access
  - `NOT_FOUND` - Space does not exist (404)
  - `FORBIDDEN` - Space exists but user lacks access (403)
  - `CONFLICT` - Slug taken by another user (409)
  - `SERVER_ERROR` - Backend error occurred (500+)
- `statusCode`: number (required) - HTTP status code from backend
- `existingSpace`: SpaceMetadata (optional) - Metadata if space exists and accessible

**Validation Rules** (from FR-001):
- Validation performed via GET `/api/spaces/{slug}`
- Must complete within 5 seconds (NFR-001)

**Example (space exists)**:
```typescript
{
  status: "EXISTS",
  statusCode: 200,
  existingSpace: {
    slug: "my-knowledge-base",
    name: "My Knowledge Base",
    nodeCount: 150,
    userPermissions: { canRead: true, canWrite: true }
  }
}
```

**Example (space not found)**:
```typescript
{
  status: "NOT_FOUND",
  statusCode: 404,
  existingSpace: undefined
}
```

---

### SlugValidationResult

Represents the result of client-side slug validation before API calls.

**Fields**:
- `valid`: boolean (required) - Overall validation status
- `errors`: string[] (required) - List of validation errors (empty if valid)
- `format`: string (constant) - Expected format description ("lowercase-alphanumeric-hyphen")
- `minLength`: number (constant) - Minimum slug length (1)
- `maxLength`: number (constant) - Maximum slug length (50)

**Validation Rules** (from FR-003, FR-004):
- Pattern: `^[a-z0-9-]+$`
- Length: 1-50 characters
- Not in reserved list
- Validation must complete in <10ms (NFR-002)

**Example (valid slug)**:
```typescript
{
  valid: true,
  errors: [],
  format: "lowercase-alphanumeric-hyphen",
  minLength: 1,
  maxLength: 50
}
```

**Example (invalid slug)**:
```typescript
{
  valid: false,
  errors: [
    "Slug contains invalid characters. Use only lowercase letters, numbers, and hyphens",
    "Slug is reserved. Choose a different name"
  ],
  format: "lowercase-alphanumeric-hyphen",
  minLength: 1,
  maxLength: 50
}
```

---

### SpaceCreationAttempt

Represents a single attempt to create a space (for logging and retry tracking).

**Fields**:
- `attemptNumber`: number (required) - Attempt number (1-4)
- `slug`: string (required) - Slug being created
- `timestamp`: ISO-8601 timestamp (required) - When attempt started
- `success`: boolean (required) - Whether attempt succeeded
- `statusCode`: number (optional) - HTTP status code if backend responded
- `error`: string (optional) - Error message if attempt failed
- `retryDelay`: number (optional) - Delay in ms before next retry (if applicable)

**Validation Rules** (from FR-006):
- Max 4 attempts (initial + 3 retries)
- Retry delays: [1000ms, 2000ms, 4000ms]
- Log all attempts to `~/.mujarrad/logs/` (NFR-004)

**Example (successful attempt)**:
```typescript
{
  attemptNumber: 1,
  slug: "my-space",
  timestamp: "2025-10-17T10:30:45.123Z",
  success: true,
  statusCode: 201
}
```

**Example (failed attempt with retry)**:
```typescript
{
  attemptNumber: 2,
  slug: "my-space",
  timestamp: "2025-10-17T10:30:46.456Z",
  success: false,
  statusCode: 500,
  error: "Internal server error",
  retryDelay: 2000
}
```

---

## State Machines

### Space Creation Flow

Describes the control flow for automatic space creation during `mujarrad init`.

**States**:
1. **VALIDATE_SLUG** - Client-side slug validation
2. **CHECK_EXISTENCE** - Query backend for space existence
3. **SPACE_EXISTS** - Space found, proceed with init
4. **SPACE_NOT_FOUND** - Space not found (404)
5. **AUTO_CREATE_DISABLED** - User provided `--no-auto-create` flag
6. **CREATE_SPACE** - Attempt space creation via API
7. **CREATION_RETRY** - Retry creation after network/server error
8. **VALIDATE_AGAIN** - Re-check space existence after creation
9. **PROCEED_INIT** - Begin vault upload
10. **FAIL** - Terminal state, display error and exit

**Transitions**:
```
START
  → VALIDATE_SLUG
    ├─[invalid slug]→ FAIL (error: "Invalid slug format")
    └─[valid slug]→ CHECK_EXISTENCE
                     ├─[200 OK]→ SPACE_EXISTS
                     │           ├─[metadata flags provided]→ WARN "Metadata flags ignored"
                     │           └→ PROCEED_INIT
                     ├─[404 NOT FOUND]→ SPACE_NOT_FOUND
                     │                  ├─[--no-auto-create]→ AUTO_CREATE_DISABLED → FAIL
                     │                  └─[auto-create enabled]→ CREATE_SPACE
                     │                                           ├─[201 Created]→ VALIDATE_AGAIN
                     │                                           │                 ├─[200 OK]→ PROCEED_INIT
                     │                                           │                 └─[error]→ FAIL (error: "Creation succeeded but validation failed")
                     │                                           ├─[400/409/403]→ FAIL (error: client error, no retry)
                     │                                           ├─[500+/network error]→ CREATION_RETRY
                     │                                           │                       ├─[attempts < 4]→ CREATE_SPACE (after delay)
                     │                                           │                       └─[attempts >= 4]→ FAIL (error: "Creation failed after 3 retries")
                     │                                           └→ ...
                     ├─[403 FORBIDDEN]→ FAIL (error: "Access denied")
                     └─[500+]→ FAIL (error: "Server error during validation")

PROCEED_INIT → [normal init workflow from spec 009]
```

**Validation Rules** (from FR-001, FR-002, FR-006, FR-013, FR-014, FR-015):
- Default behavior: auto-create enabled unless `--no-auto-create` provided
- Retry only on 500+ and network errors (not 400/409/403/401)
- Max 4 total attempts (initial + 3 retries)
- Re-validate after successful creation to confirm

---

## Validation Rules by Functional Requirement

### FR-001: Pre-validation Check
- Before creation, call GET `/api/spaces/{slug}`
- Handle all possible responses: 200 (exists), 404 (not found), 403 (forbidden), 500+ (error)

### FR-002: Automatic Creation on 404
- If GET returns 404 AND auto-create enabled, call POST `/api/spaces`
- Request body: SpaceCreationRequest with client-side defaults applied

### FR-003: Client-side Slug Validation
- Regex: `^[a-z0-9-]+$`
- Must pass before any API call (fail fast)
- Validation time: <10ms (NFR-002)

### FR-004: Slug Length Constraints
- Min: 1 character
- Max: 50 characters
- Block creation if outside range

### FR-005: Creation Confirmation Message
- Display after successful creation: `✓ Created new space: {slug}`
- Use chalk.green for success symbol

### FR-006: Retry Logic
- Retry count: 3 (plus initial = 4 total attempts)
- Backoff delays: [1000ms, 2000ms, 4000ms]
- Retry only on: 500+, ECONNREFUSED, ETIMEDOUT, ENOTFOUND

### FR-007: Error Handling
- Provide actionable error messages for all failure scenarios:
  - Invalid slug: Show format requirements + example
  - Duplicate slug: Suggest alternatives
  - Account limit: Link to upgrade page
  - Network error: Suggest checking connection
  - Server error: Suggest retry or manual creation

### FR-008 & FR-009: Optional Metadata Flags
- `--space-name <name>`: Set displayName (defaults to slug if omitted)
- `--space-description <text>`: Set description (defaults to "" if omitted)

### FR-010 & FR-011: Default Values
- displayName default: slug value
- description default: empty string ""
- isPublic default: false

### FR-012: Metadata Flags on Existing Spaces
- If space exists AND (--space-name OR --space-description provided):
  - Display warning: `⚠️  Space already exists. Metadata flags ignored`
  - Continue with init (non-fatal)

### FR-013 & FR-014: Explicit Control Flag
- `--no-auto-create`: Disable automatic creation
- If provided + space not found: Fail with error "Space '{slug}' not found. Auto-creation disabled"
- Exit code: 4 (same as spec 009 for space not found)

### FR-015: Default Behavior
- Auto-creation ENABLED by default (unless `--no-auto-create` provided)

### FR-016, FR-017, FR-018: Backward Compatibility
- When space exists: Validation flow identical to spec 009 (no changes)
- All existing flags preserved: `--space`, `--sync`, `--strategy`, `--batch-size`
- Works with --sync: Create space first, then proceed with sync workflow

---

## Non-Functional Requirements

### NFR-001: Creation Performance
- Space creation must complete within 5 seconds on standard broadband (10 Mbps)
- Includes: slug validation + existence check + creation + re-validation
- Total time budget: <5 seconds for success path, <12 seconds worst case (with 3 retries)

### NFR-002: Validation Performance
- Client-side slug validation must complete in <10ms
- No API call needed for validation (pure regex check)

### NFR-003: Error Message Quality
- All errors provide actionable next steps
- Include examples for format errors
- Include links to web interface for account limit errors

### NFR-004: Logging Requirements
- Log all creation attempts (success and failure)
- Log location: `~/.mujarrad/logs/space-creation-{YYYY-MM-DD}.log`
- Format: JSON Lines (one JSON object per line)
- Fields: timestamp, level, event, slug, details

---

## Integration Points

### With Spec 009 (Init Command Enhancement)
- Reuses `SpaceValidator` service for existence checks
- Integrates with `--sync` workflow: create space first, then proceed with sync
- Preserves all spec 009 validation logic when space already exists

### With Backend API
- **Required Endpoint**: POST `/api/spaces`
- **Expected Responses**:
  - 201 Created: Space successfully created (returns SpaceCreationResponse)
  - 400 Bad Request: Invalid slug format
  - 409 Conflict: Slug already taken
  - 403 Forbidden: Account limit reached or permission denied
  - 500+ Server Error: Transient error, should retry

### With CLI Configuration
- Reads API base URL from `~/.mujarrad/config.json`
- Retrieves auth token from system keychain via `CredentialManager`
- Logs to `~/.mujarrad/logs/` directory

---

## Example Workflows

### Workflow 1: Create New Space and Upload

**User Command**:
```bash
mujarrad init ./my-vault --space my-new-space
```

**Flow**:
1. Parse flags: `space = "my-new-space"`, `autoCreate = true` (default)
2. Validate slug: ✓ Valid (lowercase, 13 chars, not reserved)
3. Check existence: GET `/api/spaces/my-new-space` → 404 Not Found
4. Create space: POST `/api/spaces` with `{ slug: "my-new-space", displayName: "my-new-space", description: "", isPublic: false }`
5. Backend responds: 201 Created with SpaceCreationResponse
6. Display: `✓ Created new space: my-new-space`
7. Validate again: GET `/api/spaces/my-new-space` → 200 OK
8. Proceed with vault upload (spec 009)

### Workflow 2: Create Space with Metadata

**User Command**:
```bash
mujarrad init ./vault --space kb --space-name "Knowledge Base" --space-description "Work notes"
```

**Flow**:
1. Parse flags: `space = "kb"`, `displayName = "Knowledge Base"`, `description = "Work notes"`
2. Validate slug: ✓ Valid
3. Check existence: GET `/api/spaces/kb` → 404 Not Found
4. Create space: POST `/api/spaces` with `{ slug: "kb", displayName: "Knowledge Base", description: "Work notes", isPublic: false }`
5. Backend responds: 201 Created
6. Display: `✓ Created new space: kb`
7. Proceed with upload

### Workflow 3: Space Already Exists (Metadata Flags Ignored)

**User Command**:
```bash
mujarrad init ./vault --space existing --space-name "New Name"
```

**Flow**:
1. Parse flags: `space = "existing"`, `displayName = "New Name"`
2. Validate slug: ✓ Valid
3. Check existence: GET `/api/spaces/existing` → 200 OK (space exists)
4. Detect metadata flags + existing space
5. Display warning: `⚠️  Space already exists. Metadata flags ignored`
6. Proceed with upload to existing space (no creation)

### Workflow 4: Disabled Auto-Create

**User Command**:
```bash
mujarrad init ./vault --space nonexistent --no-auto-create
```

**Flow**:
1. Parse flags: `space = "nonexistent"`, `autoCreate = false`
2. Validate slug: ✓ Valid
3. Check existence: GET `/api/spaces/nonexistent` → 404 Not Found
4. Detect `--no-auto-create` flag
5. Fail with error: `✗ Space 'nonexistent' not found. Auto-creation disabled by --no-auto-create flag`
6. Exit code: 4

### Workflow 5: Slug Already Taken

**User Command**:
```bash
mujarrad init ./vault --space admin
```

**Flow**:
1. Parse flags: `space = "admin"`
2. Validate slug: ✗ Invalid (reserved slug)
3. Fail with error: `✗ Space slug 'admin' is reserved. Choose a different name`
4. Exit code: 1 (validation failure)

---

## Summary

This data model defines 5 core entities (SpaceCreationRequest, SpaceCreationResponse, SpaceValidationResult, SlugValidationResult, SpaceCreationAttempt), 1 state machine (Space Creation Flow), and comprehensive validation rules mapping to all 18 functional requirements. The model is technology-agnostic and ready for implementation in TypeScript/Node.js CLI tool.

**Next Steps**: Define API contract (contracts/space-creation-api.yaml) and quickstart guide (quickstart.md)
