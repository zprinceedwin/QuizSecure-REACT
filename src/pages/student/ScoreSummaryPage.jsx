// src/pages/student/ScoreSummaryPage.jsx

import React from 'react';
import './summary.css';
import { useNavigate, useLocation } from 'react-router-dom';

const ScoreSummaryPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // ✅ Backend-ready: Replace all fallbacks below with real location.state values
  // These values will be passed by the quiz submission route upon quiz completion

  const totalQuestions = location.state?.totalQuestions || 50; // ✅ Required: total # of questions
  const answeredQuestions = location.state?.answered || 45;    // ✅ Optional: for analytics or logs
  const rawScore = location.state?.score || 50;                // ✅ Required: raw score received
  const timeSpent = location.state?.timeSpent || 773;          // ✅ Required: total time taken (in seconds)

  const minPassingScore = 0.7; // ✅ This could later come from backend configuration
  const isPassed = (rawScore / totalQuestions) >= minPassingScore;
  const scorePercent = (rawScore / totalQuestions) * 100;

  // ✅ Dynamically determine performance label based on score %
  const getPerformanceLabel = () => {
    if (scorePercent >= 90) return 'Excellent';
    if (scorePercent >= 75) return 'Good';
    if (scorePercent >= 60) return 'Fair';
    return 'Needs Improvement';
  };

  const formatTimeSpent = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="summary-wrapper">
      {/* ✅ Logout and return to login screen */}
      <button className="logout-btn" onClick={() => navigate('/login')}>Log Out</button>

      <div className="summary-card">
        {/* ✅ Half-circle score meter */}
        <svg viewBox="0 0 36 18" className="gauge">
          <path
            d="M2 18 A16 16 0 0 1 34 18"
            fill="none"
            stroke="#eee"
            strokeWidth="3"
          />
          <path
            d="M2 18 A16 16 0 0 1 34 18"
            fill="none"
            stroke={isPassed ? '#4caf50' : '#f44336'}
            strokeWidth="3"
            strokeDasharray={`${(scorePercent / 100) * 50} 50`}
            strokeLinecap="round"
          />
        </svg>

        {/* ✅ Main score display */}
        <div className="score-details">
          <h3 className={isPassed ? 'passed' : 'failed'}>
            {isPassed ? 'Passed' : 'Not Passed'}
          </h3>
          <p className="score-value">{rawScore} / {totalQuestions}</p>
          <p className="label">{getPerformanceLabel()}</p>
        </div>

        {/* ✅ Additional quiz info */}
        <div className="summary-info">
          <p><strong>Time Spent:</strong> {formatTimeSpent(timeSpent)}</p>
          <p><strong>Min. Passing Score:</strong> 70%</p>
        </div>

        {/* ✅ Return to Student Dashboard */}
        <div className="summary-buttons">
          <button onClick={() => navigate('/')}>Return to Dashboard</button>
        </div>
      </div>
    </div>
  );
};

export default ScoreSummaryPage;
