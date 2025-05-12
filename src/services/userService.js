import { apiClient } from './apiClient';
import { authService } from './authService'; // To potentially get user ID or role
import { offlineManager } from './offlineManager';
import { USE_MOCK_DATA, VERBOSE_LOGGING } from './config';

// Cache key constants
const CACHE_KEYS = {
  CURRENT_USER: offlineManager.CACHE_KEYS.USER_PROFILE,
  ALL_USERS: 'offline_users_list',
  USER_DETAILS_PREFIX: 'offline_user_detail_'
};

// Mock user data for fallback/testing
const MOCK_USER = {
  id: 'user123',
  username: 'teststudent',
  role: 'student',
  firstName: 'Test',
  lastName: 'Student',
  email: 'test.student@example.com',
};

// Mock users list (for teacher interface)
const MOCK_USERS = [
  {
    id: 'user123',
    username: 'teststudent',
    role: 'student',
    firstName: 'Test',
    lastName: 'Student',
    email: 'test.student@example.com',
  },
  {
    id: 'user456',
    username: 'johnsmith',
    role: 'student',
    firstName: 'John',
    lastName: 'Smith',
    email: 'john.smith@example.com',
  },
  {
    id: 'user789',
    username: 'professorjones',
    role: 'teacher',
    firstName: 'Professor',
    lastName: 'Jones',
    email: 'professor.jones@example.com',
  }
];

/**
 * Initialize offline data cache with mock data if not already present
 */
function initOfflineData() {
  // Initialize user cache if not present
  const cachedUser = offlineManager.getCachedData(CACHE_KEYS.CURRENT_USER);
  if (!cachedUser && authService.isAuthenticated()) {
    if (VERBOSE_LOGGING) console.log('userService: Initializing offline user cache with mock data');
    offlineManager.cacheData(CACHE_KEYS.CURRENT_USER, MOCK_USER);
  }
  
  // Initialize all users cache if not present
  const cachedUsers = offlineManager.getCachedData(CACHE_KEYS.ALL_USERS);
  if (!cachedUsers) {
    if (VERBOSE_LOGGING) console.log('userService: Initializing offline users list cache with mock data');
    offlineManager.cacheData(CACHE_KEYS.ALL_USERS, MOCK_USERS);
    
    // Also cache individual user details
    MOCK_USERS.forEach(user => {
      const userDetailKey = `${CACHE_KEYS.USER_DETAILS_PREFIX}${user.id}`;
      offlineManager.cacheData(userDetailKey, user);
    });
  }
}

// Initialize offline data when module is loaded
initOfflineData();

/**
 * Fetches the current logged-in user's details.
 * Uses real API with fallback to mock data for prototype.
 * @returns {Promise<any>}
 */
async function getCurrentUser() {
  if (!authService.isAuthenticated()) {
    console.warn('userService.getCurrentUser called but no user is authenticated.');
    return Promise.resolve(null);
  }

  if (USE_MOCK_DATA) {
    if (VERBOSE_LOGGING) console.log('userService.getCurrentUser using MOCK data');
    // Cache mock data for offline use
    offlineManager.cacheData(CACHE_KEYS.CURRENT_USER, MOCK_USER);
    return Promise.resolve(MOCK_USER);
  }

  try {
    if (VERBOSE_LOGGING) console.log('userService.getCurrentUser fetching from API: /users/me');
    // Attempt to get user details from the API with offline support
    const response = await apiClient.get('/users/me', {}, CACHE_KEYS.CURRENT_USER);
    return response;
  } catch (error) {
    console.warn('API call failed, falling back to mock user data:', error);
    
    // Try to get from offline cache first
    const cachedUser = offlineManager.getCachedData(CACHE_KEYS.CURRENT_USER);
    if (cachedUser) {
      if (VERBOSE_LOGGING) console.log('userService.getCurrentUser returning cached data');
      return cachedUser;
    }
    
    // If no cached data, use mock data
    return MOCK_USER;
  }
}

