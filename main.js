/* eslint-env node */
/* eslint-disable no-unused-vars */
const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
/* eslint-enable no-unused-vars */

// Comment out the sandbox enabling - it conflicts with our module requirements
// app.enableSandbox();

const path = require('path');
const electronIsDev = require('electron-is-dev');
// Force production mode for electron:preview script
const isDev = process.argv.includes('electron:preview') ? false : electronIsDev;
const security = require('./security'); // Import our security module
const errorHandler = require('./error-handler'); // Import our error handler
const urlValidator = require('./url-validator'); // Import URL validator
const screenSecurity = require('./screen-security'); // Import screen security module

// Share development mode with other modules
global.isDevelopment = isDev;

// Initialize electron-reloader in development mode
if (isDev) {
  try {
    require('electron-reloader')(module, {
      // Optional: Add specific paths to watch or ignore
      // ignore: ['src/assets', 'src/styles'] 
    });
  } catch (_) {
    console.warn('electron-reloader is not available. Run npm install --save-dev electron-reloader');
  }
}

// Keep a global reference of the window object to prevent it from being garbage collected
let mainWindow;

// Session timer variables
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
let sessionTimer;

/**
 * Reset the session timeout timer
 * @param {BrowserWindow} window - The window to send timeout event to
 */
function resetSessionTimer(window) {
  if (sessionTimer) {
    clearTimeout(sessionTimer);
  }
  
  sessionTimer = setTimeout(() => {
    if (window && !window.isDestroyed()) {
      window.webContents.send('session:timeout');
    }
  }, SESSION_TIMEOUT_MS);
}

function createWindow() {
  console.log('Creating main window...');
  
  try {
    // Create the browser window.
    mainWindow = new BrowserWindow({
      width: 1280,
      height: 720,
      title: 'QuizSecure',
      icon: path.join(__dirname, 'assets/icons/win/app.ico'),
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        preload: path.join(__dirname, 'preload.js'),
        spellcheck: false,
        sandbox: false, // Needs to be disabled for screen-security module to work
        webSecurity: true
      },
      // Hide native window frame in production only
      frame: isDev ? true : false,
      // Prevent app resize in production
      resizable: isDev ? true : false
    });
    
    console.log('Main window created successfully');

    // Apply content security policy and other security measures
    console.log('Applying security measures...');
    security.applySecurityMeasures(mainWindow);
    console.log('Security measures applied successfully');
    
    // Initialize screen security module
    console.log('Initializing screen security...');
    screenSecurity.initScreenSecurity(mainWindow);
    console.log('Screen security initialized');
    
    // Set up secure session management
    console.log('Setting up secure session...');
    setupSecureSession(mainWindow);
    console.log('Secure session set up successfully');
    
    // Set up global error handler for unhandled exceptions/rejections
    console.log('Setting up error handling...');
    errorHandler.setupGlobalErrorHandling(mainWindow);
    console.log('Error handling set up successfully');
    
    // Register an IPC channel for checking recording status
    // This is already registered in screen-security.js, so we don't need to register it again
    /*
    ipcMain.handle('screen:check-recording', async () => {
      // This would implement logic to check for active screen recording
      // For demo purposes, return a negative result
      return {
        detected: false,
        timestamp: Date.now()
      };
    });
    */
    
    console.log('Setting up application menu...');
    // Set up application menu (custom menu in production)
    setupAppMenu();
    console.log('Application menu set up successfully');

    // Load the index.html from the React app
    if (isDev) {
      console.log('Loading development URL: http://localhost:5173');
      mainWindow.loadURL('http://localhost:5173')
        .catch(error => {
          console.error('Failed to load development URL:', error);
          // Try an alternative port
          console.log('Trying alternative port (5174)...');
          mainWindow.loadURL('http://localhost:5174')
            .catch(err => {
              console.error('Failed to load alternative port:', err);
              // Show error in window
              mainWindow.loadURL(`data:text/html,
                <html>
                  <head><title>Error</title></head>
                  <body>
                    <h2>Failed to load application</h2>
                    <p>Error: ${error.message}</p>
                    <p>Make sure the development server is running.</p>
                  </body>
                </html>
              `);
            });
        });
      // Open DevTools automatically in development
      mainWindow.webContents.openDevTools({ mode: 'detach' });
    } else {
      // In production, load from distribution
      const filePath = path.join(__dirname, 'dist/index.html');
      console.log('Loading production file:', filePath);
      mainWindow.loadFile(filePath)
        .catch(error => {
          console.error('Failed to load production file:', error);
          // Show error in window
          mainWindow.loadURL(`data:text/html,
            <html>
              <head><title>Error</title></head>
              <body>
                <h2>Failed to load application</h2>
                <p>Error: ${error.message}</p>
                <p>File path: ${filePath}</p>
              </body>
            </html>
          `);
        });
    }

    console.log('Setting up authentication handlers...');
    setupAuthHandlers(mainWindow);
    console.log('Authentication handlers set up successfully');

    console.log('Setting up session handlers...');
    setupSessionHandlers(mainWindow);
    console.log('Session handlers set up successfully');
  } catch (error) {
    console.error('Error during window creation:', error);
    dialog.showErrorBox('Application Error', 
      `Failed to initialize application: ${error.message}\n\nPlease restart or contact support.`);
  }
}

