import { SyncService } from '../../../src/services/SyncService.js';
import { simpleGit } from 'simple-git';
import { CacheManager } from '../../../src/utils/CacheManager.js';
import * as fs from 'fs/promises';

// Mock dependencies
jest.mock('simple-git');
jest.mock('../../../src/api/generated/api.js');
jest.mock('../../../src/utils/CacheManager.js');
jest.mock('fs/promises');

describe('SyncService', () => {
  let syncService: SyncService;
  let mockSyncApi: any;
  let mockGit: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Git
    mockGit = {
      log: jest.fn(),
      diff: jest.fn(),
      show: jest.fn(),
      status: jest.fn()
    };
    (simpleGit as jest.Mock).mockReturnValue(mockGit);

    // Mock API
    mockSyncApi = {
      initSync: jest.fn(),
      pushChanges: jest.fn(),
      pullChanges: jest.fn(),
      completeSync: jest.fn()
    };

    syncService = new SyncService(mockSyncApi);
  });

  describe('detectChanges', () => {
    it('should detect changed files using git diff', async () => {
      // Mock last sync time
      (CacheManager.getLastSyncTime as jest.Mock).mockResolvedValue('2025-10-10T10:00:00Z');

      // Mock git diff output
      mockGit.diff.mockResolvedValue('M\tfile1.md\nM\tfile2.md\n');

      // Mock git show for commit metadata
      mockGit.show.mockResolvedValue({
        hash: 'abc123',
        author_name: 'John Doe',
        author_email: 'john@example.com',
        date: '2025-10-11T14:30:00Z',
        message: 'Update notes'
      });

      const changes = await syncService.detectChanges('/vault', 'workspace-123');

      expect(changes).toHaveLength(2);
      expect(changes[0].operation).toBe('UPDATE');
      expect(changes[0].filePath).toBe('file1.md');
      expect(changes[1].filePath).toBe('file2.md');
      expect(mockGit.diff).toHaveBeenCalledWith(['--name-status', 'HEAD@{2025-10-10T10:00:00Z}..HEAD']);
    });

    it('should extract git commit metadata', async () => {
      (CacheManager.getLastSyncTime as jest.Mock).mockResolvedValue('2025-10-10T10:00:00Z');
      mockGit.diff.mockResolvedValue('M\tfile1.md\n');

      // Mock git log for commit details
      mockGit.log.mockResolvedValue({
        latest: {
          hash: 'abc123def456',
          author_name: 'Jane Smith',
          author_email: 'jane@example.com',
          date: '2025-10-11T15:45:00+03:00',
          message: 'Add new features'
        }
      });

      const changes = await syncService.detectChanges('/vault', 'workspace-123');

      expect(changes[0].gitMetadata).toEqual({
        hash: 'abc123def456',
        author: 'Jane Smith <jane@example.com>',
        timestamp: '2025-10-11T15:45:00+03:00',
        message: 'Add new features'
      });
    });

    it('should handle new file creation', async () => {
      (CacheManager.getLastSyncTime as jest.Mock).mockResolvedValue('2025-10-10T10:00:00Z');
      mockGit.diff.mockResolvedValue('A\tnew-file.md\n');
      mockGit.log.mockResolvedValue({
        latest: {
          hash: 'def789',
          author_name: 'Alice',
          author_email: 'alice@example.com',
          date: '2025-10-11T16:00:00Z',
          message: 'Add new file'
        }
      });

      const changes = await syncService.detectChanges('/vault', 'workspace-123');

      expect(changes).toHaveLength(1);
      expect(changes[0].operation).toBe('CREATE');
      expect(changes[0].filePath).toBe('new-file.md');
    });

    it('should handle file deletion with soft delete', async () => {
      (CacheManager.getLastSyncTime as jest.Mock).mockResolvedValue('2025-10-10T10:00:00Z');
      mockGit.diff.mockResolvedValue('D\tdeleted-file.md\n');
      mockGit.log.mockResolvedValue({
        latest: {
          hash: 'ghi012',
          author_name: 'Bob',
          author_email: 'bob@example.com',
          date: '2025-10-11T16:30:00Z',
          message: 'Remove old file'
        }
      });

      const changes = await syncService.detectChanges('/vault', 'workspace-123');

      expect(changes).toHaveLength(1);
      expect(changes[0].operation).toBe('DELETE');
      expect(changes[0].filePath).toBe('deleted-file.md');
    });

    it('should handle empty diff (no changes)', async () => {
      (CacheManager.getLastSyncTime as jest.Mock).mockResolvedValue('2025-10-10T10:00:00Z');
      mockGit.diff.mockResolvedValue('');

      const changes = await syncService.detectChanges('/vault', 'workspace-123');

      expect(changes).toEqual([]);
    });

    it('should handle renamed files', async () => {
      (CacheManager.getLastSyncTime as jest.Mock).mockResolvedValue('2025-10-10T10:00:00Z');
      mockGit.diff.mockResolvedValue('R100\told-name.md\tnew-name.md\n');
      mockGit.log.mockResolvedValue({
        latest: {
          hash: 'jkl345',
          author_name: 'Charlie',
          author_email: 'charlie@example.com',
          date: '2025-10-11T17:00:00Z',
          message: 'Rename file'
        }
      });

      const changes = await syncService.detectChanges('/vault', 'workspace-123');

      expect(changes).toHaveLength(1);
      expect(changes[0].operation).toBe('RENAME');
      expect(changes[0].filePath).toBe('new-name.md');
      expect(changes[0].oldPath).toBe('old-name.md');
    });
  });

  describe('pushChanges', () => {
    it('should push changes to backend with NodeVersion creation', async () => {
      const changes = [
        {
          operation: 'UPDATE' as const,
          filePath: 'note.md',
          nodeId: 'uuid-123',
          content: '# Updated Note',
          gitMetadata: {
            hash: 'abc123',
            author: 'John Doe <john@example.com>',
            timestamp: '2025-10-11T14:30:00Z',
            message: 'Update note'
          }
        }
      ];

      mockSyncApi.pushChanges.mockResolvedValue({
        data: {
          versionsCreated: 1,
          conflicts: []
        }
      });

      const result = await syncService.pushChanges('workspace-123', changes);

      expect(result.versionsCreated).toBe(1);
      expect(result.conflicts).toEqual([]);
      expect(mockSyncApi.pushChanges).toHaveBeenCalledWith('workspace-123', {
        changes: expect.arrayContaining([
          expect.objectContaining({
            nodeId: 'uuid-123',
            operation: 'UPDATE',
            content: '# Updated Note',
            gitCommitHash: 'abc123',
            gitCommitMessage: 'Update note',
            gitCommitAuthor: 'John Doe <john@example.com>',
            gitCommitTimestamp: '2025-10-11T14:30:00Z'
          })
        ])
      });
    });

    it('should handle push errors', async () => {
      const changes = [
        {
          operation: 'UPDATE' as const,
          filePath: 'note.md',
          nodeId: 'uuid-123',
          content: '# Updated Note',
          gitMetadata: {
            hash: 'abc123',
            author: 'John Doe',
            timestamp: '2025-10-11T14:30:00Z',
            message: 'Update'
          }
        }
      ];

      mockSyncApi.pushChanges.mockRejectedValue(new Error('Network error'));

      await expect(
        syncService.pushChanges('workspace-123', changes)
      ).rejects.toThrow('Network error');
    });

    it('should return conflicts when detected', async () => {
      const changes = [
        {
          operation: 'UPDATE' as const,
          filePath: 'note.md',
          nodeId: 'uuid-123',
          content: 'Local content',
          gitMetadata: {
            hash: 'abc123',
            author: 'John Doe',
            timestamp: '2025-10-11T14:30:00Z',
            message: 'Update'
          }
        }
      ];

      mockSyncApi.pushChanges.mockResolvedValue({
        data: {
          versionsCreated: 0,
          conflicts: [
            {
              nodeId: 'uuid-123',
              filePath: 'note.md',
              localContent: 'Local content',
              remoteContent: 'Remote content',
              localTimestamp: '2025-10-11T14:30:00Z',
              remoteTimestamp: '2025-10-11T14:31:00Z'
            }
          ]
        }
      });

      const result = await syncService.pushChanges('workspace-123', changes);

      expect(result.versionsCreated).toBe(0);
      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0].nodeId).toBe('uuid-123');
    });
  });

  describe('pullChanges', () => {
    it('should retrieve remote changes', async () => {
      (CacheManager.getLastSyncTime as jest.Mock).mockResolvedValue('2025-10-10T10:00:00Z');

      mockSyncApi.pullChanges.mockResolvedValue({
        data: {
          changes: [
            {
              nodeId: 'uuid-456',
              operation: 'UPDATE',
              content: '# Remote Update',
              filePath: 'remote-note.md',
              updatedAt: '2025-10-11T15:00:00Z'
            }
          ]
        }
      });

      const result = await syncService.pullChanges('workspace-123');

      expect(result.changes).toHaveLength(1);
      expect(result.changes[0].operation).toBe('UPDATE');
      expect(result.changes[0].content).toBe('# Remote Update');
      expect(mockSyncApi.pullChanges).toHaveBeenCalledWith(
        'workspace-123',
        { since: '2025-10-10T10:00:00Z' }
      );
    });

    it('should handle no remote changes', async () => {
      (CacheManager.getLastSyncTime as jest.Mock).mockResolvedValue('2025-10-10T10:00:00Z');
      mockSyncApi.pullChanges.mockResolvedValue({
        data: { changes: [] }
      });

      const result = await syncService.pullChanges('workspace-123');

      expect(result.changes).toEqual([]);
    });
  });

  describe('applyRemoteChanges', () => {
    it('should write remote changes to local files', async () => {
      const remoteChanges = [
        {
          nodeId: 'uuid-789',
          operation: 'UPDATE' as const,
          filePath: 'local-note.md',
          content: '# Remote Update',
          updatedAt: '2025-10-11T16:00:00Z'
        }
      ];

      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

      await syncService.applyRemoteChanges('/vault', remoteChanges);

      expect(fs.writeFile).toHaveBeenCalledWith(
        '/vault/local-note.md',
        '# Remote Update',
        'utf-8'
      );
    });

    it('should delete local files for DELETE operations', async () => {
      const remoteChanges = [
        {
          nodeId: 'uuid-999',
          operation: 'DELETE' as const,
          filePath: 'deleted-note.md',
          content: '',
          updatedAt: '2025-10-11T16:30:00Z'
        }
      ];

      (fs.unlink as jest.Mock).mockResolvedValue(undefined);

      await syncService.applyRemoteChanges('/vault', remoteChanges);

      expect(fs.unlink).toHaveBeenCalledWith('/vault/deleted-note.md');
    });

    it('should create new files for CREATE operations', async () => {
      const remoteChanges = [
        {
          nodeId: 'uuid-111',
          operation: 'CREATE' as const,
          filePath: 'new-remote-note.md',
          content: '# New Remote Note',
          updatedAt: '2025-10-11T17:00:00Z'
        }
      ];

      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

      await syncService.applyRemoteChanges('/vault', remoteChanges);

      expect(fs.writeFile).toHaveBeenCalledWith(
        '/vault/new-remote-note.md',
        '# New Remote Note',
        'utf-8'
      );
    });
  });

  describe('completeSync', () => {
    it('should update last sync timestamp', async () => {
      (CacheManager.setLastSyncTime as jest.Mock).mockResolvedValue(undefined);

      await syncService.completeSync('workspace-123', '2025-10-11T18:00:00Z');

      expect(CacheManager.setLastSyncTime).toHaveBeenCalledWith(
        'workspace-123',
        '2025-10-11T18:00:00Z'
      );
    });
  });
});
