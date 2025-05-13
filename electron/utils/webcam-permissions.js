/**
 * Webcam Permissions Utility
 * Manages webcam access permissions and device enumeration in Electron
 */

const { systemPreferences } = require('electron');
const config = require('./config');
const { VERBOSE_LOGGING } = config;

/**
 * Check if the application has webcam access permission
 * @returns {Promise<boolean>} Permission status
 */
async function checkWebcamPermission() {
  try {
    // For macOS, we need to check system permissions
    if (process.platform === 'darwin') {
      const status = systemPreferences.getMediaAccessStatus('camera');
      
      if (VERBOSE_LOGGING) {
        console.log('Camera permission status (macOS):', status);
      }
      
      return status === 'granted';
    }
    
    // For Windows and Linux, permissions are handled at browser level
    // We'll return true and let the browser handle the permission request
    return true;
  } catch (error) {
    console.error('Error checking webcam permission:', error);
    return false;
  }
}

/**
 * Request webcam access permission
 * Note: On Windows/Linux this is handled by the browser, 
 * but on macOS we need to explicitly request it
 * @returns {Promise<boolean>} Whether permission was granted
 */
async function requestWebcamPermission() {
  try {
    // For macOS, we need to request system permissions
    if (process.platform === 'darwin') {
      const status = await systemPreferences.askForMediaAccess('camera');
      
      if (VERBOSE_LOGGING) {
        console.log('Camera permission request result (macOS):', status);
      }
      
      return status;
    }
    
    // For Windows and Linux, return true and let the browser handle it
    return true;
  } catch (error) {
    console.error('Error requesting webcam permission:', error);
    return false;
  }
}

/**
 * Set up all webcam permission IPC handlers
 * @param {Object} ipcMain - Electron's ipcMain module
 * @returns {void}
 */
function setupWebcamPermissionHandlers(ipcMain) {
  // Handle webcam permission check request
  ipcMain.handle('webcam:check-permission', async () => {
    const permission = await checkWebcamPermission();
    return { permission };
  });
  
  // Handle webcam permission request
  ipcMain.handle('webcam:request-permission', async () => {
    const permission = await requestWebcamPermission();
    return { permission };
  });
  
  if (VERBOSE_LOGGING) {
    console.log('Webcam permission handlers registered');
  }
}

module.exports = {
  checkWebcamPermission,
  requestWebcamPermission,
  setupWebcamPermissionHandlers
}; 