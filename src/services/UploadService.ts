import { UploadApi } from '../api/generated/api.js';
import { VaultScanner, FileInfo } from '../filesystem/VaultScanner.js';
import { MarkdownParser } from '../filesystem/MarkdownParser.js';
import { CanvasParser } from '../filesystem/CanvasParser.js';
import { MetadataManager } from '../filesystem/MetadataManager.js';
import { CacheManager } from '../utils/CacheManager.js';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Upload session information
 */
export interface UploadSession {
  /** Session ID from API */
  uploadSessionId: string;
  /** Recommended batch size from API */
  batchSize: number;
  /** Workspace ID */
  workspaceId?: string;
}

/**
 * Session initialization metadata
 */
export interface SessionInitMetadata {
  /** Total number of files to upload */
  totalFiles: number;
  /** Vault name (optional) */
  vaultName?: string;
  /** Vault path (optional) */
  vaultPath?: string;
}

/**
 * Node data for upload */
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
 * Batch upload result
 */
export interface BatchUploadResult {
  /** Successfully created nodes */
  created: Array<{ nodeId: string; slug?: string }>;
  /** Errors during upload */
  errors: Array<{ filePath?: string; error: string }>;
}

/**
 * Upload summary
 */
export interface UploadSummary {
  /** Whether upload succeeded */
  success: boolean;
  /** Total nodes created */
  totalNodesCreated: number;
  /** Total errors encountered */
  totalErrors?: number;
  /** Upload session ID */
  uploadSessionId?: string;
}

/**
 * UploadService orchestrates batch upload of vault content to Mujarrad
 *
 * Features:
 * - Initializes upload session via API
 * - Scans vault for .md and .canvas files
 * - Prepares node data with metadata extraction
 * - Splits files into batches for efficient upload
 * - Uploads batches sequentially with error handling
 * - Embeds UUIDs in local files after successful upload
 * - Caches node mappings for sync
 * - Finalizes session with summary
 *
 * Upload Flow:
 * 1. Scan vault → FileInfo[]
 * 2. Init session → UploadSession (with batch size)
 * 3. Prepare node data (parse markdown/canvas, extract metadata)
 * 4. Create batches (split by batch size)
 * 5. Upload batches sequentially
 * 6. Cache node mappings (UUID → file path)
 * 7. Finalize session → Summary
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
 * Implements FR-CLI-019: Progress tracking
 */
export class UploadService {
  constructor(private uploadApi: UploadApi) {}

  /**
   * Initialize upload session
   *
   * @param workspaceId - Target workspace ID
   * @param metadata - Session metadata (total files, vault info)
   * @returns Upload session with batch size
   */
  async initSession(workspaceId: string, metadata: SessionInitMetadata): Promise<UploadSession> {
    const response = await this.uploadApi.initUploadSession(workspaceId, metadata as any);

    return {
      uploadSessionId: response.data.uploadSessionId,
      batchSize: response.data.batchSize || 50,
      workspaceId: response.data.workspaceId || workspaceId
    };
  }

  /**
   * Create batches from file list
   *
   * @param files - Files to batch
   * @param batchSize - Size of each batch
   * @returns Array of batches
   */
  createBatches<T>(files: T[], batchSize: number): T[][] {
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
   * Upload a batch of nodes
   *
   * @param sessionId - Upload session ID
   * @param workspaceId - Workspace ID
   * @param batch - Batch of node data
   * @returns Upload result with created nodes and errors
   */
  async uploadBatch(
    sessionId: string,
    workspaceId: string,
    batch: NodeData[]
  ): Promise<BatchUploadResult> {
    const response = await this.uploadApi.uploadNodes(sessionId, workspaceId, {
      nodes: batch
    } as any);

    return {
      created: response.data.created || [],
      errors: response.data.errors || []
    };
  }

  /**
   * Finalize upload session
   *
   * @param sessionId - Upload session ID
   * @param workspaceId - Workspace ID
   * @returns Upload summary
   */
  async finalizeSession(sessionId: string, workspaceId: string): Promise<UploadSummary> {
    const response = await this.uploadApi.completeUploadSession(sessionId, workspaceId);

    return {
      success: response.data.success || false,
      totalNodesCreated: response.data.totalNodesCreated || 0,
      uploadSessionId: response.data.uploadSessionId
    };
  }

  /**
   * Prepare node data from file info
   *
   * Reads file content, parses markdown/canvas, extracts metadata
   *
   * @param fileInfo - File information
   * @param vaultPath - Vault root path
   * @returns Prepared node data
   */
  async prepareNodeData(fileInfo: FileInfo, vaultPath: string): Promise<NodeData> {
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

      // Use canvas name from frontmatter if embedded
      // (Some users add frontmatter to canvas JSON as comment)
    }

    // Generate slug from file path
    nodeData.slug = fileInfo.relativePath
      .replace(/\.(md|canvas)$/, '')
      .replace(/\//g, '-')
      .toLowerCase();

    return nodeData;
  }

  /**
   * Upload entire vault to workspace
   *
   * Orchestrates complete upload flow:
   * 1. Scan vault
   * 2. Init session
   * 3. Prepare node data
   * 4. Batch upload
   * 5. Cache mappings
   * 6. Finalize
   *
   * @param workspaceId - Target workspace ID
   * @param vaultPath - Vault root path
   * @returns Upload summary
   */
  async uploadVault(workspaceId: string, vaultPath: string): Promise<UploadSummary> {
    // Step 1: Scan vault
    const scanner = new VaultScanner(vaultPath);
    const files = await scanner.scan();

    // Step 2: Initialize session
    const session = await this.initSession(workspaceId, {
      totalFiles: files.length,
      vaultName: path.basename(vaultPath),
      vaultPath
    });

    // Step 3: Prepare node data for all files
    const nodeDataList: NodeData[] = [];
    for (const file of files) {
      const nodeData = await this.prepareNodeData(file, vaultPath);
      nodeDataList.push(nodeData);
    }

    // Step 4: Create batches
    const batches = this.createBatches(nodeDataList, session.batchSize);

    // Step 5: Upload batches sequentially
    let totalCreated = 0;
    let totalErrors = 0;
    const createdNodes: Array<{ nodeId: string; filePath: string }> = [];

    for (const batch of batches) {
      const result = await this.uploadBatch(session.uploadSessionId, workspaceId, batch);
      totalCreated += result.created.length;
      totalErrors += result.errors.length;

      // Track created nodes for cache mapping
      for (let i = 0; i < result.created.length; i++) {
        createdNodes.push({
          nodeId: result.created[i].nodeId,
          filePath: batch[i].filePath
        });
      }
    }

    // Step 6: Cache node mappings
    for (const node of createdNodes) {
      await CacheManager.cacheNodeMapping(workspaceId, node.nodeId, node.filePath);
    }

    // Update last sync time
    await CacheManager.setLastSyncTime(workspaceId, new Date().toISOString());

    // Step 7: Finalize session
    const summary = await this.finalizeSession(session.uploadSessionId, workspaceId);

    return {
      ...summary,
      totalErrors
    };
  }
}
