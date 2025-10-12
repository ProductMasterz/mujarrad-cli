/**
 * Unit tests for SessionManager
 */
import { SessionManager } from '../../../src/utils/SessionManager.js';

describe('SessionManager', () => {
  describe('generateSessionId', () => {
    it('should return a valid UUID v4', () => {
      const sessionId = SessionManager.generateSessionId();

      expect(sessionId).toBeDefined();
      expect(typeof sessionId).toBe('string');
      expect(sessionId).toHaveLength(36);
      expect(SessionManager.isValidSessionId(sessionId)).toBe(true);
    });

    it('should match UUID v4 format pattern', () => {
      const sessionId = SessionManager.generateSessionId();
      const uuidV4Pattern =
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

      expect(sessionId).toMatch(uuidV4Pattern);
    });

    it('should generate unique IDs on each call', () => {
      const id1 = SessionManager.generateSessionId();
      const id2 = SessionManager.generateSessionId();
      const id3 = SessionManager.generateSessionId();

      expect(id1).not.toBe(id2);
      expect(id2).not.toBe(id3);
      expect(id1).not.toBe(id3);
    });

    it('should generate 100 unique IDs without collisions', () => {
      const ids = new Set();

      for (let i = 0; i < 100; i++) {
        ids.add(SessionManager.generateSessionId());
      }

      expect(ids.size).toBe(100);
    });
  });

  describe('createSessionMetadata', () => {
    it('should include all required fields', () => {
      const commandName = 'upload';
      const metadata = SessionManager.createSessionMetadata(commandName);

      expect(metadata).toHaveProperty('sessionId');
      expect(metadata).toHaveProperty('commandName');
      expect(metadata).toHaveProperty('startTime');
      expect(metadata).toHaveProperty('cliVersion');
      expect(metadata).toHaveProperty('nodeVersion');
      expect(metadata).toHaveProperty('platform');
      expect(metadata).toHaveProperty('workingDirectory');
      expect(metadata).toHaveProperty('environment');
    });

    it('should set command name correctly', () => {
      const commandName = 'clone';
      const metadata = SessionManager.createSessionMetadata(commandName);

      expect(metadata.commandName).toBe(commandName);
    });

    it('should generate valid session ID', () => {
      const metadata = SessionManager.createSessionMetadata('sync');

      expect(SessionManager.isValidSessionId(metadata.sessionId)).toBe(true);
    });

    it('should set start time in ISO 8601 format', () => {
      const metadata = SessionManager.createSessionMetadata('auth login');
      const startTime = new Date(metadata.startTime);

      expect(startTime).toBeInstanceOf(Date);
      expect(startTime.getTime()).not.toBeNaN();
      expect(metadata.startTime).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('should include Node.js version', () => {
      const metadata = SessionManager.createSessionMetadata('template list');

      expect(metadata.nodeVersion).toBe(process.version);
      expect(metadata.nodeVersion).toMatch(/^v\d+\.\d+\.\d+/);
    });

    it('should include platform information', () => {
      const metadata = SessionManager.createSessionMetadata('logs export');

      expect(metadata.platform).toBe(process.platform);
      expect(['darwin', 'linux', 'win32']).toContain(metadata.platform);
    });

    it('should include working directory', () => {
      const metadata = SessionManager.createSessionMetadata('init');

      expect(metadata.workingDirectory).toBe(process.cwd());
      expect(metadata.workingDirectory).toBeTruthy();
    });

    it('should detect environment type', () => {
      const metadata = SessionManager.createSessionMetadata('--help');

      expect(metadata.environment).toBeDefined();
      expect(['development', 'production', 'ci']).toContain(metadata.environment);
    });

    it('should detect CI environment when CI env var is set', () => {
      const originalCI = process.env.CI;
      process.env.CI = 'true';

      const metadata = SessionManager.createSessionMetadata('test');

      expect(metadata.environment).toBe('ci');

      // Restore original env
      if (originalCI === undefined) {
        delete process.env.CI;
      } else {
        process.env.CI = originalCI;
      }
    });

    it('should detect development environment when NODE_ENV=development', () => {
      const originalNodeEnv = process.env.NODE_ENV;
      delete process.env.CI;
      process.env.NODE_ENV = 'development';

      const metadata = SessionManager.createSessionMetadata('test');

      expect(metadata.environment).toBe('development');

      // Restore original env
      if (originalNodeEnv === undefined) {
        delete process.env.NODE_ENV;
      } else {
        process.env.NODE_ENV = originalNodeEnv;
      }
    });
  });

  describe('isValidSessionId', () => {
    it('should return true for valid UUID v4', () => {
      // Valid UUID v4: version 4 (4xxx) and variant 10 (8xxx, 9xxx, axxx, bxxx)
      const validUuid = 'f9ed4675-f1c5-4513-861a-3b3b4e25b4c0';

      expect(SessionManager.isValidSessionId(validUuid)).toBe(true);
    });

    it('should return false for invalid format', () => {
      const invalidIds = [
        'not-a-uuid',
        '12345',
        '',
        'f9ed4675-f1c5-4513-c61a', // Too short
        'f9ed4675-f1c5-3513-c61a-3b3b4e25b4c0', // Wrong version (3 instead of 4)
        'f9ed4675-f1c5-4513-161a-3b3b4e25b4c0', // Wrong variant (1 instead of 8-b)
      ];

      invalidIds.forEach((id) => {
        expect(SessionManager.isValidSessionId(id)).toBe(false);
      });
    });

    it('should return false for null or undefined', () => {
      expect(SessionManager.isValidSessionId(null)).toBe(false);
      expect(SessionManager.isValidSessionId(undefined)).toBe(false);
    });
  });

  describe('performance', () => {
    it('should generate session ID in less than 1ms', () => {
      const start = performance.now();
      SessionManager.generateSessionId();
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(1);
    });

    it('should create session metadata in less than 10ms', () => {
      const start = performance.now();
      SessionManager.createSessionMetadata('performance-test');
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(10);
    });
  });
});
