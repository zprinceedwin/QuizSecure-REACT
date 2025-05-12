// src/pages/student/FaceScanPage.jsx

import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaceMesh } from "@mediapipe/face_mesh";
import { Camera } from "@mediapipe/camera_utils";
import logo from "../../assets/quizsecure-logo.png";
import "./facescan.css";

function FaceScanPage() {
  const [faceDetected, setFaceDetected] = useState(false);
  const videoRef = useRef(null);
  const cameraRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    // ✅ Initialize FaceMesh from MediaPipe
    const faceMesh = new FaceMesh({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
    });

    faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.6,
      minTrackingConfidence: 0.6,
    });

    // 🔍 Detect face presence
    faceMesh.onResults((results) => {
      if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
        setFaceDetected(true);
      } else {
        setFaceDetected(false);
      }
    });

    // 🎥 Initialize webcam stream using MediaPipe camera util
    if (videoRef.current) {
      const camera = new Camera(videoRef.current, {
        onFrame: async () => {
          await faceMesh.send({ image: videoRef.current });
        },
        width: 640,
        height: 480,
      });

      camera.start();
      cameraRef.current = camera;
    }

    // 🧹 Cleanup on component unmount
    return () => {
      // Stop camera if still running
      if (cameraRef.current) {
        cameraRef.current.stop();
      }

      // Stop video tracks manually
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach((track) => {
          track.stop();
        });
        videoRef.current.srcObject = null;
        videoRef.current.removeAttribute("src");
        videoRef.current.load();
      }

      // Remove injected global canvas (prevent camera overlay bugs)
      const canvasElements = document.querySelectorAll("canvas");
      canvasElements.forEach((c) => {
        if (c && c.parentNode === document.body) {
          document.body.removeChild(c);
        }
      });
    };
  }, []);

  return (
    <div className="facescan-container">
      {/* Sidebar */}
      <aside className="facescan-sidebar">
        <img
          src={logo}
          alt="QuizSecure Logo"
          className="facescan-logo"
          onClick={() => navigate("/")}
        />
        <h2 className="facescan-title">QUIZSECURE</h2>
      </aside>

      {/* Main Content */}
      <main className="facescan-main">
        {/* 📷 Camera Box */}
        <div className="camera-card">
          <video ref={videoRef} className="webcam-feed" autoPlay muted />
        </div>

        {/* ✅ Detection Status and Controls */}
        <div className="function-card">
          <p className={`detection-status ${faceDetected ? "valid" : "invalid"}`}>
            {faceDetected ? "Face Detected" : "Face Not Detected"}
          </p>
          <div className="button-section">
            <button onClick={() => navigate("/disclaimer")} className="back-btn">
              Back
            </button>
            <button
              onClick={() => navigate("/quiz")}
              className="proceed-btn"
              disabled={!faceDetected}
            >
              Proceed to Quiz
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default FaceScanPage;
