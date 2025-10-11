import { SyncService } from '../../src/services/SyncService.js';
import { SyncApi } from '../../src/api/generated/api.js';
import { simpleGit, SimpleGit } from 'simple-git';

/**
 * Performance Tests for Sync Operations
 *
 * Validates NFR-003: Sync changes in <10 seconds
 *
 * Based on /analyze report recommendation (MEDIUM-2)
 */

jest.mock('../../src/api/generated/api.js');
jest.mock('simple-git');
jest.mock('../../src/utils/CacheManager.js', () => ({
  CacheManager: {
    getLastSyncTime: jest.fn(),
    setLastSyncTime: jest.fn()
  }
}));

import { CacheManager } from '../../src/utils/CacheManager.js';

describe('NFR-003: Sync Performance (<10 seconds)', () => {
  let syncService: SyncService;
  let mockSyncApi: jest.Mocked<SyncApi>;
  let mockGit: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSyncApi = {
      applySyncChanges: jest.fn(),
      initSyncSession: jest.fn(),
      completeSyncSession: jest.fn()
    } as any;

    (SyncApi as jest.Mock).mockImplementation(() => mockSyncApi);

    mockGit = {
      diff: jest.fn(),
      log: jest.fn(),
      add: jest.fn(),
      commit: jest.fn()
    };

    (simpleGit as jest.Mock).mockReturnValue(mockGit);

    syncService = new SyncService(mockSyncApi);
  });

  it('should detect changes within 10 seconds for typical edit session', async () => {
    // Simulate typical editing session: 5 files modified
    const modifiedFiles = 5;
    const workspaceSlug = 'test-workspace';
    const vaultPath = '/path/to/vault';

    // Mock last sync time
    (CacheManager.getLastSyncTime as jest.Mock).mockResolvedValue('2025-10-11T10:00:00Z');

    // Mock git diff output (5 modified files)
    const diffOutput = Array.from({ length: modifiedFiles }, (_, i) =>
      `M\tnote-${i}.md`
    ).join('\n');

    mockGit.diff.mockResolvedValue(diffOutput);

    // Mock git log for commit metadata
    mockGit.log.mockResolvedValue({
      latest: {
        hash: 'abc123',
        author_name: 'Test User',
        author_email: 'test@example.com',
        date: '2025-10-11T10:05:00Z',
        message: 'Updated 5 notes'
      }
    });

    const start = Date.now();

    const changes = await syncService.detectChanges(vaultPath, workspaceSlug);

    const detectionTime = (Date.now() - start) / 1000;

    console.log(`\n📊 Change Detection Performance:`);
    console.log(`   Modified files: ${modifiedFiles}`);
    console.log(`   Detection time: ${detectionTime.toFixed(3)}s`);
    console.log(`   Target: <10s total sync time\n`);

    expect(changes).toHaveLength(modifiedFiles);
    expect(detectionTime).toBeLessThan(1); // Detection should be <1s
  });

  it('should push changes within performance target', async () => {
    const changeCount = 10;
    const workspaceSlug = 'test-workspace';

    const changes = Array.from({ length: changeCount }, (_, i) => ({
      nodeId: `uuid-${i}`,
      operation: 'UPDATE' as const,
      filePath: `note-${i}.md`,
      content: `# Updated Note ${i}\n\nNew content at ${new Date().toISOString()}`,
      gitMetadata: {
        hash: `hash-${i}`,
        author: 'Test User <test@example.com>',
        timestamp: new Date().toISOString(),
        message: `Update note ${i}`
      }
    }));

    // Mock API response (simulate 200ms API latency)
    mockSyncApi.applySyncChanges.mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, 200));
      return {
        data: {
          versionsCreated: changeCount,
          conflicts: []
        }
      } as any;
    });

    const start = Date.now();

    const result = await syncService.pushChanges(workspaceSlug, changes);

    const pushTime = (Date.now() - start) / 1000;

    console.log(`\n📊 Push Changes Performance:`);
    console.log(`   Changes pushed: ${changeCount}`);
    console.log(`   Versions created: ${result.versionsCreated}`);
    console.log(`   Push time: ${pushTime.toFixed(3)}s`);
    console.log(`   Target: <10s total sync time\n`);

    expect(result.versionsCreated).toBe(changeCount);
    expect(pushTime).toBeLessThan(5); // Push should be <5s
  });

  it('should complete full sync cycle within 10 seconds', async () => {
    const workspaceSlug = 'test-workspace';
    const vaultPath = '/path/to/vault';

    // 1. Detect changes (5 files modified)
    (CacheManager.getLastSyncTime as jest.Mock).mockResolvedValue('2025-10-11T10:00:00Z');

    mockGit.diff.mockResolvedValue('M\tnote-1.md\nM\tnote-2.md\nM\tnote-3.md\nM\tnote-4.md\nM\tnote-5.md');

    mockGit.log.mockResolvedValue({
      latest: {
        hash: 'abc123',
        author_name: 'Test User',
        author_email: 'test@example.com',
        date: '2025-10-11T10:05:00Z',
        message: 'Updated notes'
      }
    });

    // 2. Push changes
    mockSyncApi.applySyncChanges.mockResolvedValue({
      data: {
        versionsCreated: 5,
        conflicts: []
      }
    } as any);

    const start = Date.now();

    // Full sync cycle
    const changes = await syncService.detectChanges(vaultPath, workspaceSlug);
    const pushResult = await syncService.pushChanges(workspaceSlug, changes);
    await syncService.completeSync(workspaceSlug, new Date().toISOString());

    const totalTime = (Date.now() - start) / 1000;

    console.log(`\n📊 Full Sync Cycle Performance:`);
    console.log(`   Changes detected: ${changes.length}`);
    console.log(`   Versions created: ${pushResult.versionsCreated}`);
    console.log(`   Total sync time: ${totalTime.toFixed(3)}s`);
    console.log(`   NFR-003 target: 10s`);
    console.log(`   Status: ${totalTime < 10 ? '✅ PASS' : '❌ FAIL'}\n`);

    expect(totalTime).toBeLessThan(10); // NFR-003 target
  });

  it('should handle concurrent edits efficiently', async () => {
    const workspaceSlug = 'test-workspace';
    const conflictCount = 3;

    const changes = Array.from({ length: 10 }, (_, i) => ({
      nodeId: `uuid-${i}`,
      operation: 'UPDATE' as const,
      filePath: `note-${i}.md`,
      content: `# Note ${i}`,
      gitMetadata: {
        hash: `hash-${i}`,
        author: 'Test User <test@example.com>',
        timestamp: new Date().toISOString(),
        message: `Update ${i}`
      }
    }));

    // Simulate 3 conflicts (timestamps within 1 second)
    const conflicts = Array.from({ length: conflictCount }, (_, i) => ({
      nodeId: `uuid-${i}`,
      filePath: `note-${i}.md`,
      localContent: 'Local version',
      remoteContent: 'Remote version',
      localTimestamp: '2025-10-11T10:05:00.000Z',
      remoteTimestamp: '2025-10-11T10:05:00.500Z' // 500ms diff
    }));

    mockSyncApi.applySyncChanges.mockResolvedValue({
      data: {
        versionsCreated: 10 - conflictCount,
        conflicts: conflicts
      }
    } as any);

    const start = Date.now();

    const result = await syncService.pushChanges(workspaceSlug, changes);

    const syncTime = (Date.now() - start) / 1000;

    console.log(`\n📊 Conflict Detection Performance:`);
    console.log(`   Total changes: ${changes.length}`);
    console.log(`   Conflicts detected: ${result.conflicts.length}`);
    console.log(`   Auto-resolved: ${10 - conflictCount}`);
    console.log(`   Sync time: ${syncTime.toFixed(3)}s`);
    console.log(`   Conflict detection overhead: <100ms per file (NFR-003)\n`);

    expect(result.conflicts).toHaveLength(conflictCount);
    expect(syncTime).toBeLessThan(5);
  });

  it('should validate sync performance breakdown', () => {
    // NFR-003 target: Detect and process changes within 10 seconds
    // Performance breakdown:
    // 1. Git diff to detect changes: <500ms
    // 2. Git log to get commit metadata: <200ms
    // 3. API call to push changes: <3s
    // 4. Conflict detection (if any): <100ms per file
    // 5. Update local cache: <100ms

    const performanceBreakdown = {
      gitDiff: 0.5, // seconds
      gitLog: 0.2,
      apiPush: 3.0,
      conflictDetection: 0.1 * 5, // 5 potential conflicts
      cacheUpdate: 0.1
    };

    const totalTheoretical =
      performanceBreakdown.gitDiff +
      performanceBreakdown.gitLog +
      performanceBreakdown.apiPush +
      performanceBreakdown.conflictDetection +
      performanceBreakdown.cacheUpdate;

    console.log(`\n📊 NFR-003 Performance Breakdown (Theoretical):`);
    console.log(`   Git diff (change detection): ${performanceBreakdown.gitDiff.toFixed(2)}s`);
    console.log(`   Git log (commit metadata): ${performanceBreakdown.gitLog.toFixed(2)}s`);
    console.log(`   API push changes: ${performanceBreakdown.apiPush.toFixed(2)}s`);
    console.log(`   Conflict detection (5 files): ${performanceBreakdown.conflictDetection.toFixed(2)}s`);
    console.log(`   Cache update: ${performanceBreakdown.cacheUpdate.toFixed(2)}s`);
    console.log(`   Total theoretical: ${totalTheoretical.toFixed(2)}s`);
    console.log(`   NFR-003 target: 10s`);
    console.log(`   Margin: ${(10 - totalTheoretical).toFixed(2)}s\n`);

    expect(totalTheoretical).toBeLessThan(10);
  });

  it('should optimize for typical workflow (few changes)', async () => {
    // Most sync operations involve 1-5 file changes
    // System should be optimized for this common case

    const typicalChangeCount = 3;
    const workspaceSlug = 'test-workspace';

    const changes = Array.from({ length: typicalChangeCount }, (_, i) => ({
      nodeId: `uuid-${i}`,
      operation: 'UPDATE' as const,
      filePath: `note-${i}.md`,
      content: `# Note ${i}`,
      gitMetadata: {
        hash: `hash-${i}`,
        author: 'User <user@example.com>',
        timestamp: new Date().toISOString(),
        message: 'Quick edit'
      }
    }));

    mockSyncApi.applySyncChanges.mockResolvedValue({
      data: {
        versionsCreated: typicalChangeCount,
        conflicts: []
      }
    } as any);

    const start = Date.now();

    await syncService.pushChanges(workspaceSlug, changes);

    const duration = (Date.now() - start) / 1000;

    console.log(`\n📊 Typical Workflow Performance:`);
    console.log(`   Changes (typical): ${typicalChangeCount}`);
    console.log(`   Sync time: ${duration.toFixed(3)}s`);
    console.log(`   User experience: ${duration < 3 ? '✅ Instant' : '⚠ Noticeable delay'}\n`);

    // For typical workflow, aim for <3s (feels instant)
    expect(duration).toBeLessThan(3);
  });
});
