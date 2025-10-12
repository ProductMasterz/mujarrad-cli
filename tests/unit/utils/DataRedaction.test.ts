/**
 * Unit tests for DataRedaction utility
 */
import { DataRedaction } from '../../../src/utils/DataRedaction.js';

describe('DataRedaction', () => {
  describe('redactSensitiveData', () => {
    it('should redact API tokens', () => {
      const data = {
        apiToken: 'secret-token-12345',
        username: 'testuser',
      };

      const redacted = DataRedaction.redactSensitiveData(data);

      expect(redacted.apiToken).toBe('[REDACTED]');
      expect(redacted.username).toBe('testuser');
    });

    it('should redact passwords', () => {
      const data = {
        password: 'mySecretPassword123',
        email: 'user@example.com',
      };

      const redacted = DataRedaction.redactSensitiveData(data);

      expect(redacted.password).toBe('[REDACTED]');
      expect(redacted.email).toBe('user@example.com');
    });

    it('should redact authorization headers', () => {
      const data = {
        headers: {
          authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          'content-type': 'application/json',
        },
      };

      const redacted = DataRedaction.redactSensitiveData(data);

      expect(redacted.headers.authorization).toBe('[REDACTED]');
      expect(redacted.headers['content-type']).toBe('application/json');
    });

    it('should redact JWT tokens', () => {
      const data = {
        jwt: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abc',
        token: 'secret-token',
      };

      const redacted = DataRedaction.redactSensitiveData(data);

      expect(redacted.jwt).toBe('[REDACTED]');
      expect(redacted.token).toBe('[REDACTED]');
    });

    it('should redact nested sensitive data', () => {
      const data = {
        user: {
          id: '123',
          credentials: {
            password: 'secret123',
            apiKey: 'api-key-xyz',
          },
        },
      };

      const redacted = DataRedaction.redactSensitiveData(data);

      expect(redacted.user.id).toBe('123');
      expect(redacted.user.credentials.password).toBe('[REDACTED]');
      expect(redacted.user.credentials.apiKey).toBe('[REDACTED]');
    });

    it('should redact API keys', () => {
      const data = {
        apiKey: 'api-key-12345',
        api_key: 'api-key-67890',
        name: 'Test',
      };

      const redacted = DataRedaction.redactSensitiveData(data);

      expect(redacted.apiKey).toBe('[REDACTED]');
      expect(redacted.api_key).toBe('[REDACTED]');
      expect(redacted.name).toBe('Test');
    });

    it('should redact access tokens', () => {
      const data = {
        accessToken: 'access-token-12345',
        access_token: 'access-token-67890',
      };

      const redacted = DataRedaction.redactSensitiveData(data);

      expect(redacted.accessToken).toBe('[REDACTED]');
      expect(redacted.access_token).toBe('[REDACTED]');
    });

    it('should handle arrays with sensitive data', () => {
      const data = {
        users: [
          { id: '1', password: 'pass1' },
          { id: '2', password: 'pass2' },
        ],
      };

      const redacted = DataRedaction.redactSensitiveData(data);

      expect(redacted.users[0].id).toBe('1');
      expect(redacted.users[0].password).toBe('[REDACTED]');
      expect(redacted.users[1].id).toBe('2');
      expect(redacted.users[1].password).toBe('[REDACTED]');
    });

    it('should handle null values', () => {
      const data = {
        password: null,
        username: 'test',
      };

      const redacted = DataRedaction.redactSensitiveData(data);

      expect(redacted.password).toBe('[REDACTED]');
      expect(redacted.username).toBe('test');
    });

    it('should handle undefined values', () => {
      const data = {
        password: undefined,
        username: 'test',
      };

      const redacted = DataRedaction.redactSensitiveData(data);

      expect(redacted.password).toBe('[REDACTED]');
      expect(redacted.username).toBe('test');
    });

    it('should preserve non-sensitive data types', () => {
      const data = {
        count: 42,
        isActive: true,
        tags: ['tag1', 'tag2'],
        metadata: { version: '1.0' },
      };

      const redacted = DataRedaction.redactSensitiveData(data);

      expect(redacted.count).toBe(42);
      expect(redacted.isActive).toBe(true);
      expect(redacted.tags).toEqual(['tag1', 'tag2']);
      expect(redacted.metadata.version).toBe('1.0');
    });
  });

  describe('redactForLogging', () => {
    it('should return redacted JSON string', () => {
      const data = {
        username: 'testuser',
        password: 'secret123',
      };

      const redacted = DataRedaction.redactForLogging(data);

      expect(typeof redacted).toBe('string');
      expect(redacted).toContain('testuser');
      expect(redacted).toContain('[REDACTED]');
      expect(redacted).not.toContain('secret123');
    });

    it('should handle invalid JSON gracefully', () => {
      const circular: any = {};
      circular.self = circular;

      const redacted = DataRedaction.redactForLogging(circular);

      expect(typeof redacted).toBe('string');
      // Should not throw error
    });

    it('should redact deeply nested sensitive data', () => {
      const data = {
        level1: {
          level2: {
            level3: {
              password: 'deep-secret',
              publicInfo: 'visible',
            },
          },
        },
      };

      const redacted = DataRedaction.redactForLogging(data);

      expect(redacted).toContain('[REDACTED]');
      expect(redacted).toContain('visible');
      expect(redacted).not.toContain('deep-secret');
    });
  });

  describe('performance', () => {
    it('should redact large objects efficiently', () => {
      const largeData = {
        users: Array.from({ length: 100 }, (_, i) => ({
          id: `user-${i}`,
          username: `user${i}`,
          password: `password${i}`,
          email: `user${i}@example.com`,
        })),
      };

      const start = performance.now();
      DataRedaction.redactSensitiveData(largeData);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(50); // Should complete in less than 50ms
    });
  });

  describe('edge cases', () => {
    it('should handle empty objects', () => {
      const redacted = DataRedaction.redactSensitiveData({});

      expect(redacted).toEqual({});
    });

    it('should handle objects with no sensitive data', () => {
      const data = {
        name: 'John Doe',
        age: 30,
        city: 'New York',
      };

      const redacted = DataRedaction.redactSensitiveData(data);

      expect(redacted).toEqual(data);
    });

    it('should handle primitive values', () => {
      expect(DataRedaction.redactSensitiveData('test')).toBe('test');
      expect(DataRedaction.redactSensitiveData(123)).toBe(123);
      expect(DataRedaction.redactSensitiveData(true)).toBe(true);
      expect(DataRedaction.redactSensitiveData(null)).toBe(null);
    });
  });
});
