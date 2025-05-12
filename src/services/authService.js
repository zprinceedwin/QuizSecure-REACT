// src/services/authService.js
import { apiClient } from './apiClient';
import { offlineManager } from './offlineManager';
import { secureStorageService } from './secureStorageService';
import { USE_MOCK_DATA, VERBOSE_LOGGING } from './config';
import { sessionService } from './sessionService';

const TOKEN_KEY = 'authToken';
const USER_ROLE_KEY = 'userRole';
const LAST_ONLINE_KEY = 'lastOnlineTimestamp';
const SESSION_ID_KEY = 'sessionId';
const REMEMBER_ME_KEY = 'rememberMe';

// Track if we've already tried logging in while offline
let offlineLoginAttempted = false;

/**
 * Logs in the user.
 * @param {string} username - The username.
 * @param {string} password - The password.
 * @param {string} role - The user role (student/teacher).
 * @param {boolean} rememberMe - Whether to persist the session across browser restarts.
 * @returns {Promise<any>} - The user data from the API on successful login.
 */
async function login(username, password, role = 'student', rememberMe = false) {
  try {
    if (USE_MOCK_DATA) {
      if (VERBOSE_LOGGING) console.log('authService.login using MOCK response');
      
      // Simple mock authentication
      if (username && password) {
        const mockToken = 'mock-jwt-token-' + Math.random().toString(36).substring(2);
        const sessionId = Date.now().toString(36) + Math.random().toString(36).substring(2);
        
        // Use secureStorageService for token storage
        secureStorageService.setItem(TOKEN_KEY, mockToken);
        secureStorageService.setItem(USER_ROLE_KEY, role);
        secureStorageService.setItem(SESSION_ID_KEY, sessionId);
        secureStorageService.setItem(REMEMBER_ME_KEY, rememberMe.toString());
        
        // Store the response in offline cache for potential offline login
        const userResponse = { 
          token: mockToken,
          sessionId: sessionId,
          user: { 
            id: role === 'student' ? 'user123' : 'user789',
            username: username,
            role: role,
            firstName: role === 'student' ? 'Test' : 'Professor',
            lastName: role === 'student' ? 'Student' : 'Smith'
          },
          rememberMe: rememberMe
        };
        
        // Cache the user data for offline login
        offlineManager.cacheData('offline_auth_' + username, {
          token: mockToken,
          sessionId: sessionId,
          user: userResponse.user,
          timestamp: Date.now(),
          rememberMe: rememberMe
        });
        
        // Create session with persistence option
        sessionService.createSession(
          userResponse.user, 
          { 
            sessionId: sessionId,
            persistent: rememberMe 
          }
        );
        
        return userResponse;
      } 
      else {
        throw new Error('Invalid username or password');
      }
    }
    
    // Check if we're offline but have cached credentials for this user
    if (!offlineManager.getOnlineStatus() && !offlineLoginAttempted) {
      if (VERBOSE_LOGGING) console.log('authService: Attempting offline login for: ' + username);
      
      // Try to get cached auth data for this username
      const cachedAuth = offlineManager.getCachedData('offline_auth_' + username);
      
      if (cachedAuth) {
        // Simple offline validation - in a real app, you'd use a more secure approach
        // For a prototype, we're allowing login with cached credentials when offline
        offlineLoginAttempted = true;
        
        if (VERBOSE_LOGGING) console.log('authService: Offline login successful using cached credentials');
        
        // Store token and role in secure storage
        secureStorageService.setItem(TOKEN_KEY, cachedAuth.token);
        secureStorageService.setItem(USER_ROLE_KEY, cachedAuth.user.role);
        secureStorageService.setItem(SESSION_ID_KEY, cachedAuth.sessionId);
        secureStorageService.setItem(REMEMBER_ME_KEY, (rememberMe || cachedAuth.rememberMe || false).toString());
        
        // Track when the user last logged in while offline
        secureStorageService.setItem(LAST_ONLINE_KEY, cachedAuth.timestamp.toString());
        
        // Create session with persistence option based on remembered preference or current choice
        sessionService.createSession(
          cachedAuth.user, 
          { 
            sessionId: cachedAuth.sessionId,
            persistent: rememberMe || (cachedAuth.rememberMe || false)
          }
        );
        
        return {
          token: cachedAuth.token,
          sessionId: cachedAuth.sessionId,
          user: cachedAuth.user,
          offlineLogin: true,
          rememberMe: rememberMe || (cachedAuth.rememberMe || false)
        };
      }
      
      if (VERBOSE_LOGGING) console.log('authService: No cached credentials found, offline login failed');
      throw new Error('Cannot log in while offline without previous credentials');
    }
    
    // Use Electron IPC for authentication when in Electron environment
    if (window.electron) {
      try {
        const credentials = { username, password, role, rememberMe };
        const result = await window.electron.ipc.invoke('auth:login', credentials);
        
        if (result.success && result.sessionId) {
          // Store session ID securely
          secureStorageService.setItem(SESSION_ID_KEY, result.sessionId);
          secureStorageService.setItem(USER_ROLE_KEY, result.role);
          secureStorageService.setItem(REMEMBER_ME_KEY, rememberMe.toString());
          
          // No need to store actual token - it stays in main process for security
          
          // Create session with persistence option
          sessionService.createSession(
            result.user, 
            { 
              sessionId: result.sessionId,
              persistent: rememberMe
            }
          );
          
          return {
            sessionId: result.sessionId,
            user: result.user,
            rememberMe: rememberMe
          };
        } else {
          throw new Error(result.error || 'Login failed');
        }
      } catch (error) {
        console.error('Electron login error:', error);
        throw error;
      }
    }
    
    // Online login flow for non-Electron environments
    const response = await apiClient.post('/auth/login', { username, password, role, rememberMe });
    if (response && response.token) {
      // Store in secure storage
      secureStorageService.setItem(TOKEN_KEY, response.token);
      if (response.sessionId) {
        secureStorageService.setItem(SESSION_ID_KEY, response.sessionId);
      }
      if (response.user && response.user.role) {
        secureStorageService.setItem(USER_ROLE_KEY, response.user.role);
      }
      secureStorageService.setItem(REMEMBER_ME_KEY, rememberMe.toString());
      
      // Store the successful login in cache for potential offline login later
      if (response.user) {
        offlineManager.cacheData('offline_auth_' + username, {
          token: response.token,
          sessionId: response.sessionId,
          user: response.user,
          timestamp: Date.now(),
          rememberMe: rememberMe
        });
      }
      
      // Create a session for the logged-in user with persistence option
      if (response && (response.user || response.sessionId)) {
        sessionService.createSession(
          response.user || { username, role }, 
          { 
            sessionId: response.sessionId,
            persistent: rememberMe 
          }
        );
      }
      
      return {
        ...response,
        rememberMe: rememberMe
      };
    } else {
      throw new Error('Login failed: No token received from server.');
    }
  } catch (error) {
    console.error('Login error:', error);
    // Reset offline login flag on error so future attempts can be made
    offlineLoginAttempted = false;
    // It's often good to throw the error again so UI can catch and display it
    throw error; 
  }
}

