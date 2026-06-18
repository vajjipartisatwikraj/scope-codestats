/**
 * Utility functions for user role checking
 */

/**
 * Check if user is admin or teacher (has elevated privileges)
 * @param {Object} user - User object with userType property
 * @returns {boolean} True if user is admin or teacher
 */
const isAdminOrTeacher = (user) => {
  return user && (user.userType === 'admin' || user.userType === 'teacher');
};

/**
 * Check if user is only admin
 * @param {Object} user - User object with userType property
 * @returns {boolean} True if user is admin
 */
const isAdmin = (user) => {
  return user && user.userType === 'admin';
};

/**
 * Check if user is only teacher
 * @param {Object} user - User object with userType property
 * @returns {boolean} True if user is teacher
 */
const isTeacher = (user) => {
  return user && user.userType === 'teacher';
};

/**
 * Get user type display name
 * @param {string} userType - User type string
 * @returns {string} Display name for user type
 */
const getUserTypeDisplayName = (userType) => {
  switch (userType) {
    case 'admin':
      return 'Administrator';
    case 'teacher':
      return 'Teacher';
    case 'user':
      return 'Student';
    default:
      return 'User';
  }
};

module.exports = {
  isAdminOrTeacher,
  isAdmin,
  isTeacher,
  getUserTypeDisplayName
};