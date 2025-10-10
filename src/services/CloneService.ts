import { CloneApi } from '../api/generated/api.js';
import { MetadataManager } from '../filesystem/MetadataManager.js';
import { CacheManager } from '../utils/CacheManager.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import unzipper from 'unzipper';

/**
 * Export job status from API
 */
export interface ExportStatus {
  /** Export job ID */
  exportJobId: string;
  /** Current status */
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  /** Progress percentage (0-100) */
  progress?: number;
  /** Total nodes to export */
  totalNodes?: number;
  /** Error message if failed */
  error?: string;
}

/**
 * Node data from exported workspace
 */
export interface ExportedNode {
  /** Node UUID */
  id: string;
  /** Node type */
  nodeType: 'REGULAR' | 'CANVAS' | 'CONTEXT';
  /** Node title */
  title: string;
  /** Node slug */
  slug: string;
  /** Node content (markdown or JSON) */
  content: string;
  /** File path relative to vault root */
  path: string;
}

/**
 * Exported workspace data structure
 */
export interface ExportData {
  /** All nodes in workspace */
  nodes: ExportedNode[];
}

/**
 * Clone summary result
 */
export interface CloneSummary {
  /** Whether clone succeeded */
  success: boolean;
  /** Total nodes cloned */
  totalNodes: number;
  /** Total errors encountered */
  totalErrors: number;
  /** Clone duration in milliseconds */
  duration: number;
  /** Export job ID */
  exportJobId?: string;
}

/**
 * CloneService handles workspace export and local vault recreation
 *
 * Workflow:
 * 1. Initiate export via CloneApi.exportWorkspace()
 * 2. Poll export status via CloneApi.getExportStatus()
 * 3. Download exported ZIP via CloneApi.downloadExport()
 * 4. Extract ZIP to target directory
 * 5. Recreate vault structure with UUIDs embedded
 * 6. Cache node mappings
 *
 * Usage:
 * ```typescript
 * const cloneService = new CloneService(cloneApi);
 * const summary = await cloneService.cloneWorkspace('workspace-123', '/path/to/vault');
 * console.log(`Cloned ${summary.totalNodes} nodes`);
 * ```
 *
 * Follows Constitution Principle III: TDD approach
 * Implements FR-018 to FR-024: Clone workflow
 */
export class CloneService {
  private defaultPollInterval = 1000; // 1 second
  private defaultMaxAttempts = 180; // 3 minutes max

  constructor(private cloneApi: CloneApi) {}

  /**
   * Initiate workspace export
   *
   * @param workspaceId - Workspace ID
   * @param includeGitHistory - Include Git history in export
   * @returns Export status with job ID
   */
  async initiateExport(workspaceId: string, includeVersionHistory: boolean = false): Promise<ExportStatus> {
    const response = await this.cloneApi.exportWorkspace(workspaceId, {
      format: 'obsidian',
      includeVersionHistory
    });

    const data = (response.data as any).data;
    return {
      exportJobId: data.exportJobId,
      status: data.status,
      progress: data.progress,
      totalNodes: data.totalNodes
    };
  }

  /**
   * Poll export status until complete or failed
   *
   * @param workspaceId - Workspace ID
   * @param exportJobId - Export job ID
   * @param pollInterval - Poll interval in milliseconds (default 1000)
   * @param maxAttempts - Maximum poll attempts (default 180)
   * @returns Final export status
   */
  async pollExportStatus(
    workspaceId: string,
    exportJobId: string,
    pollInterval: number = this.defaultPollInterval,
    maxAttempts: number = this.defaultMaxAttempts
  ): Promise<ExportStatus> {
    let attempts = 0;

    while (attempts < maxAttempts) {
      const response = await this.cloneApi.getExportStatus(workspaceId, exportJobId);
      const responseData = (response.data as any).data;
      const status: ExportStatus = {
        exportJobId,
        status: responseData.status,
        progress: responseData.progress,
        totalNodes: responseData.totalNodes,
        error: responseData.error
      };

      if (status.status === 'COMPLETED') {
        return status;
      }

      if (status.status === 'FAILED') {
        throw new Error(status.error || 'Export failed');
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, pollInterval));
      attempts++;
    }

