import { cosmiconfig } from 'cosmiconfig';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { Config, DEFAULT_CONFIG, ENV_VAR_MAPPING } from './types.js';

/**
 * ConfigManager handles loading, saving, and managing CLI configuration
 *
 * Configuration is loaded from:
 * 1. Default values (DEFAULT_CONFIG)
 * 2. Configuration file (~/.mujarrad/config.json or .mujarradrc)
 * 3. Environment variables (highest priority)
 *
 * Follows Constitution Principle III: TDD approach with comprehensive tests
 */
export class ConfigManager {
  private configDir: string;
  private configPath: string;
  private explorer: ReturnType<typeof cosmiconfig>;

  constructor(configDir?: string) {
    // Use provided config directory or default to ~/.mujarrad
    this.configDir = configDir || path.join(os.homedir(), '.mujarrad');
    this.configPath = path.join(this.configDir, 'config.json');
    this.explorer = cosmiconfig('mujarrad');
  }

  /**
   * Load configuration from file and environment variables
   * Creates default config if none exists
   *
   * @returns Promise<Config> - Merged configuration
   */
  async load(): Promise<Config> {
    // Start with default config
    let config: Config = { ...DEFAULT_CONFIG };

    // Try to load from file
    try {
      // First try to load directly from the config path
      const configContent = await fs.readFile(this.configPath, 'utf-8');
      const parsedConfig = JSON.parse(configContent);
      config = { ...config, ...parsedConfig };
    } catch (error) {
      // If direct read fails, try cosmiconfig search
      try {
        const result = await this.explorer.search(this.configDir);

        if (result && result.config) {
          // Merge file config with defaults
          config = { ...config, ...result.config };
        } else {
          // No config found, create default
          await this.createDefaultConfig();
        }
      } catch (searchError) {
        // If config doesn't exist or is invalid, create default
        await this.createDefaultConfig();
      }
    }

    // Apply environment variable overrides
    config = this.applyEnvironmentOverrides(config);

    return config;
  }

  /**
   * Save configuration to file
   *
   * @param config - Configuration to save
   */
  async save(config: Config): Promise<void> {
    // Ensure config directory exists
    await fs.mkdir(this.configDir, { recursive: true });

    // Write config to file
    await fs.writeFile(
      this.configPath,
      JSON.stringify(config, null, 2),
      'utf-8'
    );
  }

  /**
   * Create default configuration file
   */
  private async createDefaultConfig(): Promise<void> {
    await this.save(DEFAULT_CONFIG);
  }

  /**
   * Apply environment variable overrides to configuration
   *
   * @param config - Base configuration
   * @returns Config with environment overrides applied
   */
  private applyEnvironmentOverrides(config: Config): Config {
    const overriddenConfig: any = { ...config };

    // Apply environment variable overrides
    for (const [key, envVar] of Object.entries(ENV_VAR_MAPPING)) {
      const envValue = process.env[envVar];

      if (envValue !== undefined) {
        // Type conversion based on config key
        if (key === 'autoSync') {
          overriddenConfig[key] = envValue === 'true';
        } else if (key === 'logLevel') {
          overriddenConfig[key] = envValue;
        } else {
          overriddenConfig[key] = envValue;
        }
      }
    }

    return overriddenConfig as Config;
  }

  /**
   * Get the configuration directory path
   */
  getConfigDir(): string {
    return this.configDir;
  }

  /**
   * Get the configuration file path
   */
  getConfigPath(): string {
    return this.configPath;
  }
}
