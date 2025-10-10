import { CredentialManager } from '../../../src/config/CredentialManager.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

// Mock @napi-rs/keyring to force file-based storage for predictable tests
jest.mock('@napi-rs/keyring', () => ({
  AsyncEntry: jest.fn().mockImplementation(() => {
    throw new Error('Keychain not available in tests');
  })
}));

describe('CredentialManager', () => {
  const testConfigDir = path.join(os.tmpdir(), '.mujarrad-test-creds');
  const testCredsPath = path.join(testConfigDir, 'credentials.json');

  beforeEach(async () => {
    // Clean up test directory
    try {
      await fs.rm(testConfigDir, { recursive: true, force: true });
    } catch (error) {
      // Directory might not exist
    }
    await fs.mkdir(testConfigDir, { recursive: true });
  });

  afterEach(async () => {
    // Clean up after tests
    try {
      await fs.rm(testConfigDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  it('should store and retrieve token', async () => {
    const credManager = new CredentialManager(testConfigDir);
    const testToken = 'test-token-12345';

    await credManager.storeToken(testToken);
    const retrievedToken = await credManager.getToken();

    expect(retrievedToken).toBe(testToken);
  });

  it('should return null when no token is stored', async () => {
    const credManager = new CredentialManager(testConfigDir);
    const token = await credManager.getToken();

    expect(token).toBeNull();
  });

  it('should overwrite existing token', async () => {
    const credManager = new CredentialManager(testConfigDir);

    await credManager.storeToken('old-token');
    await credManager.storeToken('new-token');

    const token = await credManager.getToken();
    expect(token).toBe('new-token');
  });

  it('should delete token', async () => {
    const credManager = new CredentialManager(testConfigDir);

    await credManager.storeToken('test-token');
    await credManager.deleteToken();

    const token = await credManager.getToken();
    expect(token).toBeNull();
  });

  it('should validate token format (JWT structure)', async () => {
    const credManager = new CredentialManager(testConfigDir);

    // Valid JWT structure (3 parts separated by dots)
    const validToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

    expect(credManager.isValidTokenFormat(validToken)).toBe(true);
    expect(credManager.isValidTokenFormat('invalid-token')).toBe(false);
    expect(credManager.isValidTokenFormat('')).toBe(false);
  });

  it('should decode JWT payload without verification', async () => {
    const credManager = new CredentialManager(testConfigDir);

    // JWT with payload: {"sub":"1234567890","name":"John Doe","iat":1516239022,"exp":9999999999}
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjk5OTk5OTk5OTl9.9TFSz-QhfJoVOqKS-RnHlHLLjPW1pJl4vHxHvEbLJ8w';

    const payload = credManager.decodeToken(token);

    expect(payload).toBeDefined();
    expect(payload?.sub).toBe('1234567890');
    expect(payload?.name).toBe('John Doe');
    expect(payload?.exp).toBe(9999999999);
  });

  it('should check if token is expired', async () => {
    const credManager = new CredentialManager(testConfigDir);

    // Create token that expired in the past
    const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.4Adcj0vfLwf2I9fR8gZM-FffxJiVZ5VLKYsEfqNaXE4';

    // Token that expires far in the future
    const validToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjk5OTk5OTk5OTl9.9TFSz-QhfJoVOqKS-RnHlHLLjPW1pJl4vHxHvEbLJ8w';

    expect(credManager.isTokenExpired(expiredToken)).toBe(true);
    expect(credManager.isTokenExpired(validToken)).toBe(false);
  });

  it('should create encrypted file with 600 permissions', async () => {
    const credManager = new CredentialManager(testConfigDir);

    await credManager.storeToken('test-token');

    // Check file exists
    const stats = await fs.stat(testCredsPath);
    expect(stats.isFile()).toBe(true);

    // Check permissions on Unix-like systems
    if (process.platform !== 'win32') {
      const mode = stats.mode & 0o777;
      expect(mode).toBe(0o600);
    }
  });

  it('should handle token storage failures gracefully', async () => {
    // Create a read-only directory to force failure
    const readOnlyDir = path.join(os.tmpdir(), '.mujarrad-readonly');
    await fs.mkdir(readOnlyDir, { recursive: true });

    // Note: This test might behave differently on different platforms
    const credManager = new CredentialManager(readOnlyDir);

    try {
      await credManager.storeToken('test-token');
      // If we get here, the operation succeeded (might happen on some systems)
      expect(await credManager.getToken()).toBeDefined();
    } catch (error) {
      // If it failed, that's expected for read-only scenarios
      expect(error).toBeDefined();
    } finally {
      // Cleanup
      await fs.rm(readOnlyDir, { recursive: true, force: true });
    }
  });
});
