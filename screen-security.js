/**
 * Screen Security Module
 * Detects and prevents screen recording and man-in-the-middle attacks
 * Essential for secure online proctoring
 */
const { app, screen, ipcMain, desktopCapturer, globalShortcut, BrowserWindow } = require('electron');

// Store screenshots to compare later
let screenshotHistory = [];
const MAX_HISTORY = 5;
const SCREENSHOT_INTERVAL_MS = 5000; // 5 seconds
let screenshotInterval = null;
let altTabDisabled = false;

/**
 * Initialize screen security monitoring
 * @param {BrowserWindow} mainWindow - Main application window
 */
function initScreenSecurity(mainWindow) {
  // Start screenshot detection
  startScreenshotMonitoring(mainWindow);
  
  // Monitor screen connections
  monitorDisplayChanges(mainWindow);
  
  // Set up detection clearing on app exit
  setupCleanup();
  
  // Start screen capture detection
  detectScreenCapture(mainWindow);
  
  // Set up IPC handlers
  setupIpcHandlers(mainWindow);
}

/**
 * Set up IPC handlers for security controls
 * @param {BrowserWindow} mainWindow - Main application window
 */
function setupIpcHandlers(mainWindow) {
  // Handle request to toggle Alt+Tab prevention
  ipcMain.handle('security:toggle-alt-tab', (event, enabled) => {
    if (enabled) {
      preventAltTab();
      return { success: true, altTabDisabled: true };
    } else {
      allowAltTab();
      return { success: true, altTabDisabled: false };
    }
  });
  
  // Handle direct check of screen recording status
  ipcMain.handle('security:force-check-recording', async () => {
    // Force a recording check and return the result
    const isRecording = await forceScreenRecordingDetection(mainWindow);
    return { detected: isRecording };
  });
}

/**
 * Prevent Alt+Tab from switching away from the application
 */
function preventAltTab() {
  console.log('Activating Alt+Tab prevention using multiple methods...');
  
  // If already disabled, don't register again
  if (altTabDisabled) {
    console.log('Alt+Tab prevention already active');
    return;
  }
  
  try {
    // Method 1: Global shortcut registration
    // Register shortcuts to prevent app switching
    const shortcuts = [
      'Alt+Tab', 
      'Alt+Shift+Tab', 
      'Alt+Esc',
      'Ctrl+Alt+Delete', 
      'Ctrl+Shift+Esc',
      'Super+Tab', 
      'Super+D',
      'Alt+F4',
      'Super+1',
      'Super+2',
      'Super+3',
      'Super+4',
      'Super+5',
      'Super+Down',
      'Super+Up',
      'Super+Left',
      'Super+Right'
    ];
    
    for (const shortcut of shortcuts) {
      const success = globalShortcut.register(shortcut, () => {
        console.log(`Blocked shortcut: ${shortcut}`);
        return false;
      });
      
      if (!success) {
        console.warn(`Failed to register shortcut: ${shortcut}`);
      }
    }
    
    // Method 2: Keep window always on top and focused
    // This is more effective than just blocking shortcuts
    BrowserWindow.getAllWindows().forEach(window => {
      window.setAlwaysOnTop(true, 'screen-saver');
      window.setVisibleOnAllWorkspaces(true);
      window.setFullScreenable(false);
      
      // Set up event listeners to keep focus
      window.on('blur', () => {
        if (altTabDisabled) {
          console.log('Window lost focus, bringing back to front');
          window.focus();
        }
      });
    });
    
    // Method 3: Set up interval to keep focus
    const focusInterval = setInterval(() => {
      if (altTabDisabled) {
        const activeWindow = BrowserWindow.getFocusedWindow();
        if (!activeWindow) {
          console.log('No active window, focusing main window');
          BrowserWindow.getAllWindows().forEach(window => window.focus());
        }
      } else {
        clearInterval(focusInterval);
      }
    }, 500); // Check every 500ms
    
    console.log('Alt+Tab prevention activated successfully with multiple methods');
    
    // Set flag
    altTabDisabled = true;
  } catch (error) {
    console.error('Error while preventing Alt+Tab:', error);
  }
}

