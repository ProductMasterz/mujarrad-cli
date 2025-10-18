import fs from 'fs';
import path from 'path';
import os from 'os';

interface SpaceConfig {
  uuid: string;
  slug: string;
  lastSync?: string;
  displayName?: string;
}

interface MujarradConfig {
  spaces: { [slug: string]: SpaceConfig };
  version: string;
}

export class ConfigManager {
  private configPath: string;
  private config: MujarradConfig;

  constructor() {
    this.configPath = path.join(os.homedir(), '.mujarrad', 'spaces.json');
    this.config = this.loadConfig();
  }

  private loadConfig(): MujarradConfig {
    try {
      if (fs.existsSync(this.configPath)) {
        const data = fs.readFileSync(this.configPath, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.warn('Failed to load config, using defaults:', error);
    }

    return { spaces: {}, version: '1.0' };
  }

  private saveConfig(): void {
    const dir = path.dirname(this.configPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
  }

  /**
   * Get cached UUID for a space slug
   */
  getSpaceUuid(slug: string): string | null {
    return this.config.spaces[slug]?.uuid || null;
  }

  /**
   * Cache space UUID and metadata
   */
  setSpace(slug: string, spaceData: SpaceConfig): void {
    this.config.spaces[slug] = spaceData;
    this.saveConfig();
  }

  /**
   * Remove cached space (e.g., after deletion)
   */
  removeSpace(slug: string): void {
    delete this.config.spaces[slug];
    this.saveConfig();
  }

  /**
   * List all cached spaces
   */
  listSpaces(): SpaceConfig[] {
    return Object.values(this.config.spaces);
  }
}
