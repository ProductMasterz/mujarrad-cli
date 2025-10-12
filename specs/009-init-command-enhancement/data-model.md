# Data Model: Init Command Enhancement

**Feature**: 009-init-command-enhancement | **Date**: 2025-10-12
**Input**: Phase 0 research decisions from [research.md](./research.md)

## Overview

This data model defines all entities, relationships, and state machines for the enhanced `mujarrad init` command with bidirectional synchronization. The model supports workspace verification, remote content pull with version history, three-way merge detection using backend-calculated common ancestors, transactional downloads with rollback, and interactive conflict resolution with timeout handling.

**Design Principles**:
- **Immutability**: Entity hashes are content-addressable and immutable
- **Transactional Integrity**: All operations use staging directory pattern with atomic moves
- **Backend as Source of Truth**: Version history and ancestor calculation performed by backend
- **CLI State Management**: Ephemeral session state stored in memory with persistent logging
- **Hash-Based Comparison**: Pure content comparison using SHA-256 (no timestamp dependency)

## Entity Definitions

### 1. WorkspaceMetadata

Represents remote workspace state retrieved during pre-flight verification (FR-001, FR-005).

**Purpose**: Validate workspace existence and user permissions before scanning local vault.

**TypeScript Definition**:
```typescript
interface WorkspaceMetadata {
  slug: string;              // Workspace identifier (URL-safe)
  name: string;              // Human-readable workspace name
  owner: string;             // Username of workspace owner
  nodeCount: number;         // Total number of nodes in workspace
  userPermissions: {
    canRead: boolean;
    canWrite: boolean;
    canDelete: boolean;
    canShare: boolean;
  };
  createdAt: string;         // ISO 8601 timestamp
  lastModified: string;      // ISO 8601 timestamp of last content change
}
```

**Validation Rules**:
- `slug` MUST match pattern `^[a-z0-9-]+$` (lowercase alphanumeric with hyphens)
- `slug` length MUST be between 3 and 50 characters
- `nodeCount` MUST be >= 0
- At least one permission (`canRead`, `canWrite`, `canDelete`, `canShare`) MUST be true for operation to proceed
- `canWrite` MUST be true for init operation (otherwise fail with exit code 4)

**Source**: Backend API endpoint `GET /api/workspaces/{slug}`

**Lifecycle**: Retrieved once at start of init operation, cached in memory for duration of command

---

### 2. RemoteNode

Represents a file/note that exists in the remote workspace, including version history metadata for divergence detection.

**Purpose**: Store remote content metadata for comparison with local files (FR-007, FR-008, FR-019).

**TypeScript Definition**:
```typescript
interface RemoteNode {
  uuid: string;                  // Unique node identifier (UUID v4)
  title: string;                 // Node title (filename without extension)
  content: string;               // Full markdown/canvas content
  filePath: string;              // Relative path within vault (e.g., "folder/note.md")
  hash: string;                  // SHA-256 hash of content (lowercase hex)
  lastModified: string;          // ISO 8601 timestamp of last modification
  ancestorHash: string | null;   // Hash of common ancestor from backend (null if no local version exists)
  fileType: 'markdown' | 'canvas'; // File type for correct extension
  metadata: {
    tags?: string[];             // Extracted tags
    frontmatter?: Record<string, unknown>; // YAML frontmatter if present
  };
}
```

**Validation Rules**:
- `uuid` MUST be valid UUID v4 format
- `hash` MUST be 64-character lowercase hexadecimal string (SHA-256)
- `filePath` MUST NOT start with `/` (relative paths only)
- `filePath` MUST NOT contain `..` (no directory traversal)
- `filePath` MUST end with `.md` (markdown) or `.canvas` (canvas) based on `fileType`
- `ancestorHash` MUST be null OR 64-character lowercase hexadecimal string
- `content` length MUST be <= 10MB (10,485,760 bytes)

**Source**: Backend API endpoint `GET /api/workspaces/{slug}/nodes` (paginated)

