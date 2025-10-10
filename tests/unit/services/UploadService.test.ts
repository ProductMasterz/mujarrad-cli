import { UploadService } from '../../../src/services/UploadService.js';
import { VaultScanner } from '../../../src/filesystem/VaultScanner.js';
import { MarkdownParser } from '../../../src/filesystem/MarkdownParser.js';
import { CanvasParser } from '../../../src/filesystem/CanvasParser.js';
import { MetadataManager } from '../../../src/filesystem/MetadataManager.js';
import { CacheManager } from '../../../src/utils/CacheManager.js';

// Mock all dependencies
jest.mock('../../../src/api/generated/api.js');
jest.mock('../../../src/filesystem/VaultScanner.js');
jest.mock('../../../src/filesystem/MarkdownParser.js');
jest.mock('../../../src/filesystem/CanvasParser.js');
jest.mock('../../../src/filesystem/MetadataManager.js');
jest.mock('../../../src/utils/CacheManager.js');

describe('UploadService', () => {
  let uploadService: UploadService;
  let mockUploadApi: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock API with proper Jest mock functions
    mockUploadApi = {
      initUploadSession: jest.fn(),
      uploadNodes: jest.fn(),
      completeUploadSession: jest.fn(),
    };

    uploadService = new UploadService(mockUploadApi);
  });

  describe('initSession', () => {
    it('should initialize upload session', async () => {
      const mockResponse = {
        data: {
          uploadSessionId: 'session-123',
          batchSize: 50,
          workspaceId: 'workspace-123'
        }
      };
      mockUploadApi.initUploadSession.mockResolvedValue(mockResponse as any);

      const session = await uploadService.initSession('workspace-123', { totalFiles: 150 });

      expect(session.uploadSessionId).toBe('session-123');
      expect(session.batchSize).toBe(50);
      expect(mockUploadApi.initUploadSession).toHaveBeenCalledWith(
        'workspace-123',
        expect.objectContaining({ totalFiles: 150 })
      );
    });

    it('should handle API errors during session init', async () => {
      mockUploadApi.initUploadSession.mockRejectedValue(new Error('API Error'));

      await expect(
        uploadService.initSession('workspace-123', { totalFiles: 10 })
      ).rejects.toThrow('API Error');
    });

    it('should include vault metadata in session init', async () => {
      const mockResponse = {
        data: {
          uploadSessionId: 'session-456',
          batchSize: 100
        }
      };
      mockUploadApi.initUploadSession.mockResolvedValue(mockResponse as any);

      await uploadService.initSession('workspace-123', {
        totalFiles: 500,
        vaultName: 'My Vault',
        vaultPath: '/path/to/vault'
      });

      expect(mockUploadApi.initUploadSession).toHaveBeenCalledWith(
        'workspace-123',
        expect.objectContaining({
          totalFiles: 500,
          vaultName: 'My Vault',
          vaultPath: '/path/to/vault'
        })
      );
    });
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
      expect(batches[3]).toHaveLength(5); // Remaining files
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
  });

  describe('uploadBatch', () => {
    it('should upload batch of nodes', async () => {
      const batch: any = [
        { nodeType: 'REGULAR', title: 'Note 1', slug: 'note-1', content: '# Note 1', filePath: 'note1.md' }
      ];
      const mockResponse = {
        data: {
          created: [{ nodeId: 'uuid-1', slug: 'note-1' }],
          errors: []
        }
      };
      mockUploadApi.uploadNodes.mockResolvedValue(mockResponse as any);

      const result = await uploadService.uploadBatch('session-123', 'workspace-123', batch);

      expect(result.created).toHaveLength(1);
      expect(result.created[0].nodeId).toBe('uuid-1');
      expect(result.errors).toHaveLength(0);
      expect(mockUploadApi.uploadNodes).toHaveBeenCalledWith(
        'session-123',
        'workspace-123',
        expect.objectContaining({ nodes: batch })
      );
    });

    it('should handle upload errors gracefully', async () => {
      const batch: any = [{ nodeType: 'REGULAR', title: 'Note', content: '# Note', filePath: 'note.md' }];
      mockUploadApi.uploadNodes.mockRejectedValue(new Error('Network error'));

      await expect(
        uploadService.uploadBatch('session-123', 'workspace-123', batch)
      ).rejects.toThrow('Network error');
    });

    it('should handle partial upload errors', async () => {
      const batch: any = [
        { nodeType: 'REGULAR', title: 'Note 1', content: '# Note 1', filePath: 'note1.md' },
        { nodeType: 'REGULAR', title: 'Note 2', content: '# Note 2', filePath: 'note2.md' }
      ];
      const mockResponse = {
        data: {
          created: [{ nodeId: 'uuid-1' }],
          errors: [{ filePath: 'note2.md', error: 'Validation error' }]
        }
      };
      mockUploadApi.uploadNodes.mockResolvedValue(mockResponse as any);

      const result = await uploadService.uploadBatch('session-123', 'workspace-123', batch);

      expect(result.created).toHaveLength(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].filePath).toBe('note2.md');
    });

    it('should upload empty batch without errors', async () => {
      const batch: any[] = [];
      const mockResponse = {
        data: {
          created: [],
          errors: []
        }
      };
      mockUploadApi.uploadNodes.mockResolvedValue(mockResponse as any);

      const result = await uploadService.uploadBatch('session-123', 'workspace-123', batch);

      expect(result.created).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('finalizeSession', () => {
    it('should finalize upload session', async () => {
      const mockResponse = {
        data: {
          success: true,
          totalNodesCreated: 150,
          uploadSessionId: 'session-123'
        }
      };
      mockUploadApi.completeUploadSession.mockResolvedValue(mockResponse as any);

      const result = await uploadService.finalizeSession('session-123', 'workspace-123');

      expect(result.success).toBe(true);
      expect(result.totalNodesCreated).toBe(150);
      expect(mockUploadApi.completeUploadSession).toHaveBeenCalledWith(
        'session-123',
        'workspace-123'
      );
    });

    it('should handle finalization errors', async () => {
      mockUploadApi.completeUploadSession.mockRejectedValue(new Error('Finalization failed'));

      await expect(
        uploadService.finalizeSession('session-123', 'workspace-123')
      ).rejects.toThrow('Finalization failed');
    });
  });

  describe('prepareNodeData', () => {
    it('should prepare markdown node data', async () => {
      const fileInfo = {
        absolutePath: '/vault/note.md',
        relativePath: 'note.md',
        hash: 'abc123',
        size: 100,
        modifiedTime: new Date(),
        extension: '.md'
      };
      const content = '# Test Note\nSome content\n[[Another Note]]';

      // Mock fs.readFile
      jest.spyOn(require('fs/promises'), 'readFile').mockResolvedValue(content);

      // Mock MarkdownParser
      const mockParser = {
        extractWikilinks: jest.fn().mockReturnValue([
          { target: 'Another Note', alias: null }
        ]),
        parseFrontmatter: jest.fn().mockReturnValue({ title: 'Test Note' })
      };
      (MarkdownParser as jest.Mock).mockImplementation(() => mockParser);

      // Mock MetadataManager
      (MetadataManager.extractUUID as jest.Mock).mockReturnValue(null);

      const nodeData = await uploadService.prepareNodeData(fileInfo, '/vault');

      expect(nodeData.nodeType).toBe('REGULAR');
      expect(nodeData.title).toBe('Test Note');
      expect(nodeData.content).toBe(content);
      expect(nodeData.filePath).toBe('note.md');
    });

    it('should prepare canvas node data', async () => {
      const fileInfo = {
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

      jest.spyOn(require('fs/promises'), 'readFile').mockResolvedValue(canvasJSON);

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
    });
  });

  describe('uploadVault', () => {
    it('should orchestrate full vault upload', async () => {
      // Mock VaultScanner
      const mockFiles = [
        { relativePath: 'note1.md', absolutePath: '/vault/note1.md', extension: '.md' },
        { relativePath: 'note2.md', absolutePath: '/vault/note2.md', extension: '.md' }
      ];
      const mockScanner = {
        scan: jest.fn().mockResolvedValue(mockFiles)
      };
      (VaultScanner as jest.Mock).mockImplementation(() => mockScanner);

      // Mock session init
      mockUploadApi.initUploadSession.mockResolvedValue({
        data: { uploadSessionId: 'session-123', batchSize: 50 }
      } as any);

      // Mock batch upload
      mockUploadApi.uploadNodes.mockResolvedValue({
        data: { created: [{ nodeId: 'uuid-1' }, { nodeId: 'uuid-2' }], errors: [] }
      } as any);

      // Mock finalization
      mockUploadApi.completeUploadSession.mockResolvedValue({
        data: { success: true, totalNodesCreated: 2 }
      } as any);

      // Mock file reading and parsing
      jest.spyOn(require('fs/promises'), 'readFile').mockResolvedValue('# Test');
      (MarkdownParser as jest.Mock).mockImplementation(() => ({
        extractWikilinks: jest.fn().mockReturnValue([]),
        parseFrontmatter: jest.fn().mockReturnValue({})
      }));
      (MetadataManager.extractUUID as jest.Mock).mockReturnValue(null);

      // Mock cache
      (CacheManager.cacheNodeMapping as jest.Mock).mockResolvedValue(undefined);
      (CacheManager.setLastSyncTime as jest.Mock).mockResolvedValue(undefined);

      const summary = await uploadService.uploadVault('workspace-123', '/vault');

      expect(summary.success).toBe(true);
      expect(summary.totalNodesCreated).toBe(2);
      expect(mockScanner.scan).toHaveBeenCalled();
      expect(mockUploadApi.initUploadSession).toHaveBeenCalled();
      expect(mockUploadApi.uploadNodes).toHaveBeenCalled();
      expect(mockUploadApi.completeUploadSession).toHaveBeenCalled();
    });

    it('should handle errors during vault upload', async () => {
      const mockScanner = {
        scan: jest.fn().mockRejectedValue(new Error('Scan failed'))
      };
      (VaultScanner as jest.Mock).mockImplementation(() => mockScanner);

      await expect(
        uploadService.uploadVault('workspace-123', '/vault')
      ).rejects.toThrow('Scan failed');
    });
  });
});
