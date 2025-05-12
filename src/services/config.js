/**
 * Centralized configuration for services.
 * This allows for easily toggling features across all services.
 */

/**
 * Toggle for using mock data vs. real API calls.
 * Set to true to force using mock data, false to attempt real API calls.
 * For prototype development, this makes testing faster without a backend.
 * Useful during user testing to quickly toggle between real and mock data.
 * @type {boolean}
 */
export const USE_MOCK_DATA = true; // TODO: Set to false when backend API is ready and stable

/**
 * Default API error message to display to users.
 * @type {string}
 */
export const DEFAULT_ERROR_MESSAGE = 'An error occurred. Please try again later.';

/**
 * Toggles additional console logging for debugging purposes.
 * @type {boolean}
 */
export const VERBOSE_LOGGING = true;

// Expose config to window for console testing
if (typeof window !== 'undefined') {
  window.apiConfig = { USE_MOCK_DATA, VERBOSE_LOGGING };
} 