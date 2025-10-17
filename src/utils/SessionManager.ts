/**
 * Session management for CLI command execution tracking
 */
import { randomUUID } from 'crypto';

/**
 * Session metadata for CLI command execution
 */
export interface SessionMetadata {
  sessionId: string;
  commandName: string;
  startTime: string;
  cliVersion: string;
  nodeVersion: string;
  platform: string;
  workingDirectory: string;
  environment: 'development' | 'production' | 'ci';
  userId?: string;
  spaceSlug?: string;
}

/**
 * SessionManager utility for generating and managing CLI sessions
 */
export class SessionManager {
  /**
   * Generate a unique session ID using crypto.randomUUID()
   * @returns UUID v4 format session identifier
   */
  static generateSessionId(): string {
    return randomUUID();
  }

  /**
   * Create complete session metadata for a CLI command
   * @param commandName - Name of the CLI command being executed
   * @returns Complete session metadata object
   */
  static createSessionMetadata(commandName: string): SessionMetadata {
    return {
      sessionId: this.generateSessionId(),
      commandName,
      startTime: new Date().toISOString(),
      cliVersion: this.getCliVersion(),
      nodeVersion: process.version,
      platform: process.platform,
      workingDirectory: process.cwd(),
      environment: this.detectEnvironment(),
    };
  }

  /**
   * Get CLI version from package.json
   * @returns Version string (e.g., "1.0.5")
   */
  private static getCliVersion(): string {
    try {
      // Read version from environment or fallback
      return process.env.npm_package_version || '1.0.5';
    } catch {
      return 'unknown';
    }
  }

  /**
   * Detect current execution environment
   * @returns Environment type
   */
  private static detectEnvironment(): 'development' | 'production' | 'ci' {
    // Check for CI environment variables
    const ciEnvVars = [
      'CI',
      'CONTINUOUS_INTEGRATION',
      'GITHUB_ACTIONS',
      'TRAVIS',
      'CIRCLECI',
      'JENKINS_URL',
      'GITLAB_CI',
    ];

    const isCI = ciEnvVars.some((envVar) => process.env[envVar]);
    if (isCI) {
      return 'ci';
    }

    // Check NODE_ENV
    const nodeEnv = process.env.NODE_ENV;
    if (nodeEnv === 'development' || nodeEnv === 'dev') {
      return 'development';
    }

    // Default to production
    return 'production';
  }

  /**
   * Validate that a string is a valid UUID v4
   * @param sessionId - Session ID to validate
   * @returns True if valid UUID v4 format
   */
  static isValidSessionId(sessionId: string | null | undefined): boolean {
    if (!sessionId || typeof sessionId !== 'string') {
      return false;
    }
    const uuidV4Regex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidV4Regex.test(sessionId);
  }
}
