/**
 * SpaceValidator service
 * Feature: 009-init-command-enhancement
 * Task: T014 - Implement SpaceValidator service (Updated to use SpaceResolver)
 *
 * Validates space existence and user permissions before vault upload.
 * Now uses SpaceResolver for slug-to-UUID resolution with caching.
 */

import { SpaceResolver } from './SpaceResolver.js';
import { Logger } from '../utils/Logger.js';

/**
 * SpaceValidator validates space before vault upload
 * @class SpaceValidator
 */
export class SpaceValidator {
  constructor(
    private spaceResolver: SpaceResolver,
    private logger: Logger
  ) {}

  /**
   * Validate space exists and resolve slug to UUID
   *
   * @param slug - Space slug (URL-safe identifier)
   * @returns Promise<string> - Space UUID for subsequent operations
   * @throws Error - If space validation fails
   */
  async validateSpace(slug: string): Promise<string> {
    try {
      // Resolve slug to UUID (with caching)
      const uuid = await this.spaceResolver.resolveSlug(slug);

      this.logger.info(`Space '${slug}' validated (UUID: ${uuid})`);
      return uuid; // Return UUID for subsequent operations

    } catch (error: any) {
      throw new Error(`Space '${slug}' validation failed: ${error.message}`);
    }
  }
}