/**
 * Updates the current user's profile data.
 * Uses real API with fallback to mock response for prototype.
 * @param {Object} profileData - The profile data to update
 * @returns {Promise<any>}
 */
async function updateUserProfile(profileData) {
  if (!authService.isAuthenticated()) {
    console.warn('userService.updateUserProfile called but no user is authenticated.');
    return Promise.reject(new Error('User not authenticated'));
  }

  if (USE_MOCK_DATA) {
    if (VERBOSE_LOGGING) console.log('userService.updateUserProfile using MOCK response', profileData);
    
    // Update mock user with new profile data
    const updatedUser = {
      ...MOCK_USER,
      ...profileData
    };
    
    // Cache the updated user data
    offlineManager.cacheData(CACHE_KEYS.CURRENT_USER, updatedUser);
    
    // Simulate successful update
    return Promise.resolve({
      ...updatedUser,
      message: 'Profile updated successfully (mock response).'
    });
  }

  try {
    if (VERBOSE_LOGGING) console.log('userService.updateUserProfile posting to API: /users/me', profileData);
    const response = await apiClient.put('/users/me', profileData);
    
    // If this was a successful operation (not queued), update our cache
    if (response && !response.queued) {
      // Get the current cached user if available
      const cachedUser = offlineManager.getCachedData(CACHE_KEYS.CURRENT_USER);
      
      // Update cache with merged data
      offlineManager.cacheData(CACHE_KEYS.CURRENT_USER, {
        ...(cachedUser || {}),
        ...response
      });
    }
    
    // If this was queued for offline processing, show a message
    if (response.queued) {
      return { 
        ...response, 
        message: 'Profile updated and will be synced when you\'re back online.' 
      };
    }
    
    return response;
  } catch (error) {
    console.warn('API call failed for updating profile, using mock response:', error);
    
    // Create an updated mock response
    const updatedUser = {
      ...MOCK_USER,
      ...profileData,
      message: 'Profile updated successfully (mock fallback).'
    };
    
    // Cache the updated user data
    offlineManager.cacheData(CACHE_KEYS.CURRENT_USER, updatedUser);
    
    return updatedUser;
  }
}

/**
 * Gets a list of all users (for administrators or teachers).
 * @returns {Promise<Array>} List of users
 */
async function getAllUsers() {
  if (!authService.isAuthenticated()) {
    console.warn('userService.getAllUsers called but no user is authenticated.');
    return Promise.reject(new Error('User not authenticated'));
  }

  if (USE_MOCK_DATA) {
    if (VERBOSE_LOGGING) console.log('userService.getAllUsers using MOCK data');
    
    // Cache mock data for offline use
    offlineManager.cacheData(CACHE_KEYS.ALL_USERS, MOCK_USERS);
    
    return Promise.resolve(MOCK_USERS);
  }

  try {
    if (VERBOSE_LOGGING) console.log('userService.getAllUsers fetching from API: /users');
    const response = await apiClient.get('/users', {}, CACHE_KEYS.ALL_USERS);
    return response;
  } catch (error) {
    console.warn('API call failed, falling back to mock users data:', error);
    
    // Try to get from offline cache first
    const cachedUsers = offlineManager.getCachedData(CACHE_KEYS.ALL_USERS);
    if (cachedUsers) {
      if (VERBOSE_LOGGING) console.log('userService.getAllUsers returning cached data');
      return cachedUsers;
    }
    
    // If no cached data, use mock data
    return MOCK_USERS;
  }
}

/**
 * Gets a specific user by ID.
 * @param {string} userId - The ID of the user to fetch
 * @returns {Promise<Object>} The user data
 */
