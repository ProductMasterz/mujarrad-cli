/**
 * Configuration schema for Mujarrad CLI
 */
export interface Config {
  /**
   * Base URL for the Mujarrad API
   * Can be overridden with MUJARRAD_API_BASE_URL environment variable
   */
  apiBaseUrl: string;

  /**
   * Default workspace slug to use for operations
   * Can be overridden with MUJARRAD_DEFAULT_WORKSPACE environment variable
   */
  defaultWorkspace?: string;

  /**
   * Enable automatic synchronization when files change
   * Can be overridden with MUJARRAD_AUTO_SYNC environment variable
   */
  autoSync: boolean;

  /**
   * Logging level: 'debug' | 'info' | 'warn' | 'error'
   * Can be overridden with MUJARRAD_LOG_LEVEL environment variable
   */
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: Config = {
  apiBaseUrl: 'https://mujarrad.onrender.com/api',
  autoSync: false,
  logLevel: 'info'
};

/**
 * Environment variable mapping for configuration overrides
 */
export const ENV_VAR_MAPPING: Record<keyof Config, string> = {
  apiBaseUrl: 'MUJARRAD_API_BASE_URL',
  defaultWorkspace: 'MUJARRAD_DEFAULT_WORKSPACE',
  autoSync: 'MUJARRAD_AUTO_SYNC',
  logLevel: 'MUJARRAD_LOG_LEVEL'
};
