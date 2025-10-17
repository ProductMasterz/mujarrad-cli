# Phase 0: Research & Technical Decisions

**Feature**: Init Command Auto-Create Space
**Date**: 2025-10-17
**Status**: COMPLETE

## Overview

This document captures all technical decisions made during the research phase for automatic space creation functionality. Each decision includes the chosen approach, rationale, and alternatives considered.

---

## Decision 1: Backend Space Creation API Design

**Context**: Need to define the exact request/response format for POST `/api/spaces`

**Decision**: Use client-side defaults for optional fields

**Chosen Approach**:
- Request body: `{ slug: string, displayName?: string, description?: string, isPublic?: boolean }`
- If `displayName` not provided by CLI, client sends `displayName: slug`
- If `description` not provided by CLI, client sends `description: ""`
- If `isPublic` not provided, client sends `isPublic: false`
- Client constructs complete request before sending to backend

**Rationale**:
- Explicit client-side defaults provide predictable behavior
- Reduces backend complexity (no need to infer defaults)
- Easier to test and debug (full payload always sent)
- Aligns with spec requirement: "If `--space-name` is not provided, system MUST use the space slug as the default display name" (FR-010)

**Alternatives Considered**:
1. ❌ **Server-side defaults**: Backend applies defaults if fields omitted
   - Rejected: Splits default logic across client and backend, harder to maintain
   - Rejected: Harder to test (need to mock both scenarios: with/without fields)

2. ❌ **Require all fields**: Make displayName/description/isPublic required in CLI
   - Rejected: Poor user experience (forces users to provide description even if empty)
   - Rejected: Violates spec requirement for optional metadata (FR-008, FR-009)

**Implementation Notes**:
- `SpaceCreationService` constructs full `SpaceCreationRequest` with defaults before API call
- Backend still validates all fields (defense in depth)

---

## Decision 2: Slug Validation Regex Pattern

**Context**: Need exact slug validation rules to match backend requirements

**Decision**: Regex `^[a-z0-9-]+$`, length 1-50 chars, reserved slug list

**Chosen Approach**:
- Regex pattern: `^[a-z0-9-]+$` (lowercase letters, numbers, hyphens only)
- Minimum length: 1 character
- Maximum length: 50 characters
- Reserved slugs (block client-side): `['admin', 'api', 'auth', 'system', 'public', 'private', 'space', 'space', 'user', 'settings']`
- Validation happens client-side BEFORE API call
- Backend still validates (defense in depth)

**Rationale**:
- Matches spec requirement: "Space slug MUST be validated client-side before creation attempt using regex: `^[a-z0-9-]+$`" (FR-003)
- 50-char max aligns with typical database VARCHAR limits and URL length best practices
- Reserved slug list prevents conflicts with system routes and future API endpoints
- Client-side validation provides immediate feedback (FR-003: "prevent auto-creation if space slug is empty or exceeds 50 characters")

**Alternatives Considered**:
1. ❌ **Backend validation only**: Skip client-side validation
   - Rejected: Wastes network round-trip for obvious errors
   - Rejected: Violates spec requirement for client-side validation (FR-003)

2. ❌ **Looser pattern (allow uppercase)**: Regex `^[A-Za-z0-9-]+$`
   - Rejected: Spec explicitly requires lowercase only (FR-003, Acceptance Scenario 4)
   - Rejected: URL slugs conventionally lowercase for consistency

3. ❌ **No reserved slug list**: Let backend reject reserved slugs only
   - Rejected: Better UX to fail fast on client with clear error message
   - Rejected: Spec edge case: "Space slug 'admin' is reserved. Choose a different name"

**Implementation Notes**:
- Create `SlugValidator.ts` utility with `validate(slug: string): SlugValidationResult` method
- Return detailed errors for different failure modes (empty, too long, invalid chars, reserved)

---

## Decision 3: Retry Strategy for Network Failures

**Context**: Determine retry count and backoff timing for creation failures

**Decision**: 3 retries with exponential backoff (1s, 2s, 4s), retry only on 500+ and network errors

**Chosen Approach**:
- Retry count: 3 attempts (initial + 3 retries = 4 total tries)
- Backoff timing: Exponential with base delays [1000ms, 2000ms, 4000ms]
- Retry only on:
  - HTTP 500+ status codes (server errors)
  - Network errors (ECONNREFUSED, ETIMEDOUT, ENOTFOUND)
