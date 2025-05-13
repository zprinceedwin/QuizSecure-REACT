/**
 * Security module for Electron application
 * Handles Content Security Policy and other security measures
 */
const { session, app, net } = require('electron');
const urlValidator = require('./url-validator');

/**
 * Apply basic security measures for Electron
 * @param {BrowserWindow} mainWindow - The main application window
 */
function applySecurityMeasures(mainWindow) {
  // Set Content Security Policy for all web requests
  applyContentSecurityPolicy();
  
  // Prevent navigation to unknown origins
  preventNavigationToUnknownOrigins(mainWindow);
  
  // Limit permission requests
  handlePermissionRequests(mainWindow.webContents.session);
  
  // Disable remote module (deprecated but good to ensure disabled)
  disableRemoteModule();
  
  // Handle insecure content
  blockInsecureContent(mainWindow.webContents.session);
  
  // Listen for webContent creation to apply security measures
  listenForWebContentsCreation();
  
  // Configure certificate verification
  setupCertificateVerification(mainWindow.webContents.session);
  
  // Handle CORS restrictions
  setupCorsRestrictions(mainWindow.webContents.session);
  
  // Filter potentially dangerous protocols
  filterDangerousProtocols();
  
  // Disable experimental features
  disableExperimentalFeatures(mainWindow.webContents.session);
}

/**
 * Apply Content Security Policy
 */
function applyContentSecurityPolicy() {
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self';",
          "script-src 'self';",
          "img-src 'self' data:;",
          "style-src 'self' 'unsafe-inline';", // Allowing unsafe-inline for styles due to React inline styles
          "font-src 'self';",
          "connect-src 'self';",
          "media-src 'self' mediastream:;", // For webcam access
          "object-src 'none';",
          "child-src 'none';",
          "frame-src 'none';",
          "base-uri 'self';",
          "form-action 'self';",
          "frame-ancestors 'none';",
          "upgrade-insecure-requests;",
          "worker-src 'self';", // Restrict workers to same origin
          "manifest-src 'self';", // Restrict web manifests
          "prefetch-src 'self';", // Control prefetching
          "require-trusted-types-for 'script';" // Enable Trusted Types for XSS prevention in supporting browsers
        ].join(' ')
      }
    });
  });
}

/**
 * Prevent navigation to origins that aren't in the allowlist
 * @param {BrowserWindow} window - Electron BrowserWindow object
 */
function preventNavigationToUnknownOrigins(window) {
  // Track the origin in development and production
  const trustedOrigins = [
    'http://localhost:5173', // Development origin (default Vite port)
    'http://localhost:5174', // Alternative Vite port
    `file://${__dirname}` // Production origin
  ];
  
  window.webContents.on('will-navigate', (event, url) => {
    // Use our URL validator to check if the origin is allowed
    if (!urlValidator.isAllowedOrigin(new URL(url).origin, trustedOrigins)) {
      // Block the navigation
      event.preventDefault();
      console.warn(`Navigation to untrusted origin blocked: ${new URL(url).origin}`);
    }
  });
}

/**
 * Handle permission requests
 * @param {Electron.Session} session - Electron session
 */
function handlePermissionRequests(session) {
  session.setPermissionRequestHandler((webContents, permission, callback) => {
    const url = webContents.getURL();
    
    // List of allowed permissions
    const allowedPermissions = [
      'media', // Webcam/microphone access
      'notifications'
    ];
    
    // Allow permissions that are needed for application functionality
    if (allowedPermissions.includes(permission)) {
      return callback(true);
    }
    
    // Deny all other permission requests
    console.warn(`Permission request '${permission}' denied for URL: ${url}`);
    return callback(false);
  });
}

/**
 * Disable the remote module
 */
function disableRemoteModule() {
  // This is now disabled by default in Electron 10+, but including for safety
  if (process.env.ELECTRON_DISABLE_REMOTE_MODULE !== '1') {
    process.env.ELECTRON_DISABLE_REMOTE_MODULE = '1';
  }
}

/**
 * Block insecure content
 * @param {Electron.Session} session - Electron session
 */
function blockInsecureContent(session) {
  // Use the global development mode flag
  const isDev = global.isDevelopment;
  const localDevServers = ['http://localhost:5173', 'http://localhost:5174'];
  
  console.log('Security module running in', isDev ? 'development' : 'production', 'mode');
  
  // Block all insecure content
  session.webRequest.onBeforeRequest((details, callback) => {
    // If the app is loaded from file://
    if (details.url.startsWith('file://')) {
      // Allow all file:// URLs
      return callback({});
    }
    
    // Always allow local development servers in dev mode
    if (isDev && localDevServers.some(server => details.url.startsWith(server))) {
      return callback({});
    }
    
    // Block HTTP requests when app is running in production
    if (!isDev && details.url.startsWith('http://')) {
      console.warn(`Blocked insecure request to: ${details.url}`);
      return callback({ cancel: true });
    }
    
    // Allow everything else
    callback({});
  });
}

/**
 * Listen for webContent creation to apply security measures
 */
