/**
 * Integration tests for Help Workflow
 *
 * Tests that all commands have comprehensive help:
 * - At least 2 examples (FR-031)
 * - Clear descriptions
 * - Proper documentation
 */

import { Command } from 'commander';
import { authCommand } from '../../src/commands/auth.js';
import { uploadCommand } from '../../src/commands/upload.js';
import { cloneCommand } from '../../src/commands/clone.js';
import { syncCommand } from '../../src/commands/sync.js';
import { templateCommand } from '../../src/commands/template.js';

// Mock dependencies
jest.mock('chalk', () => ({
  __esModule: true,
  default: {
    green: jest.fn((str: string) => str),
    red: jest.fn((str: string) => str),
    yellow: jest.fn((str: string) => str),
    blue: jest.fn((str: string) => str),
    cyan: jest.fn((str: string) => str),
    gray: jest.fn((str: string) => str),
    bold: jest.fn((str: string) => str),
  },
}));

jest.mock('inquirer', () => ({
  __esModule: true,
  default: {
    prompt: jest.fn(),
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

describe('Help Workflow Integration', () => {
  let program: Command;

  beforeEach(() => {
    program = new Command();
    program
      .name('mujarrad')
      .description('Obsidian Knowledge Graph Integration with Mujarrad')
      .version('1.0.0');

    // Register all commands
    authCommand(program);
    uploadCommand(program);
    cloneCommand(program);
    syncCommand(program);
    templateCommand(program);
  });

  describe('Global help (FR-031 compliance)', () => {
    it('should have at least 2 examples in global help', () => {
      const helpText = program.helpInformation();

      // Count example lines (lines starting with $)
      const exampleLines = helpText.split('\n').filter(line => line.trim().startsWith('$'));

      expect(exampleLines.length).toBeGreaterThanOrEqual(2);
    });

    it('should include documentation link', () => {
      const helpText = program.helpInformation();

      expect(helpText).toContain('www.mujarrad.com');
    });

    it('should include troubleshooting section', () => {
      const helpText = program.helpInformation();

      expect(helpText.toLowerCase()).toContain('troubleshooting');
    });
  });

  describe('Command help (FR-031 compliance)', () => {
    const commandTests = [
      { name: 'auth', command: authCommand },
      { name: 'upload', command: uploadCommand },
      { name: 'clone', command: cloneCommand },
      { name: 'sync', command: syncCommand },
      { name: 'template', command: templateCommand },
    ];

    commandTests.forEach(({ name }) => {
      it(`${name} command should have at least 2 examples`, () => {
        const cmd = program.commands.find(c => c.name() === name);
        expect(cmd).toBeDefined();

        const helpText = cmd!.helpInformation();

        // Count example lines (lines starting with $)
        const exampleLines = helpText.split('\n').filter(line => line.trim().startsWith('$'));

        expect(exampleLines.length).toBeGreaterThanOrEqual(2);
      });

      it(`${name} command should have notes section`, () => {
        const cmd = program.commands.find(c => c.name() === name);
        expect(cmd).toBeDefined();

        const helpText = cmd!.helpInformation();
        const lowerText = helpText.toLowerCase();

        expect(lowerText.includes('notes:') || lowerText.includes('note:')).toBe(true);
      });
    });
  });

  describe('Help accessibility', () => {
    it('should provide help for all registered commands', () => {
      const commands = ['auth', 'upload', 'clone', 'sync', 'template'];

      commands.forEach(cmdName => {
        const cmd = program.commands.find(c => c.name() === cmdName);
        expect(cmd).toBeDefined();

        const helpText = cmd!.helpInformation();
        expect(helpText.length).toBeGreaterThan(100);
      });
    });

    it('should format help text consistently', () => {
      const commands = program.commands;

      commands.forEach(cmd => {
        const helpText = cmd.helpInformation();

        // Should have Usage section
        expect(helpText).toContain('Usage:');

        // Should have description
        expect(cmd.description()).toBeTruthy();
        expect(cmd.description().length).toBeGreaterThan(10);
      });
    });
  });

  describe('Example quality', () => {
    it('should have realistic command examples', () => {
      const helpText = program.helpInformation();

      // Examples should use actual command names
      expect(helpText).toContain('mujarrad auth');
      expect(helpText).toContain('mujarrad upload');
      expect(helpText).toContain('mujarrad clone');
      expect(helpText).toContain('mujarrad sync');
    });

    it('should include workspace parameter in examples', () => {
      const uploadCmd = program.commands.find(c => c.name() === 'upload');
      const helpText = uploadCmd!.helpInformation();

      // Upload examples should show --workspace flag
      expect(helpText.includes('--workspace') || helpText.includes('-w')).toBe(true);
    });
  });
});
