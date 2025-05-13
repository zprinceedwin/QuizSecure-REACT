const fs = require('fs');
const path = require('path');

// Files that have been moved and can be safely deleted from root
const filesToDelete = [
  'main.js',
  'preload.js',
  'createWindow',
  'screen-security.js',
  'security.js',
  'error-handler.js',
  'url-validator.js'
];

// Files that should be moved to config directory
const filesToMoveToConfig = [
  'eslint.config.js',
  'vite.config.js',
  'vitest.config.js'
];

// Process files
function cleanupRoot() {
  console.log('Starting root directory cleanup...');
  
  // Delete files that have been moved
  filesToDelete.forEach(file => {
    const filePath = path.join(__dirname, '..', file);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
        console.log(`Deleted: ${file}`);
      } catch (err) {
        console.error(`Error deleting ${file}: ${err.message}`);
      }
    } else {
      console.log(`File already removed: ${file}`);
    }
  });
  
  // Move config files to config directory
  const configDir = path.join(__dirname, '..', 'config');
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
    console.log('Created config directory');
  }
  
  filesToMoveToConfig.forEach(file => {
    const sourcePath = path.join(__dirname, '..', file);
    const targetPath = path.join(configDir, file);
    
    if (fs.existsSync(sourcePath)) {
      try {
        // Read source file
        const content = fs.readFileSync(sourcePath, 'utf8');
        
        // Write to target file
        fs.writeFileSync(targetPath, content);
        console.log(`Moved to config: ${file}`);
        
        // Delete the original file
        fs.unlinkSync(sourcePath);
        console.log(`Deleted original: ${file}`);
      } catch (err) {
        console.error(`Error moving ${file} to config: ${err.message}`);
      }
    } else {
      console.log(`Config file not found: ${file}`);
    }
  });
  
  console.log('Root directory cleanup completed!');
}

// Run the cleanup
cleanupRoot(); 