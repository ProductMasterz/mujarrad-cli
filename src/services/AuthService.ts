import type { AuthResult, ApiUser } from '../api/client.js';
import { CredentialManager } from '../config/CredentialManager.js';
import { Logger } from '../utils/Logger.js';

// Create singleton credential manager instance (exported for testing)
export const credentialManager = new CredentialManager();

/**
 * User information returned from authentication
 */
export interface User {
  id: string;
  email: string;
  name: string;
}

/**
 * Login response containing access token and user info
 */
export interface LoginResponse {
  accessToken: string;
  user: User;
}

/**
 * AuthService handles user authentication, registration, and session management
 *
 * Features:
 * - User login with email and password
 * - User registration
 * - Session management with JWT tokens
 * - Token validation and refresh
 * - Logout functionality
 *
 * Follows Constitution Principle III: TDD approach with comprehensive tests
 * Follows Constitution Principle V: Security by Default (secure token storage)
 */
/**
 * The auth calls AuthService needs. MujarradClient implements it.
 */
export interface AuthApi {
  login(email: string, password: string): Promise<AuthResult>;
  register(input: { username: string; email: string; password: string; fullName?: string }): Promise<AuthResult>;
  me(): Promise<ApiUser>;
}

/** Maps the backend's user (username) to the CLI's User (name). Accepts envelope-wrapped bodies too. */
function toUser(apiUser: any): User {
  const u = apiUser?.user ?? apiUser;
  return { id: u?.id, email: u?.email, name: u?.username || u?.name || u?.fullName };
}

/**
 * The user-facing message of a failed API call. Prefers the backend's `message`, then field
 * `validationErrors`, then the problem `detail`; never the internal `error` code (e.g. DUPLICATE_SLUG).
 */
export function apiErrorMessage(error: any): string {
  const d = error?.response?.data ?? error?.body ?? {};
  return (typeof d.message === 'string' && d.message)
    || (d.validationErrors && typeof d.validationErrors === 'object' && Object.values(d.validationErrors).join('; '))
    || (typeof d.detail === 'string' && d.detail)
    || error?.message
    || 'Request failed';
}

/** Usernames: letters, digits, dot, underscore and dash; 2 to 64 characters, starting with a letter or digit. */
export const USERNAME_PATTERN = /^[a-z0-9][a-z0-9._-]{1,63}$/i;

function tokenOf(body: any): string {
  return body?.token || body?.accessToken;
}

export class AuthService {
  private authApi: AuthApi;
  private logger: Logger;

  constructor(authApi: AuthApi, logger?: Logger) {
    this.authApi = authApi;
    this.logger = logger || new Logger({ logLevel: 'info' });
  }

  /**
   * Authenticate user with email and password
   *
   * @param email - User email address
   * @param password - User password
   * @returns Login response with access token and user info
   * @throws Error if authentication fails or validation errors
   */
  async login(email: string, password: string): Promise<LoginResponse> {
    // Validate email format
    if (!this.isValidEmail(email)) {
      throw new Error('Invalid email format');
    }

    // Validate password length
    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters');
    }

    try {
      this.logger.info('Attempting login', { email });

      const loginData: any = await this.authApi.login(email, password);
      const accessToken = tokenOf(loginData);
      if (!accessToken) throw new Error('the server returned no token');
      const user = toUser(loginData.user);

      // Store token securely
      await credentialManager.storeToken(accessToken);

      this.logger.info('Login successful', { userId: user.id, email: user.email });

      return {
        accessToken,
        user
      };
    } catch (error: any) {
      this.logger.error('Login failed', { email, error: error.message });

      // Extract error message from API response
      throw new Error(apiErrorMessage(error));
    }
  }

  /**
   * Register new user account
   *
   * @param email - User email address
   * @param password - User password
   * @param name - User full name
   * @returns Login response with access token and user info
   * @throws Error if registration fails or validation errors
   */
  async register(email: string, password: string, name: string, username?: string): Promise<LoginResponse> {
    // Validate inputs
    if (!this.isValidEmail(email)) {
      throw new Error('Invalid email format');
    }

    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters');
    }

    if (!name || name.trim().length === 0) {
      throw new Error('Name is required');
    }

    const finalUsername = (username || name).trim();
    if (!USERNAME_PATTERN.test(finalUsername)) {
      throw new Error(`Invalid username '${finalUsername}': use 2 to 64 letters, digits, '.', '_' or '-', starting with a letter or digit (pass --username when your name has spaces)`);
    }

    try {
      this.logger.info('Attempting registration', { email, name });

      const registrationData: any = await this.authApi.register({
        email,
        password,
        username: finalUsername,
        fullName: name.trim()
      });
      const accessToken = tokenOf(registrationData);
      if (!accessToken) throw new Error('the server returned no token');
      const user = toUser(registrationData.user);

      // Store token securely
      await credentialManager.storeToken(accessToken);

      this.logger.info('Registration successful', { userId: user.id, email: user.email });

      return {
        accessToken,
        user
      };
    } catch (error: any) {
      this.logger.error('Registration failed', { email, error: error.message });

      // Extract error message from API response
      throw new Error(apiErrorMessage(error));
    }
  }

  /**
   * Logout user and clear stored credentials
   */
  async logout(): Promise<void> {
    try {
      this.logger.info('Logging out user');
      await credentialManager.clearToken();
      this.logger.info('Logout successful');
    } catch (error: any) {
      // Log error but don't throw - logout should always succeed from user perspective
      this.logger.error('Error during logout', { error: error.message });
    }
  }

  /**
   * Check if user is currently authenticated
   *
   * @returns True if valid token exists, false otherwise
   */
  async isAuthenticated(): Promise<boolean> {
    try {
      const token = await credentialManager.getToken();
      
      if (!token) {
        return false;
      }

      // Check if token is still valid (not expired)
      const isValid = await credentialManager.isTokenValid();
      return isValid;
    } catch (error: any) {
      this.logger.error('Error checking authentication', { error: error.message });
      return false;
    }
  }

  /**
   * Get current authenticated user profile
   *
   * @returns User information
   * @throws Error if not authenticated
   */
  async getCurrentUser(): Promise<User> {
    const token = await credentialManager.getToken();
    
    if (!token) {
      throw new Error('Not authenticated');
    }

    try {
      this.logger.debug('Fetching current user profile');

      return toUser(await this.authApi.me());
    } catch (error: any) {
      this.logger.error('Failed to get current user', { error: error.message });
      throw new Error(`Failed to get user profile: ${error.message}`);
    }
  }

  /**
   * Ensure user is authenticated, throw error if not
   *
   * @returns True if authenticated
   * @throws Error if not authenticated or token is expired
   */
  async ensureAuthenticated(): Promise<boolean> {
    const isAuth = await this.isAuthenticated();
    
    if (!isAuth) {
      throw new Error('Authentication required. Please login with: mujarrad auth login');
    }

    return true;
  }

  /**
   * Validate email format using regex
   *
   * @param email - Email address to validate
   * @returns True if valid email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}
