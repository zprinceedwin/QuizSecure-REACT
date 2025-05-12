import { useState, useEffect } from 'react';

/**
 * SecurityTestUI Component
 * 
 * This component provides a UI for testing and demonstrating
 * security features of the QuizSecure application.
 */
function SecurityTestUI() {
  const [tests, setTests] = useState([]);
  const [activeTab, setActiveTab] = useState('securityChecks');
  const [urlToTest, setUrlToTest] = useState('https://example.com');
  const [urlValidationResult, setUrlValidationResult] = useState(null);
  const [screenRecordingStatus, setScreenRecordingStatus] = useState(null);
  const [sessionData, setSessionData] = useState({ 
    timeLeft: 30 * 60, // 30 minutes in seconds
    expired: false 
  });
  const [altTabStatus, setAltTabStatus] = useState(false);
  const [isCheckingRecording, setIsCheckingRecording] = useState(false);

  useEffect(() => {
    // Set up event listeners for security events
    if (window.electron) {
      // Screen recording detection
      const unsubscribeRecording = window.electron.ipc.on('screen:recording-detected', (data) => {
        console.log('Screen recording detected:', data);
        setScreenRecordingStatus(data);
      });

      // Session timeout event
      const unsubscribeSession = window.electron.ipc.on('session:timeout', () => {
        console.log('Session timeout received');
        setSessionData(prev => ({ ...prev, timeLeft: 0, expired: true }));
      });
      
      // Session reset event
      const unsubscribeSessionReset = window.electron.ipc.on('session:reset', () => {
        console.log('Session reset from main process');
        setSessionData({ 
          timeLeft: 30 * 60, // 30 minutes in seconds
          expired: false 
        });
      });
      
      // Alt-Tab toggle event
      const unsubscribeAltTab = window.electron.ipc.on('security:toggle-alt-tab', () => {
        toggleAltTab();
      });
      
      // Screen recording check result event
      const unsubscribeRecordingCheck = window.electron.ipc.on('security:recording-check-result', (result) => {
        console.log('Recording check result:', result);
        setScreenRecordingStatus({
          detected: result.detected,
          timestamp: Date.now(),
          type: 'menu-check'
        });
        
        addTest({
          name: 'Screen Recording Check',
          status: result.detected ? 'warning' : 'success',
          message: result.detected 
            ? 'Screen recording detected from menu check' 
            : 'No screen recording detected from menu check'
        });
      });

      // Clean up subscriptions
      return () => {
        unsubscribeRecording();
        unsubscribeSession();
        unsubscribeSessionReset();
        unsubscribeAltTab();
        unsubscribeRecordingCheck();
      };
    }
  }, []);

  // Set up session timer simulation
  useEffect(() => {
    if (sessionData.expired) return;
    if (sessionData.timeLeft <= 0) {
      // Time has run out - trigger the timeout manually
      console.log('Session timer expired');
      setSessionData(prev => ({ ...prev, expired: true }));
      
      // Show timeout notification
      addTest({
        name: 'Session Timeout',
        status: 'warning',
        message: 'Session has timed out due to inactivity'
      });
      
      return;
    }

    const interval = setInterval(() => {
      setSessionData(prev => ({ 
        ...prev, 
        timeLeft: Math.max(0, prev.timeLeft - 1) 
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, [sessionData.timeLeft, sessionData.expired]);

  // User activity handler (for resetting session timer)
  const handleActivity = () => {
    console.log('User activity recorded, resetting session timer');
    // Reset session timer to 30 minutes
    setSessionData({ 
      timeLeft: 30 * 60, // 30 minutes in seconds
      expired: false 
    });
    
    // Send activity to main process to reset the real timer
    if (window.electron && window.electron.ipc) {
      window.electron.ipc.send('user:activity');
    }
  };

  // Force a timeout (simulate session timeout)
  const forceTimeout = () => {
    console.log('Forcing session timeout');
    setSessionData(prev => ({ ...prev, timeLeft: 0, expired: true }));
    
    addTest({
      name: 'Session Timeout',
      status: 'warning',
      message: 'Session timeout triggered manually'
    });
  };

  // Toggle Alt+Tab prevention
  const toggleAltTab = async () => {
    if (!window.electron || !window.electron.security) {
      alert('Security API not available');
      return;
    }

    try {
      if (altTabStatus) {
        // Allow Alt+Tab
        const result = await window.electron.security.allowAltTab();
        if (result.success) {
          setAltTabStatus(false);
          addTest({
            name: 'Alt+Tab Prevention',
            status: 'success',
            message: 'Alt+Tab is now allowed'
          });
        }
      } else {
        // Prevent Alt+Tab
        const result = await window.electron.security.preventAltTab();
        if (result.success) {
          setAltTabStatus(true);
          addTest({
            name: 'Alt+Tab Prevention',
            status: 'success',
            message: 'Alt+Tab is now prevented'
          });
        }
      }
    } catch (error) {
      addTest({
        name: 'Alt+Tab Prevention',
        status: 'error',
        message: `Failed to toggle Alt+Tab: ${error.message}`
      });
    }
  };

  // Force check for screen recording
  const checkScreenRecording = async () => {
    if (!window.electron || !window.electron.security) {
      alert('Security API not available');
      return;
    }

    setIsCheckingRecording(true);
    try {
      const result = await window.electron.security.forceCheckRecording();
      console.log('Screen recording check result:', result);
      
      if (result.detected) {
        setScreenRecordingStatus({
          detected: true,
          timestamp: Date.now(),
          type: 'manual-check'
        });
        
        addTest({
          name: 'Screen Recording Detection',
          status: 'warning',
          message: 'Screen recording detected through manual check'
        });
      } else {
        setScreenRecordingStatus({
          detected: false,
          timestamp: Date.now(),
          type: 'manual-check'
        });
        
        addTest({
          name: 'Screen Recording Detection',
          status: 'success',
          message: 'No screen recording detected'
        });
      }
    } catch (error) {
      addTest({
        name: 'Screen Recording Detection',
        status: 'error',
        message: `Failed to check for screen recording: ${error.message}`
      });
    } finally {
      setIsCheckingRecording(false);
    }
  };

  // Add a test result
  const addTest = (test) => {
    setTests(prev => [test, ...prev]);
  };

  // Run security checks
  const runSecurityChecks = async () => {
    setTests([]);
    
    // Check if we're in a secure context
    if (window.isSecureContext) {
      addTest({
        name: 'Secure Context',
        status: 'success',
        message: 'Application is running in a secure context'
      });
    } else {
      addTest({
        name: 'Secure Context',
        status: 'error',
        message: 'Application is NOT running in a secure context'
      });
    }
    
    // Check if Electron API is available
    if (window.electron) {
      addTest({
        name: 'Electron API',
        status: 'success',
        message: 'Electron API is properly exposed through preload'
      });
      
      // Check CSP through inline script execution
      try {
        // This should be blocked by CSP if properly configured
        const script = document.createElement('script');
        script.innerHTML = "document.title = 'CSP Bypassed'";
        document.head.appendChild(script);
        
        addTest({
          name: 'Content Security Policy',
          status: 'error',
          message: 'CSP failed: Able to inject inline script'
        });
      } catch (error) {
        addTest({
          name: 'Content Security Policy',
          status: 'success',
          message: 'CSP working: Blocked inline script injection'
        });
      }
    } else {
      addTest({
        name: 'Electron API',
        status: 'error',
        message: 'Electron API is not available, preload not working'
      });
    }
    
    // Test IPC communication
    if (window.electron && window.electron.ipc) {
      try {
        const response = await window.electron.ipc.invoke('ping');
        if (response === 'pong') {
          addTest({
            name: 'IPC Communication',
            status: 'success',
            message: 'IPC communication is working properly'
          });
        } else {
          addTest({
            name: 'IPC Communication',
            status: 'warning',
            message: `IPC responded with unexpected response: ${response}`
          });
        }
      } catch (error) {
        addTest({
          name: 'IPC Communication',
          status: 'error',
          message: `IPC communication failed: ${error.message}`
        });
      }
    }
  };
  
  // Test URL validation
  const testUrlValidation = () => {
    if (!window.electron) {
      setUrlValidationResult({
        status: 'error',
        message: 'Electron API not available'
      });
      return;
    }
    
    // In a real implementation, this would call to the main process
    // For demo purposes, we'll implement basic checks here
    
    try {
      const url = urlToTest.trim();
      
      // Check for dangerous protocols
      if (/^(javascript|data:text\/html|vbscript)/i.test(url)) {
        setUrlValidationResult({
          status: 'error',
          message: 'Potentially malicious URL protocol rejected'
        });
        return;
      }
      
      // Check for HTML injection attempts
      if (/<[a-z]+>/i.test(url)) {
        setUrlValidationResult({
          status: 'warning',
          message: 'URL contains HTML tags that would be sanitized'
        });
        return;
      }
      
      // Try creating a URL object to validate
      new URL(url);
      
      setUrlValidationResult({
        status: 'success',
        message: 'URL is valid and safe'
      });
    } catch (error) {
      setUrlValidationResult({
        status: 'error',
        message: `Invalid URL: ${error.message}`
      });
    }
  };
  
  // Format seconds to MM:SS
  const formatTime = (seconds) => {
    if (seconds === null || seconds === undefined) return '--:--';
    
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="security-test-ui">
      <h2>Security Test Dashboard</h2>
      
      <div className="tabs">
        <button 
          className={activeTab === 'securityChecks' ? 'active' : ''} 
          onClick={() => setActiveTab('securityChecks')}
        >
          Security Checks
        </button>
        <button 
          className={activeTab === 'urlValidation' ? 'active' : ''} 
          onClick={() => setActiveTab('urlValidation')}
        >
          URL Validation
        </button>
        <button 
          className={activeTab === 'sessionInfo' ? 'active' : ''} 
          onClick={() => setActiveTab('sessionInfo')}
        >
          Session Info
        </button>
      </div>
      
      <div className="tab-content">
        {activeTab === 'securityChecks' && (
          <div>
            <h3>Security Features</h3>
            <div className="button-group">
              <button onClick={runSecurityChecks}>Run Security Checks</button>
              <button onClick={checkScreenRecording} disabled={isCheckingRecording}>
                {isCheckingRecording ? 'Checking...' : 'Check Screen Recording'}
              </button>
              <button onClick={toggleAltTab} className={altTabStatus ? 'active' : ''}>
                {altTabStatus ? 'Allow Alt+Tab' : 'Prevent Alt+Tab'}
              </button>
            </div>
            
            <table className="security-tests">
              <thead>
                <tr>
                  <th>Feature</th>
                  <th>Status</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {tests.map((test, index) => (
                  <tr key={index} className={test.status}>
                    <td>{test.name}</td>
                    <td>
                      {test.status === 'success' && '✅ Pass'}
                      {test.status === 'error' && '❌ Fail'}
                      {test.status === 'warning' && '⚠️ Warning'}
                    </td>
                    <td>{test.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            <div className="screen-recording-status">
              <h3>Screen Recording Detection</h3>
              {screenRecordingStatus ? (
                screenRecordingStatus.detected ? (
                  <div className="alert warning">
                    Screen recording detected at {new Date(screenRecordingStatus.timestamp).toLocaleString()}
                  </div>
                ) : (
                  <div className="alert success">
                    No screen recording detected as of {new Date(screenRecordingStatus.timestamp).toLocaleString()}
                  </div>
                )
              ) : (
                <div className="alert info">
                  Screen recording detection status unknown
                </div>
              )}
              <p className="note">
                Note: Start screen recording/sharing to test detection or use the manual check button
              </p>
            </div>
          </div>
        )}
        
        {activeTab === 'urlValidation' && (
          <div>
            <h3>URL Validation Test</h3>
            <p>
              Enter a URL to test the validation logic:
            </p>
            <div className="url-test-form">
              <input 
                type="text" 
                value={urlToTest} 
                onChange={(e) => setUrlToTest(e.target.value)}
                placeholder="Enter URL to test"
              />
              <button onClick={testUrlValidation}>Test URL</button>
            </div>
            
            {urlValidationResult && (
              <div className={`alert ${urlValidationResult.status}`}>
                {urlValidationResult.message}
              </div>
            )}
            
            <div className="url-examples">
              <h4>Test with these examples:</h4>
              <ul>
                <li><code>https://example.com</code> - Regular HTTPS URL (should pass)</li>
                <li><code>javascript:alert('XSS')</code> - JavaScript URL (should be blocked)</li>
                <li><code>data:text/html,&lt;script&gt;alert('XSS')&lt;/script&gt;</code> - Data URL with HTML (should be blocked)</li>
                <li><code>data:image/png;base64,iVBORw0KGgo=</code> - Image data URL (should pass)</li>
                <li><code>https://example.com/&lt;script&gt;alert('XSS')&lt;/script&gt;</code> - URL with HTML injection (should be sanitized)</li>
              </ul>
            </div>
          </div>
        )}
        
        {activeTab === 'sessionInfo' && (
          <div>
            <h3>Session Information</h3>
            
            <div className="session-info">
              <div className="session-timer">
                <h4>Session Timeout:</h4>
                <div className={`timer ${sessionData.expired ? 'expired' : ''}`}>
                  {formatTime(sessionData.timeLeft)}
                </div>
                <p>Your session will expire after 30 minutes of inactivity (shortened for testing)</p>
              </div>
              
              <div className="session-actions">
                <button 
                  onClick={handleActivity}
                  className="reset-button"
                >
                  Reset Timer (simulate activity)
                </button>
                <button 
                  onClick={forceTimeout}
                  className="timeout-button"
                >
                  Force Timeout
                </button>
                <p className="status-indicator">
                  {!sessionData.expired ? (
                    <span className="active">Session active</span>
                  ) : (
                    <span className="expired">Session expired</span>
                  )}
                </p>
              </div>
            </div>
            
            {sessionData.expired && (
              <div className="session-expired-alert">
                <h2>Session Expired</h2>
                <p>Your session has timed out due to inactivity.</p>
                <button onClick={handleActivity}>Renew Session</button>
              </div>
            )}
          </div>
        )}
      </div>
      
      <style jsx>{`
        .security-test-ui {
          padding: 20px;
          max-width: 900px;
          margin: 0 auto;
        }
        
        .tabs {
          display: flex;
          margin-bottom: 20px;
          border-bottom: 1px solid #ddd;
        }
        
        .tabs button {
          padding: 10px 20px;
          border: none;
          background: none;
          cursor: pointer;
          margin-right: 5px;
        }
        
        .tabs button.active {
          border-bottom: 2px solid #0066cc;
          font-weight: bold;
        }
        
        .tab-content {
          padding: 20px;
          border: 1px solid #ddd;
          border-radius: 4px;
        }
        
        .button-group {
          display: flex;
          gap: 10px;
          margin-bottom: 20px;
        }
        
        button {
          padding: 8px 16px;
          background-color: #0066cc;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
        
        button:hover {
          background-color: #0055aa;
        }
        
        button:disabled {
          background-color: #cccccc;
          cursor: not-allowed;
        }
        
        button.active {
          background-color: #cc0000;
        }
        
        .security-tests {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
        }
        
        .security-tests th, .security-tests td {
          padding: 10px;
          border: 1px solid #ddd;
          text-align: left;
        }
        
        .security-tests th {
          background-color: #f8f8f8;
        }
        
        .security-tests tr.success td {
          background-color: #e6ffed;
        }
        
        .security-tests tr.error td {
          background-color: #ffeef0;
        }
        
        .security-tests tr.warning td {
          background-color: #fff9e6;
        }
        
        .alert {
          padding: 15px;
          border-radius: 4px;
          margin: 10px 0;
        }
        
        .alert.success {
          background-color: #e6ffed;
          border: 1px solid #34d058;
        }
        
        .alert.error {
          background-color: #ffeef0;
          border: 1px solid #ff4d4f;
        }
        
        .alert.warning {
          background-color: #fff9e6;
          border: 1px solid #ffc53d;
        }
        
        .alert.info {
          background-color: #f6f8fa;
          border: 1px solid #bedcf7;
        }
        
        .url-test-form {
          display: flex;
          margin: 15px 0;
        }
        
        .url-test-form input {
          flex: 1;
          padding: 8px;
          border: 1px solid #ddd;
          border-radius: 4px 0 0 4px;
        }
        
        .url-test-form button {
          border-radius: 0 4px 4px 0;
        }
        
        .url-examples {
          background-color: #f8f8f8;
          padding: 15px;
          border-radius: 4px;
          margin-top: 20px;
        }
        
        .url-examples code {
          background-color: #e0e0e0;
          padding: 2px 4px;
          border-radius: 3px;
        }
        
        .session-info {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          background-color: #f8f8f8;
          padding: 20px;
          border-radius: 4px;
        }
        
        .timer {
          font-size: 42px;
          font-weight: bold;
          color: #0066cc;
          margin: 10px 0;
        }
        
        .timer.expired {
          color: #cc0000;
        }
        
        .reset-button {
          background-color: #28a745;
          margin-bottom: 10px;
        }
        
        .reset-button:hover {
          background-color: #218838;
        }
        
        .timeout-button {
          background-color: #dc3545;
          margin-bottom: 10px;
        }
        
        .timeout-button:hover {
          background-color: #c82333;
        }
        
        .status-indicator {
          margin-top: 10px;
          text-align: center;
        }
        
        .status-indicator .active {
          color: #28a745;
          font-weight: bold;
        }
        
        .status-indicator .expired {
          color: #dc3545;
          font-weight: bold;
        }
        
        .note {
          color: #666;
          font-style: italic;
          margin-top: 5px;
        }
        
        .session-expired-alert {
          margin-top: 20px;
          padding: 20px;
          background-color: #ffeef0;
          border: 1px solid #dc3545;
          border-radius: 4px;
          text-align: center;
        }
        
        .session-expired-alert h2 {
          color: #dc3545;
          margin-top: 0;
        }
        
        .session-expired-alert button {
          background-color: #28a745;
          margin-top: 10px;
        }
      `}</style>
    </div>
  );
}

export default SecurityTestUI; 