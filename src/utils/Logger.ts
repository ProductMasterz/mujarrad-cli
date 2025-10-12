import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';

/**
 * Log level type
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Logger configuration options
 */
export interface LoggerOptions {
  logDir?: string;
  logLevel?: LogLevel;
  maxFileSize?: number;
  maxFiles?: number;
}

/**
 * Logger provides structured logging with file rotation and metadata support
 *
 * Features:
 * - Logs to ~/.mujarrad/logs/mujarrad-{pid}-YYYY-MM-DD.log by default
 * - Daily rotation with per-process log files for concurrent instance safety
 * - Automatic cleanup (7 day retention, 10MB max file size)
 * - Support for log levels: debug, info, warn, error
 * - Includes timestamp in ISO 8601 format
 * - Supports child loggers with sessionId for request correlation
 * - Graceful shutdown for flushing logs
 *
 * Follows Constitution Principle III: TDD approach with comprehensive tests
 * Follows Constitution Principle V: Security by Default (file permissions, async logging)
 */
export class Logger {
  private winston: winston.Logger;
  private logDir: string;
  private logLevel: LogLevel;
  private maxFileSize: number;

  constructor(options: LoggerOptions = {}) {
    this.logDir = options.logDir || path.join(os.homedir(), '.mujarrad', 'logs');
    this.logLevel = options.logLevel || 'info';
    this.maxFileSize = options.maxFileSize || 10 * 1024 * 1024; // 10MB default

    // Initialize winston logger with daily rotation
    this.winston = winston.createLogger({
      level: this.logLevel,
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
        winston.format.errors({ stack: true }),
        // Custom format to serialize error objects properly
        winston.format((info) => {
          // If metadata contains error objects, serialize them with message and stack
          if (info.error instanceof Error) {
            info.error = {
              message: info.error.message,
              stack: info.error.stack,
              name: info.error.name
            };
          }
          return info;
        })(),
        winston.format.json()
      ),
      transports: [
        new DailyRotateFile({
          // Per-process log files for concurrent instance safety
          filename: path.join(this.logDir, `mujarrad-${process.pid}-%DATE%.log`),
          datePattern: 'YYYY-MM-DD',
          maxSize: this.maxFileSize,
          maxFiles: '7d', // Keep 7 days of logs
          zippedArchive: false, // Don't compress for multi-instance compatibility
          auditFile: path.join(this.logDir, `.audit-${process.pid}.json`),
        })
      ]
    });

    // Ensure log directory exists
    this.ensureLogDirectory().catch(error => {
      console.error('Failed to create log directory:', error);
    });
  }

  /**
   * Ensure log directory exists with proper permissions
   */
  private async ensureLogDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.logDir, { recursive: true });

      // Set directory permissions to 700 (owner read/write/execute only)
      if (process.platform !== 'win32') {
        await fs.chmod(this.logDir, 0o700);
      }
    } catch (error) {
      // If directory creation fails, log to console
      console.error('Failed to create log directory:', error);
    }
  }

  /**
   * Log debug message
   *
   * @param message - Log message
   * @param metadata - Optional metadata object
   */
  debug(message: string, metadata?: Record<string, any>): void {
    this.winston.debug(message, metadata);
  }

  /**
   * Log info message
   *
   * @param message - Log message
   * @param metadata - Optional metadata object
   */
  info(message: string, metadata?: Record<string, any>): void {
    this.winston.info(message, metadata);
  }

  /**
   * Log warning message
   *
   * @param message - Log message
   * @param metadata - Optional metadata object
   */
  warn(message: string, metadata?: Record<string, any>): void {
    this.winston.warn(message, metadata);
  }

  /**
   * Log error message
   *
   * @param message - Log message
   * @param metadata - Optional metadata object
   */
  error(message: string, metadata?: Record<string, any>): void {
    this.winston.error(message, metadata);
  }

  /**
   * Create child logger with additional context (e.g., request ID)
   *
   * @param metadata - Context metadata to include in all child logs
   * @returns Child logger instance
   */
  child(metadata: Record<string, any>): Logger {
    const childLogger = Object.create(this);
    childLogger.winston = this.winston.child(metadata);
    return childLogger;
  }

  /**
   * Gracefully shutdown logger and flush all pending logs
   */
  async shutdown(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.winston.on('finish', () => {
        resolve();
      });

      this.winston.on('error', (error) => {
        reject(error);
      });

      this.winston.end();
    });
  }

  /**
   * Get the log directory path
   */
  getLogDir(): string {
    return this.logDir;
  }

  /**
   * Get the current log level
   */
  getLogLevel(): LogLevel {
    return this.logLevel;
  }
}

/**
 * Create a session logger with sessionId context
 * This is a convenience function for creating child loggers with session tracking
 *
 * @param logger - Parent logger instance
 * @param sessionId - Session identifier (UUID)
 * @returns Child logger with sessionId in all logs
 *
 * @example
 * ```typescript
 * const logger = new Logger();
 * const sessionLogger = createSessionLogger(logger, 'abc-123-def');
 * sessionLogger.info('Command started'); // Will include sessionId in log
 * ```
 */
export function createSessionLogger(logger: Logger, sessionId: string): Logger {
  return logger.child({ sessionId });
}
