# Project Restructuring

This document outlines the restructuring changes made to the QuizSecure project to improve organization and maintainability.

## Summary of Changes

1. **Electron Code Separation**
   - Created `electron/` directory structure
   - Moved Electron-specific code from root into organized subdirectories:
     - `electron/main/` - Main process code
     - `electron/preload/` - Preload scripts
     - `electron/utils/` - Utility functions

2. **React Component Organization**
   - Organized components by functionality into subdirectories:
     - `components/common/` - General reusable components
     - `components/forms/` - Form components
     - `components/layouts/` - Layout components
     - `components/modals/` - Modal dialog components
     - `components/routing/` - Routing components (like ProtectedRoute)
     - `components/security/` - Security and proctoring components
     - `components/utilities/` - Utility components

3. **Added Structure for Future Development**
   - Created directories for better organization:
     - `src/hooks/` - For custom React hooks
     - `src/contexts/` - For React context providers
     - `src/utils/` - For utility functions
     - `src/assets/` - Better organization of assets

4. **Configuration Files Organization**
   - Created dedicated `config/` directory for configuration files
   - Moved important configuration files:
     - `eslint.config.js` → `config/eslint.config.js`
     - `vite.config.js` → `config/vite.config.js`
     - `vitest.config.js` → `config/vitest.config.js`
   - Updated script references in package.json to use the new paths

5. **Cleanup of Root Directory**
   - Removed duplicate files from the root directory
   - Removed redundant Electron files that were copied to their proper locations
   - Added a cleanup script for maintaining a clean project structure

6. **Updated Configuration**
   - Updated `package.json` to reference new file locations
   - Fixed paths in Electron main process
   - Added a new npm script: `npm run cleanup` to help maintain project organization

7. **Added Documentation**
   - Created `PROJECT_STRUCTURE.md` with detailed structure information
   - Updated `README.md` with new project details
   - Added this `RESTRUCTURING.md` document

## Migration Scripts

Three Node.js scripts were created to facilitate this restructuring:

1. `scripts/reorganize-project.js` - Moved Electron files to their new locations
2. `scripts/reorganize-components.js` - Reorganized React components by type
3. `scripts/cleanup-root.js` - Removed duplicate files and moved configuration files

## Benefits of New Structure

1. **Better Separation of Concerns**
   - Electron and React code are clearly separated
   - Components are grouped by functionality
   - Configuration files have a dedicated location

2. **Improved Maintainability**
   - Easier to find related code
   - Clear organization for new developers
   - Reduced clutter in the root directory

3. **Scalability**
   - Structure supports future growth
   - Easy to add new features without cluttering directories
   - Modular approach to file organization

4. **Better Documentation**
   - Clear project structure documentation
   - Updated README with new project details
   - Project organization logic explained and documented 