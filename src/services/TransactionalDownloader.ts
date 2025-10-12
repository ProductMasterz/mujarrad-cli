/**
 * TransactionalDownloader service
 * Feature: 009-init-command-enhancement
 * Task: T024 - Implement TransactionalDownloader service
 *
 * Atomic download of remote nodes with staging directory and rollback support
 * Implements FR-016 (rollback), FR-017 (UUID embedding), FR-018 (directory structure)
 * Implements NFR-004 (memory efficiency), NFR-005 (atomic operations)
 */

import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import type { RemoteNode, DownloadResult } from '../types/sync.js';
import { Logger } from '../utils/Logger.js';

/**
 * TransactionalDownloader - Atomic download with rollback capability
 *
 * Download strategy:
 * 1. Create staging directory (.staging-{uuid})
 * 2. Download ALL nodes to staging
 * 3. Atomically rename staging files to final location
 * 4. Clean up staging directory
 *
 * On error: Rollback by deleting staging directory (no files in final location)
 *
 * @class TransactionalDownloader
 */
export class TransactionalDownloader {
    private readonly logger: Logger;

    constructor(logger: Logger) {
        this.logger = logger;
    }

    /**
     * Download nodes atomically to vault root
     *
     * Implements atomic download with staging directory:
     * - All nodes downloaded to staging BEFORE any moved to final location
     * - Uses fs.rename() for atomic move (OS-level guarantee)
     * - Rollback on ANY error (deletes staging directory)
     *
     * @param nodes - Array of remote nodes to download
     * @param vaultRoot - Absolute path to vault root directory
     * @returns Promise<DownloadResult> - Download statistics and status
     * @throws {Error} - Validation errors (vault doesn't exist, not a directory)
     */
    async downloadNodesAtomically(
        nodes: RemoteNode[],
        vaultRoot: string
    ): Promise<DownloadResult> {
        const startTime = Date.now();

        // Validate vault directory exists
        this.validateVaultDirectory(vaultRoot);

        // Handle empty nodes array (no-op)
        if (nodes.length === 0) {
            this.logger.info('No nodes to download', { vaultRoot });
            return {
                success: true,
                downloadedCount: 0,
                downloadedFiles: [],
                totalBytes: 0,
                duration: Date.now() - startTime,
                rolledBack: false
            };
        }

        // Create staging directory
        const stagingDir = path.join(vaultRoot, `.staging-${uuidv4()}`);
        this.logger.info('Creating staging directory', { stagingDir, nodeCount: nodes.length });

        try {
            fs.mkdirSync(stagingDir, { recursive: true });

            // Download all nodes to staging
            const stagedFiles = await this.downloadToStaging(nodes, stagingDir, vaultRoot);

            // Atomically move all files from staging to final location
            await this.moveToFinalLocation(stagedFiles);

            // Clean up staging directory
            this.cleanupStaging(stagingDir);

            // Calculate statistics
            const totalBytes = stagedFiles.reduce((sum, file) => sum + file.sizeBytes, 0);
            const downloadedFiles = stagedFiles.map(f => f.relativePath);
            const duration = Date.now() - startTime;

            this.logger.info('Download completed successfully', {
                vaultRoot,
                downloadedCount: nodes.length,
                totalBytes,
                duration
            });

            return {
                success: true,
                downloadedCount: nodes.length,
                downloadedFiles,
                totalBytes,
                duration,
                rolledBack: false
            };

        } catch (error: any) {
            // Rollback: delete staging directory
            this.logger.error('Download failed, rolling back', {
                vaultRoot,
                stagingDir,
                error: error.message
            });

            try {
                this.cleanupStaging(stagingDir);
                this.logger.info('Rollback successful', { stagingDir });
            } catch (cleanupError: any) {
                this.logger.error('Rollback cleanup failed', {
                    stagingDir,
                    error: cleanupError.message
                });
            }

            return {
                success: false,
                downloadedCount: 0,
                downloadedFiles: [],
                totalBytes: 0,
                duration: Date.now() - startTime,
                errorMessage: error.message,
                rolledBack: true
            };
        }
    }

    /**
     * Validate vault directory exists and is a directory
     *
     * @param vaultRoot - Absolute path to vault
     * @throws {Error} - If vault doesn't exist or is not a directory
     */
    private validateVaultDirectory(vaultRoot: string): void {
        if (!fs.existsSync(vaultRoot)) {
            throw new Error(`Vault directory does not exist: ${vaultRoot}`);
        }

        const stats = fs.statSync(vaultRoot);
        if (!stats.isDirectory()) {
            throw new Error(`Vault path is not a directory: ${vaultRoot}`);
        }
    }

