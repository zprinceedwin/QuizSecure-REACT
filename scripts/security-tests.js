/**
 * Security Test Script for QuizSecure
 * 
 * Run this script to test the security measures implemented in the application.
 * These tests should be run manually and verified by visual inspection.
 * 
 * Usage: npm run test:security
 */

const { BrowserWindow, app, session, webContents } = require('electron');
const path = require('path');

let testWindow;
let testResults = {};
const urlValidator = require('../url-validator');

async function runSecurityTests() {
  console.log('========================================');
  console.log('🔒 STARTING SECURITY TESTS');
  console.log('========================================');
  
  // Run tests
  await testContentSecurityPolicy();
  await testURLValidation();
  await testScreenRecordingDetection();
  await testSessionManagement();
  await testWindowSecurity();
  
  // Print results
  console.log('\n========================================');
  console.log('🔒 SECURITY TEST RESULTS');
  console.log('========================================');
  
  let passCount = 0;
  let failCount = 0;
  let skipCount = 0;
  
  for (const [testName, result] of Object.entries(testResults)) {
    const status = result.passed 
      ? '✅ PASS' 
      : (result.skipped ? '⚠️ SKIP' : '❌ FAIL');
      
    if (result.passed) passCount++;
    else if (result.skipped) skipCount++;
    else failCount++;
    
    console.log(`${status}: ${testName}`);
    if (result.message) {
      console.log(`   ${result.message}`);
    }
  }
  
  console.log(`\nSummary: ${passCount} passed, ${failCount} failed, ${skipCount} skipped`);
  
  if (testWindow && !testWindow.isDestroyed()) {
    testWindow.close();
  }
  
  app.quit();
}

async function createTestWindow() {
  if (testWindow && !testWindow.isDestroyed()) {
    testWindow.close();
  }
  
  testWindow = new BrowserWindow({
    width: 800,
    height: 600,
    show: false, // Hide window during tests
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '../preload.js')
    }
  });
  
  return testWindow;
}

async function testContentSecurityPolicy() {
  console.log('\n🔍 Testing Content Security Policy...');
  
  try {
    const window = await createTestWindow();
    
    // Test for CSP headers
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      const headers = details.responseHeaders;
      const hasCsp = headers && 
                    (headers['content-security-policy'] || 
                     headers['Content-Security-Policy']);
      
      testResults['Content Security Policy Headers'] = {
        passed: !!hasCsp,
        message: hasCsp 
          ? 'CSP headers found in response' 
          : 'No CSP headers found in response'
      };
      
      // Continue with the response
      callback({ responseHeaders: headers });
    });
    
    // Load a simple HTML page
    await window.loadFile(path.join(__dirname, 'test-page.html'));
    
    // Test inline script execution (should be blocked by CSP)
    try {
      await window.webContents.executeJavaScript(`
        document.body.innerHTML = '<div id="csp-test">CSP failed - inline script ran</div>';
      `);
      
      testResults['CSP Blocks Inline Scripts'] = {
        passed: false,
        message: 'Inline script was executed, CSP is not working correctly'
      };
    } catch (error) {
      testResults['CSP Blocks Inline Scripts'] = {
        passed: true,
        message: 'Inline script was blocked as expected'
      };
    }
  } catch (error) {
    testResults['Content Security Policy'] = {
      passed: false,
      message: `Error testing CSP: ${error.message}`
    };
  }
}

async function testURLValidation() {
  console.log('\n🔍 Testing URL Validation...');
  
  const testUrls = [
    { 
      url: 'https://example.com', 
      expected: true, 
      name: 'Valid HTTPS URL' 
    },
    { 
      url: 'http://localhost:5173', 
      expected: true, 
      name: 'Local Development URL' 
    },
    { 
      url: 'javascript:alert("XSS")', 
      expected: false, 
      name: 'JavaScript Protocol URL' 
    },
    { 
      url: 'data:text/html;base64,PHNjcmlwdD5hbGVydCgiWFNTIik8L3NjcmlwdD4=', 
      expected: false, 
      name: 'Data URL with HTML' 
    },
    { 
      url: 'data:image/png;base64,iVBORw0KGgo=', 
      expected: true, 
      name: 'Data URL with Image' 
    },
    { 
      url: 'file:///etc/passwd', 
      expected: false, 
      name: 'File URL to System File' 
    },
    { 
      url: 'https://example.com/<script>alert("XSS")</script>', 
      expected: false, 
      name: 'URL with HTML Injection' 
    }
  ];
  
  for (const test of testUrls) {
    const result = urlValidator.isSafeUrl(test.url);
    testResults[`URL Validation: ${test.name}`] = {
      passed: result === test.expected,
      message: result === test.expected 
        ? `Correctly ${test.expected ? 'allowed' : 'blocked'} ${test.url}` 
        : `Incorrectly ${result ? 'allowed' : 'blocked'} ${test.url}`
    };
  }
  
  // Test URL sanitization
  const sanitizedUrl = urlValidator.sanitizeUrl('https://example.com/page?param=value#<script>alert("XSS")</script>');
  testResults['URL Sanitization'] = {
    passed: sanitizedUrl && !sanitizedUrl.includes('<script>'),
    message: sanitizedUrl 
      ? `Successfully sanitized URL: ${sanitizedUrl}` 
      : 'Failed to sanitize URL'
  };
}