**Lifecycle**: Fetched during pull phase, stored in memory, written to disk if classification requires download

---

### 3. LocalFile

Represents a markdown/canvas file in the local Obsidian vault.

**Purpose**: Store local file metadata for comparison with remote nodes (FR-021, FR-022).

**TypeScript Definition**:
```typescript
interface LocalFile {
  absolutePath: string;          // Full filesystem path
  relativePath: string;          // Path relative to vault root
  content: string;               // Full file content
  hash: string;                  // SHA-256 hash of content (lowercase hex)
  modificationTimestamp: string; // ISO 8601 timestamp from filesystem
  fileType: 'markdown' | 'canvas'; // Detected from extension
  uuid: string | null;           // Extracted UUID from HTML comment (null if not found)
  metadata: {
    hasUUID: boolean;            // Whether UUID comment was found
    frontmatter?: Record<string, unknown>; // Parsed YAML frontmatter
    wikilinks: string[];         // Extracted [[wikilink]] references
  };
}
```

**Validation Rules**:
- `absolutePath` MUST be within vault root directory
- `relativePath` MUST NOT start with `/`
- `relativePath` MUST NOT contain `..`
- `fileType` MUST match file extension (`.md` → `markdown`, `.canvas` → `canvas`)
- `hash` MUST be 64-character lowercase hexadecimal string
- `uuid` MUST be null OR valid UUID v4 format
- `content` length MUST be <= 10MB

**Source**: Local filesystem via VaultScanner and MetadataManager

**Lifecycle**: Scanned after workspace verification, stored in memory for comparison phase

---

### 4. ComparisonResult

Represents the difference detection output for a single file, classified using three-way merge algorithm.

**Purpose**: Store classification of each file's sync status for conflict resolution phase (FR-022, FR-023, FR-024).

**TypeScript Definition**:
```typescript
type FileSyncStatus =
  | 'IDENTICAL'        // Same hash - no sync needed (FR-025)
  | 'LOCAL_ONLY'       // No remote version - upload local (FR-012)
  | 'REMOTE_ONLY'      // No local version - download remote (FR-014)
  | 'LOCAL_AHEAD'      // Local modified, remote unchanged - upload (FR-012)
  | 'REMOTE_AHEAD'     // Remote modified, local unchanged - download (FR-011)
  | 'CONFLICTED';      // Both diverged from ancestor (FR-010, FR-023)

interface ComparisonResult {
  filePath: string;              // Relative path within vault
  classification: FileSyncStatus; // Sync status from three-way merge
  localRef: LocalFile | null;    // Local file reference (null if REMOTE_ONLY)
  remoteRef: RemoteNode | null;  // Remote node reference (null if LOCAL_ONLY)
  ancestorHash: string | null;   // Common ancestor hash from backend (null if no ancestor)
  reason: string;                // Human-readable explanation of classification
  action: 'skip' | 'upload' | 'download' | 'resolve'; // Required action
}
```

**Classification Logic** (from research.md Decision 3):
```typescript
function classifyFileStatus(
  localHash: string | null,
  remoteHash: string | null,
  ancestorHash: string | null
): FileSyncStatus {
  // Both identical (content-based)
  if (localHash !== null && remoteHash !== null && localHash === remoteHash) {
    return 'IDENTICAL';
  }

  // Local only
  if (localHash !== null && remoteHash === null) {
    if (ancestorHash === null) return 'LOCAL_ONLY'; // New file
    return 'CONFLICTED'; // Deleted remotely
  }

  // Remote only
  if (localHash === null && remoteHash !== null) {
    if (ancestorHash === null) return 'REMOTE_ONLY'; // New file
    return 'CONFLICTED'; // Deleted locally
  }

  // No common ancestor (independent creation)
  if (ancestorHash === null) {
    return localHash === remoteHash ? 'IDENTICAL' : 'CONFLICTED';
  }

  // Local unchanged, remote changed
  if (localHash === ancestorHash && remoteHash !== ancestorHash) {
    return 'REMOTE_AHEAD';
  }

  // Remote unchanged, local changed
  if (remoteHash === ancestorHash && localHash !== ancestorHash) {
    return 'LOCAL_AHEAD';
  }

  // Both changed differently
  return 'CONFLICTED';
}
```

