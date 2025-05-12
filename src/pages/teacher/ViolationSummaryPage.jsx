// src/pages/teacher/ViolationSummaryPage.jsx

import React, { useState, useEffect } from 'react';
import './violationsummary.css';
import { useNavigate } from 'react-router-dom';

const ViolationSummaryPage = () => {
  const [violations, setViolations] = useState(null); // null = loading
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    // 🔧 Backend Placeholder: Fetch violation summary
    // Example: GET /api/violations
    // axios.get('/api/violations').then(res => setViolations(res.data));
    setViolations([]); // temporary placeholder
  }, []);

  const filtered = violations?.filter((v) =>
    v.paperCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="violation-wrapper">
      <h2>Violation Summary</h2>

      <input
        type="text"
        placeholder="Search paper code or quiz title..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="search-bar"
      />

      {violations === null ? (
        <p className="status-msg">Waiting for violation data from backend...</p>
      ) : filtered.length === 0 ? (
        <p className="status-msg">No matching results found.</p>
      ) : (
        <table className="violation-table">
          <thead>
            <tr>
              <th>Paper Code</th>
              <th>Quiz Title</th>
              <th>Student Name</th>
              <th>Total Violations</th>
              <th>Violation Types</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((v, index) => (
              <tr key={index}>
                <td>{v.paperCode}</td>
                <td>{v.title}</td>
                <td>{v.studentName}</td>
                <td>{v.total}</td>
                <td>{v.types.join(', ')}</td>
                <td>
                  <button
                    className="view-btn"
                    onClick={() =>
                      navigate(`/teacher/student-logs/view/${encodeURIComponent(v.studentName)}`)
                    }
                  >
                    View Log
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

export default ViolationSummaryPage;
