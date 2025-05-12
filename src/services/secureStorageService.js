/**
 * Secure Storage Service
 * 
 * Provides encrypted storage for sensitive information in the Electron app.
 * Uses a simple encryption approach suitable for the prototype phase.
 */

// Encryption key (in a real app, this would be retrieved from a more secure source)
// For a prototype, we'll use a fixed key - in production, this could be derived from user credentials
const ENCRYPTION_KEY = 'QuizSecure_Prototype_Encryption_Key';

/**
 * Simple encryption function using XOR cipher with a key
 * @param {string} text - Text to encrypt
 * @param {string} key - Encryption key
 * @returns {string} - Encrypted text in base64
 */
function encrypt(text, key = ENCRYPTION_KEY) {
  // Convert text to array of character codes
  const textChars = [...text].map(c => c.charCodeAt(0));
  // Convert key to array of character codes
  const keyChars = [...key].map(c => c.charCodeAt(0));
  
  // XOR each character with corresponding key character
  const encryptedChars = textChars.map((char, index) => {
    // Use modulo to cycle through key characters
    return char ^ keyChars[index % keyChars.length];
  });
  
  // Convert to buffer and then to base64
  const buffer = new Uint8Array(encryptedChars);
  return btoa(String.fromCharCode(...buffer));
}

/**
 * Simple decryption function using XOR cipher with a key
 * @param {string} encryptedB64 - Encrypted text in base64
 * @param {string} key - Encryption key
 * @returns {string} - Decrypted text
 */
function decrypt(encryptedB64, key = ENCRYPTION_KEY) {
  try {
    // Convert from base64 to array of character codes
    const encryptedChars = [...atob(encryptedB64)].map(c => c.charCodeAt(0));
    // Convert key to array of character codes
    const keyChars = [...key].map(c => c.charCodeAt(0));
    
    // XOR each character with corresponding key character to decrypt
    const decryptedChars = encryptedChars.map((char, index) => {
      // Use modulo to cycle through key characters
      return char ^ keyChars[index % keyChars.length];
    });
    
    // Convert back to string
    return String.fromCharCode(...decryptedChars);
  } catch (error) {
    console.error('Decryption failed:', error);
    return null;
  }
}

/**
 * Securely store a value
 * @param {string} key - Storage key
 * @param {string} value - Value to store
 */
function setItem(key, value) {
  if (!key || value === undefined || value === null) return;
  
  try {
    // Encrypt the value
    const encryptedValue = encrypt(String(value));
    
    // Prefix the key to identify it as encrypted
    const prefixedKey = `secure_${key}`;
    
    // Store in localStorage
    localStorage.setItem(prefixedKey, encryptedValue);
    
    return true;
  } catch (error) {
    console.error(`Error storing secure value for key "${key}":`, error);
    return false;
  }
}

/**
 * Retrieve a securely stored value
 * @param {string} key - Storage key
 * @returns {string|null} - Retrieved value or null if not found/error
 */
function getItem(key) {
  if (!key) return null;
  
  try {
    // Get the prefixed key
    const prefixedKey = `secure_${key}`;
    
    // Get the encrypted value
    const encryptedValue = localStorage.getItem(prefixedKey);
    
    // If no value found, return null
    if (!encryptedValue) return null;
    
    // Decrypt and return
    return decrypt(encryptedValue);
  } catch (error) {
    console.error(`Error retrieving secure value for key "${key}":`, error);
    return null;
  }
}

/**
 * Remove a securely stored value
 * @param {string} key - Storage key
 */
function removeItem(key) {
  if (!key) return;
  
  try {
    // Remove using the prefixed key
    const prefixedKey = `secure_${key}`;
    localStorage.removeItem(prefixedKey);
    
    return true;
  } catch (error) {
    console.error(`Error removing secure value for key "${key}":`, error);
    return false;
  }
}

/**
 * Clear all securely stored values
 */
function clear() {
  try {
    // Get all keys from localStorage
    const keys = Object.keys(localStorage);
    
    // Remove all keys that start with our prefix
    keys.forEach(key => {
      if (key.startsWith('secure_')) {
        localStorage.removeItem(key);
      }
    });
    
    return true;
  } catch (error) {
    console.error('Error clearing secure storage:', error);
    return false;
  }
}

// Export the service
export const secureStorageService = {
  setItem,
  getItem,
  removeItem,
  clear
}; 