**Validation Rules**:
- Exactly one of `localRef` or `remoteRef` MUST be non-null (or both)
- If `classification` is `IDENTICAL`, `LOCAL_AHEAD`, `REMOTE_AHEAD`, or `CONFLICTED`, both `localRef` and `remoteRef` MUST be non-null
- If `classification` is `LOCAL_ONLY`, `remoteRef` MUST be null
- If `classification` is `REMOTE_ONLY`, `localRef` MUST be null
- `ancestorHash` MUST be null for `LOCAL_ONLY` and `REMOTE_ONLY` classifications
- `action` mapping:
  - `IDENTICAL` → `skip`
  - `LOCAL_ONLY` → `upload`
  - `REMOTE_ONLY` → `download`
  - `LOCAL_AHEAD` → `upload`
  - `REMOTE_AHEAD` → `download`
  - `CONFLICTED` → `resolve`

**Source**: Generated by VersionComparator service during comparison phase

**Lifecycle**: Created after pull phase completes, consumed by conflict resolution and upload phases

---

### 5. ConflictResolution

Represents a user's decision for a specific conflict, logged for audit and future reference.

**Purpose**: Record conflict resolution decisions for logging and summary display (FR-031, FR-034, FR-035).

**TypeScript Definition**:
```typescript
type ResolutionStrategy = 'KEEP_LOCAL' | 'KEEP_REMOTE' | 'SKIP';

interface ConflictResolution {
  filePath: string;              // Relative path of conflicted file
  strategy: ResolutionStrategy;  // User's chosen resolution
  timestamp: string;             // ISO 8601 timestamp of decision
  reason: string;                // Why this resolution was chosen
  source: 'interactive' | 'auto' | 'timeout'; // How decision was made
  localHash: string;             // Hash of local version at decision time
  remoteHash: string;            // Hash of remote version at decision time
  ancestorHash: string | null;   // Common ancestor hash
}
```

**Validation Rules**:
- `strategy` MUST be one of: `KEEP_LOCAL`, `KEEP_REMOTE`, `SKIP`
- `source` MUST be one of:
  - `interactive`: User manually chose via prompt (FR-026)
  - `auto`: Auto-resolved via `--strategy` flag (FR-027, FR-028, FR-029)
  - `timeout`: Prompt timed out after 120 seconds (NFR-003, FR-033)
- `timestamp` MUST be ISO 8601 format with timezone
- `reason` examples:
  - `"User selected via interactive prompt"`
  - `"Auto-resolved with --strategy KEEP_LOCAL flag"`
  - `"Prompt timeout after 120 seconds (FR-033)"`
  - `"Skipped due to >100 conflicts without --strategy flag (FR-032)"`

**Storage Location**: `~/.mujarrad/logs/conflicts-{sessionId}.log` (JSON Lines format)

**Example Log Entry**:
```json
{"filePath":"notes/Meeting.md","strategy":"KEEP_LOCAL","timestamp":"2025-10-12T14:30:45.123Z","reason":"User selected via interactive prompt","source":"interactive","localHash":"a1b2c3...","remoteHash":"d4e5f6...","ancestorHash":"789abc..."}
{"filePath":"notes/Project.md","strategy":"SKIP","timestamp":"2025-10-12T14:32:15.456Z","reason":"Prompt timeout after 120 seconds (FR-033)","source":"timeout","localHash":"1a2b3c...","remoteHash":"4d5e6f...","ancestorHash":"7g8h9i..."}
```

**Lifecycle**: Created during conflict resolution phase, written to log file immediately, included in end-of-sync summary

---

### 6. SyncSession

Represents the ephemeral state of a single `mujarrad init --sync` operation.