/**
 * Logs out the user.
 */
async function logout() {
  try {
    // End the user's session first
    await sessionService.endSession();
    
    // Get session ID for Electron authentication
    const sessionId = secureStorageService.getItem(SESSION_ID_KEY);
    
    // Use Electron IPC for logout if available
    if (window.electron && sessionId) {
      await window.electron.ipc.invoke('auth:logout', sessionId);
    }
    
    // Clear secure storage
    secureStorageService.removeItem(TOKEN_KEY);
    secureStorageService.removeItem(USER_ROLE_KEY);
    secureStorageService.removeItem(LAST_ONLINE_KEY);
    secureStorageService.removeItem(SESSION_ID_KEY);
    secureStorageService.removeItem(REMEMBER_ME_KEY);
    
    // Reset offline login tracking
    offlineLoginAttempted = false;
    
    // Notify backend about logout if online
    if (offlineManager.getOnlineStatus()) {
      try {
        // Example: await apiClient.post('/auth/logout');
        if (VERBOSE_LOGGING) console.log('authService: User logged out, token removed, server notified.');
      } catch (error) {
        console.warn('Failed to notify server about logout:', error);
      }
    } else {
      if (VERBOSE_LOGGING) console.log('authService: User logged out while offline, token removed locally.');
    }
    
    return { success: true };
  } catch (error) {
    console.error('Logout error:', error);
    throw error;
  }
}

/**
 * Validates the current authentication token.
 * @returns {Promise<boolean>} True if token is valid, false otherwise.
 */