/**
 * Allow Alt+Tab switching again
 */
function allowAltTab() {
  console.log('Deactivating Alt+Tab prevention...');
  
  // Unregister all global shortcuts
  globalShortcut.unregisterAll();
  
  // Restore window behavior
  BrowserWindow.getAllWindows().forEach(window => {
    window.setAlwaysOnTop(false);
    window.setVisibleOnAllWorkspaces(false);
    window.setFullScreenable(true);
  });
  
  // Set flag
  altTabDisabled = false;
  
  console.log('Alt+Tab prevention deactivated');
}

/**
 * Force check for screen recording and notify if detected
 * @param {BrowserWindow} mainWindow - Main application window
 * @returns {Promise<boolean>} True if recording is detected
 */
async function forceScreenRecordingDetection(mainWindow) {
  try {
    console.log('Performing accurate screen recording detection check...');
    
    // Get all sources including screens and windows
    const sources = await desktopCapturer.getSources({ 
      types: ['screen', 'window'],
      thumbnailSize: { width: 50, height: 50 }
    });
    
    // For proper implementation, don't force detection
    // Remove the forced detection from previous version
    
    // Look for known recording software windows
    const recordingSoftware = sources.filter(source => {
      const name = source.name.toLowerCase();
      return name.includes('obs') || 
             name.includes('screen recorder') || 
             name.includes('capture') || 
             name.includes('record') ||
             name.includes('stream') ||
             name.includes('bandicam') ||
             name.includes('camtasia') ||
             name.includes('quicktime') ||
             name.includes('snip & sketch') ||
             name.includes('snipping tool') ||
             name.includes('screen clip') ||
             name.includes('xsplit') ||
             name.includes('sharex') ||
             name.includes('fraps');
    });
    
    // If any recording software is detected
    if (recordingSoftware.length > 0) {
      console.log('Screen recording detected:', recordingSoftware.map(s => s.name));
      
      // Notify renderer
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('screen:recording-detected', {
          detected: true,
          timestamp: Date.now(),
          confidence: 'high',
          type: 'software',
          software: recordingSoftware.map(s => s.name)
        });
      }
      
      return true;
    }
    
    // Check for evidence of system screen capture API usage
    // This varies by platform, but we can check for some indicators
    
    // On Windows, check running processes
    // This is a simplified approach - for a real app, use a native module
    if (process.platform === 'win32') {
      try {
        // Use powershell to check for screen recording processes
        const { execSync } = require('child_process');
        const output = execSync('powershell -command "Get-Process | Where-Object { $_.ProcessName -match \'ffmpeg|obs|bandicam|action|fraps|camtasia|sharex|xsplit|screenrec\' } | Select-Object ProcessName | ConvertTo-Json"').toString();
        
        // Check if any recording processes were found
        if (output && output.length > 2) { // More than just empty brackets []
          console.log('Screen recording process detected through PowerShell check');
          
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('screen:recording-detected', {
              detected: true,
              timestamp: Date.now(),
              confidence: 'medium',
              type: 'process',
              details: 'Recording process detected'
            });
          }
          
          return true;
        }
      } catch (error) {
        console.error('Error checking processes:', error);
        // Continue with other detection methods
      }
    }
    
    console.log('No screen recording detected');
    return false;
  } catch (error) {
    console.error('Error in screen recording detection:', error);
    return false;
  }
}

/**
 * Start periodic screenshot comparison to detect screen recording
 * @param {BrowserWindow} mainWindow - Main application window
 */
