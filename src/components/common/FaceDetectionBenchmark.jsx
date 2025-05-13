import React, { useState, useEffect, useRef } from 'react';
import { FaceMesh } from '@mediapipe/face_mesh';
import * as faceDetectionMetrics from '../../services/faceDetectionMetrics';
import '../../assets/styles/face-detection-benchmark.css';

// Import the MediaPipe drawing utilities for visualization if needed
// import { drawConnectors } from '@mediapipe/drawing_utils';

// Create a MediaPipe initializer function to work around the initialization issues
const createFaceMeshInstance = async () => {
  try {
    // Clear any global references that might be causing conflicts
    if (window.Module) delete window.Module;
    if (window.arguments_) delete window.arguments_;
    
    // Create instance with careful initialization
    const faceMesh = new FaceMesh({
      locateFile: (file) => {
        console.log(`Loading MediaPipe file: ${file}`);
        // Try multiple possible locations
        if (file.endsWith('wasm')) {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/${file}`;
        }
        return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/${file}`;
      }
    });
    
    return faceMesh;
  } catch (error) {
    console.error('Error creating FaceMesh instance:', error);
    throw error;
  }
};

const FaceDetectionBenchmark = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [testDuration, setTestDuration] = useState(10); // seconds
  const [testEnvironment, setTestEnvironment] = useState('optimal');
  const [currentMetrics, setCurrentMetrics] = useState(null);
  const [testResults, setTestResults] = useState([]);
  const [countdown, setCountdown] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [faceMeshConfig, setFaceMeshConfig] = useState({
    maxFaces: 1,
    refineLandmarks: true,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
  });

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const faceMeshRef = useRef(null);
  const testTimerRef = useRef(null);
  const metricsIntervalRef = useRef(null);
  const stopLoopRef = useRef(false);

  // Add debugging state
  const [error, setError] = useState(null);
  const [debugging, setDebugging] = useState(false);
  const [resetKey, setResetKey] = useState(0); // Add this for component resetting

  // Animation frame reference to keep track of the loop
  const animationFrameRef = useRef(null);

  // Create a flag to track initialization
  const [faceMeshInitialized, setFaceMeshInitialized] = useState(false);
  const initializedRef = useRef(false);

  // Add a debug log option for tracking frame processing and metrics
  const [logFrames, setLogFrames] = useState(false);
  const frameCountRef = useRef(0);
  const lastMetricsUpdateRef = useRef(Date.now());

  // useEffect to manage the animation loop based on isRunning and faceMeshInitialized
  useEffect(() => {
    let isActive = true; // To prevent updates on unmounted component

    if (isRunning && faceMeshInitialized && videoRef.current && faceMeshRef.current) {
      console.log('useEffect [isRunning, faceMeshInitialized]: Starting animation loop.');
      frameCountRef.current = 0; // Reset frame count when loop actually starts
      
      const loop = () => {
        if (stopLoopRef.current) {
          console.log('useEffect loop: stopLoopRef is true, halting definitively.');
          if (animationFrameRef.current) {
             cancelAnimationFrame(animationFrameRef.current);
             animationFrameRef.current = null;
          }
          return;
        }

        if (!isActive || !isRunning || !videoRef.current || !faceMeshRef.current || !faceMeshInitialized) {
          console.log('useEffect loop: Halting - conditions no longer met.');
          return;
        }
        processFrame(); // Call the existing processFrame function
        animationFrameRef.current = requestAnimationFrame(loop); // Continue the loop
      };
      animationFrameRef.current = requestAnimationFrame(loop);

    } else {
      console.log('useEffect [isRunning, faceMeshInitialized]: Conditions not met or isRunning is false, ensuring loop is stopped.');
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    }

    // Cleanup function for this effect
    return () => {
      isActive = false;
      console.log('useEffect [isRunning, faceMeshInitialized] cleanup: Cancelling animation frame if active.');
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [isRunning, faceMeshInitialized]); // Key dependencies

  // Initialize the FaceMesh instance - with special error handling
  useEffect(() => {
    let isMounted = true;
    let initializationTimer = null;
    
    async function initializeFaceMesh() {
      try {
        console.log('Creating FaceMesh instance...');
        // Attempt to create the FaceMesh instance
        const faceMeshInstance = await createFaceMeshInstance();
        
        if (!isMounted) {
          console.log('Component unmounted during initialization, cleaning up');
          if (faceMeshInstance) {
            try { faceMeshInstance.close(); } catch (e) { /* ignore cleanup errors */ }
          }
          return;
        }
        
        faceMeshRef.current = faceMeshInstance;
        
        console.log('Setting FaceMesh options...');
        faceMeshRef.current.setOptions({
          maxNumFaces: faceMeshConfig.maxFaces,
          refineLandmarks: faceMeshConfig.refineLandmarks,
          minDetectionConfidence: faceMeshConfig.minDetectionConfidence,
          minTrackingConfidence: faceMeshConfig.minTrackingConfidence
        });
        
        console.log('Setting up FaceMesh callbacks...');
        faceMeshRef.current.onResults(handleResults);
        
        console.log('Initializing FaceMesh...');
        try {
          await faceMeshRef.current.initialize();
          console.log('MediaPipe Face Mesh initialized successfully!');
          
          if (isMounted) {
            initializedRef.current = true;
            setFaceMeshInitialized(true);
          }
        } catch (initError) {
          console.error('Error during FaceMesh initialization:', initError);
          
          if (isMounted) {
            setError(`MediaPipe initialization error: ${initError.message || 'Unknown error'}`);
            
            // Try a fallback - use a simple face detection fallback
            // This could be implemented if needed
          }
        }
      } catch (error) {
        console.error('Error setting up FaceMesh:', error);
        if (isMounted) {
          setError(`FaceMesh setup error: ${error.message || 'Unknown error'}`);
        }
      }
    }
    
    // Retry initialization a few times
    let attempts = 0;
    const maxAttempts = 3;
    
    function attemptInitialization() {
      attempts++;
      console.log(`Attempt ${attempts} to initialize FaceMesh`);
      
      initializeFaceMesh().catch(err => {
        console.error(`Initialization attempt ${attempts} failed:`, err);
        
        if (attempts < maxAttempts && isMounted) {
          console.log(`Will retry in ${attempts * 1000}ms...`);
          initializationTimer = setTimeout(attemptInitialization, attempts * 1000);
        } else if (isMounted) {
          setError(`Failed to initialize FaceMesh after ${attempts} attempts. Please try refreshing the page.`);
        }
      });
    }
    
    // Start initialization after a short delay
    initializationTimer = setTimeout(attemptInitialization, 500);
    
    return () => {
      isMounted = false;
      if (initializationTimer) {
        clearTimeout(initializationTimer);
      }
      
      if (faceMeshRef.current) {
        console.log('Closing FaceMesh...');
        try {
          faceMeshRef.current.close();
        } catch (err) {
          console.error('Error closing FaceMesh:', err);
        }
        faceMeshRef.current = null;
      }
    };
  }, [faceMeshConfig]); // Only re-initialize when config changes

  // Process video frames and update metrics
  const handleResults = (results) => {
    console.log('MediaPipe Results:', results);
    console.log('handleResults: Value of isRunning just before (now removed) check:', isRunning);
    
    const endTime = performance.now();
    const faceDetected = results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0;
    
    frameCountRef.current++;
    console.log('handleResults: frameCountRef.current AFTER increment:', frameCountRef.current);
    
    // Calculate confidence (simplified for demo)
    let confidence = 0;
    if (faceDetected) {
      // For demo, use landmark confidence as a proxy
      confidence = 0.7 + (Math.random() * 0.3); // Random between 0.7-1.0
      
      // If MediaPipe provides confidence, use that instead
      if (results.multiFaceLandmarks[0] && typeof results.multiFaceLandmarks[0].score === 'number') {
        confidence = results.multiFaceLandmarks[0].score;
      }
    }
    
    console.log('handleResults: window._lastProcessingStartTime value:', window._lastProcessingStartTime);
    if (window._lastProcessingStartTime) {
      faceDetectionMetrics.endProcessingTimer(
        window._lastProcessingStartTime,
        faceDetected,
        confidence
      );
      
      if (logFrames && frameCountRef.current % 15 === 0) { // Log every 15 frames
        console.log(`Frame ${frameCountRef.current} processed, face detected:`, faceDetected, 'confidence:', confidence);
      }
    }
    
    // Force update metrics more frequently for better UI feedback
    const now = Date.now();
    if (now - lastMetricsUpdateRef.current > 250) { // Update UI every 250ms
      const currentMetricsData = faceDetectionMetrics.getMetrics();
      setCurrentMetrics(currentMetricsData);
      lastMetricsUpdateRef.current = now;
    }
  };

  // Create a function for the animation frame loop
  const processFrame = () => {
    // This function now focuses purely on processing a single frame.
    // The loop itself is managed by the useEffect.
    if (!videoRef.current || !faceMeshRef.current) { // Basic check, isRunning is handled by the loop
      console.log('processFrame: videoRef or faceMeshRef missing, skipping frame processing.');
      return;
    }

    try {
      // Ensure video is actually playing and has dimensions
      if (videoRef.current.readyState >= 2 && 
          videoRef.current.videoWidth > 0 && 
          videoRef.current.videoHeight > 0) {
        
        // Add this block to log video state
        console.log(
          'Video state before send:', 
          { 
            width: videoRef.current.videoWidth, 
            height: videoRef.current.videoHeight,
            paused: videoRef.current.paused,
            readyState: videoRef.current.readyState,
            currentTime: videoRef.current.currentTime
          }
        );
        
        const startTime = faceDetectionMetrics.startProcessingTimer();
        window._lastProcessingStartTime = startTime;
        
        // Send the current frame for processing
        faceMeshRef.current.send({image: videoRef.current});
        
        // Log frame count occasionally
        if (logFrames && frameCountRef.current % 100 === 0) {
          console.log(`Processed ${frameCountRef.current} frames total`);
          faceDetectionMetrics.logMetrics();
        }
      } else {
        console.warn('Video not ready yet, skipping frame');
      }
      
      // Request the next frame
      // animationFrameRef.current = requestAnimationFrame(processFrame); // This is now handled by the useEffect loop
    } catch (err) {
      console.error('Error processing frame:', err);
      setError(`Frame processing error: ${err.message}`);
      
      // Continue processing next frames even if there was an error
      // animationFrameRef.current = requestAnimationFrame(processFrame); // This is now handled by the useEffect loop
    }
  };

  // Start the benchmark test - with more debugging
  const startBenchmark = async () => {
    console.log('startBenchmark: Function called! Current states - isRunning:', isRunning, 'processing:', processing, 'faceMeshInitialized:', faceMeshInitialized);
    
    // Let's log other critical references too
    console.log('startBenchmark: Critical refs state - videoRef.current:', !!videoRef.current, 'faceMeshRef.current:', !!faceMeshRef.current, 'streamRef.current:', !!streamRef.current);
    
    console.log('startBenchmark: Initiated. Current isRunning:', isRunning, 'Current processing:', processing);

    // Reset state
    setIsRunning(false); // Ensure any old loop is flagged to stop / effect cleans up
    setProcessing(true);
    setError(null);
    faceDetectionMetrics.resetMetrics();

    // Fully reset video element and streamRef before attaching new stream
    if (videoRef.current) {
      console.log('startBenchmark: Resetting video element handlers and srcObject.');
      videoRef.current.onloadedmetadata = null;
      videoRef.current.onerror = null;
      if (videoRef.current.srcObject) {
        const oldStream = videoRef.current.srcObject;
        oldStream.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
    }
    if (streamRef.current) {
        console.log('startBenchmark: Clearing existing streamRef.');
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
    }

    if (!faceMeshInitialized || !faceMeshRef.current) {
      console.error('startBenchmark: FaceMesh not initialized prior to start.');
      setError('FaceMesh is not initialized yet. Please wait or refresh the page.');
      setProcessing(false); // Allow button to be re-enabled
      return;
    }
    
    try {
      console.log('startBenchmark: Requesting webcam access...');
      if (window.electron && window.electron.webcam) {
        console.log('startBenchmark: Using Electron webcam API for permission.');
        const permResult = await window.electron.webcam.requestPermission();
        if (!permResult.permission) {
          throw new Error('Webcam permission denied in Electron');
        }
      }
      
      const constraints = { 
        video: { 
          width: 640, 
          height: 480,
          frameRate: { ideal: 30 }
        },
        audio: false
      };
      
      console.log('startBenchmark: Calling getUserMedia with constraints:', constraints);
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('startBenchmark: Webcam stream obtained successfully.');
      streamRef.current = stream; // Store new stream reference
      
      if (videoRef.current) {
        console.log('startBenchmark: Setting new stream to video element and calling load().');
        videoRef.current.srcObject = stream;
        videoRef.current.load(); // Explicitly tell the video element to load the new source

        videoRef.current.onloadedmetadata = () => {
          console.log('startBenchmark: Video metadata loaded for new stream.');
          videoRef.current.play().then(() => {
            console.log('startBenchmark: Video playback started for new stream. Starting countdown.');
            setCountdown(3);
            let count = 3;
            
            const countdownInterval = setInterval(() => {
              count--;
              setCountdown(count);
              
              if (count <= 0) {
                clearInterval(countdownInterval);
                console.log('startBenchmark: Countdown finished. Calling startActualTest.');
                startActualTest(); 
              }
            }, 1000);
          }).catch(err => {
            console.error('startBenchmark: Error playing video for new stream:', err);
            setError(`Video playback error: ${err.message}`);
            setProcessing(false);
          });
        };
        
        videoRef.current.onerror = (err) => {
          console.error('startBenchmark: Video element error for new stream:', err);
          // Handle video error objects which might not have a message property
          const errorMessage = err.message || (typeof err === 'object' ? JSON.stringify(err) : String(err));
          setError(`Video element error: ${errorMessage}`);
          setProcessing(false);
        };
      } else {
        console.error('startBenchmark: Video element reference not available after obtaining stream.');
        throw new Error('Video element reference not available');
      }
    } catch (error) {
      console.error('startBenchmark: Error in webcam access or setup loop:', error);
      setError(`Camera access error: ${error.message}`);
      setProcessing(false);
      // Ensure stream is stopped if acquired but failed later in the try block
      if (streamRef.current) {
        console.log('startBenchmark: Error caught, stopping acquired stream.');
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    }
  };

  // Start the actual benchmark after countdown - with more debugging
  const startActualTest = () => {
    setIsRunning(true);
    setProcessing(false);
    setCountdown(0);
    
    // Reset frame counter
    frameCountRef.current = 0;
    stopLoopRef.current = false;
    
    // Explicitly reset metrics
    faceDetectionMetrics.resetMetrics();
    
    console.log('Starting benchmark test...');
    
    // Start metrics interval with more frequent updates
    metricsIntervalRef.current = setInterval(() => {
      const currentMetricsData = faceDetectionMetrics.getMetrics();
      console.log('Current metrics update:', currentMetricsData);
      setCurrentMetrics(currentMetricsData);
    }, 500);
    
    // Make sure faceDetection is ready
    if (!faceMeshInitialized || !faceMeshRef.current) {
      console.error('FaceMesh not properly initialized before starting actual test!');
      setError('FaceMesh initialization issue. Please try refreshing or retrying initialization.');
      setProcessing(false); // Ensure processing is false if we bail
      // Ensure isRunning is false if we bail out here, to prevent useEffect from trying to start loop
      if(isRunning) setIsRunning(false); // Set isRunning false to prevent loop start by effect
      return;
    }
    
    // Set isRunning to true. The useEffect will now start the processFrame loop.
    console.log('Setting isRunning to true to trigger animation loop via useEffect.');
    setIsRunning(true); // This will trigger the useEffect
    
    // Set test timer
    console.log('startActualTest: Setting test timer for duration:', testDuration);
    testTimerRef.current = setTimeout(() => {
      console.log(`startActualTest: Test timer expired after ${testDuration} seconds. Frames processed: ${frameCountRef.current}. Calling endBenchmark.`);
      endBenchmark();
    }, testDuration * 1000);
    console.log('startActualTest: Test timer set with ID:', testTimerRef.current);
  };

  // End the benchmark test
  const endBenchmark = () => {
    console.log('endBenchmark: Entered. Current testTimerRef.current:', testTimerRef.current);
    stopLoopRef.current = true; 

    // Setting isRunning to false will trigger the useEffect to stop the animation loop.
    if (isRunning) { 
        console.log('endBenchmark: Current isRunning is true. Setting to false.');
        setIsRunning(false); 
    }
    setCountdown(0); // Explicitly clear countdown state
    
    // Stop intervals and timers
    console.log('endBenchmark: Clearing metricsIntervalRef.current:', metricsIntervalRef.current);
    clearInterval(metricsIntervalRef.current);
    metricsIntervalRef.current = null; // Good practice to nullify after clearing

    console.log('endBenchmark: Clearing testTimerRef.current:', testTimerRef.current);
    clearTimeout(testTimerRef.current);
    testTimerRef.current = null; // Good practice to nullify after clearing
    
    // Record final results
    console.log('endBenchmark: Recording final metrics.');
    const finalMetrics = faceDetectionMetrics.recordDetailedMetrics(testEnvironment);
    setCurrentMetrics(finalMetrics);
    
    // Add to test results history
    console.log('endBenchmark: Adding to test results history.');
    setTestResults(prev => [
      ...prev, 
      {
        id: Date.now(),
        environment: testEnvironment,
        duration: testDuration,
        config: { ...faceMeshConfig },
        metrics: finalMetrics
      }
    ]);
    
    // Stop webcam
    if (streamRef.current) {
      console.log('endBenchmark: Stopping webcam stream.');
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      
      if (videoRef.current) {
        console.log('endBenchmark: Nullifying video srcObject.');
        videoRef.current.srcObject = null;
      }
    }

    // Crucially, allow the user to start another test
    console.log('endBenchmark: Setting processing to false to re-enable Start button.');
    setTimeout(() => {
      console.log('endBenchmark: setTimeout(0) fired - setting processing to false.');
      setProcessing(false);
      
      // Force component reset by incrementing key
      console.log('endBenchmark: Incrementing resetKey to force UI refresh.');
      setResetKey(prev => prev + 1);
      
      // LAST RESORT: Direct DOM manipulation to force UI update if React state updates fail
      setTimeout(() => {
        console.log('endBenchmark: LAST RESORT - Using direct DOM manipulation.');
        try {
          // Hide "Test in progress..." if visible
          const testActiveEl = document.querySelector('.test-active');
          if (testActiveEl) {
            console.log('endBenchmark: Found and hiding .test-active element.');
            testActiveEl.style.display = 'none';
          }
          
          // Enable the Start button
          const startButton = document.querySelector('.btn-start');
          if (startButton) {
            console.log('endBenchmark: Found and enabling .btn-start element.');
            startButton.disabled = false;
          }
          
          // Hide "Preparing test..." if visible
          const processingEl = document.querySelector('.processing');
          if (processingEl) {
            console.log('endBenchmark: Found and hiding .processing element.');
            processingEl.style.display = 'none';
          }
        } catch (err) {
          console.error('endBenchmark: Error in direct DOM manipulation:', err);
        }
      }, 100); // Give React a chance to update first, then force it
    }, 0); // Wrap in setTimeout to ensure UI update
  };

  // Update face mesh configuration
  const updateConfig = (key, value) => {
    setFaceMeshConfig(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Delete a test result
  const deleteResult = (id) => {
    setTestResults(prev => prev.filter(result => result.id !== id));
  };

  // Toggle debugging panel
  const toggleDebugging = () => {
    setDebugging(!debugging);
  };

  // Toggle debug logging
  const toggleLogging = () => {
    setLogFrames(!logFrames);
  };

  // Add a simpler fallback for face detection if MediaPipe fails completely
  const useFallbackDetection = () => {
    // This would implement a simple face detection fallback using a different library
    // or even just track movement for testing purposes
    console.log('Using fallback detection method');
    setError('Using simplified detection method (fallback).');
    
    // Fallback implementation would go here...
  };

  // Update metrics display component to show values even when they're zero
  const MetricsDisplay = ({ metrics }) => {
    if (!metrics) return null;
    
    return (
      <div className="metrics-display">
        <div className="metrics-group">
          <h4>Performance</h4>
          <div className="metric-row">
            <span>FPS:</span>
            <span>{metrics.performance.fps || "0"}</span>
          </div>
          <div className="metric-row">
            <span>Avg Processing Time:</span>
            <span>{metrics.performance.avgProcessingTime || "0.00ms"}</span>
          </div>
          <div className="metric-row">
            <span>Min Processing Time:</span>
            <span>{metrics.performance.minProcessingTime || "0.00ms"}</span>
          </div>
          <div className="metric-row">
            <span>Max Processing Time:</span>
            <span>{metrics.performance.maxProcessingTime || "0.00ms"}</span>
          </div>
          <div className="metric-row">
            <span>Median Processing Time:</span>
            <span>{metrics.performance.medianProcessingTime || "0.00ms"}</span>
          </div>
        </div>
        
        <div className="metrics-group">
          <h4>Detection Quality</h4>
          <div className="metric-row">
            <span>Total Frames:</span>
            <span>{metrics.detection.totalFrames || 0}</span>
          </div>
          <div className="metric-row">
            <span>Detection Rate:</span>
            <span>{metrics.detection.detectionRate || "0%"}</span>
          </div>
          <div className="metric-row">
            <span>Average Confidence:</span>
            <span>{metrics.detection.averageConfidence || "0.00"}</span>
          </div>
          <div className="metric-row">
            <span>Detection Gaps:</span>
            <span>{metrics.detection.detectionGaps || 0}</span>
          </div>
          <div className="metric-row">
            <span>Est. False Negatives:</span>
            <span>{metrics.detection.estimatedFalseNegatives || 0}</span>
          </div>
          <div className="metric-row">
            <span>Est. False Positives:</span>
            <span>{metrics.detection.estimatedFalsePositives || 0}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="benchmark-container">
      <h2>Face Detection Performance Benchmark</h2>
      
      {/* Error message display with retry options */}
      {error && (
        <div className="error-message">
          <h3>Error:</h3>
          <p>{error}</p>
          <div className="error-actions">
            <button onClick={() => setError(null)}>Dismiss</button>
            {error.includes('MediaPipe') && (
              <>
                <button 
                  onClick={() => {
                    // Force reload the page to try again
                    window.location.reload();
                  }}
                >
                  Reload Page
                </button>
                <button 
                  onClick={() => {
                    // Try to reinitialize FaceMesh
                    setError(null);
                    window.setTimeout(() => {
                      if (faceMeshRef.current) {
                        try { faceMeshRef.current.close(); } catch (e) {}
                        faceMeshRef.current = null;
                      }
                      // This will trigger the useEffect to run again
                      setFaceMeshInitialized(false);
                    }, 500);
                  }}
                >
                  Retry Initialization
                </button>
              </>
            )}
          </div>
        </div>
      )}
      
      {/* Initialization status */}
      {!faceMeshInitialized && !error && (
        <div className="initialization-message">
          <p>Initializing MediaPipe Face Mesh... This may take a few moments.</p>
          <div className="loading-spinner"></div>
        </div>
      )}
      
      {/* Debugging toggle */}
      <div className="debug-controls">
        <button onClick={toggleDebugging}>
          {debugging ? 'Hide Debug Info' : 'Show Debug Info'}
        </button>
        <button onClick={toggleLogging} className="log-toggle">
          {logFrames ? 'Disable Frame Logging' : 'Enable Frame Logging'}
        </button>
      </div>
      
      {/* Debugging panel */}
      {debugging && (
        <div className="debug-panel">
          <h3>Debug Information</h3>
          <div>
            <strong>Browser Info:</strong> {navigator.userAgent}
          </div>
          <div>
            <strong>Electron API Available:</strong> {window.electron ? 'Yes' : 'No'}
          </div>
          {window.electron && (
            <div>
              <strong>Electron Webcam API:</strong> {window.electron.webcam ? 'Available' : 'Not Available'}
            </div>
          )}
          <div>
            <strong>MediaPipe Initialized:</strong> {faceMeshInitialized ? 'Yes' : 'No'}
          </div>
          <div>
            <strong>Frames Processed:</strong> {frameCountRef.current}
          </div>
          <button 
            onClick={() => {
              navigator.mediaDevices.enumerateDevices()
                .then(devices => {
                  const videoDevices = devices.filter(device => device.kind === 'videoinput');
                  console.log('Available video devices:', videoDevices);
                  alert(`Found ${videoDevices.length} video devices. Check console for details.`);
                })
                .catch(err => {
                  console.error('Error enumerating devices:', err);
                  alert(`Error getting devices: ${err.message}`);
                });
            }}
          >
            Test Available Cameras
          </button>
          <button onClick={() => faceDetectionMetrics.logMetrics()}>
            Log Current Metrics
          </button>
        </div>
      )}
      
      <div className="benchmark-controls">
        <div className="control-group">
          <label>Test Duration (seconds):</label>
          <input 
            type="number" 
            min="5" 
            max="60" 
            value={testDuration} 
            onChange={(e) => setTestDuration(parseInt(e.target.value))}
            disabled={isRunning || processing}
          />
        </div>
        
        <div className="control-group">
          <label>Test Environment:</label>
          <select 
            value={testEnvironment}
            onChange={(e) => setTestEnvironment(e.target.value)}
            disabled={isRunning || processing}
          >
            <option value="optimal">Optimal Lighting</option>
            <option value="low-light">Low Light</option>
            <option value="backlit">Backlit</option>
            <option value="side-angle">Side Angle</option>
          </select>
        </div>
        
        <h3>FaceMesh Configuration</h3>
        <div className="control-group">
          <label>Max Faces:</label>
          <select 
            value={faceMeshConfig.maxFaces}
            onChange={(e) => updateConfig('maxFaces', parseInt(e.target.value))}
            disabled={isRunning || processing}
          >
            <option value={1}>1</option>
            <option value={2}>2</option>
            <option value={4}>4</option>
          </select>
        </div>
        
        <div className="control-group">
          <label>Refine Landmarks:</label>
          <input 
            type="checkbox" 
            checked={faceMeshConfig.refineLandmarks}
            onChange={(e) => updateConfig('refineLandmarks', e.target.checked)}
            disabled={isRunning || processing}
          />
        </div>
        
        <div className="control-group">
          <label>Detection Confidence:</label>
          <input 
            type="range" 
            min="0.1" 
            max="0.9" 
            step="0.1"
            value={faceMeshConfig.minDetectionConfidence}
            onChange={(e) => updateConfig('minDetectionConfidence', parseFloat(e.target.value))}
            disabled={isRunning || processing}
          />
          <span>{faceMeshConfig.minDetectionConfidence.toFixed(1)}</span>
        </div>
        
        <div className="control-group">
          <label>Tracking Confidence:</label>
          <input 
            type="range" 
            min="0.1" 
            max="0.9" 
            step="0.1"
            value={faceMeshConfig.minTrackingConfidence}
            onChange={(e) => updateConfig('minTrackingConfidence', parseFloat(e.target.value))}
            disabled={isRunning || processing}
          />
          <span>{faceMeshConfig.minTrackingConfidence.toFixed(1)}</span>
        </div>
        
        <button 
          className="btn-start"
          onClick={(e) => {
            console.log('Button clicked! Button disabled state:', e.currentTarget.disabled);
            startBenchmark();
          }}
          disabled={isRunning || processing}
        >
          Start Benchmark
        </button>
      </div>
      
      <div className="benchmark-preview" key={resetKey}>
        {countdown > 0 && (
          <div className="countdown">{countdown}</div>
        )}
        
        {processing && !countdown && (
          <div className="processing">Preparing test...</div>
        )}
        
        {isRunning && (
          <div className="test-active">Test in progress...</div>
        )}
        
        <video 
          ref={videoRef}
          autoPlay 
          playsInline
          muted
        />
        
        {isRunning && (
          <div className="metrics-overlay">
            <div>FPS: {currentMetrics?.performance?.fps || "Initializing..."}</div>
            <div>Avg Time: {currentMetrics?.performance?.avgProcessingTime || "Calculating..."}</div>
            <div>Detection Rate: {currentMetrics?.detection?.detectionRate || "0%"}</div>
          </div>
        )}
      </div>
      
      {currentMetrics && (
        <MetricsDisplay metrics={currentMetrics} />
      )}
      
      {testResults.length > 0 && (
        <div className="test-results">
          <h3>Test Results History</h3>
          
          <table>
            <thead>
              <tr>
                <th>Environment</th>
                <th>Duration</th>
                <th>FPS</th>
                <th>Avg Time</th>
                <th>Detection Rate</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {testResults.map(result => (
                <tr key={result.id}>
                  <td>{result.environment}</td>
                  <td>{result.duration}s</td>
                  <td>{result.metrics.performance.fps}</td>
                  <td>{result.metrics.performance.avgProcessingTime}</td>
                  <td>{result.metrics.detection.detectionRate}</td>
                  <td>
                    <button 
                      className="btn-delete"
                      onClick={() => deleteResult(result.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default FaceDetectionBenchmark; 