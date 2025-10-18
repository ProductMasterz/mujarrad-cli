import { SpacesApi } from '../api/generated/index.js';
import { ConfigManager } from './ConfigManager.js';
import { Logger } from '../utils/Logger.js';

interface SpaceCreateRequest {
  slug: string;
  displayName: string;
  description: string;
  isPublic: boolean;
}

export class SpaceResolver {
  constructor(
    private spacesApi: SpacesApi,
    private configManager: ConfigManager,
    private logger: Logger
  ) {}

  /**
   * Resolve space slug to UUID (with caching)
   *
   * Flow:
   * 1. Check cache for UUID
   * 2. If not cached, call POST /api/spaces (idempotent)
   * 3. Cache the UUID
   * 4. Return UUID
   */
  async resolveSlug(
    slug: string,
    displayName?: string,
    isPublic: boolean = false
  ): Promise<string> {
    // Step 1: Check cache
    const cachedUuid = this.configManager.getSpaceUuid(slug);
    if (cachedUuid) {
      this.logger.debug(`Using cached UUID for space '${slug}': ${cachedUuid}`);
      return cachedUuid;
    }

    this.logger.info(`Space '${slug}' not in cache, resolving via API...`);

    // Step 2: Call POST /api/spaces (idempotent - returns existing or creates new)
    try {
      const request: SpaceCreateRequest = {
        slug,
        displayName: displayName || slug,
        description: '',
        isPublic
      };

      const response = await this.spacesApi.createSpace(request as any);

      // Response is wrapped: response.data.data contains SpaceResponse
      const responseData = response.data as any;
      const spaceData = responseData.data || responseData;

      // Step 3: Cache the UUID
      this.configManager.setSpace(slug, {
        uuid: spaceData.id,
        slug: slug,  // Use the slug we requested (backend doesn't return it)
        displayName: spaceData.title || displayName || slug,
        lastSync: new Date().toISOString()
      });

      this.logger.info(`Space '${slug}' resolved to UUID: ${spaceData.id}`);
      return spaceData.id;

    } catch (error: any) {
      if (error.response?.status === 409) {
        // Space exists but we don't have permission - should not happen with idempotent POST
        throw new Error(`Space '${slug}' exists but you don't have access`);
      }
      throw new Error(`Failed to resolve space '${slug}': ${error.message}`);
    }
  }

  /**
   * Invalidate cached UUID (call after space deletion)
   */
  invalidateCache(slug: string): void {
    this.configManager.removeSpace(slug);
    this.logger.debug(`Cache invalidated for space '${slug}'`);
  }
}
