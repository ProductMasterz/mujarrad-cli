# Test Plan for Version 1.1.0-alpha.8
## Slug-to-UUID Caching Feature

### Prerequisites
1. Authenticate with your credentials:
   ```bash
   mujarrad auth login
   # Email: o.h.shafik@gmail.com
   # Password: Om@r1234
   ```

2. Verify authentication:
   ```bash
   mujarrad auth status
   ```

### Test 1: First Init (No Cache)
**Purpose:** Verify that space slug is resolved to UUID and cached

```bash
# Clear existing cache
rm -f ~/.mujarrad/spaces.json

# Run init command (first time - should call API)
mujarrad init /tmp/test-mujarrad-init/vault --space test-space-001 --batch-size 10

# Check that cache was created
cat ~/.mujarrad/spaces.json
```

**Expected:**
- Space validation succeeds
- Cache file created at `~/.mujarrad/spaces.json`
- Cache contains entry for `test-space-001` with UUID

### Test 2: Second Init (With Cache)
**Purpose:** Verify that cached UUID is used (no API call)

```bash
# Run init command again with same space
mujarrad init /tmp/test-mujarrad-init/vault --space test-space-001 --batch-size 10

# Check logs for cache hit
cat ~/.mujarrad/logs/mujarrad-*-$(date +%Y-%m-%d).log | grep "Using cached UUID"
```

**Expected:**
- Logs show "Using cached UUID for space 'test-space-001'"
- No API call to resolve space (faster execution)

### Test 3: Different Space (Cache Miss)
**Purpose:** Verify new spaces are resolved and cached

```bash
# Run init with different space
mujarrad init /tmp/test-mujarrad-init/vault --space test-space-002 --batch-size 10

# Check cache contains both spaces
cat ~/.mujarrad/spaces.json
```

**Expected:**
- Space validation succeeds for new space
- Cache now contains both `test-space-001` and `test-space-002`

### Test 4: Cache Structure
**Purpose:** Verify cache file structure

```bash
# Pretty-print cache
cat ~/.mujarrad/spaces.json | jq
```

**Expected Format:**
```json
{
  "spaces": {
    "test-space-001": {
      "uuid": "...",
      "slug": "test-space-001",
      "displayName": "...",
      "lastSync": "2025-10-18T..."
    },
    "test-space-002": {
      "uuid": "...",
      "slug": "test-space-002",
      "displayName": "...",
      "lastSync": "2025-10-18T..."
    }
  },
  "version": "1.0"
}
```

### Test 5: Performance Comparison
**Purpose:** Measure cache performance improvement

```bash
# Without cache (first run)
rm -f ~/.mujarrad/spaces.json
time mujarrad init /tmp/test-mujarrad-init/vault --space perf-test --batch-size 10

# With cache (second run)
time mujarrad init /tmp/test-mujarrad-init/vault --space perf-test --batch-size 10
```

**Expected:**
- Second run should be noticeably faster (no API resolution delay)

### Test 6: Error Handling
**Purpose:** Verify graceful error handling

```bash
# Try with invalid/non-existent space (API should handle)
mujarrad init /tmp/test-mujarrad-init/vault --space !!invalid!! --batch-size 10
```

**Expected:**
- Clear error message if space creation fails
- No corrupted cache file

### Verification Checklist

- [ ] Test 1: First init creates cache successfully
- [ ] Test 2: Cached UUID is used on second run
- [ ] Test 3: Multiple spaces cached correctly
- [ ] Test 4: Cache structure matches expected format
- [ ] Test 5: Performance improvement observed
- [ ] Test 6: Errors handled gracefully

### Cleanup

```bash
# Remove test cache
rm -f ~/.mujarrad/spaces.json

# Remove test vault
rm -rf /tmp/test-mujarrad-init
```

## Key Changes in 1.1.0-alpha.8

1. **ConfigManager** (`src/services/ConfigManager.ts`)
   - Local cache at `~/.mujarrad/spaces.json`
   - Stores slug → UUID mappings
   - Methods: `getSpaceUuid()`, `setSpace()`, `removeSpace()`, `listSpaces()`

2. **SpaceResolver** (`src/services/SpaceResolver.ts`)
   - Cache-first resolution strategy
   - Calls idempotent `POST /api/spaces` if not cached
   - Error handling for 409 conflicts and network errors

3. **SpaceValidator** (`src/services/SpaceValidator.ts`)
   - Refactored to use SpaceResolver
   - Simplified from ~100 lines to ~42 lines

4. **init.ts** Command
   - Integrated new caching architecture
   - All operations use UUID (not slug)

## Architecture Benefits

- **Performance**: Cached lookups avoid repeated API calls
- **Reliability**: Local cache survives network failures
- **Security**: UUIDs used for all API operations
- **User Experience**: Faster command execution after first run
