# Feature Specification: Init Command Auto-Create Space

**Feature Branch**: `010-alter-the-init`
**Created**: 2025-10-17
**Status**: Draft
**Input**: User description: "alter the init feature of the CLI to include the creation of the space if it doesn't exist and this is a total new option aside from the template cloning"

## Overview

The current `mujarrad init` command validates that a space exists before uploading vault content (spec 009). If the space doesn't exist, the command fails with an error message directing users to create the space manually via the web interface at https://www.mujarrad.com or using the (not yet implemented) `mujarrad space create` command.

This feature enhances the init command to automatically create a space when it doesn't exist, making the initialization workflow seamless for users who want to quickly start syncing their vault without manually pre-creating spaces. This is distinct from template cloning (which uses `mujarrad template clone`) and provides a zero-configuration path for new users.

## User Scenarios & Testing

### User Story 1 - Auto-Create Space on Init (Priority: P1)

As a new user initializing my Obsidian vault to Mujarrad for the first time, I want the system to automatically create the space if it doesn't exist, so I can start syncing immediately without navigating to the web interface or running separate commands.

**Why this priority**: This is the most critical feature because it removes friction for new users and provides the fastest path to value. It transforms init from a two-step process (create space, then init) into a single command, significantly improving user experience.

**Independent Test**: Can be fully tested by running `mujarrad init ./my-vault --space brand-new-space` where "brand-new-space" doesn't exist on the server, and verifying the system creates the space automatically and proceeds with upload.

**Acceptance Scenarios**:

1. **Given** I am authenticated and have a valid vault, **When** I run `mujarrad init . --space new-space` and the space does NOT exist, **Then** the system automatically creates the space with the provided slug and proceeds with vault upload, displaying "Created new space: new-space"

2. **Given** I am authenticated and have a valid vault, **When** I run `mujarrad init . --space existing-space` and the space ALREADY exists, **Then** the system skips creation, validates the existing space normally (spec 009 behavior), and proceeds with upload

3. **Given** I am authenticated, **When** I run `mujarrad init . --space new-space` and the space slug is already taken by another user, **Then** the system fails with error "Space 'new-space' is already taken. Choose a different name" without uploading any files

4. **Given** I am authenticated, **When** I run `mujarrad init . --space invalid@space!` with invalid characters, **Then** the system fails with error "Invalid space slug format. Use only lowercase letters, numbers, and hyphens" before attempting creation or upload

---

### User Story 2 - Customizable Space Metadata on Creation (Priority: P2)

As a user auto-creating a space during init, I want to optionally provide a human-readable name and description for the new space, so my space has meaningful metadata beyond just the slug.

**Why this priority**: This provides a better user experience by allowing users to set descriptive metadata upfront, but it's not critical for MVP functionality. Users can always update this metadata later via the web interface.

**Independent Test**: Can be fully tested by running `mujarrad init ./vault --space my-space --space-name "My Knowledge Base" --space-description "Personal notes and research"` and verifying the created space has the provided name and description.

**Acceptance Scenarios**:

1. **Given** I am authenticated, **When** I run `mujarrad init . --space new-space --space-name "My Projects" --space-description "Work notes"`, **Then** the system creates a space with slug "new-space", display name "My Projects", and description "Work notes"

2. **Given** I am authenticated, **When** I run `mujarrad init . --space new-space` without providing name or description, **Then** the system creates a space with slug "new-space", using the slug as the display name and an empty description (reasonable defaults)

3. **Given** I am authenticated, **When** I run `mujarrad init . --space existing-space --space-name "Updated Name"` and the space already exists, **Then** the system ignores the `--space-name` and `--space-description` flags with a warning message "Space already exists. Metadata flags ignored"

---

### User Story 3 - Explicit Control Over Creation Behavior (Priority: P3)

As a power user, I want to control whether init should auto-create missing spaces or fail immediately, so I can enforce stricter validation in automation scripts or CI/CD pipelines.