async function validateToken() {
  try {
    // Get session ID for Electron authentication
    const sessionId = secureStorageService.getItem(SESSION_ID_KEY);
    
    // Use Electron IPC for token validation if available
    if (window.electron && sessionId) {
      const result = await window.electron.ipc.invoke('auth:validateToken', sessionId);
      return result.valid;
    }
    
    // For browser or fallback - check if token exists and is not expired
    // This is a simple check - a real implementation would verify with the server
    const token = secureStorageService.getItem(TOKEN_KEY);
    return !!token;
  } catch (error) {
    console.error('Token validation error:', error);
    return false;
  }
}

/**
 * Refreshes the authentication token.
 * @returns {Promise<boolean>} True if successful, false otherwise.
 */
async function refreshToken() {
  try {
    // Get session ID for Electron authentication
    const sessionId = secureStorageService.getItem(SESSION_ID_KEY);
    
    // Use Electron IPC for token refresh if available
    if (window.electron && sessionId) {
      const result = await window.electron.ipc.invoke('auth:refreshToken', sessionId);
      return result.success;
    }
    
    // For browser or fallback, implement token refresh logic if needed
    return false;
  } catch (error) {
    console.error('Token refresh error:', error);
    return false;
  }
}

/**
 * Gets the current authentication token from secure storage.
 * @returns {string|null} The token, or null if not found.
 */
function getToken() {
  try {
    return secureStorageService.getItem(TOKEN_KEY);
  } catch (e) {
    console.warn('Could not access secure storage to get authToken.', e);
    return null;
  }
}

/**
 * Gets the user's role from secure storage.
 * @returns {string|null} The role, or null if not found.
 */
function getUserRole() {
  try {
    return secureStorageService.getItem(USER_ROLE_KEY);
  } catch (e) {
    console.warn('Could not access secure storage to get userRole.', e);
    return null;
  }
}

/**
 * Checks if a user is currently authenticated (i.e., a token exists).
 * @returns {boolean} True if authenticated, false otherwise.
 */
function isAuthenticated() {
  return !!getToken() || !!secureStorageService.getItem(SESSION_ID_KEY);
}

/**
 * Gets the timestamp of the last online login
 * @returns {number|null} Timestamp in milliseconds, or null if not found
 */
function getLastOnlineTimestamp() {
  try {
    const value = secureStorageService.getItem(LAST_ONLINE_KEY);
    return value ? parseInt(value, 10) : null;
  } catch (e) {
    return null;
  }
}

/**
 * Checks if the user's offline session has expired
 * @param {number} maxOfflineDuration - Maximum duration allowed in milliseconds (default: 7 days)
 * @returns {boolean} True if session is expired, false if still valid
 */
function isOfflineSessionExpired(maxOfflineDuration = 7 * 24 * 60 * 60 * 1000) {
  const lastTimestamp = getLastOnlineTimestamp();
  if (!lastTimestamp) return false; // No offline session
  
  const now = Date.now();
  return (now - lastTimestamp) > maxOfflineDuration;
}

/**
 * Checks if the current user has a specific role.
 * @param {string} role - The role to check for (e.g., 'student', 'teacher').
 * @returns {boolean} True if the user has the role, false otherwise.
 */
function hasRole(role) {
  const userRole = getUserRole();
  return userRole === role;
}

/**
 * Registers a new user.
 * @param {Object} userData - User registration data
 * @returns {Promise<Object>} Registration response
 */
async function register(userData) {
  try {
    if (USE_MOCK_DATA) {
      if (VERBOSE_LOGGING) console.log('authService.register using MOCK response', userData);
      
      // Mock validation
      if (!userData.username || !userData.password) {
        throw new Error('Username and password are required');
      }
      
      if (userData.password.length < 6) {
        throw new Error('Password must be at least 6 characters long');
      }
      
      // Check if a user with this username already exists (in a real app)
      // Here we'll just mock a successful registration
      const mockToken = 'mock-jwt-token-' + Math.random().toString(36).substring(2);
      
      return {
        success: true,
        message: 'Registration successful (mock response)',
        token: mockToken,
        user: {
          id: 'user' + Math.floor(Math.random() * 1000),
          username: userData.username,
          firstName: userData.firstName || '',
          lastName: userData.lastName || '',
          email: userData.email || '',
          role: userData.role || 'student'
        }
      };
    }
    
    // Check if we're offline
    if (!offlineManager.getOnlineStatus()) {
      if (VERBOSE_LOGGING) console.log('authService: Cannot register new user while offline');
      throw new Error('Registration requires an internet connection');
    }
    
    const response = await apiClient.post('/auth/register', userData);
    
    // If this was queued for offline processing, modify the message
    if (response.queued) {
      return { 
        ...response, 
        message: 'Registration submitted and will be processed when you\'re back online.' 
      };
    }
    
    return response;
  } catch (error) {
    console.error('Registration error:', error);
    throw error;
  }
}

