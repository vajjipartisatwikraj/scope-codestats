/**
 * Utility functions for user role checking (Frontend)
 */

/**
 * Check if user is admin or teacher (has elevated privileges)
 * @param {Object} user - User object with userType property
 * @returns {boolean} True if user is admin or teacher
 */
export const isAdminOrTeacher = (user) => {
  return user && (user.userType === 'admin' || user.userType === 'teacher');
};

/**
 * Check if user is only admin
 * @param {Object} user - User object with userType property
 * @returns {boolean} True if user is admin
 */
export const isAdmin = (user) => {
  return user && user.userType === 'admin';
};

/**
 * Check if user is only teacher
 * @param {Object} user - User object with userType property
 * @returns {boolean} True if user is teacher
 */
export const isTeacher = (user) => {
  return user && user.userType === 'teacher';
};

/**
 * Check if user is regular user (not admin or teacher)
 * @param {Object} user - User object with userType property
 * @returns {boolean} True if user is regular user
 */
export const isRegularUser = (user) => {
  return user && user.userType === 'user';
};

/**
 * Get user type display name
 * @param {string} userType - User type string
 * @returns {string} Display name for user type
 */
export const getUserTypeDisplayName = (userType) => {
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

/**
 * Get user badge color based on user type (for Material-UI)
 * @param {string} userType - User type string
 * @returns {string} MUI color variant
 */
export const getUserTypeBadgeColor = (userType) => {
  switch (userType) {
    case 'admin':
      return 'error';
    case 'teacher':
      return 'warning';
    case 'user':
      return 'primary';
    default:
      return 'default';
  }
};

/**
 * Get appropriate dashboard path for user type
 * @param {Object} user - User object with userType property
 * @returns {string} Dashboard path
 */
export const getDashboardPath = (user) => {
  return isAdminOrTeacher(user) ? '/admin' : '/dashboard';
};

/**
 * Get appropriate path for a resource based on user type
 * @param {Object} user - User object with userType property
 * @param {string} resource - Resource name (e.g., 'cohorts', 'courses')
 * @returns {string} Resource path
 */
export const getResourcePath = (user, resource) => {
  return isAdminOrTeacher(user) ? `/admin/${resource}` : `/${resource}`;
};