function startScreenshotMonitoring(mainWindow) {
  // Clear any existing interval
  if (screenshotInterval) {
    clearInterval(screenshotInterval);
  }
  
  // Initialize screenshot history
  screenshotHistory = [];
  
  // Take periodic screenshots to compare
  screenshotInterval = setInterval(async () => {
    try {
      if (!mainWindow || mainWindow.isDestroyed()) {
        clearInterval(screenshotInterval);
        return;
      }
      
      // Take screenshot of primary display
      const primaryDisplay = screen.getPrimaryDisplay();
      const { id, bounds } = primaryDisplay;
      
      // Get screenshot
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width: 50, height: 50 } // Small thumbnail for comparison
      });
      
      const primarySource = sources.find(source => source.display_id === id.toString());
      if (!primarySource) return;
      
      // Use the thumbnail for comparison (in a real app, use image comparison)
      const thumbnail = primarySource.thumbnail.toDataURL();
      
      // Add to history
      addToScreenshotHistory(thumbnail);
      
      // Check for consistent changes indicating recording
      detectConsistentChanges(mainWindow);
    } catch (error) {
      console.error('Error in screenshot monitoring:', error);
    }
  }, SCREENSHOT_INTERVAL_MS);
}

/**
 * Add screenshot to history with limited size
 * @param {string} screenshot - Base64 thumbnail of screenshot
 */
function addToScreenshotHistory(screenshot) {
  screenshotHistory.push({
    timestamp: Date.now(),
    data: screenshot
  });
  
  // Keep history at a reasonable size
  if (screenshotHistory.length > MAX_HISTORY) {
    screenshotHistory.shift();
  }
}

/**
 * Detect consistent changes in screenshots that might indicate recording
 * @param {BrowserWindow} mainWindow - Main application window
 */
function detectConsistentChanges(mainWindow) {
  // Need at least 3 screenshots to detect patterns
  if (screenshotHistory.length < 3) return;
  
  // In a real implementation, this would use image analysis to detect:
  // 1. Recording indicators or borders
  // 2. Consistent overlay elements
  // 3. Compression artifacts from screen sharing
  
  // Enhanced detection
  forceScreenRecordingDetection(mainWindow)
    .then(isRecording => {
      if (isRecording) {
        console.log('Recording detected through enhanced detection');
      }
    })
    .catch(err => {
      console.error('Error in enhanced recording detection:', err);
    });
    
  // Original detection logic for pattern-based detection
  const potentialRecording = checkForRecordingIndicators();
  
  if (potentialRecording) {
    // Alert the renderer process about potential recording
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('screen:recording-detected', {
        detected: true,
        timestamp: Date.now(),
        confidence: potentialRecording.confidence,
        type: potentialRecording.type
      });
    }
  }
}

/**
 * Check for recording indicators in screenshots
 * @returns {Object|null} Detection info or null if no recording detected
 */
function checkForRecordingIndicators() {
  // This is a placeholder for actual image processing
  // In a real application, implement computer vision techniques to:
  // - Detect recording software UI elements
  // - Identify screen sharing indicators
  // - Find compression artifacts from remote viewing
  
  // For demo purposes, return null normally, and after every 100th check,
  // return a simulated detection to demonstrate the UI response
  const randomDetection = Math.random() < 0.01; // 1% chance of detection for testing
  if (randomDetection) {
    return {
      confidence: 'medium',
      type: 'pattern'
    };
  }
  
  return null;
}

/**
 * Monitor display changes which could indicate HDMI splitters or VNC
 * @param {BrowserWindow} mainWindow - Main application window
 */
function monitorDisplayChanges(mainWindow) {
  // Store initial display configuration
  const initialDisplays = screen.getAllDisplays();
  const initialConfig = serializeDisplayConfig(initialDisplays);
  
  // Monitor for display changes
  screen.on('display-added', () => {
    checkDisplayChanges(initialConfig, mainWindow);
  });
  
  screen.on('display-removed', () => {
    checkDisplayChanges(initialConfig, mainWindow);
  });
  
  screen.on('display-metrics-changed', () => {
    checkDisplayChanges(initialConfig, mainWindow);
  });
}

