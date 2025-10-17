# Quickstart Guide: Init Command Enhancement

**Feature**: 009-init-command-enhancement | **Date**: 2025-10-12
**Audience**: Mujarrad CLI users setting up bidirectional synchronization

## Overview

This guide shows how to use the enhanced `mujarrad init` command with bidirectional synchronization. You'll learn how to:

1. Install the Mujarrad CLI
2. Authenticate with your Mujarrad account
3. Initialize your Obsidian vault (one-way upload)
4. Initialize with sync (bidirectional synchronization)
5. Handle conflicts during initialization
6. Troubleshoot common issues

**New in this version**:
- ✅ Pre-flight space verification (fails fast if space doesn't exist)
- ✅ Pull remote changes before upload (preserves remote edits)
- ✅ Three-way merge detection (identifies conflicts accurately)
- ✅ Interactive conflict resolution with timeout handling
- ✅ Transactional downloads with automatic rollback on failure
- ✅ Backward compatible (existing `mujarrad init` behavior unchanged)

---

## Prerequisites

- **Node.js**: Version 18 or higher ([download](https://nodejs.org))
- **Obsidian vault**: An existing Obsidian vault with markdown/canvas files
- **Mujarrad account**: Sign up at [mujarrad.onrender.com](https://mujarrad.onrender.com)
- **Space**: Create a space via the web UI before running init

**System Requirements**:
- macOS, Linux, or Windows
- At least 1 GB free disk space
- Internet connection (for API communication)

---

## Installation

### Option 1: Install Globally via npm (Recommended)

```bash
npm install -g mujarrad-cli@latest
```

Verify installation:
```bash
mujarrad --version
```

Expected output: `mujarrad-cli v1.1.0` (or higher)

### Option 2: Install Locally (Development)

```bash
git clone https://github.com/your-org/mujarrad-cli.git
cd mujarrad-cli
npm install
npm link
```

### Option 3: Use npx (No Installation)

```bash
npx mujarrad-cli@latest init . --space my-space
```

---

## Authentication

Before using the init command, authenticate with your Mujarrad account:

```bash
mujarrad auth login
```

**Interactive prompts**:
1. Enter your email address
2. Enter your password
3. (Optional) Choose "Remember me" to store credentials in system keychain

**Example session**:
```
$ mujarrad auth login
✔ Email: john@example.com
✔ Password: ********
✔ Remember me? Yes
✓ Authentication successful!
  Token stored in system keychain
  User: john@example.com
  Expires: 2025-11-12T15:30:00Z
```

**Security**: Authentication tokens are stored securely in your system keychain using `@napi-rs/keyring` (macOS Keychain, Windows Credential Manager, Linux Secret Service).

**Check authentication status**:
```bash
mujarrad auth status
```

**Logout**:
```bash
mujarrad auth logout
```

---

## Space Setup

Before initializing your vault, create a space via the Mujarrad web UI:

1. Visit [mujarrad.onrender.com](https://mujarrad.onrender.com)
2. Click "Create Space"
3. Enter a space name (e.g., "My Knowledge Base")
4. Choose a URL-safe slug (e.g., "my-knowledge-base")
5. Click "Create"

**Space slug requirements**:
- 3-50 characters
- Lowercase letters, numbers, and hyphens only
- Must start with a letter or number

**Permissions**: You must have **write access** to the space. If someone else created the space, ask them to invite you with write permissions.

---

## Usage

### One-Way Upload (Backward Compatible)

Upload your local vault to Mujarrad without pulling remote changes. This is the existing behavior - nothing has changed!

```bash
cd /path/to/your/obsidian/vault
mujarrad init . --space my-knowledge-base
```

**What happens**:
1. ✅ Space verified (new: fails fast if space doesn't exist)
2. ✅ Local vault scanned for markdown/canvas files
3. ✅ Files uploaded to space
4. ✅ UUID comments embedded in local files (for future sync)

**Example output**:
```
$ mujarrad init . --space my-knowledge-base

🔍 Verifying space 'my-knowledge-base'...
✓ Space verified: My Knowledge Base (42 existing nodes)

📂 Scanning vault...
✓ Found 150 files (145 markdown, 5 canvas)

📤 Uploading files...
[████████████████████████████] 100% | 150/150 files

✓ Initialization complete!
  Uploaded: 150 files
  Skipped: 0 files
  Duration: 1m 23s
```

---

### Bidirectional Sync (New Feature)

Pull remote changes BEFORE uploading local changes. This preserves remote edits and handles conflicts.

```bash
cd /path/to/your/obsidian/vault
mujarrad init . --space my-knowledge-base --sync
```

**What happens**:
1. ✅ Space verified
2. ✅ Remote nodes pulled from space
3. ✅ Local and remote files compared (three-way merge)
4. ✅ Conflicts resolved (interactively or via --strategy flag)
5. ✅ Remote-ahead files downloaded
6. ✅ Local-ahead files uploaded

**Example output (with conflicts)**:
```
$ mujarrad init . --space my-knowledge-base --sync

🔍 Verifying space 'my-knowledge-base'...
✓ Space verified: My Knowledge Base (42 existing nodes)

📥 Pulling remote content...
✓ Pulled 42 remote nodes (3.2 MB)

📂 Scanning local vault...
✓ Found 150 files (145 markdown, 5 canvas)

🔍 Comparing local and remote...
  Identical: 120 files (no changes)
  Local only: 10 files (new local files)
  Remote only: 5 files (new remote files)
  Local ahead: 8 files (local edits, remote unchanged)
  Remote ahead: 4 files (remote edits, local unchanged)
  Conflicts: 3 files (both modified)

⚠️  3 conflicts detected. Resolving interactively...

Conflict 1/3: notes/Meeting.md
  Local version (modified 2025-10-12 15:00):
    "# Meeting Notes\n\nLocal changes..."
  Remote version (modified 2025-10-12 14:30):
    "# Meeting Notes\n\nRemote changes..."

? How do you want to resolve this conflict?
  ❯ Keep local version (upload local, overwrite remote)
    Keep remote version (keep remote, discard local)
    Skip this file (leave both unchanged, resolve manually later)

✔ Selected: Keep local version

Conflict 2/3: notes/Project.md
... (timeout after 120 seconds)
⏱️  Prompt timeout - skipping this file

✓ Conflict resolution complete
  Resolved: 1 conflict (kept local)
  Skipped: 2 conflicts (manual resolution required)

📥 Downloading remote-ahead files...
✓ Downloaded 4 files

📤 Uploading local-ahead files...
✓ Uploaded 11 files (10 new + 1 conflict resolution)

✓ Sync complete!
  Downloaded: 9 files (5 new + 4 updated)
  Uploaded: 11 files (10 new + 1 updated)
  Skipped conflicts: 2 files (see ~/.mujarrad/logs/conflicts-abc123.log)
  Duration: 2m 15s

⚠️  Manual resolution required for 2 files:
  - notes/Project.md (local hash: abc123..., remote hash: def456...)
  - docs/Readme.md (local hash: 1a2b3c..., remote hash: 4d5e6f...)

Run 'mujarrad sync' to resolve manually later.
```

---

### Automatic Conflict Resolution

Use the `--strategy` flag to automatically resolve all conflicts without interactive prompts.

#### Keep All Local Versions

```bash
mujarrad init . --space my-space --sync --strategy KEEP_LOCAL
```

**Use case**: You trust your local vault more than remote space (e.g., recovering from backup).

**Result**: All conflicts resolved by uploading local version and overwriting remote.

#### Keep All Remote Versions

```bash
mujarrad init . --space my-space --sync --strategy KEEP_REMOTE
```

**Use case**: You want to pull latest changes from remote space without pushing local edits.

**Result**: All conflicts resolved by keeping remote version and discarding local changes.

#### Skip All Conflicts

```bash
mujarrad init . --space my-space --sync --strategy SKIP
```

**Use case**: You want to sync non-conflicted files now and resolve conflicts manually later.

**Result**: All conflicts skipped, logged to `~/.mujarrad/logs/conflicts-{sessionId}.log` for manual resolution.

---

## Real-World Scenarios

### Scenario 1: First-Time Initialization (Empty Space)

**Setup**: You have a local Obsidian vault with 500 notes. You just created an empty space.

**Command**:
```bash
mujarrad init . --space my-knowledge-base
```

**Result**:
- All 500 notes uploaded to space
- No conflicts (space was empty)
- Duration: ~2-3 minutes

**Pro tip**: You can use `--sync` flag even for empty spaces - it will detect no remote content and proceed with upload.

---

### Scenario 2: Syncing After Remote Edits (Web UI)

**Setup**: You edited 5 notes via the Mujarrad web UI. Your local vault has 10 new notes that don't exist remotely.

**Command**:
```bash
mujarrad init . --space my-knowledge-base --sync
```

**Result**:
- 5 remote-edited notes downloaded to local vault (overwriting local versions because remote is ahead)
- 10 new local notes uploaded to space
- No conflicts (no overlapping edits)
- Duration: ~30 seconds

---

### Scenario 3: Handling Conflicts (Both Edited Same File)

**Setup**: You edited `notes/Meeting.md` locally. Someone else edited the same file remotely via web UI.

**Command**:
```bash
mujarrad init . --space my-knowledge-base --sync
```

**Interactive prompt**:
```
⚠️  Conflict detected in notes/Meeting.md

Local version (modified 2025-10-12 15:00):
  # Meeting Notes

  Discussed project roadmap.

  ## Action Items
  - Review design mockups

Remote version (modified 2025-10-12 14:30):
  # Meeting Notes

  Discussed project roadmap.

  ## Action Items
  - Schedule follow-up meeting

? How do you want to resolve this conflict?
  ❯ Keep local version
    Keep remote version
    Skip this file
```

**Choice 1: Keep local** → Your local version uploaded, remote version overwritten
**Choice 2: Keep remote** → Remote version kept, your local changes discarded
**Choice 3: Skip** → File left unchanged locally and remotely, manual merge required later

**Pro tip**: If you don't respond within 120 seconds, the conflict is automatically skipped.

---

### Scenario 4: Bulk Conflict Resolution (100+ Conflicts)

**Setup**: You have 150 conflicts. Interactive mode would be tedious.

**Command**:
```bash
mujarrad init . --space my-knowledge-base --sync --strategy KEEP_LOCAL
```

**Result**:
- All 150 conflicts auto-resolved by keeping local versions
- No prompts
- Duration: ~2-3 minutes

**Alternative**: If you don't provide `--strategy` and have 100+ conflicts, CLI will abort with error:

```
❌ Error: 150 conflicts detected without --strategy flag.

For bulk conflict resolution, use one of:
  --strategy KEEP_LOCAL   (keep all local versions)
  --strategy KEEP_REMOTE  (keep all remote versions)
  --strategy SKIP         (skip all conflicts, resolve manually later)

Run 'mujarrad init --help' for more information.
```

---

## Configuration Options

### Init Command Flags

| Flag | Description | Default |
|------|-------------|---------|
| `--space <slug>` | Target space slug (required) | - |
| `--sync` | Enable bidirectional sync (pull before upload) | `false` |
| `--strategy <strategy>` | Auto-resolve conflicts: `KEEP_LOCAL`, `KEEP_REMOTE`, `SKIP` | Interactive |
| `--batch-size <number>` | Upload batch size (files per request) | `100` |
| `--verbose` | Show detailed logs | `false` |
| `--dry-run` | Simulate sync without making changes | `false` |

### Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `MUJARRAD_API_URL` | Override API base URL | `http://localhost:8080` |
| `MUJARRAD_LOG_LEVEL` | Logging level: `error`, `warn`, `info`, `debug` | `info` |
| `MUJARRAD_TIMEOUT` | API request timeout (milliseconds) | `30000` |

### Example with Custom Configuration

```bash
MUJARRAD_API_URL=http://localhost:8080 \
MUJARRAD_LOG_LEVEL=debug \
mujarrad init . --space test --sync --verbose
```

---

## Troubleshooting

### Error: Space Not Found

**Symptom**:
```
❌ Error: Space 'invalid-space' not found
```

**Causes**:
1. Space slug typo (check spelling)
2. Space doesn't exist (create via web UI first)
3. Space was deleted

**Solution**:
1. List your spaces: Visit [mujarrad.onrender.com/spaces](https://mujarrad.onrender.com/spaces)
2. Verify slug spelling matches exactly (lowercase, hyphens)
3. Create space if it doesn't exist

---

### Error: Access Denied

**Symptom**:
```
❌ Error: Access denied to space 'my-space'. Contact the space owner for permissions.
```

**Causes**:
1. You don't have write access to space
2. Space is private and you're not invited

**Solution**:
1. Ask space owner to invite you with write permissions
2. Or create your own space

---

### Error: Network Timeout

**Symptom**:
```
❌ Error: Failed to pull remote content: network timeout after 3 attempts
```

**Causes**:
1. Slow internet connection
2. Backend server unreachable
3. Firewall blocking requests

**Solution**:
1. Check internet connection: `ping mujarrad.onrender.com`
2. Increase timeout: `MUJARRAD_TIMEOUT=60000 mujarrad init ...`
3. Check firewall settings
4. Retry with `--verbose` flag for detailed logs

---

### Error: Sync Rollback (Download Failure)

**Symptom**:
```
❌ Error: Failed to download remote node 'abc-123'. Rolling back all downloads.
```

**Causes**:
1. Network failure during download
2. Disk space exhausted
3. Permission denied (file system)

**Solution**:
1. Check disk space: `df -h`
2. Check vault directory permissions: `ls -la /path/to/vault`
3. Retry with `--verbose` flag for detailed error

**Important**: When sync fails during download phase, ALL downloads are rolled back. Your local vault remains in its original state (no partial writes). You can safely retry.

---

### Error: File Too Large

**Symptom**:
```
❌ Error: File 'large-note.md' exceeds maximum size (10 MB)
```

**Causes**:
1. File content > 10 MB (10,485,760 bytes)

**Solution**:
1. Split large file into smaller files
2. Or exclude from sync (create `.mujarradignore` file)

---

### Error: Invalid UUID Format

**Symptom**:
```
❌ Error: Extracted UUID 'invalid-uuid' is not a valid UUID v4 format
```

**Causes**:
1. Corrupted UUID comment in markdown file
2. Manual editing of UUID comment

**Solution**:
1. Remove invalid UUID comment from file
2. Re-run init - CLI will assign new UUID

---

### Prompt Timeout (No Response in 120 Seconds)

**Symptom**:
```
⏱️  Prompt timeout after 120 seconds - skipping file 'notes/Project.md'
```

**Causes**:
1. User inactive during conflict resolution prompt
2. Terminal session interrupted

**Result**: File is skipped, logged to `~/.mujarrad/logs/conflicts-{sessionId}.log`

**Solution**: Resolve manually later using `mujarrad sync` or edit file directly and re-run init.

---

## Log Files

All sync operations create log files for troubleshooting and audit:

### Sync Session Log
**Location**: `~/.mujarrad/logs/sync-{sessionId}.log`

**Contents**: Full session details including counters, errors, and duration

**Example**:
```json
{
  "sessionId": "abc-123-def-456",
  "spaceSlug": "my-space",
  "startTime": "2025-10-12T15:00:00Z",
  "endTime": "2025-10-12T15:02:15Z",
  "status": "COMPLETED",
  "stats": {
    "totalFiles": 150,
    "identicalFiles": 120,
    "localOnlyFiles": 10,
    "remoteOnlyFiles": 5,
    "localAheadFiles": 8,
    "remoteAheadFiles": 4,
    "conflictedFiles": 3,
    "downloadedNodes": ["uuid-1", "uuid-2"],
    "uploadedFiles": ["new-note.md"],
    "skippedConflicts": ["conflict.md"]
  },
  "errors": []
}
```

### Conflict Resolution Log
**Location**: `~/.mujarrad/logs/conflicts-{sessionId}.log`

**Contents**: JSON Lines format with one conflict resolution per line

**Example**:
```json
{"filePath":"notes/Meeting.md","strategy":"KEEP_LOCAL","timestamp":"2025-10-12T15:01:00Z","reason":"User selected via interactive prompt","source":"interactive","localHash":"abc123...","remoteHash":"def456...","ancestorHash":"789xyz..."}
{"filePath":"notes/Project.md","strategy":"SKIP","timestamp":"2025-10-12T15:03:00Z","reason":"Prompt timeout after 120 seconds (FR-033)","source":"timeout","localHash":"1a2b3c...","remoteHash":"4d5e6f...","ancestorHash":"7g8h9i..."}
```

### General CLI Log
**Location**: `~/.mujarrad/logs/cli.log`

**Contents**: All CLI operations (auth, init, sync, etc.)

**Example**:
```
2025-10-12T15:00:00.123Z [INFO] Command: init
2025-10-12T15:00:00.456Z [INFO] Space: my-space
2025-10-12T15:00:01.789Z [INFO] Space verified: My Space (42 nodes)
2025-10-12T15:00:05.012Z [INFO] Pulled 42 remote nodes
2025-10-12T15:02:15.345Z [INFO] Sync complete (duration: 2m 15s)
```

---

## Advanced Usage

### Dry Run (Preview Changes)

Preview what would happen during sync without making any changes:

```bash
mujarrad init . --space my-space --sync --dry-run
```

**Output**: Shows comparison summary without downloading or uploading any files.

---

### Verbose Logging

Show detailed logs during sync:

```bash
mujarrad init . --space my-space --sync --verbose
```

**Output**: Shows API requests, hash calculations, file operations, and timing information.

---

### Custom Batch Size

Adjust upload batch size (default: 100 files per request):

```bash
mujarrad init . --space my-space --batch-size 50
```

**Use case**: Reduce batch size if uploads are timing out due to slow connection.

---

### Exclude Files (Future Feature)

Create a `.mujarradignore` file in vault root to exclude files from sync:

```
# .mujarradignore
.obsidian/
.trash/
private-notes/
*.tmp
```

**Note**: This feature is not yet implemented in v1.0 but planned for future release.

---

## Performance Tips

1. **Pre-flight verification** (new in this version) fails fast - you'll know within 2 seconds if space doesn't exist
2. **Cursor-based pagination** handles spaces with 10,000+ nodes without memory issues
3. **Hash-based comparison** is faster than timestamp comparison and works across timezones
4. **Atomic downloads** prevent partial writes and automatically rollback on failure
5. **Parallel uploads** (batch size 100) achieve ~100 KB/s throughput on standard broadband

---

## Next Steps

1. ✅ Initialize your vault: `mujarrad init . --space my-space --sync`
2. ✅ Set up continuous sync: `mujarrad sync` (run periodically or via cron job)
3. ✅ Explore web UI: [mujarrad.onrender.com](https://mujarrad.onrender.com)
4. ✅ Join community: [GitHub Discussions](https://github.com/your-org/mujarrad-cli/discussions)

---

## Support

- **Documentation**: [https://docs.mujarrad.com](https://docs.mujarrad.com)
- **GitHub Issues**: [https://github.com/your-org/mujarrad-cli/issues](https://github.com/your-org/mujarrad-cli/issues)
- **Community**: [Discord](https://discord.gg/mujarrad) or [GitHub Discussions](https://github.com/your-org/mujarrad-cli/discussions)

---

**End of Quickstart Guide**
