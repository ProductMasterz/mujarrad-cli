import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

/**
 * Get the CLI version from package.json
 *
 * This reads the version dynamically from package.json at runtime
 * to ensure the displayed version always matches the installed package.
 */
export function getVersion(): string {
  try {
    // Get the directory of the current module
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);

    // Read package.json (go up two levels: utils -> src -> root)
    const packageJsonPath = join(__dirname, '../../package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));

    return packageJson.version || '0.0.0';
  } catch (error) {
    // Fallback version if package.json can't be read
    console.error('Warning: Could not read version from package.json');
    return '0.0.0';
  }
}
