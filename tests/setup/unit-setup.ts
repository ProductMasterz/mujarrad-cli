/**
 * Unit test setup file
 * This file runs before all unit tests via Jest setupFilesAfterEnv
 *
 * Purpose:
 * - Configure global test timeouts
 * - Set up mocks for external dependencies
 * - Initialize test environment variables
 * - Suppress console output for cleaner test runs
 */

// Set longer timeout for unit tests (some async tests need more time)
jest.setTimeout(10000); // 10 seconds

// Suppress console logs during tests for cleaner output
// Store original console methods
const originalConsole = {
  log: console.log,
  error: console.error,
  warn: console.warn,
  info: console.info,
  debug: console.debug,
};

// Determine if we should suppress console output
const VERBOSE_TESTS = process.env.VERBOSE_TESTS === 'true';

if (!VERBOSE_TESTS) {
  // Mock console methods to suppress output during tests
  global.console = {
    ...console,
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  } as any;
}

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.CI = process.env.CI || 'false';

// Clean up after all tests
afterAll(() => {
  // Restore original console if we mocked it
  if (!VERBOSE_TESTS) {
    global.console = originalConsole as any;
  }
});

// Global test utilities (available in all unit tests)
declare global {
  // Add any global test helpers here if needed
}

// Export for TypeScript module resolution
export {};