**Purpose**: Track sync operation progress for logging, rollback, and summary display (FR-013, FR-016, FR-024, FR-035).

**TypeScript Definition**:
```typescript
type SyncSessionStatus =
  | 'VALIDATING_WORKSPACE'      // Pre-flight workspace verification (FR-001)
  | 'PULLING_REMOTE'            // Downloading remote nodes (FR-007)
  | 'COMPARING'                 // Three-way merge classification (FR-021)
  | 'RESOLVING_CONFLICTS'       // Interactive/auto conflict resolution (FR-026)
  | 'UPLOADING_LOCAL'           // Uploading local-ahead files (FR-013)
  | 'COMPLETED'                 // Sync finished successfully
  | 'FAILED';                   // Sync failed (rollback triggered)

interface SyncSession {
  sessionId: string;                   // Unique session identifier (UUID v4)
  workspaceSlug: string;               // Target workspace
  startTime: string;                   // ISO 8601 timestamp
  endTime: string | null;              // ISO 8601 timestamp (null if in progress)
  status: SyncSessionStatus;           // Current operation state

  // Counters for summary display (FR-024, FR-035)
  stats: {
    totalFiles: number;                // Total local files scanned
    identicalFiles: number;            // IDENTICAL classification count
    localOnlyFiles: number;            // LOCAL_ONLY classification count
    remoteOnlyFiles: number;           // REMOTE_ONLY classification count
    localAheadFiles: number;           // LOCAL_AHEAD classification count
    remoteAheadFiles: number;          // REMOTE_AHEAD classification count
    conflictedFiles: number;           // CONFLICTED classification count

    downloadedNodes: string[];         // UUIDs of successfully downloaded nodes
    uploadedFiles: string[];           // Relative paths of successfully uploaded files
    skippedConflicts: string[];        // Relative paths of skipped conflicts (FR-034)
  };

  // Error tracking for rollback (FR-016)
  errors: Array<{
    phase: SyncSessionStatus;
    message: string;
    timestamp: string;
    fatal: boolean;                    // Whether error triggered rollback
  }>;

  // Staging directory for transactional downloads (FR-015)
  stagingDir: string | null;           // Path to staging directory (null if not created)
}
```

**Validation Rules**:
- `sessionId` MUST be valid UUID v4
- `startTime` MUST be before `endTime` (if `endTime` is non-null)
- `status` transitions MUST follow state machine (see State Machine section below)
- `stagingDir` MUST be within vault root if non-null
- All counter values MUST be >= 0
- `totalFiles` MUST equal sum of all classification counts

**Storage**: Stored in memory during sync operation, logged to `~/.mujarrad/logs/sync-{sessionId}.log` on completion

**Lifecycle**: Created at start of `mujarrad init --sync`, updated throughout operation, finalized on completion/failure

---

## State Machine: Sync Operation

Defines valid state transitions for `SyncSession.status` field.

```
┌─────────────────────┐
│ VALIDATING_WORKSPACE │  [Entry Point]
└──────────┬───────────┘
           │ Workspace verified (FR-001 success)
           ├─────────────────────────────────────────┐
           │                                         │
           v                                         v
    ┌──────────────┐                          ┌─────────┐
    │ PULLING_REMOTE │                         │ FAILED  │ [Exit Point - Error]
    └──────┬────────┘                          └─────────┘
           │ Remote nodes fetched (FR-007)            ^
           │                                          │
           v                                          │
    ┌─────────────┐                                  │
    │  COMPARING  │                                  │
    └──────┬──────┘                                  │
           │ Classification complete (FR-021)        │
           │                                          │
           v                                          │
    ┌────────────────────┐                           │
    │ RESOLVING_CONFLICTS │                          │
    └──────┬──────────────┘                          │
           │ All conflicts resolved/skipped (FR-026) │
           │                                          │
           v                                          │
    ┌─────────────────┐                              │
    │ UPLOADING_LOCAL │                              │
    └──────┬──────────┘                              │
           │ Local-ahead files uploaded (FR-013)     │
           │                                          │
           v                                          │
    ┌───────────┐                                    │
    │ COMPLETED │  [Exit Point - Success]            │
    └───────────┘                                    │
                                                      │
    [Any network/file error triggers rollback] ──────┘
```

