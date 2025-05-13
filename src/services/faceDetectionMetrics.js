/**
 * Face Detection Metrics Service
 * 
 * This module provides tools for measuring and analyzing the performance
 * of our face detection implementation, focusing on both accuracy and speed.
 */

// Track frame processing times
let processingTimes = [];
const maxStoredTimes = 100; // Store the last 100 frames

// Track detection results
let detectionResults = {
  totalFrames: 0,
  detectedFrames: 0,
  latestConfidence: 0,
  confidenceHistory: [],
  falseNegatives: 0, // Estimated based on sequence analysis
  falsePositives: 0,  // Estimated based on sequence analysis
  detectionGaps: 0,   // Number of times face detection was lost between successful detections
};

// Timing metrics
let metrics = {
  avgProcessingTime: 0,
  minProcessingTime: Number.MAX_VALUE,
  maxProcessingTime: 0,
  medianProcessingTime: 0,
  lastMeasurement: Date.now(),
  fps: 0,
};

/**
 * Record the start of frame processing
 * @returns {number} timestamp for tracking duration
 */
export const startProcessingTimer = () => {
  return performance.now();
};

/**
 * Record the end of frame processing and calculate metrics
 * @param {number} startTime - The timestamp from startProcessingTimer
 * @param {boolean} faceDetected - Whether a face was detected in this frame
 * @param {number} confidence - Detection confidence value (0-1)
 */
export const endProcessingTimer = (startTime, faceDetected, confidence = 0) => {
  const endTime = performance.now();
  const duration = endTime - startTime;
  
  // Update processing times
  processingTimes.push(duration);
  if (processingTimes.length > maxStoredTimes) {
    processingTimes.shift();
  }
  
  // Update detection results
  detectionResults.totalFrames++;
  if (faceDetected) {
    detectionResults.detectedFrames++;
    detectionResults.latestConfidence = confidence;
    detectionResults.confidenceHistory.push(confidence);
    
    if (detectionResults.confidenceHistory.length > maxStoredTimes) {
      detectionResults.confidenceHistory.shift();
    }
  }
  
  // Check for detection gaps (face lost between frames)
  if (!faceDetected && detectionResults.totalFrames > 1 && 
      (detectionResults.totalFrames - 1) === detectionResults.detectedFrames) {
    detectionResults.detectionGaps++;
  }
  
  // Calculate false positives/negatives (estimated)
  // A real implementation would have ground truth data
  // This is a simplified heuristic for demonstration
  if (detectionResults.confidenceHistory.length >= 3) {
    const recentResults = detectionResults.confidenceHistory.slice(-3);
    
    // If confidence suddenly drops to zero between high confidence detections
    // likely a false negative
    if (recentResults[0] > 0.7 && recentResults[1] < 0.2 && recentResults[2] > 0.7) {
      detectionResults.falseNegatives++;
    }
    
    // If confidence is unstable and jumps around, might indicate false positives
    if (recentResults[0] < 0.3 && recentResults[1] > 0.7 && recentResults[2] < 0.3) {
      detectionResults.falsePositives++;
    }
  }
  
  // Calculate FPS
  const now = Date.now();
  const timeElapsed = now - metrics.lastMeasurement;
  if (timeElapsed >= 1000) { // Update FPS once per second
    metrics.fps = Math.round((processingTimes.length / timeElapsed) * 1000);
    metrics.lastMeasurement = now;
  }
  
  // Update metrics
  updateMetrics();
};

/**
 * Reset all metrics and counters
 */
export const resetMetrics = () => {
  processingTimes = [];
  detectionResults = {
    totalFrames: 0,
    detectedFrames: 0,
    latestConfidence: 0,
    confidenceHistory: [],
    falseNegatives: 0,
    falsePositives: 0,
    detectionGaps: 0,
  };
  
  metrics = {
    avgProcessingTime: 0,
    minProcessingTime: Number.MAX_VALUE,
    maxProcessingTime: 0,
    medianProcessingTime: 0,
    lastMeasurement: Date.now(),
    fps: 0,
  };
};

/**
 * Update calculated metrics based on stored measurements
 * @private
 */
const updateMetrics = () => {
  if (processingTimes.length === 0) return;
  
  // Calculate average processing time
  const sum = processingTimes.reduce((acc, time) => acc + time, 0);
  metrics.avgProcessingTime = sum / processingTimes.length;
  
  // Find min and max processing times
  metrics.minProcessingTime = Math.min(...processingTimes);
  metrics.maxProcessingTime = Math.max(...processingTimes);
  
  // Calculate median
  const sorted = [...processingTimes].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  metrics.medianProcessingTime = 
    sorted.length % 2 === 0
      ? (sorted[middle - 1] + sorted[middle]) / 2
      : sorted[middle];
};

/**
 * Get current face detection metrics
 * @returns {Object} Current metrics and detection results
 */
export const getMetrics = () => {
  return {
    performance: {
      fps: metrics.fps,
      avgProcessingTime: metrics.avgProcessingTime.toFixed(2) + "ms",
      minProcessingTime: metrics.minProcessingTime.toFixed(2) + "ms",
      maxProcessingTime: metrics.maxProcessingTime.toFixed(2) + "ms",
      medianProcessingTime: metrics.medianProcessingTime.toFixed(2) + "ms",
    },
    detection: {
      totalFrames: detectionResults.totalFrames,
      detectionRate: detectionResults.totalFrames > 0 
        ? ((detectionResults.detectedFrames / detectionResults.totalFrames) * 100).toFixed(2) + "%" 
        : "0%",
      averageConfidence: detectionResults.confidenceHistory.length > 0
        ? (detectionResults.confidenceHistory.reduce((acc, conf) => acc + conf, 0) / 
           detectionResults.confidenceHistory.length).toFixed(2)
        : 0,
      detectionGaps: detectionResults.detectionGaps,
      estimatedFalseNegatives: detectionResults.falseNegatives,
      estimatedFalsePositives: detectionResults.falsePositives,
    }
  };
};

/**
 * Log face detection metrics to console (for development)
 */
export const logMetrics = () => {
  console.log("Face Detection Metrics:", getMetrics());
};

/**
 * Record detailed metrics to file or backend (placeholder for actual implementation)
 * @param {string} testContext - Additional context for the test (lighting, angles, etc.)
 */
export const recordDetailedMetrics = (testContext = "default") => {
  // In a real implementation, this would send metrics to backend
  console.log(`Recording metrics for test context: ${testContext}`, getMetrics());
  
  // For now, just save to localStorage for demo purposes
  const savedMetrics = JSON.parse(localStorage.getItem('faceDetectionMetrics') || '{}');
  savedMetrics[`test_${Date.now()}`] = {
    context: testContext,
    timestamp: new Date().toISOString(),
    metrics: getMetrics()
  };
  localStorage.setItem('faceDetectionMetrics', JSON.stringify(savedMetrics));
  
  return getMetrics();
}; 