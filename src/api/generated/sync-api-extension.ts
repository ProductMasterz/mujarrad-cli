/* tslint:disable */
/* eslint-disable */
/**
 * Mujarrad Backend API - Init Command Enhancement Endpoints
 *
 * This file extends the generated API client with endpoints required for
 * the enhanced `mujarrad init` command with bidirectional synchronization.
 *
 * **Feature**: 009-init-command-enhancement
 * **Generated from**: specs/009-init-command-enhancement/contracts/backend-api.yaml
 *
 * NOTE: This is a manual extension because OpenAPI generator requires Java/Docker.
 * When generator infrastructure is available, regenerate the entire API client.
 */

import type { AxiosPromise, AxiosInstance, RawAxiosRequestConfig } from 'axios';
import globalAxios from 'axios';
import { BASE_PATH, BaseAPI, type RequestArgs } from './base.js';
import { DUMMY_BASE_URL, assertParamExists, setBearerAuthToObject, setSearchParams, toPathString } from './common.js';
import type { Configuration } from './configuration.js';

/**
 * Workspace metadata for pre-flight verification
 * @export
 * @interface WorkspaceMetadata
 */
export interface WorkspaceMetadata {
    /**
     * URL-safe workspace identifier
     * @type {string}
     * @memberof WorkspaceMetadata
     */
    slug: string;
    /**
     * Human-readable workspace name
     * @type {string}
     * @memberof WorkspaceMetadata
     */
    name: string;
    /**
     * Username of workspace owner
     * @type {string}
     * @memberof WorkspaceMetadata
     */
    owner: string;
    /**
     * Total number of nodes in workspace
     * @type {number}
     * @memberof WorkspaceMetadata
     */
    nodeCount: number;
    /**
     * User permissions for this workspace
     * @type {UserPermissions}
     * @memberof WorkspaceMetadata
     */
    userPermissions: UserPermissions;
    /**
     * ISO 8601 timestamp of workspace creation
     * @type {string}
     * @memberof WorkspaceMetadata
     */
    createdAt: string;
    /**
     * ISO 8601 timestamp of last content modification
     * @type {string}
     * @memberof WorkspaceMetadata
     */
    lastModified: string;
}

/**
 * User permissions for workspace operations
 * @export
 * @interface UserPermissions
 */
export interface UserPermissions {
    /**
     * User can view workspace content
     * @type {boolean}
     * @memberof UserPermissions
     */
    canRead: boolean;
    /**
     * User can create/modify nodes (REQUIRED for init operation)
     * @type {boolean}
     * @memberof UserPermissions
     */
    canWrite: boolean;
    /**
     * User can delete nodes
     * @type {boolean}
     * @memberof UserPermissions
     */
    canDelete: boolean;
    /**
     * User can invite others to workspace
     * @type {boolean}
     * @memberof UserPermissions
     */
    canShare: boolean;
}

/**
 * Remote node representation
 * @export
 * @interface RemoteNode
 */
export interface RemoteNode {
    /**
     * Unique node identifier (UUID v4)
     * @type {string}
     * @memberof RemoteNode
     */
    uuid: string;
    /**
     * Node title (filename without extension)
     * @type {string}
     * @memberof RemoteNode
     */
    title: string;
    /**
     * Full markdown or canvas JSON content
     * @type {string}
     * @memberof RemoteNode
     */
    content: string;
    /**
     * Relative path within vault (forward slashes, no leading slash)
     * @type {string}
     * @memberof RemoteNode
     */
    filePath: string;
    /**
     * SHA-256 hash of content (lowercase hex)
     * @type {string}
     * @memberof RemoteNode
     */
    hash: string;
    /**
     * ISO 8601 timestamp of last modification
     * @type {string}
     * @memberof RemoteNode
     */
    lastModified: string;
    /**
     * SHA-256 hash of common ancestor (null if no local version exists or no ancestor found)
     * @type {string | null}
     * @memberof RemoteNode
     */
    ancestorHash: string | null;
    /**
     * File type for correct extension
     * @type {string}
     * @memberof RemoteNode
     */
    fileType: 'markdown' | 'canvas';
    /**
     * Optional metadata extracted from content
     * @type {NodeMetadata}
     * @memberof RemoteNode
     */
    metadata?: NodeMetadata;
}

/**
 * Optional node metadata
 * @export
 * @interface NodeMetadata
 */
export interface NodeMetadata {
    /**
     * Extracted tags from content
     * @type {Array<string>}
     * @memberof NodeMetadata
     */
    tags?: Array<string>;
    /**
     * YAML frontmatter if present
     * @type {Record<string, any>}
     * @memberof NodeMetadata
     */
    frontmatter?: Record<string, any>;
}