**Why this priority**: This is valuable for advanced users and automation scenarios but not essential for basic usage. Most users will benefit from auto-creation being the default behavior.

**Independent Test**: Can be fully tested by running `mujarrad init . --space nonexistent --no-auto-create` and verifying it fails immediately with an error instead of creating the space.

**Acceptance Scenarios**:

1. **Given** I am authenticated, **When** I run `mujarrad init . --space nonexistent --no-auto-create` and the space doesn't exist, **Then** the system fails with error "Space 'nonexistent' not found. Auto-creation disabled by --no-auto-create flag" without creating the space or uploading files

2. **Given** I am authenticated, **When** I run `mujarrad init . --space existing-space --no-auto-create` and the space exists, **Then** the system validates the space normally and proceeds with upload (no behavior change)

3. **Given** I run `mujarrad init . --space new-space` without the `--no-auto-create` flag (default behavior), **When** the space doesn't exist, **Then** the system auto-creates the space (default is auto-creation enabled)

---

### Edge Cases

- What happens when space creation fails due to a network error?
  - System should fail with error "Failed to create space: network error" and abort the init process without uploading any files. User can retry the command once network is restored.

- What happens when I try to create a space but I've reached my account's space limit?
  - System should fail with error "Space creation failed: account limit reached (X/Y spaces used). Upgrade your plan or delete unused spaces at https://www.mujarrad.com/spaces"

- What happens when the backend API returns a 500 error during space creation?
  - System should retry space creation up to 3 times with exponential backoff, then fail with error "Space creation failed after 3 attempts: server error. Try again later or create the space manually"

- What happens when I provide a space slug that's reserved or blocked by the system?
  - System should fail with error "Space slug 'admin' is reserved. Choose a different name" without attempting creation

- What happens when space validation succeeds but space creation somehow creates a duplicate?
  - This shouldn't happen (validation ensures uniqueness), but if it does, the backend should return a 409 Conflict error, and the CLI should fail with "Space creation failed: duplicate slug detected"

- What happens when I run init with `--sync` and auto-create a new space?
  - System creates the space first, then proceeds with normal init behavior. Since the new space is empty, there's nothing to sync, so it uploads all local files (identical to running init without --sync on an empty remote space)

## Requirements

### Functional Requirements

#### Space Auto-Creation

- **FR-001**: System MUST attempt to validate space existence before creation (call GET `/api/spaces/{slug}`)
- **FR-002**: If validation returns 404 (space not found) and auto-creation is enabled (default), system MUST create the space via POST `/api/spaces`
- **FR-003**: Space slug MUST be validated client-side before creation attempt using regex: `^[a-z0-9-]+$` (lowercase letters, numbers, hyphens only)
- **FR-004**: System MUST prevent auto-creation if space slug is empty or exceeds 50 characters
- **FR-005**: System MUST display confirmation message after successful space creation: "✓ Created new space: {slug}"
- **FR-006**: System MUST retry space creation up to 3 times on network failures with exponential backoff (1s, 2s, 4s)
- **FR-007**: System MUST fail gracefully with actionable error messages when space creation fails (network error, duplicate slug, account limit, reserved slug)

#### Space Metadata Configuration

- **FR-008**: System MUST support optional `--space-name <name>` flag to set human-readable display name during creation
- **FR-009**: System MUST support optional `--space-description <text>` flag to set space description during creation
- **FR-010**: If `--space-name` is not provided, system MUST use the space slug as the default display name
- **FR-011**: If `--space-description` is not provided, system MUST create the space with an empty description
- **FR-012**: System MUST ignore `--space-name` and `--space-description` flags when space already exists, displaying warning: "Space already exists. Metadata flags ignored"

#### Explicit Creation Control

