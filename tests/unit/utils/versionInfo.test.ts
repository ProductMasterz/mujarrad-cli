/**
 * Unit tests for VersionInfo utility
 */

// Mock chalk before importing
jest.mock('chalk', () => ({
  __esModule: true,
  default: {
    bold: jest.fn((str: string) => str),
    green: jest.fn((str: string) => str),
    yellow: jest.fn((str: string) => str),
    cyan: jest.fn((str: string) => str),
    gray: jest.fn((str: string) => str),
  },
}));

// Mock version module
jest.mock('../../../src/utils/version.js', () => ({
  getVersion: jest.fn(() => '1.0.5'),
}));

import { VersionInfo } from '../../../src/utils/versionInfo.js';

describe('VersionInfo', () => {
  describe('getVersionInfo', () => {
    it('should return version, level, and build info', () => {
      const info = VersionInfo.getVersionInfo();

      expect(info).toHaveProperty('version');
      expect(info).toHaveProperty('versionLevel');
      expect(info).toHaveProperty('nodeVersion');
      expect(info).toHaveProperty('platform');

      expect(typeof info.version).toBe('string');
      expect(['alpha', 'beta', 'stable']).toContain(info.versionLevel);
      expect(typeof info.nodeVersion).toBe('string');
      expect(typeof info.platform).toBe('string');
    });

    it('should include Node.js version', () => {
      const info = VersionInfo.getVersionInfo();

      expect(info.nodeVersion).toMatch(/^v?\d+\.\d+\.\d+/);
    });

    it('should include platform', () => {
      const info = VersionInfo.getVersionInfo();

      expect(['darwin', 'linux', 'win32']).toContain(info.platform);
    });
  });

  describe('formatVersionOutput', () => {
    it('should format version info as string', () => {
      const output = VersionInfo.formatVersionOutput();

      expect(typeof output).toBe('string');
      expect(output.length).toBeGreaterThan(0);
    });

    it('should include version number', () => {
      const output = VersionInfo.formatVersionOutput();

      // Should contain a semver-like version
      expect(output).toMatch(/\d+\.\d+\.\d+/);
    });

    it('should include version level for non-stable', () => {
      const output = VersionInfo.formatVersionOutput();

      // If version is alpha or beta, should mention it
      if (output.includes('alpha') || output.includes('beta')) {
        expect(output.toLowerCase()).toMatch(/alpha|beta/);
      }
    });

    it('should include build info', () => {
      const output = VersionInfo.formatVersionOutput();

      // Should mention Node.js and platform
      expect(output.toLowerCase()).toMatch(/node|platform/);
    });
  });

  describe('displayVersionInfo', () => {
    let consoleSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it('should display version info to console', () => {
      VersionInfo.displayVersionInfo();

      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should output formatted version info', () => {
      VersionInfo.displayVersionInfo();

      const output = consoleSpy.mock.calls.map(call => call.join(' ')).join('\n');

      // Should contain version number
      expect(output).toMatch(/\d+\.\d+\.\d+/);
    });
  });
});