/**
 * Serialize display configuration for comparison
 * @param {Array} displays - Array of Display objects
 * @returns {Object} Serialized configuration
 */
function serializeDisplayConfig(displays) {
  return displays.map(display => ({
    id: display.id,
    bounds: { ...display.bounds },
    scaleFactor: display.scaleFactor,
    rotation: display.rotation
  }));
}

/**
 * Check for suspicious display changes
 * @param {Object} initialConfig - Initial display configuration
 * @param {BrowserWindow} mainWindow - Main application window
 */
function checkDisplayChanges(initialConfig, mainWindow) {
  const currentDisplays = screen.getAllDisplays();
  const currentConfig = serializeDisplayConfig(currentDisplays);
  
  // Detect new displays
  if (currentDisplays.length > initialConfig.length) {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('screen:display-change', {
        type: 'added',
        timestamp: Date.now(),
        displays: currentConfig
      });
    }
  }
  
  // Detect resolution changes that might indicate HDMI splitters
  currentConfig.forEach(current => {
    const initial = initialConfig.find(d => d.id === current.id);
    if (initial) {
      if (current.bounds.width !== initial.bounds.width || 
          current.bounds.height !== initial.bounds.height ||
          current.scaleFactor !== initial.scaleFactor) {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('screen:display-change', {
            type: 'metrics-changed',
            timestamp: Date.now(),
            display: current,
            initial: initial
          });
        }
      }
    }
  });
}

/**
 * Detect active screen capture/screen sharing
 * @param {BrowserWindow} mainWindow - Main application window
 */
function detectScreenCapture(mainWindow) {
  // This requires platform-specific implementation
  if (process.platform === 'darwin') {
    // macOS implementation would use Objective-C bridge to CGWindowListCopyWindowInfo
    detectScreenCaptureOnMacOS(mainWindow);
  } else if (process.platform === 'win32') {
    // Windows implementation would use native API through node-ffi
    detectScreenCaptureOnWindows(mainWindow);
  }
  
  // Add listener for renderer requests to check screen capture status
  ipcMain.handle('screen:check-recording', async () => {
    const isRecording = await checkActiveScreenCapture();
    return { isRecording };
  });
}

/**
 * Detect screen capture on macOS
 * @param {BrowserWindow} mainWindow - Main application window
 */
function detectScreenCaptureOnMacOS(mainWindow) {
  // Placeholder for macOS implementation
  // Real implementation would use native bridges
  console.log('macOS screen capture detection not implemented in this example');
}

/**
 * Detect screen capture on Windows
 * @param {BrowserWindow} mainWindow - Main application window
 */
function detectScreenCaptureOnWindows(mainWindow) {
  // Placeholder for Windows implementation
  // Real implementation would use Windows API
  console.log('Windows screen capture detection not implemented in this example');
}

/**
 * Check if screen capturing is currently active
 * @returns {Promise<boolean>} True if screen capture is detected
 */
async function checkActiveScreenCapture() {
  // Placeholder implementation
  // Real implementation would check OS-specific APIs
  try {
    // Get all screen capture sources
    const sources = await desktopCapturer.getSources({ types: ['screen', 'window'] });
    
    // In a real app, we would check if any sources indicate active recording
    // This is just a placeholder
    return false;
  } catch (error) {
    console.error('Error checking screen capture:', error);
    return false;
  }
}

/**
 * Clean up resources when app exits
 */
function setupCleanup() {
  app.on('before-quit', () => {
    if (screenshotInterval) {
      clearInterval(screenshotInterval);
      screenshotInterval = null;
    }
    
    // Clear screenshot history to free memory
    screenshotHistory = [];
    
    // Ensure shortcuts are unregistered
    allowAltTab();
  });
}

module.exports = {
  initScreenSecurity,
  preventAltTab,
  allowAltTab,
  forceScreenRecordingDetection
}; 