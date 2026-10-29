import { useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { apiUrl } from '../../config/apiConfig';

/**
 * Refreshes the signed-in student's profile once if a key field is missing.
 *
 * Section and graduating year are student fields: teachers and admins never have them, and a
 * student may leave the section empty. This effect depends on `user` and itself replaces `user`
 * with the fetched copy, so without a guard it would re-run forever, calling /users/me again
 * after every response. It asks at most once per sign-in, and only for students.
 */
export default function useProfileRefresh() {
  const { token, user, setUser } = useAuth();
  const refreshedForToken = useRef(null);

  useEffect(() => {
    const isStudent = user?.userType === 'user' && user?.signupIntent !== 'teacher';
    if (!token || !user || !isStudent) return;
    if (user.section && user.graduatingYear) return;
    if (refreshedForToken.current === token) return;
    refreshedForToken.current = token;

    const refresh = async () => {
      try {
        const response = await axios.get(`${apiUrl}/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.data) {
          const updatedUser = { ...user, ...response.data };
          localStorage.setItem('user', JSON.stringify(updatedUser));
          setUser(updatedUser); // Update the AuthContext
        }
      } catch (error) {
        console.error('[Navbar] Error refreshing user data:', error);
      }
    };

    refresh();
  }, [token, user, setUser]);
}
