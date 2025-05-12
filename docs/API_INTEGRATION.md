# API Integration Documentation

## Overview

This document provides comprehensive guidance on how to use the API integration layer implemented in QuizSecure. The API layer is designed with the following key features:

- **Authentication-aware requests**: All API requests automatically include authentication tokens when available
- **Offline Support**: Seamless handling of offline scenarios with data caching and operation queueing
- **Error Handling**: Consistent error handling patterns across the application
- **Data Transformation**: Utilities to transform data between API and application formats

## Core API Client

The core API functionality is implemented in `src/services/apiClient.js`, which provides a wrapper around the Fetch API with additional features:

### Basic Usage

```javascript
import { apiClient } from './services/apiClient';

// GET request with optional caching for offline support
const data = await apiClient.get('/endpoint', {}, 'optional_cache_key');

// POST request with automatic offline queueing
const result = await apiClient.post('/endpoint', { key: 'value' });

// PUT request
const updateResult = await apiClient.put('/endpoint/123', { key: 'updated_value' });

// DELETE request
const deleteResult = await apiClient.del('/endpoint/123');
```

### Method Reference

#### GET Requests

```javascript
apiClient.get(endpoint, options = {}, cacheKey = null)
```

- `endpoint`: API endpoint path (e.g., '/users')
- `options`: Optional fetch configuration options
- `cacheKey`: Optional string key for caching the response (for offline support)
- Returns: Promise resolving to the JSON response

The GET method automatically:
1. Adds authentication headers if a token is available
2. Handles offline scenarios by returning cached data when available
3. Caches successful responses for future offline use when a cacheKey is provided

#### POST Requests

```javascript
apiClient.post(endpoint, body, options = {})
```

- `endpoint`: API endpoint path
- `body`: Request payload object (will be JSON stringified)
- `options`: Optional fetch configuration options
- Returns: Promise resolving to the JSON response or a status object for offline scenarios

The POST method automatically:
1. Adds authentication headers if a token is available
2. Queues operations for later execution when offline
3. Returns a standardized response object indicating queued status in offline mode

#### PUT Requests

```javascript
apiClient.put(endpoint, body, options = {})
```

- `endpoint`: API endpoint path
- `body`: Request payload object (will be JSON stringified)
- `options`: Optional fetch configuration options
- Returns: Promise resolving to the JSON response or a status object for offline scenarios

The PUT method provides the same automatic features as POST.

#### DELETE Requests

```javascript
apiClient.del(endpoint, options = {})
```

- `endpoint`: API endpoint path
- `options`: Optional fetch configuration options
- Returns: Promise resolving to the JSON response or a status object for offline scenarios

The DELETE method (named `del` to avoid JavaScript keyword conflict) provides the same automatic features as POST and PUT.

#### Synchronize Operation

```javascript
apiClient.synchronize()
```

- Returns: Promise that resolves when all queued operations have been processed
- Use this method to manually trigger synchronization of queued operations when coming back online

### Response Handling

All API methods return promises that resolve to the parsed JSON response or reject with an error. Error responses include:

- HTTP status code
- Error message from the server (if available)
- Standard error properties for consistent handling

Example error handling:

```javascript
try {
  const data = await apiClient.get('/endpoint');
  // Handle success case
} catch (error) {
  console.error(`Error ${error.status}: ${error.message}`);
  // Handle error case based on status code
}
```

## Offline Support

The application provides robust offline capabilities through the `offlineManager` service (`src/services/offlineManager.js`).

### Features

1. **Automatic Operation Queueing**: Write operations (POST, PUT, DELETE) are automatically queued when offline
2. **Data Caching**: GET responses can be cached for offline access
3. **Background Synchronization**: Queued operations are automatically processed when coming back online
4. **Online/Offline Detection**: Automatic detection of network status changes

### Usage

#### Queuing Operations

```javascript
import { offlineManager } from './services/offlineManager';

// Queue an operation for later execution
offlineManager.queueOperation('POST', 'http://api.example.com/endpoint', { data: 'value' });
```

#### Caching and Retrieving Data

```javascript
// Cache data for offline use
offlineManager.cacheData('cache_key', dataObject);

// Retrieve cached data
const cachedData = offlineManager.getCachedData('cache_key');
```

#### Checking Network Status

```javascript
// Check if the application is currently online
const isOnline = offlineManager.getOnlineStatus();

if (isOnline) {
  // Perform online operations
} else {
  // Use offline fallbacks
}
```

#### Manual Queue Processing

```javascript
// Manually trigger processing of the operation queue
await offlineManager.processQueue();
```

### Predefined Cache Keys

The offline manager defines standard cache keys for common data types:

```javascript
// Available as offlineManager.CACHE_KEYS
const CACHE_KEYS = {
  QUIZZES: 'offline_quizzes',
  QUIZ_DETAILS: 'offline_quiz_details',
  USER_PROFILE: 'offline_user_profile',
  OPERATION_QUEUE: 'offline_operation_queue'
};
```

## Authentication Service

The `authService` (`src/services/authService.js`) provides authentication-related functionality with offline support.

### Key Features

1. **Token Management**: Securely stores and retrieves authentication tokens
2. **Role-Based Access Control**: Manages user roles for authorization
3. **Offline Authentication**: Allows users to log in while offline using previously cached credentials
4. **Session Management**: Tracks session status and expiration

