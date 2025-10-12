/**
 * Integration tests for Alpha Disclaimer workflow
 *
 * Tests the complete disclaimer flow including:
 * - First run (should show disclaimer)
 * - Subsequent runs (should not show disclaimer)
 * - Version level changes (should show disclaimer again)
 * - Auto-accept via flag
 * - Auto-accept via env var
 */

// Mock chalk before importing
jest.mock('chalk', () => ({
  __esModule: true,
  default: {
    yellow: jest.fn((str: string) => str),
    bold: jest.fn((str: string) => str),
    gray: jest.fn((str: string) => str),
  },
}));

// Mock inquirer for prompts
const mockPrompt = jest.fn();
jest.mock('inquirer', () => ({
  __esModule: true,
  default: {
    prompt: mockPrompt,
  },
}));

// Mock ConfigManager
jest.mock('../../src/config/ConfigManager.js', () => ({
  ConfigManager: jest.fn().mockImplementation(() => ({
    save: jest.fn().mockResolvedValue(undefined),
  })),
}));

import { AlphaDisclaimer } from '../../src/utils/AlphaDisclaimer.js';
import { Config } from '../../src/config/types.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('Disclaimer Workflow Integration', () => {
  let tempConfigDir: string;
  let originalEnv: string | undefined;
  let originalArgv: string[];

  beforeEach(() => {
    // Create temporary config directory
    tempConfigDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mujarrad-test-'));

    // Save original env and argv
    originalEnv = process.env.MUJARRAD_ACCEPT_DISCLAIMER;
    originalArgv = process.argv;

    // Clean env and argv
    delete process.env.MUJARRAD_ACCEPT_DISCLAIMER;
    process.argv = ['node', 'mujarrad'];
  });

  afterEach(() => {
    // Restore env and argv
    if (originalEnv !== undefined) {
      process.env.MUJARRAD_ACCEPT_DISCLAIMER = originalEnv;
    } else {
      delete process.env.MUJARRAD_ACCEPT_DISCLAIMER;
    }
    process.argv = originalArgv;

    // Clean up temp directory
    if (fs.existsSync(tempConfigDir)) {
      fs.rmSync(tempConfigDir, { recursive: true });
    }
  });

  describe('First run (no acknowledgment)', () => {
    it('should show disclaimer on first run', async () => {
      const config = {
        apiBaseUrl: 'https://api.mujarrad.com',
        logLevel: 'info',
      } as Config;

      const shouldShow = await AlphaDisclaimer.shouldShow('1.0.0-alpha.1', config);

      expect(shouldShow).toBe(true);
    });

    it('should record acknowledgment after user accepts', async () => {
      const config = {
        apiBaseUrl: 'https://api.mujarrad.com',
        logLevel: 'info',
      } as Config;

      // Mock user acceptance
      mockPrompt.mockResolvedValue({ accepted: true });

      await AlphaDisclaimer.recordAcknowledgment('1.0.0-alpha.1', config);

      expect(config.disclaimerAcknowledgment).toBeDefined();
      expect(config.disclaimerAcknowledgment?.acknowledgedVersion).toBe('1.0.0-alpha.1');
      expect(config.disclaimerAcknowledgment?.versionLevel).toBe('alpha');
      expect(config.disclaimerAcknowledgment?.acknowledgedAt).toBeDefined();
    });
  });

  describe('Subsequent runs (same version level)', () => {
    it('should not show disclaimer for same version level', async () => {
      const config = {
        apiBaseUrl: 'https://api.mujarrad.com',
        logLevel: 'info',
        disclaimerAcknowledgment: {
          acknowledgedVersion: '1.0.0-alpha.1',
          acknowledgedAt: new Date().toISOString(),
          versionLevel: 'alpha',
        },
      } as Config;

      const shouldShow = await AlphaDisclaimer.shouldShow('1.0.0-alpha.2', config);

      expect(shouldShow).toBe(false);
    });
  });

  describe('Version level changes', () => {
    it('should show disclaimer when moving from alpha to beta', async () => {
      const config = {
        apiBaseUrl: 'https://api.mujarrad.com',
        logLevel: 'info',
        disclaimerAcknowledgment: {
          acknowledgedVersion: '1.0.0-alpha.1',
          acknowledgedAt: new Date().toISOString(),
          versionLevel: 'alpha',
        },
      } as Config;

      const shouldShow = await AlphaDisclaimer.shouldShow('1.0.0-beta.1', config);

      expect(shouldShow).toBe(true);
    });

    it('should show disclaimer when moving from beta to stable', async () => {
      const config = {
        apiBaseUrl: 'https://api.mujarrad.com',
        logLevel: 'info',
        disclaimerAcknowledgment: {
          acknowledgedVersion: '1.0.0-beta.1',
          acknowledgedAt: new Date().toISOString(),
          versionLevel: 'beta',
        },
      } as Config;

      const shouldShow = await AlphaDisclaimer.shouldShow('1.0.0', config);

      expect(shouldShow).toBe(true);
    });
  });

  describe('Auto-accept via flag', () => {
    it('should auto-accept when --accept-disclaimer flag present', () => {
      process.argv = ['node', 'mujarrad', '--accept-disclaimer'];

      expect(AlphaDisclaimer.canAutoAccept()).toBe(true);
      expect(AlphaDisclaimer.hasAcceptFlag()).toBe(true);
    });

    it('should auto-accept when --accept-disclaimer=true flag present', () => {
      process.argv = ['node', 'mujarrad', '--accept-disclaimer=true'];

      expect(AlphaDisclaimer.canAutoAccept()).toBe(true);
      expect(AlphaDisclaimer.hasAcceptFlag()).toBe(true);
    });
  });

  describe('Auto-accept via env var', () => {
    it('should auto-accept when MUJARRAD_ACCEPT_DISCLAIMER=true', () => {
      process.env.MUJARRAD_ACCEPT_DISCLAIMER = 'true';

      expect(AlphaDisclaimer.canAutoAccept()).toBe(true);
      expect(AlphaDisclaimer.hasAcceptEnvVar()).toBe(true);
    });

    it('should auto-accept when MUJARRAD_ACCEPT_DISCLAIMER=1', () => {
      process.env.MUJARRAD_ACCEPT_DISCLAIMER = '1';

      expect(AlphaDisclaimer.canAutoAccept()).toBe(true);
      expect(AlphaDisclaimer.hasAcceptEnvVar()).toBe(true);
    });
  });

  describe('Complete workflow simulation', () => {
    it('should handle complete first-run workflow', async () => {
      // Step 1: First run - no acknowledgment
      const config1 = {
        apiBaseUrl: 'https://api.mujarrad.com',
        logLevel: 'info',
      } as Config;

      expect(await AlphaDisclaimer.shouldShow('1.0.0-alpha.1', config1)).toBe(true);

      // Step 2: User accepts
      await AlphaDisclaimer.recordAcknowledgment('1.0.0-alpha.1', config1);

      // Step 3: Second run - should not show
      expect(await AlphaDisclaimer.shouldShow('1.0.0-alpha.1', config1)).toBe(false);

      // Step 4: Patch update - should not show
      expect(await AlphaDisclaimer.shouldShow('1.0.0-alpha.2', config1)).toBe(false);

      // Step 5: Beta release - should show again
      expect(await AlphaDisclaimer.shouldShow('1.0.0-beta.1', config1)).toBe(true);
    });

    it('should handle auto-accept workflow', async () => {
      process.env.MUJARRAD_ACCEPT_DISCLAIMER = 'true';

      const config = {
        apiBaseUrl: 'https://api.mujarrad.com',
        logLevel: 'info',
      } as Config;

      // Should show disclaimer (first run)
      expect(await AlphaDisclaimer.shouldShow('1.0.0-alpha.1', config)).toBe(true);

      // But can auto-accept
      expect(AlphaDisclaimer.canAutoAccept()).toBe(true);

      // Record acknowledgment
      await AlphaDisclaimer.recordAcknowledgment('1.0.0-alpha.1', config);

      // Subsequent runs should not show
      expect(await AlphaDisclaimer.shouldShow('1.0.0-alpha.1', config)).toBe(false);
    });
  });
});
