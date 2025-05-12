// src/pages/student/DisclaimerPage.jsx

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./disclaimer.css";
import logo from "../../assets/quizsecure-logo.png";

function DisclaimerPage() {
  const [accepted, setAccepted] = useState(false);
  const navigate = useNavigate();

  // ✅ If checkbox is checked, proceed to Face Scan Page
  const handleAccept = () => {
    if (accepted) {
      navigate("/face-scan"); // Navigate to Face Scan step
    }
  };

  // ⬅ Back to Student Dashboard
  const handleBack = () => {
    navigate("/");
  };

  // 🏠 Logo click also returns home
  const goHome = () => {
    navigate("/");
  };

  return (
    <div className="disclaimer-container">
      <aside className="disclaimer-sidebar">
        <img
          src={logo}
          alt="QuizSecure Logo"
          className="disclaimer-logo clickable"
          onClick={goHome}
        />
        <h2 className="disclaimer-title">QUIZSECURE</h2>
      </aside>

      <main className="disclaimer-main">
        <div className="disclaimer-card">
          <h1>Disclaimer</h1>

          {/* 📌 Placeholder disclaimer text — replace with real policy */}
          <p className="placeholder-text">
            [Disclaimer message will be placed here. This is placeholder text for now.]
          </p>

          {/* ✅ Acknowledgement Checkbox */}
          <div className="checkbox-section">
            <label>
              <input
                type="checkbox"
                checked={accepted}
                onChange={() => setAccepted(!accepted)}
              />
              I have read and acknowledged the disclaimer.
            </label>
          </div>

          {/* Action Buttons */}
          <div className="button-section">
            <button onClick={handleBack} className="back-btn">
              Back
            </button>
            <button
              onClick={handleAccept}
              className="accept-btn"
              disabled={!accepted}
            >
              Accept
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default DisclaimerPage;
