import React, { createContext, useContext, useState } from 'react';

// Create context with default values
const AuthContext = createContext({
  user: null,
  token: null,
  login: async () => {},
  logout: () => {},
  isAuthenticated: false
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
      return null;
    }
  });
  
  const [token, setToken] = useState(() => localStorage.getItem('token') || null);

  const login = (userData, authToken) => {
    try {
      localStorage.setItem('token', authToken);
      localStorage.setItem('user', JSON.stringify(userData));
      setToken(authToken);
      setUser(userData);
    } catch (error) {
      console.error('Error during login:', error);
      throw new Error('Login failed');
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  // Create value object with guaranteed non-null values
  const value = {
    user: user || null,
    token: token || null,
    login,
    logout,
    isAuthenticated: Boolean(token)
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 