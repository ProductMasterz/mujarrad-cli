/**
 * Version level for alpha/beta disclaimer tracking
 */
export type VersionLevel = 'alpha' | 'beta' | 'stable';

/**
 * Disclaimer acknowledgment tracking for alpha/beta versions
 */
export interface DisclaimerAcknowledgment {
  /**
   * Version that was acknowledged (e.g., "1.0.0-alpha.1")
   */
  acknowledgedVersion: string;

  /**
   * ISO 8601 timestamp when disclaimer was acknowledged
   */
  acknowledgedAt: string;

  /**
   * Prerelease level that was acknowledged
   */
  versionLevel: VersionLevel;
}

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

  /**
   * Alpha/beta disclaimer acknowledgment tracking
   * Optional - only present after user acknowledges disclaimer
   */
  disclaimerAcknowledgment?: DisclaimerAcknowledgment;
}

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: Config = {
  apiBaseUrl: 'https://mujarrad.onrender.com',
  autoSync: false,
  logLevel: 'info'
};

/**
 * Environment variable mapping for configuration overrides
 * Note: disclaimerAcknowledgment is not configurable via env vars
 */
export const ENV_VAR_MAPPING: Partial<Record<keyof Config, string>> = {
  apiBaseUrl: 'MUJARRAD_API_BASE_URL',
  defaultWorkspace: 'MUJARRAD_DEFAULT_WORKSPACE',
  autoSync: 'MUJARRAD_AUTO_SYNC',
  logLevel: 'MUJARRAD_LOG_LEVEL'
};
