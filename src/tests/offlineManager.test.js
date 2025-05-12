// src/tests/offlineManager.test.js
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { offlineManager } from '../services/offlineManager';

// Mock localStorage for data persistence
const localStorageMock = (() => {
  let store = {};
  
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => { store[key] = value.toString(); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; }
  };
})();

// Override localStorage methods
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('Offline Manager Service', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    
    // Reset any mocks
    vi.resetAllMocks();
  });
  
  describe('Online Status Management', () => {
    it('should return online status', () => {
      // Default should be online
      expect(offlineManager.getOnlineStatus()).toBe(true);
      
      // Set to offline
      offlineManager.setOnlineStatus(false);
      expect(offlineManager.getOnlineStatus()).toBe(false);
      
      // Set back to online
      offlineManager.setOnlineStatus(true);
      expect(offlineManager.getOnlineStatus()).toBe(true);
    });
  });
  
  describe('Data Caching', () => {
    it('should cache and retrieve data by key', () => {
      const testData = { id: 1, name: 'Test Data' };
      const cacheKey = 'test-data';
      
      // Cache the data
      offlineManager.cacheData(cacheKey, testData);
      
      // Retrieve and verify
      const retrievedData = offlineManager.getCachedData(cacheKey);
      expect(retrievedData).toEqual(testData);
    });
    
    it('should return null for non-existent cache keys', () => {
      const nonExistentKey = 'non-existent-key';
      
      // Attempt to retrieve non-existent data
      const retrievedData = offlineManager.getCachedData(nonExistentKey);
      expect(retrievedData).toBeNull();
    });
    
    it('should clear specific cached data', () => {
      // Cache multiple items
      offlineManager.cacheData('key1', { data: 'value1' });
      offlineManager.cacheData('key2', { data: 'value2' });
      
      // Clear one key
      offlineManager.clearCachedData('key1');
      
      // Verify key1 is cleared but key2 remains
      expect(offlineManager.getCachedData('key1')).toBeNull();
      expect(offlineManager.getCachedData('key2')).toEqual({ data: 'value2' });
    });
    
    it('should clear all cached data', () => {
      // Cache multiple items
      offlineManager.cacheData('key1', { data: 'value1' });
      offlineManager.cacheData('key2', { data: 'value2' });
      
      // Clear all cache
      offlineManager.clearAllCachedData();
      
      // Verify all keys are cleared
      expect(offlineManager.getCachedData('key1')).toBeNull();
      expect(offlineManager.getCachedData('key2')).toBeNull();
    });
  });
  
  describe('Operation Queue Management', () => {
    it('should queue operations', () => {
      const method = 'POST';
      const url = 'http://localhost:5000/api/quizzes/submit';
      const data = { quizId: '1', answers: [] };
      
      // Queue the operation
      offlineManager.queueOperation(method, url, data);
      
      // Verify queue has the operation
      const queue = offlineManager.getOperationQueue();
      expect(queue.length).toBe(1);
      expect(queue[0].method).toBe(method);
      expect(queue[0].url).toBe(url);
      expect(queue[0].data).toEqual(data);
      expect(queue[0].timestamp).toBeDefined();
    });
    
    it('should process the operation queue when online', async () => {
      // Mock fetch for processing
      global.fetch = vi.fn().mockImplementation(() => 
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true })
        })
      );
      
      // Queue a couple of operations
      offlineManager.queueOperation('POST', 'http://example.com/api/resource1', { id: 1 });
      offlineManager.queueOperation('PUT', 'http://example.com/api/resource2', { id: 2 });
      
      // Process the queue
      await offlineManager.processQueue();
      
      // Verify fetch was called for each queued operation
      expect(global.fetch).toHaveBeenCalledTimes(2);
      
      // Queue should be empty after processing
      expect(offlineManager.getOperationQueue().length).toBe(0);
    });
    
    it('should handle failures during queue processing', async () => {
      // Mock fetch to fail for the first call but succeed for the second
      global.fetch = vi.fn()
        .mockImplementationOnce(() => Promise.reject(new Error('Network error')))
        .mockImplementationOnce(() => 
          Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true })
          })
        );
      
      // Queue a couple of operations
      offlineManager.queueOperation('POST', 'http://example.com/api/resource1', { id: 1 });
      offlineManager.queueOperation('PUT', 'http://example.com/api/resource2', { id: 2 });
      
      // Process the queue
      await offlineManager.processQueue();
      
      // Verify fetch was called for each queued operation
      expect(global.fetch).toHaveBeenCalledTimes(2);
      
      // Failed operations should remain in the queue
      const remainingQueue = offlineManager.getOperationQueue();
      expect(remainingQueue.length).toBe(1);
      expect(remainingQueue[0].url).toContain('resource1');
    });
    
    it('should clear the operation queue', () => {
      // Queue some operations
      offlineManager.queueOperation('POST', 'http://example.com/api/resource1', { id: 1 });
      offlineManager.queueOperation('PUT', 'http://example.com/api/resource2', { id: 2 });
      
      // Clear the queue
      offlineManager.clearOperationQueue();
      
      // Verify queue is empty
      expect(offlineManager.getOperationQueue().length).toBe(0);
    });
  });
}); 