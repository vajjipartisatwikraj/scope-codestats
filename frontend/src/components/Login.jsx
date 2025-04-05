import React, { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Box,
  Button,
  Typography,
} from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import GoogleIcon from '@mui/icons-material/Google';

const Login = () => {
  const navigate = useNavigate();

  // Hide navbar and set dark background
  useEffect(() => {
    document.body.style.backgroundColor = '#000';
    document.body.classList.add('hide-navbar');
    return () => {
      document.body.style.backgroundColor = '';
      document.body.classList.remove('hide-navbar');
    };
  }, []);

  const handleGoogleLogin = () => {
    // Build the Google OAuth URL carefully
    const baseUrl = import.meta.env.VITE_API_URL;
    
    // Make sure we have the correct API URL format
    let apiUrl;
    if (baseUrl.endsWith('/api')) {
      apiUrl = baseUrl;
    } else if (baseUrl.endsWith('/')) {
      apiUrl = `${baseUrl}api`;
    } else {
      apiUrl = `${baseUrl}/api`;
    }
    
    // Before redirecting, clear ALL user data from localStorage to prevent using old data
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    
    // Redirect directly to Google OAuth
    window.location.href = `${apiUrl}/auth/google`;
  };

  return (
    <>
      {/* Full screen blue background */}
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: { xs: '0%', md: '50%' },
          height: '100vh',
          bgcolor: '#0088cc',
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          color: 'white',
          textAlign: 'center',
          p: 4,
        }}
      >
        <Box sx={{ maxWidth: '400px' }}>
          <Typography 
            variant="h4" 
            sx={{ 
              fontWeight: 600, 
              mb: 2,
              fontSize: '2rem',
              letterSpacing: '0.5px'
            }}
          >
            Welcome to CodeStats!
          </Typography>
          <Typography 
            variant="body1" 
            sx={{ 
              fontSize: '1.1rem',
              opacity: 0.9,
              maxWidth: '80%',
              mx: 'auto',
              lineHeight: 1.5
            }}
          >
            Sign in with your Google account to continue your journey.
          </Typography>
        </Box>
      </Box>

      {/* Login Form */}
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          right: 0,
          width: { xs: '100%', md: '50%' },
          height: '100vh',
          bgcolor: '#000',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          p: { xs: 5, sm: 6 },
        }}
      >
        <Box sx={{ maxWidth: 600, width: '100%', py:4 }}>
          <Button
            component={Link}
            to="/"
            startIcon={<ArrowBack />}
            sx={{
              color: '#0088cc',
              textTransform: 'none',
              fontSize: '1rem',
              mb: 2,
              '&:hover': {
                backgroundColor: 'transparent',
                opacity: 0.8,
              },
              marginBottom: '100px',
              position: 'absolute',
              top: '20px',
              left: '20px',
            }}
          >
            Go Back
          </Button>

          <Box>
            <Box sx={{ mb: 6 }}>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 300,
                  letterSpacing: '0.5px',
                  color: 'white',
                  textAlign: 'center'
                }}
              >
                Welcome to
              </Typography>
              <Typography
                variant="h3"
                sx={{
                  fontWeight: 600,
                  letterSpacing: '0.5px',
                  color: 'white',
                  textAlign: 'center'
                }}
              >
                SCOPE CODESTATS
              </Typography>
            </Box>

            <Box sx={{ mt: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              {/* Google Login Button */}
              <Typography
                variant="body1"
                sx={{
                  color: 'white',
                  mb: 3,
                  textAlign: 'center',
                  maxWidth: '80%',
                  opacity: 0.8
                }}
              >
                Sign in with your MLRIT college email to track your competitive programming progress.
              </Typography>
              
              <Button
                fullWidth
                variant="outlined"
                startIcon={<GoogleIcon />}
                onClick={handleGoogleLogin}
                sx={{
                  mb: 3,
                  color: 'white',
                  borderColor: 'rgba(255, 255, 255, 0.3)',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  textTransform: 'none',
                  fontSize: '1.1rem',
                  height: '54px',
                  maxWidth: '320px',
                  borderRadius: '8px',
                  '&:hover': {
                    borderColor: 'white',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  },
                }}
              >
                Sign in with Google
              </Button>
              
              <Typography
                variant="caption"
                sx={{
                  color: 'rgba(255, 255, 255, 0.5)',
                  mt: 4,
                  textAlign: 'center',
                  fontSize: '0.8rem'
                }}
              >
                Only MLRIT college emails (@mlrit.ac.in or @mlrinstitutions.ac.in) are allowed.
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>
    </>
  );
};

export default Login;
