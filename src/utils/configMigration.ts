import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

/**
 * Migrate old config files to new format
 *
 * Fixes:
 * - API URL from https://mujarrad.onrender.com/api → https://mujarrad.onrender.com
 */
export async function migrateConfig(): Promise<boolean> {
  const configPath = path.join(os.homedir(), '.mujarrad', 'config.json');

  try {
    // Check if config file exists
    const configContent = await fs.readFile(configPath, 'utf-8');
    const config = JSON.parse(configContent);

    let needsMigration = false;

    // Fix API URL if it has /api suffix
    if (config.apiBaseUrl === 'https://mujarrad.onrender.com/api') {
      config.apiBaseUrl = 'https://mujarrad.onrender.com';
      needsMigration = true;
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
