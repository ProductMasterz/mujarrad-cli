// Mock chalk before importing logo
const mockHexFn = jest.fn((_color: string) => {
  const fn = jest.fn((str: string) => str);
  (fn as any).bold = jest.fn((str: string) => str);
  return fn;
});

jest.mock('chalk', () => ({
  __esModule: true,
  default: {
    hex: mockHexFn,
  },
}));

// version.ts reads package.json through import.meta, which this CommonJS test transform cannot compile
jest.mock('../../../src/utils/version', () => ({ getVersion: () => '1.2.3' }));

import { logo, logoSimple, getFormattedVersion, displayBanner, displaySimple } from '../../../src/utils/logo';

describe('Logo Utils', () => {
  it('should have gradient logo defined', () => {
    expect(logo).toBeDefined();
    // ASCII art uses box-drawing characters, so check for them instead
    expect(logo).toContain('███');
    expect(logo).toContain('DATA UNLOCKD');
  });

  it('should have simple logo defined', () => {
    expect(logoSimple).toBeDefined();
    expect(logoSimple.length).toBeGreaterThan(0);
  });

  it('should format the package version', () => {
    expect(getFormattedVersion()).toMatch(/v\d+\.\d+\.\d+/);
  });

  it('should display banner without errors', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    displayBanner();
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should display simple logo without errors', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    displaySimple();
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
