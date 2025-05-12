const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  // Message passing API
  ipc: {
    // Send message to main process (one-way)
    send: (channel, data) => {
      // Whitelist channels for security
      const validChannels = [
        'app:close',
        'app:minimize',
        'app:maximize',
        'app:reload',
        'webcam:request',
        'quiz:submit',
        'user:activity', // Track user activity for session timeout
        'auth:refreshToken', // Refresh token when needed
        'session:created', // Notify main process when a session is created 
        'session:restored', // Notify main process when a session is restored
        'session:expired', // Notify main process when a session has expired
        'session:ended' // Notify main process when a session is ended
      ];
      if (validChannels.includes(channel)) {
        ipcRenderer.send(channel, data);
      }
    },
    // Send message to main process and wait for response (two-way)
    invoke: async (channel, data) => {
      // Whitelist channels for security
      const validChannels = [
        'ping',
        'dialog:open',
        'webcam:getDevices',
        'auth:login',
        'auth:logout',
        'auth:getToken', // New method to get token
        'auth:validateToken', // New method to validate token
        'quiz:getData',
        'screen:check-recording', // Check if screen recording is detected
        'security:force-check-recording', // Manually trigger screen recording check
        'security:toggle-alt-tab' // Toggle alt-tab prevention
      ];
      if (validChannels.includes(channel)) {
        return await ipcRenderer.invoke(channel, data);
      }
      return null;
    },
    // Handle messages from main process
    on: (channel, callback) => {
      // Whitelist channels for security
      const validChannels = [
        'app:update-available',
        'webcam:status',
        'proctoring:alert',
        'quiz:timer',
        'screen:recording-detected', // Notification when recording is detected
        'screen:display-change',     // Notification about display configuration changes
        'session:timeout',           // Session timeout notification
        'session:reset',             // Session timer reset notification
        'security:toggle-alt-tab',   // Toggle alt-tab prevention notification
        'security:recording-check-result', // Screen recording check result
        'auth:token-expired' // Notification when token has expired
      ];
      if (validChannels.includes(channel)) {
        // Remove any existing listeners to avoid stacking
        ipcRenderer.removeAllListeners(channel);
        
        // Wrap callback to sanitize data
        const newCallback = (_, data) => callback(data);
        ipcRenderer.on(channel, newCallback);
        
        // Return a function to remove the listener
        return () => {
          ipcRenderer.removeListener(channel, newCallback);
        };
      }
      return null;
    }
  },
  // System information API
  system: {
    // Get current platform
    getPlatform: () => process.platform,
    // Get is development mode
    isDevelopment: process.env.NODE_ENV === 'development'
  },
  // Security API - limited safe exposure of security-related info
  security: {
    // Check if the app is running in a secure context
    isSecureContext: () => window.isSecureContext,
    // Get available screen recording protections
    getScreenProtectionStatus: async () => {
      try {
        return await ipcRenderer.invoke('screen:check-recording');
      } catch (error) {
        return { error: 'Failed to check screen recording status', details: error.message };
      }
    },
    // Force check for screen recording
    forceCheckRecording: async () => {
      try {
        return await ipcRenderer.invoke('security:force-check-recording');
      } catch (error) {
        return { error: 'Failed to check screen recording', details: error.message };
      }
    },
    // Prevent Alt+Tab from switching away
    preventAltTab: async () => {
      try {
        return await ipcRenderer.invoke('security:toggle-alt-tab', true);
      } catch (error) {
        return { error: 'Failed to prevent Alt+Tab', details: error.message };
      }
    },
    // Allow Alt+Tab again
    allowAltTab: async () => {
      try {
        return await ipcRenderer.invoke('security:toggle-alt-tab', false);
      } catch (error) {
        return { error: 'Failed to allow Alt+Tab', details: error.message };
      }
    }
  },
  // Authentication API - secure authentication helpers
  auth: {
    // Validate the current authentication token
    validateToken: async () => {
      try {
        return await ipcRenderer.invoke('auth:validateToken');
      } catch (error) {
        return { valid: false, error: 'Failed to validate token', details: error.message };
      }
    },
    // Refresh the authentication token
    refreshToken: async () => {
      try {
        return await ipcRenderer.invoke('auth:refreshToken');
      } catch (error) {
        return { success: false, error: 'Failed to refresh token', details: error.message };
      }
    }
  }
}); 