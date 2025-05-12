import { useState, useEffect } from 'react';

// Component to demonstrate IPC communication between renderer and main processes
export default function IPCDemo() {
  const [pingResult, setPingResult] = useState('');
  const [deviceList, setDeviceList] = useState([]);
  const [deviceError, setDeviceError] = useState(null);
  const [loginStatus, setLoginStatus] = useState(null);
  const [webcamStatus, setWebcamStatus] = useState(null);
  
  // Test basic IPC invoke (ping-pong)
  const testPing = async () => {
    try {
      // For security reasons, all electron IPC is accessed through the electron context bridge
      // This is a simple test to ensure IPC is working
      const result = await window.electron.ipc.invoke('ping');
      setPingResult(result);
    } catch (error) {
      setPingResult(`Error: ${error.message}`);
    }
  };
  
  // Test window control functions
  const closeApp = () => window.electron.ipc.send('app:close');
  const minimizeApp = () => window.electron.ipc.send('app:minimize');
  const maximizeApp = () => window.electron.ipc.send('app:maximize');
  
  // Get webcam devices (demonstrates more complex IPC)
  const getWebcamDevices = async () => {
    try {
      setDeviceError(null);
      const result = await window.electron.ipc.invoke('webcam:getDevices');
      
      if (result.error) {
        setDeviceError(result.error);
        return;
      }
      
      setDeviceList(result.devices || []);
    } catch (error) {
      setDeviceError(error.message);
    }
  };
  
  // Test login functionality
  const testLogin = async () => {
    try {
      const result = await window.electron.ipc.invoke('auth:login', {
        username: 'student',
        password: 'password123'
      });
      
      setLoginStatus(result);
    } catch (error) {
      setLoginStatus({ success: false, error: error.message });
    }
  };
  
  // Set up listener for main process messages
  useEffect(() => {
    // Listen for webcam status updates from main process
    const unsubscribe = window.electron.ipc.on('webcam:status', (status) => {
      setWebcamStatus(status);
    });
    
    // Cleanup listener when component unmounts
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);
  
  return (
    <div className="ipc-demo" style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h2>Electron IPC Demo</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <h3>System Information</h3>
        <p>Current Platform: {window.electron.system.getPlatform()}</p>
      </div>
      
      <div style={{ marginBottom: '20px' }}>
        <h3>Basic IPC Test (Ping)</h3>
        <button onClick={testPing}>Test Ping</button>
        {pingResult && <p>Result: {pingResult}</p>}
      </div>
      
      <div style={{ marginBottom: '20px' }}>
        <h3>Window Controls</h3>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={minimizeApp}>Minimize</button>
          <button onClick={maximizeApp}>Maximize/Restore</button>
          <button onClick={closeApp}>Close</button>
        </div>
      </div>
      
      <div style={{ marginBottom: '20px' }}>
        <h3>Webcam Devices</h3>
        <button onClick={getWebcamDevices}>Get Webcam Devices</button>
        
        {deviceError && <p style={{ color: 'red' }}>Error: {deviceError}</p>}
        
        {deviceList.length > 0 && (
          <ul>
            {deviceList.map(device => (
              <li key={device.deviceId}>
                {device.label} (ID: {device.deviceId})
              </li>
            ))}
          </ul>
        )}
      </div>
      
      <div style={{ marginBottom: '20px' }}>
        <h3>Authentication Test</h3>
        <button onClick={testLogin}>Test Login</button>
        
        {loginStatus && (
          <div style={{ marginTop: '10px' }}>
            <p>Success: {loginStatus.success ? 'Yes' : 'No'}</p>
            {loginStatus.success ? (
              <p>User: {loginStatus.userData.username} (Role: {loginStatus.userData.role})</p>
            ) : (
              <p style={{ color: 'red' }}>Error: {loginStatus.error}</p>
            )}
          </div>
        )}
      </div>
      
      <div>
        <h3>Main Process Messages</h3>
        <p>Webcam Status: {webcamStatus ? JSON.stringify(webcamStatus) : 'No updates yet'}</p>
      </div>
    </div>
  );
} 