async function getUserById(userId) {
  if (!authService.isAuthenticated()) {
    console.warn('userService.getUserById called but no user is authenticated.');
    return Promise.reject(new Error('User not authenticated'));
  }

  const userDetailKey = `${CACHE_KEYS.USER_DETAILS_PREFIX}${userId}`;

  if (USE_MOCK_DATA) {
    if (VERBOSE_LOGGING) console.log(`userService.getUserById using MOCK data for ID: ${userId}`);
    
    const user = MOCK_USERS.find(u => u.id === userId);
    if (!user) {
      return Promise.reject(new Error(`User with ID ${userId} not found`));
    }
    
    // Cache this user for offline use
    offlineManager.cacheData(userDetailKey, user);
    
    return Promise.resolve(user);
  }

  try {
    if (VERBOSE_LOGGING) console.log(`userService.getUserById fetching from API: /users/${userId}`);
    const response = await apiClient.get(`/users/${userId}`, {}, userDetailKey);
    return response;
  } catch (error) {
    console.warn(`API call failed for user ID ${userId}, falling back to mock data:`, error);
    
    // Try to get from offline cache first
    const cachedUser = offlineManager.getCachedData(userDetailKey);
    if (cachedUser) {
      if (VERBOSE_LOGGING) console.log(`userService.getUserById returning cached data for ID: ${userId}`);
      return cachedUser;
    }
    
    // If not in cache, try to find in mock data
    const user = MOCK_USERS.find(u => u.id === userId);
    if (!user) {
      return Promise.reject(new Error(`User with ID ${userId} not found`));
    }
    
    return user;
  }
}

/**
 * Creates a new user in the system.
 * @param {Object} userData - The user data to create
 * @returns {Promise<Object>} The created user
 */
async function createUser(userData) {
  if (!authService.isAuthenticated()) {
    console.warn('userService.createUser called but no user is authenticated.');
    return Promise.reject(new Error('User not authenticated'));
  }

  if (USE_MOCK_DATA) {
    if (VERBOSE_LOGGING) console.log('userService.createUser using MOCK response', userData);
    
    // Check if username already exists in mock data
    const existingUser = MOCK_USERS.find(u => u.username === userData.username);
    if (existingUser) {
      return Promise.reject(new Error(`Username '${userData.username}' is already taken`));
    }
    
    // Generate a random ID for the new user
    const newId = `user${Math.floor(Math.random() * 1000)}`;
    const newUser = {
      id: newId,
      ...userData,
    };
    
    // Add to mock data
    MOCK_USERS.push(newUser);
    
    // Update the offline cache
    offlineManager.cacheData(CACHE_KEYS.ALL_USERS, MOCK_USERS);
    offlineManager.cacheData(`${CACHE_KEYS.USER_DETAILS_PREFIX}${newId}`, newUser);
    
    return Promise.resolve({
      ...newUser,
      message: 'User created successfully (mock response).'
    });
  }

  try {
    if (VERBOSE_LOGGING) console.log('userService.createUser posting to API: /users', userData);
    const response = await apiClient.post('/users', userData);
    
    // If this was a successful operation (not queued), update our cache
    if (response && response.id && !response.queued) {
      // Get the latest users list to update cache
      getAllUsers().catch(() => {});
      
      // Cache this new user detail
      const userDetailKey = `${CACHE_KEYS.USER_DETAILS_PREFIX}${response.id}`;
      offlineManager.cacheData(userDetailKey, response);
    }
    
    // If this was queued for offline processing, show a message
    if (response.queued) {
      return { 
        ...response, 
        message: 'User created and will be synced when you\'re back online.' 
      };
    }
    
    return response;
  } catch (error) {
    console.warn('API call failed for creating user, using mock response:', error);
    
    // Generate a random ID for the new user for testing UI
    const newId = `user${Math.floor(Math.random() * 1000)}`;
    return {
      id: newId,
      ...userData,
      message: 'User created successfully (mock fallback).'
    };
  }
}

/**
 * Updates an existing user's data.
 * @param {string} userId - The ID of the user to update
 * @param {Object} userData - The updated user data
 * @returns {Promise<Object>} The updated user
 */