**State Descriptions**:

1. **VALIDATING_WORKSPACE**:
   - **Entry Conditions**: Command executed with `--sync` flag
   - **Activities**: Send GET request to `/api/workspaces/{slug}`, verify `canWrite` permission
   - **Exit Conditions**:
     - Success: Workspace exists and user has write permission → PULLING_REMOTE
     - Failure: Workspace not found OR no write permission → FAILED (exit code 4)
   - **Duration**: <5 seconds (NFR-001)

2. **PULLING_REMOTE**:
   - **Entry Conditions**: Workspace validated
   - **Activities**: Fetch remote nodes via paginated API, download to staging directory (FR-015)
   - **Exit Conditions**:
     - Success: All remote nodes fetched → COMPARING
     - Failure: Network error during download → FAILED (rollback staging directory per FR-016)
   - **Duration**: ~0.5 seconds per 100 nodes (NFR-002)

3. **COMPARING**:
   - **Entry Conditions**: Remote nodes pulled successfully
   - **Activities**: Run three-way merge classification on all files (local + remote)
   - **Exit Conditions**:
     - Success: All files classified → RESOLVING_CONFLICTS
     - Failure: Hash calculation error → FAILED
   - **Duration**: <1 second for 1000 files (hash computation)

4. **RESOLVING_CONFLICTS**:
   - **Entry Conditions**: Comparison complete
   - **Activities**:
     - If conflicts > 100 without `--strategy` flag → FAILED (FR-032)
     - Interactive prompts OR auto-resolution with `--strategy` flag
     - Timeout handling (120 seconds per prompt, skip on timeout per NFR-003)
   - **Exit Conditions**:
     - Success: All conflicts resolved or skipped → UPLOADING_LOCAL
     - Failure: User aborts (Ctrl+C) → FAILED
   - **Duration**: Variable (depends on conflict count and user interaction)

5. **UPLOADING_LOCAL**:
   - **Entry Conditions**: Conflicts resolved
   - **Activities**: Upload LOCAL_ONLY and LOCAL_AHEAD files to backend (FR-013)
   - **Exit Conditions**:
     - Success: All uploads complete → COMPLETED
     - Failure: Network error during upload → FAILED (do NOT rollback downloads - partial success is acceptable per clarifications)
   - **Duration**: ~1 second per 100 files (NFR-002)

6. **COMPLETED**:
   - **Entry Conditions**: All uploads successful
   - **Activities**: Display summary (FR-024, FR-035), write logs, cleanup staging directory
   - **Exit Conditions**: None (terminal state)
   - **Exit Code**: 0

7. **FAILED**:
   - **Entry Conditions**: Any error during sync operation
   - **Activities**:
     - If in PULLING_REMOTE phase: Delete staging directory (FR-016)
     - Display error message with context
     - Write error logs
   - **Exit Conditions**: None (terminal state)
   - **Exit Code**: 1 (general error) or 4 (workspace/permission error)

---

## Validation Rules Summary

All validation rules extracted from functional requirements (FR-001 to FR-037) and non-functional requirements (NFR-001 to NFR-005):

### Workspace Validation (FR-001 to FR-005)
- ✅ Workspace slug format: `^[a-z0-9-]{3,50}$`
- ✅ Verification timeout: 5 seconds (NFR-001)
- ✅ Required permission: `canWrite === true`
- ✅ Exit code 4 for workspace not found or access denied