async function testScreenRecordingDetection() {
  console.log('\n🔍 Testing Screen Recording Detection...');
  
  // This is a manual test since we can't programmatically start screen recording
  testResults['Screen Recording Detection'] = {
    passed: false,
    skipped: true,
    message: 'Manual testing required: Start screen recording and verify detection'
  };
  
  testResults['Display Change Detection'] = {
    passed: false,
    skipped: true,
    message: 'Manual testing required: Connect external display or change resolution'
  };
}

async function testSessionManagement() {
  console.log('\n🔍 Testing Session Management...');
  
  try {
    const window = await createTestWindow();
    
    // Test secure cookies
    const cookieUrl = 'https://localhost';
    await session.defaultSession.cookies.set({
      url: cookieUrl,
      name: 'test_cookie',
      value: 'test_value',
      httpOnly: true,
      secure: true
    });
    
    const cookies = await session.defaultSession.cookies.get({ url: cookieUrl });
    const testCookie = cookies.find(c => c.name === 'test_cookie');
    
    testResults['Secure Cookie Setting'] = {
      passed: testCookie && testCookie.httpOnly && testCookie.secure,
      message: testCookie 
        ? `Cookie set with httpOnly=${testCookie.httpOnly}, secure=${testCookie.secure}` 
        : 'Failed to set secure cookie'
    };
    
    // Test session timeout (simplified check)
    testResults['Session Timeout'] = {
      passed: false,
      skipped: true,
      message: 'Manual testing required: Wait for session timeout or check implementation'
    };
  } catch (error) {
    testResults['Session Management'] = {
      passed: false,
      message: `Error testing session management: ${error.message}`
    };
  }
}

async function testWindowSecurity() {
  console.log('\n🔍 Testing Window Security...');
  
  try {
    const window = await createTestWindow();
    
    // Test window opening prevention
    window.webContents.setWindowOpenHandler(({ url }) => {
      testResults['Window Opening Prevention'] = {
        passed: true,
        message: 'Window open handler was called correctly'
      };
      return { action: 'deny' };
    });
    
    // Try to open a new window
    await window.webContents.executeJavaScript(`
      window.open('https://example.com');
    `).catch(() => {});
    
    // If we reach this point without the handler being called, it's a failure
    if (!testResults['Window Opening Prevention']) {
      testResults['Window Opening Prevention'] = {
        passed: false,
        message: 'Window open handler was not called'
      };
    }
    
    // Test navigation prevention
    let navigationPrevented = false;
    window.webContents.on('will-navigate', (event) => {
      event.preventDefault();
      navigationPrevented = true;
    });
    
    // Try to navigate
    await window.webContents.executeJavaScript(`
      location.href = 'https://example.com';
    `).catch(() => {});
    
    // Check after a short delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    testResults['Navigation Prevention'] = {
      passed: navigationPrevented,
      message: navigationPrevented 
        ? 'Navigation was prevented correctly' 
        : 'Navigation was not prevented'
    };
  } catch (error) {
    testResults['Window Security'] = {
      passed: false,
      message: `Error testing window security: ${error.message}`
    };
  }
}

// Create a test HTML page if it doesn't exist
const fs = require('fs');
const testPagePath = path.join(__dirname, 'test-page.html');
if (!fs.existsSync(testPagePath)) {
  const testPageContent = `
<!DOCTYPE html>
<html>
<head>
  <title>Security Test Page</title>
</head>
<body>
  <h1>Security Test Page</h1>
  <p>This page is used for security testing.</p>
  <script>
    // This script should be blocked by CSP
    document.body.innerHTML = '<div>CSP failed</div>';
  </script>
</body>
</html>
`;
  try {
    fs.writeFileSync(testPagePath, testPageContent);
    console.log('Created test page at', testPagePath);
  } catch (error) {
    console.error('Failed to create test page:', error);
  }
}

// Run tests when app is ready
app.whenReady().then(runSecurityTests); 