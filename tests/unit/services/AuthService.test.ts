import { AuthService, credentialManager, apiErrorMessage } from '../../../src/services/AuthService.js';
import type { AuthApi } from '../../../src/services/AuthService.js';

// Mock the credentialManager instance methods
jest.spyOn(credentialManager, 'storeToken').mockImplementation(() => Promise.resolve());
jest.spyOn(credentialManager, 'getToken').mockImplementation(() => Promise.resolve(null));
jest.spyOn(credentialManager, 'clearToken').mockImplementation(() => Promise.resolve());
jest.spyOn(credentialManager, 'isTokenValid').mockImplementation(() => Promise.resolve(true));

describe('AuthService', () => {
  let authService: AuthService;
  let mockAuthApi: { login: jest.Mock; register: jest.Mock; me: jest.Mock };
  
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Create mock AuthenticationApi
    mockAuthApi = {
      login: jest.fn(),
      register: jest.fn(),
      me: jest.fn(),
    };
    
    // Create AuthService with mocked API
    authService = new AuthService(mockAuthApi as unknown as AuthApi);
  });

  describe('login', () => {
    it('should authenticate user and store token', async () => {
      // Backend AuthResponse: { token, user: { id, username, email } }
      mockAuthApi.login.mockResolvedValue({
        token: 'token123',
        user: { id: 'user-uuid', email: 'user@example.com', username: 'Test User' }
      });
      (credentialManager.storeToken as jest.Mock).mockResolvedValue(undefined);

      const result = await authService.login('user@example.com', 'password123');
      
      expect(mockAuthApi.login).toHaveBeenCalledWith('user@example.com', 'password123');
      expect(credentialManager.storeToken).toHaveBeenCalledWith('token123');
      expect(result.accessToken).toBe('token123');
      expect(result.user.email).toBe('user@example.com');
      expect(result.user.name).toBe('Test User');
    });

    it('should handle login failure with invalid credentials', async () => {
      const mockError = {
        response: {
          status: 401,
          data: { status: 401, title: 'Unauthorized', detail: 'Invalid credentials' }
        }
      };
      
      mockAuthApi.login.mockRejectedValue(mockError);

      await expect(authService.login('user@example.com', 'wrong-password'))
        .rejects.toThrow('Invalid credentials');
    });

    it('should handle network errors during login', async () => {
      const mockError = new Error('Network error');
      mockAuthApi.login.mockRejectedValue(mockError);

      await expect(authService.login('user@example.com', 'password'))
        .rejects.toThrow('Network error');
    });

    it('should validate email format before login', async () => {
      await expect(authService.login('invalid-email', 'password'))
        .rejects.toThrow('Invalid email format');
      
      expect(mockAuthApi.login).not.toHaveBeenCalled();
    });

    it('should validate password length before login', async () => {
      await expect(authService.login('user@example.com', '123'))
        .rejects.toThrow('Password must be at least 8 characters');
      
      expect(mockAuthApi.login).not.toHaveBeenCalled();
    });
  });

  describe('register', () => {
    it('should register new user and store token', async () => {
      mockAuthApi.register.mockResolvedValue({
        token: 'new-token',
        user: { id: 'new-user-uuid', email: 'newuser@example.com', username: 'New User' }
      });
      (credentialManager.storeToken as jest.Mock).mockResolvedValue(undefined);

      const result = await authService.register('newuser@example.com', 'password123', 'New User', 'new-user');
      
      expect(mockAuthApi.register).toHaveBeenCalledWith({
        email: 'newuser@example.com',
        password: 'password123',
        username: 'new-user',
        fullName: 'New User'
      });
      expect(credentialManager.storeToken).toHaveBeenCalledWith('new-token');
      expect(result.user.email).toBe('newuser@example.com');
    });

    it('shows the backend message, not its internal error code, without a doubled prefix', async () => {
      // Verified 409 body from POST /api/auth/register for an existing email
      mockAuthApi.register.mockRejectedValue({
        response: {
          status: 409,
          data: {
            status: 409, title: 'Duplicate Resource',
            detail: 'Registration failed. Please try a different email or log in.',
            message: 'Registration failed. Please try a different email or log in.',
            extensions: { error: 'DUPLICATE_SLUG' }, error: 'DUPLICATE_SLUG'
          }
        }
      });

      const err = await authService.register('existing@example.com', 'password123', 'Name').catch(e => e);
      expect(err.message).toBe('Registration failed. Please try a different email or log in.');
      expect(err.message).not.toContain('DUPLICATE_SLUG');
    });

    it('surfaces field validation errors from a 400', async () => {
      mockAuthApi.register.mockRejectedValue({
        body: {
          status: 400, title: 'Validation Failed', detail: 'Request validation failed with 1 error(s)',
          validationErrors: { password: 'Password must be at least 8 characters' }
        }
      });

      await expect(authService.register('a@example.com', 'password123', 'Name'))
        .rejects.toThrow(/^Password must be at least 8 characters$/);
    });

    it('rejects an invalid username before calling the backend', async () => {
      await expect(authService.register('a@example.com', 'password123', 'T', 'bad username!!! with spaces'))
        .rejects.toThrow(/Invalid username/);
      await expect(authService.register('a@example.com', 'password123', 'Two Words'))
        .rejects.toThrow(/Invalid username/);
      await expect(authService.register('a@example.com', 'password123', 'T', 'x'))
        .rejects.toThrow(/Invalid username/);
      // The backend requires at least 3 characters even though the pattern allows 2.
      await expect(authService.register('a@example.com', 'password123', 'T', 'ab'))
        .rejects.toThrow(/3 to 64/);
      expect(mockAuthApi.register).not.toHaveBeenCalled();
    });

    it('accepts usernames with dots, dashes and underscores', async () => {
      mockAuthApi.register.mockResolvedValue({ token: 't', user: { id: 'u', email: 'a@example.com', username: 't-1.a_b' } });
      await authService.register('a@example.com', 'password123', 'T', '  t-1.a_b  ');
      expect(mockAuthApi.register).toHaveBeenCalledWith(expect.objectContaining({ username: 't-1.a_b' }));
    });
  });

  describe('apiErrorMessage', () => {
    it('prefers message, then validationErrors, then detail, then the error message', () => {
      expect(apiErrorMessage({ response: { data: { message: 'm', detail: 'd', error: 'CODE' } } })).toBe('m');
      expect(apiErrorMessage({ body: { validationErrors: { a: 'x', b: 'y' }, detail: 'd' } })).toBe('x; y');
      expect(apiErrorMessage({ body: { detail: 'd', error: 'CODE' } })).toBe('d');
      expect(apiErrorMessage({ response: { data: { error: 'CODE' } }, message: 'Request failed with status code 409' }))
        .toBe('Request failed with status code 409');
      expect(apiErrorMessage(new Error('Network error'))).toBe('Network error');
    });
  });

  describe('logout', () => {
    it('should clear stored token', async () => {
      (credentialManager.clearToken as jest.Mock).mockResolvedValue(undefined);

      await authService.logout();
      
      expect(credentialManager.clearToken).toHaveBeenCalled();
    });

    it('should handle logout errors gracefully', async () => {
      (credentialManager.clearToken as jest.Mock).mockRejectedValue(new Error('Clear failed'));

      // Should not throw, just log error
      await expect(authService.logout()).resolves.not.toThrow();
    });
  });

  describe('isAuthenticated', () => {
    it('should return true when valid token exists', async () => {
      (credentialManager.getToken as jest.Mock).mockResolvedValue('valid-token');
      (credentialManager.isTokenValid as jest.Mock).mockResolvedValue(true);

      const result = await authService.isAuthenticated();
      
      expect(result).toBe(true);
    });

    it('should return false when no token exists', async () => {
      (credentialManager.getToken as jest.Mock).mockResolvedValue(null);

      const result = await authService.isAuthenticated();
      
      expect(result).toBe(false);
    });

    it('should return false when token is expired', async () => {
      (credentialManager.getToken as jest.Mock).mockResolvedValue('expired-token');
      (credentialManager.isTokenValid as jest.Mock).mockResolvedValue(false);

      const result = await authService.isAuthenticated();
      
      expect(result).toBe(false);
    });
  });

  describe('getCurrentUser', () => {
    it('should fetch current user profile when authenticated', async () => {
 const mockUser = { id: 'user-uuid', email: 'user@example.com', username: 'Test User' };

      (credentialManager.getToken as jest.Mock).mockResolvedValue('valid-token');
      mockAuthApi.me.mockResolvedValue(mockUser);

      const result = await authService.getCurrentUser();
      
      expect(result.email).toBe('user@example.com');
      expect(result.name).toBe('Test User');
    });

    it('should throw error when not authenticated', async () => {
      (credentialManager.getToken as jest.Mock).mockResolvedValue(null);

      await expect(authService.getCurrentUser())
        .rejects.toThrow('Not authenticated');
      
      expect(mockAuthApi.me).not.toHaveBeenCalled();
    });
  });

  describe('ensureAuthenticated', () => {
    it('should return true when already authenticated', async () => {
      (credentialManager.getToken as jest.Mock).mockResolvedValue('valid-token');
      (credentialManager.isTokenValid as jest.Mock).mockResolvedValue(true);

      const result = await authService.ensureAuthenticated();
      
      expect(result).toBe(true);
    });

    it('should throw error when not authenticated', async () => {
      (credentialManager.getToken as jest.Mock).mockResolvedValue(null);

      await expect(authService.ensureAuthenticated())
        .rejects.toThrow('Authentication required');
    });

    it('should throw error when token is expired and cannot refresh', async () => {
      (credentialManager.getToken as jest.Mock).mockResolvedValue('expired-token');
      (credentialManager.isTokenValid as jest.Mock).mockResolvedValue(false);

      await expect(authService.ensureAuthenticated())
        .rejects.toThrow('Authentication required');
    });
  });
});