/**
 * Set up secure session for the application
 * @param {BrowserWindow} window - Main application window
 */
function setupSecureSession(window) {
  // Set session cookie policy
  const ses = window.webContents.session;
  
  // Configure cookie policy
  ses.cookies.set({
    url: isDev ? 'http://localhost' : 'file://',
    httpOnly: true,
    secure: !isDev,
    sameSite: 'strict',
    domain: isDev ? 'localhost' : null,
    path: '/',
    name: 'session-integrity',
    value: 'true'
  });
  
  // Clear session on close if not in dev mode
  if (!isDev) {
    app.on('before-quit', () => {
      ses.clearStorageData({
        storages: ['cookies', 'localstorage', 'cachestorage', 'websql', 'indexdb']
      });
    });
  }
  
  // Reset timer on user activity
  window.on('focus', () => resetSessionTimer(window));
  
  // Reset on IPC from renderer indicating user activity
  ipcMain.on('user:activity', () => resetSessionTimer(window));
  
  // Initial session timer
  resetSessionTimer(window);
}

/**
 * Set up authentication handlers for the application
 * @param {BrowserWindow} window - Main application window
 */
function setupAuthHandlers(window) {
  // Create a secure token store in main process memory
  // This is more secure than storing in renderer process
  let authTokens = new Map();
  
  // Handle login requests from renderer
  ipcMain.handle('auth:login', async (event, credentials) => {
    // In a real app, you would verify credentials with a backend
    // For prototype, we'll simulate a token
    try {
      console.log('Processing login request');
      
      if (!credentials || !credentials.username || !credentials.password) {
        return { success: false, error: 'Invalid credentials' };
      }
      
      // Generate a session ID for this login
      const sessionId = Date.now().toString(36) + Math.random().toString(36).substring(2);
      
      // Create a token that expires in 30 minutes
      const token = {
        value: 'secure-token-' + Math.random().toString(36).substring(2),
        expires: Date.now() + 30 * 60 * 1000, // 30 minutes
        username: credentials.username,
        role: credentials.role || 'student'
      };
      
      // Store the token securely in main process memory
      authTokens.set(sessionId, token);
      
      // Return the session ID to the renderer (not the actual token)
      return { 
        success: true, 
        sessionId,
        role: token.role,
        user: {
          username: credentials.username,
          role: token.role
        }
      };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Authentication failed' };
    }
  });
  
  // Handle token validation
  ipcMain.handle('auth:validateToken', async (event, sessionId) => {
    if (!sessionId) {
      return { valid: false, error: 'No session ID provided' };
    }
    
    const token = authTokens.get(sessionId);
    if (!token) {
      return { valid: false, error: 'Session not found' };
    }
    
    if (token.expires < Date.now()) {
      // Token has expired, remove it
      authTokens.delete(sessionId);
      // Notify renderer that token has expired
      window.webContents.send('auth:token-expired');
      return { valid: false, error: 'Session expired' };
    }
    
    return { valid: true, role: token.role };
  });
  
  // Handle token refresh
  ipcMain.handle('auth:refreshToken', async (event, sessionId) => {
    if (!sessionId) {
      return { success: false, error: 'No session ID provided' };
    }
    
    const token = authTokens.get(sessionId);
    if (!token) {
      return { success: false, error: 'Session not found' };
    }
    
    // Update token expiration
    token.expires = Date.now() + 30 * 60 * 1000; // Extend for another 30 minutes
    authTokens.set(sessionId, token);
    
    return { success: true, expiresAt: token.expires };
  });
  
  // Handle logout
  ipcMain.handle('auth:logout', async (event, sessionId) => {
    if (sessionId && authTokens.has(sessionId)) {
      authTokens.delete(sessionId);
    }
    return { success: true };
  });
  
  // Clean up expired tokens every 5 minutes
  const tokenCleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [sessionId, token] of authTokens.entries()) {
      if (token.expires < now) {
        authTokens.delete(sessionId);
      }
    }
  }, 5 * 60 * 1000);
  
  // Clear interval when app is about to quit
  app.on('before-quit', () => {
    clearInterval(tokenCleanupInterval);
    // Clear all tokens
    authTokens.clear();
  });
}