/**
 * Paginated response for listing workspace nodes
 * @export
 * @interface PaginatedNodesResponse
 */
export interface PaginatedNodesResponse {
    /**
     * Array of nodes for current page
     * @type {Array<RemoteNode>}
     * @memberof PaginatedNodesResponse
     */
    data: Array<RemoteNode>;
    /**
     * Pagination metadata
     * @type {PaginationInfo}
     * @memberof PaginatedNodesResponse
     */
    pagination: PaginationInfo;
}

/**
 * Pagination information
 * @export
 * @interface PaginationInfo
 */
export interface PaginationInfo {
    /**
     * Opaque cursor for next page (null if no more pages)
     * @type {string | null}
     * @memberof PaginationInfo
     */
    nextCursor: string | null;
    /**
     * Whether more pages exist
     * @type {boolean}
     * @memberof PaginationInfo
     */
    hasMore: boolean;
}

/**
 * Version comparison response for divergence detection
 * @export
 * @interface VersionComparisonResponse
 */
export interface VersionComparisonResponse {
    /**
     * Node being compared
     * @type {string}
     * @memberof VersionComparisonResponse
     */
    nodeUuid: string;
    /**
     * Current remote version hash
     * @type {string}
     * @memberof VersionComparisonResponse
     */
    remoteHash: string;
    /**
     * Local version hash (from query parameter)
     * @type {string}
     * @memberof VersionComparisonResponse
     */
    localHash: string;
    /**
     * Common ancestor hash (null if no ancestor found)
     * @type {string | null}
     * @memberof VersionComparisonResponse
     */
    ancestorHash: string | null;
    /**
     * Divergence analysis result
     * @type {DivergenceAnalysis}
     * @memberof VersionComparisonResponse
     */
    divergenceAnalysis: DivergenceAnalysis;
}

/**
 * Divergence analysis result
 * @export
 * @interface DivergenceAnalysis
 */
export interface DivergenceAnalysis {
    /**
     * Classification result
     * @type {string}
     * @memberof DivergenceAnalysis
     */
    status: 'IDENTICAL' | 'LOCAL_AHEAD' | 'REMOTE_AHEAD' | 'CONFLICTED';
    /**
     * Whether local version differs from ancestor
     * @type {boolean}
     * @memberof DivergenceAnalysis
     */
    localModified: boolean;
    /**
     * Whether remote version differs from ancestor
     * @type {boolean}
     * @memberof DivergenceAnalysis
     */
    remoteModified: boolean;
    /**
     * Human-readable explanation of classification
     * @type {string}
     * @memberof DivergenceAnalysis
     */
    explanation: string;
}

/**
 * Error response from API
 * @export
 * @interface ApiErrorResponse
 */
export interface ApiErrorResponse {
    /**
     * Human-readable error message
     * @type {string}
     * @memberof ApiErrorResponse
     */
    error: string;
    /**
     * Machine-readable error code
     * @type {string}
     * @memberof ApiErrorResponse
     */
    code: string;
    /**
     * ISO 8601 timestamp of error
     * @type {string}
     * @memberof ApiErrorResponse
     */
    timestamp: string;
    /**
     * Optional additional error context
     * @type {Record<string, any>}
     * @memberof ApiErrorResponse
     */
    details?: Record<string, any>;
}

/**
 * SyncWorkspacesApi - API class for sync endpoints
 * @export
 * @class SyncWorkspacesApi
 * @extends {BaseAPI}
 */
