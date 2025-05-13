const fs = require('fs');
const path = require('path');

// Define the directories to create
const dirsToCreate = [
  'electron/main',
  'electron/preload',
  'electron/utils',
  'src/layouts',
  'src/hooks',
  'src/utils',
  'src/contexts',
  'src/components/common',
  'src/components/forms',
  'src/components/ui',
  'src/components/modals',
  'src/components/security',
  'src/assets/styles',
  'src/assets/images',
  'src/assets/icons',
  'config'
];

// Define files to move
const filesToMove = [
  { from: 'main.js', to: 'electron/main/index.js' },
  { from: 'preload.js', to: 'electron/preload/index.js' },
  { from: 'screen-security.js', to: 'electron/utils/screen-security.js' },
  { from: 'security.js', to: 'electron/utils/security.js' },
  { from: 'error-handler.js', to: 'electron/utils/error-handler.js' },
  { from: 'url-validator.js', to: 'electron/utils/url-validator.js' },
  { from: 'createWindow', to: 'electron/utils/createWindow.js' },
];

// Create directories
dirsToCreate.forEach(dir => {
  const dirPath = path.join(__dirname, '..', dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`Created directory: ${dir}`);
  }
});

// Move files
filesToMove.forEach(file => {
  const sourcePath = path.join(__dirname, '..', file.from);
  const targetPath = path.join(__dirname, '..', file.to);
  
  if (fs.existsSync(sourcePath)) {
    // Create target directory if it doesn't exist
    const targetDir = path.dirname(targetPath);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    
    // Read source file
    const content = fs.readFileSync(sourcePath, 'utf8');
    
    // Write to target file
    fs.writeFileSync(targetPath, content);
    
    console.log(`Moved: ${file.from} -> ${file.to}`);
  } else {
    console.log(`Source file does not exist: ${file.from}`);
  }
});

console.log('Project reorganization completed!'); 