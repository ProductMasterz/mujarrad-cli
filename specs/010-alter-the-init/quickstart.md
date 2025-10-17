# Quickstart: Init Command Auto-Create Space

**Feature**: Init Command Auto-Create Space
**Date**: 2025-10-17
**Status**: COMPLETE

## Overview

This guide shows how to use the enhanced `mujarrad init` command with automatic space creation. You can now initialize your Obsidian vault to Mujarrad in a single command—no need to create the space manually first!

---

## Prerequisites

### Installation

```bash
# Install or upgrade to latest version
npm install -g mujarrad-cli@latest

# Verify installation
mujarrad --version
```

### Authentication

```bash
# Login to Mujarrad
mujarrad auth login

# Verify authentication
mujarrad auth status
```

You should see:
```
✓ Authenticated as: your-username
Token expires: [date]
```

---

## Basic Usage

### Scenario 1: Create Space and Upload in One Command

**Use Case**: You have a local Obsidian vault and want to start syncing it to Mujarrad. The space doesn't exist yet.

**Command**:
```bash
mujarrad init ./my-vault --space my-knowledge-base
```

**What Happens**:
1. ✓ Validates slug format (lowercase, alphanumeric, hyphens)
2. ✓ Checks if space exists (finds it doesn't)
3. ✓ Automatically creates space with slug `my-knowledge-base`
4. ✓ Uploads all vault files to the new space

**Output**:
```
✓ Authenticated
✓ Validating space slug...
✓ Created new space: my-knowledge-base
✓ Scanning vault: ./my-vault
Found 150 files to upload
[████████████████████████████████] 100% | 150/150 files | 2.3s

✓ Upload complete!
Files uploaded: 150
Total size: 2.1 MB
Space: my-knowledge-base
```

---

### Scenario 2: Create Space with Custom Metadata

**Use Case**: You want to provide a human-readable name and description for your new space.

**Command**:
```bash
mujarrad init ./my-vault \
  --space kb \
  --space-name "Knowledge Base" \
  --space-description "Personal notes and research"
```

**What Happens**:
- Space created with slug `kb`
- Display name set to "Knowledge Base"
- Description set to "Personal notes and research"
- All local files uploaded

**Output**:
```
✓ Created new space: kb
  Name: Knowledge Base
  Description: Personal notes and research
✓ Upload complete!
```

**Note**: You can view and edit space metadata later at https://www.mujarrad.com/spaces/kb

---

### Scenario 3: Create Space with Sync Enabled

**Use Case**: You want to create a new space AND enable bidirectional sync (from spec 009).

**Command**:
```bash
mujarrad init ./my-vault --space new-space --sync
```

**What Happens**:
1. ✓ Creates space (since it doesn't exist)
2. ✓ Pulls remote content (space is empty, nothing to pull)
3. ✓ Compares local files with remote (all local files are new)
4. ✓ Uploads all local files

**Output**:
```
✓ Created new space: new-space
✓ No remote content to pull (space is empty)
✓ Uploading 150 local files...
✓ Upload complete!
```

**When to use `--sync`**: If you might add content via the Mujarrad web app later and want the CLI to detect changes.

---

### Scenario 4: Disable Auto-Create (Power Users)

**Use Case**: You want to enforce that the space MUST already exist (e.g., in CI/CD pipelines or automation scripts).

**Command**:
```bash
mujarrad init ./my-vault --space existing-space --no-auto-create
```

**What Happens**:
- If space exists: Proceeds normally ✓
- If space does NOT exist: Fails immediately ✗

**Output (space not found)**:
```
✗ Space 'existing-space' not found. Auto-creation disabled by --no-auto-create flag

To fix this:
- Create the space manually at https://www.mujarrad.com
- Remove the --no-auto-create flag to enable automatic creation
```

**When to use `--no-auto-create`**: Automation scripts where you want explicit control and don't want accidental space creation.

---

## Existing Workflows (Unchanged)

### Initialize to Existing Space

**Use Case**: Space already exists, you just want to upload your vault.

**Command**:
```bash
mujarrad init ./my-vault --space existing-space
```

**What Happens**:
1. ✓ Validates space exists
2. ✓ Uploads vault files (same as before—no behavior change)

**Note**: If you accidentally provide `--space-name` or `--space-description` for an existing space, you'll see:
```
⚠️  Space already exists. Metadata flags ignored
```

This is just a warning—the upload will proceed normally.

---

## Common Scenarios & Examples

### Example 1: Fresh Start (No Space Exists)

```bash
cd ~/Documents/ObsidianVault
mujarrad init . --space my-notes
```

**Result**: Creates `my-notes` space, uploads all files in current directory.

---

### Example 2: Descriptive Space for Business Use

```bash
mujarrad init ./BusinessModelCanvas \
  --space bmc-2025 \
  --space-name "Business Model Canvas 2025" \
  --space-description "Strategic planning for Q1-Q4 2025"
```

**Result**: Creates space with full metadata, uploads files.

---

### Example 3: Multiple Vaults, Different Spaces

```bash
# Personal notes
mujarrad init ~/PersonalNotes --space personal

# Work notes
mujarrad init ~/WorkNotes --space work-kb

# Project documentation
mujarrad init ~/Projects/ProjectX --space projectx-docs
```

**Result**: Three separate spaces created, each with different content.

---

### Example 4: Strict Mode for CI/CD

```bash
#!/bin/bash
# deploy-docs.sh - CI/CD script to upload docs

mujarrad init ./docs --space project-docs --no-auto-create

if [ $? -ne 0 ]; then
  echo "ERROR: Space 'project-docs' must exist before deployment"
  exit 1
fi

echo "Docs deployed successfully"
```

**Result**: Script fails fast if space doesn't exist (prevents accidental creation in production).

---

## Troubleshooting

### Error: "Invalid space slug format"

**Problem**: Slug contains invalid characters.

**Fix**: Use only lowercase letters, numbers, and hyphens.

**Examples**:
- ✗ `My Space` (uppercase, space)
- ✗ `my_space` (underscore)
- ✗ `my.space` (dot)
- ✓ `my-space` (correct)
- ✓ `my-space-2` (correct)
- ✓ `kb-2025` (correct)

---

### Error: "Space 'my-space' is already taken"

**Problem**: Another user already has a space with that slug.

**Fix**: Choose a different slug.

**Suggestions**:
- Add your username: `my-space-john`
- Add a number: `my-space-2`
- Use a more specific name: `john-personal-kb`
- Add a date: `kb-2025`

---

### Error: "Space slug 'admin' is reserved"

**Problem**: You're trying to use a slug reserved by the system.

**Fix**: Choose a different slug (not: admin, api, auth, system, public, private, space, space, user, settings).

**Suggestions**:
- `my-admin` instead of `admin`
- `kb-system` instead of `system`

---

### Error: "Account space limit reached (5/5 spaces used)"

**Problem**: You've reached your account's space limit.

**Fix Options**:
1. **Delete unused spaces**: Visit https://www.mujarrad.com/spaces and delete spaces you no longer need
2. **Upgrade plan**: Visit https://www.mujarrad.com/pricing to increase your space limit

---

### Error: "Failed to create space: network error"

**Problem**: Network connection issue.

**Fix**:
1. Check your internet connection
2. Verify you can access https://www.mujarrad.com
3. Retry the command (the CLI will auto-retry 3 times with delays)

---

### Warning: "Space already exists. Metadata flags ignored"

**Problem**: You provided `--space-name` or `--space-description` for a space that already exists.

**What This Means**:
- Your metadata flags (`--space-name`, `--space-description`) will be ignored
- The upload will proceed normally with the existing space

**Not a Real Error**: This is just informational. If you want to update metadata, do it via the web interface at https://www.mujarrad.com/spaces/[slug]/settings

---

## Advanced Usage

### Combine with Other Flags

```bash
# Auto-create + sync + conflict strategy
mujarrad init ./vault \
  --space my-space \
  --sync \
  --strategy KEEP_LOCAL

# Auto-create + custom batch size
mujarrad init ./large-vault \
  --space big-kb \
  --batch-size 50

# Auto-create + full metadata
mujarrad init ./vault \
  --space kb \
  --space-name "Knowledge Base" \
  --space-description "Personal notes" \
  --sync
```

---

## Comparison: Before vs. After

### Before (Manual Two-Step Process)

```bash
# Step 1: Open browser, login to https://www.mujarrad.com
# Step 2: Navigate to "Create Space", fill form, submit
# Step 3: Back to terminal

mujarrad init ./vault --space my-space
```

**Total time**: ~2-3 minutes (including web navigation)

---

### After (Single Command)

```bash
mujarrad init ./vault --space my-space
```

**Total time**: ~5-10 seconds (depending on vault size)

**Time saved**: ~2 minutes per new space

---

## Next Steps

### After Successful Upload

1. **View your space**: https://www.mujarrad.com/spaces/[your-slug]
2. **Explore the graph**: See how your notes are connected
3. **Edit metadata**: Update space name, description, or visibility
4. **Share with collaborators**: Invite team members if needed

### Continue Syncing

```bash
# Sync changes (bi-directional)
mujarrad sync ./vault --space my-space

# Or use init again (will skip creation since space exists)
mujarrad init ./vault --space my-space --sync
```

---

## Reference

### New Flags Added

| Flag | Type | Required | Description | Default |
|------|------|----------|-------------|---------|
| `--space` | string | Yes | Space slug (lowercase, alphanumeric, hyphens) | - |
| `--space-name` | string | No | Human-readable display name | Uses slug |
| `--space-description` | string | No | Space description | Empty string |
| `--no-auto-create` | boolean | No | Disable automatic space creation | false (auto-create enabled) |

### Existing Flags (Still Supported)

| Flag | Description |
|------|-------------|
| `--sync` | Enable bidirectional sync (spec 009) |
| `--strategy` | Conflict resolution strategy: KEEP_LOCAL, KEEP_REMOTE, SKIP |
| `--batch-size` | Number of files per upload batch |

---

## Support

### Documentation
- Full docs: https://docs.mujarrad.com
- API reference: https://api.mujarrad.com/docs

### Help Commands
```bash
# General help
mujarrad --help

# Init command help
mujarrad init --help

# Check authentication
mujarrad auth status
```

### Report Issues
- GitHub: https://github.com/mujarrad/mujarrad-cli/issues
- Email: support@mujarrad.com

---

## Summary

**What Changed**:
- ✅ `mujarrad init` now auto-creates spaces if they don't exist
- ✅ No more manual space creation via web interface
- ✅ Optional metadata flags for better organization
- ✅ Power users can disable auto-create with `--no-auto-create`

**What Stayed the Same**:
- ✅ Initializing to existing spaces works identically
- ✅ All existing flags (`--sync`, `--strategy`, `--batch-size`) still work
- ✅ Backward compatible—no breaking changes

**Why This Matters**:
- ⚡ Faster onboarding (single command instead of web + CLI)
- 🎯 Fewer errors (no forgetting to create space first)
- 🛠️ Better automation (CI/CD scripts can create spaces on demand)

**Ready to get started?**
```bash
mujarrad init ./your-vault --space your-space
```

Happy syncing! 🚀