export class SyncWorkspacesApi extends BaseAPI {
    /**
     * Get workspace metadata for pre-flight verification
     * @summary Get workspace metadata
     * @param {string} slug URL-safe workspace identifier
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     * @memberof SyncWorkspacesApi
     */
    public getWorkspaceMetadata(slug: string, options?: RawAxiosRequestConfig): AxiosPromise<WorkspaceMetadata> {
        return SyncWorkspacesApiFp(this.configuration).getWorkspaceMetadata(slug, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * List all workspace nodes with cursor-based pagination
     * @summary List all workspace nodes with pagination
     * @param {string} slug Workspace identifier
     * @param {string} [cursor] Opaque pagination cursor from previous response
     * @param {number} [limit] Number of nodes per page (default 100, max 500)
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     * @memberof SyncWorkspacesApi
     */
    public listWorkspaceNodes(slug: string, cursor?: string, limit?: number, options?: RawAxiosRequestConfig): AxiosPromise<PaginatedNodesResponse> {
        return SyncWorkspacesApiFp(this.configuration).listWorkspaceNodes(slug, cursor, limit, options).then((request) => request(this.axios, this.basePath));
    }
}

/**
 * SyncNodesApi - API class for node sync endpoints
 * @export
 * @class SyncNodesApi
 * @extends {BaseAPI}
 */
export class SyncNodesApi extends BaseAPI {
    /**
     * Compare node versions for divergence detection
     * @summary Compare node versions for divergence detection
     * @param {string} uuid Node UUID (must exist in workspace user has access to)
     * @param {string} localHash SHA-256 hash of local file content (lowercase hex)
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     * @memberof SyncNodesApi
     */
    public compareNodeVersions(uuid: string, localHash: string, options?: RawAxiosRequestConfig): AxiosPromise<VersionComparisonResponse> {
        return SyncNodesApiFp(this.configuration).compareNodeVersions(uuid, localHash, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * Download individual node content
     * @summary Download individual node content
     * @param {string} uuid Node UUID
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     * @memberof SyncNodesApi
     */
    public downloadNodeContent(uuid: string, options?: RawAxiosRequestConfig): AxiosPromise<string> {
        return SyncNodesApiFp(this.configuration).downloadNodeContent(uuid, options).then((request) => request(this.axios, this.basePath));
    }
}

/**
 * SyncWorkspacesApiAxiosParamCreator - parameter creator
 * @export
 */
export const SyncWorkspacesApiAxiosParamCreator = function (configuration?: Configuration) {
    return {
        /**
         * Get workspace metadata
         * @param {string} slug
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        getWorkspaceMetadata: async (slug: string, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'slug' is not null or undefined
            assertParamExists('getWorkspaceMetadata', 'slug', slug);
            const localVarPath = `/api/workspaces/{slug}`
                .replace(`{${"slug"}}`, encodeURIComponent(String(slug)));
            const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
            let baseOptions;
            if (configuration) {
                baseOptions = configuration.baseOptions;
            }
            const localVarRequestOptions = { method: 'GET', ...baseOptions, ...options};
            const localVarHeaderParameter = {} as any;
            const localVarQueryParameter = {} as any;

            // authentication bearerAuth required
            await setBearerAuthToObject(localVarHeaderParameter, configuration);

            setSearchParams(localVarUrlObj, localVarQueryParameter);
            let headersFromBaseOptions = baseOptions && baseOptions.headers ? baseOptions.headers : {};
            localVarRequestOptions.headers = {...localVarHeaderParameter, ...headersFromBaseOptions, ...options.headers};

            return {
                url: toPathString(localVarUrlObj),
                options: localVarRequestOptions,
            };
        },
        /**
         * List workspace nodes
         * @param {string} slug
         * @param {string} [cursor]
         * @param {number} [limit]
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        listWorkspaceNodes: async (slug: string, cursor?: string, limit?: number, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'slug' is not null or undefined
            assertParamExists('listWorkspaceNodes', 'slug', slug);
            const localVarPath = `/api/workspaces/{slug}/nodes`
                .replace(`{${"slug"}}`, encodeURIComponent(String(slug)));
            const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
            let baseOptions;
            if (configuration) {
                baseOptions = configuration.baseOptions;
            }
            const localVarRequestOptions = { method: 'GET', ...baseOptions, ...options};
            const localVarHeaderParameter = {} as any;
            const localVarQueryParameter = {} as any;

            // authentication bearerAuth required
            await setBearerAuthToObject(localVarHeaderParameter, configuration);

            if (cursor !== undefined) {
                localVarQueryParameter['cursor'] = cursor;
            }

            if (limit !== undefined) {
                localVarQueryParameter['limit'] = limit;
            }

            setSearchParams(localVarUrlObj, localVarQueryParameter);
            let headersFromBaseOptions = baseOptions && baseOptions.headers ? baseOptions.headers : {};
            localVarRequestOptions.headers = {...localVarHeaderParameter, ...headersFromBaseOptions, ...options.headers};

            return {
                url: toPathString(localVarUrlObj),
                options: localVarRequestOptions,
            };
        },
    };
};

/**
 * SyncWorkspacesApi - functional programming interface
 * @export
 */
export const SyncWorkspacesApiFp = function(configuration?: Configuration) {
    const localVarAxiosParamCreator = SyncWorkspacesApiAxiosParamCreator(configuration);
    return {
        /**
         * Get workspace metadata
         * @param {string} slug
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async getWorkspaceMetadata(slug: string, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<WorkspaceMetadata>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.getWorkspaceMetadata(slug, options);
            return (axios: AxiosInstance = globalAxios, basePath: string = BASE_PATH) => {
                const axiosRequestArgs = {...localVarAxiosArgs.options, url: basePath + localVarAxiosArgs.url};
                return axios.request(axiosRequestArgs);
            };
        },
        /**
         * List workspace nodes
         * @param {string} [cursor]
         * @param {number} [limit]
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async listWorkspaceNodes(slug: string, cursor?: string, limit?: number, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<PaginatedNodesResponse>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.listWorkspaceNodes(slug, cursor, limit, options);
            return (axios: AxiosInstance = globalAxios, basePath: string = BASE_PATH) => {
                const axiosRequestArgs = {...localVarAxiosArgs.options, url: basePath + localVarAxiosArgs.url};
                return axios.request(axiosRequestArgs);
            };
        },
    };
};

/**
 * SyncNodesApiAxiosParamCreator - parameter creator
 * @export
 */
export const SyncNodesApiAxiosParamCreator = function (configuration?: Configuration) {
    return {
        /**
         * Compare node versions
         * @param {string} uuid
         * @param {string} localHash
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        compareNodeVersions: async (uuid: string, localHash: string, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'uuid' is not null or undefined
            assertParamExists('compareNodeVersions', 'uuid', uuid);
            // verify required parameter 'localHash' is not null or undefined
            assertParamExists('compareNodeVersions', 'localHash', localHash);
            const localVarPath = `/api/nodes/{uuid}/versions/compare`
                .replace(`{${"uuid"}}`, encodeURIComponent(String(uuid)));
            const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
            let baseOptions;
            if (configuration) {
                baseOptions = configuration.baseOptions;
            }
            const localVarRequestOptions = { method: 'GET', ...baseOptions, ...options};
            const localVarHeaderParameter = {} as any;
            const localVarQueryParameter = {} as any;

            // authentication bearerAuth required
            await setBearerAuthToObject(localVarHeaderParameter, configuration);

            if (localHash !== undefined) {
                localVarQueryParameter['localHash'] = localHash;
            }

            setSearchParams(localVarUrlObj, localVarQueryParameter);
            let headersFromBaseOptions = baseOptions && baseOptions.headers ? baseOptions.headers : {};
            localVarRequestOptions.headers = {...localVarHeaderParameter, ...headersFromBaseOptions, ...options.headers};

            return {
                url: toPathString(localVarUrlObj),
                options: localVarRequestOptions,
            };
        },
        /**
         * Download node content
         * @param {string} uuid
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        downloadNodeContent: async (uuid: string, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'uuid' is not null or undefined
            assertParamExists('downloadNodeContent', 'uuid', uuid);
            const localVarPath = `/api/nodes/{uuid}/content`
                .replace(`{${"uuid"}}`, encodeURIComponent(String(uuid)));
            const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
            let baseOptions;
            if (configuration) {
                baseOptions = configuration.baseOptions;
            }
            const localVarRequestOptions = { method: 'GET', ...baseOptions, ...options};
            const localVarHeaderParameter = {} as any;
            const localVarQueryParameter = {} as any;

            // authentication bearerAuth required
            await setBearerAuthToObject(localVarHeaderParameter, configuration);

            setSearchParams(localVarUrlObj, localVarQueryParameter);
            let headersFromBaseOptions = baseOptions && baseOptions.headers ? baseOptions.headers : {};
            localVarRequestOptions.headers = {...localVarHeaderParameter, ...headersFromBaseOptions, ...options.headers};

            return {
                url: toPathString(localVarUrlObj),
                options: localVarRequestOptions,
            };
        },
    };
};

/**
 * SyncNodesApi - functional programming interface
 * @export
 */
export const SyncNodesApiFp = function(configuration?: Configuration) {
    const localVarAxiosParamCreator = SyncNodesApiAxiosParamCreator(configuration);
    return {
        /**
         * Compare node versions
         * @param {string} uuid
         * @param {string} localHash
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async compareNodeVersions(uuid: string, localHash: string, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<VersionComparisonResponse>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.compareNodeVersions(uuid, localHash, options);
            return (axios: AxiosInstance = globalAxios, basePath: string = BASE_PATH) => {
                const axiosRequestArgs = {...localVarAxiosArgs.options, url: basePath + localVarAxiosArgs.url};
                return axios.request(axiosRequestArgs);
            };
        },
        /**
         * Download node content
         * @param {string} uuid
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async downloadNodeContent(uuid: string, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<string>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.downloadNodeContent(uuid, options);
            return (axios: AxiosInstance = globalAxios, basePath: string = BASE_PATH) => {
                const axiosRequestArgs = {...localVarAxiosArgs.options, url: basePath + localVarAxiosArgs.url};
                return axios.request(axiosRequestArgs);
            };
        },
    };
};