function listenForWebContentsCreation() {
  // Apply security to new web contents (webviews, popups)
  app.on('web-contents-created', (event, contents) => {
    // Prevent creating more windows, popups
    contents.on('new-window', (event, navigationUrl) => {
      event.preventDefault();
      console.warn('Prevented opening a new window');
    });

    // Disable navigation
    contents.on('will-navigate', (event, navigationUrl) => {
      if (navigationUrl !== contents.getURL()) {
        event.preventDefault();
        console.warn(`Navigation prevented: ${navigationUrl}`);
      }
    });
    
    // Limit features on new web content
    contents.setWindowOpenHandler(() => {
      return { action: 'deny' };
    });
    
    // Prevent attaching webview
    contents.on('will-attach-webview', (event, webPreferences, params) => {
      // Strip away preload scripts if not from verified location
      delete webPreferences.preload;
      
      // Enforce secure settings for webviews
      webPreferences.nodeIntegration = false;
      webPreferences.contextIsolation = true;
      webPreferences.enableBlinkFeatures = '';
      webPreferences.allowRunningInsecureContent = false;
      webPreferences.webSecurity = true;
      
      // Verify URL is allowlisted
      if (!urlValidator.isSafeUrl(params.src)) {
        event.preventDefault();
        console.warn(`Blocked webview attachment for unsafe URL: ${params.src}`);
      }
    });
    
    // Disable alerts and prompts from renderer
    contents.on('before-input-event', (event, input) => {
      // Prevent keyboard shortcuts that might be used for debug or unwanted functionality
      if ((input.control || input.meta) && input.key.toLowerCase() === 'r') {
        // Prevent reload with Ctrl+R / Cmd+R outside of development
        if (!global.isDevelopment) {
          event.preventDefault();
        }
      }
    });
  });
}

/**
 * Filter potentially dangerous protocols
 */
function filterDangerousProtocols() {
  // Register protocol handling checking
  app.on('register-standard-schemes', () => {
    // Only file:, https: allowed in production
    const allowedProtocols = ['file:', 'https:'];
    if (global.isDevelopment) {
      allowedProtocols.push('http:'); // Allow HTTP in development only
    }
    
    session.defaultSession.protocol.interceptProtocolRequest('*', (request, callback) => {
      const url = request.url;
      const protocol = new URL(url).protocol;
      
      if (!allowedProtocols.includes(protocol)) {
        console.warn(`Blocked request to disallowed protocol: ${protocol}`);
        return callback({ error: -3 }); // Abort request
      }
      
      // Continue with the request
      callback({ url });
    });
  });
}

/**
 * Setup certificate verification
 * @param {Electron.Session} session - Electron session
 */
function setupCertificateVerification(session) {
  // Verify certificates
  session.setCertificateVerifyProc((request, callback) => {
    const { hostname, certificate, verificationResult, errorCode } = request;
    
    // Log certificate problems in development
    if (global.isDevelopment && errorCode !== 0) {
      console.warn(`Certificate verification failed for ${hostname}, error code: ${errorCode}`);
      console.warn('Certificate details:', certificate);
    }
    
    // In production, enforce certificate validity
    if (!global.isDevelopment && errorCode !== 0) {
      // Reject all invalid certificates in production
      console.error(`Invalid certificate for ${hostname}, error: ${errorCode}`);
      return callback(-2); // Reject certificate
    }
    
    // Allow local and development certificates
    if (hostname === 'localhost' || global.isDevelopment) {
      return callback(0); // Accept certificate
    }
    
    // Use the default verification result
    callback(verificationResult);
  });
}

/**
 * Setup CORS restrictions
 * @param {Electron.Session} session - Electron session
 */
function setupCorsRestrictions(session) {
  // Implement strict CORS policy
  session.webRequest.onHeadersReceived((details, callback) => {
    const headers = { ...details.responseHeaders };
    
    // Only allow CORS in development mode
    if (!global.isDevelopment) {
      // Remove any permissive CORS headers
      delete headers['access-control-allow-origin'];
      
      // Add restrictive CORS headers
      headers['access-control-allow-origin'] = ['null'];
      headers['access-control-allow-methods'] = ['GET, POST'];
      headers['access-control-allow-headers'] = ['Content-Type, Authorization'];
      headers['access-control-allow-credentials'] = ['false'];
    }
    
    callback({ responseHeaders: headers });
  });
}

/**
 * Disable experimental features
 * @param {Electron.Session} session - Electron session
 */
function disableExperimentalFeatures(session) {
  // Disable experimental features that may be security risks
  const features = [
    'SharedArrayBuffer', 
    'WebAssemblyStreamingCompilation', 
    'WebSQL',
    'SharedWorker'
  ];
  
  for (const feature of features) {
    session.setPermissionCheckHandler((webContents, permission, requestingOrigin, details) => {
      if (details?.feature === feature) {
        return false; // Deny access to experimental features
      }
      return undefined; // Use default for other permissions
    });
  }
}

module.exports = {
  applySecurityMeasures
}; 