    throw new Error('Export timed out after maximum attempts');
  }

  /**
   * Download exported ZIP file
   *
   * @param workspaceId - Workspace ID
   * @param exportJobId - Export job ID
   * @param targetDir - Target directory to save ZIP
   * @returns Path to downloaded ZIP file
   */
  async downloadExport(workspaceId: string, exportJobId: string, targetDir: string): Promise<string> {
    const response = await this.cloneApi.downloadExport(workspaceId, exportJobId);
    const zipPath = path.join(targetDir, 'export.zip');

    // Ensure directory exists
    await fs.mkdir(targetDir, { recursive: true });

    // Write ZIP data to file (response.data is a File or Blob in browser, Buffer in Node)
    const data = response.data as any;
    if (data instanceof Buffer) {
      await fs.writeFile(zipPath, data);
    } else if (data.arrayBuffer) {
      // File/Blob object - convert to Buffer
      const arrayBuffer = await data.arrayBuffer();
      await fs.writeFile(zipPath, Buffer.from(arrayBuffer));
    } else {
      // Fallback: treat as Buffer
      await fs.writeFile(zipPath, Buffer.from(data));
    }

    return zipPath;
  }

  /**
   * Extract ZIP file to target directory
   *
   * @param zipPath - Path to ZIP file
   * @param targetDir - Target directory for extraction
   * @returns Exported data structure
   */
  async extractZip(zipPath: string, targetDir: string): Promise<ExportData> {
    // Ensure target directory exists
    await fs.mkdir(targetDir, { recursive: true });

    // Extract ZIP using unzipper
    const directory = await unzipper.Open.file(zipPath);
    await directory.extract({ path: targetDir });

    // Read mappings.json to get node data
    const mappingsPath = path.join(targetDir, '.mujarrad', 'mappings.json');
    const mappingsContent = await fs.readFile(mappingsPath, 'utf-8');
    const exportData: ExportData = JSON.parse(mappingsContent);

    return exportData;
  }

  /**
   * Recreate vault structure from exported data
   *
   * Creates folders, generates markdown files with UUIDs, handles canvas files
   *
   * @param targetDir - Target vault directory
   * @param exportData - Exported workspace data
   * @param workspaceSlug - Optional workspace slug for caching
   */
  async recreateVault(targetDir: string, exportData: ExportData, workspaceSlug?: string): Promise<void> {
    // Ensure target directory exists
    await fs.mkdir(targetDir, { recursive: true });

    // Process nodes
    for (const node of exportData.nodes) {
      const filePath = path.join(targetDir, node.path);

      // Create parent directory if needed
      const dir = path.dirname(filePath);
      await fs.mkdir(dir, { recursive: true });

      // Handle different node types
      if (node.nodeType === 'CONTEXT') {
        // CONTEXT nodes are folders, already created by mkdir above
        continue;
      } else if (node.nodeType === 'CANVAS') {
        // Canvas files: write JSON directly
        await fs.writeFile(filePath, node.content, 'utf-8');
      } else {
        // Regular markdown: embed UUID
        const contentWithUUID = MetadataManager.embedUUID(node.content, node.id);
        await fs.writeFile(filePath, contentWithUUID, 'utf-8');
      }

      // Cache node mapping if workspace slug provided
      if (workspaceSlug) {
        await CacheManager.cacheNodeMapping(workspaceSlug, node.id, node.path);
      }
    }

    // Update last sync time
    if (workspaceSlug) {
      await CacheManager.setLastSyncTime(workspaceSlug, new Date().toISOString());
    }
  }

  /**
   * Clone entire workspace to local vault
   *
   * Orchestrates complete clone workflow:
   * 1. Initiate export
   * 2. Poll until complete
   * 3. Download ZIP
   * 4. Extract and recreate vault
   * 5. Cache mappings
   *
   * @param workspaceSlug - Workspace slug
   * @param targetPath - Target vault path
   * @param includeGitHistory - Include Git history
   * @returns Clone summary
   */
  async cloneWorkspace(
    workspaceSlug: string,
    targetPath: string,
    includeVersionHistory: boolean = false
  ): Promise<CloneSummary> {
    const startTime = Date.now();

    try {
      // Step 1: Initiate export
      const exportStatus = await this.initiateExport(workspaceSlug, includeVersionHistory);

      // Step 2: Poll until complete
      await this.pollExportStatus(workspaceSlug, exportStatus.exportJobId);

      // Step 3: Download ZIP
      const zipPath = await this.downloadExport(workspaceSlug, exportStatus.exportJobId, targetPath);

      // Step 4: Extract ZIP
      const exportData = await this.extractZip(zipPath, targetPath);

      // Step 5: Recreate vault
      await this.recreateVault(targetPath, exportData, workspaceSlug);

      // Cleanup: Remove ZIP file
      await fs.unlink(zipPath).catch(() => {
        // Ignore cleanup errors
      });

      return {
        success: true,
        totalNodes: exportData.nodes.length,
        totalErrors: 0,
        duration: Date.now() - startTime,
        exportJobId: exportStatus.exportJobId
      };
    } catch (error: any) {
      return {
        success: false,
        totalNodes: 0,
        totalErrors: 1,
        duration: Date.now() - startTime
      };
    }
  }
}
