// src/tests/authService.test.js
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import { server } from './mocks/server';
import * as authService from '../services/authService';
import * as apiClient from '../services/apiClient';

// Mock the API client
vi.mock('../services/apiClient', () => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  del: vi.fn()
}));

describe('Auth Service', () => {
  // Start the MSW server before tests
  beforeAll(() => server.listen());
  
  // Reset mocks between tests
  afterEach(() => {
    server.resetHandlers();
    vi.resetAllMocks();
    localStorage.clear();
  });
  
  // Close the server after tests
  afterAll(() => server.close());
  
  describe('login', () => {
    const mockCredentials = {
      username: 'testuser',
      password: 'testpassword'
    };
    
    const mockLoginResponse = {
      success: true,
      token: 'mock-jwt-token',
      user: {
        id: '1',
        username: 'testuser',
        email: 'test@example.com',
        role: 'student'
      }
    };
    
    it('should store token and user data on successful login', async () => {
      // Setup mock response for login
      apiClient.post.mockResolvedValue(mockLoginResponse);
      
      // Call login method
      const result = await authService.login(mockCredentials);
      
      // Assert API was called correctly
      expect(apiClient.post).toHaveBeenCalledWith('/auth/login', mockCredentials);
      
      // Assert token was stored in localStorage
      expect(localStorage.getItem('authToken')).toBe('mock-jwt-token');
      
      // Assert user data is in result
      expect(result.success).toBe(true);
      expect(result.user).toEqual(mockLoginResponse.user);
    });
    
    it('should handle login failure', async () => {
      // Setup mock response for failed login
      const mockErrorResponse = {
        success: false,
        message: 'Invalid credentials'
      };
      apiClient.post.mockResolvedValue(mockErrorResponse);
      
      // Call login method
      const result = await authService.login(mockCredentials);
      
      // Assert error response is returned
      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid credentials');
      
      // Assert token was NOT stored
      expect(localStorage.getItem('authToken')).toBeNull();
    });
    
    it('should handle API errors during login', async () => {
      // Setup mock for API error
      apiClient.post.mockRejectedValue(new Error('Network error'));
      
      // Call login and expect it to throw
      await expect(authService.login(mockCredentials))
        .rejects.toThrow('Network error');
        
      // Assert token was NOT stored
      expect(localStorage.getItem('authToken')).toBeNull();
    });
  });
  
  describe('logout', () => {
    beforeEach(() => {
      // Setup initial auth state
      localStorage.setItem('authToken', 'existing-token');
    });
    
    it('should clear token on logout', async () => {
      // Setup mock response for logout
      apiClient.post.mockResolvedValue({ success: true });
      
      // Call logout method
      const result = await authService.logout();
      
      // Assert API was called correctly
      expect(apiClient.post).toHaveBeenCalledWith('/auth/logout', {});
      
      // Assert token was removed from localStorage
      expect(localStorage.getItem('authToken')).toBeNull();
      
      // Assert success response
      expect(result.success).toBe(true);
    });
    
    it('should clear token even if API call fails', async () => {
      // Setup mock for API error
      apiClient.post.mockRejectedValue(new Error('Network error'));
      
      // Call logout and expect it not to throw (we don't want logout to fail)
      const result = await authService.logout();
      
      // Assert token was still removed despite API error
      expect(localStorage.getItem('authToken')).toBeNull();
      
      // Assert we still return success
      expect(result.success).toBe(true);
    });
  });
  
  describe('getAuthStatus', () => {
    it('should return authenticated:true when token exists', () => {
      // Setup token in localStorage
      localStorage.setItem('authToken', 'valid-token');
      
      // Check auth status
      const status = authService.getAuthStatus();
      
      // Assert authenticated status
      expect(status.authenticated).toBe(true);
    });
    
    it('should return authenticated:false when no token exists', () => {
      // Ensure no token in localStorage
      localStorage.removeItem('authToken');
      
      // Check auth status
      const status = authService.getAuthStatus();
      
      // Assert unauthenticated status
      expect(status.authenticated).toBe(false);
    });
  });
}); 