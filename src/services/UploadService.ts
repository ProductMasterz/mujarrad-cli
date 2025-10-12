import { UploadApi } from '../api/generated/api.js';
import { VaultScanner, FileInfo } from '../filesystem/VaultScanner.js';
import { MarkdownParser } from '../filesystem/MarkdownParser.js';
import { CanvasParser } from '../filesystem/CanvasParser.js';
import { MetadataManager } from '../filesystem/MetadataManager.js';
import { CacheManager } from '../utils/CacheManager.js';
import { Logger } from '../utils/Logger.js';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Upload session tracking
 */
export interface UploadSession {
  /** Session ID from first batch upload */
  sessionId: string;
  /** Workspace ID */
  workspaceId: string;
  /** Current batch number */
  currentBatch: number;
  /** Total files to upload */
  totalFiles: number;
}

/**
 * Node data prepared for upload
 */
export interface NodeData {
  /** Node type */
  nodeType: 'REGULAR' | 'CANVAS' | 'CONTEXT';
  /** Node title */
  title: string;
  /** Node slug (unique identifier) */
  slug?: string;
  /** Node content (markdown or JSON) */
  content: string;
  /** File path relative to vault */
  filePath: string;
  /** SHA-256 hash */
  hash?: string;
  /** Frontmatter data */
  frontmatter?: Record<string, any>;
  /** Wikilinks */
  wikilinks?: Array<{ target: string; alias: string | null }>;
  /** Visual properties (for canvas nodes) */
  visualProperties?: any;
  /** Existing UUID if present */
  existingUUID?: string;
}

/**
 * Upload summary result
 */
export interface UploadSummary {
  /** Whether upload succeeded */
  success: boolean;
  /** Total nodes uploaded */
  totalNodesCreated: number;
  /** Total errors encountered */
  totalErrors: number;
  /** Session ID for tracking */
  sessionId?: string;
  /** Upload duration in milliseconds */
  duration?: number;
}

/**
 * Batch upload result from API
 */
export interface BatchUploadResult {
  /** Session ID (returned on first batch) */
  sessionId?: string;
  /** Successfully created nodes */
  created: Array<{ nodeId: string; slug?: string; filePath?: string }>;
  /** Errors during upload */
  errors: Array<{ filePath?: string; error: string }>;
  /** Batch number processed */
  batchNumber?: number;
}

/**
 * UploadService orchestrates batch upload of vault content to Mujarrad
 *
 * Uses the actual generated UploadApi which provides:
 * - uploadBatch(): Upload files in batches (stateless, client manages session)
 * - getUploadStatus(): Poll for upload progress
 * - getUploadLog(): Retrieve detailed logs
 *
 * Upload Flow:
 * 1. Scan vault → FileInfo[]
 * 2. Prepare node data (parse markdown/canvas, extract metadata)
 * 3. Create batches (configurable size, default 50)
 * 4. Upload batches sequentially:
 *    - First batch creates session (no sessionId param)
 *    - Subsequent batches include sessionId
 * 5. Cache node mappings (UUID → file path)
 * 6. Return summary
 *
 * Usage:
 * ```typescript
 * const uploadService = new UploadService(uploadApi);
 * const summary = await uploadService.uploadVault('workspace-123', '/path/to/vault');
 * console.log(`Uploaded ${summary.totalNodesCreated} nodes`);
 * ```
 *
 * Follows Constitution Principle III: TDD approach
 * Implements FR-001 to FR-011: Upload workflow
 * Implements FR-CLI-016: Batch upload API
 */
export class UploadService {
  private defaultBatchSize = 50;
  private logger: Logger;

  constructor(private uploadApi: UploadApi, logger?: Logger) {
    this.logger = logger || new Logger({ logLevel: 'info' });
  }

