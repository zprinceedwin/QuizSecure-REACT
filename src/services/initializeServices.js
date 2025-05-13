/**
 * Service Initialization
 * 
 * Initializes all application services and ensures proper session handling
 */

import { sessionService } from './sessionService';
import authService from './authService';
import { offlineManager } from './offlineManager';
import { VERBOSE_LOGGING } from './config';

/**
 * Initialize all application services in the correct order
 */
export function initializeServices() {
  if (VERBOSE_LOGGING) {
    console.log('Initializing application services...');
  }
  
  // Initialize offline manager first
  offlineManager.initialize();
  
  // Initialize session service with options
  sessionService.initialize({
    timeout: 30 * 60 * 1000, // 30 minutes
    onSessionExpired: handleSessionExpiration
  });
  
  if (VERBOSE_LOGGING) {
    console.log('Services initialized successfully');
  }
  
  // Return cleanup function
  return cleanup;
}

/**
 * Handle session expiration
 * @param {string} reason - The reason for session expiration
 */
function handleSessionExpiration(reason) {
  if (VERBOSE_LOGGING) {
    console.log(`Session expired due to ${reason}, redirecting to login`);
  }
  
  // Redirect to login page
  try {
    // Show alert for user
    alert('Your session has expired. Please login again.');
    
    // Logout the user
    authService.logout()
      .then(() => {
        // Redirect to login page
        window.location.href = '/login';
      })
      .catch(error => {
        console.error('Error during logout after session expiration:', error);
        // Still redirect to login
        window.location.href = '/login';
      });
  } catch (error) {
    console.error('Error handling session expiration:', error);
    // Force redirect to login as a fallback
    window.location.href = '/login';
  }
}

/**
 * Cleanup all services on application exit
 */
function cleanup() {
  if (VERBOSE_LOGGING) {
    console.log('Cleaning up services...');
  }
  
  // Cleanup services in reverse order
  sessionService.cleanup();
  offlineManager.cleanup();
  
  if (VERBOSE_LOGGING) {
    console.log('Services cleaned up successfully');
  }
}

// Export for direct use
export default { initializeServices }; 