/**
 * Unit tests for AlphaDisclaimer utility
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

// Mock inquirer before importing
jest.mock('inquirer', () => ({
  __esModule: true,
  default: {
    prompt: jest.fn(),
  },
}));

// Mock ConfigManager
jest.mock('../../../src/config/ConfigManager.js', () => ({
  ConfigManager: jest.fn().mockImplementation(() => ({
    save: jest.fn().mockResolvedValue(undefined),
  })),
}));

import { AlphaDisclaimer } from '../../../src/utils/AlphaDisclaimer.js';
import { Config } from '../../../src/config/types.js';

describe('AlphaDisclaimer', () => {
  describe('parseVersionLevel', () => {
    it('should parse alpha version', () => {
      expect(AlphaDisclaimer.parseVersionLevel('1.0.0-alpha.1')).toBe('alpha');
      expect(AlphaDisclaimer.parseVersionLevel('2.5.3-alpha')).toBe('alpha');
    });

    it('should parse beta version', () => {
      expect(AlphaDisclaimer.parseVersionLevel('1.0.0-beta.1')).toBe('beta');
      expect(AlphaDisclaimer.parseVersionLevel('2.5.3-beta')).toBe('beta');
    });

    it('should parse stable version', () => {
      expect(AlphaDisclaimer.parseVersionLevel('1.0.0')).toBe('stable');
      expect(AlphaDisclaimer.parseVersionLevel('2.5.3')).toBe('stable');
    });
  });

  describe('shouldShow', () => {
    it('should return true on first run (no acknowledgment)', async () => {
      const config = {
        apiBaseUrl: 'https://api.mujarrad.com',
        logLevel: 'info'
      } as Config;

      const result = await AlphaDisclaimer.shouldShow('1.0.0-alpha.1', config);
      expect(result).toBe(true);
    });

    it('should return false when same level already acknowledged', async () => {
      const config = {
        apiBaseUrl: 'https://api.mujarrad.com',
        logLevel: 'info',
        disclaimerAcknowledgment: {
          acknowledgedVersion: '1.0.0-alpha.1',
          acknowledgedAt: '2025-10-12T10:00:00.000Z',
          versionLevel: 'alpha'
        }
      } as Config;

      const result = await AlphaDisclaimer.shouldShow('1.0.0-alpha.2', config);
      expect(result).toBe(false);
    });

    it('should return true when version level changes (alpha → beta)', async () => {
      const config = {
        apiBaseUrl: 'https://api.mujarrad.com',
        logLevel: 'info',
        disclaimerAcknowledgment: {
          acknowledgedVersion: '1.0.0-alpha.1',
          acknowledgedAt: '2025-10-12T10:00:00.000Z',
          versionLevel: 'alpha'
        }
      } as Config;

      const result = await AlphaDisclaimer.shouldShow('1.0.0-beta.1', config);
      expect(result).toBe(true);
    });

    it('should return true when version level changes (beta → stable)', async () => {
      const config = {
        apiBaseUrl: 'https://api.mujarrad.com',
        logLevel: 'info',
        disclaimerAcknowledgment: {
          acknowledgedVersion: '1.0.0-beta.1',
          acknowledgedAt: '2025-10-12T10:00:00.000Z',
          versionLevel: 'beta'
        }
      } as Config;

      const result = await AlphaDisclaimer.shouldShow('1.0.0', config);
      expect(result).toBe(true);
    });

    it('should return false for patch updates within same level', async () => {
      const config = {
        apiBaseUrl: 'https://api.mujarrad.com',
        logLevel: 'info',
        disclaimerAcknowledgment: {
          acknowledgedVersion: '1.0.0-alpha.1',
          acknowledgedAt: '2025-10-12T10:00:00.000Z',
          versionLevel: 'alpha'
        }
      } as Config;

      const result = await AlphaDisclaimer.shouldShow('1.0.0-alpha.5', config);
      expect(result).toBe(false);
    });
  });

  describe('hasAcceptFlag', () => {
    const originalArgv = process.argv;

    afterEach(() => {
      process.argv = originalArgv;
    });

    it('should detect --accept-disclaimer flag', () => {
      process.argv = ['node', 'mujarrad', '--accept-disclaimer'];
      expect(AlphaDisclaimer.hasAcceptFlag()).toBe(true);
    });

    it('should detect --accept-disclaimer=true flag', () => {
      process.argv = ['node', 'mujarrad', '--accept-disclaimer=true'];
      expect(AlphaDisclaimer.hasAcceptFlag()).toBe(true);
    });

    it('should return false when flag not present', () => {
      process.argv = ['node', 'mujarrad', 'upload'];
      expect(AlphaDisclaimer.hasAcceptFlag()).toBe(false);
    });
  });

  describe('hasAcceptEnvVar', () => {
    const originalEnv = process.env.MUJARRAD_ACCEPT_DISCLAIMER;

    afterEach(() => {
      if (originalEnv === undefined) {
        delete process.env.MUJARRAD_ACCEPT_DISCLAIMER;
      } else {
        process.env.MUJARRAD_ACCEPT_DISCLAIMER = originalEnv;
      }
    });

    it('should detect MUJARRAD_ACCEPT_DISCLAIMER=true', () => {
      process.env.MUJARRAD_ACCEPT_DISCLAIMER = 'true';
      expect(AlphaDisclaimer.hasAcceptEnvVar()).toBe(true);
    });

    it('should detect MUJARRAD_ACCEPT_DISCLAIMER=1', () => {
      process.env.MUJARRAD_ACCEPT_DISCLAIMER = '1';
      expect(AlphaDisclaimer.hasAcceptEnvVar()).toBe(true);
    });

    it('should return false when env var not set', () => {
      delete process.env.MUJARRAD_ACCEPT_DISCLAIMER;
      expect(AlphaDisclaimer.hasAcceptEnvVar()).toBe(false);
    });

    it('should return false when env var is false', () => {
      process.env.MUJARRAD_ACCEPT_DISCLAIMER = 'false';
      expect(AlphaDisclaimer.hasAcceptEnvVar()).toBe(false);
    });
  });

  describe('canAutoAccept', () => {
    const originalArgv = process.argv;
    const originalEnv = process.env.MUJARRAD_ACCEPT_DISCLAIMER;

    afterEach(() => {
      process.argv = originalArgv;
      if (originalEnv === undefined) {
        delete process.env.MUJARRAD_ACCEPT_DISCLAIMER;
      } else {
        process.env.MUJARRAD_ACCEPT_DISCLAIMER = originalEnv;
      }
    });

    it('should return true when flag is present', () => {
      process.argv = ['node', 'mujarrad', '--accept-disclaimer'];
      delete process.env.MUJARRAD_ACCEPT_DISCLAIMER;
      expect(AlphaDisclaimer.canAutoAccept()).toBe(true);
    });

    it('should return true when env var is set', () => {
      process.argv = ['node', 'mujarrad'];
      process.env.MUJARRAD_ACCEPT_DISCLAIMER = 'true';
      expect(AlphaDisclaimer.canAutoAccept()).toBe(true);
    });

    it('should return false when neither is present', () => {
      process.argv = ['node', 'mujarrad'];
      delete process.env.MUJARRAD_ACCEPT_DISCLAIMER;
      expect(AlphaDisclaimer.canAutoAccept()).toBe(false);
    });
  });

  describe('getDisclaimerText', () => {
    it('should return alpha warning for alpha versions', () => {
      const text = AlphaDisclaimer.getDisclaimerText('1.0.0-alpha.1');
      expect(text).toContain('ALPHA');
      expect(text).toContain('alpha');
    });

    it('should return beta warning for beta versions', () => {
      const text = AlphaDisclaimer.getDisclaimerText('1.0.0-beta.1');
      expect(text).toContain('BETA');
      expect(text).toContain('beta');
    });

    it('should include warning about changes', () => {
      const text = AlphaDisclaimer.getDisclaimerText('1.0.0-alpha.1');
      expect(text.toLowerCase()).toMatch(/change|break/);
    });

    it('should include version number', () => {
      const text = AlphaDisclaimer.getDisclaimerText('1.0.0-alpha.1');
      expect(text).toContain('1.0.0-alpha.1');
    });
  });

  describe('recordAcknowledgment', () => {
    it('should be a function', () => {
      expect(typeof AlphaDisclaimer.recordAcknowledgment).toBe('function');
    });

    it('should accept version and config parameters', () => {
      expect(AlphaDisclaimer.recordAcknowledgment.length).toBe(2);
    });
  });
});
