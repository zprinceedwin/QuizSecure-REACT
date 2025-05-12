import { rest } from 'msw'
import { setupServer } from 'msw/node'

// Mock API base URL
const API_BASE_URL = 'http://localhost:5000/api';

// Default handlers for API endpoints
export const handlers = [
  // Auth endpoints
  rest.post(`${API_BASE_URL}/auth/login`, (req, res, ctx) => {
    return res(
      ctx.json({
        success: true,
        token: 'mock-jwt-token',
        user: {
          id: '1',
          username: 'testuser',
          email: 'test@example.com',
          role: 'student'
        }
      })
    );
  }),
  
  rest.post(`${API_BASE_URL}/auth/logout`, (req, res, ctx) => {
    return res(
      ctx.json({
        success: true,
        message: 'Logged out successfully'
      })
    );
  }),
  
  // User endpoints
  rest.get(`${API_BASE_URL}/users/profile`, (req, res, ctx) => {
    return res(
      ctx.json({
        id: '1',
        username: 'testuser',
        email: 'test@example.com',
        role: 'student',
        createdAt: '2025-05-01T00:00:00.000Z'
      })
    );
  }),
  
  // Quiz endpoints
  rest.get(`${API_BASE_URL}/quizzes`, (req, res, ctx) => {
    return res(
      ctx.json({
        quizzes: [
          {
            id: '1',
            title: 'Math Quiz',
            description: 'Test your math skills',
            duration: 60,
            totalQuestions: 10,
            createdBy: 'instructor1',
            startDate: '2025-05-15T10:00:00.000Z',
            endDate: '2025-05-15T11:00:00.000Z'
          },
          {
            id: '2',
            title: 'Science Quiz',
            description: 'Basic science concepts',
            duration: 45,
            totalQuestions: 15,
            createdBy: 'instructor2',
            startDate: '2025-05-16T14:00:00.000Z',
            endDate: '2025-05-16T15:00:00.000Z'
          }
        ]
      })
    );
  }),
  
  rest.get(`${API_BASE_URL}/quizzes/:id`, (req, res, ctx) => {
    const { id } = req.params;
    return res(
      ctx.json({
        id,
        title: 'Math Quiz',
        description: 'Test your math skills',
        duration: 60,
        questions: [
          {
            id: '1',
            text: 'What is 2+2?',
            options: ['3', '4', '5', '6'],
            correctAnswer: '4',
            points: 1
          },
          {
            id: '2',
            text: 'What is 5×5?',
            options: ['20', '25', '30', '35'],
            correctAnswer: '25',
            points: 1
          }
        ]
      })
    );
  }),
  
  // Fallback for unhandled requests
  rest.all('*', (req, res, ctx) => {
    console.warn(`Unhandled request: ${req.method} ${req.url.toString()}`);
    return res(
      ctx.status(500),
      ctx.json({ error: 'Please add a request handler for this endpoint' })
    );
  })
];

// Set up the server with our handlers
export const server = setupServer(...handlers);

// Export a helper function to add custom handlers temporarily
export function addTemporaryHandlers(customHandlers, testFn) {
  beforeEach(() => {
    // Add temporary handlers for this test only
    server.use(...customHandlers);
  });
  
  afterEach(() => {
    // Reset to default handlers
    server.resetHandlers();
  });
  
  return testFn;
} 