# Authentication System Documentation

## Overview

The QuizSecure authentication system provides secure user authentication for the Electron application. This document outlines the simplified authentication implementation used in the prototype.

## Architecture

The authentication system follows a layered architecture:

1. **UI Layer**: Login and registration components in React
2. **State Management**: React Context-based auth state management
3. **Service Layer**: Authentication service for token management and API calls
4. **Storage Layer**: Secure token storage using Electron's capabilities
5. **Main Process**: Secure token handling in the Electron main process

## Core Components

### AuthContext (src/services/authContext.jsx)

The central state management component using React Context API:

- Provides authentication state to the entire application
- Manages login/logout functionality
- Handles session persistence
- Provides role-based access control

Usage:
```jsx
import { useAuth } from '../../services/authContext';

function MyComponent() {
  const { isAuthenticated, role, login, logout } = useAuth();
  
  // Use authentication state and methods
}
```

### ProtectedRoute (src/components/routing/ProtectedRoute.jsx)

Implements route protection for authenticated areas:

- Redirects unauthenticated users to login
- Supports role-based access control
- Provides loading states during authentication checks

Usage:
```jsx
<Route 
  path="/student" 
  element={
    <ProtectedRoute requiredRoles="student">
      <StudentDashboard />
    </ProtectedRoute>
  } 
/>
```

### AuthService (src/services/authService.js)

Handles authentication operations:

- Login, logout, and token management
- Secure storage of authentication tokens
- Communication with the backend API
- Session persistence

### Security Considerations

The prototype implementation includes:

- Secure token storage in the Electron main process
- Session timeout handling
- Activity tracking to prevent premature session expiration
- Role-based access control

## User Flows

### Login Flow

1. User enters credentials on the login page
2. Credentials are validated
3. On success:
   - Auth token is securely stored
   - User role is determined
   - Authentication state is updated
   - User is redirected to the appropriate dashboard

### Logout Flow

1. User triggers logout (via UI)
2. Authentication service clears tokens
3. Authentication state is reset
4. User is redirected to the login page

## Implementation Decisions

For this prototype, several implementation decisions were made:

1. **Simplified Token Handling**: Basic token management without complex refresh mechanisms
2. **Role-Based Routing**: Simple role-based routing (student/teacher) for prototype demonstration
3. **Electron-Specific Security**: Utilizing Electron's main process for sensitive data storage
4. **Minimal Error Handling**: Basic error handling focused on critical paths

## Deferred Features

The following features were intentionally deferred for the prototype:

1. Advanced token refresh mechanisms
2. Comprehensive session timeout handling
3. Remember-me functionality with extended token lifetimes
4. Comprehensive error handling for all edge cases
5. Offline authentication capabilities

## Testing

To test the authentication system:

1. Attempt login with valid credentials
2. Verify redirect to appropriate dashboard based on role
3. Try accessing protected routes without authentication
4. Test logout functionality
5. Verify proper redirection after session timeout 