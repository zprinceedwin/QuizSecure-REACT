// src/pages/teacher/PaperManagementPage.jsx

import React from 'react';
import { useNavigate } from 'react-router-dom';
import './paper.css';

const PaperManagementPage = () => {
  const navigate = useNavigate();
  const papers = []; // 🔁 Will be replaced with real backend data

  return (
    <div className="paper-wrapper">
      <div className="paper-header">
        <h2>📄 Your Quiz Papers</h2>
        <button className="create-btn" onClick={() => navigate('/teacher/create-quiz')}>
          ➕ Create New Quiz
        </button>
      </div>

      {papers.length === 0 ? (
        <div className="empty-state">No quizzes available. Waiting for data…</div>
      ) : (
        <table className="paper-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Start Time</th>
              <th>End Time</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {papers.map((paper, index) => (
              <tr key={index}>
                <td>{paper.title}</td>
                <td>{paper.startTime}</td>
                <td>{paper.endTime}</td>
                <td>{paper.status}</td>
                <td>
                  <button className="edit-btn">✏️ Edit</button>
                  <button className="delete-btn">🗑️ Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default PaperManagementPage;
