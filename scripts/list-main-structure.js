const fs = require('fs');
const path = require('path');

function listMainStructure() {
  const rootDir = path.join(__dirname, '..');
  
  // Top-level directories we want to show
  const mainDirs = [
    { name: 'src', emoji: '📁' },
    { name: 'electron', emoji: '📁' },
    { name: 'config', emoji: '📁' },
    { name: 'scripts', emoji: '📁' },
    { name: 'docs', emoji: '📁' },
    { name: 'assets', emoji: '📁' }
  ];
  
  // First show the main directories
  console.log('\nQuizSecure Project Structure:');
  console.log('============================');
  
  mainDirs.forEach(dir => {
    const dirPath = path.join(rootDir, dir.name);
    if (fs.existsSync(dirPath)) {
      console.log(`📁 ${dir.name}/`);
      
      // Show first-level contents of these directories
      try {
        const subItems = fs.readdirSync(dirPath)
          .sort((a, b) => {
            const aIsDir = fs.statSync(path.join(dirPath, a)).isDirectory();
            const bIsDir = fs.statSync(path.join(dirPath, b)).isDirectory();
            if (aIsDir && !bIsDir) return -1;
            if (!aIsDir && bIsDir) return 1;
            return a.localeCompare(b);
          });
        
        subItems.forEach(subItem => {
          const subPath = path.join(dirPath, subItem);
          const isDir = fs.statSync(subPath).isDirectory();
          
          console.log(`   ${isDir ? '📁' : '📄'} ${subItem}${isDir ? '/' : ''}`);
          
          // For certain directories, also show their contents
          if (isDir && ['components', 'pages'].includes(subItem) && dir.name === 'src') {
            try {
              const componentItems = fs.readdirSync(subPath)
                .sort((a, b) => {
                  const aIsDir = fs.statSync(path.join(subPath, a)).isDirectory();
                  const bIsDir = fs.statSync(path.join(subPath, b)).isDirectory();
                  if (aIsDir && !bIsDir) return -1;
                  if (!aIsDir && bIsDir) return 1;
                  return a.localeCompare(b);
                });
              
              componentItems.forEach(compItem => {
                const compPath = path.join(subPath, compItem);
                const isCompDir = fs.statSync(compPath).isDirectory();
                console.log(`      ${isCompDir ? '📁' : '📄'} ${compItem}${isCompDir ? '/' : ''}`);
              });
            } catch (err) {
              // Skip if there's an error reading the directory
            }
          }
        });
      } catch (err) {
        console.log(`   (Error reading directory: ${err.message})`);
      }
      
      console.log(''); // Empty line for spacing
    }
  });
  
  // List main config files in the root
  console.log('📁 Root Configuration Files:');
  console.log('   📄 package.json');
  console.log('   📄 index.html');
  console.log('   📄 LICENSE.txt');
  console.log('============================');
  
  console.log('\n📖 Documentation Files:');
  console.log('   📄 README.md - Project overview and setup instructions');
  console.log('   📄 docs/PROJECT_STRUCTURE.md - Detailed project structure');
  console.log('   📄 docs/RESTRUCTURING.md - Details about the reorganization');
  console.log('============================\n');
}

// Run the function
listMainStructure(); 