  /**
   * Create batches from file list
   *
   * @param files - Files to batch
   * @param batchSize - Size of each batch (default 50)
   * @returns Array of batches
   */
  createBatches<T>(files: T[], batchSize: number = this.defaultBatchSize): T[][] {
    if (files.length === 0) {
      return [];
    }

    const batches: T[][] = [];
    for (let i = 0; i < files.length; i += batchSize) {
      batches.push(files.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Upload a batch of files
   *
   * @param workspaceId - Workspace ID
   * @param files - Files to upload (as File objects or compatible)
   * @param batchNumber - Batch sequence number
   * @param sessionId - Session ID (omit for first batch)
   * @param commitMessage - Optional git commit message
   * @returns Upload result with created nodes and errors
   */
  async uploadBatch(
    workspaceId: string,
    files: any[], // Use any to match generated API File type
    batchNumber: number,
    sessionId?: string,
    commitMessage?: string
  ): Promise<BatchUploadResult> {
    const startTime = Date.now();

    this.logger.debug('Uploading batch', {
      workspaceId,
      batchNumber,
      fileCount: files.length,
      sessionId,
      commitMessage
    });

    try {
      const response = await this.uploadApi.uploadBatch(
        workspaceId,
        files,
        batchNumber,
        sessionId,
        commitMessage
      );

      const duration = Date.now() - startTime;
      const result = {
        sessionId: (response.data as any).sessionId || sessionId,
        created: (response.data as any).created || [],
        errors: (response.data as any).errors || [],
        batchNumber
      };

      this.logger.info('Batch upload completed', {
        workspaceId,
        batchNumber,
        created: result.created.length,
        errors: result.errors.length,
        duration
      });

      return result;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      this.logger.error('Batch upload failed', {
        workspaceId,
        batchNumber,
        error: error.message,
        stack: error.stack,
        duration
      });
      throw error;
    }
  }

  /**
   * Get upload status
   *
   * @param workspaceId - Workspace ID
   * @param sessionId - Session ID
   * @returns Upload status information
   */
  async getUploadStatus(workspaceId: string, sessionId: string): Promise<any> {
    const response = await this.uploadApi.getUploadStatus(workspaceId, sessionId);
    return response.data;
  }

  /**
   * Get upload log
   *
   * @param workspaceId - Workspace ID
   * @param sessionId - Session ID
   * @returns Upload log entries
   */
  async getUploadLog(workspaceId: string, sessionId: string): Promise<any> {
    const response = await this.uploadApi.getUploadLog(workspaceId, sessionId);
    return response.data;
  }

  /**
   * Prepare node data from file info
   *
   * Reads file content, parses markdown/canvas, extracts metadata
   *
   * @param fileInfo - File information
   * @param _vaultPath - Vault root path (reserved for future use)
   * @returns Prepared node data
   */
  async prepareNodeData(fileInfo: FileInfo, _vaultPath: string): Promise<NodeData> {
    const content = await fs.readFile(fileInfo.absolutePath, 'utf-8');

    // Common fields
    const nodeData: NodeData = {
      nodeType: fileInfo.extension === '.canvas' ? 'CANVAS' : 'REGULAR',
      title: path.basename(fileInfo.relativePath, fileInfo.extension),
      content,
      filePath: fileInfo.relativePath,
      hash: fileInfo.hash
    };

    // Extract existing UUID if present
    if (fileInfo.extension === '.md') {
      const existingUUID = MetadataManager.extractUUID(content);
      if (existingUUID) {
        nodeData.existingUUID = existingUUID;
      }

      // Parse markdown for frontmatter and wikilinks
      const parser = new MarkdownParser(content);
      nodeData.frontmatter = parser.parseFrontmatter();
      nodeData.wikilinks = parser.extractWikilinks();

      // Use frontmatter title if available
      if (nodeData.frontmatter?.title) {
        nodeData.title = nodeData.frontmatter.title;
      }
    } else if (fileInfo.extension === '.canvas') {
      // Parse canvas for visual properties
      const canvasParser = new CanvasParser(content);
      const parsed = canvasParser.parse();
      nodeData.visualProperties = {
        nodes: parsed.nodes,
        edges: parsed.edges,
        config: parsed.config
      };
    }

    // Generate slug from file path
    nodeData.slug = fileInfo.relativePath
      .replace(/\.(md|canvas)$/, '')
      .replace(/\//g, '-')
      .toLowerCase();

    return nodeData;
  }

  /**
   * Convert NodeData to File-compatible format for API
   *
   * The generated API expects File objects. We create a compatible structure
   * that can be serialized for multipart/form-data upload.
   *
   * @param nodeData - Prepared node data
   * @returns File-compatible object
   */
  private nodeDataToFile(nodeData: NodeData): any {
    // Create File-compatible object for Node.js environment
    return {
      name: nodeData.filePath,
      size: Buffer.from(nodeData.content).length,
      type: nodeData.nodeType === 'CANVAS' ? 'application/json' : 'text/markdown',
      content: nodeData.content,
      // Include metadata as custom properties for backend processing
      metadata: {
        title: nodeData.title,
        slug: nodeData.slug,
        hash: nodeData.hash,
        nodeType: nodeData.nodeType,
        frontmatter: nodeData.frontmatter,
        wikilinks: nodeData.wikilinks,
        visualProperties: nodeData.visualProperties,
        existingUUID: nodeData.existingUUID
      }
    };
  }

  /**
   * Upload entire vault to workspace
   *
   * Orchestrates complete upload flow:
   * 1. Scan vault
   * 2. Prepare node data
   * 3. Batch upload (first batch creates session)
   * 4. Cache mappings
   * 5. Return summary
   *
   * @param workspaceId - Target workspace ID
   * @param vaultPath - Vault root path
   * @param batchSize - Batch size (default 50)
   * @returns Upload summary
   */
  async uploadVault(
    workspaceId: string,
    vaultPath: string,
    batchSize: number = this.defaultBatchSize
  ): Promise<UploadSummary> {
    const startTime = Date.now();

    this.logger.info('Starting vault upload', {
      workspaceId,
      vaultPath,
      batchSize
    });

    try {
      // Step 1: Scan vault
      this.logger.debug('Scanning vault', { vaultPath });
      const scanner = new VaultScanner(vaultPath);
      const files = await scanner.scan();
      this.logger.info('Vault scan completed', { fileCount: files.length });

      if (files.length === 0) {
        this.logger.warn('No files found in vault', { vaultPath });
        return {
          success: true,
          totalNodesCreated: 0,
          totalErrors: 0,
          duration: Date.now() - startTime
        };
      }

      // Step 2: Prepare node data for all files
      this.logger.debug('Preparing node data', { fileCount: files.length });
      const nodeDataList: NodeData[] = [];
      for (const file of files) {
        const nodeData = await this.prepareNodeData(file, vaultPath);
        nodeDataList.push(nodeData);
      }
      this.logger.info('Node data prepared', { nodeCount: nodeDataList.length });

      // Step 3: Create batches
      const batches = this.createBatches(nodeDataList, batchSize);
      this.logger.info('Created batches', { batchCount: batches.length, batchSize });

      // Step 4: Upload batches sequentially
      let sessionId: string | undefined;
      let totalCreated = 0;
      let totalErrors = 0;
      const createdNodes: Array<{ nodeId: string; filePath: string }> = [];

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      const batchNumber = i + 1;

      // Convert node data to File-compatible format
      const filesForUpload = batch.map(nd => this.nodeDataToFile(nd));

      // Upload batch (first batch creates session)
      const result = await this.uploadBatch(
        workspaceId,
        filesForUpload,
        batchNumber,
        sessionId,
        `Batch ${batchNumber}/${batches.length}: ${batch.length} files`
      );

      // Store session ID from first batch
      if (!sessionId && result.sessionId) {
        sessionId = result.sessionId;
      }

      totalCreated += result.created.length;
      totalErrors += result.errors.length;

      // Track created nodes for cache mapping
      for (let j = 0; j < result.created.length; j++) {
        const createdNode = result.created[j];
        const originalNode = batch[j];
        createdNodes.push({
          nodeId: createdNode.nodeId,
          filePath: originalNode.filePath
        });
      }
    }

      // Step 5: Cache node mappings
      this.logger.debug('Caching node mappings', { nodeCount: createdNodes.length });
      for (const node of createdNodes) {
        await CacheManager.cacheNodeMapping(workspaceId, node.nodeId, node.filePath);
      }

      // Update last sync time
      await CacheManager.setLastSyncTime(workspaceId, new Date().toISOString());

      const duration = Date.now() - startTime;
      const summary = {
        success: totalErrors === 0,
        totalNodesCreated: totalCreated,
        totalErrors,
        sessionId,
        duration
      };

      // Step 6: Return summary
      this.logger.info('Vault upload completed', {
        workspaceId,
        ...summary
      });

      return summary;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      this.logger.error('Vault upload failed', {
        workspaceId,
        vaultPath,
        error: error.message,
        stack: error.stack,
        duration
      });
      throw error;
    }
  }
}
