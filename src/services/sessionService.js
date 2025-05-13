/**
 * Session Service
 * 
 * Provides session persistence functionality for the QuizSecure application.
 * Handles session storage, timeout, validation, and cleanup.
 */

import { secureStorageService } from './secureStorageService';
import authService from './authService';
import { VERBOSE_LOGGING } from './config';

// Session configuration constants
const SESSION_KEY = 'activeSession';
const SESSION_EXPIRY_KEY = 'sessionExpiry';
const SESSION_ACTIVITY_KEY = 'lastActivity';
const SESSION_PERSISTENT_KEY = 'sessionPersistent';
const DEFAULT_SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes in milliseconds
const PERSISTENT_SESSION_TIMEOUT = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
const SESSION_CHECK_INTERVAL = 60 * 1000; // Check every minute

// Internal state
let sessionTimeoutId = null;
let sessionCheckIntervalId = null;
let onSessionExpiredCallback = null;
let sessionTimeoutDuration = DEFAULT_SESSION_TIMEOUT;

/**
 * Initialize the session service
 * @param {Object} options - Session configuration options
 * @param {number} options.timeout - Session timeout in milliseconds
 * @param {Function} options.onSessionExpired - Callback for session expiration
 */
function initialize(options = {}) {
  // Set configuration options
  sessionTimeoutDuration = options.timeout || DEFAULT_SESSION_TIMEOUT;
  onSessionExpiredCallback = options.onSessionExpired;
  
  if (VERBOSE_LOGGING) {
    console.log(`SessionService: Initializing with ${sessionTimeoutDuration}ms timeout`);
  }
  
  // Start the session check interval
  startSessionMonitoring();
  
  // Check if we have a valid stored session
  const storedSession = getStoredSession();
  if (storedSession) {
    if (VERBOSE_LOGGING) {
      console.log('SessionService: Found stored session, validating...');
    }
    
    // Validate the stored session
    if (isSessionValid(storedSession)) {
      if (VERBOSE_LOGGING) {
        console.log('SessionService: Restored valid session');
      }
      
      // Update the expiry time
      updateSessionExpiry();
      
      // Notify through the Electron IPC if available
      if (window.electron) {
        window.electron.ipc.send('session:restored', { 
          username: storedSession.username,
          role: storedSession.role,
          persistent: isPersistentSession()
        });
      }
    } else {
      if (VERBOSE_LOGGING) {
        console.log('SessionService: Stored session is invalid or expired, clearing');
      }
      
      // Clear the invalid session
      clearSession();
    }
  }
}

/**
 * Start session monitoring to check for timeouts
 */
function startSessionMonitoring() {
  // Clear any existing interval
  if (sessionCheckIntervalId) {
    clearInterval(sessionCheckIntervalId);
  }
  
  // Start a new interval
  sessionCheckIntervalId = setInterval(() => {
    const activeSession = getStoredSession();
    
    if (activeSession) {
      // Check if the session has expired due to inactivity
      const lastActivity = secureStorageService.getItem(SESSION_ACTIVITY_KEY);
      if (lastActivity) {
        const now = Date.now();
        const lastActivityTime = parseInt(lastActivity, 10);
        const timeSinceLastActivity = now - lastActivityTime;
        
        // Skip inactivity check for persistent sessions
        if (!isPersistentSession() && timeSinceLastActivity > sessionTimeoutDuration) {
          if (VERBOSE_LOGGING) {
            console.log(`SessionService: Session expired due to inactivity (${timeSinceLastActivity}ms)`);
          }
          
          // Session has expired, log out the user
          handleSessionExpired('inactivity');
        }
      }
      
      // Check if the session has reached its expiry time
      const expiryTime = secureStorageService.getItem(SESSION_EXPIRY_KEY);
      if (expiryTime) {
        const now = Date.now();
        const expiry = parseInt(expiryTime, 10);
        
        if (now > expiry) {
          if (VERBOSE_LOGGING) {
            console.log('SessionService: Session reached expiry time');
          }
          
          // Session has expired, log out the user
          handleSessionExpired('expired');
        }
      }
    }
  }, SESSION_CHECK_INTERVAL);
  
  // Add document-level event listeners for activity tracking
  if (typeof document !== 'undefined') {
    document.addEventListener('click', recordUserActivity);
    document.addEventListener('keydown', recordUserActivity);
    document.addEventListener('mousemove', throttle(recordUserActivity, 60000)); // Throttle mousemove
  }
  
  if (VERBOSE_LOGGING) {
    console.log('SessionService: Started session monitoring');
  }
}

