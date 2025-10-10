import { AuthService, credentialManager } from '../../../src/services/AuthService.js';
import { AuthenticationApi } from '../../../src/api/generated/api.js';

// Mock the credentialManager instance methods
jest.spyOn(credentialManager, 'storeToken').mockImplementation(() => Promise.resolve());
jest.spyOn(credentialManager, 'getToken').mockImplementation(() => Promise.resolve(null));
jest.spyOn(credentialManager, 'clearToken').mockImplementation(() => Promise.resolve());
jest.spyOn(credentialManager, 'isTokenValid').mockImplementation(() => Promise.resolve(true));

describe('AuthService', () => {
  let authService: AuthService;
  let mockAuthApi: jest.Mocked<AuthenticationApi>;
  
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Create mock AuthenticationApi
    mockAuthApi = {
      loginUser: jest.fn(),
      registerUser: jest.fn(),
      getCurrentUser: jest.fn(),
    } as any;
    
    // Create AuthService with mocked API
    authService = new AuthService(mockAuthApi);
  });

  describe('login', () => {
    it('should authenticate user and store token', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            accessToken: 'token123',
            user: { id: 'user-uuid', email: 'user@example.com', name: 'Test User' }
          }
        }
      };
      
      mockAuthApi.loginUser.mockResolvedValue(mockResponse as any);
      (credentialManager.storeToken as jest.Mock).mockResolvedValue(undefined);

      const result = await authService.login('user@example.com', 'password123');
      
      expect(mockAuthApi.loginUser).toHaveBeenCalledWith({
        email: 'user@example.com',
        password: 'password123'
      });
      expect(credentialManager.storeToken).toHaveBeenCalledWith('token123');
      expect(result.accessToken).toBe('token123');
      expect(result.user.email).toBe('user@example.com');
    });

    it('should handle login failure with invalid credentials', async () => {
      const mockError = {
        response: {
          status: 401,
          data: { error: 'Invalid credentials' }
        }
      };
      
      mockAuthApi.loginUser.mockRejectedValue(mockError);

      await expect(authService.login('user@example.com', 'wrong-password'))
        .rejects.toThrow('Authentication failed: Invalid credentials');
    });

    it('should handle network errors during login', async () => {
      const mockError = new Error('Network error');
      mockAuthApi.loginUser.mockRejectedValue(mockError);

      await expect(authService.login('user@example.com', 'password'))
        .rejects.toThrow('Authentication failed: Network error');
    });

    it('should validate email format before login', async () => {
      await expect(authService.login('invalid-email', 'password'))
        .rejects.toThrow('Invalid email format');
      
      expect(mockAuthApi.loginUser).not.toHaveBeenCalled();
    });

    it('should validate password length before login', async () => {
      await expect(authService.login('user@example.com', '123'))
        .rejects.toThrow('Password must be at least 8 characters');
      
      expect(mockAuthApi.loginUser).not.toHaveBeenCalled();
    });
  });

  describe('register', () => {
    it('should register new user and store token', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            accessToken: 'new-token',
            user: { id: 'new-user-uuid', email: 'newuser@example.com', name: 'New User' }
          }
        }
      };
      
      mockAuthApi.registerUser.mockResolvedValue(mockResponse as any);
      (credentialManager.storeToken as jest.Mock).mockResolvedValue(undefined);

      const result = await authService.register('newuser@example.com', 'password123', 'New User');
      
      expect(mockAuthApi.registerUser).toHaveBeenCalledWith({
        email: 'newuser@example.com',
        password: 'password123',
        username: 'New User'
      });
      expect(credentialManager.storeToken).toHaveBeenCalledWith('new-token');
      expect(result.user.email).toBe('newuser@example.com');
    });

    it('should handle registration failure with existing email', async () => {
      const mockError = {
        response: {
          status: 409,
          data: { error: 'Email already exists' }
        }
      };
      
      mockAuthApi.registerUser.mockRejectedValue(mockError);

      await expect(authService.register('existing@example.com', 'password', 'Name'))
        .rejects.toThrow('Registration failed: Email already exists');
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
      const mockUser = {
        data: {
          success: true,
          data: {
            id: 'user-uuid',
            email: 'user@example.com',
            name: 'Test User'
          }
        }
      };
      
      (credentialManager.getToken as jest.Mock).mockResolvedValue('valid-token');
      mockAuthApi.getCurrentUser.mockResolvedValue(mockUser as any);

      const result = await authService.getCurrentUser();
      
      expect(result.email).toBe('user@example.com');
      expect(result.name).toBe('Test User');
    });

    it('should throw error when not authenticated', async () => {
      (credentialManager.getToken as jest.Mock).mockResolvedValue(null);

      await expect(authService.getCurrentUser())
        .rejects.toThrow('Not authenticated');
      
      expect(mockAuthApi.getCurrentUser).not.toHaveBeenCalled();
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
