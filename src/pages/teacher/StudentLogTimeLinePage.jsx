// src/pages/teacher/StudentLogTimelinePage.jsx

import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import './studentlogtimeline.css';

const StudentLogTimeLinePage = () => {
  const { paperCode, studentName } = useParams();
  const [logs, setLogs] = useState(null); // null = loading

  useEffect(() => {
    // 🔧 Backend Placeholder: Fetch logs for this student and paper
    // Example: GET /api/logs/:paperCode/:studentName
    // axios.get(`/api/logs/${paperCode}/${studentName}`).then(res => setLogs(res.data));
    setLogs([]); // temporary placeholder until backend is connected
  }, [paperCode, studentName]);

  const getTypeClass = (type) => {
    switch (type) {
      case 'start': return 'log-start';
      case 'tab-switch': return 'log-tab';
      case 'face-lost': return 'log-warning';
      case 'face-found': return 'log-success';
      case 'quiz-end': return 'log-end';
      default: return 'log-default';
    }
  };

  return (
    <div className="log-timeline-wrapper">
      <h2>Quiz Log for: {decodeURIComponent(studentName)}</h2>
      <h4>Paper Code: {paperCode}</h4>

      {logs === null ? (
        <p className="log-waiting">Waiting for logs from backend...</p>
      ) : logs.length === 0 ? (
        <p className="log-empty">No activity logs found yet for this session.</p>
      ) : (
        <ul className="log-timeline">
          {logs.map((entry, index) => (
            <li key={index} className={`log-entry ${getTypeClass(entry.type)}`}>
              <span className="log-time">{entry.time}</span>
              <span className="log-msg">{entry.message}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default StudentLogTimeLinePage;
