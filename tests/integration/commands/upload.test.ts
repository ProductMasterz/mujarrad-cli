import { uploadCommand } from '../../../src/commands/upload.js';
import { Command } from 'commander';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

// Mock UploadService
jest.mock('../../../src/services/UploadService.js', () => {
  return {
    UploadService: jest.fn().mockImplementation(() => ({
      uploadVault: jest.fn()
    }))
  };
});

// Mock CredentialManager
jest.mock('../../../src/config/CredentialManager.js', () => {
  return {
    CredentialManager: jest.fn().mockImplementation(() => ({
      getToken: jest.fn()
    }))
  };
});

// Mock Logger
jest.mock('../../../src/utils/Logger.js', () => {
  return {
    Logger: jest.fn().mockImplementation(() => ({
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn()
    }))
  };
});

// Mock ora
jest.mock('ora', () => {
  return jest.fn(() => ({
    start: jest.fn().mockReturnThis(),
    succeed: jest.fn().mockReturnThis(),
    fail: jest.fn().mockReturnThis(),
    warn: jest.fn().mockReturnThis(),
    stop: jest.fn().mockReturnThis(),
    isSpinning: false
  }));
});

// Mock cli-progress
jest.mock('cli-progress', () => {
  return {
    SingleBar: jest.fn().mockImplementation(() => ({
      start: jest.fn(),
      update: jest.fn(),
      stop: jest.fn()
    }))
  };
});

// Mock chalk
jest.mock('chalk', () => {
  const mockChalk: any = (text: string) => text;
  mockChalk.blue = (text: string) => text;
  mockChalk.green = (text: string) => text;
  mockChalk.yellow = (text: string) => text;
  mockChalk.red = (text: string) => text;
  mockChalk.gray = (text: string) => text;
  mockChalk.white = (text: string) => text;
  mockChalk.cyan = (text: string) => text;
  return { default: mockChalk };
});

describe('upload command', () => {
  let program: Command;
  let mockUploadService: any;
  let tempVaultDir: string;
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Create temp vault directory
    tempVaultDir = path.join(os.tmpdir(), `mujarrad-test-vault-${Date.now()}`);
    await fs.mkdir(tempVaultDir, { recursive: true });

    // Create a sample file
    await fs.writeFile(
      path.join(tempVaultDir, 'note.md'),
      '# Test Note\n\nThis is a test.'
    );

    // Mock console methods
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    // Create new Commander program
    program = new Command();
    program.exitOverride(); // Prevent process.exit() from actually exiting

    // Create mock upload service
    mockUploadService = {
      uploadVault: jest.fn().mockResolvedValue({
        success: true,
        totalNodesCreated: 10,
        totalErrors: 0,
        sessionId: 'session-123',
        duration: 5000
      })
    };

    // Mock CredentialManager to return valid token
    const { CredentialManager } = require('../../../src/config/CredentialManager.js');
    CredentialManager.mockImplementation(() => ({
      getToken: jest.fn().mockResolvedValue('valid-token')
    }));

    // Register command with mock service
    uploadCommand(program, mockUploadService);
  });

  afterEach(async () => {
    // Cleanup temp vault
    await fs.rm(tempVaultDir, { recursive: true, force: true });

    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('upload vault', () => {
    it('should upload vault successfully', async () => {
      await program.parseAsync(['node', 'test', 'upload', tempVaultDir, '--workspace', 'my-workspace']);

      expect(mockUploadService.uploadVault).toHaveBeenCalledWith(
        'my-workspace',
        tempVaultDir,
        50 // default batch size
      );

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Upload complete')
      );
    });

    it('should use custom batch size when provided', async () => {
      await program.parseAsync([
        'node',
        'test',
        'upload',
        tempVaultDir,
        '--workspace',
        'my-workspace',
        '--batch-size',
        '100'
      ]);

      expect(mockUploadService.uploadVault).toHaveBeenCalledWith(
        'my-workspace',
        tempVaultDir,
        100
      );
    });

    it('should support short option for workspace', async () => {
      await program.parseAsync(['node', 'test', 'upload', tempVaultDir, '-w', 'my-workspace']);

      expect(mockUploadService.uploadVault).toHaveBeenCalledWith(
        'my-workspace',
        tempVaultDir,
        50
      );
    });

    it('should handle authentication failure', async () => {
      const { CredentialManager } = require('../../../src/config/CredentialManager.js');
      CredentialManager.mockImplementation(() => ({
        getToken: jest.fn().mockResolvedValue(null)
      }));

      // Re-register command with updated mock
      program = new Command();
      program.exitOverride();
      uploadCommand(program, mockUploadService);

      try {
        await program.parseAsync(['node', 'test', 'upload', tempVaultDir, '-w', 'my-workspace']);
      } catch (error: any) {
        expect(error.exitCode).toBe(1);
      }

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Not authenticated')
      );
    });

    it('should handle non-existent vault path', async () => {
      const nonExistentPath = '/nonexistent/vault/path';

      try {
        await program.parseAsync(['node', 'test', 'upload', nonExistentPath, '-w', 'my-workspace']);
      } catch (error: any) {
        expect(error.exitCode).toBe(1);
      }

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Vault path does not exist')
      );
    });

    it('should handle invalid batch size', async () => {
      try {
        await program.parseAsync([
          'node',
          'test',
          'upload',
          tempVaultDir,
          '-w',
          'my-workspace',
          '--batch-size',
          'invalid'
        ]);
      } catch (error: any) {
        expect(error.exitCode).toBe(1);
      }

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid batch size')
      );
    });

    it('should display errors when upload has failures', async () => {
      mockUploadService.uploadVault.mockResolvedValue({
        success: false,
        totalNodesCreated: 5,
        totalErrors: 3,
        sessionId: 'session-456',
        duration: 3000
      });

      await program.parseAsync(['node', 'test', 'upload', tempVaultDir, '-w', 'my-workspace']);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Errors: 3')
      );
    });

    it('should handle upload service errors', async () => {
      mockUploadService.uploadVault.mockRejectedValue(
        new Error('Network connection failed')
      );

      try {
        await program.parseAsync(['node', 'test', 'upload', tempVaultDir, '-w', 'my-workspace']);
      } catch (error: any) {
        expect(error.exitCode).toBe(1);
      }

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Upload failed'),
        'Network connection failed'
      );
    });
  });
});