/**
 * Set up session handlers for the application
 * @param {BrowserWindow} window - Main application window
 */
function setupSessionHandlers(window) {
  // Track user activity for session management
  let lastActivity = Date.now();
  let sessionTimeoutId = null;
  const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
  
  // Handle user activity events from renderer
  ipcMain.on('user:activity', (event, data) => {
    lastActivity = data.timestamp || Date.now();
    
    // Reset session timeout
    resetSessionTimer(window);
  });
  
  // Handle session creation event
  ipcMain.on('session:created', (event, data) => {
    if (VERBOSE_LOGGING) {
      console.log(`Session created for ${data.username} (${data.role})`);
    }
    
    // Reset session timeout
    resetSessionTimer(window);
  });
  
  // Handle session restoration event
  ipcMain.on('session:restored', (event, data) => {
    if (VERBOSE_LOGGING) {
      console.log(`Session restored for ${data.username} (${data.role})`);
    }
    
    // Reset session timeout
    resetSessionTimer(window);
  });
  
  // Handle session expiration event
  ipcMain.on('session:expired', (event, data) => {
    if (VERBOSE_LOGGING) {
      console.log(`Session expired (reason: ${data.reason})`);
    }
    
    // Notify renderer about session timeout
    window.webContents.send('session:timeout', { reason: data.reason });
  });
  
  // Handle session end event
  ipcMain.on('session:ended', (event, data) => {
    if (VERBOSE_LOGGING) {
      console.log(`Session ended for ${data.username}`);
    }
    
    // Clear session timeout
    if (sessionTimeoutId) {
      clearTimeout(sessionTimeoutId);
      sessionTimeoutId = null;
    }
  });
  
  /**
   * Reset session timer based on activity
   */
  function resetSessionTimer(window) {
    // Clear any existing timeout
    if (sessionTimeoutId) {
      clearTimeout(sessionTimeoutId);
    }
    
    // Set a new timeout
    sessionTimeoutId = setTimeout(() => {
      // Check if no activity for session timeout period
      const inactivityTime = Date.now() - lastActivity;
      
      if (inactivityTime >= SESSION_TIMEOUT) {
        console.log('Session timeout due to inactivity');
        
        // Notify renderer about session timeout
        window.webContents.send('session:timeout', { reason: 'inactivity' });
      }
    }, SESSION_TIMEOUT);
    
    // Notify renderer that session timer was reset
    window.webContents.send('session:reset');
  }
  
  // Clean up on window close
  window.on('closed', () => {
    if (sessionTimeoutId) {
      clearTimeout(sessionTimeoutId);
    }
  });
}

// Create window when Electron has finished initialization
app.whenReady().then(() => {
  createWindow();
});

// Quit when all windows are closed
app.on('window-all-closed', () => {
  // On macOS it is common for applications to stay open until the user explicitly quits
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On macOS it's common to re-create a window when the dock icon is clicked
  if (mainWindow === null) {
    createWindow();
  }
});

// Prevent multiple instances of the app
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    // Someone tried to run a second instance, focus our window instead
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

// ======= IPC COMMUNICATION HANDLERS =======

// Simple ping-pong for testing IPC connection
ipcMain.handle('ping', () => {
  return 'pong';
});

// Handle app window controls
ipcMain.on('app:close', () => {
  if (mainWindow) mainWindow.close();
});

