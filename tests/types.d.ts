/**
 * Global type declarations for tests
 */

declare global {
  var mockFetch: jest.Mock;
  
  namespace NodeJS {
    interface Global {
      mockFetch: jest.Mock;
    }
  }
}

export {};


