# Feature Specification: Init Command Enhancement

**Feature Branch**: `009-init-command-enhancement`
**Created**: 2025-10-12
**Status**: Draft
**Input**: User description: "Init Command Enhancement: Add workspace verification, pull remote changes, compare differences, and conflict resolution"

## Overview

The `mujarrad init` command currently performs one-way vault upload without verifying workspace existence beforehand or handling bidirectional synchronization. This enhancement transforms init into a comprehensive initialization command that validates the target workspace exists, pulls any existing remote content, detects conflicts between local and remote states, and resolves them before completing the upload.

This enhancement addresses critical gaps identified in production usage where users experience:
- Wasted processing time uploading to non-existent workspaces (only discovering failure after full scan)
- Lost remote edits when initializing a vault to an existing workspace
- Confusion about handling conflicts between local vault and remote workspace state
- Lack of clarity about what happens to existing remote content during initialization

## Clarifications

### Session 2025-10-12

- Q: When pulling remote nodes that already exist locally with the same file path during `--sync`, what should happen to the local file? → A: If both server version and local version have new edits (both diverged from common ancestor), treat as conflict requiring resolution. Otherwise, use version comparison to determine which is ahead.

- Q: When conflict resolution prompt times out after 120 seconds, what should happen to the sync operation? → A: Skip the conflicted file only and continue with other files. User must later choose which version to keep (remote or local) for each skipped file.

- Q: How should the system determine the "common ancestor" to detect if both versions have diverged? → A: Use backend version history - backend tracks all node versions and provides ancestor info via API.

- Q: When downloading multiple remote nodes during sync, if some downloads fail due to network errors, what should happen? → A: Abort entire sync operation and rollback all downloads to maintain consistency.

- Q: After successfully pulling remote nodes that are ahead, when should the CLI upload the local-ahead files? → A: Upload immediately after pull completes, in same sync operation.

## User Scenarios & Testing

### User Story 1 - Pre-flight Workspace Validation (Priority: P1)

As a user initializing my Obsidian vault to Mujarrad, I want the system to verify the target workspace exists BEFORE scanning my vault, so I don't waste time processing thousands of files only to discover the workspace doesn't exist.

**Why this priority**: This is the most critical enhancement because it provides immediate feedback and prevents wasted processing time. It's also the simplest to implement and test independently, making it the ideal starting point.

**Independent Test**: Can be fully tested by running `mujarrad init . --workspace nonexistent-workspace` and verifying it fails within 2 seconds with a clear error message before scanning any files.

**Acceptance Scenarios**:

1. **Given** I am authenticated and have a valid vault, **When** I run `mujarrad init . --workspace myworkspace` and the workspace exists, **Then** the system proceeds with vault scanning and displays "Workspace verified: myworkspace"

2. **Given** I am authenticated and have a valid vault, **When** I run `mujarrad init . --workspace invalid-workspace` and the workspace does NOT exist, **Then** the system fails within 2 seconds with error "Workspace 'invalid-workspace' not found" without scanning any vault files

3. **Given** I am authenticated, **When** I run `mujarrad init . --workspace restricted-workspace` and I don't have access, **Then** the system fails with error "Access denied to workspace 'restricted-workspace'. Contact the workspace owner for permissions"

---

### User Story 2 - Pull Remote Changes Before Upload (Priority: P2)

As a user initializing my vault to an EXISTING workspace that already has content, I want the system to pull any remote content from the workspace first, so I can see what already exists and avoid accidentally overwriting remote edits.

**Why this priority**: This prevents data loss for users who are initializing to an existing workspace with content. It's P2 because P1 (workspace validation) is a prerequisite, and this can be tested independently by creating a workspace with content, then initializing from an empty local vault.

**Independent Test**: Can be fully tested by creating a workspace with 5 nodes via the web UI, then running `mujarrad init ./empty-vault --workspace existing-workspace --sync` and verifying the 5 remote nodes are pulled to the local vault before upload begins.

**Acceptance Scenarios**:

1. **Given** I have an empty local vault and a workspace with 10 existing nodes, **When** I run `mujarrad init . --workspace myworkspace --sync`, **Then** the system pulls all 10 remote nodes to my local vault and displays "Pulled 10 remote nodes from workspace"

2. **Given** I have a local vault with 5 nodes and a workspace with 3 different nodes, **When** I run `mujarrad init . --workspace myworkspace --sync`, **Then** the system pulls the 3 remote nodes to my local vault without deleting my 5 local nodes

