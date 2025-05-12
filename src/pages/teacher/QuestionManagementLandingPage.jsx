import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './questionlanding.css';

const QuestionManagementLandingPage = () => {
  const navigate = useNavigate();
  const [papers, setPapers] = useState(null); // null = not yet fetched

  // Simulate backend fetch logic (replace with real API later)
  useEffect(() => {
    // fetch('/api/papers')...
    // setPapers(response.data);
  }, []);

  return (
    <div className="qm-landing-wrapper">
      <h2>Question Management</h2>

      {papers === null ? (
        <p className="qm-empty">⏳ Waiting for saved papers from backend...</p>
      ) : papers.length === 0 ? (
        <p className="qm-empty">No saved quizzes found. Please create a quiz first.</p>
      ) : (
        <table className="qm-table">
          <thead>
            <tr>
              <th>Quiz Title</th>
              <th>Paper Code</th>
              <th>Questions</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {papers.map((paper, index) => (
              <tr key={index}>
                <td>{paper.title}</td>
                <td>{paper.code}</td>
                <td>{paper.questionCount}</td>
                <td>
                  <button
                    className="edit-btn"
                    onClick={() => navigate(`/teacher/questions/${paper.code}`)}
                  >
                    Edit Questions
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default QuestionManagementLandingPage;
