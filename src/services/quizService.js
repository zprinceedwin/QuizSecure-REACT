// src/services/quizService.js
import { apiClient } from './apiClient';
import { offlineManager } from './offlineManager';
import { USE_MOCK_DATA, VERBOSE_LOGGING } from './config';

// Cache key constants
const CACHE_KEYS = {
  ALL_QUIZZES: offlineManager.CACHE_KEYS.QUIZZES,
  QUIZ_DETAILS_PREFIX: 'offline_quiz_detail_'
};

// Mock data for fallback/testing
const MOCK_QUIZZES = [
  { id: 'q1', title: 'General Knowledge Quiz', description: 'Test your general knowledge.', questionCount: 10 },
  { id: 'q2', title: 'React Basics Quiz', description: 'A quiz on fundamental React concepts.', questionCount: 15 },
];

const MOCK_QUIZ_DETAILS = {
  'q1': { 
    id: 'q1', 
    title: 'General Knowledge Quiz', 
    description: 'Test your general knowledge.', 
    questions: [
      { id: 'q1_1', text: 'What is the capital of France?', type: 'multiple-choice', options: ['Berlin', 'Madrid', 'Paris', 'Rome'] },
      { id: 'q1_2', text: 'Who painted the Mona Lisa?', type: 'short-answer' },
    ] 
  },
  'q2': {
    id: 'q2', 
    title: 'React Basics Quiz', 
    description: 'A quiz on fundamental React concepts.', 
    questions: [
      { id: 'q2_1', text: 'What hook is used for side effects in React?', type: 'multiple-choice', options: ['useEffect', 'useState', 'useContext', 'useReducer'] },
      { id: 'q2_2', text: 'What is JSX?', type: 'short-answer' },
    ]
  }
};

/**
 * Initialize offline data cache with mock data if not already present
 */
function initOfflineData() {
  // Initialize all quizzes cache if not present
  const cachedQuizzes = offlineManager.getCachedData(CACHE_KEYS.ALL_QUIZZES);
  if (!cachedQuizzes) {
    if (VERBOSE_LOGGING) console.log('quizService: Initializing offline quiz cache with mock data');
    offlineManager.cacheData(CACHE_KEYS.ALL_QUIZZES, MOCK_QUIZZES);
    
    // Also cache individual quiz details
    Object.entries(MOCK_QUIZ_DETAILS).forEach(([quizId, quizDetail]) => {
      const quizDetailKey = `${CACHE_KEYS.QUIZ_DETAILS_PREFIX}${quizId}`;
      offlineManager.cacheData(quizDetailKey, quizDetail);
    });
  }
}

// Initialize offline data when module is loaded
initOfflineData();

/**
 * Fetches a list of all available quizzes.
 * Uses real API with fallback to mock data for prototype.
 * @returns {Promise<Array<any>>}
 */
async function getAllQuizzes() {
  if (USE_MOCK_DATA) {
    if (VERBOSE_LOGGING) console.log('quizService.getAllQuizzes using MOCK data');
    // Cache mock data for offline use
    offlineManager.cacheData(CACHE_KEYS.ALL_QUIZZES, MOCK_QUIZZES);
    return Promise.resolve(MOCK_QUIZZES);
  }

  try {
    if (VERBOSE_LOGGING) console.log('quizService.getAllQuizzes fetching from API: /quizzes');
    // Use the cache key for offline capability
    const response = await apiClient.get('/quizzes', {}, CACHE_KEYS.ALL_QUIZZES);
    return response;
  } catch (error) {
    console.warn('API call failed, falling back to mock data:', error);
    
    // Try to get from offline cache first
    const cachedQuizzes = offlineManager.getCachedData(CACHE_KEYS.ALL_QUIZZES);
    if (cachedQuizzes) {
      if (VERBOSE_LOGGING) console.log('quizService.getAllQuizzes returning cached data');
      return cachedQuizzes;
    }
    
    // If no cached data, use mock data
    return MOCK_QUIZZES;
  }
}

/**
 * Fetches a single quiz by its ID.
 * Uses real API with fallback to mock data for prototype.
 * @param {string} quizId - The ID of the quiz to fetch.
 * @returns {Promise<any>}
 */
