import SecurityTestUI from '../components/security/SecurityTestUI';
import { Link } from 'react-router-dom';

/**
 * Security Test Page Component
 * 
 * This is a standalone page for testing security features.
 * For production, this should be accessible only in development mode or behind authentication.
 */
function SecurityTest() {
  return (
    <div className="security-test-page">
      <header>
        <h1>QuizSecure - Security Test Page</h1>
        <p className="warning">
          This page is for testing security features and should not be accessible in production.
        </p>
      </header>
      
      <main>
        <SecurityTestUI />
        
        {/* Testing Links */}
        <div className="testing-links">
          <h3>Additional Test Pages:</h3>
          <Link to="/webcam-test">Webcam Test Page</Link>
          <Link to="/face-detection-benchmark">Face Detection Benchmark (No Auth)</Link>
        </div>
        
        <div className="testing-description">
          <h3>About Face Detection Benchmark</h3>
          <p>
            The Face Detection Benchmark tool helps measure and optimize the performance of the face detection system.
            It provides statistics like FPS, detection rate, and processing times to ensure optimal configuration.
          </p>
          <p>
            <strong>When clicking "Start Benchmark":</strong> Allow camera access and click the debug toggle to troubleshoot if needed.
          </p>
        </div>
      </main>
      
      <footer>
        <p>
          See <a 
            href="#" 
            onClick={e => {
              e.preventDefault();
              if (window.electron) {
                // Try to open the file - this should be blocked by security
                window.electron.ipc.invoke('dialog:open', {
                  title: 'Open Security Testing Guide',
                  defaultPath: 'docs/SECURITY_TESTING.md',
                  properties: ['openFile']
                });
              }
            }}
          >
            docs/SECURITY_TESTING.md
          </a> for testing instructions
        </p>
      </footer>
      
      <style jsx>{`
        .security-test-page {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
          padding: 0;
          margin: 0;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }
        
        header {
          background-color: #f5f5f5;
          padding: 20px;
          border-bottom: 1px solid #ddd;
          text-align: center;
        }
        
        h1 {
          margin: 0;
          color: #333;
        }
        
        .warning {
          color: #e53935;
          font-weight: bold;
          margin: 10px 0 0;
        }
        
        main {
          flex: 1;
          padding: 20px;
        }
        
        .testing-links {
          margin-top: 30px;
          padding: 15px;
          background-color: #f8f9fa;
          border-radius: 5px;
          border: 1px solid #ddd;
        }
        
        .testing-links h3 {
          margin-top: 0;
          color: #333;
        }
        
        .testing-links a {
          display: inline-block;
          margin: 5px 10px 5px 0;
          padding: 8px 15px;
          background-color: #007bff;
          color: white;
          text-decoration: none;
          border-radius: 4px;
          font-weight: 500;
        }
        
        .testing-links a:hover {
          background-color: #0069d9;
        }
        
        .testing-description {
          margin-top: 20px;
          padding: 15px;
          background-color: #e8f4fd;
          border-radius: 5px;
          border: 1px solid #b3d7ff;
        }
        
        .testing-description h3 {
          margin-top: 0;
          color: #0056b3;
        }
        
        footer {
          background-color: #f5f5f5;
          padding: 15px;
          text-align: center;
          border-top: 1px solid #ddd;
        }
        
        footer a {
          color: #0066cc;
          text-decoration: none;
        }
        
        footer a:hover {
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}

export default SecurityTest; 