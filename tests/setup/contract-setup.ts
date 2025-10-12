/**
 * Jest setup for contract tests
 * Feature: 009-init-command-enhancement
 *
 * Contract tests verify API client integration with backend endpoints
 * using mocked HTTP responses (nock).
 */

// Extend Jest timeout for contract tests (HTTP mocking)
jest.setTimeout(10000);

// Clean up nock interceptors after all tests
afterAll(() => {
    // This is handled per-test in afterEach, but included for safety
});
