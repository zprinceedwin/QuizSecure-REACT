# Security Testing Guide

This guide provides instructions on how to test the security features implemented in QuizSecure.

## Automated Tests

To run the automated security tests:

```bash
npm run test:security
```

These tests will verify:
- Content Security Policy (CSP) implementation
- URL validation and sanitization
- Secure session management
- Window and navigation security

## Manual Testing

Some security features require manual testing:

### 1. Screen Recording Detection

1. Start the application: `npm run electron:dev`
2. Open the Security Test UI page (add a link to this component in your application)
3. Start a screen recording/sharing using built-in OS features or tools like OBS
4. Check if the application detects the screen recording within 10-15 seconds
5. If implemented on macOS, try using QuickTime Player to record the screen
6. If implemented on Windows, try using the built-in Game Bar (Win+G) to record

### 2. Display Change Detection

1. Start the application: `npm run electron:dev`
2. Open the Security Test UI page
3. Connect an external display or change your screen resolution
4. Check if the application detects the display change

### 3. Session Timeout

1. Start the application: `npm run electron:dev`
2. Open the Security Test UI page and navigate to the Session Info tab
3. Leave the application untouched for 5-10 minutes
4. Verify that the session timeout countdown is working
5. Wait for the full timeout period (30 minutes) or adjust the timeout for testing
6. Verify that the session timeout event is triggered

### 4. URL Validation

1. Start the application: `npm run electron:dev`
2. Open the Security Test UI page and navigate to the URL Validation tab
3. Test various URLs:
   - `https://example.com` (should pass)
   - `javascript:alert('XSS')` (should be blocked)
   - `data:text/html,<script>alert('XSS')</script>` (should be blocked)
   - `data:image/png;base64,iVBORw0KGgo=` (should pass)
   - `https://example.com/<script>alert('XSS')</script>` (should be sanitized)
4. Verify the validation results match the expected behavior

### 5. CSP Protection

1. Start the application: `npm run electron:dev`
2. Open the Developer Tools (F12 or Ctrl+Shift+I)
3. Go to the Console tab
4. Check for CSP violation messages
5. Try to execute arbitrary JavaScript in the console:
   ```javascript
   document.body.innerHTML = '<div>Injected content</div>';
   ```
6. Verify that CSP blocks the script execution and logs a violation

### 6. Navigation Lock

1. Start the application: `npm run electron:dev`
2. Try to navigate to external sites by:
   - Entering a URL in the address bar (if available)
   - Trying to open a link that would navigate away from the app
   - Running `location.href = 'https://example.com'` in Developer Tools console
3. Verify that the navigation is blocked

## Security Checklist

Use this checklist to ensure all security features are working:

- [ ] CSP prevents inline scripts from executing
- [ ] CSP prevents injection of new script elements
- [ ] URL validation correctly identifies and blocks dangerous URLs
- [ ] URL sanitization correctly removes harmful content
- [ ] Screen recording detection works when screen is captured
- [ ] Display change detection works when connecting displays
- [ ] Session timeout triggers after period of inactivity
- [ ] Navigation to external sites is prevented
- [ ] External window opening is properly handled
- [ ] Secure cookie attributes (httpOnly, secure) are set
- [ ] Permission requests are properly filtered
- [ ] Invalid certificate connections are blocked in production

## Troubleshooting

If tests fail, check:

1. Verify that the security module is properly imported in main.js
2. Ensure that security.applySecurityMeasures() is called with the main window
3. Check that preload.js correctly exposes only the intended API
4. Verify that IPC channels are properly restricted
5. Check for any errors in the Developer Tools console

If you discover any security issues, please report them immediately according to our security policy. 