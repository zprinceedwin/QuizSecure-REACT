# QuizSecure Project Structure

This document outlines the organization of the QuizSecure application codebase.

## Directory Structure

```
QuizSecure-REACT/
├── assets/                 # Static assets like icons and images
├── config/                 # Configuration files
│   ├── eslint.config.js    # ESLint configuration
│   ├── vite.config.js      # Vite build configuration
│   └── vitest.config.js    # Vitest testing configuration
├── dist/                   # Build output for web
├── docs/                   # Documentation files
├── electron/               # Electron-specific code
│   ├── main/               # Main process code
│   ├── preload/            # Preload scripts for secure IPC
│   └── utils/              # Utility functions for Electron
├── public/                 # Public assets for the web
├── scripts/                # Build and utility scripts
├── src/                    # React application source code
│   ├── assets/             # Frontend assets (styles, images, icons)
│   ├── components/         # React components organized by type
│   │   ├── common/         # Reusable common components
│   │   ├── forms/          # Form-related components
│   │   ├── layouts/        # Layout components
│   │   ├── modals/         # Modal dialog components
│   │   ├── registration/   # User registration components
│   │   ├── routing/        # Routing-related components
│   │   ├── security/       # Security & proctoring components
│   │   └── utilities/      # Utility components
│   ├── contexts/           # React contexts for state management
│   ├── hooks/              # Custom React hooks
│   ├── pages/              # Page components
│   │   ├── login/          # Login page 
│   │   ├── student/        # Student pages
│   │   └── teacher/        # Teacher pages
│   ├── services/           # API services and business logic
│   ├── tests/              # Test files
│   └── utils/              # Utility functions
└── tasks/                  # Task management files
```

## Key Directories

### Configuration (config)

The `config/` directory contains all configuration files for the project:

- `eslint.config.js` - ESLint configuration for code linting
- `vite.config.js` - Configuration for Vite build tool
- `vitest.config.js` - Configuration for Vitest testing framework

### Electron

The `electron/` directory contains all code specific to the Electron desktop application:

- `main/` - Contains the main process code that initializes the application window
- `preload/` - Contains preload scripts that securely expose APIs to the renderer process
- `utils/` - Contains utility functions for security, screen monitoring, and error handling

### Source Code (src)

The `src/` directory follows a feature-based and type-based organization:

- `components/` - Reusable React components organized by type
- `pages/` - Full page components organized by user role
- `contexts/` - React context providers for state management
- `hooks/` - Custom React hooks for shared behavior
- `services/` - API services and business logic
- `utils/` - Utility functions for the frontend

### Components Organization

Components are organized by their function:

- `common/` - General-purpose reusable components
- `forms/` - Form components and form-related elements
- `layouts/` - Layout components like headers, footers, and page templates
- `modals/` - Modal dialog components
- `registration/` - Components specific to user registration
- `routing/` - Components related to route protection and navigation
- `security/` - Components related to proctoring and security
- `utilities/` - Utility components like demos and debug tools

## Best Practices

When adding new files to the project:

1. Place files in the appropriate directory based on their function
2. Keep components focused on a single responsibility
3. For new features:
   - Create dedicated directories within `/pages` for major features
   - Place shared components in the appropriate directory under `/components`
   - Use contexts for state that needs to be shared across components
   - Implement business logic in services
4. For configuration:
   - Place all configuration files in the `/config` directory
   - Update package.json scripts to reference these files 