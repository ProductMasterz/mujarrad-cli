import { UploadService } from '../../../src/services/UploadService.js';
import { VaultScanner } from '../../../src/filesystem/VaultScanner.js';
import { MarkdownParser } from '../../../src/filesystem/MarkdownParser.js';
import { CanvasParser } from '../../../src/filesystem/CanvasParser.js';
import { MetadataManager } from '../../../src/filesystem/MetadataManager.js';
import { CacheManager } from '../../../src/utils/CacheManager.js';
import * as fs from 'fs/promises';

// Mock all dependencies
jest.mock('../../../src/api/generated/api.js');
jest.mock('../../../src/filesystem/VaultScanner.js');
jest.mock('../../../src/filesystem/MarkdownParser.js');
jest.mock('../../../src/filesystem/CanvasParser.js');
jest.mock('../../../src/filesystem/MetadataManager.js');
jest.mock('../../../src/utils/CacheManager.js');
jest.mock('fs/promises');

describe('UploadService', () => {
  let uploadService: UploadService;
  let mockUploadApi: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock API with actual generated methods
    mockUploadApi = {
      uploadBatch: jest.fn(),
      getUploadStatus: jest.fn(),
      getUploadLog: jest.fn(),
    };

    uploadService = new UploadService(mockUploadApi);
  });

  describe('createBatches', () => {
    it('should split files into batches', () => {
      const files = Array(150).fill(null).map((_, i) => ({ path: `note${i}.md` }));
      const batches = uploadService.createBatches(files, 50);

      expect(batches).toHaveLength(3);
      expect(batches[0]).toHaveLength(50);
      expect(batches[1]).toHaveLength(50);
      expect(batches[2]).toHaveLength(50);
    });

    it('should handle files count not divisible by batch size', () => {
      const files = Array(155).fill(null).map((_, i) => ({ path: `note${i}.md` }));
      const batches = uploadService.createBatches(files, 50);

      expect(batches).toHaveLength(4);
      expect(batches[0]).toHaveLength(50);
      expect(batches[1]).toHaveLength(50);
      expect(batches[2]).toHaveLength(50);
      expect(batches[3]).toHaveLength(5);
    });

    it('should handle empty file list', () => {
      const files: any[] = [];
      const batches = uploadService.createBatches(files, 50);

      expect(batches).toEqual([]);
    });

    it('should handle single batch', () => {
      const files = Array(30).fill(null).map((_, i) => ({ path: `note${i}.md` }));
      const batches = uploadService.createBatches(files, 50);

      expect(batches).toHaveLength(1);
      expect(batches[0]).toHaveLength(30);
    });

    it('should use default batch size if not specified', () => {
      const files = Array(100).fill(null).map((_, i) => ({ path: `note${i}.md` }));
      const batches = uploadService.createBatches(files);

      expect(batches).toHaveLength(2);
      expect(batches[0]).toHaveLength(50);
      expect(batches[1]).toHaveLength(50);
    });
  });

  describe('uploadBatch', () => {
    it('should upload batch of files', async () => {
      const mockFiles = [
        { name: 'note1.md', content: '# Note 1', size: 8 }
      ];
      const mockResponse = {
        data: {
          sessionId: 'session-123',
          created: [{ nodeId: 'uuid-1', slug: 'note-1', filePath: 'note1.md' }],
          errors: []
        }
      };
      mockUploadApi.uploadBatch.mockResolvedValue(mockResponse);

      const result = await uploadService.uploadBatch('workspace-123', mockFiles, 1);

      expect(result.sessionId).toBe('session-123');
      expect(result.created).toHaveLength(1);
      expect(result.errors).toHaveLength(0);
      expect(result.batchNumber).toBe(1);
      expect(mockUploadApi.uploadBatch).toHaveBeenCalledWith(
        'workspace-123',
        mockFiles,
        1,
        undefined,
        undefined
      );
    });

    it('should include sessionId for subsequent batches', async () => {
      const mockFiles = [{ name: 'note2.md', content: '# Note 2', size: 8 }];
      const mockResponse = {
        data: {
          sessionId: 'session-123',
          created: [{ nodeId: 'uuid-2' }],
          errors: []
        }
      };
      mockUploadApi.uploadBatch.mockResolvedValue(mockResponse);

      const result = await uploadService.uploadBatch(
        'workspace-123',
        mockFiles,
        2,
        'session-123',
        'Batch 2 commit'
      );

      expect(result.sessionId).toBe('session-123');
      expect(mockUploadApi.uploadBatch).toHaveBeenCalledWith(
        'workspace-123',
        mockFiles,
        2,
        'session-123',
        'Batch 2 commit'
      );
    });

    it('should handle upload errors', async () => {
      const mockFiles = [{ name: 'note.md', content: '# Note', size: 6 }];
      mockUploadApi.uploadBatch.mockRejectedValue(new Error('Network error'));

      await expect(
        uploadService.uploadBatch('workspace-123', mockFiles, 1)
      ).rejects.toThrow('Network error');
    });

    it('should handle partial errors from API', async () => {
      const mockFiles = [
        { name: 'note1.md', content: '# Note 1', size: 8 },
        { name: 'note2.md', content: '# Note 2', size: 8 }
      ];
      const mockResponse = {
        data: {
          sessionId: 'session-123',
          created: [{ nodeId: 'uuid-1' }],
          errors: [{ filePath: 'note2.md', error: 'Validation failed' }]
        }
      };
      mockUploadApi.uploadBatch.mockResolvedValue(mockResponse);

      const result = await uploadService.uploadBatch('workspace-123', mockFiles, 1);

      expect(result.created).toHaveLength(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].filePath).toBe('note2.md');
    });
  });

  describe('getUploadStatus', () => {
    it('should retrieve upload status', async () => {
      const mockStatus = {
        sessionId: 'session-123',
        status: 'in_progress',
        totalBatches: 3,
        completedBatches: 1,
        totalFiles: 150,
        processedFiles: 50
      };
      mockUploadApi.getUploadStatus.mockResolvedValue({ data: mockStatus });

      const status = await uploadService.getUploadStatus('workspace-123', 'session-123');

      expect(status).toEqual(mockStatus);
      expect(mockUploadApi.getUploadStatus).toHaveBeenCalledWith('workspace-123', 'session-123');
    });

    it('should handle status retrieval errors', async () => {
      mockUploadApi.getUploadStatus.mockRejectedValue(new Error('Session not found'));

      await expect(
        uploadService.getUploadStatus('workspace-123', 'invalid-session')
      ).rejects.toThrow('Session not found');
    });
  });

  describe('getUploadLog', () => {
    it('should retrieve upload log', async () => {
      const mockLog = [
        { timestamp: '2025-10-11T10:00:00Z', level: 'info', message: 'Batch 1 started' },
        { timestamp: '2025-10-11T10:00:05Z', level: 'info', message: 'Batch 1 completed' }
      ];
      mockUploadApi.getUploadLog.mockResolvedValue({ data: mockLog });

      const log = await uploadService.getUploadLog('workspace-123', 'session-123');

      expect(log).toEqual(mockLog);
      expect(mockUploadApi.getUploadLog).toHaveBeenCalledWith('workspace-123', 'session-123');
    });
  });

  describe('prepareNodeData', () => {
    it('should prepare markdown node data', async () => {
      const fileInfo: any = {
        absolutePath: '/vault/note.md',
        relativePath: 'note.md',
        hash: 'abc123',
        size: 100,
        modifiedTime: new Date(),
        extension: '.md'
      };
      const content = '# Test Note\nSome content\n[[Another Note]]';

      (fs.readFile as jest.Mock).mockResolvedValue(content);

      const mockParser = {
        extractWikilinks: jest.fn().mockReturnValue([
          { target: 'Another Note', alias: null }
        ]),
        parseFrontmatter: jest.fn().mockReturnValue({ title: 'Test Note' })
      };
      (MarkdownParser as jest.Mock).mockImplementation(() => mockParser);
      (MetadataManager.extractUUID as jest.Mock).mockReturnValue(null);

      const nodeData = await uploadService.prepareNodeData(fileInfo, '/vault');

      expect(nodeData.nodeType).toBe('REGULAR');
      expect(nodeData.title).toBe('Test Note');
      expect(nodeData.content).toBe(content);
      expect(nodeData.filePath).toBe('note.md');
      expect(nodeData.hash).toBe('abc123');
      expect(nodeData.slug).toBe('note');
      expect(nodeData.wikilinks).toHaveLength(1);
    });

    it('should prepare canvas node data', async () => {
      const fileInfo: any = {
        absolutePath: '/vault/canvas.canvas',
        relativePath: 'canvas.canvas',
        hash: 'def456',
        size: 200,
        modifiedTime: new Date(),
        extension: '.canvas'
      };
      const canvasJSON = JSON.stringify({
        nodes: [{ id: 'node1', file: 'note.md', x: 0, y: 0, width: 200, height: 100 }],
        edges: []
      });

      (fs.readFile as jest.Mock).mockResolvedValue(canvasJSON);

      const mockCanvasParser = {
        parse: jest.fn().mockReturnValue({
          nodes: [{ id: 'node1', file: 'note.md' }],
          edges: [],
          config: {}
        })
      };
      (CanvasParser as jest.Mock).mockImplementation(() => mockCanvasParser);

      const nodeData = await uploadService.prepareNodeData(fileInfo, '/vault');

      expect(nodeData.nodeType).toBe('CANVAS');
      expect(nodeData.filePath).toBe('canvas.canvas');
      expect(nodeData.slug).toBe('canvas');
      expect(nodeData.visualProperties).toBeDefined();
    });

    it('should extract existing UUID from markdown', async () => {
      const fileInfo: any = {
        absolutePath: '/vault/note.md',
        relativePath: 'note.md',
        extension: '.md',
        hash: 'abc123'
      };
      const content = '<!-- mujarrad-node-id: existing-uuid -->\n# Note';

      (fs.readFile as jest.Mock).mockResolvedValue(content);
      (MetadataManager.extractUUID as jest.Mock).mockReturnValue('existing-uuid');
      (MarkdownParser as jest.Mock).mockImplementation(() => ({
        extractWikilinks: jest.fn().mockReturnValue([]),
        parseFrontmatter: jest.fn().mockReturnValue({})
      }));

      const nodeData = await uploadService.prepareNodeData(fileInfo, '/vault');

      expect(nodeData.existingUUID).toBe('existing-uuid');
    });

    it('should use frontmatter title if available', async () => {
      const fileInfo: any = {
        absolutePath: '/vault/note.md',
        relativePath: 'note.md',
        extension: '.md',
        hash: 'abc123'
      };
      const content = '---\ntitle: Custom Title\n---\n# Note';

      (fs.readFile as jest.Mock).mockResolvedValue(content);
      (MetadataManager.extractUUID as jest.Mock).mockReturnValue(null);
      (MarkdownParser as jest.Mock).mockImplementation(() => ({
        extractWikilinks: jest.fn().mockReturnValue([]),
        parseFrontmatter: jest.fn().mockReturnValue({ title: 'Custom Title' })
      }));

      const nodeData = await uploadService.prepareNodeData(fileInfo, '/vault');

      expect(nodeData.title).toBe('Custom Title');
    });
  });

  describe('uploadVault', () => {
    it('should orchestrate full vault upload', async () => {
      const mockFiles = [
        { relativePath: 'note1.md', absolutePath: '/vault/note1.md', extension: '.md', hash: 'hash1' },
        { relativePath: 'note2.md', absolutePath: '/vault/note2.md', extension: '.md', hash: 'hash2' }
      ];

      const mockScanner = {
        scan: jest.fn().mockResolvedValue(mockFiles)
      };
      (VaultScanner as jest.Mock).mockImplementation(() => mockScanner);

      (fs.readFile as jest.Mock).mockResolvedValue('# Test');
      (MarkdownParser as jest.Mock).mockImplementation(() => ({
        extractWikilinks: jest.fn().mockReturnValue([]),
        parseFrontmatter: jest.fn().mockReturnValue({})
      }));
      (MetadataManager.extractUUID as jest.Mock).mockReturnValue(null);

      mockUploadApi.uploadBatch.mockResolvedValue({
        data: {
          sessionId: 'session-123',
          created: [
            { nodeId: 'uuid-1', filePath: 'note1.md' },
            { nodeId: 'uuid-2', filePath: 'note2.md' }
          ],
          errors: []
        }
      });

      (CacheManager.cacheNodeMapping as jest.Mock).mockResolvedValue(undefined);
      (CacheManager.setLastSyncTime as jest.Mock).mockResolvedValue(undefined);

      const summary = await uploadService.uploadVault('workspace-123', '/vault');

      expect(summary.success).toBe(true);
      expect(summary.totalNodesCreated).toBe(2);
      expect(summary.totalErrors).toBe(0);
      expect(summary.sessionId).toBe('session-123');
      expect(summary.duration).toBeGreaterThan(0);
      expect(mockScanner.scan).toHaveBeenCalled();
      expect(mockUploadApi.uploadBatch).toHaveBeenCalled();
      expect(CacheManager.cacheNodeMapping).toHaveBeenCalledTimes(2);
      expect(CacheManager.setLastSyncTime).toHaveBeenCalled();
    });

    it('should handle empty vault', async () => {
      const mockScanner = {
        scan: jest.fn().mockResolvedValue([])
      };
      (VaultScanner as jest.Mock).mockImplementation(() => mockScanner);

      const summary = await uploadService.uploadVault('workspace-123', '/vault');

      expect(summary.success).toBe(true);
      expect(summary.totalNodesCreated).toBe(0);
      expect(summary.totalErrors).toBe(0);
      expect(mockUploadApi.uploadBatch).not.toHaveBeenCalled();
    });

    it('should handle multiple batches', async () => {
      const mockFiles = Array(150).fill(null).map((_, i) => ({
        relativePath: `note${i}.md`,
        absolutePath: `/vault/note${i}.md`,
        extension: '.md',
        hash: `hash${i}`
      }));

      const mockScanner = {
        scan: jest.fn().mockResolvedValue(mockFiles)
      };
      (VaultScanner as jest.Mock).mockImplementation(() => mockScanner);

      (fs.readFile as jest.Mock).mockResolvedValue('# Test');
      (MarkdownParser as jest.Mock).mockImplementation(() => ({
        extractWikilinks: jest.fn().mockReturnValue([]),
        parseFrontmatter: jest.fn().mockReturnValue({})
      }));
      (MetadataManager.extractUUID as jest.Mock).mockReturnValue(null);

      // First batch creates session
      mockUploadApi.uploadBatch.mockResolvedValueOnce({
        data: {
          sessionId: 'session-123',
          created: Array(50).fill(null).map((_, i) => ({ nodeId: `uuid-${i}` })),
          errors: []
        }
      });

      // Subsequent batches use session
      mockUploadApi.uploadBatch.mockResolvedValue({
        data: {
          sessionId: 'session-123',
          created: Array(50).fill(null).map((_, i) => ({ nodeId: `uuid-${50 + i}` })),
          errors: []
        }
      });

      (CacheManager.cacheNodeMapping as jest.Mock).mockResolvedValue(undefined);
      (CacheManager.setLastSyncTime as jest.Mock).mockResolvedValue(undefined);

      const summary = await uploadService.uploadVault('workspace-123', '/vault', 50);

      expect(summary.totalNodesCreated).toBe(150);
      expect(mockUploadApi.uploadBatch).toHaveBeenCalledTimes(3);

      // Verify first call has no sessionId
      expect(mockUploadApi.uploadBatch).toHaveBeenNthCalledWith(
        1,
        'workspace-123',
        expect.any(Array),
        1,
        undefined,
        'Batch 1/3: 50 files'
      );

      // Verify subsequent calls have sessionId
      expect(mockUploadApi.uploadBatch).toHaveBeenNthCalledWith(
        2,
        'workspace-123',
        expect.any(Array),
        2,
        'session-123',
        'Batch 2/3: 50 files'
      );
    });

    it('should track errors during upload', async () => {
      const mockFiles = [
        { relativePath: 'note1.md', absolutePath: '/vault/note1.md', extension: '.md', hash: 'hash1' },
        { relativePath: 'note2.md', absolutePath: '/vault/note2.md', extension: '.md', hash: 'hash2' }
      ];

      const mockScanner = {
        scan: jest.fn().mockResolvedValue(mockFiles)
      };
      (VaultScanner as jest.Mock).mockImplementation(() => mockScanner);

      (fs.readFile as jest.Mock).mockResolvedValue('# Test');
      (MarkdownParser as jest.Mock).mockImplementation(() => ({
        extractWikilinks: jest.fn().mockReturnValue([]),
        parseFrontmatter: jest.fn().mockReturnValue({})
      }));
      (MetadataManager.extractUUID as jest.Mock).mockReturnValue(null);

      mockUploadApi.uploadBatch.mockResolvedValue({
        data: {
          sessionId: 'session-123',
          created: [{ nodeId: 'uuid-1' }],
          errors: [{ filePath: 'note2.md', error: 'Validation failed' }]
        }
      });

      (CacheManager.cacheNodeMapping as jest.Mock).mockResolvedValue(undefined);
      (CacheManager.setLastSyncTime as jest.Mock).mockResolvedValue(undefined);

      const summary = await uploadService.uploadVault('workspace-123', '/vault');

      expect(summary.success).toBe(false);
      expect(summary.totalNodesCreated).toBe(1);
      expect(summary.totalErrors).toBe(1);
    });

    it('should handle scan errors', async () => {
      const mockScanner = {
        scan: jest.fn().mockRejectedValue(new Error('Scan failed'))
      };
      (VaultScanner as jest.Mock).mockImplementation(() => mockScanner);

      await expect(
        uploadService.uploadVault('workspace-123', '/vault')
      ).rejects.toThrow('Scan failed');
    });
  });

  /* H2 FIX: Error Recovery Tests (FR-050) - PENDING IMPLEMENTATION
   *
   * These tests are documented here but commented out until rollback logic is implemented.
   *
   * Implementation required:
   * 1. Extend UploadSummary interface:
   *    - Add rollbackPerformed: boolean
   *    - Add rollbackError?: string
   *
   * 2. Add rollback API method:
   *    - UploadApi.deleteNodes(workspaceId: string, nodeIds: string[]): Promise<void>
   *    OR
   *    - UploadApi.rollbackSession(workspaceId: string, sessionId: string): Promise<void>
   *
   * 3. Implement rollback logic in UploadService.uploadVault():
   *    - Track created node IDs during batch uploads
   *    - On error, call deleteNodes() with all created IDs
   *    - Clear workspace cache via CacheManager.clearWorkspaceCache()
   *    - Set rollbackPerformed and rollbackError in summary
   *
   * Test Scenarios (see spec.md lines 756-761 for FR-050):
   * - Test 1: Rollback when batch fails at file 15/50 (14 nodes created, then error)
   * - Test 2: Handle rollback failure gracefully (network error during DELETE)
   * - Test 3: Skip rollback when no nodes created (all files fail immediately)
   *
   * Blocked by: Backend API /api/workspaces/{id}/nodes/batch-delete endpoint
   * Priority: Phase 6 (before production release)
   */
});
