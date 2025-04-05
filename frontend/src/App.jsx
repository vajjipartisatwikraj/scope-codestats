import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, createBrowserRouter, RouterProvider } from 'react-router-dom';
import { ThemeProvider as MuiThemeProvider, CssBaseline, Box, Container, Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, CircularProgress } from '@mui/material';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import axios from './utils/axiosConfig';

import Navbar from './components/Navbar';
import Login from './components/Login';
import MultiStepRegister from './components/MultiStepRegister';
import Dashboard from './components/Dashboard';
import AdminDashboard from './components/AdminDashboard';
import Leaderboard from './components/Leaderboard';
import Courses from './components/Courses';
import Opportunities from './components/Opportunities';
import Landing from './components/Landing';
import Profile from './components/Profile';
import PrivateRoute from './components/PrivateRoute';
import CourseManagement from './components/CourseManagement';
import OpportunityManagement from './components/OpportunityManagement';
import UserView from './components/UserView';
import ConditionalDashboard from './components/ConditionalDashboard';

// MainContent component that uses the theme from context
const MainContent = () => {
  const { theme, darkMode } = useTheme();
  const { token, user, isAuthenticated, isInitialized } = useAuth();
  
  // Show loading indicator while authentication is initializing
  if (!isInitialized) {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh',
          backgroundColor: theme.palette.background.default
        }}
      >
        <CircularProgress size={40} />
        <Typography variant="body1" sx={{ ml: 2 }}>
          Initializing application...
        </Typography>
      </Box>
    );
  }
  
  return (
    <MuiThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', minHeight: '100vh' }}>
        {/* Navbar is shown on all pages except login and register */}
        {token && <Navbar />}
        
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            width: '100%',
            minHeight: '100vh',
            pt: token ? 8 : 0, // Add padding top only if navbar is shown
            px: { xs: 0, sm: 0, md: 15 }
          }}
        >
          <Container maxWidth="xl" sx={{ py: 2 }}>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<MultiStepRegister />} />
              <Route path="/auth/success" element={
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: '#121212' }}>
                  <CircularProgress size={60} sx={{ color: '#0088cc' }} />
                  <Typography variant="h6" sx={{ mt: 4, color: 'white' }}>
                    Completing your login...
                  </Typography>
                </Box>
              } />
              
              {/* Protected routes */}
              <Route path="/dashboard" element={
                <PrivateRoute>
                  <ConditionalDashboard />
                </PrivateRoute>
              } />
              <Route path="/admin" element={
                <PrivateRoute adminOnly={true}>
                  <AdminDashboard />
                </PrivateRoute>
              } />
              <Route path="/admin/dashboard" element={
                <PrivateRoute adminOnly={true}>
                  <AdminDashboard />
                </PrivateRoute>
              } />
              <Route path="/leaderboard" element={
                <PrivateRoute>
                  <Leaderboard />
                </PrivateRoute>
              } />
              <Route path="/courses" element={
                <PrivateRoute>
                  <Courses />
                </PrivateRoute>
              } />
              <Route path="/opportunities" element={
                <PrivateRoute>
                  <Opportunities />
                </PrivateRoute>
              } />
              <Route path="/profile" element={
                <PrivateRoute>
                  <Profile />
                </PrivateRoute>
              } />
              <Route path="/course-management" element={
                <PrivateRoute adminOnly={true}>
                  <CourseManagement />
                </PrivateRoute>
              } />
              <Route path="/admin/courses" element={
                <PrivateRoute adminOnly={true}>
                  <CourseManagement />
                </PrivateRoute>
              } />
              <Route path="/opportunity-management" element={
                <PrivateRoute adminOnly={true}>
                  <OpportunityManagement />
                </PrivateRoute>
              } />
              <Route path="/admin/opportunities" element={
                <PrivateRoute adminOnly={true}>
                  <OpportunityManagement />
                </PrivateRoute>
              } />
              <Route path="/user-view/:username" element={
                <UserView />
              } />
              
              {/* Catch-all route (404) */}
              <Route path="*" element={
                <Box sx={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  justifyContent: 'center', 
                  alignItems: 'center', 
                  height: '70vh' 
                }}>
                  <Typography variant="h4" sx={{ mb: 3 }}>Page Not Found</Typography>
                  <Typography variant="body1" sx={{ mb: 4, maxWidth: '600px', textAlign: 'center' }}>
                    The page you're looking for doesn't exist or has been moved.
                  </Typography>
                  <Button 
                    variant="contained" 
                    onClick={() => {
                      if (isAuthenticated) {
                        // Redirect to admin dashboard for admin users
                        if (user?.userType === 'admin') {
                          window.location.href = '/admin/dashboard';
                        } else {
                          window.location.href = '/dashboard';
                        }
                      } else {
                        window.location.href = '/login';
                      }
                    }}
                  >
                    Go to {isAuthenticated ? (user?.userType === 'admin' ? 'Admin Dashboard' : 'Dashboard') : 'Login'}
                  </Button>
                </Box>
              } />
            </Routes>
          </Container>
        </Box>
        
        {/* Toast container for notifications */}
        <ToastContainer
          position="bottom-right"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme={darkMode ? "dark" : "light"}
        />
        
        {/* Add dedicated container for dialogs to avoid aria-hidden issues */}
        <div id="dialog-container" />
      </Box>
    </MuiThemeProvider>
  );
};

/**
 * Main App component for CodeStats
 * 
 * Note: We use the /auth/success route as part of the OAuth flow
 * The backend redirects to this route after successful Google authentication
 */
function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <ThemeProvider>
          <MainContent />
        </ThemeProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