async function updateUser(userId, userData) {
  if (!authService.isAuthenticated()) {
    console.warn('userService.updateUser called but no user is authenticated.');
    return Promise.reject(new Error('User not authenticated'));
  }

  if (USE_MOCK_DATA) {
    if (VERBOSE_LOGGING) console.log(`userService.updateUser using MOCK response for ID: ${userId}`, userData);
    
    // Find the user in mock data
    const userIndex = MOCK_USERS.findIndex(u => u.id === userId);
    if (userIndex < 0) {
      return Promise.reject(new Error(`User with ID ${userId} not found`));
    }
    
    // Check if username is being changed and if it's already taken
    if (userData.username && userData.username !== MOCK_USERS[userIndex].username) {
      const existingUser = MOCK_USERS.find(u => u.username === userData.username);
      if (existingUser) {
        return Promise.reject(new Error(`Username '${userData.username}' is already taken`));
      }
    }
    
    // Update the user
    MOCK_USERS[userIndex] = {
      ...MOCK_USERS[userIndex],
      ...userData,
      id: userId // Ensure ID remains unchanged
    };
    
    // Update the offline cache
    offlineManager.cacheData(CACHE_KEYS.ALL_USERS, MOCK_USERS);
    offlineManager.cacheData(`${CACHE_KEYS.USER_DETAILS_PREFIX}${userId}`, MOCK_USERS[userIndex]);
    
    // If this is the current user, update the current user cache too
    const currentUser = offlineManager.getCachedData(CACHE_KEYS.CURRENT_USER);
    if (currentUser && currentUser.id === userId) {
      offlineManager.cacheData(CACHE_KEYS.CURRENT_USER, MOCK_USERS[userIndex]);
    }
    
    return Promise.resolve({
      ...MOCK_USERS[userIndex],
      message: 'User updated successfully (mock response).'
    });
  }

  try {
    if (VERBOSE_LOGGING) console.log(`userService.updateUser putting to API: /users/${userId}`, userData);
    const response = await apiClient.put(`/users/${userId}`, userData);
    
    // If this was a successful operation (not queued), update our cache
    if (response && !response.queued) {
      // Get the latest users list to update cache
      getAllUsers().catch(() => {});
      
      // Update this user's detail cache
      const userDetailKey = `${CACHE_KEYS.USER_DETAILS_PREFIX}${userId}`;
      const existingCache = offlineManager.getCachedData(userDetailKey);
      if (existingCache) {
        const updatedUser = {
          ...existingCache,
          ...response
        };
        offlineManager.cacheData(userDetailKey, updatedUser);
        
        // If this is the current user, update the current user cache too
        const currentUser = offlineManager.getCachedData(CACHE_KEYS.CURRENT_USER);
        if (currentUser && currentUser.id === userId) {
          offlineManager.cacheData(CACHE_KEYS.CURRENT_USER, updatedUser);
        }
      }
    }
    
    // If this was queued for offline processing, show a message
    if (response.queued) {
      return { 
        ...response, 
        message: 'User updated and will be synced when you\'re back online.' 
      };
    }
    
    return response;
  } catch (error) {
    console.warn(`API call failed for updating user ${userId}, using mock response:`, error);
    
    return {
      id: userId,
      ...userData,
      message: 'User updated successfully (mock fallback).'
    };
  }
}

/**
 * Deletes a user from the system.
 * @param {string} userId - The ID of the user to delete
 * @returns {Promise<Object>} Confirmation of deletion
 */
