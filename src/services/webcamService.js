/**
 * WebcamService.js
 * 
 * A service for managing webcam functionality in the application.
 * Handles camera device enumeration, stream initialization, and resource management.
 */

// Cache for available devices to avoid repeated queries
let cachedDevices = null;
let activeStream = null;
let activeDeviceId = null;

/**
 * Check if webcam permissions are granted
 * @returns {Promise<boolean>} Whether permissions are granted
 */
export const checkPermissions = async () => {
  try {
    console.log('[webcamService] checkPermissions: Checking if webcam permission is granted');
    
    // First try with navigator.permissions if available (modern browsers)
    if (navigator.permissions) {
      try {
        const permissionStatus = await navigator.permissions.query({ name: 'camera' });
        if (permissionStatus.state === 'granted') {
          console.log('[webcamService] checkPermissions: Permission explicitly granted via navigator.permissions');
          return true;
        } else if (permissionStatus.state === 'denied') {
          console.log('[webcamService] checkPermissions: Permission explicitly denied via navigator.permissions');
          return false;
        }
        // If 'prompt', we'll fall through to the methods below
      } catch (permErr) {
        // Some browsers don't support checking 'camera' permission
        console.log('[webcamService] checkPermissions: navigator.permissions.query not supported for camera:', permErr);
      }
    }
    
    // Use the Electron API if available
    if (window.electron?.webcam) {
      console.log('[webcamService] checkPermissions: Using Electron API to check permission');
      const result = await window.electron.webcam.checkPermission();
      console.log('[webcamService] checkPermissions: Electron API result:', result);
      return result.permission || false;
    }
    
    // Fallback to browser API - try to enumerate devices
    console.log('[webcamService] checkPermissions: Falling back to enumerateDevices');
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter(device => device.kind === 'videoinput');
    
    // If we have labels for video devices, permission is granted
    const hasLabels = videoDevices.some(device => device.label && device.label.length > 0);
    console.log('[webcamService] checkPermissions: Found video devices with labels?', hasLabels);
    return hasLabels;
  } catch (error) {
    console.error('[webcamService] checkPermissions: Error checking webcam permissions:', error);
    return false;
  }
};

/**
 * Request webcam permissions
 * @returns {Promise<boolean>} Whether permissions are granted
 */
export const requestPermissions = async () => {
  try {
    console.log('[webcamService] requestPermissions: Requesting webcam permission');
    
    // Use the Electron API if available
    if (window.electron?.webcam) {
      console.log('[webcamService] requestPermissions: Using Electron API to request permission');
      const result = await window.electron.webcam.requestPermission();
      console.log('[webcamService] requestPermissions: Electron API result:', result);
      return result.permission || false;
    }
    
    // Fallback to browser API
    console.log('[webcamService] requestPermissions: Using browser API to request permission');
    const constraints = { 
      video: true, 
      audio: false 
    };
    
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    
    // Check if we actually got video tracks
    if (stream.getVideoTracks().length === 0) {
      console.warn('[webcamService] requestPermissions: No video tracks in stream');
      stream.getTracks().forEach(track => track.stop());
      return false;
    }
    
    console.log('[webcamService] requestPermissions: Permission granted, got video tracks');
    // Stop the stream immediately, we just needed it for the permission
    stream.getTracks().forEach(track => track.stop());
    
    // Immediately get devices to update labels
    await getDevices(true);
    
    return true;
  } catch (error) {
    console.error('[webcamService] requestPermissions: Error requesting webcam permissions:', error);
    return false;
  }
};

/**
 * Get available webcam devices
 * @param {boolean} forceRefresh - Whether to force a refresh of the device list
 * @returns {Promise<Array>} List of available devices
 */
