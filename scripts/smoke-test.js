const { spawn } = require('child_process');
const path = require('path');

const SMOKE_TEST_TIMEOUT = 15000; // 15 seconds to load
let electronProcess = null;

console.log('Starting smoke test for QuizSecure...');

// Determine the command to run Electron
// This assumes 'electron' is in the PATH (usually via node_modules/.bin)
const electronCommand = process.platform === 'win32' ? 'electron.cmd' : 'electron';

try {
  // Spawn the Electron process
  // The current working directory for the smoke test script will be the project root.
  // 'electron .' should correctly pick up main.js from the project root.
  electronProcess = spawn(electronCommand, ['.'], { stdio: 'inherit', detached: false });

  electronProcess.on('error', (err) => {
    console.error('Smoke Test FAILED: Could not spawn Electron process.', err);
    process.exit(1);
  });

  electronProcess.on('exit', (code, signal) => {
    // This event might fire if the app crashes quickly.
    // We'll primarily rely on the timeout check.
    if (code !== 0 && signal !== 'SIGTERM') { // SIGTERM is how we'll kill it
      console.error(`Smoke Test FAILED: Electron process exited unexpectedly with code ${code}, signal ${signal}`);
      // No process.exit(1) here as the timeout will handle final failure.
    }
  });

  console.log(`Electron process spawned with PID: ${electronProcess.pid}. Waiting ${SMOKE_TEST_TIMEOUT / 1000} seconds for app to load...`);

  // Set a timeout to check if the app is still running
  const timer = setTimeout(() => {
    if (electronProcess && !electronProcess.killed && electronProcess.pid) {
      // Check if the process is still alive (platform-specific check might be more robust, but pid check is a good start)
      try {
        process.kill(electronProcess.pid, 0); // Sending signal 0 tests if process exists
        console.log('Smoke Test PASSED: Electron process is still running.');
        killElectronProcess('SIGTERM'); // Gracefully terminate
        process.exit(0);
      } catch (e) {
        console.error('Smoke Test FAILED: Electron process is no longer running (or signal 0 failed).');
        process.exit(1);
      }
    } else {
      console.error('Smoke Test FAILED: Electron process was not running or not found after timeout.');
      process.exit(1);
    }
  }, SMOKE_TEST_TIMEOUT);

  // Ensure the timer doesn't keep the script alive indefinitely
  timer.unref();

} catch (error) {
  console.error('Smoke Test FAILED: An error occurred during setup.', error);
  killElectronProcess('SIGKILL'); // Force kill if something went very wrong
  process.exit(1);
}

function killElectronProcess(signal = 'SIGTERM') {
  if (electronProcess && !electronProcess.killed) {
    console.log(`Attempting to kill Electron process (PID: ${electronProcess.pid}) with signal ${signal}...`);
    const result = electronProcess.kill(signal);
    if (result) {
      console.log('Electron process signaled for termination.');
    } else {
      console.warn('Failed to signal Electron process for termination (it might have already exited).');
    }
    electronProcess = null;
  }
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('SIGINT received. Cleaning up smoke test...');
  killElectronProcess('SIGTERM');
  process.exit(2);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received. Cleaning up smoke test...');
  killElectronProcess('SIGTERM');
  process.exit(2);
});

process.on('exit', (code) => {
  console.log(`Smoke test script exiting with code ${code}.`);
  killElectronProcess('SIGTERM'); // Final attempt to clean up
}); 