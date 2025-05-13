const fs = require('fs');
const path = require('path');

// Define component categorization
const categorizeComponents = {
  // Common UI components
  'common': [],
  
  // Security related components
  'security': ['SecurityTestUI.jsx'],
  
  // Route protection 
  'routing': ['ProtectedRoute.jsx', 'ProtectedRoute.css'],
  
  // Form components
  'forms': [],
  
  // Layout components
  'layouts': [],
  
  // Modal components
  'modals': [],

  // IPC Demo - utility
  'utilities': ['IPCDemo.jsx'],
};

// Process components
async function reorganizeComponents() {
  const componentsDir = path.join(__dirname, '../src/components');
  
  try {
    // Get all files in the components directory
    const files = fs.readdirSync(componentsDir);
    
    // Create category directories if they don't exist
    Object.keys(categorizeComponents).forEach(category => {
      const categoryDir = path.join(componentsDir, category);
      if (!fs.existsSync(categoryDir)) {
        fs.mkdirSync(categoryDir, { recursive: true });
        console.log(`Created directory: ${categoryDir}`);
      }
    });
    
    // Move files to appropriate categories
    for (const file of files) {
      const filePath = path.join(componentsDir, file);
      
      // Skip directories except for special processing
      if (fs.statSync(filePath).isDirectory()) {
        continue;
      }
      
      // Find which category this file belongs to
      let targetCategory = null;
      Object.entries(categorizeComponents).forEach(([category, fileList]) => {
        if (fileList.includes(file)) {
          targetCategory = category;
        }
      });
      
      // If no explicit category, determine based on naming conventions
      if (!targetCategory) {
        if (file.includes('Form')) {
          targetCategory = 'forms';
          categorizeComponents.forms.push(file);
        } else if (file.includes('Modal')) {
          targetCategory = 'modals';
          categorizeComponents.modals.push(file);
        } else if (file.includes('Layout')) {
          targetCategory = 'layouts';
          categorizeComponents.layouts.push(file);
        } else if (file.includes('Security') || file.includes('Proctor')) {
          targetCategory = 'security';
          categorizeComponents.security.push(file);
        } else {
          targetCategory = 'common';
          categorizeComponents.common.push(file);
        }
      }
      
      // Move the file to its category directory
      const sourcePath = path.join(componentsDir, file);
      const targetPath = path.join(componentsDir, targetCategory, file);
      
      try {
        fs.copyFileSync(sourcePath, targetPath);
        console.log(`Copied ${file} to ${targetCategory}/${file}`);
        
        // Delete the original file after copying
        fs.unlinkSync(sourcePath);
        console.log(`Deleted original file: ${file}`);
      } catch (err) {
        console.error(`Error processing file ${file}: ${err.message}`);
      }
    }
    
    console.log('Component reorganization completed!');
  } catch (err) {
    console.error(`Error in reorganizing components: ${err.message}`);
  }
}

// Run the reorganization
reorganizeComponents(); 