export const getDevices = async (forceRefresh = false) => {
  try {
    console.log('[webcamService] getDevices: Getting webcam devices, forceRefresh:', forceRefresh);
    
    // Return cached devices if available and not forcing refresh
    if (cachedDevices && !forceRefresh) {
      console.log('[webcamService] getDevices: Returning cached devices:', cachedDevices);
      return cachedDevices;
    }
    
    // Use the Electron API if available
    if (window.electron?.webcam) {
      console.log('[webcamService] getDevices: Using Electron API to get devices');
      const result = await window.electron.webcam.getDevices();
      
      if (result.error) {
        console.error('[webcamService] getDevices: Electron API error:', result.error);
        throw new Error(result.error);
      }
      
      // Enhanced logging for Electron device response
      console.log('[webcamService] getDevices: Raw Electron device response:', JSON.stringify(result));
      
      // Map Electron devices to a consistent format, ensuring deviceId is set
      if (Array.isArray(result.devices)) {
        const mappedDevices = result.devices.map((device, index) => {
          // Use the device's deviceId if available, otherwise generate one
          const deviceId = device.deviceId || device.id || `electron-camera-${index}`;
          const label = device.label || `Camera ${index + 1}`;
          
          console.log(`[webcamService] getDevices: Mapping Electron device [${index}]: id=${deviceId}, label=${label}`);
          
          return {
            deviceId,
            label,
            // Store original device info for Electron-specific handling
            _electronDevice: device
          };
        });
        
        cachedDevices = mappedDevices;
        console.log('[webcamService] getDevices: Mapped Electron devices:', cachedDevices);
        return cachedDevices;
      } else {
        // If for some reason we got a non-array, create a default device
        console.warn('[webcamService] getDevices: Electron API returned non-array devices, creating default');
        cachedDevices = [{
          deviceId: 'electron-default-camera',
          label: 'Default Camera',
          _electronDevice: {} // Empty electron-specific info
        }];
        return cachedDevices;
      }
    }
    
    // Fallback to browser API
    console.log('[webcamService] getDevices: Using browser API to enumerate devices');
    
    // We need permission first to get labels
    const hasPermission = await checkPermissions();
    if (!hasPermission) {
      console.log('[webcamService] getDevices: No permission, trying to get temporary access');
      // Try getting a temporary stream to get device labels
      try {
        const tempStream = await navigator.mediaDevices.getUserMedia({ video: true });
        tempStream.getTracks().forEach(track => track.stop());
        console.log('[webcamService] getDevices: Got temporary access');
      } catch (permErr) {
        console.warn('[webcamService] getDevices: Failed to get temporary access:', permErr);
        // Continue anyway - we might get devices without labels
      }
    }
    
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices
      .filter(device => device.kind === 'videoinput')
      .map(device => ({
        deviceId: device.deviceId,
        label: device.label || `Camera ${device.deviceId.slice(0, 5)}...`
      }));
    
    console.log('[webcamService] getDevices: Found video devices:', videoDevices);
    cachedDevices = videoDevices;
    return videoDevices;
  } catch (error) {
    console.error('[webcamService] getDevices: Error getting webcam devices:', error);
    return [];
  }
};

/**
 * Start a webcam stream
 * @param {string} deviceId - ID of the device to use, or null for default
 * @param {Object} constraints - Additional constraints for getUserMedia
 * @returns {Promise<MediaStream>} The media stream
 */
export const startStream = async (deviceId = null, constraints = {}) => {
  try {
    console.log(`[webcamService] startStream: Starting webcam with deviceId: ${deviceId}`);
    
    // Stop any existing stream
    if (activeStream) {
      console.log('[webcamService] startStream: Stopping existing stream');
      await stopStream();
    }
    
    // Check if we're in Electron environment
    const isElectron = !!window.electron?.webcam;
    console.log(`[webcamService] startStream: Running in ${isElectron ? 'Electron' : 'Browser'} environment`);

    // If we're in Electron and didn't get a deviceId or got an Electron-specific one,
    // we might need special handling
    if (isElectron && (!deviceId || deviceId.startsWith('electron-'))) {
      console.log('[webcamService] startStream: Using Electron with default/special deviceId');
      
      // In Electron, try a general getUserMedia call first for the default camera
      try {
        console.log('[webcamService] startStream: Requesting general video access in Electron');
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: true,
          audio: false
        });
        
        // Verify we got video tracks
        if (stream.getVideoTracks().length === 0) {
          console.error('[webcamService] startStream: No video tracks in Electron stream');
          throw new Error('No video tracks available in Electron stream');
        }
        
        // Store the stream and derive device info
        activeStream = stream;
        const track = stream.getVideoTracks()[0];
        activeDeviceId = deviceId || 'electron-active-camera';
        
        console.log('[webcamService] startStream: Electron stream started successfully, track:', 
          `${track.kind}:${track.label}`);
        
        return stream;
      } catch (electronErr) {
        console.error('[webcamService] startStream: Error starting Electron camera:', electronErr);
        throw electronErr;
      }
    }
    
    // If we have a specific valid deviceId or we're in browser mode,
    // use the standard approach
    
    // Merge constraints with device selection
    const streamConstraints = {
      video: {
        ...constraints,
        ...(deviceId && !deviceId.startsWith('electron-') ? { deviceId: { exact: deviceId } } : {})
      }
    };
    
    console.log('[webcamService] startStream: Using constraints:', JSON.stringify(streamConstraints));
    
    // Try to get a stream with specific device ID
    try {
      const stream = await navigator.mediaDevices.getUserMedia(streamConstraints);
      
      // Verify we got video tracks
      if (stream.getVideoTracks().length === 0) {
        console.error('[webcamService] startStream: No video tracks in stream');
        throw new Error('No video tracks available in stream');
      }
      
      // Store the stream and device ID
      activeStream = stream;
      activeDeviceId = deviceId;
      
      console.log('[webcamService] startStream: Stream started successfully, tracks:', 
        stream.getTracks().map(t => `${t.kind}:${t.label}`));
      
      return stream;
    } catch (exactError) {
      // If exact device ID fails, try with any available camera as fallback
      if (deviceId) {
        console.warn('[webcamService] startStream: Failed with exact deviceId, trying any camera:', exactError);
        const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true });
        
        if (fallbackStream.getVideoTracks().length === 0) {
          console.error('[webcamService] startStream: No video tracks in fallback stream');
          throw new Error('No video tracks available in fallback stream');
        }
        
        activeStream = fallbackStream;
        activeDeviceId = fallbackStream.getVideoTracks()[0].getSettings().deviceId;
        
        console.log('[webcamService] startStream: Fallback stream started, using device:', activeDeviceId);
        return fallbackStream;
      }
      
      // If no deviceId was specified, just re-throw the original error
      throw exactError;
    }
  } catch (error) {
    console.error('[webcamService] startStream: Error starting webcam stream:', error);
    throw error;
  }
};

