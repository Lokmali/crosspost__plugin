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

// Setup global fetch mock
(global as any).mockFetch = jest.fn();
(global as any).fetch = (global as any).mockFetch;