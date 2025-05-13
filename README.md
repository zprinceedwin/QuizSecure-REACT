# QuizSecure

A secure proctoring system for online exams, built with React and Electron.

## Project Overview

QuizSecure is a thesis project prototype that provides:

- Secure exam environment for students
- Proctoring features to prevent cheating
- Teacher interface for exam management
- Cross-platform desktop application using Electron

## Project Structure

The project has been organized following best practices:

- `electron/` - Electron-specific code for the desktop application
- `src/` - React application source code
- `assets/` - Static assets like icons and images
- `docs/` - Documentation files

For a detailed breakdown of the project structure, see [PROJECT_STRUCTURE.md](docs/PROJECT_STRUCTURE.md).

## Development

### Prerequisites

- Node.js (v14+)
- npm (v6+)

### Setup

```bash
# Install dependencies
npm install

# Start development server with Electron
npm run electron:dev
```

### Build

```bash
# Build for Windows
npm run electron:build:win

# Build for macOS
npm run electron:build:mac

# Build for Linux
npm run electron:build:linux

# Build for all platforms
npm run electron:build:all
```

## Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## Platform Compatibility (Prototype)

This QuizSecure Electron application is a prototype developed for thesis purposes. 

- **Primary Development OS:** Windows
- **Testing:** Primarily tested on Windows.

While Electron is a cross-platform framework, comprehensive testing, specific optimizations, and verification of all features on macOS and Linux have not been performed for this prototype stage. Functionality on these platforms is not guaranteed.