/**
 * Stop the current webcam stream
 */
export const stopStream = async () => {
  console.log('[webcamService] stopStream: Stopping active stream');
  if (activeStream) {
    activeStream.getTracks().forEach(track => {
      console.log(`[webcamService] stopStream: Stopping track: ${track.kind}:${track.label}`);
      track.stop();
    });
    activeStream = null;
    activeDeviceId = null;
  } else {
    console.log('[webcamService] stopStream: No active stream to stop');
  }
};

/**
 * Get a single frame from the active stream
 * @returns {Promise<Blob>} The frame as a Blob, or null if no stream is active
 */
export const captureFrame = async () => {
  if (!activeStream) {
    console.warn('[webcamService] captureFrame: No active stream');
    return null;
  }
  
  try {
    // Create a video element to capture the frame
    const video = document.createElement('video');
    video.srcObject = activeStream;
    video.play();
    
    // Wait for video to be ready
    await new Promise(resolve => {
      video.onloadedmetadata = () => {
        video.play();
        resolve();
      };
    });
    
    // Create a canvas to draw the frame
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Convert canvas to blob
    return new Promise(resolve => {
      canvas.toBlob(blob => {
        resolve(blob);
      }, 'image/jpeg', 0.9);
    });
  } catch (error) {
    console.error('[webcamService] captureFrame: Error capturing frame:', error);
    return null;
  }
};

/**
 * Listen for device changes (e.g., webcam connected/disconnected)
 * @param {Function} callback - Function to call when devices change
 * @returns {Function} Function to remove the listener
 */
export const listenForDeviceChanges = (callback) => {
  console.log('[webcamService] listenForDeviceChanges: Setting up device change listener');
  
  const handleDeviceChange = async () => {
    console.log('[webcamService] listenForDeviceChanges: Device change detected');
    
    // Force refresh the device list
    const newDevices = await getDevices(true);
    
    // Check if the active device is still available
    if (activeDeviceId && activeStream) {
      const deviceStillExists = newDevices.some(device => device.deviceId === activeDeviceId);
      if (!deviceStillExists) {
        console.log('[webcamService] listenForDeviceChanges: Active device no longer available, stopping stream');
        // Device was disconnected, stop the stream
        await stopStream();
      }
    }
    
    // Call the callback with the new devices
    callback(newDevices);
  };
  
  // Add listener for device changes
  navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
  
  // Return function to remove the listener
  return () => {
    console.log('[webcamService] listenForDeviceChanges: Removing device change listener');
    navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
  };
};

/**
 * Get the currently active stream
 * @returns {MediaStream|null} The active stream, or null if none is active
 */
export const getActiveStream = () => activeStream;

/**
 * Get the ID of the currently active device
 * @returns {string|null} The active device ID, or null if none is active
 */
export const getActiveDeviceId = () => activeDeviceId;

/**
 * Check if a stream is currently active
 * @returns {boolean} Whether a stream is active
 */
export const isStreaming = () => {
  const streaming = !!activeStream && 
                   activeStream.active && 
                   activeStream.getVideoTracks().some(track => track.readyState === 'live');
  return streaming;
};

/**
 * Cleanup function to be called when unmounting
 * Ensures all resources are properly released
 */
export const cleanup = () => {
  console.log('[webcamService] cleanup: Releasing all resources');
  stopStream();
  cachedDevices = null;
}; 