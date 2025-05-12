// src/services/apiClient.js
import { offlineManager } from './offlineManager';
import { secureStorageService } from './secureStorageService';
import { VERBOSE_LOGGING } from './config';

// TODO: Replace with your actual API base URL when available.
// For a local backend, it might be something like 'http://localhost:3000/api'
// For a deployed backend, it will be the production URL.
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'; // Using Vite environment variables

// Function to get the token from secure storage
function getToken() {
  // Use secureStorageService instead of localStorage for more secure token storage
  try {
    return secureStorageService.getItem('authToken');
  } catch (e) {
    console.warn('Could not access secure storage to get authToken. This might happen in SSR or restricted environments.', e);
    return null;
  }
}

/**
 * Handles the JSON response from the fetch API.
 * @param {Response} response - The fetch API Response object.
 * @returns {Promise<any>} - A promise that resolves with the JSON data or rejects with an error.
 */
async function handleResponse(response) {
  if (!response.ok) {
    let errorMessage = `API Error: ${response.status} ${response.statusText}`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorData.error || errorMessage;
    } catch (e) {
      // Ignore if response is not JSON or already handled
    }
    const error = new Error(errorMessage);
    error.status = response.status;
    throw error;
  }
  // If response is 204 No Content, there's no body to parse
  if (response.status === 204) {
    return null;
  }
  return response.json();
}

/**
 * Performs a GET request with offline support.
 * @param {string} endpoint - The API endpoint (e.g., '/users').
 * @param {object} [options={}] - Optional fetch options.
 * @param {string} [cacheKey=null] - Key to use for caching response in offline mode
 * @returns {Promise<any>}
 */
async function get(endpoint, options = {}, cacheKey = null) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const fullUrl = `${API_BASE_URL}${endpoint}`;

  // Check if we're online
  if (!offlineManager.getOnlineStatus()) {
    if (VERBOSE_LOGGING) console.log(`apiClient: Offline - attempting to retrieve cached data for: ${endpoint}`);
    
    // If a specific cache key was provided, use it
    if (cacheKey) {
      const cachedData = offlineManager.getCachedData(cacheKey);
      
      if (cachedData) {
        if (VERBOSE_LOGGING) console.log(`apiClient: Retrieved cached data for key: ${cacheKey}`);
        return cachedData;
      }
    }
    
    // No cached data found
    if (VERBOSE_LOGGING) console.log(`apiClient: No cached data available for: ${endpoint}`);
    throw new Error('You are offline and no cached data is available');
  }

  // We're online, proceed with the request
  try {
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers,
      ...options,
    });
    
    const data = await handleResponse(response);
    
    // If we have a cache key, store this successful response for offline use
    if (cacheKey && data) {
      offlineManager.cacheData(cacheKey, data);
    }
    
    return data;
  } catch (error) {
    // If API request fails, check if we have cached data to fall back to
    if (cacheKey) {
      const cachedData = offlineManager.getCachedData(cacheKey);
      if (cachedData) {
        if (VERBOSE_LOGGING) console.log(`apiClient: API request failed, falling back to cached data for: ${endpoint}`);
        return cachedData;
      }
    }
    
    // No cached data available, propagate the error
    throw error;
  }
}

/**
 * Performs a POST request with offline support.
 * @param {string} endpoint - The API endpoint.
 * @param {any} body - The request body.
 * @param {object} [options={}] - Optional fetch options.
 * @returns {Promise<any>}
 */
async function post(endpoint, body, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const fullUrl = `${API_BASE_URL}${endpoint}`;

  // If offline, queue the operation for later
  if (!offlineManager.getOnlineStatus()) {
    if (VERBOSE_LOGGING) console.log(`apiClient: Offline - queueing POST operation for: ${endpoint}`);
    
    // Queue the operation and return a mock successful response
    offlineManager.queueOperation('POST', fullUrl, body);
    
    return {
      success: true,
      message: 'Operation queued for processing when online',
      offline: true,
      queued: true,
      data: body
    };
  }

  // If online, proceed with the request
  try {
    const response = await fetch(fullUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      ...options,
    });
    
    return await handleResponse(response);
  } catch (error) {
    // If the request fails, queue it for later
    if (VERBOSE_LOGGING) console.log(`apiClient: POST request failed, queueing for later: ${endpoint}`, error);
    
    offlineManager.queueOperation('POST', fullUrl, body);
    
    return {
      success: true,
      message: 'Operation failed but queued for retry',
      offline: false,
      queued: true,
      error: error.message,
      data: body
    };
  }
}

