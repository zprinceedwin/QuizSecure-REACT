// src/pages/student/QuizPage.jsx

import React, { useState, useEffect, useRef } from 'react';
import * as cam from '@mediapipe/camera_utils';
import { FaceMesh } from '@mediapipe/face_mesh';
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
  const [isFaceDetected, setIsFaceDetected] = useState(true);
  const [quizPaused, setQuizPaused] = useState(false);

  const forwardOnly = true; // ✅ Replace with backend config later

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  let camera = null;

  // ✅ Placeholder: Load questions from backend when component mounts
  useEffect(() => {
    // TODO: Backend - Fetch quiz questions by paperCode or token
    // fetch('/api/quiz/questions?paperCode=XYZ&studentId=123')
    //   .then(res => res.json())
    //   .then(data => setQuestions(data));
  }, []);

  // ✅ Mediapipe FaceMesh setup
  useEffect(() => {
    const faceMesh = new FaceMesh({
      locateFile: file => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
    });

    faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

    faceMesh.onResults(onResults);

    if (videoRef.current) {
      camera = new cam.Camera(videoRef.current, {
        onFrame: async () => {
          await faceMesh.send({ image: videoRef.current });
        },
        width: 640,
        height: 480
      });
      camera.start();
    }
  }, []);

  const onResults = (results) => {
    const canvasCtx = canvasRef.current.getContext('2d');
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    canvasCtx.drawImage(results.image, 0, 0, canvasRef.current.width, canvasRef.current.height);

    const faceVisible = results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0;
    setIsFaceDetected(faceVisible);
    setQuizPaused(!faceVisible);

    if (!faceVisible) logEvent('FACE_LOST');

    canvasCtx.restore();
  };

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
  const logEvent = (type) => {
    console.log(`[LOG] ${type} at ${new Date().toISOString()}`);
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
  };

  return (
    <div className={`quiz-wrapper ${quizPaused ? 'quiz-paused' : ''}`}>
      {!isWindowFocused && <div className="warning-overlay">⚠️ Please stay on the quiz tab!</div>}
      <div className="pause-overlay">🚫 Face Not Detected. Quiz is Paused.</div>

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
      </div>
    </div>
  );
};

export default QuizPage;
