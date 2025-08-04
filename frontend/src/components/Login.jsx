import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Box,
  Button,
  Typography,
  IconButton
} from '@mui/material';
import { ArrowBack, ArrowForwardIos, ArrowBackIos } from '@mui/icons-material';
import GoogleIcon from '@mui/icons-material/Google';

// Carousel component
const Carousel = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [direction, setDirection] = useState('left');
  
  // Images for carousel
  const carouselImages = [
    '/carousel1.png',
    '/carousel2.png', 
    '/carousel3.png',
    '/carousel4.png'
  ];
  
  // Captions for each slide
  const carouselCaptions = [
    {
      title: 'Track your coding journey, showcase ',
      subtitle: 'all in one platform tailored for MLRIT students.'
    },
    {
      title: 'Monitor your progress across coding platforms',
      subtitle: 'Visualize your growth with comprehensive performance metrics.'
    },
    {
      title: 'Showcase your technical skills and competitive achievements',
      subtitle: 'Build your coding portfolio with verified accomplishments.'
    },
    {
      title: 'Connect with peers and access learning resources',
      subtitle: 'Join a community of like-minded programmers.'
    }
  ];
  
  // Auto-cycle slides
  useEffect(() => {
    const timer = setInterval(() => {
      setDirection('left');
      setActiveStep((prevActiveStep) => (prevActiveStep + 1) % carouselImages.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);
  
  // Handle manual navigation
  const handleNext = () => {
    setDirection('left');
    setActiveStep((prevActiveStep) => (prevActiveStep + 1) % carouselImages.length);
  };
  
  const handleBack = () => {
    setDirection('right');
    setActiveStep((prevActiveStep) => (prevActiveStep - 1 + carouselImages.length) % carouselImages.length);
  };
  
  return (
    <Box sx={{ 
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
      position: 'relative',
      overflow: 'hidden',
      mt: 8,
    }}>
      {/* Images Container */}
      <Box sx={{ 
        width: '100%',
        height: '300px',
        position: 'relative',
        overflow: 'hidden',
        mb: 3
      }}>
        {carouselImages.map((image, index) => (
          <Box
            component="img"
            key={index}
            src={image}
            alt={`Slide ${index + 1}`}
            sx={{
              width: 'auto',
              height: '250px',
              position: 'absolute',
              left: '50%',
              transform: index === activeStep 
                ? 'translateX(-50%)' 
                : index === (activeStep + 1) % carouselImages.length || 
                  (index === 0 && activeStep === carouselImages.length - 1 && direction === 'left')
                  ? 'translateX(100%)'
                  : 'translateX(-150%)',
              opacity: index === activeStep ? 1 : 0,
              transition: 'transform 0.5s ease, opacity 0.3s ease',
              objectFit: 'contain',
            }}
          />
        ))}
      </Box>
      
      {/* Dots */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        mb: 3,
        width: '100%'
      }}>
        {carouselImages.map((_, index) => (
          <Box
            key={index}
            onClick={() => {
              setDirection(index > activeStep ? 'left' : 'right');
              setActiveStep(index);
            }}
            sx={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              backgroundColor: index === activeStep ? '#0585E0' : '#ffffff',
              mx: 0.5,
              cursor: 'pointer',
              transition: 'background-color 0.3s ease'
            }}
          />
        ))}
      </Box>
      
      {/* Text */}
      <Box sx={{ textAlign: 'center', maxWidth: '90%', mt: 1 }}>
        <Typography
          variant="body1"
          sx={{
            color: '#ffffff',
            fontWeight: 500,
            mb: 1,
            fontSize: '1.1rem',
            lineHeight: 1.5
          }}
        >
          {carouselCaptions[activeStep].title}
        </Typography>
        <Typography
          variant="body2"
          sx={{
            color: '#ffffff',
            opacity: 0.7,
            fontWeight: 300,
            fontSize: '0.9rem'
          }}
        >
          {carouselCaptions[activeStep].subtitle}
        </Typography>
      </Box>
    </Box>
  );
};

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
      {/* Full screen black background */}
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: { xs: '0%', md: '50%' },
          height: '100vh',
          bgcolor: '#000',
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          p: 4,
        }}
      >
        {/* Go Back button */}
        <Box 
          sx={{
            position: 'absolute',
            top: '45px',
            left: '45px',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <Box 
            component={Link} 
            to="/" 
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              textDecoration: 'none',
              '&:hover': {
                opacity: 0.8,
              },
            }}
          >
            <Box 
              sx={{ 
                bgcolor: '#0585E0', 
                borderRadius: '50%', 
                width: 42, 
                height: 42, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                mr: 1.5
              }}
            >
              <ArrowBack sx={{ color: '#fff', fontSize: 22 }} />
            </Box>
            <Typography 
              sx={{ 
                color: '#fff', 
                fontWeight: 400,
                fontSize: '1.15rem'
              }}
            >
              Go Back
            </Typography>
          </Box>
        </Box>
        
        {/* Add carousel here */}
        <Carousel />
      </Box>

      {/* Login Form */}
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          right: 0,
          width: { xs: '100%', md: '50%' },
          height: '100vh',
          bgcolor: '#0585E0',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          p: { xs: 5, sm: 6 },
        }}
      >
        <Box sx={{ maxWidth: 600, width: '100%', py: 4, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <Box sx={{ mb: 4, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', width: '100%' }}>
            {/* Logo and text on same line */}
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Box 
                component="img" 
                src="/scope-white.png" 
                alt="Scope Logo"
                sx={{ 
                  width: '90px',
                  height: 'auto',
                  mr: 2
                }}
              />
              
              <Box>
                <Typography
                  variant="h4"
                  sx={{
                    fontWeight: 200,
                    color: 'white',
                    textAlign: 'left',
                    fontSize: '2.2rem',
                    lineHeight: 1.2,
                  }}
                >
                  Welcome Back to
                </Typography>
                <Typography
                  variant="h3"
                  sx={{
                    fontWeight: 700,
                    color: 'white',
                    textAlign: 'left',
                    fontSize: '2.8rem',
                    lineHeight: 1.2,
                  }}
                >
                  SCOPE - Code Stats
                </Typography>
              </Box>
            </Box>
          </Box>

          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', width: '100%' }}>
            {/* Sign in text */}
            <Typography
              variant="body1"
              sx={{
                color: 'white',
                mb: 4,
                textAlign: 'left',
                fontWeight: 400,
                fontSize: '1.1rem',
                lineHeight: 1.5,
              }}
            >
              Sign in with your <b>MLRIT college email</b> to track your competitive programming progress.
            </Typography>
            
            {/* Already Registered */}
            <Typography
              variant="body1"
              sx={{
                mt: 3,
                color: 'white',
                mb: 2,
                textAlign: 'left',
                fontWeight: 400,
                fontSize: '1rem',
              }}
            >
              Not Yet Registered? <Link to="/register" style={{ color: 'white', fontWeight: 500, textDecoration: 'underline' }}>Sign Up</Link>
            </Typography>
            
            {/* Google Login Button */}
            <Button
              fullWidth
              variant="contained"
              startIcon={<GoogleIcon sx={{ color: '#252525', fontSize: '28px' }} />}
              onClick={handleGoogleLogin}
              sx={{
                mt: 1,
                mb: 3,
                color: '#252525',
                backgroundColor: 'white',
                textTransform: 'none',
                fontSize: '1.3rem',
                fontWeight: 700,
                height: '40px',
                maxWidth: '30%',
                borderRadius: '4px',
                justifyContent: 'center',
                boxShadow: 'none',
                px: 3,
                '&:hover': {
                  backgroundColor: '#f5f5f5',
                  boxShadow: '0px 2px 4px rgba(0,0,0,0.1)',
                },
                pl: 2,
                p:3,
              }}
            >
              Google
            </Button>
          </Box>
        </Box>
      </Box>
    </>
  );
};

export default Login;
