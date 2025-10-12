/**
 * RemoteNodeFetcher service
 * Feature: 009-init-command-enhancement
 * Task: T023 - Create RemoteNode fetcher utility
 *
 * Async generator function for memory-efficient streaming of remote nodes
 * using cursor-based pagination (FR-007, NFR-004)
 */

import type { SyncWorkspacesApi } from '../api/generated/index.js';
import type { RemoteNode } from '../types/sync.js';
import { Logger } from '../utils/Logger.js';

/**
 * RemoteNodeFetcher - Streams remote nodes from workspace with pagination
 *
 * Uses async generator pattern for memory efficiency (NFR-004):
 * - Yields nodes one-by-one instead of loading all into memory
 * - Fetches next page only when current page is consumed
 * - Supports 10,000+ node workspaces without memory issues
 *
 * @class RemoteNodeFetcher
 */
export class RemoteNodeFetcher {
    private readonly workspaceApi: SyncWorkspacesApi;
    private readonly logger: Logger;
    private readonly pageSize: number;

    /**
     * Create RemoteNodeFetcher instance
     *
     * @param workspaceApi - API client for workspace operations
     * @param logger - Logger instance for tracking pagination
     * @param pageSize - Number of nodes per page (default 100, max 500)
     */
    constructor(workspaceApi: SyncWorkspacesApi, logger: Logger, pageSize: number = 100) {
        this.workspaceApi = workspaceApi;
        this.logger = logger;
        this.pageSize = Math.min(Math.max(pageSize, 1), 500); // Clamp between 1-500
    }