ipcMain.on('app:minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('app:maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.on('app:reload', () => {
  if (mainWindow) mainWindow.reload();
});

// Handle dialog operations
ipcMain.handle('dialog:open', async (event, options) => {
  const { canceled, filePaths } = await dialog.showOpenDialog(options);
  if (canceled) {
    return null;
  } else {
    return filePaths;
  }
});

// Handle webcam device enumeration
ipcMain.handle('webcam:getDevices', async () => {
  if (mainWindow) {
    // This requires a user gesture to work properly
    try {
      // Get permission first
      const permission = await mainWindow.webContents.executeJavaScript(`
        navigator.mediaDevices.getUserMedia({video: true})
          .then(() => true)
          .catch(() => false)
      `);
      
      if (!permission) {
        return { error: 'Permission denied' };
      }
      
      // Get devices list
      const devices = await mainWindow.webContents.executeJavaScript(`
        navigator.mediaDevices.enumerateDevices()
          .then(devices => devices.filter(device => device.kind === 'videoinput'))
          .then(devices => devices.map(device => ({
            deviceId: device.deviceId,
            label: device.label || \`Camera \${device.deviceId.slice(0, 5)}...\`
          })))
      `);
      
      return { devices };
    } catch (error) {
      return { error: error.message };
    }
  }
  return { error: 'Window not available' };
});

// Example of sending a message from main to renderer
function sendWebcamStatus(status) {
  if (mainWindow) {
    mainWindow.webContents.send('webcam:status', status);
  }
}

// You can call this function when the webcam status changes
// For example: sendWebcamStatus({ active: true, deviceId: 'some-id' }); 

// Set up application menu
function setupAppMenu() {
  const { Menu, shell } = require('electron'); // Ensure shell is required here

  // Define menu template
  const template = [
    // { role: 'appMenu' } for macOS
    ...(process.platform === 'darwin' ? [{
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideothers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    }] : []),
    // { role: 'fileMenu' }
    {
      label: 'File',
      submenu: [
        // Standard file menu items
        {
          label: 'Reload',
          accelerator: 'CmdOrCtrl+R',
          click: () => {
            if (mainWindow) mainWindow.reload();
          }
        },
        { type: 'separator' },
        process.platform === 'darwin' ? { role: 'close' } : { role: 'quit', accelerator: 'CmdOrCtrl+Q' }
      ]
    },
    // { role: 'editMenu' }
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        ...(process.platform === 'darwin' ? [
          { role: 'pasteAndMatchStyle' },
          { role: 'delete' },
          { role: 'selectAll' },
          { type: 'separator' },
          {
            label: 'Speech',
            submenu: [
              { role: 'startSpeaking' },
              { role: 'stopSpeaking' }
            ]
          }
        ] : [
          { role: 'delete' },
          { type: 'separator' },
          { role: 'selectAll' }
        ])
      ]
    },
    // { role: 'viewMenu' }
    {
      label: 'View',
      submenu: [
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    // Security Menu (as previously defined)
    {
      label: 'Security',
      submenu: [
        {
          label: 'Toggle Alt+Tab Prevention',
          click: async () => {
            if (mainWindow) {
              mainWindow.webContents.send('security:toggle-alt-tab');
            }
          }
        },
        {
          label: 'Check Screen Recording',
          click: async () => {
            if (mainWindow) {
              const result = await screenSecurity.forceScreenRecordingDetection(mainWindow);
              mainWindow.webContents.send('security:recording-check-result', {
                detected: result
              });
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Reset Session',
          click: () => {
            if (mainWindow) {
              resetSessionTimer(mainWindow);
              mainWindow.webContents.send('session:reset');
            }
          }
        }
      ]
    },
    // Development Menu (as previously defined)
    ...(isDev ? [{
      label: 'Development',
      submenu: [
        {
          label: 'Toggle Developer Tools',
          accelerator: 'F12',
          click: () => {
            if (mainWindow) mainWindow.webContents.toggleDevTools();
          }
        },
        {
          label: 'Security Test Page',
          click: () => {
            if (mainWindow) mainWindow.loadURL('http://localhost:5173/security-test');
          }
        }
      ]
    }] : []),
    // { role: 'help' } - Modified for prototype
    {
      role: 'help',
      submenu: [
        /* // Commented out for prototype speed - QuizSecure Team
        {
          label: 'Learn More',
          click: async () => {
            // This would open a link to your project's documentation or GitHub page
            await shell.openExternal('https://github.com/your-repo/quiz-secure'); // Placeholder
          }
        },
        {
          label: 'Report Issue',
          click: async () => {
            // This would open a link to your project's issue tracker
            await shell.openExternal('https://github.com/your-repo/quiz-secure/issues'); // Placeholder
          }
        },
        { type: 'separator' }, // Optional: if you add other help items later
        */
        {
          label: 'About QuizSecure',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About QuizSecure',
              message: 'QuizSecure - Secure Proctoring System',
              detail: `Version: ${app.getVersion()}\nElectron: ${process.versions.electron}\nNode: ${process.versions.node}\nChromium: ${process.versions.chrome}\n\nThis application is a prototype for thesis purposes.`,
              buttons: ['OK']
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
} 