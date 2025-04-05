import axios from 'axios';
import { apiUrl } from '../config/apiConfig';

/**
 * Fetches a user's profile image by user ID
 * 
 * @param {string} userId - The ID of the user
 * @param {string} token - JWT authentication token
 * @returns {Promise<Object>} - Object containing profilePicture URL and name
 */
export const fetchUserProfileImage = async (userId, token) => {
  try {
    if (!userId) return { profilePicture: '', name: 'User' };
    
    const response = await axios.get(
      `${apiUrl}/users/profile-image/${userId}`,
      token ? { headers: { Authorization: `Bearer ${token}` } } : {}
    );
    
    return response.data;
  } catch (error) {
    return { profilePicture: '', name: 'User' };
  }
};

/**
 * Returns a profile image URL or default image
 * 
 * @param {string} profilePicture - The profile picture URL
 * @returns {string} - Valid profile picture URL or default avatar
 */
export const getProfileImageUrl = (profilePicture) => {
  // Handle null, undefined, or empty string cases
  if (!profilePicture) {
    return '/static/images/avatar.jpg';
  }
  
  // Handle non-string inputs (shouldn't happen, but just in case)
  if (typeof profilePicture !== 'string') {
    return '/static/images/avatar.jpg';
  }
  
  // If it's an empty string after trimming
  if (profilePicture.trim() === '') {
    return '/static/images/avatar.jpg';
  }
  
  // Handle Google profile pictures that might be missing size parameter
  if (profilePicture.includes('googleusercontent.com') && !profilePicture.includes('=s')) {
    const updatedUrl = `${profilePicture}=s128`;
    return updatedUrl;
  }
  
  return profilePicture;
}; 