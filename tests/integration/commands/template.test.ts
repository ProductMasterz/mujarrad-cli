import { Command } from 'commander';
import { templateCommand } from '../../../src/commands/template.js';

/**
 * Template Command Integration Tests (TDD - Tests First)
 *
 * Task 8.3: Implement template CLI Commands
 * User Story 4: Template System
 *
 * Tests FR-055, FR-056
 */

// Mock chalk and ora
jest.mock('chalk', () => ({
  default: {
    blue: (str: string) => str,
    green: (str: string) => str,
    yellow: (str: string) => str,
    red: (str: string) => str,
    gray: (str: string) => str,
    white: (str: string) => str
  },
  blue: (str: string) => str,
  green: (str: string) => str,
  yellow: (str: string) => str,
  red: (str: string) => str,
  gray: (str: string) => str,
  white: (str: string) => str
}));

const mockSpinner = {
  start: jest.fn().mockReturnThis(),
  stop: jest.fn().mockReturnThis(),
  succeed: jest.fn().mockReturnThis(),
  fail: jest.fn().mockReturnThis(),
  warn: jest.fn().mockReturnThis(),
  isSpinning: false
};

jest.mock('ora', () => jest.fn(() => mockSpinner));

jest.mock('fs/promises', () => ({
  stat: jest.fn(),
  readdir: jest.fn(),
  mkdir: jest.fn()
}));

jest.mock('../../../src/config/ConfigManager.js', () => ({
  ConfigManager: jest.fn().mockImplementation(() => ({
    load: jest.fn().mockResolvedValue({ apiBaseUrl: 'http://localhost:8080' })
  }))
}));

jest.mock('../../../src/config/CredentialManager.js', () => ({
  CredentialManager: jest.fn().mockImplementation(() => ({
    getToken: jest.fn().mockResolvedValue('mock-token')
  }))
}));


describe('template command', () => {
  let program: Command;
  let consoleLogSpy: jest.SpyInstance;
  let consoleTableSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    program = new Command();
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleTableSpy = jest.spyOn(console, 'table').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    // Clear all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleTableSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('template list', () => {
    it('should list available templates', async () => {
      const mockTemplates = [
        {
          id: 'template-uuid-001',
          name: 'Business Model Canvas',
          description: '9-block business model framework',
          tags: ['business', 'strategy'],
          isPublic: true,
          usageCount: 127,
          contextTemplatesCount: 9
        },
        {
          id: 'template-uuid-002',
          name: 'Value Proposition Canvas',
          description: 'Customer-focused value proposition framework',
          tags: ['business', 'value'],
          isPublic: true,
          usageCount: 85,
          contextTemplatesCount: 5
        }
      ];

      // Mock TemplateService.list
      const mockTemplateService = {
        list: jest.fn().mockResolvedValue(mockTemplates)
      };

      // Setup command
      templateCommand(program, mockTemplateService as any);

      // Parse and execute command
      await program.parseAsync(['node', 'test', 'template', 'list']);

      expect(mockTemplateService.list).toHaveBeenCalledWith({ scope: 'public' });
      expect(consoleTableSpy).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            Name: 'Business Model Canvas',
            Description: '9-block business model framework',
            Tags: 'business, strategy',
            'Usage Count': 127,
            Contexts: 9
          }),
          expect.objectContaining({
            Name: 'Value Proposition Canvas'
          })
        ])
      );
    });

    it('should handle empty template list', async () => {
      const mockTemplateService = {
        list: jest.fn().mockResolvedValue([])
      };

      templateCommand(program, mockTemplateService as any);

      await program.parseAsync(['node', 'test', 'template', 'list']);

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('No templates found'));
    });

  });

  describe('template clone', () => {
    it('should clone from template with required options', async () => {
      const mockWorkflow = {
        execute: jest.fn().mockResolvedValue({
          success: true,
          workspaceId: 'new-workspace-uuid',
          workspaceSlug: 'my-startup',
          totalNodes: 15,
          totalErrors: 0,
          duration: 2000
        })
      };

      const mockTemplateService = {
        list: jest.fn() // Not used in clone, but part of interface
      };

      templateCommand(program, mockTemplateService as any, mockWorkflow as any);

      await program.parseAsync([
        'node',
        'test',
        'template',
        'clone',
        '/tmp/test-vault',
        '--template',
        'template-uuid-001',
        '--name',
        'My Startup'
      ]);

      expect(mockWorkflow.execute).toHaveBeenCalledWith(
        'template-uuid-001',
        expect.objectContaining({
          workspaceName: 'My Startup',
          placeholders: {}
        }),
        '/tmp/test-vault'
      );
    });

    it('should clone with description option', async () => {
      const mockWorkflow = {
        execute: jest.fn().mockResolvedValue({
          success: true,
          workspaceId: 'new-workspace-uuid',
          workspaceSlug: 'my-startup',
          totalNodes: 15,
          totalErrors: 0,
          duration: 2000
        })
      };

      const mockTemplateService = {
        list: jest.fn()
      };

      templateCommand(program, mockTemplateService as any, mockWorkflow as any);

      await program.parseAsync([
        'node',
        'test',
        'template',
        'clone',
        '/tmp/test-vault',
        '--template',
        'template-uuid-001',
        '--name',
        'My Startup',
        '--description',
        'My startup workspace'
      ]);

      expect(mockWorkflow.execute).toHaveBeenCalledWith(
        'template-uuid-001',
        expect.objectContaining({
          workspaceName: 'My Startup',
          workspaceDescription: 'My startup workspace'
        }),
        '/tmp/test-vault'
      );
    });

  });
});
