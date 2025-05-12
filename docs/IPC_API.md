# Electron IPC API Documentation

This document provides a comprehensive guide to the Inter-Process Communication (IPC) API used in QuizSecure Electron application.

## Overview

The QuizSecure application uses Electron's IPC (Inter-Process Communication) mechanism to enable secure communication between the main process (Node.js) and the renderer processes (browser/React). This allows our application to:

1. Access system-level functionality from the UI
2. Ensure proper security boundaries are maintained
3. Enable efficient data exchange between processes

## Security Model

We follow Electron's security best practices:

- **Context Isolation**: The renderer process cannot directly access Node.js APIs
- **Content Security Policy**: Restricts the sources of executable scripts
- **Sandboxing**: Limits renderer process capabilities
- **Preload Script**: Provides a secure bridge for IPC communication

## API Reference

### Renderer to Main Process Communication

#### One-way messages (`send`)

```javascript
window.electron.ipc.send(channel, data);
```

Available channels:
- `app:close` - Close the application window
- `app:minimize` - Minimize the application window
- `app:maximize` - Maximize/restore the application window
- `app:reload` - Reload the application
- `webcam:request` - Request webcam access
- `quiz:submit` - Submit quiz answers

#### Two-way communication (`invoke`)

```javascript
const result = await window.electron.ipc.invoke(channel, data);
```

Available channels:
- `ping` - Basic connectivity test (returns 'pong')
- `dialog:open` - Open a file dialog
- `webcam:getDevices` - Get list of available webcam devices
- `auth:login` - Perform user authentication
- `auth:logout` - Log out the current user
- `quiz:getData` - Retrieve quiz data

### Main to Renderer Process Communication

```javascript
window.electron.ipc.on(channel, callback);
```

Available channels:
- `app:update-available` - Notification when application update is available
- `webcam:status` - Updates about webcam status
- `proctoring:alert` - Alert notifications from the proctoring system
- `quiz:timer` - Quiz timer updates
- `screen:recording-detected` - Alert when screen recording is detected

### System Information API

```javascript
const platform = window.electron.system.getPlatform();
```

Available methods:
- `getPlatform()` - Returns the current operating system platform

## Examples

### Example 1: Basic Ping-Pong

```javascript
// Renderer process (React component)
async function testPing() {
  try {
    const result = await window.electron.ipc.invoke('ping');
    console.log(result); // Should output 'pong'
  } catch (error) {
    console.error('Ping failed:', error);
  }
}
```

### Example 2: Opening a File Dialog

```javascript
// Renderer process (React component)
async function openFile() {
  try {
    const options = {
      properties: ['openFile'],
      filters: [
        { name: 'Images', extensions: ['jpg', 'png', 'gif'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    };
    
    const filePaths = await window.electron.ipc.invoke('dialog:open', options);
    if (filePaths) {
      console.log('Selected file:', filePaths[0]);
    }
  } catch (error) {
    console.error('File dialog error:', error);
  }
}
```

### Example 3: Listening for Updates

```javascript
// Renderer process (React component)
import { useEffect } from 'react';

function UpdateListener() {
  useEffect(() => {
    const unsubscribe = window.electron.ipc.on('app:update-available', (updateInfo) => {
      console.log('Update available:', updateInfo);
      // Show notification to user
    });
    
    // Clean up listener when component unmounts
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);
  
  return null;
}
```

## Best Practices

1. **Always validate data** passed between processes
2. **Use a whitelist approach** for allowed IPC channels
3. **Handle errors** gracefully in both processes
4. **Clean up listeners** when components unmount to prevent memory leaks
5. **Keep IPC calls minimal** to improve performance
6. **Document all IPC channels** to maintain code clarity 