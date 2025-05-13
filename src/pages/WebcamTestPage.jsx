import React from 'react';
import WebcamTest from '../components/common/WebcamTest';
import '../assets/styles/webcam-test.css';

/**
 * WebcamTestPage
 * 
 * A simple page that demonstrates the webcam permission handling
 * and device selection functionality.
 */
const WebcamTestPage = () => {
  return (
    <div className="webcam-test-page">
      <div className="container">
        <div className="header">
          <h1>Webcam Permission & Test</h1>
          <p>
            This page demonstrates the webcam permission handling and device selection
            functionality, which is a core component of the proctoring system.
          </p>
        </div>
        
        <div className="content">
          <WebcamTest />
        </div>
        
        <div className="footer">
          <p>
            <strong>Note:</strong> In a production environment, this would be integrated
            directly into the proctoring workflow. This is a standalone test page for
            demonstration purposes.
          </p>
        </div>
      </div>
    </div>
  );
};

export default WebcamTestPage; 