/**
 * Performs a PUT request with offline support.
 * @param {string} endpoint - The API endpoint.
 * @param {any} body - The request body.
 * @param {object} [options={}] - Optional fetch options.
 * @returns {Promise<any>}
 */
async function put(endpoint, body, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const fullUrl = `${API_BASE_URL}${endpoint}`;

  // If offline, queue the operation for later
  if (!offlineManager.getOnlineStatus()) {
    if (VERBOSE_LOGGING) console.log(`apiClient: Offline - queueing PUT operation for: ${endpoint}`);
    
    // Queue the operation and return a mock successful response
    offlineManager.queueOperation('PUT', fullUrl, body);
    
    return {
      success: true,
      message: 'Operation queued for processing when online',
      offline: true,
      queued: true,
      data: body
    };
  }

  // If online, proceed with the request
  try {
    const response = await fetch(fullUrl, {
      method: 'PUT',
      headers,
      body: JSON.stringify(body),
      ...options,
    });
    
    return await handleResponse(response);
  } catch (error) {
    // If the request fails, queue it for later
    if (VERBOSE_LOGGING) console.log(`apiClient: PUT request failed, queueing for later: ${endpoint}`, error);
    
    offlineManager.queueOperation('PUT', fullUrl, body);
    
    return {
      success: true,
      message: 'Operation failed but queued for retry',
      offline: false,
      queued: true,
      error: error.message,
      data: body
    };
  }
}

/**
 * Performs a DELETE request with offline support.
 * @param {string} endpoint - The API endpoint.
 * @param {object} [options={}] - Optional fetch options.
 * @returns {Promise<any>}
 */
async function del(endpoint, options = {}) { // Renamed to 'del' to avoid keyword conflict
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const fullUrl = `${API_BASE_URL}${endpoint}`;

  // If offline, queue the operation for later
  if (!offlineManager.getOnlineStatus()) {
    if (VERBOSE_LOGGING) console.log(`apiClient: Offline - queueing DELETE operation for: ${endpoint}`);
    
    // Queue the operation and return a mock successful response
    offlineManager.queueOperation('DELETE', fullUrl);
    
    return {
      success: true,
      message: 'Operation queued for processing when online',
      offline: true,
      queued: true
    };
  }

  // If online, proceed with the request
  try {
    const response = await fetch(fullUrl, {
      method: 'DELETE',
      headers,
      ...options,
    });
    
    return await handleResponse(response);
  } catch (error) {
    // If the request fails, queue it for later
    if (VERBOSE_LOGGING) console.log(`apiClient: DELETE request failed, queueing for later: ${endpoint}`, error);
    
    offlineManager.queueOperation('DELETE', fullUrl);
    
    return {
      success: true,
      message: 'Operation failed but queued for retry',
      offline: false,
      queued: true,
      error: error.message
    };
  }
}

/**
 * Force synchronization of queued offline operations
 * @returns {Promise<{ success: boolean, message: string, processed: number }>}
 */
async function synchronize() {
  if (!offlineManager.getOnlineStatus()) {
    return {
      success: false,
      message: 'Cannot synchronize while offline',
      processed: 0
    };
  }
  
  const queueLength = offlineManager.getOperationQueue().length;
  
  if (queueLength === 0) {
    return {
      success: true,
      message: 'No operations to synchronize',
      processed: 0
    };
  }
  
  if (VERBOSE_LOGGING) console.log(`apiClient: Manually triggering synchronization of ${queueLength} operations`);
  
  await offlineManager.processQueue();
  
  const remainingOps = offlineManager.getOperationQueue().length;
  const processed = queueLength - remainingOps;
  
  return {
    success: processed > 0,
    message: remainingOps > 0 
      ? `Synchronized ${processed} operations, ${remainingOps} operations still pending` 
      : `Successfully synchronized ${processed} operations`,
    processed
  };
}

export const apiClient = {
  get,
  post,
  put,
  delete: del, // Assign del to apiClient.delete
  synchronize
};

// Example of how to get an auth token if you store it in localStorage
// function getToken() {
//   return localStorage.getItem('authToken');
// } 