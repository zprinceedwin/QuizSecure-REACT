import SecurityTestUI from '../components/SecurityTestUI';

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