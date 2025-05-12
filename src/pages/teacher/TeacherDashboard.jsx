// src/pages/teacher/TeacherDashboard.jsx

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './TeacherDashboard.css';
import logo from '../../assets/quizsecure-logo.png';

// Pages
import PaperManagementPage from './PaperManagementPage';
import CreateQuizPage from './CreateQuizPage';
import StudentLogsPage from './StudentLogsPage';
import QuestionManagementPage from './QuestionManagementPage';
import QuestionManagementLandingPage from './QuestionManagementLandingPage';
import ViolationSummaryPage from './ViolationSummaryPage';

const TeacherDashboard = () => {
  const [activePage, setActivePage] = useState('paper');
  const navigate = useNavigate();

  const handleLogout = () => {
    // 🔐 Optional: Clear session/token here
    navigate('/login');
  };

  const renderPage = () => {
    switch (activePage) {
      case 'paper':
        return <PaperManagementPage />;
      case 'questions':
        return <QuestionManagementLandingPage />;
      case 'logs':
        return <StudentLogsPage />;
      case 'violations':
        return <ViolationSummaryPage />;
      default:
        return <div className="page-content">Select a page</div>;
    }
  };

  return (
    <div className="teacher-dashboard">
      <aside className="teacher-sidebar">
        <img src={logo} alt="QuizSecure Logo" className="logo-img" />

        <button onClick={() => setActivePage('paper')}>Paper Management</button>
        <button onClick={() => setActivePage('questions')}>Question Management</button>
        <button onClick={() => setActivePage('logs')}>Student Logs</button>
        <button onClick={() => setActivePage('violations')}>Violation Summary</button>
        <button className="logout-btn" onClick={handleLogout}>Logout</button>
      </aside>

      <div className="teacher-main">
        <header className="teacher-topbar">
          <h2>
            {activePage === 'paper' && 'Paper Management'}
            {activePage === 'questions' && 'Question Management'}
            {activePage === 'logs' && 'Student Logs'}
            {activePage === 'violations' && 'Violation Summary'}
          </h2>
        </header>

        <main className="teacher-content">
          {renderPage()}
        </main>
      </div>
    </div>
  );
};

export default TeacherDashboard;
