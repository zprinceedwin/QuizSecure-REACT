/**
 * Configuration settings for the Electron main process
 */

// This file defines configuration values used across the main process

// Session timeout in milliseconds (30 minutes)
exports.SESSION_TIMEOUT = 30 * 60 * 1000;

// Set to true to enable verbose logging in the main process
exports.VERBOSE_LOGGING = true;

// Set security policy level (strict, moderate, permissive)
exports.SECURITY_POLICY_LEVEL = 'strict';

// Development mode detection
exports.isDev = require('electron-is-dev');

// Auto-open devtools in development mode
exports.AUTO_OPEN_DEVTOOLS = true;

// Lock down window resizing in production
exports.LOCK_WINDOW_SIZE = true; 