/**
 * Check if the current session is persistent (remember me)
 * @returns {boolean} Whether the session is persistent
 */
function isPersistentSession() {
  const persistentStr = secureStorageService.getItem(SESSION_PERSISTENT_KEY);
  return persistentStr === 'true';
}

/**
 * Create a new user session
 * @param {Object} user - User information
 * @param {string} user.username - The username
 * @param {string} user.role - The user role
 * @param {Object} sessionData - Additional session data
 * @param {boolean} sessionData.persistent - Whether this is a persistent session (remember me)
 * @returns {Object} The created session object
 */
function createSession(user, sessionData = {}) {
  if (!user || !user.username) {
    console.error('SessionService: Cannot create session without user information');
    return null;
  }
  
  // Handle persistent sessions (remember me)
  const isPersistent = sessionData.persistent || false;
  secureStorageService.setItem(SESSION_PERSISTENT_KEY, isPersistent.toString());
  
  // Create session object
  const session = {
    username: user.username,
    role: user.role || 'student',
    created: Date.now(),
    persistent: isPersistent,
    ...sessionData
  };
  
  // Store the session
  secureStorageService.setItem(SESSION_KEY, JSON.stringify(session));
  
  // Set the expiry time based on session type
  const timeout = isPersistent ? PERSISTENT_SESSION_TIMEOUT : sessionTimeoutDuration;
  updateSessionExpiry(timeout);
  
  // Record initial activity timestamp
  recordUserActivity();
  
  if (VERBOSE_LOGGING) {
    console.log(`SessionService: Created new session for ${user.username} (${user.role}), persistent: ${isPersistent}`);
  }
  
  // Notify through the Electron IPC if available
  if (window.electron) {
    window.electron.ipc.send('session:created', { 
      username: user.username,
      role: user.role,
      persistent: isPersistent
    });
  }
  
  return session;
}

/**
 * Get the currently active session
 * @returns {Object|null} The current session or null if no active session
 */
function getCurrentSession() {
  return getStoredSession();
}

/**
 * Get the stored session from secure storage
 * @returns {Object|null} The stored session or null if not found
 */
function getStoredSession() {
  try {
    const sessionStr = secureStorageService.getItem(SESSION_KEY);
    if (!sessionStr) return null;
    
    return JSON.parse(sessionStr);
  } catch (error) {
    console.error('SessionService: Error retrieving stored session', error);
    return null;
  }
}

/**
 * Check if a session is currently active
 * @returns {boolean} True if a valid session exists
 */
function isAuthenticated() {
  const session = getStoredSession();
  return session !== null && isSessionValid(session);
}

/**
 * Update the session expiry time
 * @param {number} durationMs - Custom duration in milliseconds
 */
function updateSessionExpiry(durationMs) {
  const duration = durationMs || sessionTimeoutDuration;
  const expiryTime = Date.now() + duration;
  
  secureStorageService.setItem(SESSION_EXPIRY_KEY, expiryTime.toString());
  
  if (VERBOSE_LOGGING) {
    console.log(`SessionService: Updated session expiry to ${new Date(expiryTime)}`);
  }
}

/**
 * Record user activity to prevent session timeout
 */
function recordUserActivity() {
  const currentTime = Date.now();
  secureStorageService.setItem(SESSION_ACTIVITY_KEY, currentTime.toString());
  
  // Notify the main process about user activity if in Electron environment
  if (window.electron) {
    window.electron.ipc.send('user:activity', { timestamp: currentTime });
  }
}