    /**
     * Fetch all nodes from workspace using cursor-based pagination
     *
     * Async generator that yields nodes one-by-one for memory efficiency.
     * Implements cursor-based pagination as specified in backend API contract.
     *
     * Usage:
     * ```typescript
     * const fetcher = new RemoteNodeFetcher(workspaceApi, logger);
     * for await (const node of fetcher.fetchAllNodes('my-workspace')) {
     *     console.log(`Processing node: ${node.title}`);
     *     // Process node immediately without buffering
     * }
     * ```
     *
     * @param workspaceSlug - Workspace identifier
     * @yields {RemoteNode} - Individual nodes from workspace
     * @throws {Error} - Network errors, API errors (401, 403, 404, 500)
     */
    async *fetchAllNodes(workspaceSlug: string): AsyncGenerator<RemoteNode, void, undefined> {
        let cursor: string | undefined = undefined;
        let hasMore = true;
        let pageNumber = 1;
        let totalNodesFetched = 0;

        this.logger.info('Starting remote node fetch', {
            workspaceSlug,
            pageSize: this.pageSize
        });

        try {
            while (hasMore) {
                this.logger.debug('Fetching page', {
                    workspaceSlug,
                    pageNumber,
                    cursor: cursor || 'initial',
                    pageSize: this.pageSize
                });

                // Fetch page from API
                const response = await this.workspaceApi.listWorkspaceNodes(
                    workspaceSlug,
                    cursor,
                    this.pageSize
                );

                const { data: nodes, pagination } = response.data;

                this.logger.debug('Page fetched successfully', {
                    workspaceSlug,
                    pageNumber,
                    nodesInPage: nodes.length,
                    hasMore: pagination.hasMore,
                    totalFetchedSoFar: totalNodesFetched + nodes.length
                });

                // Yield each node individually (memory-efficient streaming)
                for (const node of nodes) {
                    totalNodesFetched++;

                    this.logger.debug('Yielding node', {
                        nodeUuid: node.uuid,
                        filePath: node.filePath,
                        nodeNumber: totalNodesFetched
                    });

                    yield node;
                }

                // Update pagination state
                hasMore = pagination.hasMore;
                cursor = pagination.nextCursor ?? undefined;
                pageNumber++;

                // Safety check: prevent infinite loop if backend returns hasMore=true but no cursor
                if (hasMore && !cursor) {
                    this.logger.warn('Pagination inconsistency detected', {
                        workspaceSlug,
                        pageNumber,
                        message: 'hasMore is true but nextCursor is null - stopping pagination'
                    });
                    break;
                }
            }

            this.logger.info('Remote node fetch completed', {
                workspaceSlug,
                totalNodesFetched,
                totalPages: pageNumber - 1
            });

        } catch (error: any) {
            // Log error and re-throw with context
            this.logger.error('Remote node fetch failed', {
                workspaceSlug,
                pageNumber,
                totalNodesFetched,
                error: error.message,
                stack: error.stack
            });

            // Enhance error with context
            if (error.response) {
                const status = error.response.status;
                const errorData = error.response.data;

                if (status === 404) {
                    throw new Error(`Workspace '${workspaceSlug}' not found`);
                } else if (status === 403) {
                    throw new Error(`Access denied to workspace '${workspaceSlug}'. You may not have read permissions.`);
                } else if (status === 401) {
                    throw new Error('Authentication required. Please log in with "mujarrad auth login"');
                } else if (status >= 500) {
                    throw new Error(`Server error occurred while fetching nodes: ${errorData?.error || 'Internal server error'}`);
                }
            } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
                throw new Error('Network error: Cannot connect to Mujarrad server. Check your internet connection.');
            } else if (error.code === 'ETIMEDOUT') {
                throw new Error('Network timeout: Request took too long. Please try again.');
            }

            // Re-throw original error if not handled above
            throw error;
        }
    }

    /**
     * Fetch all nodes and collect into array (for non-streaming use cases)
     *
     * WARNING: This loads all nodes into memory. Use fetchAllNodes() generator
     * for large workspaces (10,000+ nodes) to avoid memory issues.
     *
     * @param workspaceSlug - Workspace identifier
     * @returns Promise<RemoteNode[]> - Array of all nodes
     */
    async fetchAllNodesAsArray(workspaceSlug: string): Promise<RemoteNode[]> {
        const nodes: RemoteNode[] = [];

        this.logger.warn('Fetching all nodes as array', {
            workspaceSlug,
            message: 'This loads all nodes into memory. Consider using generator for large workspaces.'
        });

        for await (const node of this.fetchAllNodes(workspaceSlug)) {
            nodes.push(node);
        }

        return nodes;
    }

    /**
     * Count total nodes in workspace without downloading content
     *
     * Uses pagination metadata to determine total count efficiently.
     * Fetches first page only to get metadata, then stops.
     *
     * @param workspaceSlug - Workspace identifier
     * @returns Promise<number> - Total number of nodes
     */
    async countNodes(workspaceSlug: string): Promise<number> {
        try {
            // Fetch first page with minimal page size
            const response = await this.workspaceApi.listWorkspaceNodes(
                workspaceSlug,
                undefined, // No cursor (first page)
                1 // Minimal page size for counting
            );

            const { data: nodes, pagination } = response.data;

            // If no pagination, count is just the nodes returned
            if (!pagination.hasMore) {
                return nodes.length;
            }

            // For large workspaces, we need to paginate to count
            // Alternative: backend could provide totalCount in pagination metadata
            // For now, fall back to counting via iteration
            let count = nodes.length;
            let cursor: string | null = pagination.nextCursor;

            while (cursor) {
                const pageResponse = await this.workspaceApi.listWorkspaceNodes(
                    workspaceSlug,
                    cursor,
                    500 // Use max page size for faster counting
                );

                count += pageResponse.data.data.length;
                cursor = pageResponse.data.pagination.nextCursor;

                if (!pageResponse.data.pagination.hasMore) {
                    break;
                }
            }

            return count;

        } catch (error: any) {
            this.logger.error('Failed to count nodes', {
                workspaceSlug,
                error: error.message
            });
            throw error;
        }
    }
}
