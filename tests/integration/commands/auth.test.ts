import { AuthService } from '../../../src/services/AuthService.js';
import { authCommand } from '../../../src/commands/auth.js';
import { Command } from 'commander';
import inquirer from 'inquirer';

// Mock AuthService methods
jest.mock('../../../src/services/AuthService.js', () => {
  const actualAuthService = jest.requireActual('../../../src/services/AuthService.js');
  return {
    ...actualAuthService,
    credentialManager: {
      getToken: jest.fn(),
      storeToken: jest.fn(),
      clearToken: jest.fn(),
      isTokenValid: jest.fn()
    }
  };
});

// Mock inquirer
jest.mock('inquirer', () => ({
  default: {
    prompt: jest.fn()
  },
  prompt: jest.fn()
}));

// Mock chalk
jest.mock('chalk', () => {
  const mockChalk: any = (text: string) => text;
  mockChalk.blue = (text: string) => text;
  mockChalk.green = (text: string) => text;
  mockChalk.red = (text: string) => text;
  mockChalk.yellow = (text: string) => text;
  mockChalk.gray = (text: string) => text;
  return { default: mockChalk };
});

describe('auth command', () => {
  let program: Command;
  let mockAuthService: jest.Mocked<AuthService>;
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let mockPrompt: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    // Get mock function reference
    mockPrompt = inquirer.prompt as any;

    // Suppress console output in tests
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    // Create fresh program instance
    program = new Command();
    program.exitOverride(); // Prevent process exit during tests

    // Mock AuthService instance
    mockAuthService = {
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      isAuthenticated: jest.fn(),
      getCurrentUser: jest.fn(),
      ensureAuthenticated: jest.fn()
    } as any;

    // Setup auth command with mocked service
    authCommand(program, mockAuthService);
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('auth login', () => {
    it('should prompt for credentials and authenticate successfully', async () => {
      const mockAnswers = {
        email: 'user@example.com',
        password: 'password123'
      };

      mockPrompt.mockResolvedValue(mockAnswers);
      mockAuthService.login.mockResolvedValue({
        accessToken: 'token123',
        user: { id: 'user-id', email: 'user@example.com', name: 'Test User' }
      });

      await program.parseAsync(['node', 'test', 'auth', 'login']);

      expect(mockPrompt).toHaveBeenCalled();

      expect(mockAuthService.login).toHaveBeenCalledWith('user@example.com', 'password123');
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('successfully'));
    });

    it('should show helpful error for invalid credentials', async () => {
      const mockAnswers = {
        email: 'user@example.com',
        password: 'wrongpassword'
      };

      mockPrompt.mockResolvedValue(mockAnswers);
      mockAuthService.login.mockRejectedValue(new Error('Authentication failed: Invalid credentials'));

      try {
        await program.parseAsync(['node', 'test', 'auth', 'login']);
      } catch (error: any) {
        // Commander throws CommanderError with exitCode
        expect(error.exitCode).toBe(1);
      }

      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid credentials'));
    });

    it('should handle network errors gracefully', async () => {
      const mockAnswers = {
        email: 'user@example.com',
        password: 'password123'
      };

      mockPrompt.mockResolvedValue(mockAnswers);
      mockAuthService.login.mockRejectedValue(new Error('Network error'));

      try {
        await program.parseAsync(['node', 'test', 'auth', 'login']);
      } catch (error: any) {
        expect(error.exitCode).toBe(1);
      }

      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Network error'));
    });

    it('should validate email format before submission', async () => {
      const mockAnswers = {
        email: 'invalid-email',
        password: 'password123'
      };

      mockPrompt.mockResolvedValue(mockAnswers);
      mockAuthService.login.mockRejectedValue(new Error('Invalid email format'));

      try {
        await program.parseAsync(['node', 'test', 'auth', 'login']);
      } catch (error: any) {
        expect(error.exitCode).toBe(1);
      }

      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid email'));
    });
  });

  describe('auth register', () => {
    it('should prompt for user details and register successfully', async () => {
      const mockAnswers = {
        email: 'newuser@example.com',
        password: 'password123',
        confirmPassword: 'password123',
        name: 'New User'
      };

      mockPrompt.mockResolvedValue(mockAnswers);
      mockAuthService.register.mockResolvedValue({
        accessToken: 'token123',
        user: { id: 'user-id', email: 'newuser@example.com', name: 'New User' }
      });

      await program.parseAsync(['node', 'test', 'auth', 'register']);

      expect(mockPrompt).toHaveBeenCalled();
      expect(mockAuthService.register).toHaveBeenCalledWith('newuser@example.com', 'password123', 'New User');
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('successfully'));
    });

    it('should handle registration failure with existing email', async () => {
      const mockAnswers = {
        email: 'existing@example.com',
        password: 'password123',
        confirmPassword: 'password123',
        name: 'Test User'
      };

      mockPrompt.mockResolvedValue(mockAnswers);
      mockAuthService.register.mockRejectedValue(new Error('Registration failed: Email already exists'));

      try {
        await program.parseAsync(['node', 'test', 'auth', 'register']);
      } catch (error: any) {
        expect(error.exitCode).toBe(1);
      }

      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Email already exists'));
    });

    it('should validate password match before registration', async () => {
      const mockAnswers = {
        email: 'user@example.com',
        password: 'password123',
        confirmPassword: 'different',
        name: 'Test User'
      };

      mockPrompt.mockResolvedValue(mockAnswers);

      try {
        await program.parseAsync(['node', 'test', 'auth', 'register']);
      } catch (error: any) {
        expect(error.exitCode).toBe(1);
      }

      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Passwords do not match'));
      expect(mockAuthService.register).not.toHaveBeenCalled();
    });
  });

  describe('auth logout', () => {
    it('should logout and clear credentials', async () => {
      mockAuthService.logout.mockResolvedValue(undefined);

      await program.parseAsync(['node', 'test', 'auth', 'logout']);

      expect(mockAuthService.logout).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('logged out'));
    });

    it('should handle logout errors gracefully', async () => {
      mockAuthService.logout.mockRejectedValue(new Error('Logout failed'));

      // Logout should not throw even if it fails
      await program.parseAsync(['node', 'test', 'auth', 'logout']);

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('logged out'));
    });
  });

  describe('auth status', () => {
    it('should show authenticated status with user info', async () => {
      mockAuthService.isAuthenticated.mockResolvedValue(true);
      mockAuthService.getCurrentUser.mockResolvedValue({
        id: 'user-id',
        email: 'user@example.com',
        name: 'Test User'
      });

      await program.parseAsync(['node', 'test', 'auth', 'status']);

      expect(mockAuthService.isAuthenticated).toHaveBeenCalled();
      expect(mockAuthService.getCurrentUser).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Authenticated'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('user@example.com'));
    });

    it('should show not authenticated status', async () => {
      mockAuthService.isAuthenticated.mockResolvedValue(false);

      await program.parseAsync(['node', 'test', 'auth', 'status']);

      expect(mockAuthService.isAuthenticated).toHaveBeenCalled();
      expect(mockAuthService.getCurrentUser).not.toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Not authenticated'));
    });

    it('should handle errors when fetching user info', async () => {
      mockAuthService.isAuthenticated.mockResolvedValue(true);
      mockAuthService.getCurrentUser.mockRejectedValue(new Error('Failed to fetch user'));

      try {
        await program.parseAsync(['node', 'test', 'auth', 'status']);
      } catch (error: any) {
        expect(error.exitCode).toBe(1);
      }

      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to fetch user'));
    });
  });
});
