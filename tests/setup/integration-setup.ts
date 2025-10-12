/**
 * Integration test setup file
 * This file runs before all integration tests via Jest setupFilesAfterEnv
 *
 * Purpose:
 * - Configure longer timeouts for API calls
 * - Set up test database/API connections
 * - Initialize integration test environment
 * - Configure test data cleanup
 */

// Set much longer timeout for integration tests (API calls can be slow)
jest.setTimeout(30000); // 30 seconds

// Set integration test environment variables
process.env.NODE_ENV = 'test';
process.env.CI = process.env.CI || 'false';

// Check if required environment variables are set for integration tests
const requiredEnvVars: string[] = [
  // Add required env vars here when needed, e.g.:
  // 'API_BASE_URL',
  // 'TEST_API_TOKEN',
];

const missingEnvVars: string[] = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.warn(
    '\x1b[33m%s\x1b[0m', // Yellow color
    `Warning: Integration tests may require the following environment variables: ${missingEnvVars.join(', ')}`
  );
}

// Global setup for all integration tests
beforeAll(async () => {
  // Initialize any shared resources for integration tests
  // e.g., test database connections, API clients, etc.
});

// Global cleanup after all integration tests
afterAll(async () => {
  // Clean up any shared resources
  // e.g., close database connections, clean up test data, etc.
});

// Suppress verbose winston logging during integration tests
// (Unless VERBOSE_TESTS is set)
const VERBOSE_TESTS = process.env.VERBOSE_TESTS === 'true';

if (!VERBOSE_TESTS) {
  // Store original console methods
  const originalWarn = console.warn;
  const originalDebug = console.debug;

  // Suppress non-critical console output
  global.console = {
    ...console,
    warn: jest.fn(),
    debug: jest.fn(),
  } as any;

  // Restore after all tests
  afterAll(() => {
    console.warn = originalWarn;
    console.debug = originalDebug;
  });
}

// Export for TypeScript module resolution
export {};
