// src/pages/student/FaceScanPage.jsx

import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaceMesh } from "@mediapipe/face_mesh";
import logo from "../../assets/quizsecure-logo.png";
import * as webcamService from "../../services/webcamService";
import "./facescan.css";

function FaceScanPage() {
  const [faceDetected, setFaceDetected] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [availableDevices, setAvailableDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState(null);
  
  const videoRef = useRef(null);
  const faceMeshRef = useRef(null);
  const navigate = useNavigate();
  const previousDetectionStateRef = useRef(null); // { faceCount: 0 } or similar

  // Initialize face detection
  useEffect(() => {
    // Create FaceMesh instance
    const faceMesh = new FaceMesh({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
    });

    faceMesh.setOptions({
      maxNumFaces: 5, // Allow detection of multiple faces for the event system
      refineLandmarks: true,
      minDetectionConfidence: 0.6,
      minTrackingConfidence: 0.6,
    });

    // Set up face detection callback
    faceMesh.onResults((results) => {
      const currentTime = Date.now();
      let currentFaceCount = 0;
      if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
        currentFaceCount = results.multiFaceLandmarks.length;
      }

      // Update internal state for UI
      setFaceDetected(currentFaceCount === 1);

      const previousState = previousDetectionStateRef.current;
      const previousFaceCount = previousState ? previousState.faceCount : 0;

      // Dispatch events only on state change
      if (currentFaceCount === 1 && previousFaceCount !== 1) {
        window.dispatchEvent(new CustomEvent('quizsecure:facedetected', { detail: { timestamp: currentTime, faceCount: 1 } }));
      } else if (currentFaceCount === 0 && previousFaceCount > 0) {
        window.dispatchEvent(new CustomEvent('quizsecure:facelost', { detail: { timestamp: currentTime } }));
      } else if (currentFaceCount > 1 && previousFaceCount !== currentFaceCount ) { 
        // Fire if current is multiple AND it's a change from previous (e.g. not already multiple)
        // Or if the number of multiple faces changed
        window.dispatchEvent(new CustomEvent('quizsecure:multiplefaces', { detail: { timestamp: currentTime, faceCount: currentFaceCount } }));
      }
      
      // Store current state for next frame comparison
      previousDetectionStateRef.current = { faceCount: currentFaceCount };
    });

    faceMeshRef.current = faceMesh;

    return () => {
      // Clean up FaceMesh
      faceMeshRef.current.close();
    };
  }, []);

  // Check webcam permissions on component mount
  useEffect(() => {
    const checkPermission = async () => {
      try {
        console.log('[FaceScanPage] Checking webcam permissions');
        const hasPermission = await webcamService.checkPermissions();
        console.log('[FaceScanPage] Permission check result:', hasPermission);
        setPermissionGranted(hasPermission);
        
        if (hasPermission) {
          console.log('[FaceScanPage] Permission granted, getting camera devices');
          const devices = await webcamService.getDevices();
          console.log('[FaceScanPage] Available devices:', devices);
          setAvailableDevices(devices);
          
          // Select first device by default if available
          if (devices.length > 0) {
            console.log('[FaceScanPage] Setting default device:', devices[0].deviceId);
            setSelectedDeviceId(devices[0].deviceId);
          } else {
            console.warn('[FaceScanPage] No camera devices found even though permission granted');
            setError("No camera devices found. Please connect a webcam.");
          }
        } else {
          // Automatically request permission if not already granted
          console.log('[FaceScanPage] Permission not granted, auto-requesting');
          requestPermission();
        }
      } catch (err) {
        console.error("[FaceScanPage] Error checking webcam permission:", err);
        setError(`Failed to check webcam permissions: ${err.message}`);
      }
    };
    
    checkPermission();
    
    // Listen for device changes (cameras connected/disconnected)
    const removeListener = webcamService.listenForDeviceChanges((newDevices) => {
      console.log('[FaceScanPage] Device change detected, new devices:', newDevices);
      setAvailableDevices(newDevices);
      
      // If selected device was disconnected, select first available
      if (selectedDeviceId && !newDevices.some(d => d.deviceId === selectedDeviceId) && newDevices.length > 0) {
        console.log('[FaceScanPage] Selected device disconnected, switching to:', newDevices[0].deviceId);
        setSelectedDeviceId(newDevices[0].deviceId);
      }
    });
    
    return () => {
      // Clean up device change listener
      console.log('[FaceScanPage] Cleaning up device change listener');
      removeListener();
    };
  }, []);
  
  // Start/stop webcam stream based on selected device
  useEffect(() => {
    const startCamera = async () => {
      if (!permissionGranted) {
        console.log('[FaceScanPage] startCamera: No permission granted');
        return;
      }
      
      if (!selectedDeviceId) {
        console.log('[FaceScanPage] startCamera: No device selected');
        // Try to get devices one more time
        try {
          const devices = await webcamService.getDevices(true);
          if (devices.length > 0) {
            console.log('[FaceScanPage] startCamera: Found devices on retry, selecting first one');
            setAvailableDevices(devices);
            setSelectedDeviceId(devices[0].deviceId);
            return; // Will trigger this effect again with the new deviceId
          } else {
            setError("No camera devices found. Please connect a webcam.");
          }
        } catch (devErr) {
          console.error('[FaceScanPage] startCamera: Error getting devices on retry:', devErr);
        }
        return;
      }
      
      console.log(`[FaceScanPage] startCamera: Attempting to start camera with deviceId: ${selectedDeviceId}`);
      setIsStreaming(false); // Explicitly set to false before attempting to start
      setError(null); // Clear previous errors
      
      try {
        console.log('[FaceScanPage] startCamera: Calling webcamService.startStream...');
        const stream = await webcamService.startStream(selectedDeviceId);
        console.log('[FaceScanPage] startCamera: webcamService.startStream responded. Stream object:', stream);

        if (stream && stream.active && stream.getVideoTracks().length > 0) {
          console.log('[FaceScanPage] startCamera: Stream appears active and has video tracks.');
          if (videoRef.current) {
            console.log('[FaceScanPage] startCamera: Assigning stream to videoRef.current.srcObject');
            videoRef.current.srcObject = stream;
            
            videoRef.current.onloadedmetadata = () => {
              console.log('[FaceScanPage] startCamera: videoRef.current.onloadedmetadata fired.');
              videoRef.current.play().then(() => {
                console.log('[FaceScanPage] startCamera: videoRef.current.play() successful.');
                setIsStreaming(true); // Set streaming true ONLY after metadata loaded and play initiated
                console.log('[FaceScanPage] startCamera: setIsStreaming(true) called.');
                requestAnimationFrame(processFrame);
                console.log('[FaceScanPage] startCamera: Initial requestAnimationFrame(processFrame) called.');
              }).catch(playError => {
                console.error('[FaceScanPage] startCamera: videoRef.current.play() failed:', playError);
                setError(`Failed to play video: ${playError.message}`);
                setIsStreaming(false);
              });
            };

            videoRef.current.onerror = (e) => {
              console.error('[FaceScanPage] startCamera: videoRef.current.onerror event:', e);
              setError('Video element error. Failed to load webcam stream.');
              setIsStreaming(false);
              webcamService.stopStream(); // Stop the potentially problematic stream
            };

          } else {
            console.warn('[FaceScanPage] startCamera: videoRef.current is null after stream acquisition.');
            setError('Video element not available.');
            setIsStreaming(false);
            webcamService.stopStream(); // Stop the stream if video element is not there
          }
        } else {
          console.warn('[FaceScanPage] startCamera: Stream from webcamService.startStream is invalid, inactive, or has no video tracks.', stream);
          let errorMsg = 'Failed to get a valid webcam stream.';
          if (stream && stream.getVideoTracks().length === 0) {
            errorMsg = 'Webcam stream has no video tracks. Is the camera covered or already in use by another app?';
          }
          setError(errorMsg);
          setIsStreaming(false);
          if(stream) webcamService.stopStream(); // Ensure this stream is stopped if it was partially acquired
        }
        
      } catch (err) {
        console.error('[FaceScanPage] startCamera: Error in try-catch calling webcamService.startStream or setting up video:', err);
        setError(`Failed to start webcam: ${err.message}`);
        setIsStreaming(false);
      }
    };
    
    // Moved processFrame definition outside startCamera to be accessible by onloadedmetadata 
    // if it needs to be defined at this scope for some reason, but it's better inside or as a useCallback.
    // For now, keeping it as it was in the original file structure, defined inside the effect but called by onloadedmetadata.
    const processFrame = async () => {
      if (videoRef.current && videoRef.current.readyState >= videoRef.current.HAVE_ENOUGH_DATA && 
          faceMeshRef.current && webcamService.isStreaming()) {
        try {
          await faceMeshRef.current.send({ image: videoRef.current });
        } catch (sendError) {
          console.error('[FaceScanPage] processFrame: Error sending frame to FaceMesh:', sendError);
          // Optionally handle this error, e.g., stop processing, show an error to user
        }
        requestAnimationFrame(processFrame);
      } else {
        // Add a log if processFrame is called but conditions aren't met to send to FaceMesh
        // This helps debug if the loop starts but then stops processing frames.
        if (webcamService.isStreaming()) { // Only log if we expect to be streaming
            console.log('[FaceScanPage] processFrame: Skipping send to FaceMesh. Conditions: videoReadyState=', 
              videoRef.current?.readyState, 'faceMeshRef=', !!faceMeshRef.current, 
              'isStreaming=', webcamService.isStreaming());
        }
        // If still supposed to be streaming, request next frame to check again
        if (webcamService.isStreaming()) {
            requestAnimationFrame(processFrame);
        }
      }
    };

    startCamera();
    
    return () => {
      console.log('[FaceScanPage] Cleanup effect for [permissionGranted, selectedDeviceId]: Stopping stream.');
      webcamService.stopStream();
      setIsStreaming(false);
    };
  }, [permissionGranted, selectedDeviceId]);

  // Request webcam permission if not granted
  const requestPermission = async () => {
    try {
      console.log('[FaceScanPage] Requesting webcam permission');
      setError(null);
      const granted = await webcamService.requestPermissions();
      console.log('[FaceScanPage] Permission request result:', granted);
      setPermissionGranted(granted);
      
      if (granted) {
        console.log('[FaceScanPage] Permission granted, getting devices');
        const devices = await webcamService.getDevices(true); // Force refresh
        console.log('[FaceScanPage] Devices after permission grant:', devices);
        setAvailableDevices(devices);
        
        if (devices.length > 0) {
          console.log('[FaceScanPage] Setting first device:', devices[0].deviceId);
          setSelectedDeviceId(devices[0].deviceId);
        } else {
          console.warn('[FaceScanPage] No devices found after permission granted');
          setError("No camera devices found. Please connect a webcam.");
        }
      } else {
        console.warn('[FaceScanPage] Permission denied by user');
        setError("Camera access denied. Please allow camera access to use this feature.");
      }
    } catch (err) {
      console.error("[FaceScanPage] Error requesting webcam permission:", err);
      setError(`Failed to request webcam permission: ${err.message}`);
    }
  };
  
  // Handle device selection change
  const handleDeviceChange = (e) => {
    setSelectedDeviceId(e.target.value);
  };

  return (
    <div className="facescan-container">
      {/* Sidebar */}
      <aside className="facescan-sidebar">
        <img
          src={logo}
          alt="QuizSecure Logo"
          className="facescan-logo"
          onClick={() => navigate("/")}
        />
        <h2 className="facescan-title">QUIZSECURE</h2>
      </aside>

      {/* Main Content */}
      <main className="facescan-main">
        {/* 📷 Camera Box */}
        <div className="camera-card">
          {!permissionGranted ? (
            <div className="permission-request">
              <p>Webcam access is required for the face scan.</p>
              <button onClick={requestPermission} className="permission-button">
                Allow Camera Access
              </button>
            </div>
          ) : (
            <>
              <video ref={videoRef} className="webcam-feed" autoPlay muted playsInline />
              
              {/* Device Selector (only show if multiple devices available) */}
              {availableDevices.length > 1 && (
                <div className="device-selector">
                  <select 
                    value={selectedDeviceId || ''} 
                    onChange={handleDeviceChange}
                    disabled={!permissionGranted}
                  >
                    {availableDevices.map((device) => (
                      <option key={device.deviceId} value={device.deviceId}>
                        {device.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </>
          )}
          
          {/* Error message */}
          {error && <div className="error-message">{error}</div>}
        </div>

        {/* ✅ Detection Status and Controls */}
        <div className="function-card">
          <p className={`detection-status ${faceDetected ? "valid" : "invalid"}`}>
            {!permissionGranted ? "Camera Access Required" : 
             !isStreaming ? "Starting Camera..." :
             faceDetected ? "Face Detected" : "Face Not Detected"}
          </p>
          <div className="button-section">
            <button onClick={() => navigate("/disclaimer")} className="back-btn">
              Back
            </button>
            <button
              onClick={() => navigate("/quiz")}
              className="proceed-btn"
              disabled={!permissionGranted || !isStreaming || !faceDetected}
            >
              Proceed to Quiz
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default FaceScanPage;
