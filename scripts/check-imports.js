const fs = require('fs');
const path = require('path');

// Old to new path mapping to help detect potentially broken imports
const relocatedFiles = {
  // Components relocated to subdirectories
  'components/IPCDemo.jsx': 'components/utilities/IPCDemo.jsx',
  'components/ProtectedRoute.jsx': 'components/routing/ProtectedRoute.jsx',
  'components/ProtectedRoute.css': 'components/routing/ProtectedRoute.css',
  'components/SecurityTestUI.jsx': 'components/security/SecurityTestUI.jsx',
  
  // Electron files relocated
  'main.js': 'electron/main/index.js',
  'preload.js': 'electron/preload/index.js',
  'security.js': 'electron/utils/security.js',
  'screen-security.js': 'electron/utils/screen-security.js',
  'error-handler.js': 'electron/utils/error-handler.js',
  'url-validator.js': 'electron/utils/url-validator.js',
  'createWindow': 'electron/utils/createWindow.js'
};

// Directories to scan for imports
const dirsToScan = [
  'src/components',
  'src/pages',
  'src/services',
  'electron'
];

// Find potential broken imports
function checkImports(baseDir) {
  const projectRoot = path.join(__dirname, '..');
  let potentialIssues = 0;
  
  console.log('Checking for potentially broken imports...\n');
  
  dirsToScan.forEach(dir => {
    const dirPath = path.join(projectRoot, dir);
    if (!fs.existsSync(dirPath)) {
      console.log(`Directory does not exist: ${dir}`);
      return;
    }
    
    // Walk through directory recursively
    walkDir(dirPath, projectRoot);
  });
  
  console.log(`\nCheck complete. Found ${potentialIssues} potential issues.`);
  
  function walkDir(dirPath, projectRoot) {
    const files = fs.readdirSync(dirPath);
    
    files.forEach(file => {
      const filePath = path.join(dirPath, file);
      const stats = fs.statSync(filePath);
      
      if (stats.isDirectory()) {
        // Recursively scan subdirectories
        walkDir(filePath, projectRoot);
      } else if (stats.isFile() && (file.endsWith('.js') || file.endsWith('.jsx'))) {
        // Check JS and JSX files for imports
        checkFileImports(filePath, projectRoot);
      }
    });
  }
  
  function checkFileImports(filePath, projectRoot) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const relativeFilePath = path.relative(projectRoot, filePath);
      
      // Get import statements
      const importMatches = content.match(/import .+ from ['"]([^'"]+)['"]/g) || [];
      
      importMatches.forEach(importStatement => {
        const importPath = importStatement.match(/from ['"]([^'"]+)['"]/)[1];
        
        // Skip node_modules and absolute imports
        if (importPath.startsWith('.')) {
          const currentDir = path.dirname(filePath);
          let resolvedImportPath;
          
          try {
            resolvedImportPath = path.resolve(currentDir, importPath);
            
            // Check if it's a directory import (might be importing index.js)
            if (!resolvedImportPath.includes('.')) {
              resolvedImportPath += '.js';
            }
            
            // Handle .jsx extension if not explicitly stated
            if (!fs.existsSync(resolvedImportPath) && 
                !fs.existsSync(resolvedImportPath + '.js') && 
                !fs.existsSync(resolvedImportPath + '.jsx')) {
              
              // Report potential issue
              console.log(`• File: ${relativeFilePath}`);
              console.log(`  Import: ${importStatement}`);
              console.log(`  Path may be broken due to file reorganization`);
              console.log('');
              potentialIssues++;
            }
          } catch (err) {
            // Skip errors in path resolution
          }
        }
      });
    } catch (err) {
      console.error(`Error reading file ${filePath}: ${err.message}`);
    }
  }
}

// Run the import checker
checkImports(); 