async function getQuizById(quizId) {
  const quizDetailKey = `${CACHE_KEYS.QUIZ_DETAILS_PREFIX}${quizId}`;
  
  if (USE_MOCK_DATA) {
    if (VERBOSE_LOGGING) console.log(`quizService.getQuizById using MOCK data for ID: ${quizId}`);
    
    // Cache this quiz detail for offline use
    if (MOCK_QUIZ_DETAILS[quizId]) {
      offlineManager.cacheData(quizDetailKey, MOCK_QUIZ_DETAILS[quizId]);
    }
    
    return Promise.resolve(MOCK_QUIZ_DETAILS[quizId] || null);
  }

  try {
    if (VERBOSE_LOGGING) console.log(`quizService.getQuizById fetching from API: /quizzes/${quizId}`);
    // Use the cache key for offline capability
    const response = await apiClient.get(`/quizzes/${quizId}`, {}, quizDetailKey);
    return response;
  } catch (error) {
    console.warn(`API call failed for quiz ID ${quizId}, falling back to mock data:`, error);
    
    // Try to get from offline cache first
    const cachedQuizDetail = offlineManager.getCachedData(quizDetailKey);
    if (cachedQuizDetail) {
      if (VERBOSE_LOGGING) console.log(`quizService.getQuizById returning cached data for ID: ${quizId}`);
      return cachedQuizDetail;
    }
    
    // If no cached data, use mock data
    return MOCK_QUIZ_DETAILS[quizId] || null;
  }
}

/**
 * Submits quiz answers for a student.
 * Uses real API with fallback to mock response for prototype.
 * @param {string} quizId - The ID of the quiz.
 * @param {Array<any>} answers - The student's answers.
 * @returns {Promise<any>}
 */
async function submitQuizAnswers(quizId, answers) {
  if (USE_MOCK_DATA) {
    if (VERBOSE_LOGGING) console.log(`quizService.submitQuizAnswers using MOCK response for quiz ID: ${quizId}`, answers);
    return Promise.resolve({ success: true, message: 'Quiz submitted successfully (mock response).' });
  }

  try {
    if (VERBOSE_LOGGING) console.log(`quizService.submitQuizAnswers posting to API: /quizzes/${quizId}/submit`, answers);
    const response = await apiClient.post(`/quizzes/${quizId}/submit`, { answers });
    
    // If this was queued for offline processing, show a message
    if (response.queued) {
      return { 
        ...response, 
        message: 'Quiz answers saved and will be submitted when you\'re back online.' 
      };
    }
    
    return response;
  } catch (error) {
    console.warn(`API call failed for submitting quiz ${quizId}, using mock response:`, error);
    return { success: true, message: 'Quiz submitted successfully (mock fallback).' };
  }
}

/**
 * Creates a new quiz in the system.
 * @param {Object} quizData - The quiz data to create
 * @returns {Promise<any>} - The created quiz
 */
async function createQuiz(quizData) {
  if (USE_MOCK_DATA) {
    if (VERBOSE_LOGGING) console.log('quizService.createQuiz using MOCK response', quizData);
    
    // Generate a random ID for the new quiz
    const newId = `q${Math.floor(Math.random() * 1000)}`;
    const newQuiz = {
      id: newId,
      ...quizData,
    };
    
    // Add to mock data (this won't persist across page reloads but works for immediate UI feedback)
    MOCK_QUIZZES.push({
      id: newId,
      title: quizData.title,
      description: quizData.description,
      questionCount: quizData.questions ? quizData.questions.length : 0
    });
    
    if (quizData.questions) {
      MOCK_QUIZ_DETAILS[newId] = newQuiz;
    }
    
    // Update the offline cache with the new quiz
    offlineManager.cacheData(CACHE_KEYS.ALL_QUIZZES, MOCK_QUIZZES);
    offlineManager.cacheData(`${CACHE_KEYS.QUIZ_DETAILS_PREFIX}${newId}`, newQuiz);
    
    return Promise.resolve(newQuiz);
  }

  try {
    if (VERBOSE_LOGGING) console.log('quizService.createQuiz posting to API: /quizzes', quizData);
    const response = await apiClient.post('/quizzes', quizData);
    
    // If this was a successful operation (not queued), update our cache
    if (response && response.id && !response.queued) {
      // Get the latest quizzes list to update cache
      getAllQuizzes().catch(() => {});
      
      // Cache this new quiz detail
      const quizDetailKey = `${CACHE_KEYS.QUIZ_DETAILS_PREFIX}${response.id}`;
      offlineManager.cacheData(quizDetailKey, response);
    }
    
    // If this was queued for offline processing, show a message
    if (response.queued) {
      return { 
        ...response, 
        message: 'Quiz created and will be synced when you\'re back online.' 
      };
    }
    
    return response;
  } catch (error) {
    console.warn('API call failed for creating quiz, using mock response:', error);
    // Simulate a successful creation with mock data
    const newId = `q${Math.floor(Math.random() * 1000)}`;
    return {
      id: newId,
      ...quizData,
      message: 'Quiz created successfully (mock fallback).'
    };
  }
}

