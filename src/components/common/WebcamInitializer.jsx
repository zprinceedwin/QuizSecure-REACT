import React, { useState, useEffect, useCallback } from 'react';

/**
 * WebcamInitializer component
 * 
 * Handles webcam permissions and initialization.
 * This component doesn't render anything visible, but manages
 * the webcam permissions and provides status to the parent component.
 */
const WebcamInitializer = ({ onPermissionChange, onDevicesChange }) => {
  const [permissionStatus, setPermissionStatus] = useState('unknown'); // 'unknown', 'granted', 'denied'
  const [devices, setDevices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check permissions and get available devices
  const initializeWebcam = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Check if permission API is available
      if (!window.electron?.webcam) {
        throw new Error('Webcam API not available in this environment');
      }
      
      // Check permission status
      const permissionResult = await window.electron.webcam.checkPermission();
      
      if (permissionResult.error) {
        throw new Error(`Permission check failed: ${permissionResult.error}`);
      }
      
      if (permissionResult.permission) {
        setPermissionStatus('granted');
        
        // Get available devices if permission is granted
        const devicesResult = await window.electron.webcam.getDevices();
        
        if (devicesResult.error) {
          throw new Error(`Failed to get devices: ${devicesResult.error}`);
        }
        
        setDevices(devicesResult.devices || []);
        if (onDevicesChange) {
          onDevicesChange(devicesResult.devices || []);
        }
      } else {
        setPermissionStatus('denied');
      }
    } catch (err) {
      console.error('Webcam initialization error:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [onDevicesChange]);

  // Request webcam permission
  const requestPermission = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Check if permission API is available
      if (!window.electron?.webcam) {
        throw new Error('Webcam API not available in this environment');
      }
      
      // Request permission
      const permissionResult = await window.electron.webcam.requestPermission();
      
      if (permissionResult.error) {
        throw new Error(`Permission request failed: ${permissionResult.error}`);
      }
      
      if (permissionResult.permission) {
        setPermissionStatus('granted');
        
        // Get available devices if permission is granted
        const devicesResult = await window.electron.webcam.getDevices();
        
        if (devicesResult.error) {
          throw new Error(`Failed to get devices: ${devicesResult.error}`);
        }
        
        setDevices(devicesResult.devices || []);
        if (onDevicesChange) {
          onDevicesChange(devicesResult.devices || []);
        }
      } else {
        setPermissionStatus('denied');
      }
    } catch (err) {
      console.error('Permission request error:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [onDevicesChange]);

  // Initialize on mount
  useEffect(() => {
    initializeWebcam();
  }, [initializeWebcam]);

  // Notify parent of permission changes
  useEffect(() => {
    if (onPermissionChange) {
      onPermissionChange(permissionStatus);
    }
  }, [permissionStatus, onPermissionChange]);

  // Expose methods to parent component via the ref
  return null; // This component doesn't render anything visible
};

export default WebcamInitializer; 