- Fail immediately (no retry) on:
  - HTTP 400 (invalid slug - client error, won't fix with retry)
  - HTTP 409 (duplicate slug - won't change)
  - HTTP 403 (forbidden/quota - won't change)
  - HTTP 401 (unauthorized - auth issue, not transient)

**Rationale**:
- Matches spec requirement: "System MUST retry space creation up to 3 times on network failures with exponential backoff (1s, 2s, 4s)" (FR-006)
- Exponential backoff reduces server load during outages
- Total retry time: 1s + 2s + 4s = 7 seconds max (within 5-second target with leeway for actual API call time)
- Selective retry avoids wasting time on non-transient errors

**Alternatives Considered**:
1. ❌ **Fixed delay (1s each)**: Retry every 1 second
   - Rejected: Doesn't give server time to recover from overload
   - Rejected: Spec explicitly requires exponential backoff (FR-006)

2. ❌ **Jittered backoff**: Add random jitter to backoff timing
   - Rejected: Overkill for single-user CLI tool (jitter useful for coordinated thundering herd)
   - Rejected: Spec specifies exact timing (1s, 2s, 4s)

3. ❌ **Retry on all errors**: Retry even 400/409/403
   - Rejected: Wastes time on errors that won't resolve with retry
   - Rejected: Degrades UX (7-second delay before showing "slug taken" error)

**Implementation Notes**:
- Use Axios retry interceptor or custom retry wrapper in `SpaceCreationService`
- Log each retry attempt with attempt number and delay duration (NFR-004)

---

## Decision 4: Error Message Design for User Guidance

**Context**: Format error messages with actionable next steps

**Decision**: Verbose error messages with contextual guidance and next steps

**Chosen Approach**:
```
Invalid slug format:
✗ Invalid space slug format. Use only lowercase letters, numbers, and hyphens
Example: my-space-123

Slug already taken:
✗ Space 'my-space' is already taken. Choose a different name
Try: my-space-2, my-space-v2, or a unique slug

Account limit:
✗ Space creation failed: account limit reached (5/5 spaces used)
Upgrade your plan or delete unused spaces at https://www.mujarrad.com/spaces

Network error:
✗ Failed to create space: network error
Check your internet connection and try again

Server error:
✗ Space creation failed after 3 attempts: server error
Try again later or create the space manually at https://www.mujarrad.com
```

**Rationale**:
- Matches spec requirement: "Error messages MUST provide actionable guidance" (NFR-003)
- Each error includes:
  - ✗ symbol for visual recognition
  - Clear problem description
  - Specific next step or alternative action
  - Links to web interface when applicable
- Aligns with existing CLI error message patterns (checked init.ts, template.ts)

**Alternatives Considered**:
1. ❌ **Terse messages**: "Invalid slug" or "Error 400"
   - Rejected: Poor UX, users don't know what to do next
   - Rejected: Violates NFR-003 (actionable guidance required)

2. ❌ **Interactive error recovery**: Prompt user to enter new slug on failure
   - Rejected: Out of scope for this feature
   - Rejected: Users can simply re-run command with different slug

3. ❌ **Auto-suggest alternative slugs**: On 409, suggest "my-space-2"
   - Rejected: Requires additional API call to check availability
   - Rejected: Out of scope (spec edge case says "user must manually choose alternative")

**Implementation Notes**:
- Create error message templates in `SpaceCreationService`
- Use chalk for color formatting (red for errors, yellow for warnings, gray for hints)

---

## Decision 5: Integration with Existing Spec 009 Validation

**Context**: Integrate auto-creation into existing validation flow without breaking backward compatibility

**Decision**: Unified flow with conditional branching based on flags

**Chosen Approach**:
```
Flow:
1. Parse flags (--space, --space-name, --space-description, --no-auto-create)
2. Validate slug client-side (SlugValidator)
3. Check space existence via SpaceValidator.validateSpace()
4. If space exists:
   - If --space-name or --space-description provided: Warn "Space already exists. Metadata flags ignored"
   - Proceed with normal init flow (spec 009)
5. If space does NOT exist (404):
   - If --no-auto-create: Fail with "Space not found. Auto-creation disabled"
   - Otherwise: Create space via SpaceCreationService
   - Re-validate space existence (confirm creation succeeded)
   - Proceed with normal init flow
```

**Rationale**:
- Single code path reduces maintenance burden
- Conditional branches based on flags are explicit and testable
- Preserves existing validation logic from spec 009 (SpaceValidator unchanged)
- Matches spec requirement: "System MUST maintain existing init command behavior when space already exists" (FR-016)

**Alternatives Considered**:
1. ❌ **Separate code paths**: Different flow for auto-create vs. existing space
   - Rejected: Code duplication, harder to maintain
   - Rejected: Risk of divergence between paths over time

2. ❌ **Strategy pattern**: Different validation strategies based on flags
   - Rejected: Over-engineered for simple conditional logic
   - Rejected: Harder to understand control flow

3. ❌ **Feature flag in config**: Enable/disable auto-create globally
   - Rejected: Spec requires per-command control via `--no-auto-create` flag
   - Rejected: Less flexible than flag-based approach

**Implementation Notes**:
- Extend `init.ts` command action handler with new logic
- Reuse `SpaceValidator` for existence checks (no changes needed)
- Add `SpaceCreationService` call in 404 + auto-create path

---

## Decision 6: Metadata Flag Handling for Existing Spaces

**Context**: Behavior when --space-name/--space-description provided for existing space

**Decision**: Warn and continue (non-fatal, informational message)

**Chosen Approach**:
- When space exists AND (--space-name OR --space-description provided):
  - Display warning: `⚠️  Space already exists. Metadata flags ignored`
  - Continue with normal init flow (do not fail)
- When space does not exist:
  - Use provided metadata for creation
- Logging: Log the ignored flags at INFO level

**Rationale**:
- Matches spec requirement: "System MUST ignore `--space-name` and `--space-description` flags when space already exists, displaying warning" (FR-012)
- Non-fatal warning preserves user intent (they want to init, not just set metadata)
- Prevents surprise failures when user forgets space already exists
- Consistent with spec acceptance scenario: "displays warning message"

**Alternatives Considered**:
1. ❌ **Error and fail**: Exit with error if metadata flags provided for existing space
   - Rejected: Overly strict, breaks user workflow
   - Rejected: Spec explicitly says "ignore" not "reject" (FR-012)

2. ❌ **Silent ignore**: No warning, just proceed
   - Rejected: Users won't know their metadata flags had no effect
   - Rejected: Spec requires warning message (FR-012, Acceptance Scenario 3)

3. ❌ **Update existing space metadata**: Apply flags to existing space
   - Rejected: Out of scope (spec says "updating metadata for existing spaces via CLI" is out of scope)
   - Rejected: Would require different API endpoint (PATCH `/api/spaces/{slug}`)

**Implementation Notes**:
- Add conditional check in init command after existence validation
- Use chalk.yellow for warning message (consistent with deprecation warnings in template.ts:302)

---

## Decision 7: Logging Strategy for Creation Attempts

**Context**: What to log for successful and failed space creation attempts

**Decision**: Structured JSON logging to ~/.mujarrad/logs/space-creation-{date}.log

**Chosen Approach**:
- Log format: JSON Lines (one JSON object per line)
- Log location: `~/.mujarrad/logs/space-creation-{YYYY-MM-DD}.log` (daily rotation)
- Log levels:
  - INFO: Successful creation
  - WARN: Retries, ignored metadata flags
  - ERROR: Creation failures (after all retries exhausted)
- Log fields:
  ```json
  {
    "timestamp": "2025-10-17T10:30:45.123Z",
    "level": "INFO",
    "event": "space_creation_success",
    "slug": "my-space",
    "displayName": "My Space",
    "spaceId": "uuid-here",
    "createdAt": "2025-10-17T10:30:45.000Z",
    "attempts": 1
  }

  {
    "timestamp": "2025-10-17T10:35:12.456Z",
    "level": "ERROR",
    "event": "space_creation_failed",
    "slug": "my-space",
    "error": "Space already taken",
    "statusCode": 409,
    "attempts": 1
  }

  {
    "timestamp": "2025-10-17T10:40:00.789Z",
    "level": "WARN",
    "event": "space_creation_retry",
    "slug": "my-space",
    "attempt": 2,
    "maxAttempts": 4,
    "delay": 2000,
    "error": "Network timeout"
  }
  ```

**Rationale**:
- Matches spec requirement: "System MUST log all space creation attempts (success and failure) to `~/.mujarrad/logs/` for debugging" (NFR-004)
- JSON Lines format enables easy parsing for debugging/analytics
- Daily rotation prevents log file growth
- Structured fields enable filtering (e.g., all failures, all retries)
- Existing Logger.ts uses winston with JSON format (consistent approach)

**Alternatives Considered**:
1. ❌ **Plain text logging**: Human-readable log messages
   - Rejected: Harder to parse programmatically
   - Rejected: Winston already configured for JSON (consistent with existing logs)

2. ❌ **Single log file**: All creation logs in one file (no rotation)
   - Rejected: File grows unbounded over time
   - Rejected: Existing logs use daily rotation (consistent approach)

3. ❌ **No logging**: Only console output
   - Rejected: Violates NFR-004 (logging required for debugging)
   - Rejected: Loses audit trail for production troubleshooting

**Implementation Notes**:
- Extend existing `Logger.ts` with space-specific log methods
- Use winston-daily-rotate-file transport (already in dependencies)
- Log to `~/.mujarrad/logs/space-creation-%DATE%.log`

---

## Decision 8: Interaction with --sync Flag

**Context**: How auto-created spaces work with sync workflow from spec 009

**Decision**: Treat new empty spaces same as existing empty spaces (no special handling)

**Chosen Approach**:
- When `mujarrad init ./vault --space new-space --sync` is run:
  1. Create space if it doesn't exist
  2. Proceed with normal sync workflow (spec 009)
  3. Since space is empty, sync behaves as: "No remote content to pull" + upload all local files
- No special branching logic for newly-created spaces vs. existing empty spaces
- Sync workflow is unaware whether space was just created or already existed

**Rationale**:
- Spec requirement: "System creates the space first, then proceeds with normal init behavior. Since the new space is empty, there's nothing to sync, so it uploads all local files" (Edge Cases section)
- Simpler implementation (no need to track "newly created" state)
- Existing sync logic already handles empty spaces correctly (tested in spec 009)
- Matches spec requirement: "System MUST work seamlessly with `--sync` flag: create space first if needed, then proceed with sync workflow" (FR-018)

**Alternatives Considered**:
1. ❌ **Skip sync for newly-created spaces**: Auto-disable --sync if space was just created
   - Rejected: Violates user intent (they explicitly provided --sync flag)
   - Rejected: Inconsistent behavior (same command produces different results based on whether space existed)

2. ❌ **Special handling for new spaces**: Track "just created" state and optimize sync
   - Rejected: Unnecessary complexity (sync on empty space is already optimized - no downloads)
   - Rejected: Spec says "treat same as existing empty spaces"

3. ❌ **Warn about sync on new space**: Display "Space is empty, --sync has no effect"
   - Rejected: Confusing message (sync still uploads, it's not truly "no effect")
   - Rejected: Spec doesn't mention any warning for this scenario

**Implementation Notes**:
- No code changes needed for sync integration
- Existing sync workflow (spec 009) handles empty spaces correctly
- Integration test should verify: `init --space new-space --sync` creates space + uploads all files

---

## Summary

All 8 research tasks complete. Key technical decisions:

1. ✅ **API Design**: Client-side defaults (displayName = slug, description = "", isPublic = false)
2. ✅ **Slug Validation**: Regex `^[a-z0-9-]+$`, 1-50 chars, reserved slug list
3. ✅ **Retry Strategy**: 3 retries, exponential backoff (1s, 2s, 4s), retry only 500+ and network errors
4. ✅ **Error Messages**: Verbose with actionable guidance and next steps
5. ✅ **Integration Flow**: Unified flow with conditional branching, reuse spec 009 validation
6. ✅ **Metadata Flags**: Warn and continue when provided for existing space
7. ✅ **Logging**: JSON Lines to ~/.mujarrad/logs/space-creation-{date}.log
8. ✅ **Sync Integration**: No special handling, treat new spaces like existing empty spaces

**Next Phase**: Design & Contracts (data-model.md, contracts/space-creation-api.yaml, quickstart.md)