/**
 * Updates an existing quiz.
 * @param {string} quizId - The ID of the quiz to update
 * @param {Object} quizData - The updated quiz data
 * @returns {Promise<any>} - The updated quiz
 */
async function updateQuiz(quizId, quizData) {
  if (USE_MOCK_DATA) {
    if (VERBOSE_LOGGING) console.log(`quizService.updateQuiz using MOCK response for ID: ${quizId}`, quizData);
    
    // Find the quiz in mock data
    const quizIndex = MOCK_QUIZZES.findIndex(q => q.id === quizId);
    if (quizIndex >= 0) {
      // Update the quiz in the list
      MOCK_QUIZZES[quizIndex] = {
        ...MOCK_QUIZZES[quizIndex],
        title: quizData.title || MOCK_QUIZZES[quizIndex].title,
        description: quizData.description || MOCK_QUIZZES[quizIndex].description,
        questionCount: quizData.questions ? quizData.questions.length : MOCK_QUIZZES[quizIndex].questionCount
      };
      
      // Update quiz details if they exist
      if (MOCK_QUIZ_DETAILS[quizId]) {
        MOCK_QUIZ_DETAILS[quizId] = {
          ...MOCK_QUIZ_DETAILS[quizId],
          ...quizData,
          id: quizId // Ensure ID remains unchanged
        };
      }
      
      // Update the offline cache
      offlineManager.cacheData(CACHE_KEYS.ALL_QUIZZES, MOCK_QUIZZES);
      offlineManager.cacheData(`${CACHE_KEYS.QUIZ_DETAILS_PREFIX}${quizId}`, MOCK_QUIZ_DETAILS[quizId]);
      
      return Promise.resolve({
        ...MOCK_QUIZ_DETAILS[quizId],
        message: 'Quiz updated successfully (mock response).'
      });
    }
    
    return Promise.reject(new Error(`Quiz with ID ${quizId} not found`));
  }

  try {
    if (VERBOSE_LOGGING) console.log(`quizService.updateQuiz putting to API: /quizzes/${quizId}`, quizData);
    const response = await apiClient.put(`/quizzes/${quizId}`, quizData);
    
    // If this was a successful operation (not queued), update our cache
    if (response && !response.queued) {
      // Get the latest quizzes list to update cache
      getAllQuizzes().catch(() => {});
      
      // Update this quiz's detail cache
      const quizDetailKey = `${CACHE_KEYS.QUIZ_DETAILS_PREFIX}${quizId}`;
      const existingCache = offlineManager.getCachedData(quizDetailKey);
      if (existingCache) {
        offlineManager.cacheData(quizDetailKey, {
          ...existingCache,
          ...response
        });
      }
    }
    
    // If this was queued for offline processing, show a message
    if (response.queued) {
      return { 
        ...response, 
        message: 'Quiz updated and will be synced when you\'re back online.' 
      };
    }
    
    return response;
  } catch (error) {
    console.warn(`API call failed for updating quiz ${quizId}, using mock response:`, error);
    
    // For testing UI, return a mock successful response
    return {
      id: quizId,
      ...quizData,
      message: 'Quiz updated successfully (mock fallback).'
    };
  }
}

