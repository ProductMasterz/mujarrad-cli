import { ConflictResolver, Conflict, ConflictResolution } from '../../../src/services/ConflictResolver.js';
import inquirer from 'inquirer';
import { Logger } from '../../../src/utils/Logger.js';

// Mock dependencies
jest.mock('inquirer', () => ({
  default: {
    prompt: jest.fn()
  },
  prompt: jest.fn()
}));
jest.mock('../../../src/utils/Logger.js');

describe('ConflictResolver', () => {
  let conflictResolver: ConflictResolver;
  let mockLogger: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    };
    (Logger as jest.Mock).mockImplementation(() => mockLogger);

    conflictResolver = new ConflictResolver();
  });

  describe('detectConflict', () => {
    it('should detect concurrent edits with different timestamps', () => {
      const local = {
        nodeId: 'uuid-123',
        filePath: 'note.md',
        content: 'Local content',
        timestamp: '2025-10-11T14:30:00Z'
      };
      const remote = {
        nodeId: 'uuid-123',
        filePath: 'note.md',
        content: 'Remote content',
        timestamp: '2025-10-11T14:31:00Z'
      };

      const conflict = conflictResolver.detectConflict(local, remote);

      expect(conflict).toBeDefined();
      expect(conflict?.type).toBe('CONCURRENT_EDIT');
      expect(conflict?.nodeId).toBe('uuid-123');
      expect(conflict?.filePath).toBe('note.md');
    });

    it('should not detect conflict if content is identical', () => {
      const local = {
        nodeId: 'uuid-123',
        filePath: 'note.md',
        content: 'Same content',
        timestamp: '2025-10-11T14:30:00Z'
      };
      const remote = {
        nodeId: 'uuid-123',
        filePath: 'note.md',
        content: 'Same content',
        timestamp: '2025-10-11T14:31:00Z'
      };

      const conflict = conflictResolver.detectConflict(local, remote);

      expect(conflict).toBeNull();
    });
  });

  describe('autoResolve - Last-write-wins (timestamp >1s diff)', () => {
    it('should apply remote when timestamp diff >1 second', () => {
      const conflict: Conflict = {
        type: 'CONCURRENT_EDIT',
        nodeId: 'uuid-123',
        filePath: 'note.md',
        localContent: 'Local content',
        remoteContent: 'Remote content',
        localTimestamp: '2025-10-11T14:30:00Z',
        remoteTimestamp: '2025-10-11T14:32:00Z' // 2 minutes later
      };

      const resolution = conflictResolver.autoResolve(conflict);

      expect(resolution.strategy).toBe('KEEP_REMOTE');
      expect(resolution.content).toBe('Remote content');
      expect(resolution.reason).toContain('Remote is newer by');
    });

    it('should apply local when local timestamp is newer by >1 second', () => {
      const conflict: Conflict = {
        type: 'CONCURRENT_EDIT',
        nodeId: 'uuid-123',
        filePath: 'note.md',
        localContent: 'Local content',
        remoteContent: 'Remote content',
        localTimestamp: '2025-10-11T14:32:00Z',
        remoteTimestamp: '2025-10-11T14:30:00Z'
      };

      const resolution = conflictResolver.autoResolve(conflict);

      expect(resolution.strategy).toBe('KEEP_LOCAL');
      expect(resolution.content).toBe('Local content');
      expect(resolution.reason).toContain('Local is newer by');
    });

    it('should trigger hybrid mode when timestamp diff <1 second', () => {
      const conflict: Conflict = {
        type: 'CONCURRENT_EDIT',
        nodeId: 'uuid-123',
        filePath: 'note.md',
        localContent: 'Local content',
        remoteContent: 'Remote content',
        localTimestamp: '2025-10-11T14:30:00.000Z',
        remoteTimestamp: '2025-10-11T14:30:00.500Z' // 500ms diff
      };

      const resolution = conflictResolver.autoResolve(conflict);

      expect(resolution.strategy).toBe('PROMPT_USER');
      expect(resolution.reason).toContain('within 1 second');
    });

    it('should compare content hashes when timestamps are identical', () => {
      const conflict: Conflict = {
        type: 'CONCURRENT_EDIT',
        nodeId: 'uuid-123',
        filePath: 'note.md',
        localContent: 'Same content',
        remoteContent: 'Same content',
        localTimestamp: '2025-10-11T14:30:00Z',
        remoteTimestamp: '2025-10-11T14:30:00Z'
      };

      const resolution = conflictResolver.autoResolve(conflict);

      expect(resolution.strategy).toBe('NO_CONFLICT');
      expect(resolution.reason).toBe('Identical content');
    });
  });

  describe('resolveInteractive - Hybrid mode', () => {
    it('should prompt user for resolution when auto-resolve returns PROMPT_USER', async () => {
      const conflict: Conflict = {
        type: 'CONCURRENT_EDIT',
        nodeId: 'uuid-123',
        filePath: 'note.md',
        localContent: 'Local content',
        remoteContent: 'Remote content',
        localTimestamp: '2025-10-11T14:30:00.000Z',
        remoteTimestamp: '2025-10-11T14:30:00.500Z'
      };

      (inquirer.prompt as any).mockResolvedValue({
        choice: 'local'
      });

      const resolution = await conflictResolver.resolveInteractive(conflict);

      expect(resolution.strategy).toBe('KEEP_LOCAL');
      expect(resolution.content).toBe('Local content');
      expect(inquirer.prompt).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'list',
            name: 'choice',
            message: expect.stringContaining('note.md')
          })
        ])
      );
    });

    it('should support remote option in interactive prompt', async () => {
      const conflict: Conflict = {
        type: 'CONCURRENT_EDIT',
        nodeId: 'uuid-123',
        filePath: 'note.md',
        localContent: 'Local content',
        remoteContent: 'Remote content',
        localTimestamp: '2025-10-11T14:30:00Z',
        remoteTimestamp: '2025-10-11T14:30:00Z'
      };

      (inquirer.prompt as any).mockResolvedValue({
        choice: 'remote'
      });

      const resolution = await conflictResolver.resolveInteractive(conflict);

      expect(resolution.strategy).toBe('KEEP_REMOTE');
      expect(resolution.content).toBe('Remote content');
    });

    it('should support manual merge option', async () => {
      const conflict: Conflict = {
        type: 'CONCURRENT_EDIT',
        nodeId: 'uuid-123',
        filePath: 'note.md',
        localContent: 'Local content',
        remoteContent: 'Remote content',
        localTimestamp: '2025-10-11T14:30:00Z',
        remoteTimestamp: '2025-10-11T14:30:00Z'
      };

      (inquirer.prompt as any).mockResolvedValue({
        choice: 'merge'
      });

      const resolution = await conflictResolver.resolveInteractive(conflict);

      expect(resolution.strategy).toBe('MANUAL_MERGE');
      expect(resolution.requiresUserEdit).toBe(true);
    });
  });

  describe('handleFallbackTriggers', () => {
    it('should prompt for file deleted locally + modified remotely', () => {
      const conflict: Conflict = {
        type: 'DELETE_MODIFY_CONFLICT',
        nodeId: 'uuid-123',
        filePath: 'deleted-note.md',
        localContent: '',
        remoteContent: 'Remote modifications',
        localTimestamp: '2025-10-11T14:30:00Z',
        remoteTimestamp: '2025-10-11T14:31:00Z'
      };

      const resolution = conflictResolver.autoResolve(conflict);

      expect(resolution.strategy).toBe('PROMPT_USER');
      expect(resolution.reason).toContain('File deleted locally but modified remotely');
    });

    it('should prompt for UUID mismatch', () => {
      const conflict: Conflict = {
        type: 'METADATA_MISMATCH',
        nodeId: 'uuid-123',
        filePath: 'note.md',
        localContent: '<!-- mujarrad-node-id: wrong-uuid -->',
        remoteContent: '<!-- mujarrad-node-id: uuid-123 -->',
        localTimestamp: '2025-10-11T14:30:00Z',
        remoteTimestamp: '2025-10-11T14:31:00Z'
      };

      const resolution = conflictResolver.autoResolve(conflict);

      expect(resolution.strategy).toBe('PROMPT_USER');
      expect(resolution.reason).toContain('UUID mismatch');
    });

    it('should prompt for file moved + content changed', () => {
      const conflict: Conflict = {
        type: 'MOVE_MODIFY_CONFLICT',
        nodeId: 'uuid-123',
        filePath: 'new-path/note.md',
        oldPath: 'old-path/note.md',
        localContent: 'Modified content',
        remoteContent: 'Different modifications',
        localTimestamp: '2025-10-11T14:30:00Z',
        remoteTimestamp: '2025-10-11T14:31:00Z'
      };

      const resolution = conflictResolver.autoResolve(conflict);

      expect(resolution.strategy).toBe('PROMPT_USER');
      expect(resolution.reason).toContain('File moved AND content changed');
    });
  });

  describe('appendUUIDSuffix - Name conflict resolution', () => {
    it('should append UUID suffix to duplicate filenames', () => {
      const fileName = 'Note.md';
      const uuid = 'abc123de';

      const newFileName = conflictResolver.appendUUIDSuffix(fileName, uuid);

      expect(newFileName).toMatch(/Note-[a-f0-9]{8}\.md/);
      expect(newFileName).toContain('abc123de');
    });

    it('should handle files without extensions', () => {
      const fileName = 'README';
      const uuid = 'def456gh';

      const newFileName = conflictResolver.appendUUIDSuffix(fileName, uuid);

      expect(newFileName).toBe('README-def456gh');
    });

    it('should handle files with multiple dots', () => {
      const fileName = 'my.complex.note.md';
      const uuid = 'ghi789jk';

      const newFileName = conflictResolver.appendUUIDSuffix(fileName, uuid);

      expect(newFileName).toBe('my.complex.note-ghi789jk.md');
    });
  });

  describe('logConflictResolution', () => {
    it('should log auto-resolved conflicts', () => {
      const conflict: Conflict = {
        type: 'CONCURRENT_EDIT',
        nodeId: 'uuid-123',
        filePath: 'note.md',
        localContent: 'Local',
        remoteContent: 'Remote',
        localTimestamp: '2025-10-11T14:30:00Z',
        remoteTimestamp: '2025-10-11T14:32:00Z'
      };

      const resolution: ConflictResolution = {
        strategy: 'KEEP_REMOTE',
        content: 'Remote',
        reason: 'Remote is newer by 120 seconds'
      };

      conflictResolver.logResolution(conflict, resolution, 'session-123');

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('CONFLICT AUTO-RESOLVED'),
        expect.objectContaining({
          file: 'note.md',
          resolution: 'Remote wins',
          sessionId: 'session-123'
        })
      );
    });

    it('should log user-resolved conflicts', () => {
      const conflict: Conflict = {
        type: 'CONCURRENT_EDIT',
        nodeId: 'uuid-123',
        filePath: 'note.md',
        localContent: 'Local',
        remoteContent: 'Remote',
        localTimestamp: '2025-10-11T14:30:00Z',
        remoteTimestamp: '2025-10-11T14:30:00.500Z'
      };

      const resolution: ConflictResolution = {
        strategy: 'KEEP_LOCAL',
        content: 'Local',
        reason: 'User chose local'
      };

      conflictResolver.logResolution(conflict, resolution, 'session-123');

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('CONFLICT USER-RESOLVED'),
        expect.objectContaining({
          file: 'note.md',
          userChoice: 'Keep local'
        })
      );
    });
  });
});
