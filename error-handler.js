/**
 * Error handler module for Electron application
 * Provides global error handling for uncaught exceptions
 */
const { dialog } = require('electron');

/**
 * Setup error handling for uncaught exceptions and unhandled promise rejections
 * @param {BrowserWindow} mainWindow - Main application window
 */
function setupGlobalErrorHandling(mainWindow) {
  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    
    try {
      // Notify the user
      if (mainWindow && !mainWindow.isDestroyed()) {
        dialog.showErrorBox(
          'Application Error',
          `An unexpected error occurred:\n\n${error.message}\n\nThe application may be unstable. Please restart.`
        );
        
        // Also send to renderer for display
        mainWindow.webContents.send('app:error', {
          type: 'uncaughtException',
          message: error.message,
          stack: error.stack
        });
      } else {
        dialog.showErrorBox(
          'Application Error',
          `An unexpected error occurred:\n\n${error.message}\n\nThe application may be unstable. Please restart.`
        );
      }
    } catch (dialogError) {
      console.error('Failed to show error dialog:', dialogError);
    }
  });
  
  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Promise Rejection:', reason);
    
    try {
      // Notify the user
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('app:error', {
          type: 'unhandledRejection',
          message: reason instanceof Error ? reason.message : String(reason),
          stack: reason instanceof Error ? reason.stack : null
        });
      }
      
      // For critical operations, show dialog
      if (reason instanceof Error && reason.message.includes('critical')) {
        dialog.showErrorBox(
          'Application Error',
          `A critical error occurred:\n\n${reason.message}\n\nSome features may not work correctly.`
        );
      }
    } catch (dialogError) {
      console.error('Failed to handle rejection:', dialogError);
    }
  });
  
  // Log renderer process errors if received through IPC
  const { ipcMain } = require('electron');
  ipcMain.on('renderer:error', (event, error) => {
    console.error('Renderer Process Error:', error);
  });
  
  console.log('Global error handlers installed');
}

// Export the error handling setup function
module.exports = {
  setupGlobalErrorHandling
}; 