/**
 * Deletes a quiz from the system.
 * @param {string} quizId - The ID of the quiz to delete
 * @returns {Promise<any>} - Confirmation of deletion
 */
async function deleteQuiz(quizId) {
  if (USE_MOCK_DATA) {
    if (VERBOSE_LOGGING) console.log(`quizService.deleteQuiz using MOCK response for ID: ${quizId}`);
    
    // Filter out the quiz from mock data
    const quizIndex = MOCK_QUIZZES.findIndex(q => q.id === quizId);
    if (quizIndex >= 0) {
      MOCK_QUIZZES.splice(quizIndex, 1);
      
      // Remove from details if it exists
      if (MOCK_QUIZ_DETAILS[quizId]) {
        delete MOCK_QUIZ_DETAILS[quizId];
      }
      
      // Update the offline cache
      offlineManager.cacheData(CACHE_KEYS.ALL_QUIZZES, MOCK_QUIZZES);
      offlineManager.clearCache(`${CACHE_KEYS.QUIZ_DETAILS_PREFIX}${quizId}`);
      
      return Promise.resolve({ success: true, message: 'Quiz deleted successfully (mock response).' });
    }
    
    return Promise.reject(new Error(`Quiz with ID ${quizId} not found`));
  }

  try {
    if (VERBOSE_LOGGING) console.log(`quizService.deleteQuiz sending DELETE to API: /quizzes/${quizId}`);
    const response = await apiClient.delete(`/quizzes/${quizId}`);
    
    // If this was a successful operation (not queued), update our cache
    if (response && response.success && !response.queued) {
      // Get the latest quizzes list to update cache
      getAllQuizzes().catch(() => {});
      
      // Remove this quiz from the detail cache
      offlineManager.clearCache(`${CACHE_KEYS.QUIZ_DETAILS_PREFIX}${quizId}`);
    }
    
    // If this was queued for offline processing, show a message
    if (response.queued) {
      return { 
        ...response, 
        message: 'Quiz deletion will be processed when you\'re back online.' 
      };
    }
    
    return response;
  } catch (error) {
    console.warn(`API call failed for deleting quiz ${quizId}, using mock response:`, error);
    return { success: true, message: 'Quiz deleted successfully (mock fallback).' };
  }
}

/**
 * Adds a new question to an existing quiz.
 * @param {string} quizId - The ID of the quiz
 * @param {Object} questionData - The new question data
 * @returns {Promise<any>} - The updated quiz with the new question
 */
async function addQuestionToQuiz(quizId, questionData) {
  if (USE_MOCK_DATA) {
    if (VERBOSE_LOGGING) console.log(`quizService.addQuestionToQuiz using MOCK response for quiz ID: ${quizId}`, questionData);
    
    if (!MOCK_QUIZ_DETAILS[quizId]) {
      return Promise.reject(new Error(`Quiz with ID ${quizId} not found`));
    }
    
    // Generate question ID
    const questionId = `${quizId}_${MOCK_QUIZ_DETAILS[quizId].questions.length + 1}`;
    const newQuestion = {
      id: questionId,
      ...questionData
    };
    
    // Add question to quiz
    MOCK_QUIZ_DETAILS[quizId].questions.push(newQuestion);
    
    // Update question count in the quiz list
    const quizIndex = MOCK_QUIZZES.findIndex(q => q.id === quizId);
    if (quizIndex >= 0) {
      MOCK_QUIZZES[quizIndex].questionCount = MOCK_QUIZ_DETAILS[quizId].questions.length;
    }
    
    // Update the offline cache
    offlineManager.cacheData(CACHE_KEYS.ALL_QUIZZES, MOCK_QUIZZES);
    offlineManager.cacheData(`${CACHE_KEYS.QUIZ_DETAILS_PREFIX}${quizId}`, MOCK_QUIZ_DETAILS[quizId]);
    
    return Promise.resolve({
      ...MOCK_QUIZ_DETAILS[quizId],
      message: 'Question added successfully (mock response).'
    });
  }

  try {
    if (VERBOSE_LOGGING) console.log(`quizService.addQuestionToQuiz posting to API: /quizzes/${quizId}/questions`, questionData);
    const response = await apiClient.post(`/quizzes/${quizId}/questions`, questionData);
    
    // If this was a successful operation (not queued), update our cache
    if (response && !response.queued) {
      // Fetch updated quiz details to refresh the cache
      getQuizById(quizId).catch(() => {});
    }
    
    // If this was queued for offline processing, show a message
    if (response.queued) {
      return { 
        ...response, 
        message: 'Question added and will be synced when you\'re back online.' 
      };
    }
    
    return response;
  } catch (error) {
    console.warn(`API call failed for adding question to quiz ${quizId}, using mock response:`, error);
    
    // Mock a successful response for UI testing
    return {
      message: 'Question added successfully (mock fallback).',
      questionId: `${quizId}_new`,
      ...questionData
    };
  }
}

