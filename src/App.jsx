// src/App.jsx
import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from "react-router-dom";
import StudentDashboard from "./pages/student/StudentDashboard";
import DisclaimerPage from "./pages/student/DisclaimerPage";
import FaceScanPage from "./pages/student/FaceScanPage";
import QuizPage from "./pages/student/QuizPage";
import ScoreSummaryPage from "./pages/student/ScoreSummaryPage";
import TeacherDashboard from "./pages/teacher/TeacherDashboard";
import CreateQuizPage from "./pages/teacher/CreateQuizPage";
import QuestionManagementPage from "./pages/teacher/QuestionManagementPage";
import StudentLogsPage from './pages/teacher/StudentLogsPage';
import QuestionManagementLandingPage from './pages/teacher/QuestionManagementLandingPage';
import StudentLogTimeLinePage from './pages/teacher/StudentLogTimeLinePage';
import ViolationSummaryPage from './pages/teacher/ViolationSummaryPage';
import LoginPage from './pages/login/LoginPage';
import IPCDemo from './components/IPCDemo';
import SecurityTest from './pages/SecurityTest';

// Import Authentication Provider
import { AuthProvider } from './services/authContext';
// Import Protected Route
import ProtectedRoute from './components/ProtectedRoute';

import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Import service initialization
import { initializeServices } from './services/initializeServices';

function App() {
  // State to track if we're in development mode
  const [isDev, setIsDev] = useState(false);
  
  // Initialize services on app mount
  useEffect(() => {
    // Initialize services and get cleanup function
    const cleanup = initializeServices();
    
    // Return cleanup function to be called on unmount
    return cleanup;
  }, []);
  
  // Check if we're in development mode
  useEffect(() => {
    // Check if Electron's API is available and if we're in dev mode
    if (window.electron && window.electron.system) {
      // Get development mode status from the electron preload API
      const isDevelopment = window.electron.system.isDevelopment;
      setIsDev(!!isDevelopment);
    } else {
      // Fallback for browser environment
      setIsDev(window.location.hostname === 'localhost' || 
              window.location.hostname === '127.0.0.1');
    }
  }, []);

  // Keyboard shortcut for security test page
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+Shift+S to navigate to security test
      if (e.ctrlKey && e.shiftKey && e.code === 'KeyS') {
        window.location.href = '/security-test';
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <AuthProvider>
      <Router>
        {/* Security Test Navigation - only visible in development mode */}
        {isDev && (
          <div style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            zIndex: 1000,
            backgroundColor: '#f0f0f0',
            border: '1px solid #ddd',
            borderRadius: '4px',
            padding: '10px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
          }}>
            <Link 
              to="/security-test"
              style={{
                display: 'block',
                padding: '5px 10px',
                backgroundColor: '#0066cc',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '4px',
                fontWeight: 'bold',
                textAlign: 'center'
              }}
            >
              Security Test Dashboard
            </Link>
            <div style={{ marginTop: '5px', fontSize: '11px', color: '#666', textAlign: 'center' }}>
              or press Ctrl+Shift+S
            </div>
          </div>
        )}

        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          
          {/* Root route - redirect to login */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="" element={<Navigate to="/login" replace />} />
          
          {/* Protected student routes */}
          <Route 
            path="/student" 
            element={
              <ProtectedRoute requiredRoles="student">
                <StudentDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/disclaimer" 
            element={
              <ProtectedRoute requiredRoles="student">
                <DisclaimerPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/face-scan" 
            element={
              <ProtectedRoute requiredRoles="student">
                <FaceScanPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/quiz" 
            element={
              <ProtectedRoute requiredRoles="student">
                <QuizPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/quiz-summary" 
            element={
              <ProtectedRoute requiredRoles="student">
                <ScoreSummaryPage />
              </ProtectedRoute>
            } 
          />
          
          {/* Protected teacher routes */}
          <Route 
            path="/teacher" 
            element={
              <ProtectedRoute requiredRoles="teacher">
                <TeacherDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/teacher/create-quiz" 
            element={
              <ProtectedRoute requiredRoles="teacher">
                <CreateQuizPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/teacher/questions/:paperCode" 
            element={
              <ProtectedRoute requiredRoles="teacher">
                <QuestionManagementPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/teacher/questions" 
            element={
              <ProtectedRoute requiredRoles="teacher">
                <QuestionManagementLandingPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/teacher/student-logs" 
            element={
              <ProtectedRoute requiredRoles="teacher">
                <StudentLogsPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/teacher/student-logs/view/:paperCode/:studentName" 
            element={
              <ProtectedRoute requiredRoles="teacher">
                <StudentLogTimeLinePage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/teacher/violation-summary" 
            element={
              <ProtectedRoute requiredRoles="teacher">
                <ViolationSummaryPage />
              </ProtectedRoute>
            } 
          />
          
          {/* Development routes */}
          <Route path="/ipc-demo" element={<IPCDemo />} />
          <Route path="/security-test" element={<SecurityTest />} />
          
          {/* 404 - Redirect to login */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>

        <ToastContainer position="top-right" autoClose={3000} />
      </Router>
    </AuthProvider>
  );
}

export default App;
