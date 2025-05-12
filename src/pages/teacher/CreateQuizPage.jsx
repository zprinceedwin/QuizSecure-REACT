// src/pages/teacher/CreateQuizPage.jsx

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './createquiz.css';

const CreateQuizPage = () => {
  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [forwardOnly, setForwardOnly] = useState(false);
  const [timer, setTimer] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [paperCode, setPaperCode] = useState('');
  const navigate = useNavigate();

  const handleSave = () => {
    // Placeholder: Send quiz data to backend
    setIsSaved(true);
  };

  const handleCodeSubmit = () => {
    // Placeholder: Save paper code to backend
    // Navigate to Question Management
    navigate(`/teacher/questions/${paperCode}`);
  };

  return (
    <div className="createquiz-wrapper">
      <div className="createquiz-card">
        <h2>Create New Quiz</h2>

        <div className="form-group">
          <label>Quiz Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter quiz title"
          />
        </div>

        <div className="form-group">
          <label>Start Time</label>
          <input
            type="datetime-local"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>End Time</label>
          <input
            type="datetime-local"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Timer Duration (in minutes)</label>
          <input
            type="number"
            min={1}
            value={timer}
            onChange={(e) => setTimer(e.target.value)}
            placeholder="e.g., 30"
          />
        </div>

        <div className="form-group toggle-group">
          <label>Forward-only Navigation</label>
          <input
            type="checkbox"
            checked={forwardOnly}
            onChange={() => setForwardOnly(!forwardOnly)}
          />
        </div>

        <button className="save-btn" onClick={handleSave}>Save Quiz</button>

        {isSaved && (
          <div className="paper-code-section">
            <label>Enter Paper Code</label>
            <input
              type="text"
              value={paperCode}
              onChange={(e) => setPaperCode(e.target.value)}
              placeholder="e.g., QUIZ2024"
            />
            <button className="code-btn" onClick={handleCodeSubmit}>Submit Code</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreateQuizPage;
