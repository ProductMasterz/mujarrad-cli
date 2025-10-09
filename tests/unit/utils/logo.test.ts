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

import { logo, logoSimple, version, displayBanner, displaySimple } from '../../../src/utils/logo';

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

  it('should have version defined', () => {
    expect(version).toBeDefined();
    expect(version).toContain('v1.0.0');
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
