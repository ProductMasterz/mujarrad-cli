import { AuthenticationApi } from '../api/generated/api.js';
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
export class AuthService {
  private authApi: AuthenticationApi;
  private logger: Logger;

  constructor(authApi: AuthenticationApi, logger?: Logger) {
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

      const response = await this.authApi.loginUser({
        email,
        password
      });

      // Extract data from API response
      const loginData = response.data as any;
      const accessToken = loginData.token; // API returns 'token' not 'accessToken'
      const apiUser = loginData.user;

      // Map API user to our User interface (username -> name)
      const user: User = {
        id: apiUser.id,
        email: apiUser.email,
        name: apiUser.username // API uses 'username' field
      };

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
      const errorMessage = error.response?.data?.error || error.message;
      throw new Error(`Authentication failed: ${errorMessage}`);
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
  async register(email: string, password: string, name: string): Promise<LoginResponse> {
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

    try {
      this.logger.info('Attempting registration', { email, name });

      const response = await this.authApi.registerUser({
        email,
        password,
        username: name
      });

      // Extract data from API response
      const registrationData = response.data as any;
      const accessToken = registrationData.token; // API returns 'token' not 'accessToken'
      const apiUser = registrationData.user;

      // Map API user to our User interface (username -> name)
      const user: User = {
        id: apiUser.id,
        email: apiUser.email,
        name: apiUser.username // API uses 'username' field
      };

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
      const errorMessage = error.response?.data?.error || error.message;
      throw new Error(`Registration failed: ${errorMessage}`);
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

      const response = await this.authApi.getCurrentUser();
      const apiUser = response.data as any;

      // Map API user to our User interface (username -> name)
      const user: User = {
        id: apiUser.id,
        email: apiUser.email,
        name: apiUser.username || apiUser.name // API uses 'username' field
      };

      return user;
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
