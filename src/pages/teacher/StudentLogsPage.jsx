import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './studentlogs.css';

const StudentLogsPage = () => {
  const [papers, setPapers] = useState(null); // null = loading
  const [selectedPaper, setSelectedPaper] = useState(null);
  const [logs, setLogs] = useState(null); // null = loading
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  // Simulate fetching papers from backend
  useEffect(() => {
    // Replace with: fetch('/api/papers')...
    setTimeout(() => {
      setPapers([]); // empty for now
    }, 1000);
  }, []);

  // Simulate fetching logs when paper is selected
  useEffect(() => {
    if (!selectedPaper) return;

    // Replace with: fetch(`/api/logs/${selectedPaper.code}`)
    setLogs(null); // reset logs
    setTimeout(() => {
      setLogs([]); // empty for now
    }, 1000);
  }, [selectedPaper]);

  const filteredLogs = logs?.filter((log) =>
    log.studentName.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <div className="logs-wrapper">
      <h2>Student Logs</h2>

      {/* === Paper Selection Table === */}
      {papers === null ? (
        <p className="log-waiting">⏳ Waiting for saved papers from backend...</p>
      ) : !selectedPaper ? (
        papers.length === 0 ? (
          <p className="log-empty">No papers found. Please create one in Paper Management.</p>
        ) : (
          <>
            <p>Select a quiz to view student logs:</p>
            <table className="logs-table">
              <thead>
                <tr>
                  <th>Paper Code</th>
                  <th>Quiz Title</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {papers.map((paper) => (
                  <tr key={paper.code}>
                    <td>{paper.code}</td>
                    <td>{paper.title}</td>
                    <td>
                      <button
                        className="view-btn"
                        onClick={() => setSelectedPaper(paper)}
                      >
                        View Logs
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )
      ) : (
        <>
          {/* === Student Logs Table === */}
          <div className="logs-header">
            <h3>
              Logs for: {selectedPaper.code} - {selectedPaper.title}
            </h3>
            <button className="back-btn" onClick={() => {
              setSelectedPaper(null);
              setLogs(null);
              setSearchQuery('');
            }}>
              ← Back to Papers
            </button>
            <input
              type="text"
              placeholder="Search student..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>

          {logs === null ? (
            <p className="log-waiting">⏳ Waiting for student logs...</p>
          ) : filteredLogs.length === 0 ? (
            <p className="log-empty">No matching logs found.</p>
          ) : (
            <table className="logs-table">
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>Start Time</th>
                  <th>End Time</th>
                  <th>Violations</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log, i) => (
                  <tr key={i}>
                    <td>{log.studentName}</td>
                    <td>{log.startTime}</td>
                    <td>{log.endTime}</td>
                    <td>{log.violations}</td>
                    <td>
                      <button
                        className="view-btn"
                        onClick={() =>
                          navigate(
                            `/teacher/student-logs/${selectedPaper.code}/${encodeURIComponent(log.studentName)}`
                          )
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
        </>
      )}
    </div>
  );
};

export default StudentLogsPage;
