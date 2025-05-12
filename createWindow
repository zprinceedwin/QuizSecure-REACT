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
    ipcMain.handle('screen:check-recording', async () => {
      // This would implement logic to check for active screen recording
      // For demo purposes, return a negative result
      return {
        detected: false,
        timestamp: Date.now()
      };
    });
    
    console.log('Setting up application menu...');
    // Set up application menu (custom menu in production)
    setupAppMenu();
    console.log('Application menu set up successfully');

    // Load the index.html from the React app
    if (isDev) {
      console.log('Loading development URL: http://localhost:3000');
      mainWindow.loadURL('http://localhost:3000')
        .catch(error => {
          console.error('Failed to load development URL:', error);
          // Try an alternative port
          console.log('Trying alternative port (3001)...');
          mainWindow.loadURL('http://localhost:3001')
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
  } catch (error) {
    console.error('Error during window creation:', error);
    dialog.showErrorBox('Application Error', 
      `Failed to initialize application: ${error.message}\n\nPlease restart or contact support.`);
  }
} 