3. **Given** the workspace is empty, **When** I run `mujarrad init . --workspace myworkspace --sync`, **Then** the system displays "No remote content to pull" and proceeds with upload

4. **Given** I run init without the `--sync` flag, **When** I run `mujarrad init . --workspace myworkspace`, **Then** the system skips pulling remote changes and proceeds with one-way upload (backward compatibility)

---

### User Story 3 - Compare Local and Remote State (Priority: P3)

As a user initializing my vault with sync enabled, I want the system to compare my local files with remote workspace content and identify differences, so I understand what will change before any modifications are made.

**Why this priority**: This provides transparency and control before any destructive operations. It's P3 because it builds on P1 (validation) and P2 (pull), and delivers value by showing users a diff summary.

**Independent Test**: Can be fully tested by creating a workspace with node "A.md" (content: "remote version"), creating a local vault with "A.md" (content: "local version"), running `mujarrad init . --workspace test --sync`, and verifying the system displays "1 conflict detected: A.md (modified locally and remotely)"

**Acceptance Scenarios**:

1. **Given** I have local file "Note.md" with content "Local version" and remote node "Note.md" with content "Remote version", **When** I run `mujarrad init . --workspace myworkspace --sync`, **Then** the system displays "1 conflict: Note.md (modified locally and remotely)"

2. **Given** I have local file "New.md" that doesn't exist remotely, **When** I run `mujarrad init . --workspace myworkspace --sync`, **Then** the system displays "1 new local file: New.md"

3. **Given** I have a remote node "Old.md" that doesn't exist locally, **When** I run `mujarrad init . --workspace myworkspace --sync`, **Then** the system displays "1 remote-only file: Old.md (pulled to local vault)"

4. **Given** I have local file "Same.md" and remote node "Same.md" with identical content, **When** I run `mujarrad init . --workspace myworkspace --sync`, **Then** the system displays "1 file unchanged: Same.md (skipped)"

---

### User Story 4 - Interactive Conflict Resolution (Priority: P3)

As a user initializing my vault with conflicts detected, I want to interactively choose how to resolve each conflict (keep local, keep remote, or merge), so I maintain control over which version of my content is used.

**Why this priority**: This is tied to P3 (compare differences) because conflict resolution only matters after conflicts are detected. It's independently testable by setting up a known conflict scenario and verifying the interactive prompts work correctly.

**Independent Test**: Can be fully tested by creating a conflict scenario (same file with different content locally and remotely), running `mujarrad init . --workspace test --sync`, and verifying the system prompts with options: "A) Keep local version, B) Keep remote version, C) Merge manually, D) Skip this file"

**Acceptance Scenarios**:

1. **Given** I have a conflict on "Note.md", **When** the system prompts me and I choose "Keep local version", **Then** the system uploads my local version and overwrites the remote version

2. **Given** I have a conflict on "Note.md", **When** the system prompts me and I choose "Keep remote version", **Then** the system keeps the remote version locally and skips uploading this file

3. **Given** I have a conflict on "Note.md", **When** the system prompts me and I choose "Skip this file", **Then** the system leaves both versions unchanged and logs the skipped file

4. **Given** I have 5 conflicts, **When** I run `mujarrad init . --workspace myworkspace --sync --strategy KEEP_LOCAL`, **Then** the system auto-resolves all conflicts by keeping local versions without prompting me

5. **Given** I have 5 conflicts, **When** I run `mujarrad init . --workspace myworkspace --sync --strategy KEEP_REMOTE`, **Then** the system auto-resolves all conflicts by keeping remote versions without prompting me

---

### Edge Cases

- What happens when the network fails during remote content pull?
  - System should abort entire sync operation, rollback all downloaded files to maintain consistency, display error "Failed to pull remote content: network error", and leave local vault in original state

- What happens when I have 1000+ conflicts and choose to resolve interactively?
  - System should display summary "1000+ conflicts detected. Use --strategy KEEP_LOCAL or --strategy KEEP_REMOTE for batch resolution" and abort interactive mode

- What happens when a file is deleted locally but exists remotely?
  - System should treat this as a conflict and prompt: "File X exists remotely but was deleted locally. Keep remote version or confirm deletion?"

- What happens when a file is deleted remotely but exists locally?
  - System should display "File X was deleted remotely. Uploading local version" and proceed with upload

