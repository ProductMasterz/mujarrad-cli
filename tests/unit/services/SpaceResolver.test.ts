/**
 * Unit tests for SpaceResolver
 * Feature: 009-init-command-enhancement
 *
 * Testing Checklist (from handoff):
 * - Returns cached UUID if exists
 * - Calls API if not cached
 * - Caches UUID after resolution
 * - Handles API errors properly
 */

import { SpaceResolver } from '../../../src/services/SpaceResolver.js';
import { SpacesApi } from '../../../src/api/generated/index.js';
import { ConfigManager } from '../../../src/services/ConfigManager.js';
import { Logger } from '../../../src/utils/Logger.js';

// Mock dependencies
jest.mock('../../../src/api/generated/index.js');
jest.mock('../../../src/services/ConfigManager.js');
jest.mock('../../../src/utils/Logger.js');

describe('SpaceResolver', () => {
  let spaceResolver: SpaceResolver;
  let mockSpacesApi: jest.Mocked<SpacesApi>;
  let mockConfigManager: jest.Mocked<ConfigManager>;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    // Create mocked instances
    mockSpacesApi = new SpacesApi() as jest.Mocked<SpacesApi>;
    mockConfigManager = new ConfigManager() as jest.Mocked<ConfigManager>;
    mockLogger = new Logger({ logLevel: 'debug' }) as jest.Mocked<Logger>;

    // Setup default mock implementations
    mockLogger.debug = jest.fn();
    mockLogger.info = jest.fn();
    mockLogger.error = jest.fn();

    spaceResolver = new SpaceResolver(mockSpacesApi, mockConfigManager, mockLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('resolveSlug', () => {
    it('should return cached UUID if exists', async () => {
      const slug = 'cached-space';
      const cachedUuid = 'uuid-cached-123';

      mockConfigManager.getSpaceUuid = jest.fn().mockReturnValue(cachedUuid);

      const result = await spaceResolver.resolveSlug(slug);

      expect(result).toBe(cachedUuid);
      expect(mockConfigManager.getSpaceUuid).toHaveBeenCalledWith(slug);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        `Using cached UUID for space '${slug}': ${cachedUuid}`
      );

      // Should NOT call API if cached
      expect(mockSpacesApi.createSpace).not.toHaveBeenCalled();
    });

    it('should call API if not cached', async () => {
      const slug = 'new-space';
      const displayName = 'New Space';
      const apiUuid = 'uuid-api-456';

      mockConfigManager.getSpaceUuid = jest.fn().mockReturnValue(null);

      // Mock API response (wrapped structure)
      mockSpacesApi.createSpace = jest.fn().mockResolvedValue({
        data: {
          data: {
            id: apiUuid,
            title: displayName
          }
        }
      } as any);

      const result = await spaceResolver.resolveSlug(slug, displayName);

      expect(result).toBe(apiUuid);
      expect(mockSpacesApi.createSpace).toHaveBeenCalledWith({
        slug,
        displayName,
        description: '',
        isPublic: false
      });
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Space '${slug}' not in cache, resolving via API...`
      );
    });

    it('should cache UUID after API resolution', async () => {
      const slug = 'space-to-cache';
      const displayName = 'Space To Cache';
      const apiUuid = 'uuid-new-789';

      mockConfigManager.getSpaceUuid = jest.fn().mockReturnValue(null);
      mockConfigManager.setSpace = jest.fn();

      // Mock API response
      mockSpacesApi.createSpace = jest.fn().mockResolvedValue({
        data: {
          data: {
            id: apiUuid,
            title: displayName
          }
        }
      } as any);

      await spaceResolver.resolveSlug(slug, displayName);

      expect(mockConfigManager.setSpace).toHaveBeenCalledWith(slug, {
        uuid: apiUuid,
        slug: slug,
        displayName: displayName,
        lastSync: expect.any(String) // ISO timestamp
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        `Space '${slug}' resolved to UUID: ${apiUuid}`
      );
    });

    it('should use slug as displayName if not provided', async () => {
      const slug = 'auto-display-name';
      const apiUuid = 'uuid-auto-123';

      mockConfigManager.getSpaceUuid = jest.fn().mockReturnValue(null);

      mockSpacesApi.createSpace = jest.fn().mockResolvedValue({
        data: {
          data: {
            id: apiUuid,
            title: slug
          }
        }
      } as any);

      await spaceResolver.resolveSlug(slug);

      expect(mockSpacesApi.createSpace).toHaveBeenCalledWith({
        slug,
        displayName: slug, // Should default to slug
        description: '',
        isPublic: false
      });
    });

    it('should handle isPublic flag correctly', async () => {
      const slug = 'public-space';
      const apiUuid = 'uuid-public-123';

      mockConfigManager.getSpaceUuid = jest.fn().mockReturnValue(null);

      mockSpacesApi.createSpace = jest.fn().mockResolvedValue({
        data: {
          data: {
            id: apiUuid,
            title: slug
          }
        }
      } as any);

      await spaceResolver.resolveSlug(slug, undefined, true);

      expect(mockSpacesApi.createSpace).toHaveBeenCalledWith({
        slug,
        displayName: slug,
        description: '',
        isPublic: true
      });
    });

    it('should handle API response without wrapper (backward compatibility)', async () => {
      const slug = 'unwrapped-response';
      const apiUuid = 'uuid-unwrapped-123';

      mockConfigManager.getSpaceUuid = jest.fn().mockReturnValue(null);

      // Mock API response without wrapper
      mockSpacesApi.createSpace = jest.fn().mockResolvedValue({
        data: {
          id: apiUuid,
          title: 'Unwrapped Title'
        }
      } as any);

      const result = await spaceResolver.resolveSlug(slug);

      expect(result).toBe(apiUuid);
    });

    it('should handle 409 Conflict error (space exists but no access)', async () => {
      const slug = 'no-access-space';

      mockConfigManager.getSpaceUuid = jest.fn().mockReturnValue(null);

      const error = {
        response: {
          status: 409
        },
        message: 'Conflict'
      };

      mockSpacesApi.createSpace = jest.fn().mockRejectedValue(error);

      await expect(spaceResolver.resolveSlug(slug)).rejects.toThrow(
        `Space '${slug}' exists but you don't have access`
      );
    });

    it('should handle generic API errors', async () => {
      const slug = 'error-space';

      mockConfigManager.getSpaceUuid = jest.fn().mockReturnValue(null);

      const error = {
        message: 'Network error'
      };

      mockSpacesApi.createSpace = jest.fn().mockRejectedValue(error);

      await expect(spaceResolver.resolveSlug(slug)).rejects.toThrow(
        `Failed to resolve space '${slug}': Network error`
      );
    });

    it('should handle API errors without response object', async () => {
      const slug = 'unknown-error-space';

      mockConfigManager.getSpaceUuid = jest.fn().mockReturnValue(null);

      const error = new Error('Unknown error');

      mockSpacesApi.createSpace = jest.fn().mockRejectedValue(error);

      await expect(spaceResolver.resolveSlug(slug)).rejects.toThrow(
        `Failed to resolve space '${slug}': Unknown error`
      );
    });
  });

  describe('invalidateCache', () => {
    it('should remove space from config', () => {
      const slug = 'space-to-invalidate';

      mockConfigManager.removeSpace = jest.fn();

      spaceResolver.invalidateCache(slug);

      expect(mockConfigManager.removeSpace).toHaveBeenCalledWith(slug);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        `Cache invalidated for space '${slug}'`
      );
    });
  });

  describe('edge cases', () => {
    it('should handle API response with missing title field', async () => {
      const slug = 'no-title-space';
      const displayName = 'Custom Display Name';
      const apiUuid = 'uuid-no-title';

      mockConfigManager.getSpaceUuid = jest.fn().mockReturnValue(null);

      mockSpacesApi.createSpace = jest.fn().mockResolvedValue({
        data: {
          data: {
            id: apiUuid
            // title is missing
          }
        }
      } as any);

      await spaceResolver.resolveSlug(slug, displayName);

      expect(mockConfigManager.setSpace).toHaveBeenCalledWith(slug, {
        uuid: apiUuid,
        slug: slug,
        displayName: displayName, // Should fall back to provided displayName
        lastSync: expect.any(String)
      });
    });

    it('should handle API response with null title field', async () => {
      const slug = 'null-title-space';
      const apiUuid = 'uuid-null-title';

      mockConfigManager.getSpaceUuid = jest.fn().mockReturnValue(null);

      mockSpacesApi.createSpace = jest.fn().mockResolvedValue({
        data: {
          data: {
            id: apiUuid,
            title: null
          }
        }
      } as any);

      await spaceResolver.resolveSlug(slug);

      expect(mockConfigManager.setSpace).toHaveBeenCalledWith(slug, {
        uuid: apiUuid,
        slug: slug,
        displayName: slug, // Should fall back to slug
        lastSync: expect.any(String)
      });
    });
  });
});