### Remote Content Pull (FR-006 to FR-020)
- ✅ `--sync` flag enables bidirectional mode (FR-006)
- ✅ Backend version history API required (FR-008, clarification 3)
- ✅ Three-way merge using ancestor hash (FR-009, FR-010)
- ✅ Staging directory in same filesystem as destination (FR-015, research.md Decision 2)
- ✅ Atomic move using `fs.rename()` (FR-015, NFR-005)
- ✅ Rollback all downloads on any failure (FR-016)
- ✅ UUID embedding in downloaded markdown files (FR-017)
- ✅ Directory structure preservation (FR-018)
- ✅ Hash caching for comparison (FR-019)
- ✅ Download rate: ≥100 KB/s (NFR-002)

### Difference Detection (FR-021 to FR-025)
- ✅ SHA-256 hash comparison (FR-021)
- ✅ Six classifications: IDENTICAL, LOCAL_ONLY, REMOTE_ONLY, LOCAL_AHEAD, REMOTE_AHEAD, CONFLICTED (FR-022)
- ✅ Divergence detection using ancestor hash (FR-023)
- ✅ Summary display with counts (FR-024)
- ✅ Skip uploading identical files (FR-025)

### Conflict Resolution (FR-026 to FR-035)
- ✅ Interactive prompts when no `--strategy` flag (FR-026)
- ✅ `--strategy KEEP_LOCAL` auto-resolution (FR-027)
- ✅ `--strategy KEEP_REMOTE` auto-resolution (FR-028)
- ✅ `--strategy SKIP` auto-skip (FR-029)
- ✅ Prompt shows both versions with diff (FR-030)
- ✅ Log all resolutions to `~/.mujarrad/logs/conflicts-{sessionId}.log` (FR-031)
- ✅ Abort if >100 conflicts without `--strategy` (FR-032)
- ✅ Timeout: 120 seconds, skip on timeout (NFR-003, FR-033)
- ✅ Log skipped files (FR-034)
- ✅ Display summary of skipped conflicts (FR-035)

### Backward Compatibility (FR-036 to FR-037)
- ✅ Existing behavior maintained when `--sync` omitted (FR-036)
- ✅ All existing flags supported (FR-037)

### Performance & Scale (NFR-001 to NFR-005)
- ✅ Workspace verification: <5 seconds (NFR-001)
- ✅ Download rate: ≥100 KB/s (NFR-002)
- ✅ Prompt timeout: 120 seconds (NFR-003)
- ✅ Handle 10,000 remote nodes without memory issues (NFR-004, cursor-based pagination)
- ✅ Atomic file operations with temp files (NFR-005)

---

## Relationships Between Entities

```
WorkspaceMetadata (1)
    │
    │ validated by
    │
    v
SyncSession (1) ──────────────┐
    │                         │
    │ tracks progress         │ contains
    │                         │
    v                         v
ComparisonResult (N) ←─── RemoteNode (N)
    │                         ^
    │                         │
    │ references              │ fetched from backend
    │                         │
    v                         │
LocalFile (N) ────────────────┘
    │                      compares with
    │
    │ conflicts logged as
    │
    v
ConflictResolution (N)
```

**Cardinality**:
- 1 WorkspaceMetadata per sync session
- 1 SyncSession per `mujarrad init --sync` invocation
- N RemoteNodes per workspace (0 to 10,000+)
- N LocalFiles per vault (0 to 10,000+)
- N ComparisonResults = total unique file paths across local and remote
- N ConflictResolutions = count of conflicts requiring resolution

---

## Implementation Notes

### Hash Calculation
All hashes MUST use SHA-256 algorithm applied to UTF-8 encoded file content:

```typescript
import crypto from 'crypto';

function calculateHash(content: string): string {
  return crypto
    .createHash('sha256')
    .update(content, 'utf8')
    .digest('hex');
}
```

### Transactional Download Pattern
Based on research.md Decision 2, all downloads MUST use staging directory:

```typescript
class AtomicDownloadManager {
  async downloadFilesAtomically(
    nodes: RemoteNode[],
    vaultRoot: string
  ): Promise<{ success: boolean; downloadedPaths: string[] }> {
    const stagingDir = path.join(vaultRoot, `.staging-${crypto.randomUUID()}`);

    try {
      // Step 1: Create staging directory
      await fs.mkdir(stagingDir, { recursive: true });

      // Step 2: Download all to staging
      const downloadedPaths: string[] = [];
      for (const node of nodes) {
        const stagingPath = path.join(stagingDir, node.filePath);
        await fs.mkdir(path.dirname(stagingPath), { recursive: true });
        await fs.writeFile(stagingPath, node.content, 'utf8');
        downloadedPaths.push(node.filePath);
      }

      // Step 3: Atomic move all files (metadata-only operation)
      for (const relativePath of downloadedPaths) {
        const stagingPath = path.join(stagingDir, relativePath);
        const finalPath = path.join(vaultRoot, relativePath);
        await fs.mkdir(path.dirname(finalPath), { recursive: true });
        await fs.rename(stagingPath, finalPath); // Atomic on same filesystem
      }

      // Step 4: Cleanup staging
      await fs.rm(stagingDir, { recursive: true });

      return { success: true, downloadedPaths };

    } catch (error) {
      // Rollback: Delete staging directory (files never moved to final location)
      await fs.rm(stagingDir, { recursive: true, force: true });
      return { success: false, downloadedPaths: [] };
    }
  }
}
```

### Cursor-Based Pagination
Based on research.md Decision 5, pagination MUST use opaque cursors:

```typescript
interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    nextCursor: string | null;  // Opaque cursor for next page
    hasMore: boolean;            // Whether more pages exist
  };
}

async function* fetchAllNodes(
  workspaceSlug: string
): AsyncGenerator<RemoteNode> {
  let cursor: string | null = null;

  do {
    const url = cursor
      ? `/api/workspaces/${workspaceSlug}/nodes?cursor=${cursor}`
      : `/api/workspaces/${workspaceSlug}/nodes`;

    const response = await axios.get<PaginatedResponse<RemoteNode>>(url);

    // Yield nodes one by one (streaming processing)
    for (const node of response.data.data) {
      yield node;
    }

    cursor = response.data.pagination.nextCursor;
  } while (cursor !== null);
}
```

### Interactive Prompt with Timeout
Based on research.md Decision 4, prompts MUST timeout after 120 seconds:

```typescript
async function promptWithTimeout<T>(
  prompt: () => Promise<T>,
  timeoutMs: number = 120000
): Promise<T | 'TIMEOUT'> {
  return Promise.race([
    prompt(),
    new Promise<'TIMEOUT'>((resolve) =>
      setTimeout(() => resolve('TIMEOUT'), timeoutMs)
    ),
  ]);
}

async function resolveConflict(
  comparison: ComparisonResult
): Promise<ConflictResolution> {
  const result = await promptWithTimeout(async () => {
    return inquirer.prompt([{
      type: 'list',
      name: 'strategy',
      message: `Conflict detected in ${comparison.filePath}:`,
      choices: [
        { name: 'Keep local version', value: 'KEEP_LOCAL' },
        { name: 'Keep remote version', value: 'KEEP_REMOTE' },
        { name: 'Skip this file', value: 'SKIP' },
      ],
    }]);
  });

  if (result === 'TIMEOUT') {
    return {
      filePath: comparison.filePath,
      strategy: 'SKIP',
      timestamp: new Date().toISOString(),
      reason: 'Prompt timeout after 120 seconds (FR-033)',
      source: 'timeout',
      localHash: comparison.localRef!.hash,
      remoteHash: comparison.remoteRef!.hash,
      ancestorHash: comparison.ancestorHash,
    };
  }

  return {
    filePath: comparison.filePath,
    strategy: result.strategy,
    timestamp: new Date().toISOString(),
    reason: 'User selected via interactive prompt',
    source: 'interactive',
    localHash: comparison.localRef!.hash,
    remoteHash: comparison.remoteRef!.hash,
    ancestorHash: comparison.ancestorHash,
  };
}
```

---

## Testing Considerations

### Unit Tests Required
- Hash calculation (ensure deterministic SHA-256)
- Three-way merge classification (all 6 status types)
- Transactional download rollback (simulate failures)
- Prompt timeout handling (mock timers)
- Cursor pagination (mock API responses)

