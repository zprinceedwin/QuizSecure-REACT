/**
 * URL Validator Utility
 * Provides functions for validating and sanitizing URLs
 */

// Safe MIME types for data URLs
const SAFE_DATA_MIME_TYPES = [
  'image/png', 
  'image/jpeg', 
  'image/gif', 
  'image/webp', 
  'image/svg+xml'
];

// Protocol allowlist for application
const SAFE_PROTOCOLS = ['https:', 'http:', 'file:', 'chrome:', 'data:'];

// Dangerous URL patterns that may indicate an attack
const DANGEROUS_PATTERNS = [
  /(javascript|vbscript|data:text\/html)/i,  // Script injection
  /%2[Ee]/, // URL encoded .
  /\/\/\//,  // Path traversal attempts
  /\\\\/,    // Backslash for path manipulation
  /<.*>/     // Potential HTML injection
];

/**
 * Validates if a URL is considered safe based on protocol and allowlist
 * @param {string} url - The URL to validate
 * @param {Array<string>} allowedHosts - Optional array of allowed hostnames
 * @returns {boolean} True if the URL is considered safe
 */
function isSafeUrl(url, allowedHosts = []) {
  try {
    // Basic validation
    if (!url || typeof url !== 'string') {
      return false;
    }
    
    // Check for dangerous patterns in URL
    if (DANGEROUS_PATTERNS.some(pattern => pattern.test(url))) {
      console.warn('URL rejected due to dangerous pattern:', url);
      return false;
    }
    
    // Create URL object for parsing
    const parsedUrl = new URL(url);
    
    // Only allow specific protocols
    if (!SAFE_PROTOCOLS.includes(parsedUrl.protocol)) {
      return false;
    }
    
    // If data: URL, only allow safe MIME types
    if (parsedUrl.protocol === 'data:') {
      const dataParts = url.split(',')[0].split(':')[1].split(';');
      const mimeType = dataParts[0];
      return SAFE_DATA_MIME_TYPES.includes(mimeType);
    }
    
    // For http/https URLs, check against allowlist if provided
    if ((parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:') && allowedHosts.length > 0) {
      return allowedHosts.some(host => {
        // Check if host is exact match or wildcard subdomain
        if (host.startsWith('*.')) {
          const domain = host.substring(2);
          return parsedUrl.hostname === domain || parsedUrl.hostname.endsWith('.' + domain);
        }
        return parsedUrl.hostname === host;
      });
    }
    
    // For file: protocol verify it's in a safe location
    if (parsedUrl.protocol === 'file:') {
      // In a real app, check if the path is in an allowed directory
      // This is a simplistic check - production apps should verify against app directory
      const appPath = __dirname.replace(/\\/g, '/'); // Normalize slashes
      const filePath = parsedUrl.pathname.replace(/\\/g, '/');
      
      // Check if filePath is within app directory
      if (process.platform === 'win32') {
        // On Windows, file URLs look like file:///C:/path/to/file
        // Need to handle drive letters differently
        const normalizedFilePath = filePath.replace(/^\/*/, ''); // Remove leading slashes
        if (!normalizedFilePath.toLowerCase().startsWith(appPath.toLowerCase())) {
          console.warn('File URL rejected, outside app directory:', url);
          return false;
        }
      } else {
        // Unix-like OS
        if (!filePath.startsWith(appPath)) {
          console.warn('File URL rejected, outside app directory:', url);
          return false;
        }
      }
    }
    
    // Allow http/https when no allowlist is provided
    if ((parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:')) {
      return true;
    }
    
    return true;
  } catch (error) {
    // If URL parsing fails, consider it unsafe
    console.error('URL validation error:', error);
    return false;
  }
}

/**
 * Sanitizes a URL to make it safer
 * @param {string} url - The URL to sanitize
 * @returns {string|null} Sanitized URL or null if URL is deemed unsafe
 */
function sanitizeUrl(url) {
  try {
    // Basic checks
    if (!url || typeof url !== 'string') {
      return null;
    }
    
    // Trim the URL
    const trimmedUrl = url.trim();
    
    // Check for javascript: or other unsafe protocols
    if (/^(javascript|vbscript|data(?!:image\/)|file|blob):/i.test(trimmedUrl)) {
      return null;
    }
    
    // Remove all whitespace
    let sanitized = trimmedUrl.replace(/\s/g, '');
    
    // Remove common XSS patterns
    sanitized = sanitized.replace(/<.*>/g, '');
    
    // Allow data URLs for images
    if (sanitized.startsWith('data:image/')) {
      // Verify it's actually a valid data URL with an allowed image type
      const dataParts = sanitized.split(',');
      if (dataParts.length >= 2) {
        const mimeTypeInfo = dataParts[0].split(':')[1];
        if (mimeTypeInfo) {
          const mimeTypeParts = mimeTypeInfo.split(';');
          const mimeType = mimeTypeParts[0];
          if (SAFE_DATA_MIME_TYPES.includes(mimeType)) {
            return sanitized;
          }
        }
      }
      return null;
    }
    
    // For http/https URLs, parse and reconstruct to remove potential malicious parts
    if (sanitized.startsWith('http:') || sanitized.startsWith('https:')) {
      try {
        const parsedUrl = new URL(sanitized);
        
        // Remove any fragment or hash from the URL (often used for XSS)
        parsedUrl.hash = '';
        
        // Check for suspicious query parameters and remove them
        const suspiciousParams = ['script', 'eval', 'exec', 'alert', 'confirm', 'prompt'];
        for (const param of suspiciousParams) {
          if (parsedUrl.searchParams.has(param)) {
            parsedUrl.searchParams.delete(param);
          }
        }
        
        // Remove any suspicious port numbers
        if (parsedUrl.port && !['80', '443', '8080', '8443'].includes(parsedUrl.port)) {
          parsedUrl.port = '';
        }
        
        // Return the clean URL
        return parsedUrl.toString();
      } catch (e) {
        // If parsing fails, it's likely malformed
        console.error('Error sanitizing URL:', e);
        return null;
      }
    }
    
    // If it's not http/https/data:image, and passed the initial check, return as is
    return sanitized;
  } catch (error) {
    console.error('URL sanitization error:', error);
    return null;
  }
}

/**
 * Validates an origin (protocol + host)
 * @param {string} origin - The origin to validate
 * @param {Array<string>} allowedOrigins - Array of allowed origins or patterns
 * @returns {boolean} True if the origin is allowed
 */
function isAllowedOrigin(origin, allowedOrigins) {
  try {
    // Basic validation
    if (!origin || typeof origin !== 'string') {
      return false;
    }
    
    // Create URL object for parsing
    // Add a path to make URL parsing work (origins don't have paths)
    const parsedUrl = new URL(origin + '/');
    
    // Extract just the origin part
    const urlOrigin = `${parsedUrl.protocol}//${parsedUrl.host}`;
    
    // Check against allowed origins
    return allowedOrigins.some(allowedOrigin => {
      // Exact match
      if (allowedOrigin === urlOrigin) {
        return true;
      }
      
      // Wildcard subdomain match
      if (allowedOrigin.includes('*')) {
        const pattern = allowedOrigin.replace('*.', '(.+\\.)?');
        const regex = new RegExp(`^${pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&')}$`);
        return regex.test(urlOrigin);
      }
      
      return false;
    });
  } catch (error) {
    console.error('Origin validation error:', error);
    return false;
  }
}

/**
 * Validates and enforces URL schema integrity
 * @param {Object} requestedSchema - The schema requested
 * @param {string} url - The URL to validate
 * @returns {boolean} True if the URL matches the requested schema
 */
function validateUrlSchema(requestedSchema, url) {
  try {
    if (!url || typeof url !== 'string') {
      return false;
    }
    
    const parsedUrl = new URL(url);
    
    // Compare protocol
    if (requestedSchema.protocol && parsedUrl.protocol !== requestedSchema.protocol) {
      return false;
    }
    
    // Compare hostname
    if (requestedSchema.hostname) {
      if (requestedSchema.hostname.startsWith('*.')) {
        // Wildcard subdomain match
        const domain = requestedSchema.hostname.substring(2);
        if (parsedUrl.hostname !== domain && !parsedUrl.hostname.endsWith('.' + domain)) {
          return false;
        }
      } else if (parsedUrl.hostname !== requestedSchema.hostname) {
        return false;
      }
    }
    
    // Compare port
    if (requestedSchema.port && parsedUrl.port !== requestedSchema.port) {
      return false;
    }
    
    // Compare path prefix
    if (requestedSchema.pathPrefix && !parsedUrl.pathname.startsWith(requestedSchema.pathPrefix)) {
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('URL schema validation error:', error);
    return false;
  }
}

/**
 * Creates a URL matcher function for a specific schema
 * @param {Object} schema - Schema definition with protocol, hostname, etc.
 * @returns {Function} A function that tests if a URL matches the schema
 */
function createUrlMatcher(schema) {
  return (url) => validateUrlSchema(schema, url);
}

module.exports = {
  isSafeUrl,
  sanitizeUrl,
  isAllowedOrigin,
  validateUrlSchema,
  createUrlMatcher,
  SAFE_PROTOCOLS,
  SAFE_DATA_MIME_TYPES
}; 