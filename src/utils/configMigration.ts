import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { DisclaimerAcknowledgment } from '../config/types.js';

/**
 * Migrate old config files to new format
 *
 * Migration history:
 * - v1.0.5 → v1.1.0-alpha.1:
 *   - API URL from https://mujarrad.onrender.com/api → https://mujarrad.onrender.com
 *   - Add disclaimerAcknowledgment field support (optional)
 */
export async function migrateConfig(): Promise<boolean> {
  const configPath = path.join(os.homedir(), '.mujarrad', 'config.json');

  try {
    // Check if config file exists
    const configContent = await fs.readFile(configPath, 'utf-8');
    const config = JSON.parse(configContent);

    let needsMigration = false;

    // Migration 1: Fix API URL if it has /api suffix (v1.0.5 → v1.1.0)
    if (config.apiBaseUrl === 'https://mujarrad.onrender.com/api') {
      config.apiBaseUrl = 'https://mujarrad.onrender.com';
      needsMigration = true;
    }

    // Migration 2: Validate disclaimerAcknowledgment structure if present (v1.1.0+)
    // Ensure that if disclaimerAcknowledgment exists, it has the correct shape
    if (config.disclaimerAcknowledgment) {
      const disclaimer = config.disclaimerAcknowledgment as Partial<DisclaimerAcknowledgment>;

      // Validate required fields
      if (!disclaimer.acknowledgedVersion || !disclaimer.acknowledgedAt || !disclaimer.versionLevel) {
        // Invalid disclaimer structure, remove it to force re-acknowledgment
        delete config.disclaimerAcknowledgment;
        needsMigration = true;
      } else {
        // Validate versionLevel is one of the allowed values
        const validLevels = ['alpha', 'beta', 'stable'];
        if (!validLevels.includes(disclaimer.versionLevel)) {
          delete config.disclaimerAcknowledgment;
          needsMigration = true;
        }
      }
    }

    // Save if migration needed
    if (needsMigration) {
      await fs.writeFile(
        configPath,
        JSON.stringify(config, null, 2),
        'utf-8'
      );
      return true;
    }

    return false;
  } catch (error) {
    // Config doesn't exist or is invalid - no migration needed
    return false;
  }
}
