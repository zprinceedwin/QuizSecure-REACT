import { VERBOSE_LOGGING } from './config';

// Queue to store pending operations when offline
let operationQueue = [];

// Flag to track network connectivity
let isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

// Cache key constants
const CACHE_KEYS = {
  QUIZZES: 'offline_quizzes',
  QUIZ_DETAILS: 'offline_quiz_details',
  USER_PROFILE: 'offline_user_profile',
  OPERATION_QUEUE: 'offline_operation_queue'
};

/**
 * Initialize offline manager and set up event listeners for online/offline status
 */
function initialize() {
  if (typeof window !== 'undefined') {
    // Check if we already have a stored queue and restore it
    const storedQueue = localStorage.getItem(CACHE_KEYS.OPERATION_QUEUE);
    if (storedQueue) {
      try {
        operationQueue = JSON.parse(storedQueue);
        if (VERBOSE_LOGGING) console.log('offlineManager: Restored operation queue', operationQueue);
      } catch (e) {
        console.error('Failed to parse stored operation queue:', e);
        operationQueue = [];
      }
    }

    // Set up online/offline event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Set initial state
    isOnline = navigator.onLine;
    if (VERBOSE_LOGGING) console.log(`offlineManager: Initial connectivity status - ${isOnline ? 'Online' : 'Offline'}`);
  }
}

/**
 * Cleanup offline manager, remove event listeners
 */
function cleanup() {
  if (typeof window !== 'undefined') {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
    if (VERBOSE_LOGGING) console.log('offlineManager: Cleaned up event listeners');
  }
}

/**
 * Handler for when the app goes online
 */
function handleOnline() {
  isOnline = true;
  if (VERBOSE_LOGGING) console.log('offlineManager: App is online now');
  
  // When we're back online, try to process the queue
  processQueue();
}

/**
 * Handler for when the app goes offline
 */
function handleOffline() {
  isOnline = false;
  if (VERBOSE_LOGGING) console.log('offlineManager: App is offline now');
}

/**
 * Process the operation queue when online
 */
async function processQueue() {
  if (!isOnline || operationQueue.length === 0) return;

  if (VERBOSE_LOGGING) console.log(`offlineManager: Processing operation queue (${operationQueue.length} items)`);
  
  // Create a copy of the queue to process
  const queueCopy = [...operationQueue];
  
  // Clear the queue (we'll add back any failed operations)
  operationQueue = [];
  
  // Save empty queue to storage
  localStorage.setItem(CACHE_KEYS.OPERATION_QUEUE, JSON.stringify(operationQueue));
  
  for (const operation of queueCopy) {
    try {
      if (VERBOSE_LOGGING) console.log(`offlineManager: Processing operation: ${operation.type} - ${operation.url}`);
      
      // Execute the operation
      await executeOperation(operation);
      
      if (VERBOSE_LOGGING) console.log(`offlineManager: Successfully processed operation: ${operation.type} - ${operation.url}`);
    } catch (error) {
      console.error(`offlineManager: Failed to process operation: ${operation.type} - ${operation.url}`, error);
      
      // Put the failed operation back in the queue to retry later
      operationQueue.push(operation);
    }
  }
  
  // Save updated queue to storage
  if (operationQueue.length > 0) {
    localStorage.setItem(CACHE_KEYS.OPERATION_QUEUE, JSON.stringify(operationQueue));
    if (VERBOSE_LOGGING) console.log(`offlineManager: ${operationQueue.length} operations remain in queue after processing`);
  } else {
    if (VERBOSE_LOGGING) console.log('offlineManager: All operations processed successfully');
  }
}

/**
 * Execute a single operation from the queue
 */
async function executeOperation(operation) {
  const { type, url, data, serviceMethod } = operation;
  
  // If an actual service method reference was provided, call it directly
  if (serviceMethod && typeof serviceMethod === 'function') {
    return serviceMethod(data);
  }
  
  // Otherwise, use the generic fetch approach
  const fetchOptions = {
    method: type,
    headers: {
      'Content-Type': 'application/json'
    }
  };
  
  if (data && (type === 'POST' || type === 'PUT' || type === 'PATCH')) {
    fetchOptions.body = JSON.stringify(data);
  }
  
  const response = await fetch(url, fetchOptions);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
}

/**
 * Queue an operation to be executed when online
 */
function queueOperation(type, url, data, serviceMethod = null) {
  const operation = { type, url, data, timestamp: Date.now(), serviceMethod };
  
  if (VERBOSE_LOGGING) console.log(`offlineManager: Queueing operation: ${type} - ${url}`, data);
  
  operationQueue.push(operation);
  
  // Store queue in localStorage for persistence
  try {
    localStorage.setItem(CACHE_KEYS.OPERATION_QUEUE, JSON.stringify(operationQueue));
  } catch (e) {
    console.error('Failed to store operation queue:', e);
  }
  
  // If we're actually online, try to process the queue immediately
  if (isOnline) {
    processQueue();
  }
}

/**
 * Store data in the offline cache
 */
function cacheData(key, data) {
  try {
    if (VERBOSE_LOGGING) console.log(`offlineManager: Caching data for key: ${key}`);
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error(`Failed to cache data for key ${key}:`, e);
  }
}

/**
 * Retrieve data from the offline cache
 */
function getCachedData(key) {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    console.error(`Failed to retrieve cached data for key ${key}:`, e);
    return null;
  }
}

/**
 * Check if the app is currently online
 */
function getOnlineStatus() {
  return isOnline;
}

/**
 * Get the current operation queue
 */
function getOperationQueue() {
  return [...operationQueue]; // Return a copy of the queue
}

/**
 * Clear the offline cache
 */
function clearCache(key = null) {
  if (key) {
    if (VERBOSE_LOGGING) console.log(`offlineManager: Clearing cache for key: ${key}`);
    localStorage.removeItem(key);
  } else {
    if (VERBOSE_LOGGING) console.log('offlineManager: Clearing all offline caches');
    Object.values(CACHE_KEYS).forEach(cacheKey => {
      localStorage.removeItem(cacheKey);
    });
  }
}

// Expose service to window for debugging
if (typeof window !== 'undefined') {
  window.offlineManager = {
    getOnlineStatus,
    getOperationQueue,
    clearCache,
    CACHE_KEYS
  };
}

export const offlineManager = {
  initialize,
  cleanup,
  queueOperation,
  cacheData,
  getCachedData,
  getOnlineStatus,
  processQueue,
  getOperationQueue,
  clearCache,
  CACHE_KEYS
}; 