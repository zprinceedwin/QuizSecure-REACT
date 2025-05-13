const fs = require('fs');
const path = require('path');

function listStructure(dir, prefix = '', level = 0, maxDepth = 3) {
  // Stop recursion if we've reached the max depth
  if (level > maxDepth) return [];
  
  let files;
  try {
    files = fs.readdirSync(dir);
  } catch (err) {
    return [];
  }
  
  const dirInfo = [];
  
  // Skip certain directories and files
  const skippedDirs = [
    'node_modules', '.git', '.roo', '.vscode', 'dist', 'dist-electron', 'release', 
    'tasks', 'public'
  ];
  const skippedFiles = [
    '.gitignore', '.roomodes', '.taskmasterconfig', '.windsurfrules', 'package-lock.json'
  ];
  
  files
    .filter(file => !skippedDirs.includes(file))
    .filter(file => {
      const isFile = !fs.statSync(path.join(dir, file)).isDirectory();
      return !isFile || !skippedFiles.includes(file);
    })
    .sort((a, b) => {
      const aIsDir = fs.statSync(path.join(dir, a)).isDirectory();
      const bIsDir = fs.statSync(path.join(dir, b)).isDirectory();
      
      // Sort directories first, then files
      if (aIsDir && !bIsDir) return -1;
      if (!aIsDir && bIsDir) return 1;
      
      // Then alphabetically
      return a.localeCompare(b);
    })
    .forEach(file => {
      const fullPath = path.join(dir, file);
      const isDirectory = fs.statSync(fullPath).isDirectory();
      
      if (isDirectory) {
        dirInfo.push(`${prefix}📁 ${file}/`);
        // Recursively list subdirectories
        const subDirInfo = listStructure(fullPath, prefix + '   ', level + 1, maxDepth);
        dirInfo.push(...subDirInfo);
      } else {
        dirInfo.push(`${prefix}📄 ${file}`);
      }
    });
  
  return dirInfo;
}

// Run the function starting at the project root
const rootDir = path.join(__dirname, '..');
console.log('\nQuizSecure Project Structure:');
console.log('============================');
const structure = listStructure(rootDir);
structure.forEach(line => console.log(line));
console.log('============================\n'); 