### Integration Tests Required
- Full sync flow (workspace validation → pull → compare → resolve → upload)
- Network failure during pull (verify rollback)
- Conflict resolution timeout (verify skip and continue)
- Large workspace (10,000 nodes, verify memory usage)
- Backward compatibility (verify existing `mujarrad init` unchanged)

### Contract Tests Required
- Backend API responses match OpenAPI spec (see contracts/backend-api.yaml)
- WorkspaceMetadata deserialization
- RemoteNode deserialization with ancestorHash field
- Paginated response format

---

## Appendix: Example Data

### Example 1: Workspace Metadata Response
```json
{
  "slug": "my-knowledge-base",
  "name": "My Knowledge Base",
  "owner": "john-doe",
  "nodeCount": 42,
  "userPermissions": {
    "canRead": true,
    "canWrite": true,
    "canDelete": false,
    "canShare": false
  },
  "createdAt": "2025-01-15T10:30:00Z",
  "lastModified": "2025-10-12T14:22:33Z"
}
```

### Example 2: Remote Node with Ancestor Hash
```json
{
  "uuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "title": "Meeting Notes",
  "content": "# Meeting Notes\n\nDiscussed project roadmap...",
  "filePath": "meetings/2025-10-12.md",
  "hash": "3a5b7c9d1e2f4a6b8c0d2e4f6a8b0c2d4e6f8a0b2c4d6e8f0a2b4c6d8e0f2a4",
  "lastModified": "2025-10-12T14:00:00Z",
  "ancestorHash": "1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2",
  "fileType": "markdown",
  "metadata": {
    "tags": ["meeting", "roadmap"],
    "frontmatter": {
      "date": "2025-10-12",
      "attendees": ["Alice", "Bob"]
    }
  }
}
```

### Example 3: Comparison Result (Conflicted)
```json
{
  "filePath": "notes/Project.md",
  "classification": "CONFLICTED",
  "localRef": {
    "absolutePath": "/Users/mac/vault/notes/Project.md",
    "relativePath": "notes/Project.md",
    "content": "# Project\n\nLocal changes...",
    "hash": "abc123...",
    "modificationTimestamp": "2025-10-12T15:00:00Z",
    "fileType": "markdown",
    "uuid": "uuid-123",
    "metadata": { "hasUUID": true, "wikilinks": [] }
  },
  "remoteRef": {
    "uuid": "uuid-123",
    "title": "Project",
    "content": "# Project\n\nRemote changes...",
    "filePath": "notes/Project.md",
    "hash": "def456...",
    "lastModified": "2025-10-12T14:30:00Z",
    "ancestorHash": "789xyz...",
    "fileType": "markdown",
    "metadata": { "tags": [] }
  },
  "ancestorHash": "789xyz...",
  "reason": "Both local and remote have diverged from common ancestor (hash: 789xyz...)",
  "action": "resolve"
}
```

### Example 4: Sync Session Summary
```json
{
  "sessionId": "session-uuid-123",
  "workspaceSlug": "my-workspace",
  "startTime": "2025-10-12T15:00:00Z",
  "endTime": "2025-10-12T15:03:42Z",
  "status": "COMPLETED",
  "stats": {
    "totalFiles": 150,
    "identicalFiles": 120,
    "localOnlyFiles": 10,
    "remoteOnlyFiles": 5,
    "localAheadFiles": 8,
    "remoteAheadFiles": 4,
    "conflictedFiles": 3,
    "downloadedNodes": ["uuid-1", "uuid-2", "uuid-3", "uuid-4"],
    "uploadedFiles": ["new-note.md", "updated-note.md"],
    "skippedConflicts": ["conflict.md"]
  },
  "errors": [],
  "stagingDir": null
}
```

---

**End of Data Model Document**

This data model is ready for implementation. Next step: Create OpenAPI contracts for backend API endpoints (contracts/backend-api.yaml).
