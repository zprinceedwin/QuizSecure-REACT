import React, { useState, useRef, useEffect } from 'react';
import WebcamPermissionRequest from './WebcamPermissionRequest';
import '../../assets/styles/webcam-permission.css';

/**
 * WebcamTest component
 * 
 * A simple component that demonstrates webcam permission handling and
 * basic webcam functionality. This is for testing and prototype demonstration purposes.
 */
const WebcamTest = () => {
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState(null);
  
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  
  // Handle permission status change
  const handlePermissionChange = (granted) => {
    setPermissionGranted(granted);
    
    // If permission was revoked, stop streaming
    if (!granted && isStreaming) {
      stopStream();
    }
  };
  
  // Handle detected devices
  const handleDevicesDetected = (devicesList) => {
    setDevices(devicesList);
    
    // Select the first device by default if none is selected
    if (devicesList.length > 0 && !selectedDeviceId) {
      setSelectedDeviceId(devicesList[0].deviceId);
    }
  };
  
  // Start webcam stream
  const startStream = async () => {
    try {
      setError(null);
      
      // Stop any existing stream
      if (streamRef.current) {
        stopStream();
      }
      
      // Get user media with the selected device (or any device if none selected)
      const constraints = {
        video: selectedDeviceId ? { deviceId: { exact: selectedDeviceId } } : true
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Store the stream reference
      streamRef.current = stream;
      
      // Set the video source
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      
      setIsStreaming(true);
    } catch (err) {
      console.error('Error starting webcam stream:', err);
      setError(`Failed to start stream: ${err.message}`);
      setIsStreaming(false);
    }
  };
  
  // Stop webcam stream
  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setIsStreaming(false);
  };
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopStream();
    };
  }, []);
  
  // Handle device selection change
  const handleDeviceChange = (event) => {
    setSelectedDeviceId(event.target.value);
    
    // If currently streaming, restart with new device
    if (isStreaming) {
      stopStream();
      // Use a small timeout to ensure the stream is properly stopped
      setTimeout(() => startStream(), 100);
    }
  };
  
  return (
    <div className="webcam-test-container">
      <h2>Webcam Test</h2>
      
      {/* Webcam Permission Request Component */}
      <WebcamPermissionRequest 
        onPermissionGranted={handlePermissionChange}
        onDevicesDetected={handleDevicesDetected}
      />
      
      {/* Webcam Stream Controls */}
      {permissionGranted && (
        <div className="webcam-controls">
          {/* Device Selector */}
          {devices.length > 0 && (
            <div className="device-selector">
              <label htmlFor="webcam-device">Select Camera: </label>
              <select 
                id="webcam-device"
                value={selectedDeviceId}
                onChange={handleDeviceChange}
                disabled={isStreaming}
              >
                {devices.map((device, index) => (
                  <option key={device.deviceId || index} value={device.deviceId}>
                    {device.label || `Camera ${index + 1}`}
                  </option>
                ))}
              </select>
            </div>
          )}
          
          {/* Stream Control Buttons */}
          <div className="stream-controls">
            {!isStreaming ? (
              <button 
                className="start-stream-button"
                onClick={startStream}
              >
                Start Camera
              </button>
            ) : (
              <button 
                className="stop-stream-button"
                onClick={stopStream}
              >
                Stop Camera
              </button>
            )}
          </div>
          
          {/* Error Display */}
          {error && (
            <div className="error-message">
              <p>{error}</p>
            </div>
          )}
        </div>
      )}
      
      {/* Video Display */}
      {permissionGranted && (
        <div className={`video-container ${isStreaming ? 'active' : 'inactive'}`}>
          <video 
            ref={videoRef}
            autoPlay
            playsInline
            muted
          />
          {!isStreaming && (
            <div className="video-placeholder">
              <p>Click "Start Camera" to view webcam feed</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WebcamTest; 