/**
 * Removes a question from a quiz.
 * @param {string} quizId - The ID of the quiz
 * @param {string} questionId - The ID of the question to remove
 * @returns {Promise<any>} - Confirmation of removal
 */
async function removeQuestionFromQuiz(quizId, questionId) {
  if (USE_MOCK_DATA) {
    if (VERBOSE_LOGGING) console.log(`quizService.removeQuestionFromQuiz using MOCK response for quiz ID: ${quizId}, question ID: ${questionId}`);
    
    if (!MOCK_QUIZ_DETAILS[quizId]) {
      return Promise.reject(new Error(`Quiz with ID ${quizId} not found`));
    }
    
    // Filter out the question
    const originalLength = MOCK_QUIZ_DETAILS[quizId].questions.length;
    MOCK_QUIZ_DETAILS[quizId].questions = MOCK_QUIZ_DETAILS[quizId].questions.filter(q => q.id !== questionId);
    
    // Update question count in the quiz list
    const quizIndex = MOCK_QUIZZES.findIndex(q => q.id === quizId);
    if (quizIndex >= 0) {
      MOCK_QUIZZES[quizIndex].questionCount = MOCK_QUIZ_DETAILS[quizId].questions.length;
    }
    
    // Update the offline cache
    offlineManager.cacheData(CACHE_KEYS.ALL_QUIZZES, MOCK_QUIZZES);
    offlineManager.cacheData(`${CACHE_KEYS.QUIZ_DETAILS_PREFIX}${quizId}`, MOCK_QUIZ_DETAILS[quizId]);
    
    if (MOCK_QUIZ_DETAILS[quizId].questions.length === originalLength) {
      return Promise.reject(new Error(`Question with ID ${questionId} not found in quiz ${quizId}`));
    }
    
    return Promise.resolve({
      success: true, 
      message: 'Question removed successfully (mock response).'
    });
  }

  try {
    if (VERBOSE_LOGGING) console.log(`quizService.removeQuestionFromQuiz sending DELETE to API: /quizzes/${quizId}/questions/${questionId}`);
    const response = await apiClient.delete(`/quizzes/${quizId}/questions/${questionId}`);
    
    // If this was a successful operation (not queued), update our cache
    if (response && response.success && !response.queued) {
      // Fetch updated quiz details to refresh the cache
      getQuizById(quizId).catch(() => {});
    }
    
    // If this was queued for offline processing, show a message
    if (response.queued) {
      return { 
        ...response, 
        message: 'Question removal will be processed when you\'re back online.' 
      };
    }
    
    return response;
  } catch (error) {
    console.warn(`API call failed for removing question ${questionId} from quiz ${quizId}, using mock response:`, error);
    return { success: true, message: 'Question removed successfully (mock fallback).' };
  }
}

/**
 * Force synchronization of any queued quiz operations
 * @returns {Promise<any>} Result of the synchronization attempt
 */
async function synchronize() {
  return apiClient.synchronize();
}

// Expose service to window for console testing
if (typeof window !== 'undefined') {
  window.quizService = quizService;
}

export const quizService = {
  getAllQuizzes,
  getQuizById,
  submitQuizAnswers,
  createQuiz,
  updateQuiz,
  deleteQuiz,
  addQuestionToQuiz,
  removeQuestionFromQuiz,
  synchronize
}; 