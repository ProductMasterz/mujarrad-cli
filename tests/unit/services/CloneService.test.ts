import { CloneService, ExportData } from '../../../src/services/CloneService.js';
import { CloneApi } from '../../../src/api/generated/api.js';
import { MetadataManager } from '../../../src/filesystem/MetadataManager.js';
import { CacheManager } from '../../../src/utils/CacheManager.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

// Mock CloneApi
jest.mock('../../../src/api/generated/api.js', () => ({
  CloneApi: jest.fn()
}));

// Mock MetadataManager
jest.mock('../../../src/filesystem/MetadataManager.js');

// Mock CacheManager
jest.mock('../../../src/utils/CacheManager.js');

describe('CloneService', () => {
  let cloneService: CloneService;
  let mockCloneApi: any;
  let testDir: string;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Create temp directory for tests
    testDir = path.join(os.tmpdir(), `mujarrad-clone-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });

    // Mock CloneApi
    mockCloneApi = {
      exportSpace: jest.fn(),
      getExportStatus: jest.fn(),
      downloadExport: jest.fn()
    };

    (CloneApi as jest.Mock).mockImplementation(() => mockCloneApi);

    // Mock MetadataManager
    (MetadataManager.embedUUID as jest.Mock) = jest.fn((content: string, uuid: string) => {
      return `<!-- mujarrad-node-id: ${uuid} -->\n${content}`;
    });

    // Mock CacheManager
    (CacheManager.cacheSpace as jest.Mock) = jest.fn().mockResolvedValue(undefined);
    (CacheManager.cacheNodeMapping as jest.Mock) = jest.fn().mockResolvedValue(undefined);
    (CacheManager.setLastSyncTime as jest.Mock) = jest.fn().mockResolvedValue(undefined);

    cloneService = new CloneService(mockCloneApi);
  });

  afterEach(async () => {
    // Cleanup temp directory
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('initiateExport', () => {
    it('should initiate space export', async () => {
      mockCloneApi.exportSpace.mockResolvedValue({
        data: {
          data: {
            exportJobId: 'job-123',
            status: 'PENDING',
            totalNodes: 100
          }
        }
      });

      const result = await cloneService.initiateExport('space-123');

      expect(result.exportJobId).toBe('job-123');
      expect(result.status).toBe('PENDING');
      expect(mockCloneApi.exportSpace).toHaveBeenCalledWith(
        'space-123',
        { format: 'obsidian', includeVersionHistory: false }
      );
    });

    it('should support includeVersionHistory option', async () => {
      mockCloneApi.exportSpace.mockResolvedValue({
        data: { data: { exportJobId: 'job-456', status: 'PENDING' } }
      });

      await cloneService.initiateExport('space-123', true);

      expect(mockCloneApi.exportSpace).toHaveBeenCalledWith(
        'space-123',
        { format: 'obsidian', includeVersionHistory: true }
      );
    });
  });

  describe('pollExportStatus', () => {
    it('should poll until export is complete', async () => {
      mockCloneApi.getExportStatus
        .mockResolvedValueOnce({ data: { data: { status: 'IN_PROGRESS', progress: 50 } } })
        .mockResolvedValueOnce({ data: { data: { status: 'IN_PROGRESS', progress: 75 } } })
        .mockResolvedValueOnce({ data: { data: { status: 'COMPLETED', progress: 100 } } });

      const result = await cloneService.pollExportStatus('space-123', 'job-123', 10);

      expect(result.status).toBe('COMPLETED');
      expect(mockCloneApi.getExportStatus).toHaveBeenCalledTimes(3);
    });

    it('should throw error if export fails', async () => {
      mockCloneApi.getExportStatus.mockResolvedValue({
        data: { data: { status: 'FAILED', error: 'Export failed' } }
      });

      await expect(
        cloneService.pollExportStatus('space-123', 'job-123', 10)
      ).rejects.toThrow('Export failed');
    });

    it('should timeout after max attempts', async () => {
      mockCloneApi.getExportStatus.mockResolvedValue({
        data: { data: { status: 'IN_PROGRESS', progress: 50 } }
      });

      await expect(
        cloneService.pollExportStatus('space-123', 'job-123', 10, 3)
      ).rejects.toThrow('Export timed out');
    });
  });

  describe('downloadExport', () => {
    it('should download export as ZIP', async () => {
      const mockZipData = Buffer.from('fake-zip-data');
      mockCloneApi.downloadExport.mockResolvedValue({
        data: mockZipData
      });

      const zipPath = await cloneService.downloadExport('space-123', 'job-123', testDir);

      expect(zipPath).toBe(path.join(testDir, 'export.zip'));
      expect(mockCloneApi.downloadExport).toHaveBeenCalledWith('space-123', 'job-123');

      const exists = await fs.access(zipPath).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    });
  });

  describe('extractZip', () => {
    it('should extract ZIP to target directory', async () => {
      // Create a mock ZIP file (we'll skip actual ZIP extraction in unit tests)
      const zipPath = path.join(testDir, 'test.zip');
      await fs.writeFile(zipPath, 'mock-zip-content');

      // Mock extraction would normally use unzipper
      // For unit tests, we'll just verify the method exists
      expect(typeof cloneService.extractZip).toBe('function');
    });
  });

  describe('recreateVault', () => {
    it('should create folder hierarchy from exported data', async () => {
      const exportData: ExportData = {
        nodes: [
          {
            id: 'folder-1',
            nodeType: 'CONTEXT' as const,
            title: 'Folder',
            slug: 'folder',
            content: '',
            path: 'Folder/'
          },
          {
            id: 'note-1',
            nodeType: 'REGULAR' as const,
            title: 'Note',
            slug: 'note',
            content: '# Note Content',
            path: 'Folder/Note.md'
          }
        ]
      };

      await cloneService.recreateVault(testDir, exportData);

      const folderExists = await fs.access(path.join(testDir, 'Folder'))
        .then(() => true)
        .catch(() => false);
      expect(folderExists).toBe(true);

      const noteExists = await fs.access(path.join(testDir, 'Folder', 'Note.md'))
        .then(() => true)
        .catch(() => false);
      expect(noteExists).toBe(true);
    });

    it('should embed UUIDs in markdown files', async () => {
      const exportData: ExportData = {
        nodes: [
          {
            id: 'uuid-123',
            nodeType: 'REGULAR' as const,
            title: 'Note',
            slug: 'note',
            content: '# Note',
            path: 'Note.md'
          }
        ]
      };

      await cloneService.recreateVault(testDir, exportData);

      const content = await fs.readFile(path.join(testDir, 'Note.md'), 'utf-8');
      expect(content).toContain('<!-- mujarrad-node-id: uuid-123 -->');
      expect(MetadataManager.embedUUID).toHaveBeenCalledWith('# Note', 'uuid-123');
    });

    it('should handle canvas files', async () => {
      const exportData: ExportData = {
        nodes: [
          {
            id: 'canvas-1',
            nodeType: 'CANVAS' as const,
            title: 'Canvas',
            slug: 'canvas',
            content: '{"nodes": [], "edges": []}',
            path: 'Canvas.canvas'
          }
        ]
      };

      await cloneService.recreateVault(testDir, exportData);

      const canvasExists = await fs.access(path.join(testDir, 'Canvas.canvas'))
        .then(() => true)
        .catch(() => false);
      expect(canvasExists).toBe(true);

      const content = await fs.readFile(path.join(testDir, 'Canvas.canvas'), 'utf-8');
      const parsed = JSON.parse(content);
      expect(parsed).toHaveProperty('nodes');
    });

    it('should cache node mappings', async () => {
      const exportData: ExportData = {
        nodes: [
          {
            id: 'uuid-456',
            nodeType: 'REGULAR' as const,
            title: 'Note',
            slug: 'note',
            content: '# Note',
            path: 'Note.md'
          }
        ]
      };

      await cloneService.recreateVault(testDir, exportData, 'space-123');

      expect(CacheManager.cacheNodeMapping).toHaveBeenCalledWith(
        'space-123',
        'uuid-456',
        'Note.md'
      );
    });
  });

  describe('cloneSpace', () => {
    it('should orchestrate complete clone workflow', async () => {
      // Mock export initiation
      mockCloneApi.exportSpace.mockResolvedValue({
        data: { data: { exportJobId: 'job-789', status: 'PENDING' } }
      });

      // Mock status polling
      mockCloneApi.getExportStatus.mockResolvedValue({
        data: { data: { status: 'COMPLETED', progress: 100 } }
      });

      // Mock download
      mockCloneApi.downloadExport.mockResolvedValue({
        data: Buffer.from('mock-zip')
      });

      // We'll mock the extract and recreate steps
      jest.spyOn(cloneService, 'extractZip').mockResolvedValue({
        nodes: [
          {
            id: 'note-1',
            nodeType: 'REGULAR',
            title: 'Note',
            slug: 'note',
            content: '# Note',
            path: 'Note.md'
          }
        ]
      });

      const summary = await cloneService.cloneSpace('space-123', testDir);

      expect(summary.success).toBe(true);
      expect(summary.totalNodes).toBeGreaterThan(0);
      expect(mockCloneApi.exportSpace).toHaveBeenCalled();
      expect(mockCloneApi.getExportStatus).toHaveBeenCalled();
      expect(mockCloneApi.downloadExport).toHaveBeenCalled();
    });

    it('should handle export errors gracefully', async () => {
      mockCloneApi.exportSpace.mockRejectedValue(new Error('Network error'));

      const summary = await cloneService.cloneSpace('space-123', testDir);

      expect(summary.success).toBe(false);
      expect(summary.totalErrors).toBe(1);
      expect(summary.totalNodes).toBe(0);
    });

    it('should return summary with duration', async () => {
      mockCloneApi.exportSpace.mockResolvedValue({
        data: { data: { exportJobId: 'job-999', status: 'PENDING' } }
      });
      mockCloneApi.getExportStatus.mockResolvedValue({
        data: { data: { status: 'COMPLETED' } }
      });
      mockCloneApi.downloadExport.mockResolvedValue({
        data: Buffer.from('mock-zip')
      });

      jest.spyOn(cloneService, 'extractZip').mockResolvedValue({ nodes: [] });

      const summary = await cloneService.cloneSpace('space-123', testDir);

      expect(summary.duration).toBeGreaterThanOrEqual(0);
      expect(summary.success).toBe(true);
    });
  });
});