async function deleteUser(userId) {
  if (!authService.isAuthenticated()) {
    console.warn('userService.deleteUser called but no user is authenticated.');
    return Promise.reject(new Error('User not authenticated'));
  }

  if (USE_MOCK_DATA) {
    if (VERBOSE_LOGGING) console.log(`userService.deleteUser using MOCK response for ID: ${userId}`);
    
    // Find the user in mock data
    const userIndex = MOCK_USERS.findIndex(u => u.id === userId);
    if (userIndex < 0) {
      return Promise.reject(new Error(`User with ID ${userId} not found`));
    }
    
    // Remove the user
    MOCK_USERS.splice(userIndex, 1);
    
    // Update the offline cache
    offlineManager.cacheData(CACHE_KEYS.ALL_USERS, MOCK_USERS);
    offlineManager.clearCache(`${CACHE_KEYS.USER_DETAILS_PREFIX}${userId}`);
    
    // If this was the current user, clear that cache too (though this would be unusual)
    const currentUser = offlineManager.getCachedData(CACHE_KEYS.CURRENT_USER);
    if (currentUser && currentUser.id === userId) {
      offlineManager.clearCache(CACHE_KEYS.CURRENT_USER);
    }
    
    return Promise.resolve({ success: true, message: 'User deleted successfully (mock response).' });
  }

  try {
    if (VERBOSE_LOGGING) console.log(`userService.deleteUser sending DELETE to API: /users/${userId}`);
    const response = await apiClient.delete(`/users/${userId}`);
    
    // If this was a successful operation (not queued), update our cache
    if (response && response.success && !response.queued) {
      // Get the latest users list to update cache
      getAllUsers().catch(() => {});
      
      // Remove this user from the detail cache
      offlineManager.clearCache(`${CACHE_KEYS.USER_DETAILS_PREFIX}${userId}`);
      
      // If this was the current user, clear that cache too (though this would be unusual)
      const currentUser = offlineManager.getCachedData(CACHE_KEYS.CURRENT_USER);
      if (currentUser && currentUser.id === userId) {
        offlineManager.clearCache(CACHE_KEYS.CURRENT_USER);
      }
    }
    
    // If this was queued for offline processing, show a message
    if (response.queued) {
      return { 
        ...response, 
        message: 'User deletion will be processed when you\'re back online.' 
      };
    }
    
    return response;
  } catch (error) {
    console.warn(`API call failed for deleting user ${userId}, using mock response:`, error);
    return { success: true, message: 'User deleted successfully (mock fallback).' };
  }
}

/**
 * Changes a user's password.
 * @param {string} userId - The ID of the user
 * @param {string} currentPassword - The current password for verification
 * @param {string} newPassword - The new password to set
 * @returns {Promise<Object>} Confirmation of password change
 */
async function changePassword(userId, currentPassword, newPassword) {
  if (!authService.isAuthenticated()) {
    console.warn('userService.changePassword called but no user is authenticated.');
    return Promise.reject(new Error('User not authenticated'));
  }

  if (USE_MOCK_DATA) {
    if (VERBOSE_LOGGING) console.log(`userService.changePassword using MOCK response for ID: ${userId}`);
    
    // Simple password validation for mock implementation
    if (!currentPassword || !newPassword) {
      return Promise.reject(new Error('Both current and new password are required'));
    }
    
    if (newPassword.length < 6) {
      return Promise.reject(new Error('New password must be at least 6 characters long'));
    }
    
    return Promise.resolve({ success: true, message: 'Password changed successfully (mock response).' });
  }

  try {
    if (VERBOSE_LOGGING) console.log(`userService.changePassword posting to API: /users/${userId}/password`);
    const response = await apiClient.post(`/users/${userId}/password`, { 
      currentPassword, 
      newPassword 
    });
    
    // If this was queued for offline processing, show a message
    if (response.queued) {
      return { 
        ...response, 
        message: 'Password change request will be processed when you\'re back online.' 
      };
    }
    
    return response;
  } catch (error) {
    console.warn(`API call failed for changing password for user ${userId}:`, error);
    // Not returning a mock success here because password changes should not appear successful if they fail
    throw error;
  }
}

/**
 * Force synchronization of any queued user operations
 * @returns {Promise<any>} Result of the synchronization attempt
 */
async function synchronize() {
  return apiClient.synchronize();
}

// Expose service to window for console testing
if (typeof window !== 'undefined') {
  window.userService = userService;
}

export const userService = {
  getCurrentUser,
  updateUserProfile,
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  changePassword,
  synchronize
}; 