- **FR-013**: System MUST support optional `--no-auto-create` flag to disable automatic space creation
- **FR-014**: When `--no-auto-create` is set and space doesn't exist, system MUST fail with error "Space '{slug}' not found. Auto-creation disabled" and exit code 4
- **FR-015**: Default behavior (without `--no-auto-create`) MUST enable automatic space creation for missing spaces

#### Backward Compatibility

- **FR-016**: System MUST maintain existing init command behavior when space already exists (no changes to spec 009 validation logic)
- **FR-017**: System MUST preserve all existing flags (`--space`, `--sync`, `--strategy`, `--batch-size`) with identical behavior
- **FR-018**: System MUST work seamlessly with `--sync` flag: create space first if needed, then proceed with sync workflow

### Non-Functional Requirements

- **NFR-001**: Space creation MUST complete within 5 seconds on standard broadband connection (10 Mbps download/upload)
- **NFR-002**: Client-side slug validation MUST complete in under 10ms (no API call needed)
- **NFR-003**: Error messages MUST provide actionable guidance (e.g., suggest alternative slugs, link to web interface)
- **NFR-004**: System MUST log all space creation attempts (success and failure) to `~/.mujarrad/logs/` for debugging

### Key Entities

- **Space Creation Request**: Represents the parameters for creating a new space, including slug (required), displayName (optional, defaults to slug), description (optional, defaults to empty string), and isPublic (defaults to false)

- **Space Creation Response**: Represents the backend response after successful space creation, including spaceId (UUID), slug, displayName, description, createdAt timestamp, and owner information

- **Space Validation Result**: Represents the result of validating space existence, with status codes: EXISTS (200), NOT_FOUND (404), FORBIDDEN (403), CONFLICT (409 - slug taken), or SERVER_ERROR (500+)

## Success Criteria

### Measurable Outcomes

- **SC-001**: New users can initialize their vault and start syncing in under 30 seconds using a single command without visiting the web interface

- **SC-002**: Space creation completes within 5 seconds for 95% of requests on standard connections

- **SC-003**: Zero init operations fail due to "space not found" errors when auto-creation is enabled (100% success rate for valid slugs)

- **SC-004**: 90% of users successfully create spaces on first attempt without encountering validation errors

- **SC-005**: Users receive clear, actionable error messages for all failure scenarios (slug validation, account limits, network errors) with next steps

- **SC-006**: Backward compatibility maintained with 100% of existing init workflows working unchanged (when space already exists)

## Assumptions

- Backend API supports POST `/api/spaces` endpoint for creating new spaces (may require backend development if not yet implemented)
- Backend enforces unique space slugs per user (CLI relies on backend uniqueness validation)
- Users are authenticated before running init (existing requirement from spec 009)
- Space slug format rules match backend validation rules (lowercase alphanumeric + hyphens)
- Default space visibility is private (not public) unless user changes it later via web interface
- Auto-creation is the preferred default behavior for most users (power users can opt out with `--no-auto-create`)
- Template cloning workflow (`mujarrad template clone`) remains separate and unchanged - this feature only affects `mujarrad init`

## Dependencies

- Backend API must support space creation endpoint (POST `/api/spaces`) with authentication
- Backend API must return appropriate HTTP status codes: 201 (created), 409 (duplicate slug), 403 (quota exceeded), 400 (invalid slug)
- Existing space validation logic from spec 009 (GET `/api/spaces/{slug}`)
- Existing authentication and credential management system
- Existing init command flow and upload workflow

## Out of Scope

- Updating metadata (name, description, visibility) for existing spaces via CLI (users must use web interface)
- Space deletion via CLI (not part of init workflow)
- Space membership management (inviting collaborators, managing permissions)
- Automatic slug suggestion when user's preferred slug is taken (user must manually choose alternative)
- Migration or import from other tools during space creation
- Template selection or application during auto-creation (users should use `mujarrad template clone` for template-based workflows)
- Creating public spaces by default (all auto-created spaces are private; users can change visibility later)