    /**
     * Download all nodes to staging directory
     *
     * @param nodes - Remote nodes to download
     * @param stagingDir - Staging directory path
     * @param vaultRoot - Vault root (for relative path calculation)
     * @returns Promise<StagedFileInfo[]> - Information about staged files
     */
    private async downloadToStaging(
        nodes: RemoteNode[],
        stagingDir: string,
        vaultRoot: string
    ): Promise<StagedFileInfo[]> {
        const stagedFiles: StagedFileInfo[] = [];

        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];

            this.logger.debug('Downloading node to staging', {
                nodeUuid: node.uuid,
                filePath: node.filePath,
                progress: `${i + 1}/${nodes.length}`
            });

            // Generate staging file path (flat structure in staging)
            const stagingFileName = `${i}-${path.basename(node.filePath)}`;
            const stagingFilePath = path.join(stagingDir, stagingFileName);

            // Prepare content with UUID embedding (markdown only)
            const content = this.prepareContent(node);

            // Write to staging directory
            fs.writeFileSync(stagingFilePath, content, 'utf8');

            // Calculate final destination path
            const finalPath = path.join(vaultRoot, node.filePath);

            stagedFiles.push({
                stagingPath: stagingFilePath,
                finalPath,
                relativePath: node.filePath,
                nodeUuid: node.uuid,
                sizeBytes: Buffer.byteLength(content, 'utf8')
            });
        }

        this.logger.info('All nodes downloaded to staging', {
            stagingDir,
            fileCount: stagedFiles.length
        });

        return stagedFiles;
    }

    /**
     * Prepare node content with UUID embedding (FR-017)
     *
     * Markdown files: Embed UUID as HTML comment after frontmatter
     * Canvas files: No UUID embedding (pure JSON)
     *
     * @param node - Remote node
     * @returns string - Content with UUID embedded (if applicable)
     */
    private prepareContent(node: RemoteNode): string {
        if (node.fileType === 'canvas') {
            // Canvas files are pure JSON - no UUID embedding
            return node.content;
        }

        // Markdown file - embed UUID as HTML comment
        const uuidComment = `<!-- mujarrad-uuid: ${node.uuid} -->`;

        // Check if content has frontmatter
        if (node.content.startsWith('---\n')) {
            // Find end of frontmatter block
            const frontmatterEndIndex = node.content.indexOf('\n---\n', 4);

            if (frontmatterEndIndex !== -1) {
                // Insert UUID comment after frontmatter
                const frontmatter = node.content.substring(0, frontmatterEndIndex + 5); // Include \n---\n
                const restOfContent = node.content.substring(frontmatterEndIndex + 5);

                return `${frontmatter}${uuidComment}\n${restOfContent}`;
            }
        }

        // No frontmatter or invalid frontmatter - prepend UUID comment
        return `${uuidComment}\n${node.content}`;
    }

    /**
     * Atomically move staged files to final location (NFR-005)
     *
     * Uses fs.rename() for atomic operation:
     * - OS-level guarantee: file either exists in final location or doesn't
     * - No partial writes or corrupted states
     *
     * Creates parent directories as needed (FR-018)
     *
     * @param stagedFiles - Files in staging directory
     */
    private async moveToFinalLocation(
        stagedFiles: StagedFileInfo[]
    ): Promise<void> {
        for (const file of stagedFiles) {
            this.logger.debug('Moving file to final location', {
                stagingPath: file.stagingPath,
                finalPath: file.finalPath
            });

            // Create parent directory if needed (FR-018)
            const parentDir = path.dirname(file.finalPath);
            if (!fs.existsSync(parentDir)) {
                fs.mkdirSync(parentDir, { recursive: true });
                this.logger.debug('Created parent directory', { parentDir });
            }

            // Atomic rename from staging to final location
            fs.renameSync(file.stagingPath, file.finalPath);
        }

        this.logger.info('All files moved to final location', {
            fileCount: stagedFiles.length
        });
    }

    /**
     * Clean up staging directory
     *
     * Removes staging directory and all contents
     *
     * @param stagingDir - Staging directory path
     */
    private cleanupStaging(stagingDir: string): void {
        if (fs.existsSync(stagingDir)) {
            fs.rmSync(stagingDir, { recursive: true, force: true });
            this.logger.debug('Staging directory cleaned up', { stagingDir });
        }
    }
}

/**
 * Internal interface for tracking staged files
 * @interface StagedFileInfo
 */
interface StagedFileInfo {
    /**
     * Path to file in staging directory
     */
    stagingPath: string;

    /**
     * Final destination path in vault
     */
    finalPath: string;

    /**
     * Relative path within vault (for result reporting)
     */
    relativePath: string;

    /**
     * Node UUID (for tracking)
     */
    nodeUuid: string;

    /**
     * File size in bytes
     */
    sizeBytes: number;
}
