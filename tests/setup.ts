/**
 * Jest setup file
 */

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock setTimeout and setInterval for testing
jest.useFakeTimers();

// Global test utilities
declare global {
  var mockFetch: jest.Mock;
}

// Setup global fetch mock
global.mockFetch = jest.fn();
global.fetch = global.mockFetch;


