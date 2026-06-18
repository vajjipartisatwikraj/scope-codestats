/**
 * Check if JavaScript execution should be disabled for security reasons
 * This can be used to prevent execution in certain environments or for certain users
 * 
 * @returns {boolean} Whether JavaScript execution should be disabled
 */
export const isJavaScriptExecutionDisabled = () => {
  // For enhanced security, you could check URL parameters, environment variables, or user permissions
  // This is a placeholder implementation that always allows execution
  return false;
};

/**
 * Sanitize string input to prevent XSS attacks
 * 
 * @param {string} input The string to sanitize
 * @returns {string} Sanitized string
 */
export const sanitizeInput = (input) => {
  if (!input || typeof input !== 'string') return '';
  
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

/**
 * Validates if a URL is safe (no javascript: protocol, etc.)
 * 
 * @param {string} url The URL to validate
 * @returns {boolean} Whether the URL is safe
 */
export const isUrlSafe = (url) => {
  if (!url || typeof url !== 'string') return false;
  
  // Check for javascript: protocol and other potentially dangerous ones
  const dangerousProtocols = ['javascript:', 'data:', 'vbscript:'];
  const lowerUrl = url.toLowerCase().trim();
  
  for (const protocol of dangerousProtocols) {
    if (lowerUrl.startsWith(protocol)) {
      return false;
    }
  }
  
  return true;
};

/**
 * Secure JSON parsing with error handling
 * 
 * @param {string} jsonString JSON string to parse
 * @param {any} defaultValue Default value to return if parsing fails
 * @returns {any} Parsed JSON or default value
 */
export const safeJSONParse = (jsonString, defaultValue = null) => {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('Error parsing JSON:', error);
    return defaultValue;
  }
}; 