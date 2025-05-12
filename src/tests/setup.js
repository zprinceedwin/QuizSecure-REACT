// src/tests/setup.js
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock localStorage
const localStorageMock = (function() {
  let store = {};
  
  return {
    getItem: function(key) {
      return store[key] || null;
    },
    setItem: function(key, value) {
      store[key] = value.toString();
    },
    removeItem: function(key) {
      delete store[key];
    },
    clear: function() {
      store = {};
    }
  };
})();

// Mock window.localStorage and window.sessionStorage
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

Object.defineProperty(window, 'sessionStorage', {
  value: localStorageMock
});

// Mock console methods to avoid test output clutter
// Comment out these lines if you want to see console output during tests
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const originalConsoleLog = console.log;

console.error = (...args) => {
  if (args[0]?.includes?.('Warning:') || args[0]?.includes?.('Error:')) {
    return;
  }
  originalConsoleError(...args);
};

console.warn = (...args) => {
  if (args[0]?.includes?.('Warning:')) {
    return;
  }
  originalConsoleWarn(...args);
};

// Only silence verbose logging in test mode
console.log = (...args) => {
  if (args[0]?.includes?.('apiClient:') || 
      args[0]?.includes?.('VERBOSE')) {
    return;
  }
  originalConsoleLog(...args);
};

// Mock fetch API
global.fetch = vi.fn();
global.Response = vi.fn();
global.Headers = vi.fn();
global.Request = vi.fn(); 