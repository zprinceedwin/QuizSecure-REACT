// src/tests/apiClient.test.js
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import { server, handlers } from './mocks/server';
import { offlineManager } from '../services/offlineManager';
import * as apiClient from '../services/apiClient';

// Mock the offlineManager
vi.mock('../services/offlineManager', () => ({
  offlineManager: {
    getOnlineStatus: vi.fn(),
    getCachedData: vi.fn(),
    cacheData: vi.fn(),
    queueOperation: vi.fn(),
    processQueue: vi.fn(),
  }
}));

// Mock localStorage for token storage
vi.mock('../services/config', () => ({
  VERBOSE_LOGGING: false,
  USE_MOCK_DATA: false
}));

describe('API Client Service', () => {
  // Start the MSW server before tests
  beforeAll(() => server.listen());
  
  // Reset any request handlers added during the tests
  afterEach(() => {
    server.resetHandlers();
    vi.resetAllMocks();
  });
  
  // Close the server after tests
  afterAll(() => server.close());
  
  describe('GET requests', () => {
    beforeEach(() => {
      // Mock being online by default
      offlineManager.getOnlineStatus.mockReturnValue(true);
    });
    
    it('should successfully fetch data when online', async () => {
      // Set up mock for getToken
      global.localStorage.setItem('authToken', 'test-token');
      
      // Make the GET request
      const result = await apiClient.get('/quizzes');
      
      // Assert successful response
      expect(result).toBeDefined();
      expect(result.quizzes).toBeDefined();
      expect(result.quizzes.length).toBe(2);
      expect(result.quizzes[0].title).toBe('Math Quiz');
    });
    
    it('should use cached data when offline', async () => {
      // Mock being offline
      offlineManager.getOnlineStatus.mockReturnValue(false);
      
      // Set up mock cached data
      const mockCachedData = { quizzes: [{ id: 'cached', title: 'Cached Quiz' }] };
      offlineManager.getCachedData.mockReturnValue(mockCachedData);
      
      // Make the GET request with cache key
      const result = await apiClient.get('/quizzes', {}, 'quizzes');
      
      // Assert cached data is returned
      expect(result).toEqual(mockCachedData);
      expect(offlineManager.getCachedData).toHaveBeenCalledWith('quizzes');
    });
    
    it('should throw an error when offline with no cache', async () => {
      // Mock being offline
      offlineManager.getOnlineStatus.mockReturnValue(false);
      
      // Set up mock with no cached data
      offlineManager.getCachedData.mockReturnValue(null);
      
      // Attempt GET request, should throw
      await expect(apiClient.get('/quizzes', {}, 'quizzes'))
        .rejects.toThrow('You are offline and no cached data is available');
      
      expect(offlineManager.getCachedData).toHaveBeenCalledWith('quizzes');
    });
    
    it('should cache successful responses', async () => {
      // Mock being online
      offlineManager.getOnlineStatus.mockReturnValue(true);
      
      // Make the GET request with cache key
      await apiClient.get('/quizzes', {}, 'quizzes');
      
      // Assert data was cached
      expect(offlineManager.cacheData).toHaveBeenCalledTimes(1);
      expect(offlineManager.cacheData.mock.calls[0][0]).toBe('quizzes');
    });
  });
  
  describe('POST requests', () => {
    beforeEach(() => {
      offlineManager.getOnlineStatus.mockReturnValue(true);
    });
    
    it('should successfully post data when online', async () => {
      const mockData = { username: 'testuser', password: 'password123' };
      
      // Make the POST request
      const result = await apiClient.post('/auth/login', mockData);
      
      // Assert successful response
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.token).toBe('mock-jwt-token');
    });
    
    it('should queue operations when offline', async () => {
      // Mock being offline
      offlineManager.getOnlineStatus.mockReturnValue(false);
      
      const mockData = { quizId: '1', answers: [{ questionId: '1', answer: '4' }] };
      
      // Make the POST request while offline
      const result = await apiClient.post('/quizzes/submit', mockData);
      
      // Assert operation was queued
      expect(offlineManager.queueOperation).toHaveBeenCalledTimes(1);
      expect(offlineManager.queueOperation.mock.calls[0][0]).toBe('POST');
      expect(result.queued).toBe(true);
      expect(result.offline).toBe(true);
    });
  });
}); 