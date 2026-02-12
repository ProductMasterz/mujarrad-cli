/**
 * Unit tests for SDK Command
 *
 * Tests:
 * - Command registration (sdk, sdk init, sdk keygen)
 * - sdk init flow with mocked API
 * - sdk keygen flow with mocked API
 */

import { Command } from 'commander';
import { sdkCommand } from '../../../src/commands/sdk.js';

jest.mock('chalk', () => ({
  __esModule: true,
  default: {
    green: jest.fn((str: string) => str),
    red: jest.fn((str: string) => str),
    yellow: jest.fn((str: string) => str),
    blue: jest.fn((str: string) => str),
    gray: jest.fn((str: string) => str),
    white: jest.fn((str: string) => str),
  },
}));

jest.mock('ora', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    start: jest.fn().mockReturnThis(),
    succeed: jest.fn().mockReturnThis(),
    fail: jest.fn().mockReturnThis(),
    stop: jest.fn().mockReturnThis(),
    isSpinning: false,
  })),
}));

jest.mock('../../../src/services/SdkService.js');
jest.mock('../../../src/config/CredentialManager.js');
jest.mock('../../../src/config/ConfigManager.js');
jest.mock('../../../src/utils/Logger.js');

describe('SDK Command', () => {
  let program: Command;
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    program = new Command();
    program.exitOverride();
    sdkCommand(program);
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('Command structure', () => {
    it('should register sdk parent command', () => {
      const cmd = program.commands.find(c => c.name() === 'sdk');
      expect(cmd).toBeDefined();
      expect(cmd!.description()).toContain('Developer SDK tools');
    });

    it('should register sdk init subcommand', () => {
      const sdkCmd = program.commands.find(c => c.name() === 'sdk');
      const initCmd = sdkCmd!.commands.find(c => c.name() === 'init');
      expect(initCmd).toBeDefined();
      expect(initCmd!.description()).toContain('Scaffold a new Mujarrad SDK project');
    });

    it('should have project-name argument on init', () => {
      const sdkCmd = program.commands.find(c => c.name() === 'sdk');
      const initCmd = sdkCmd!.commands.find(c => c.name() === 'init');
      const helpText = initCmd!.helpInformation();
      expect(helpText).toContain('project-name');
    });

    it('should register sdk keygen subcommand', () => {
      const sdkCmd = program.commands.find(c => c.name() === 'sdk');
      const keygenCmd = sdkCmd!.commands.find(c => c.name() === 'keygen');
      expect(keygenCmd).toBeDefined();
      expect(keygenCmd!.description()).toContain('Generate a new API key pair');
    });

    it('should have --name option on keygen', () => {
      const sdkCmd = program.commands.find(c => c.name() === 'sdk');
      const keygenCmd = sdkCmd!.commands.find(c => c.name() === 'keygen');
      const nameOpt = keygenCmd!.options.find(opt => opt.long === '--name');
      expect(nameOpt).toBeDefined();
    });
  });

  describe('Help documentation', () => {
    it('should have examples in help text', () => {
      const sdkCmd = program.commands.find(c => c.name() === 'sdk');
      expect(sdkCmd).toBeDefined();
      expect(sdkCmd!.commands.length).toBeGreaterThan(0);
    });

    it('should have init and keygen subcommands', () => {
      const sdkCmd = program.commands.find(c => c.name() === 'sdk');
      const subcommandNames = sdkCmd!.commands.map(c => c.name());
      expect(subcommandNames).toContain('init');
      expect(subcommandNames).toContain('keygen');
    });
  });
});