### Usage

#### Authentication

```javascript
import { authService } from './services/authService';

// Login
try {
  const result = await authService.login(username, password);
  console.log(`Logged in as: ${result.user.username}`);
} catch (error) {
  console.error('Login failed:', error.message);
}

// Logout
authService.logout();

// Check authentication status
if (authService.isAuthenticated()) {
  // User is logged in
}
```

#### Role and Permission Checking

```javascript
// Get the current user's role
const role = authService.getUserRole();

// Check if the user has a specific role
if (authService.hasRole('teacher')) {
  // Show teacher-specific UI
}
```

#### Offline Session Management

```javascript
// Check if the offline session is expired
if (authService.isOfflineSessionExpired()) {
  // Require fresh login
}

// Get timestamp of last online authentication
const lastOnline = authService.getLastOnlineTimestamp();
```

## Domain-Specific Services

### Quiz Service

The `quizService` (`src/services/quizService.js`) provides quiz-related functionality.

```javascript
import { quizService } from './services/quizService';

// Get all available quizzes (with offline support)
const quizzes = await quizService.getQuizzes();

// Get details for a specific quiz
const quizDetails = await quizService.getQuizById(quizId);

// Submit a completed quiz
const result = await quizService.submitQuiz(quizId, answers);

// For teachers: create a new quiz
const newQuiz = await quizService.createQuiz(quizData);
```

### User Service

The `userService` (`src/services/userService.js`) provides user profile and settings management.

```javascript
import { userService } from './services/userService';

// Get the current user's profile
const profile = await userService.getCurrentUserProfile();

// Update user settings
await userService.updateUserSettings(settingsData);

// For teachers: get student list
const students = await userService.getStudents();
```

## Error Handling Patterns

The API layer implements a consistent error handling approach:

1. **HTTP errors** are converted to JavaScript Error objects with additional properties:
   - `status`: HTTP status code
   - `message`: Human-readable error message
   - `offline`: Boolean indicating if the error is due to offline status

2. **Offline scenarios** return special response objects:
   ```javascript
   {
     success: true,
     message: 'Operation queued for processing when online',
     offline: true,
     queued: true,
     data: originalRequestData
   }
   ```

3. **Recommended error handling**:
   ```javascript
   try {
     const result = await apiService.someOperation();
     
     // Check if this was an offline-queued operation
     if (result.offline && result.queued) {
       // Show appropriate UI for queued operation
     } else {
       // Process normal result
     }
   } catch (error) {
     if (!navigator.onLine) {
       // Handle offline error case
     } else if (error.status === 401) {
       // Handle authentication error
     } else if (error.status === 403) {
       // Handle permission error
     } else {
       // Handle general error
     }
   }
   ```

## Data Transformation

The API integration implements a transformation layer to convert between API formats and application data models.

### Common Transformations

1. **Date handling**: ISO strings from the API are converted to JavaScript Date objects
2. **Enumeration mapping**: String enums from the API are mapped to application constants
3. **Nested object expansion**: Flattened API responses are expanded into nested objects for the application

Example transformation:

```javascript
// API Response format
const apiResponse = {
  quiz_id: "123",
  quiz_title: "Math Test",
  created_at: "2023-04-15T10:30:00Z",
  questions_count: 10,
  status: "published"
};

// Transformed for application use
const appData = {
  id: "123",
  title: "Math Test",
  createdAt: new Date("2023-04-15T10:30:00Z"),
  questions: {
    count: 10
  },
  status: QuizStatus.PUBLISHED
};
```

## Testing with Mock Data

The API layer supports mock data for testing and development via a configuration flag:

```javascript
// In src/services/config.js
export const USE_MOCK_DATA = true; // Set to false for real API calls
```

When mock data is enabled:
1. No actual API calls are made
2. Predefined sample data is returned for all endpoints
3. Authentication still works with test credentials
4. Offline behavior can still be tested

## Best Practices

1. **Always use the service layer**: Don't make direct fetch/XHR calls from components
2. **Implement proper error handling**: Use try/catch for all API calls
3. **Consider offline scenarios**: Design UI to handle offline operation queueing gracefully
4. **Cache appropriately**: Use cacheKey for GET requests that should work offline
5. **Check return values**: Always check for `offline` and `queued` properties in responses

## Configuration

API configuration is stored in `src/services/config.js` with the following settings:

- `API_BASE_URL`: Base URL for API requests
- `USE_MOCK_DATA`: Toggle between mock data and real API
- `VERBOSE_LOGGING`: Enable detailed logging for debugging
- `OFFLINE_SESSION_MAX_DURATION`: Maximum duration for offline sessions

## Troubleshooting

Common issues and solutions:

1. **Authentication failures**:
   - Check if token is present (`authService.getToken()`)
   - Verify token expiration
   - Try logging out and back in

2. **Offline operations not syncing**:
   - Manually trigger sync (`offlineManager.processQueue()`)
   - Check network status (`offlineManager.getOnlineStatus()`)
   - Verify queue contents (`offlineManager.getOperationQueue()`)

3. **Cached data issues**:
   - Clear specific cache (`offlineManager.clearCache(cacheKey)`)
   - Clear all caches (`offlineManager.clearCache()`) 