- What happens when workspace verification fails due to network timeout?
  - System should retry workspace verification 3 times with exponential backoff, then fail with "Unable to verify workspace: network timeout after 3 attempts"

- What happens when I run init with --sync but the vault is not Git-initialized?
  - System should display warning "Git repository not detected. Change tracking disabled. Proceeding with full comparison based on file hashes" and continue with hash-based comparison

## Requirements

### Functional Requirements

#### Workspace Validation (P1)

- **FR-001**: System MUST verify target workspace exists via GET request to `/api/workspaces/{slug}` before scanning local vault
- **FR-002**: System MUST complete workspace verification within 5 seconds
- **FR-003**: System MUST fail with exit code 4 and clear error message if workspace does not exist
- **FR-004**: System MUST check user has upload permissions to workspace (403 Forbidden should abort)
- **FR-005**: System MUST display workspace metadata after successful verification (name, owner, node count)

#### Remote Content Pull (P2)

- **FR-006**: System MUST support optional `--sync` flag to enable bidirectional synchronization during init
- **FR-007**: When `--sync` is enabled, system MUST query remote workspace for all existing nodes before upload
- **FR-008**: System MUST query backend version history API to retrieve common ancestor information for files that exist both locally and remotely
- **FR-009**: System MUST detect if both local and remote versions have diverged from common ancestor by comparing current hashes against ancestor hash from version history
- **FR-010**: System MUST treat diverged versions as conflicts requiring user resolution
- **FR-011**: System MUST download remote nodes if only remote has new edits (local unchanged from common ancestor)
- **FR-012**: System MUST skip download and queue local-ahead files for upload if only local has new edits (remote unchanged from common ancestor)
- **FR-013**: System MUST upload all queued local-ahead files immediately after pull operation completes successfully, in same sync operation
- **FR-014**: System MUST download remote-only nodes (files that don't exist locally) as markdown/canvas files preserving folder structure
- **FR-015**: System MUST download files to temporary staging directory first before moving to final location (transactional download)
- **FR-016**: System MUST rollback all downloaded files if any download fails during sync operation, leaving local vault in original state
- **FR-017**: System MUST embed UUID comments in downloaded markdown files for future tracking
- **FR-018**: System MUST create local directory structure matching remote node paths (e.g., remote node with path "folder/note.md" creates "folder/" directory locally)
- **FR-019**: System MUST cache remote node metadata (UUID, hash, lastModified timestamp, ancestorHash) for comparison
- **FR-020**: System MUST display comparison result for each file showing status (e.g., "Note.md: conflict", "File.md: remote ahead", "Doc.md: identical")

#### Difference Detection (P3)

- **FR-021**: System MUST compare local files with remote nodes using SHA-256 hash comparison
- **FR-022**: System MUST classify each file as: identical, local-only, remote-only, local-ahead, remote-ahead, or conflicted (diverged)
- **FR-023**: System MUST detect conflicts when both local and remote have diverged from common ancestor (different hashes, both modified)
- **FR-024**: System MUST display comparison summary showing counts: X identical, Y local-only, Z remote-only, W local-ahead, V remote-ahead, U conflicts
- **FR-025**: System MUST skip uploading identical files (same hash) to reduce network usage

#### Conflict Resolution (P3)

- **FR-026**: System MUST prompt user interactively for each conflict when no `--strategy` flag is provided
- **FR-027**: System MUST support `--strategy KEEP_LOCAL` to auto-resolve all conflicts by keeping local versions
- **FR-028**: System MUST support `--strategy KEEP_REMOTE` to auto-resolve all conflicts by keeping remote versions
- **FR-029**: System MUST support `--strategy SKIP` to auto-skip all conflicts without resolution
- **FR-030**: Interactive prompt MUST show both local and remote content with character diff
- **FR-031**: System MUST log all conflict resolutions to `~/.mujarrad/logs/conflicts-{sessionId}.log`
- **FR-032**: System MUST abort if more than 100 conflicts are detected without a `--strategy` flag (to prevent tedious interactive mode)
- **FR-033**: When conflict resolution prompt times out, system MUST skip the conflicted file and continue processing remaining files
- **FR-034**: System MUST log all skipped files (due to timeout) to allow user to manually resolve later
- **FR-035**: System MUST display summary at end showing count of skipped files requiring manual resolution

#### Backward Compatibility

- **FR-036**: System MUST maintain existing `mujarrad init` behavior (one-way upload without sync) when `--sync` flag is omitted
- **FR-037**: System MUST support all existing flags (`--workspace`, `--batch-size`) with same behavior

### Non-Functional Requirements

- **NFR-001**: Workspace validation MUST complete within 5 seconds on standard broadband connection (10 Mbps)
- **NFR-002**: Remote content pull MUST download at least 100 KB/second (approximately 100 markdown files/second)
- **NFR-003**: Conflict resolution prompts MUST timeout after 120 seconds of user inactivity, skip the conflicted file, and continue sync with remaining files
- **NFR-004**: System MUST handle workspaces with up to 10,000 remote nodes without memory issues (streaming download)
- **NFR-005**: All file operations MUST be atomic (no partial writes) using temporary files and rename strategy

### Key Entities

- **Workspace Metadata**: Represents remote workspace state including slug, name, owner, node count, and user permissions. Retrieved via GET `/api/workspaces/{slug}`

- **Remote Node**: Represents a file/note that exists in the remote workspace, including UUID, title, content, file path, hash, and last modified timestamp

- **Local File**: Represents a markdown/canvas file in the local Obsidian vault, including absolute path, relative path, content, hash, and modification timestamp

- **Comparison Result**: Represents the difference detection output for a single file, classified as IDENTICAL (same hash), LOCAL_ONLY (no remote), REMOTE_ONLY (no local), LOCAL_AHEAD (local modified, remote unchanged), REMOTE_AHEAD (remote modified, local unchanged), or CONFLICTED (both local and remote diverged from common ancestor) with references to both local and remote versions

- **Conflict Resolution**: Represents a user's decision for a specific conflict, including file path, resolution strategy (KEEP_LOCAL, KEEP_REMOTE, SKIP), and timestamp

## Success Criteria

### Measurable Outcomes

- **SC-001**: Users receive workspace validation feedback within 2 seconds for non-existent workspaces (before vault scanning begins)

- **SC-002**: Users initializing to existing workspaces with 500+ nodes can pull all remote content within 60 seconds

- **SC-003**: Users can detect conflicts between local and remote state with 100% accuracy (no false positives or false negatives)

- **SC-004**: Users can resolve up to 100 conflicts interactively in under 10 minutes (average 6 seconds per conflict decision)

- **SC-005**: 95% of init operations complete successfully when workspace exists and user has permissions

- **SC-006**: Zero data loss occurs during initialization with sync enabled (all local and remote content preserved unless explicitly chosen otherwise)

- **SC-007**: Backward compatibility maintained with 100% of existing init command usage patterns working unchanged

## Assumptions

- Users understand the difference between one-way upload (`mujarrad init`) and bidirectional sync (`mujarrad init --sync`)
- The backend API provides GET `/api/workspaces/{slug}` endpoint for workspace verification (may need backend development)
- The backend API provides GET `/api/workspaces/{slug}/nodes` endpoint for listing all nodes (may need backend development)
- Users have sufficient disk space to store pulled remote content (assuming average Obsidian vault size < 1 GB)
- Git is optional; if not present, system falls back to hash-based comparison
- Interactive conflict resolution is suitable for up to 100 conflicts; larger scenarios require batch strategies
- Remote nodes use the same file path structure as local Obsidian vaults (forward slashes, no special characters)

## Dependencies

- Backend API must support workspace metadata retrieval (GET `/api/workspaces/{slug}`)
- Backend API must support listing all workspace nodes (GET `/api/workspaces/{slug}/nodes`) with pagination
- Backend API must support downloading individual node content by UUID (GET `/api/nodes/{uuid}/content`)
- Backend API must support node version history retrieval (GET `/api/nodes/{uuid}/versions`) to provide common ancestor information for divergence detection
- Backend API must track and store all node versions with timestamps and content hashes
- Existing UploadService, SyncService, and ConflictResolver classes in CLI codebase
- Git binary installed for advanced change detection (optional, not required)

## Out of Scope

- Merging conflicted file content automatically (manual merge must be done externally)
- Real-time synchronization during init (only snapshot comparison at init time)
- Resolving conflicts based on timestamp "last-write-wins" without user input (always explicit user choice)
- Syncing Obsidian configuration files (`.obsidian/` folder remains local-only)
- Supporting workspaces with more than 10,000 nodes in initial release (will paginate and potentially timeout)
