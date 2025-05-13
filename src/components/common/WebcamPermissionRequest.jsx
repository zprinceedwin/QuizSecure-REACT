import React, { useState, useEffect, useCallback } from 'react';
import WebcamInitializer from './WebcamInitializer';

/**
 * WebcamPermissionRequest component
 * 
 * Displays webcam permission status and provides UI to request permission
 * if needed. This is a simple MVP implementation for the prototype.
 */
const WebcamPermissionRequest = ({ onPermissionGranted, onDevicesDetected }) => {
  const [permissionStatus, setPermissionStatus] = useState('unknown');
  const [devices, setDevices] = useState([]);
  const [isRequesting, setIsRequesting] = useState(false);
  
  // Handle permission change from WebcamInitializer
  const handlePermissionChange = useCallback((status) => {
    setPermissionStatus(status);
    
    if (status === 'granted' && onPermissionGranted) {
      onPermissionGranted(true);
    }
  }, [onPermissionGranted]);
  
  // Handle devices change from WebcamInitializer
  const handleDevicesChange = useCallback((devicesList) => {
    setDevices(devicesList);
    
    if (onDevicesDetected) {
      onDevicesDetected(devicesList);
    }
  }, [onDevicesDetected]);
  
  // Request webcam permission
  const requestPermission = useCallback(async () => {
    setIsRequesting(true);
    
    try {
      // Directly use the browser API for simplicity in the prototype
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      
      // Stop the stream immediately after getting permission
      stream.getTracks().forEach(track => track.stop());
      
      // The WebcamInitializer will detect the permission change
      setPermissionStatus('granted');
      
      if (onPermissionGranted) {
        onPermissionGranted(true);
      }
    } catch (error) {
      console.error('Error requesting webcam permission:', error);
      setPermissionStatus('denied');
      
      if (onPermissionGranted) {
        onPermissionGranted(false);
      }
    } finally {
      setIsRequesting(false);
    }
  }, [onPermissionGranted]);
  
  // Render different content based on permission status
  const renderContent = () => {
    switch (permissionStatus) {
      case 'granted':
        return (
          <div className="webcam-permission-granted">
            <div className="success-message">
              <i className="fas fa-check-circle"></i>
              <p>Webcam access granted. Ready for proctoring.</p>
            </div>
            {devices.length > 0 && (
              <div className="devices-info">
                <p>Detected {devices.length} camera{devices.length !== 1 ? 's' : ''}:</p>
                <ul>
                  {devices.map((device, index) => (
                    <li key={device.deviceId || index}>
                      {device.label || `Camera ${index + 1}`}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );
        
      case 'denied':
        return (
          <div className="webcam-permission-denied">
            <div className="error-message">
              <i className="fas fa-exclamation-triangle"></i>
              <p>Webcam access denied. Proctoring requires webcam access.</p>
            </div>
            <button 
              className="request-permission-button"
              onClick={requestPermission}
              disabled={isRequesting}
            >
              {isRequesting ? 'Requesting...' : 'Request Webcam Access'}
            </button>
            <p className="help-text">
              If the button doesn't work, please enable webcam access in your browser settings.
            </p>
          </div>
        );
        
      case 'unknown':
      default:
        return (
          <div className="webcam-permission-unknown">
            <p>Webcam access is required for proctoring.</p>
            <button 
              className="request-permission-button"
              onClick={requestPermission}
              disabled={isRequesting}
            >
              {isRequesting ? 'Requesting...' : 'Allow Webcam Access'}
            </button>
          </div>
        );
    }
  };
  
  return (
    <div className="webcam-permission-container">
      <WebcamInitializer 
        onPermissionChange={handlePermissionChange}
        onDevicesChange={handleDevicesChange}
      />
      {renderContent()}
    </div>
  );
};

export default WebcamPermissionRequest; 