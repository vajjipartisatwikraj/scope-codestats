/**
 * Format execution time into a human-readable string
 * @param {number} ms Execution time in milliseconds
 * @returns {string} Formatted time string
 */
export const formatTime = (ms) => {
  // Handle invalid input
  if (ms === undefined || ms === null) return 'N/A';
  
  // Convert to number if it's a string
  const msNum = typeof ms === 'string' ? parseFloat(ms) : ms;
  
  // Validate it's actually a number
  if (isNaN(msNum)) return 'N/A';
  
  // Handle zero
  if (msNum === 0) return '0 ms';
  
  // Use appropriate units based on the value
  if (msNum < 1) {
    // Convert to microseconds
    return `${(msNum * 1000).toFixed(2)} μs`;
  } else if (msNum < 1000) {
    // Display as milliseconds
    return `${msNum.toFixed(2)} ms`;
  } else {
    // Convert to seconds for readability
    return `${(msNum / 1000).toFixed(2)} s`;
  }
};

/**
 * Format memory usage into a human-readable string
 * @param {number} kb Memory usage in kilobytes
 * @returns {string} Formatted memory string
 */
export const formatMemory = (kb) => {
  if (kb === undefined || kb === null) return 'N/A';
  
  // Convert to number if it's a string
  const kbNum = typeof kb === 'string' ? parseFloat(kb) : kb;
  
  // Validate it's actually a number
  if (isNaN(kbNum)) return 'N/A';
  
  // Handle zero
  if (kbNum === 0) return '0 KB';
  
  // Use appropriate units based on the value
  if (kbNum < 1) return '< 1 KB';
  if (kbNum < 1024) return `${Math.round(kbNum)} KB`;
  return `${(kbNum / 1024).toFixed(2)} MB`;
};

/**
 * Format date to a human-readable string
 * @param {string|Date} date Date to format
 * @returns {string} Formatted date string
 */
export const formatDate = (date) => {
  if (!date) return 'N/A';
  
  try {
    const dateObj = new Date(date);
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid Date';
  }
};

/**
 * Format a number with commas as thousands separators
 * @param {number} number Number to format
 * @returns {string} Formatted number string
 */
export const formatNumber = (number) => {
  if (number === undefined || number === null) return 'N/A';
  
  try {
    return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  } catch (error) {
    return 'N/A';
  }
};

/**
 * Format a percentage with specified decimal places
 * @param {number} value Value to format as percentage
 * @param {number} decimals Number of decimal places
 * @returns {string} Formatted percentage string
 */
export const formatPercentage = (value, decimals = 1) => {
  if (value === undefined || value === null) return 'N/A';
  
  try {
    return `${parseFloat(value).toFixed(decimals)}%`;
  } catch (error) {
    return 'N/A';
  }
}; 