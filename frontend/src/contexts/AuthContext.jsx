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
  isInitialized: false,
  currentSessionId: null,
  registerLoginSession: async () => {}
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
  const [currentSessionId, setCurrentSessionId] = useState(() => localStorage.getItem('sessionId') || null);
  const navigate = useNavigate();
  const location = useLocation();

  // Register a login session
  const registerLoginSession = async () => {
    if (!token) return null;
    
    try {
      const response = await axios.post(
        `${apiUrl}/sessions/register`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.data && response.data.sessionId) {
        localStorage.setItem('sessionId', response.data.sessionId);
        setCurrentSessionId(response.data.sessionId);
        return response.data.sessionId;
      }
      
      return null;
    } catch (error) {
      console.error('Failed to register session:', error);
      return null;
    }
  };
  
  // Update session activity periodically
  useEffect(() => {
    if (!token || !currentSessionId) return;
    
    const updateActivity = async () => {
      try {
        await axios.put(
          `${apiUrl}/sessions/update-activity`,
          { sessionId: currentSessionId },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );
      } catch (error) {
        console.error('Failed to update session activity:', error);
      }
    };
    
    // Update activity every 5 minutes
    const intervalId = setInterval(updateActivity, 5 * 60 * 1000);
    
    return () => clearInterval(intervalId);
  }, [token, currentSessionId]);

  // Fetch user data on mount if token exists
  const fetchUserData = async () => {
    if (!token) {
      setIsInitialized(true);
      return;
    }
    
    try {
      const res = await axios.get(`${apiUrl}/auth/user`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (res.data) {
        const fullUserData = {...res.data, id: res.data._id};
        localStorage.setItem('user', JSON.stringify(fullUserData));
        setUser(fullUserData);
        
        // Register the session if not already registered
        if (!currentSessionId) {
          await registerLoginSession();
        }
      }
    } catch (error) {
      // If error is 401, the token is invalid, so log out
      if (error.response && error.response.status === 401) {
        console.log('Token expired or invalid, logging out');
        logout();
      }
    } finally {
      setIsInitialized(true);
    }
  };
  
  // Fetch user data when component mounts
  useEffect(() => {
    fetchUserData();
  }, [token]);
  
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
      const profilePicture = params.get('profilePicture') || ''; // Capture profile picture URL
      
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
        userType,
        profilePicture // Store profile picture URL
      };
      
      // Store auth state in localStorage and state
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));
      setToken(token);
      setUser(userData);
      
      // Register a new login session
      await registerLoginSession();
      
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
          profilePicture: fullUserData.profilePicture || profilePicture, // Prioritize backend data, fallback to URL param
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
      
      // Register login session after setting token
      registerLoginSession();
      
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
    localStorage.removeItem('sessionId');
    setUser(null);
    setToken(null);
    setCurrentSessionId(null);
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
    refreshUserData: fetchUserData,
    currentSessionId,
    registerLoginSession
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 