/**
 * Check if a session is still valid
 * @param {Object} session - The session to validate
 * @returns {boolean} True if the session is valid
 */
function isSessionValid(session) {
  if (!session) return false;
  
  // We're not going to do token validation here since it's async
  // Just check if the session hasn't expired based on time
  const expiryTime = secureStorageService.getItem(SESSION_EXPIRY_KEY);
  if (!expiryTime) return false;
  
  const now = Date.now();
  const expiry = parseInt(expiryTime, 10);
  
  return now < expiry;
}

/**
 * Handle an expired session
 * @param {string} reason - The reason for expiration
 */
function handleSessionExpired(reason = 'unknown') {
  if (VERBOSE_LOGGING) {
    console.log(`SessionService: Session expired (reason: ${reason})`);
  }
  
  // Clear the session
  clearSession();
  
  // Call the callback if provided
  if (onSessionExpiredCallback && typeof onSessionExpiredCallback === 'function') {
    onSessionExpiredCallback(reason);
  }
  
  // Notify through the Electron IPC if available
  if (window.electron) {
    window.electron.ipc.send('session:expired', { reason });
  }
}

/**
 * Clear the current session
 */
function clearSession() {
  // Remove session data from secure storage
  secureStorageService.removeItem(SESSION_KEY);
  secureStorageService.removeItem(SESSION_EXPIRY_KEY);
  secureStorageService.removeItem(SESSION_ACTIVITY_KEY);
  
  // Clear any existing timeout
  if (sessionTimeoutId) {
    clearTimeout(sessionTimeoutId);
    sessionTimeoutId = null;
  }
  
  if (VERBOSE_LOGGING) {
    console.log('SessionService: Session cleared');
  }
}

/**
 * Extend the current session's timeout
 * @param {number} durationMs - The duration to extend in milliseconds
 */
function extendSession(durationMs) {
  updateSessionExpiry(durationMs);
  recordUserActivity();
  
  if (VERBOSE_LOGGING) {
    console.log(`SessionService: Session extended by ${durationMs}ms`);
  }
}

/**
 * End the current session (logout)
 */
async function endSession() {
  if (VERBOSE_LOGGING) {
    console.log('SessionService: Ending session');
  }
  
  // Get session info before clearing
  const session = getStoredSession();
  
  // Clear the session data
  clearSession();
  
  // Stop session monitoring
  if (sessionCheckIntervalId) {
    clearInterval(sessionCheckIntervalId);
    sessionCheckIntervalId = null;
  }
  
  // Remove event listeners
  if (typeof document !== 'undefined') {
    document.removeEventListener('click', recordUserActivity);
    document.removeEventListener('keydown', recordUserActivity);
    document.removeEventListener('mousemove', throttle(recordUserActivity, 60000));
  }
  
  // Notify through the Electron IPC if available
  if (window.electron && session) {
    window.electron.ipc.send('session:ended', { 
      username: session.username,
      role: session.role
    });
  }
}

/**
 * Cleanup on app close
 */
function cleanup() {
  if (sessionCheckIntervalId) {
    clearInterval(sessionCheckIntervalId);
  }
  
  if (sessionTimeoutId) {
    clearTimeout(sessionTimeoutId);
  }
}

/**
 * Throttle function to limit the frequency of function calls
 * @param {Function} func - The function to throttle
 * @param {number} limit - The time limit in milliseconds
 * @returns {Function} The throttled function
 */
function throttle(func, limit) {
  let lastCall = 0;
  return function(...args) {
    const now = Date.now();
    if (now - lastCall >= limit) {
      lastCall = now;
      return func.apply(this, args);
    }
  };
}

// Export the session service
export const sessionService = {
  initialize,
  createSession,
  getCurrentSession,
  isAuthenticated,
  updateSessionExpiry,
  recordUserActivity,
  extendSession,
  endSession,
  cleanup
}; 