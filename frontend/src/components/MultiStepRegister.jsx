import React, { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './MultiStepRegister.css';
import {
  Box,
  Button,
  Typography,
} from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import GoogleIcon from '@mui/icons-material/Google';

const MultiStepRegister = () => {
  const navigate = useNavigate();

  // Hide navbar and set dark background
  useEffect(() => {
    document.body.style.backgroundColor = '#1a1a1a';
    document.body.classList.add('hide-navbar');
    return () => {
      document.body.style.backgroundColor = '';
      document.body.classList.remove('hide-navbar');
    };
  }, []);

  const handleGoogleRegister = () => {
    // The VITE_API_URL already includes /api in the .env file
    // So we need to ensure we don't duplicate it
    const baseUrl = import.meta.env.VITE_API_URL;
    const apiUrl = baseUrl.endsWith('/api') 
      ? baseUrl 
      : `${baseUrl}${baseUrl.endsWith('/') ? '' : '/'}api`;
      
    window.open(`${apiUrl}/auth/google`, '_self');
  };

  return (
    <>
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
          p: 4,
          zIndex: 0,
        }}
      >
        <Box sx={{ maxWidth: '400px', textAlign: 'center' }}>
          <Typography
            variant="h4"
            sx={{
              color: 'white',
              fontWeight: 500,
              mb: 2,
            }}
          >
            Join CodeStats
          </Typography>
          <Typography
            variant="body1"
            sx={{
              color: 'rgba(255, 255, 255, 0.8)',
              fontWeight: 400,
              lineHeight: 1.5,
              fontSize: '1.1rem',
              maxWidth: '80%',
              mx: 'auto'
            }}
          >
            Create your account to track your competitive programming journey.
          </Typography>
        </Box>
      </Box>

      <Box
        sx={{
          position: 'fixed',
          top: 0,
          right: 0,
          width: { xs: '100%', md: '50%' },
          height: '100vh',
          bgcolor: '#000000',
          p: { xs: 5, sm: 6 },
          overflow: 'auto',
          zIndex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Box sx={{ maxWidth: 600, width: '100%', py:4 }}>
          <Button
            onClick={() => navigate(-1)}
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
            <Box sx={{ mb: 6, textAlign: 'center' }}>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 300,
                  letterSpacing: '0.5px',
                  color: 'white',
                }}
              >
                Create your
              </Typography>
              <Typography
                variant="h3"
                sx={{
                  fontWeight: 600,
                  letterSpacing: '0.5px',
                  color: 'white',
                }}
              >
                SCOPE CODESTATS Account
              </Typography>
            </Box>

            <Box sx={{ mt: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
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
                Sign up with your MLRIT college email to start tracking your competitive programming progress.
              </Typography>
              
              <Button
                fullWidth
                variant="outlined"
                startIcon={<GoogleIcon />}
                onClick={handleGoogleRegister}
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
                Sign up with Google
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
              
              <Typography
                variant="body2"
                sx={{
                  color: 'rgba(255, 255, 255, 0.7)',
                  mt: 5,
                  textAlign: 'center'
                }}
              >
                Already have an account?{' '}
                <Link to="/login" style={{ color: '#0088cc', textDecoration: 'none' }}>
                  Sign in
                </Link>
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>
    </>
  );
};

export default MultiStepRegister;