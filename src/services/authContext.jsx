import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { authService } from './authService';
import { sessionService } from './sessionService';
import { VERBOSE_LOGGING } from './config';

// Create the authentication context
const AuthContext = createContext();

/**
 * Authentication Provider component that wraps the application
 * and provides authentication state and methods
 */
export function AuthProvider({ children }) {
  // Authentication state
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tokenRefreshInterval, setTokenRefreshInterval] = useState(null);
  const [lastActivity, setLastActivity] = useState(Date.now());
  
  // Clear error helper function
  const clearError = useCallback(() => setError(null), []);
  
  // Track user activity to prevent session timeout
  const trackActivity = useCallback(() => {
    const now = Date.now();
    setLastActivity(now);
    
    // If in Electron environment, notify the main process
    if (window.electron && isAuthenticated) {
      window.electron.ipc.send('user:activity', { timestamp: now });
    }
    
    // Record activity in session service
    if (isAuthenticated) {
      sessionService.recordUserActivity();
    }
  }, [isAuthenticated]);
  
  // Handle session refresh
  const refreshSession = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      if (VERBOSE_LOGGING) {
        console.log('AuthContext: Refreshing authentication token');
      }
      
      const success = await authService.refreshToken();
      
      if (!success) {
        // If refresh fails, log the user out
        if (VERBOSE_LOGGING) {
          console.error('AuthContext: Token refresh failed, logging out');
        }
        logout();
      }
    } catch (error) {
      if (VERBOSE_LOGGING) {
        console.error('AuthContext: Error refreshing token', error);
      }
      // Don't log out automatically on error to prevent disruption
      // Just log the error
    }
  }, [isAuthenticated]);
  
  // Initialize authentication state from session/storage
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Check if user is already authenticated
        if (authService.isAuthenticated() && sessionService.isAuthenticated()) {
          const userRole = authService.getUserRole();
          
          // Get current session data
          const session = sessionService.getCurrentSession();
          
          if (VERBOSE_LOGGING) {
            console.log('AuthContext: Restored authentication state from session');
          }
          
          // Validate token
          const isValid = await authService.validateToken();
          
          if (isValid) {
            // Set authentication state
            setUser(session ? { username: session.username } : null);
            setRole(userRole);
            setIsAuthenticated(true);
            
            // Set up token refresh if authenticated
            setupTokenRefresh();
          } else {
            // Token is invalid
            if (VERBOSE_LOGGING) {
              console.log('AuthContext: Token validation failed');
            }
            
            // Clean up invalid session
            await logout();
          }
        } else {
          // Not authenticated
          if (VERBOSE_LOGGING) {
            console.log('AuthContext: No valid authentication state found');
          }
          
          setUser(null);
          setRole(null);
          setIsAuthenticated(false);
        }
      } catch (error) {
        if (VERBOSE_LOGGING) {
          console.error('AuthContext: Error initializing auth state', error);
        }
        
        setError(error.message || 'Failed to initialize authentication');
      } finally {
        setIsLoading(false);
      }
    };
    
    initializeAuth();
    
    // Set up activity tracking
    const activityEvents = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    
    const handleActivity = () => {
      trackActivity();
    };
    
    // Add event listeners for activity tracking
    activityEvents.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true });
    });
    
    // Listen for session events
    const handleSessionExpired = () => {
      if (VERBOSE_LOGGING) {
        console.log('AuthContext: Session expired event received');
      }
      
      // Clear authentication state
      setUser(null);
      setRole(null);
      setIsAuthenticated(false);
      setError('Your session has expired. Please login again.');
      
      // Clean up token refresh interval
      if (tokenRefreshInterval) {
        clearInterval(tokenRefreshInterval);
        setTokenRefreshInterval(null);
      }
    };
    
    // Add session expiration listener if in Electron environment
    let removeListener;
    if (window.electron) {
      removeListener = window.electron.ipc.on('session:timeout', handleSessionExpired);
    }
    
    // Clean up
    return () => {
      // Remove activity event listeners
      activityEvents.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      
      // Remove session expiration listener
      if (removeListener) removeListener();
      
      // Clear token refresh interval
      if (tokenRefreshInterval) {
        clearInterval(tokenRefreshInterval);
      }
    };
  }, [trackActivity, tokenRefreshInterval]);
  
  // Setup token refresh interval
  const setupTokenRefresh = useCallback(() => {
    // Clear any existing interval
    if (tokenRefreshInterval) {
      clearInterval(tokenRefreshInterval);
    }
    
    // Set up new interval - refresh token every 20 minutes
    const intervalId = setInterval(refreshSession, 20 * 60 * 1000);
    setTokenRefreshInterval(intervalId);
    
    if (VERBOSE_LOGGING) {
      console.log('AuthContext: Token refresh interval set up');
    }
    
    return intervalId;
  }, [refreshSession, tokenRefreshInterval]);
  
  /**
   * Login function
   * @param {string} username - The username.
   * @param {string} password - The password.
   * @param {string} role - The user role.
   * @param {boolean} rememberMe - Whether to persist the login.
   * @returns {Promise<Object>} - The login result.
   */
  const login = async (username, password, userRole = 'student', rememberMe = false) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Call auth service login
      const result = await authService.login(username, password, userRole, rememberMe);
      
      if (result.user) {
        // Successfully authenticated
        setUser(result.user);
        setRole(result.user.role || userRole);
        setIsAuthenticated(true);
        
        // Set up token refresh
        setupTokenRefresh();
        
        // Track initial activity
        trackActivity();
        
        if (VERBOSE_LOGGING) {
          console.log(`AuthContext: User ${username} logged in successfully`);
        }
        
        return { success: true, user: result.user };
      } else {
        // Failed to authenticate
        setError('Login failed: Invalid response from server');
        return { success: false, error: 'Invalid response from server' };
      }
    } catch (error) {
      if (VERBOSE_LOGGING) {
        console.error('AuthContext: Login error', error);
      }
      
      setError(error.message || 'Authentication failed');
      return { success: false, error: error.message || 'Authentication failed' };
    } finally {
      setIsLoading(false);
    }
  };
  
  /**
   * Logout function
   * @returns {Promise<Object>} - The logout result.
   */
  const logout = async () => {
    try {
      setIsLoading(true);
      
      // Call auth service logout
      const result = await authService.logout();
      
      // Clear authentication state
      setUser(null);
      setRole(null);
      setIsAuthenticated(false);
      
      // Clean up token refresh
      if (tokenRefreshInterval) {
        clearInterval(tokenRefreshInterval);
        setTokenRefreshInterval(null);
      }
      
      if (VERBOSE_LOGGING) {
        console.log('AuthContext: User logged out successfully');
      }
      
      return { success: true };
    } catch (error) {
      if (VERBOSE_LOGGING) {
        console.error('AuthContext: Logout error', error);
      }
      
      setError(error.message || 'Logout failed');
      return { success: false, error: error.message || 'Logout failed' };
    } finally {
      setIsLoading(false);
    }
  };
  
  /**
   * Function to register a new user
   * @param {Object} userData - User registration data
   * @returns {Promise<Object>} - The registration result
   */
  const register = async (userData) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Call auth service register
      const result = await authService.register(userData);
      
      if (VERBOSE_LOGGING) {
        console.log(`AuthContext: User registration ${result.success ? 'successful' : 'failed'}`);
      }
      
      return result;
    } catch (error) {
      if (VERBOSE_LOGGING) {
        console.error('AuthContext: Registration error', error);
      }
      
      setError(error.message || 'Registration failed');
      return { success: false, error: error.message || 'Registration failed' };
    } finally {
      setIsLoading(false);
    }
  };
  
  /**
   * Check if the current user has the specified role
   * @param {string|string[]} requiredRoles - The required role(s)
   * @returns {boolean} - Whether the user has the required role
   */
  const hasRole = useCallback((requiredRoles) => {
    if (!isAuthenticated || !role) {
      return false;
    }
    
    if (Array.isArray(requiredRoles)) {
      return requiredRoles.includes(role);
    }
    
    return role === requiredRoles;
  }, [isAuthenticated, role]);
  
  // Authentication context value
  const value = {
    user,
    role,
    isAuthenticated,
    isLoading,
    error,
    lastActivity,
    login,
    logout,
    register,
    hasRole,
    clearError,
    refreshSession
  };
  
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Custom hook to use the authentication context
 * @returns {Object} - The authentication context value
 */
export function useAuth() {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
}

// Export AuthContext for direct usage if needed
export default AuthContext; 