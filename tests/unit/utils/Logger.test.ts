import { Logger } from '../../../src/utils/Logger.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('Logger', () => {
  let testLogDir: string;
  let logger: Logger;

  beforeEach(async () => {
    // Create a temporary log directory for testing
    testLogDir = path.join(os.tmpdir(), `mujarrad-test-logs-${Date.now()}`);
    await fs.mkdir(testLogDir, { recursive: true });
  });

  afterEach(async () => {
    // Clean up test log directory
    try {
      await fs.rm(testLogDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('constructor', () => {
    it('should create logger with default configuration', () => {
      logger = new Logger({ logDir: testLogDir });
      expect(logger).toBeDefined();
    });

    it('should create logger with custom log level', () => {
      logger = new Logger({ logDir: testLogDir, logLevel: 'debug' });
      expect(logger).toBeDefined();
    });

    it('should create log directory if it does not exist', async () => {
      const nonExistentDir = path.join(testLogDir, 'nested', 'logs');
      logger = new Logger({ logDir: nonExistentDir });

      // Log something to trigger directory creation
      logger.info('Test message');

      // Give it a moment to write
      await new Promise(resolve => setTimeout(resolve, 100));

      const dirExists = await fs.access(nonExistentDir).then(() => true).catch(() => false);
      expect(dirExists).toBe(true);
    });
  });

  describe('log levels', () => {
    beforeEach(() => {
      logger = new Logger({ logDir: testLogDir, logLevel: 'debug' });
    });

    it('should log debug messages when log level is debug', async () => {
      logger.debug('Debug message');

      await new Promise(resolve => setTimeout(resolve, 100));

      const logFile = path.join(testLogDir, 'mujarrad.log');
      const logContent = await fs.readFile(logFile, 'utf-8');
      expect(logContent).toContain('Debug message');
      expect(logContent).toContain('debug');
    });

    it('should log info messages', async () => {
      logger.info('Info message');

      await new Promise(resolve => setTimeout(resolve, 100));

      const logFile = path.join(testLogDir, 'mujarrad.log');
      const logContent = await fs.readFile(logFile, 'utf-8');
      expect(logContent).toContain('Info message');
      expect(logContent).toContain('info');
    });

    it('should log warn messages', async () => {
      logger.warn('Warning message');

      await new Promise(resolve => setTimeout(resolve, 100));

      const logFile = path.join(testLogDir, 'mujarrad.log');
      const logContent = await fs.readFile(logFile, 'utf-8');
      expect(logContent).toContain('Warning message');
      expect(logContent).toContain('warn');
    });

    it('should log error messages', async () => {
      logger.error('Error message');

      await new Promise(resolve => setTimeout(resolve, 100));

      const logFile = path.join(testLogDir, 'mujarrad.log');
      const logContent = await fs.readFile(logFile, 'utf-8');
      expect(logContent).toContain('Error message');
      expect(logContent).toContain('error');
    });

    it('should not log debug messages when log level is info', async () => {
      const infoLogger = new Logger({ logDir: testLogDir, logLevel: 'info' });
      infoLogger.debug('Debug message');
      infoLogger.info('Info message');

      await new Promise(resolve => setTimeout(resolve, 100));

      const logFile = path.join(testLogDir, 'mujarrad.log');
      const logContent = await fs.readFile(logFile, 'utf-8');
      expect(logContent).not.toContain('Debug message');
      expect(logContent).toContain('Info message');
    });
  });

  describe('metadata and context', () => {
    beforeEach(() => {
      logger = new Logger({ logDir: testLogDir, logLevel: 'info' });
    });

    it('should include timestamp in log entries', async () => {
      logger.info('Test message');

      await new Promise(resolve => setTimeout(resolve, 100));

      const logFile = path.join(testLogDir, 'mujarrad.log');
      const logContent = await fs.readFile(logFile, 'utf-8');

      // Check for ISO 8601 timestamp format
      expect(logContent).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should include additional metadata when provided', async () => {
      logger.info('Test message', { userId: '123', action: 'upload' });

      await new Promise(resolve => setTimeout(resolve, 100));

      const logFile = path.join(testLogDir, 'mujarrad.log');
      const logContent = await fs.readFile(logFile, 'utf-8');
      expect(logContent).toContain('userId');
      expect(logContent).toContain('123');
      expect(logContent).toContain('action');
      expect(logContent).toContain('upload');
    });

    it('should handle error objects in metadata', async () => {
      const testError = new Error('Test error');
      logger.error('Error occurred', { error: testError });

      await new Promise(resolve => setTimeout(resolve, 100));

      const logFile = path.join(testLogDir, 'mujarrad.log');
      const logContent = await fs.readFile(logFile, 'utf-8');
      expect(logContent).toContain('Error occurred');
      expect(logContent).toContain('Test error');
    });
  });

  describe('log rotation', () => {
    it('should configure file rotation with max size', async () => {
      // Create logger with small max size for testing
      logger = new Logger({
        logDir: testLogDir,
        logLevel: 'info',
        maxFileSize: 1024, // 1KB for testing
        maxFiles: 3
      });

      // Write enough logs to trigger rotation
      for (let i = 0; i < 100; i++) {
        logger.info(`Test message ${i} - This is a longer message to fill up the log file faster`);
      }

      // Give it time to write and potentially rotate
      await new Promise(resolve => setTimeout(resolve, 500));

      // Check if log files exist (main file should always exist)
      const logFile = path.join(testLogDir, 'mujarrad.log');
      const logExists = await fs.access(logFile).then(() => true).catch(() => false);
      expect(logExists).toBe(true);
    });
  });

  describe('child logger with request ID', () => {
    beforeEach(() => {
      logger = new Logger({ logDir: testLogDir, logLevel: 'info' });
    });

    it('should create child logger with request ID', async () => {
      const requestId = 'req-12345';
      const childLogger = logger.child({ requestId });

      childLogger.info('Request started');

      await new Promise(resolve => setTimeout(resolve, 100));

      const logFile = path.join(testLogDir, 'mujarrad.log');
      const logContent = await fs.readFile(logFile, 'utf-8');
      expect(logContent).toContain('req-12345');
      expect(logContent).toContain('Request started');
    });

    it('should maintain request ID across multiple log calls', async () => {
      const requestId = 'req-67890';
      const childLogger = logger.child({ requestId });

      childLogger.info('Request started');
      childLogger.info('Processing request');
      childLogger.info('Request completed');

      await new Promise(resolve => setTimeout(resolve, 100));

      const logFile = path.join(testLogDir, 'mujarrad.log');
      const logContent = await fs.readFile(logFile, 'utf-8');

      // Should appear 3 times (once for each log call)
      const matches = logContent.match(/req-67890/g);
      expect(matches).toBeDefined();
      expect(matches!.length).toBe(3);
    });
  });

  describe('edge cases', () => {
    it('should handle logging with undefined metadata', async () => {
      logger = new Logger({ logDir: testLogDir, logLevel: 'info' });
      logger.info('Test message', undefined);

      await new Promise(resolve => setTimeout(resolve, 100));

      const logFile = path.join(testLogDir, 'mujarrad.log');
      const logContent = await fs.readFile(logFile, 'utf-8');
      expect(logContent).toContain('Test message');
    });

    it('should handle logging with empty metadata', async () => {
      logger = new Logger({ logDir: testLogDir, logLevel: 'info' });
      logger.info('Test message', {});

      await new Promise(resolve => setTimeout(resolve, 100));

      const logFile = path.join(testLogDir, 'mujarrad.log');
      const logContent = await fs.readFile(logFile, 'utf-8');
      expect(logContent).toContain('Test message');
    });

    it('should handle very long log messages', async () => {
      logger = new Logger({ logDir: testLogDir, logLevel: 'info' });
      const longMessage = 'A'.repeat(10000);
      logger.info(longMessage);

      await new Promise(resolve => setTimeout(resolve, 100));

      const logFile = path.join(testLogDir, 'mujarrad.log');
      const logContent = await fs.readFile(logFile, 'utf-8');
      expect(logContent).toContain('A'.repeat(100)); // Check partial content
    });
  });

  describe('shutdown', () => {
    it('should gracefully shutdown and close file handles', async () => {
      logger = new Logger({ logDir: testLogDir, logLevel: 'info' });
      logger.info('Before shutdown');

      // Give time for log to be written
      await new Promise(resolve => setTimeout(resolve, 100));

      await logger.shutdown();

      // Verify log was written before shutdown
      const logFile = path.join(testLogDir, 'mujarrad.log');
      const logContent = await fs.readFile(logFile, 'utf-8');
      expect(logContent).toContain('Before shutdown');
    });
  });
});
