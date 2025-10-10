import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';

/**
 * JWT Token Payload interface
 */
interface JWTPayload {
  sub?: string;
  name?: string;
  email?: string;
  iat?: number;
  exp?: number;
  [key: string]: any;
}

/**
 * Encrypted credentials storage
 */
interface EncryptedCredentials {
  encryptedToken: string;
  iv: string;
  authTag: string;
}

/**
 * CredentialManager handles secure storage and retrieval of authentication tokens
 *
 * Storage strategy:
 * 1. Attempt to use OS keychain via @napi-rs/keyring (primary)
 * 2. Fallback to AES-256-GCM encrypted file at ~/.mujarrad/credentials.json
 *
 * Security features:
 * - OS keychain integration for best security
 * - AES-256-GCM encryption for file fallback
 * - File permissions set to 600 (owner read/write only)
 * - JWT validation and expiry checking
 *
 * Follows Constitution Principle V: Security by Default
 */
export class CredentialManager {
  private configDir: string;
  private credentialsPath: string;
  private serviceName = 'mujarrad-cli';
  private accountName = 'default';

  constructor(configDir?: string) {
    this.configDir = configDir || path.join(os.homedir(), '.mujarrad');
    this.credentialsPath = path.join(this.configDir, 'credentials.json');
  }

  /**
   * Store authentication token securely
   *
   * @param token - JWT token to store
   */
  async storeToken(token: string): Promise<void> {
    try {
      // Try OS keychain first (primary method)
      await this.storeInKeychain(token);
    } catch (keychainError) {
      // Fallback to encrypted file storage
      await this.storeInEncryptedFile(token);
    }
  }

  /**
   * Retrieve authentication token
   *
   * @returns Token string or null if not found
   */
  async getToken(): Promise<string | null> {
    try {
      // Try OS keychain first
      const token = await this.getFromKeychain();
      if (token) {
        return token;
      }
    } catch (keychainError) {
      // Keychain failed, try encrypted file
    }

    // Try encrypted file fallback
    try {
      return await this.getFromEncryptedFile();
    } catch (fileError) {
      return null;
    }
  }

  /**
   * Delete stored token
   */
  async deleteToken(): Promise<void> {
    // Try to delete from both keychain and file
    try {
      await this.deleteFromKeychain();
    } catch (error) {
      // Ignore keychain deletion errors
    }

    try {
      await fs.unlink(this.credentialsPath);
    } catch (error) {
      // Ignore file deletion errors
    }
  }

  /**
   * Clear stored token (alias for deleteToken for backward compatibility)
   */
  async clearToken(): Promise<void> {
    return this.deleteToken();
  }

  /**
   * Check if stored token is valid (not expired)
   *
   * @returns true if token exists and is not expired
   */
  async isTokenValid(): Promise<boolean> {
    const token = await this.getToken();

    if (!token) {
      return false;
    }

    return !this.isTokenExpired(token);
  }

  /**
   * Validate token format (JWT structure: header.payload.signature)
   *
   * @param token - Token to validate
   * @returns true if token has valid JWT structure
   */
  isValidTokenFormat(token: string): boolean {
    if (!token || typeof token !== 'string') {
      return false;
    }

    const parts = token.split('.');
    return parts.length === 3;
  }

  /**
   * Decode JWT token payload without verification
   *
   * @param token - JWT token to decode
   * @returns Decoded payload or null if invalid
   */
  decodeToken(token: string): JWTPayload | null {
    if (!this.isValidTokenFormat(token)) {
      return null;
    }

    try {
      const parts = token.split('.');
      const payload = parts[1];
      const decoded = Buffer.from(payload, 'base64').toString('utf-8');
      return JSON.parse(decoded);
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if token is expired
   *
   * @param token - JWT token to check
   * @returns true if token is expired
   */
  isTokenExpired(token: string): boolean {
    const payload = this.decodeToken(token);
    if (!payload || !payload.exp) {
      return true;
    }

    const now = Math.floor(Date.now() / 1000);
    return payload.exp < now;
  }

  /**
   * Store token in OS keychain using @napi-rs/keyring
   */
  private async storeInKeychain(token: string): Promise<void> {
    try {
      const { AsyncEntry } = await import('@napi-rs/keyring');
      const entry = new AsyncEntry(this.serviceName, this.accountName);
      await entry.setPassword(token);
    } catch (error) {
      throw new Error('Keychain storage failed');
    }
  }

  /**
   * Get token from OS keychain
   */
  private async getFromKeychain(): Promise<string | null> {
    try {
      const { AsyncEntry } = await import('@napi-rs/keyring');
      const entry = new AsyncEntry(this.serviceName, this.accountName);
      const password = await entry.getPassword();
      return password || null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Delete token from OS keychain
   */
  private async deleteFromKeychain(): Promise<void> {
    try {
      const { AsyncEntry } = await import('@napi-rs/keyring');
      const entry = new AsyncEntry(this.serviceName, this.accountName);
      await entry.deletePassword();
    } catch (error) {
      // Ignore deletion errors
    }
  }

  /**
   * Store token in encrypted file (fallback method)
   */
  private async storeInEncryptedFile(token: string): Promise<void> {
    // Ensure directory exists
    await fs.mkdir(this.configDir, { recursive: true });

    // Generate encryption key from system username (deterministic)
    const key = crypto.scryptSync(os.userInfo().username, 'mujarrad-salt', 32);

    // Generate random IV
    const iv = crypto.randomBytes(16);

    // Encrypt using AES-256-GCM
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    let encryptedToken = cipher.update(token, 'utf-8', 'hex');
    encryptedToken += cipher.final('hex');
    const authTag = cipher.getAuthTag();

    // Store encrypted data
    const credentials: EncryptedCredentials = {
      encryptedToken,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };

    await fs.writeFile(
      this.credentialsPath,
      JSON.stringify(credentials, null, 2),
      'utf-8'
    );

    // Set file permissions to 600 (owner read/write only)
    if (process.platform !== 'win32') {
      await fs.chmod(this.credentialsPath, 0o600);
    }
  }

  /**
   * Get token from encrypted file (fallback method)
   */
  private async getFromEncryptedFile(): Promise<string | null> {
    try {
      const content = await fs.readFile(this.credentialsPath, 'utf-8');
      const credentials: EncryptedCredentials = JSON.parse(content);

      // Generate same encryption key
      const key = crypto.scryptSync(os.userInfo().username, 'mujarrad-salt', 32);

      // Decrypt using AES-256-GCM
      const decipher = crypto.createDecipheriv(
        'aes-256-gcm',
        key,
        Buffer.from(credentials.iv, 'hex')
      );
      decipher.setAuthTag(Buffer.from(credentials.authTag, 'hex'));

      let token = decipher.update(credentials.encryptedToken, 'hex', 'utf-8');
      token += decipher.final('utf-8');

      return token;
    } catch (error) {
      return null;
    }
  }
}
