import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { apiUrl } from '../config/apiConfig';

// Global state for tracking active processes
export const activeSyncState = {
  inProgress: false,
  setInProgress: (value) => {
    activeSyncState.inProgress = value;
  }
};

// Create context with default values
const AuthContext = createContext({
  user: null,
  token: null,
  login: async () => {},
  logout: () => {},
  isAuthenticated: false,
  isAdmin: false,
  setUser: () => {},
  isInitialized: false
});

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  // Initialize state with stored values or defaults
  const [user, setUser] = useState(() => {
    try {
      const storedUser = localStorage.getItem('user');
      return storedUser ? JSON.parse(storedUser) : null;
    } catch {
      // Failed to parse stored user
      localStorage.removeItem('user');
      return null;
    }
  });
  
  const [token, setToken] = useState(() => localStorage.getItem('token') || null);
  const [isInitialized, setIsInitialized] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Fetch user data if needed
  const fetchUserData = async () => {
    if (!token) return null;
    
    try {
      const response = await axios.get(`${apiUrl}/users/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const userData = response.data;
      
      // IMPORTANT: Verify userType is present in the response
      if (!userData.userType) {
        userData.userType = 'user';
      }
      
      // If the user exists, update with API data
      if (user) {
        const updatedUser = {
          ...user,
          ...userData
        };
        
        // Update local storage and state
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setUser(updatedUser);
        
        return updatedUser;
      } else {
        // If no user exists, create one from the API data
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
        return userData;
      }
    } catch (error) {
      return user; // Return existing user on error
    }
  };

  // Log auth state on initialization
  useEffect(() => {
    const initializeAuth = async () => {
      if (!isInitialized) {
        // If we have a token but user data is incomplete, fetch complete data
        if (token && user && !user.userType) {
          await fetchUserData();
        }
        
        setIsInitialized(true);
      }
    };
    
    initializeAuth();
  }, [token, user, isInitialized]);

  // Handle OAuth redirects
  useEffect(() => {
    const handleOAuthRedirect = async () => {
      // Only process if we're on the auth success page
      if (!location.pathname.includes('/auth/success')) return;
      
      const params = new URLSearchParams(location.search);
      const token = params.get('token');
      const userId = params.get('userId');
      const email = params.get('email');
      const name = params.get('name');
      const newUser = params.get('newUser') === 'true';
      const profileCompleted = params.get('profileCompleted') === 'true';
      const userType = params.get('userType') || 'user'; // Make sure we capture userType
      
      if (!token || !userId) {
        navigate('/login', { replace: true });
        return;
      }
      
      // First create a basic user object
      let userData = { 
        id: userId, 
        email, 
        name, 
        newUser,
        profileCompleted,
        userType
      };
      
      // Store auth state in localStorage and state
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));
      setToken(token);
      setUser(userData);
      
      // Fetch complete user data
      try {
        const response = await axios.get(`${apiUrl}/users/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        // Get the full user object
        const fullUserData = response.data;
        
        // Verify userType is present
        if (!fullUserData.userType) {
          fullUserData.userType = userType; // Use the URL param as backup
        }
        
        // Update user data with complete information
        userData = {
          ...userData,
          userType: fullUserData.userType,
          department: fullUserData.department,
          // Include any other fields you need
        };
        
        // Update localStorage and state with the complete user data
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
        
        // Determine where to navigate based on user status
        if (newUser === true || profileCompleted === false) {
          navigate('/profile?setup=true', { replace: true });
        } else if (userData.userType === 'admin') {
          navigate('/admin', { replace: true });
        } else {
          navigate('/dashboard', { replace: true });
        }
      } catch (error) {
        // Still navigate based on the userType we have from URL params
        if (userData.userType === 'admin') {
          navigate('/admin', { replace: true });
        } else {
          navigate('/dashboard', { replace: true });
        }
      }
    };
    
    handleOAuthRedirect();
  }, [location, navigate]);

  // Effect to monitor auth state and redirect if needed
  useEffect(() => {
    if (!isInitialized) return;
    
    // Check if user type is undefined but we have a token
    if (token && (!user || !user.userType)) {
      fetchUserData();
      return;
    }
    
    // If we're on a protected path without auth, redirect to login
    const isAuthPath = location.pathname === '/login' || 
                      location.pathname === '/register' || 
                      location.pathname === '/' ||
                      location.pathname === '/auth/success';
                      
    if (!token && !isAuthPath) {
      navigate('/login', { replace: true });
      return;
    }
    
    // If we have auth and we're on login/register pages, redirect to appropriate dashboard
    if (token && (location.pathname === '/login' || location.pathname === '/register' || location.pathname === '/')) {
      // Check if user is admin and redirect accordingly
      if (user?.userType === 'admin') {
        navigate('/admin', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
      return;
    }
    
    // Check if a non-admin is trying to access admin routes
    if (token && location.pathname.startsWith('/admin') && user?.userType !== 'admin') {
      navigate('/dashboard', { replace: true });
      return;
    }
    
    // Check if an admin is at regular dashboard and redirect to admin
    if (token && location.pathname === '/dashboard' && user?.userType === 'admin') {
      navigate('/admin', { replace: true });
      return;
    }
    
  }, [token, location.pathname, navigate, isInitialized, user]);

  const login = (userData, authToken) => {
    try {
      localStorage.setItem('token', authToken);
      localStorage.setItem('user', JSON.stringify(userData));
      setToken(authToken);
      setUser(userData);
      
      // Return appropriate redirect path based on user type
      return userData?.userType === 'admin' ? '/admin' : '/dashboard';
    } catch (error) {
      // Error handling for login
      return false;
    }
  };

  // Update setUser to add logging
  const updateUser = (userData) => {
    try {
      // Make sure we preserve the userType if it's not included in the update
      const updatedUserData = {
        ...user,
        ...userData
      };
      
      localStorage.setItem('user', JSON.stringify(updatedUserData));
      setUser(updatedUserData);
      
      // Check if we need to redirect based on user type change
      if (userData.userType && userData.userType !== user?.userType) {
        // User type has changed, redirect accordingly
        if (userData.userType === 'admin') {
          navigate('/admin', { replace: true });
        } else if (user?.userType === 'admin') {
          navigate('/dashboard', { replace: true });
        }
      }
    } catch (error) {
      // Silently handle errors
    }
  };

  // Create logout function that handles active sync jobs
  const logout = () => {
    // Check if there's an active sync job
    if (activeSyncState.inProgress) {
      const confirmLogout = window.confirm(
        "Profile synchronization is in progress. Logging out will prevent you from viewing the progress. Are you sure you want to logout?"
      );
      
      if (!confirmLogout) {
        return false; // Abort logout
      }
    }
    
    // Proceed with logout
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setToken(null);
    navigate('/login', { replace: true });
    return true; // Logout successful
  };

  // Create value object with guaranteed non-null values
  const value = {
    user: user || null,
    token: token || null,
    login,
    logout,
    isAuthenticated: Boolean(token),
    isAdmin: user?.userType === 'admin',
    setUser: updateUser,
    isInitialized,
    refreshUserData: fetchUserData
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 