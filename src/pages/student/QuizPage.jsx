// src/pages/student/QuizPage.jsx

import React, { useState, useEffect, useRef } from 'react';
import { FaceMesh } from '@mediapipe/face_mesh';
import * as webcamService from '../../services/webcamService';
import './quiz.css';

const QuizPage = () => {
  const [questions, setQuestions] = useState([]); // ✅ To be filled by backend
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [textSize, setTextSize] = useState('medium');
  const [showProgressViewer, setShowProgressViewer] = useState(false);
  const [answeredQuestions, setAnsweredQuestions] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [timer, setTimer] = useState(3600); // ✅ Adjust default from backend
  const [isWindowFocused, setIsWindowFocused] = useState(true);
  const [isFaceDetected, setIsFaceDetected] = useState(false);
  const [quizPaused, setQuizPaused] = useState(true);
  
  // Webcam-related states
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [availableDevices, setAvailableDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState(null);

  const forwardOnly = true; // ✅ Replace with backend config later

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const faceMeshRef = useRef(null);
  const animationFrameRef = useRef(null);
  const previousDetectionStateRef = useRef(null);
  const proctoringLogRef = useRef([]);

  // ✅ Placeholder: Load questions from backend when component mounts
  useEffect(() => {
    // TODO: Backend - Fetch quiz questions by paperCode or token
    // fetch('/api/quiz/questions?paperCode=XYZ&studentId=123')
    //   .then(res => res.json())
    //   .then(data => setQuestions(data));
    
    // Mock questions for development
    setQuestions([
      {
        question: 'What is the capital of France?',
        choices: ['London', 'Paris', 'Berlin', 'Madrid']
      },
      {
        question: 'Which planet is known as the Red Planet?',
        choices: ['Earth', 'Mars', 'Jupiter', 'Venus']
      },
      {
        question: 'What is 2 + 2?',
        choices: ['3', '4', '5', '22']
      }
    ]);
  }, []);

  // ✅ Initialize FaceMesh
  useEffect(() => {
    const faceMesh = new FaceMesh({
      locateFile: file => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
    });

    faceMesh.setOptions({
      maxNumFaces: 5,
      refineLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

    faceMesh.onResults(onResults);
    faceMeshRef.current = faceMesh;

    return () => {
      if (faceMeshRef.current) {
        faceMeshRef.current.close();
      }
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Process FaceMesh results
  const onResults = (results) => {
    if (!canvasRef.current) return;
    
    const canvasCtx = canvasRef.current.getContext('2d');
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    canvasCtx.drawImage(results.image, 0, 0, canvasRef.current.width, canvasRef.current.height);

    const currentTime = Date.now();
    let currentFaceCount = 0;
    if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
      currentFaceCount = results.multiFaceLandmarks.length;
    }

    const faceVisible = currentFaceCount === 1;
    setIsFaceDetected(faceVisible);
    setQuizPaused(!faceVisible || !isStreaming);

    const previousState = previousDetectionStateRef.current;
    const previousFaceCount = previousState ? previousState.faceCount : 0;

    if (currentFaceCount === 1 && previousFaceCount !== 1) {
      window.dispatchEvent(new CustomEvent('quizsecure:facedetected', { detail: { timestamp: currentTime, faceCount: 1 } }));
    } else if (currentFaceCount === 0 && previousFaceCount > 0) {
      window.dispatchEvent(new CustomEvent('quizsecure:facelost', { detail: { timestamp: currentTime } }));
    } else if (currentFaceCount > 1 && previousFaceCount !== currentFaceCount) {
      window.dispatchEvent(new CustomEvent('quizsecure:multiplefaces', { detail: { timestamp: currentTime, faceCount: currentFaceCount } }));
    }
    
    previousDetectionStateRef.current = { faceCount: currentFaceCount };

    canvasCtx.restore();
  };

  // Check webcam permissions on component mount
  useEffect(() => {
    const checkPermission = async () => {
      try {
        console.log('[QuizPage] Checking webcam permissions');
        const hasPermission = await webcamService.checkPermissions();
        console.log('[QuizPage] Permission check result:', hasPermission);
        setPermissionGranted(hasPermission);
        
        if (hasPermission) {
          console.log('[QuizPage] Permission granted, getting camera devices');
          const devices = await webcamService.getDevices();
          console.log('[QuizPage] Available devices:', devices);
          setAvailableDevices(devices);
          
          // Select first device by default if available
          if (devices.length > 0) {
            console.log('[QuizPage] Setting default device:', devices[0].deviceId);
            setSelectedDeviceId(devices[0].deviceId);
          } else {
            console.warn('[QuizPage] No camera devices found even though permission granted');
            setError("No camera devices found. Please connect a webcam.");
            setQuizPaused(true);
          }
        } else {
          // We don't auto-request here (unlike FaceScanPage) as we want to show the permission UI
          console.log('[QuizPage] Permission not granted, waiting for user action');
          setQuizPaused(true);
        }
      } catch (err) {
        console.error("Error checking webcam permission:", err);
        setError("Failed to check webcam permissions: " + err.message);
        setQuizPaused(true);
      }
    };
    
    checkPermission();
    
    // Listen for device changes (cameras connected/disconnected)
    const removeListener = webcamService.listenForDeviceChanges((newDevices) => {
      console.log('[QuizPage] Device change detected, new devices:', newDevices);
      setAvailableDevices(newDevices);
      
      // If selected device was disconnected, select first available
      if (selectedDeviceId && !newDevices.some(d => d.deviceId === selectedDeviceId)) {
        if (newDevices.length > 0) {
          console.log('[QuizPage] Selected device disconnected, switching to:', newDevices[0].deviceId);
          setSelectedDeviceId(newDevices[0].deviceId);
        } else {
          console.warn('[QuizPage] No webcam devices available after device change');
          setError("No webcam devices available");
          setQuizPaused(true);
        }
      }
    });
    
    return () => {
      // Clean up device change listener
      console.log('[QuizPage] Cleaning up device change listener');
      removeListener();
    };
  }, []);
  
  // Start/stop webcam stream based on selected device
  useEffect(() => {
    const startCamera = async () => {
      if (!permissionGranted) {
        console.log('[QuizPage] startCamera: No permission granted');
        setQuizPaused(true);
        return;
      }
      
      if (!selectedDeviceId) {
        console.log('[QuizPage] startCamera: No device selected');
        // Try to get devices one more time
        try {
          const devices = await webcamService.getDevices(true);
          if (devices.length > 0) {
            console.log('[QuizPage] startCamera: Found devices on retry, selecting first one');
            setAvailableDevices(devices);
            setSelectedDeviceId(devices[0].deviceId);
            return; // Will trigger this effect again with the new deviceId
          } else {
            setError("No camera devices found. Please connect a webcam.");
            setQuizPaused(true);
          }
        } catch (devErr) {
          console.error('[QuizPage] startCamera: Error getting devices on retry:', devErr);
          setQuizPaused(true);
        }
        return;
      }
      
      try {
        console.log('[QuizPage] startCamera: Starting camera with device ID:', selectedDeviceId);
        setError(null);
        
        // Start stream with selected device
        const stream = await webcamService.startStream(selectedDeviceId);
        console.log('[QuizPage] startCamera: Stream obtained successfully');
        
        // Connect video element to stream
        if (videoRef.current) {
          console.log('[QuizPage] startCamera: Connecting stream to video element');
          videoRef.current.srcObject = stream;
          
          // Setup frame processing loop for face detection
          const processFrame = async () => {
            if (videoRef.current && faceMeshRef.current && webcamService.isStreaming()) {
              try {
                await faceMeshRef.current.send({ image: videoRef.current });
              } catch (sendError) {
                console.error('[QuizPage] processFrame: Error sending frame to FaceMesh:', sendError);
              }
              animationFrameRef.current = requestAnimationFrame(processFrame);
            } else {
              // Log issues if expected to be streaming
              if (webcamService.isStreaming()) {
                console.log('[QuizPage] processFrame: Conditions not met:', 
                  'videoRef=', !!videoRef.current, 
                  'faceMeshRef=', !!faceMeshRef.current,
                  'isStreaming=', webcamService.isStreaming());
              }
              // Keep trying if we're supposed to be streaming
              if (webcamService.isStreaming()) {
                animationFrameRef.current = requestAnimationFrame(processFrame);
              }
            }
          };
          
          // Start processing frames once video is loaded
          videoRef.current.onloadedmetadata = () => {
            console.log('[QuizPage] startCamera: Video metadata loaded, starting playback');
            videoRef.current.play()
              .then(() => {
                console.log('[QuizPage] startCamera: Video playback started successfully');
                setIsStreaming(true);
                animationFrameRef.current = requestAnimationFrame(processFrame);
              })
              .catch(playErr => {
                console.error('[QuizPage] startCamera: Error starting video playback:', playErr);
                setError(`Failed to play video: ${playErr.message}`);
                setIsStreaming(false);
                setQuizPaused(true);
              });
          };
          
          videoRef.current.onerror = (e) => {
            console.error('[QuizPage] startCamera: Video element error:', e);
            setError('Video element error. Failed to load webcam stream.');
            setIsStreaming(false);
            setQuizPaused(true);
            webcamService.stopStream();
          };
        } else {
          console.error('[QuizPage] startCamera: No video ref available');
          setError('Video element not available');
          setIsStreaming(false);
          setQuizPaused(true);
          webcamService.stopStream();
        }
      } catch (err) {
        console.error("[QuizPage] startCamera: Error starting webcam:", err);
        setError(`Failed to start webcam: ${err.message}`);
        setIsStreaming(false);
        setQuizPaused(true);
      }
    };
    
    startCamera();
    
    return () => {
      // Clean up webcam resources on unmount or when device changes
      console.log('[QuizPage] Cleanup for webcam: Stopping stream and cancelling animation frame');
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      webcamService.stopStream();
      setIsStreaming(false);
    };
  }, [permissionGranted, selectedDeviceId]);

  // ✅ Countdown timer
  useEffect(() => {
    const countdown = setInterval(() => {
      if (!quizPaused) {
        setTimer(prev => (prev > 0 ? prev - 1 : 0));
      }
    }, 1000);
    return () => clearInterval(countdown);
  }, [quizPaused]);

  // ✅ Detect tab switching
  useEffect(() => {
    const handleFocus = () => setIsWindowFocused(true);
    const handleBlur = () => {
      setIsWindowFocused(false);
      logEvent('TAB_SWITCH');
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  // ✅ Logging violations to backend (Face lost, tab switch)
  const logEvent = (type, eventData = {}) => {
    const logEntry = {
      type,
      timestamp: new Date().toISOString(),
      ...eventData
    };
    console.log(`[QUIZ LOG EVENT] Type: ${type}, Details:`, eventData);
    // TODO: Backend - POST this log to backend server
    // fetch('/api/logs', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({
    //     eventType: type,
    //     paperCode: 'XYZ',
    //     studentId: '123',
    //     timestamp: new Date().toISOString(),
    //   })
    // });
  };

  // Request webcam permission if not granted
  const requestPermission = async () => {
    try {
      console.log('[QuizPage] Requesting webcam permission');
      setError(null);
      const granted = await webcamService.requestPermissions();
      console.log('[QuizPage] Permission request result:', granted);
      setPermissionGranted(granted);
      
      if (granted) {
        console.log('[QuizPage] Permission granted, getting devices');
        const devices = await webcamService.getDevices(true); // Force refresh
        console.log('[QuizPage] Devices after permission grant:', devices);
        setAvailableDevices(devices);
        
        if (devices.length > 0) {
          console.log('[QuizPage] Setting first device:', devices[0].deviceId);
          setSelectedDeviceId(devices[0].deviceId);
        } else {
          console.warn('[QuizPage] No devices found after permission granted');
          setError("No camera devices found. Please connect a webcam.");
          setQuizPaused(true);
        }
      } else {
        console.warn('[QuizPage] Permission denied by user');
        setError("Webcam permission denied. Proctoring requires camera access.");
        setQuizPaused(true);
      }
    } catch (err) {
      console.error("[QuizPage] Error requesting webcam permission:", err);
      setError(`Failed to request webcam permission: ${err.message}`);
      setQuizPaused(true);
    }
  };
  
  // Handle device selection change
  const handleDeviceChange = (e) => {
    setSelectedDeviceId(e.target.value);
  };

  // ✅ Timer format
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // ✅ Change font size
  const changeTextSize = (size) => setTextSize(size);

  const currentQuestion = questions[currentQuestionIndex];

  // ✅ Save answer locally
  const handleAnswer = (choice) => {
    const updatedAnswers = [...answers];
    updatedAnswers[currentQuestionIndex] = choice;
    setAnswers(updatedAnswers);

    const updatedAnswered = [...answeredQuestions];
    updatedAnswered[currentQuestionIndex] = true;
    setAnsweredQuestions(updatedAnswered);
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const skipQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const previousQuestion = () => {
    if (!forwardOnly && currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  // ✅ Submit handler — prepare for backend integration
  const submitQuiz = () => {
    // TODO: Backend - POST student answers to backend
    // fetch('/api/quiz/submit', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({
    //     studentId: '123',
    //     paperCode: 'XYZ',
    //     answers,
    //     timeSpent: 3600 - timer,
    //   }),
    // });
    console.log('Quiz submitted:', { answers, timeSpent: 3600 - timer });
  };

  // ✅ New useEffect for Listening to Custom Proctoring Events
  useEffect(() => {
    const handleFaceDetected = (event) => {
      console.log('[PROCTORING EVENT] Face Detected:', event.detail);
      // Here, you would add logic for proctoring rules, e.g., update UI, log warning
      // For now, we just log to console
      proctoringLogRef.current = [...proctoringLogRef.current, { type: 'faceDetected', ...event.detail }];
    };

    const handleFaceLost = (event) => {
      console.log('[PROCTORING EVENT] Face Lost:', event.detail);
      // Add proctoring logic
      proctoringLogRef.current = [...proctoringLogRef.current, { type: 'faceLost', ...event.detail }];
      // Potentially pause quiz or show a more prominent warning via state
    };

    const handleMultipleFaces = (event) => {
      console.log('[PROCTORING EVENT] Multiple Faces Detected:', event.detail);
      // Add proctoring logic
      proctoringLogRef.current = [...proctoringLogRef.current, { type: 'multipleFaces', ...event.detail }];
      // Potentially pause quiz or show a prominent warning
    };

    window.addEventListener('quizsecure:facedetected', handleFaceDetected);
    window.addEventListener('quizsecure:facelost', handleFaceLost);
    window.addEventListener('quizsecure:multiplefaces', handleMultipleFaces);

    return () => {
      window.removeEventListener('quizsecure:facedetected', handleFaceDetected);
      window.removeEventListener('quizsecure:facelost', handleFaceLost);
      window.removeEventListener('quizsecure:multiplefaces', handleMultipleFaces);
    };
  }, []);

  return (
    <div className={`quiz-wrapper ${quizPaused ? 'quiz-paused' : ''}`}>
      {!isWindowFocused && <div className="warning-overlay">⚠️ Please stay on the quiz tab!</div>}
      
      {/* Face not detected warning */}
      {isStreaming && !isFaceDetected && <div className="pause-overlay">🚫 Face Not Detected. Quiz is Paused.</div>}
      
      {/* Permission denied warning */}
      {!permissionGranted && (
        <div className="permission-overlay">
          <div className="permission-dialog">
            <h3>Camera Access Required</h3>
            <p>This quiz requires webcam access for proctoring.</p>
            <button onClick={requestPermission} className="permission-button">
              Allow Camera Access
            </button>
          </div>
        </div>
      )}

      <div className="quiz-header">
        {!forwardOnly && <button onClick={previousQuestion} disabled={quizPaused}>Previous</button>}
        <button onClick={skipQuestion} disabled={quizPaused}>Skip</button>
        <button onClick={nextQuestion} disabled={quizPaused}>Next</button>
        <span className="quiz-progress-count">{currentQuestionIndex + 1} / {questions.length || '-'}</span>
        <button onClick={() => setShowProgressViewer(!showProgressViewer)}>📋</button>
        <div className="text-size-toggle">
          <button onClick={() => changeTextSize('small')}>A-</button>
          <button onClick={() => changeTextSize('medium')}>A</button>
          <button onClick={() => changeTextSize('large')}>A+</button>
        </div>
        <div className="timer">⏰ {formatTime(timer)}</div>
        
        {/* Camera selector (only show if multiple devices available) */}
        {permissionGranted && availableDevices.length > 1 && (
          <div className="camera-selector">
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
      </div>

      {showProgressViewer && (
        <div className="progress-viewer">
          {questions.map((_, index) => (
            <div
              key={index}
              className={`progress-circle ${answeredQuestions[index] ? 'answered' : 'unanswered'}`}
            >
              {index + 1}
            </div>
          ))}
        </div>
      )}

      <div className={`quiz-content ${textSize}`}>
        {questions.length === 0 ? (
          <div className="loading-state">⏳ Waiting for quiz data...</div>
        ) : (
          <div className="question-box">
            <h2>{currentQuestion?.question}</h2>
            <div className="choices">
              {currentQuestion?.choices?.map((choice, index) => (
                <button
                  key={index}
                  className="choice-btn"
                  onClick={() => handleAnswer(choice)}
                  disabled={quizPaused}
                >
                  {choice}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="webcam-container">
        <video ref={videoRef} autoPlay muted playsInline className="webcam-feed" />
        <canvas ref={canvasRef} width="640" height="480" className="webcam-canvas" />
        
        {/* Error message */}
        {error && <div className="webcam-error">{error}</div>}
        
        {/* Submit button at the bottom */}
        {questions.length > 0 && (
          <button 
            className="submit-quiz-btn" 
            onClick={submitQuiz}
            disabled={quizPaused}
          >
            Submit Quiz
          </button>
        )}
      </div>
    </div>
  );
};

export default QuizPage;