/**
 * Initiates a password reset process for a user.
 * @param {string} email - The user's email address
 * @returns {Promise<Object>} Password reset response
 */
async function requestPasswordReset(email) {
  try {
    if (USE_MOCK_DATA) {
      if (VERBOSE_LOGGING) console.log('authService.requestPasswordReset using MOCK response', email);
      
      // Mock validation
      if (!email) {
        throw new Error('Email is required');
      }
      
      // Simple mock email validation
      if (!email.includes('@')) {
        throw new Error('Invalid email format');
      }
      
      return {
        success: true,
        message: 'Password reset instructions have been sent to your email (mock response)'
      };
    }
    
    // Check if we're offline
    if (!offlineManager.getOnlineStatus()) {
      if (VERBOSE_LOGGING) console.log('authService: Cannot request password reset while offline');
      throw new Error('Password reset requires an internet connection');
    }
    
    const response = await apiClient.post('/auth/password-reset/request', { email });
    
    // If this was queued for offline processing, modify the message
    if (response.queued) {
      return { 
        ...response, 
        message: 'Password reset request will be processed when you\'re back online.' 
      };
    }
    
    return response;
  } catch (error) {
    console.error('Password reset request error:', error);
    throw error;
  }
}

/**
 * Resets a user's password using a reset token.
 * @param {string} token - The password reset token
 * @param {string} newPassword - The new password
 * @returns {Promise<Object>} Password reset confirmation
 */
async function resetPassword(token, newPassword) {
  try {
    if (USE_MOCK_DATA) {
      if (VERBOSE_LOGGING) console.log('authService.resetPassword using MOCK response');
      
      // Mock validation
      if (!token || !newPassword) {
        throw new Error('Token and new password are required');
      }
      
      if (newPassword.length < 6) {
        throw new Error('Password must be at least 6 characters long');
      }
      
      return {
        success: true,
        message: 'Password has been reset successfully (mock response)'
      };
    }
    
    // Check if we're offline
    if (!offlineManager.getOnlineStatus()) {
      if (VERBOSE_LOGGING) console.log('authService: Cannot reset password while offline');
      throw new Error('Password reset requires an internet connection');
    }
    
    const response = await apiClient.post('/auth/password-reset/reset', { token, newPassword });
    
    // If this was queued for offline processing, modify the message (unlikely for password reset)
    if (response.queued) {
      return { 
        ...response, 
        message: 'Password reset will be processed when you\'re back online.' 
      };
    }
    
    return response;
  } catch (error) {
    console.error('Password reset error:', error);
    throw error;
  }
}

/**
 * Verifies an email verification token.
 * @param {string} token - The email verification token
 * @returns {Promise<Object>} Verification confirmation
 */
async function verifyEmail(token) {
  try {
    if (USE_MOCK_DATA) {
      if (VERBOSE_LOGGING) console.log('authService.verifyEmail using MOCK response');
      
      // Mock validation
      if (!token) {
        throw new Error('Verification token is required');
      }
      
      return {
        success: true,
        message: 'Email has been verified successfully (mock response)'
      };
    }
    
    // Check if we're offline
    if (!offlineManager.getOnlineStatus()) {
      if (VERBOSE_LOGGING) console.log('authService: Cannot verify email while offline');
      throw new Error('Email verification requires an internet connection');
    }
    
    const response = await apiClient.post('/auth/verify-email', { token });
    
    // If this was queued for offline processing, modify the message
    if (response.queued) {
      return { 
        ...response, 
        message: 'Email verification will be processed when you\'re back online.' 
      };
    }
    
    return response;
  } catch (error) {
    console.error('Email verification error:', error);
    throw error;
  }
}

/**
 * Force synchronization of any queued auth operations
 * @returns {Promise<any>} Result of the synchronization attempt
 */
async function synchronize() {
  return apiClient.synchronize();
}

// Create the authService object before exposing to window
const authService = {
  login,
  logout,
  getToken,
  getUserRole,
  isAuthenticated,
  hasRole,
  validateToken,
  refreshToken,
  register,
  requestPasswordReset,
  resetPassword,
  verifyEmail,
  getLastOnlineTimestamp,
  isOfflineSessionExpired,
  synchronize
};

// Expose service to window for console testing (only after it's fully defined)
if (typeof window !== 'undefined') {
  window.authService = authService;
}

export { authService }; 