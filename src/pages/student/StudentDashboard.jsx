import React, { useState, useRef, useEffect } from "react";
import "./dashboard.css";
import logo from "../../assets/quizsecure-logo.png";

function StudentDashboard() {
  const [quizData, setQuizData] = useState(null);
  const [codeInput, setCodeInput] = useState("");
  const [message, setMessage] = useState("");
  const [username, setUsername] = useState("Student"); // Placeholder
  const topRef = useRef(null);
  const redeemSectionRef = useRef(null);

  useEffect(() => {
    // Placeholder for future user storage system (e.g., localStorage, session, backend context)
    const storedUsername = localStorage.getItem("username"); // to be updated later
    if (storedUsername) {
      setUsername(storedUsername);
    }
  }, []);

  const handleRedeem = () => {
    if (codeInput === "12345") {
      setQuizData({
        title: "Sample Quiz",
        startTime: "10:00 AM",
        endTime: "11:00 AM",
      });
      setMessage("");
    } else {
      setMessage("Invalid or already used code.");
      setQuizData(null);
    }
  };

  const scrollToRedeem = () => {
    if (redeemSectionRef.current) {
      redeemSectionRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  const scrollToTop = () => {
    if (topRef.current) {
      topRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="dashboard-container">
      <aside className="sidebar">
        <img
          src={logo}
          alt="QuizSecure Logo"
          className="sidebar-logo"
          onClick={scrollToTop}
          style={{ cursor: "pointer" }}
        />
        <h2 className="logo-text">QUIZSECURE</h2>
        <p className="student-name">{username}</p>

        <nav>
          <ul>
            <li><button onClick={scrollToRedeem}>Redeem Code</button></li>
            <li><button>Sign Out</button></li>
          </ul>
        </nav>
      </aside>

      <main className="main-content" ref={topRef}>
        <h1>Welcome to QuizSecure</h1>
        <p className="brand-identity">
          Empowering secure, real-time exam monitoring for a trusted academic environment.
        </p>

        <div ref={redeemSectionRef} className="redeem-box">
          <h2 className="redeem-title">Enter Redeem Code</h2>
          <input
            type="text"
            placeholder="Enter Code Here"
            value={codeInput}
            onChange={(e) => setCodeInput(e.target.value)}
          />
          <button onClick={handleRedeem}>Submit</button>
          {message && <p className="message">{message}</p>}
        </div>

        {quizData && (
          <div className="quiz-card">
            <p className="quiz-title">📌 <strong>{quizData.title}</strong></p>
            <p>Start: {quizData.startTime} | End: {quizData.endTime}</p>
            <button className="join-btn">Join Now</button>
          </div>
        )}
      </main>
    </div>
  );
}

export default StudentDashboard;
