import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider as MuiThemeProvider, CssBaseline, Box, Container } from '@mui/material';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';

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

// Component to conditionally render Dashboard or AdminDashboard based on user type
const ConditionalDashboard = () => {
  const { user } = useAuth();
  return user?.userType === 'admin' ? <AdminDashboard /> : <Dashboard />;
};

// MainContent component that uses the theme from context
const MainContent = () => {
  const { theme, darkMode } = useTheme();
  const { token, user } = useAuth();
  
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
      </Box>
    </MuiThemeProvider>
  );
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <ThemeProvider>
          <MainContent />
        </ThemeProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
