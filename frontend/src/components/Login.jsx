import brand from '../brand';
import { Button as UiButton } from './ui';
import { GoogleLogoIcon } from '@phosphor-icons/react/dist/csr/GoogleLogo';
import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  Box,
  Typography,
  IconButton
} from '@mui/material';
import { ArrowBack, ArrowForwardIos, ArrowBackIos } from '@mui/icons-material';
import useLoginConfig from '../hooks/useLoginConfig';

// Carousel component
const Carousel = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [direction, setDirection] = useState('left');
  
  // Images for carousel
  const carouselImages = brand.shared.carousel;
  
  // Captions for each slide
  const carouselCaptions = [
    {
      title: 'Track your coding journey, showcase ',
      subtitle: `all in one platform tailored for ${brand.names.institution} students.`
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
            fontSize: { xs: '0.875rem', sm: '1.1rem' },
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

/**
 * Sign-in page. Two entry points share it:
 *   - variant "student" (/login): the normal page.
 *   - variant "teacher" (/teacher-login): the same Google sign-in, started from the
 *     teacher route. New teacher accounts then ask an admin for teacher access.
 * Both end in the same callback and get the same JWT.
 */
const Login = ({ variant = 'student' }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isTeacher = variant === 'teacher';

  // How the server lets people in: only college addresses ('domain', the default) or only the
  // addresses an admin listed ('allowlist'). It decides the wording below.
  const { loginMode, domainHint } = useLoginConfig();
  const allowlist = loginMode === 'allowlist';

  // Why a previous sign-in attempt ended, passed back in the URL by the server
  const params = new URLSearchParams(location.search);
  const errorParam = params.get('error');
  const SIGN_IN_PROBLEMS = {
    'not-allowed': 'This email address is not on the access list. Ask your coordinator to add it, then try again.',
    'domain-not-allowed': `Use your ${brand.names.institution} college email address (${domainHint}).`,
    'access-revoked': 'Your email address no longer has access. Contact your coordinator.',
  };
  const signInProblem = errorParam
    ? /^(google-)?auth-failed$/.test(errorParam)
      ? 'Sign in failed. Please try again.'
      : SIGN_IN_PROBLEMS[errorParam] || errorParam
    : params.get('sessionExpired')
    ? 'You were signed out because this account signed in on another device.'
    : '';

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
    
    // Redirect directly to Google OAuth (the teacher page uses its own start route)
    window.location.href = `${apiUrl}/auth/google${isTeacher ? '/teacher' : ''}`;
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
          height: '100dvh',
          overflowY: 'auto',
          bgcolor: '#0585E0',
          display: 'flex',
          flexDirection: 'column',
          
          alignItems: 'center',
          p: { xs: 3, sm: 6 },
        }}
      >
        {/* Back to the landing page: the left panel with the Go Back button is hidden on phones */}
        <Box
          component={Link}
          to="/"
          sx={{
            display: { xs: 'inline-flex', md: 'none' },
            alignSelf: 'flex-start',
            alignItems: 'center',
            gap: 0.75,
            minHeight: 44,
            color: '#fff',
            textDecoration: 'none',
            fontSize: { xs: '0.85rem', sm: '0.95rem' },
          }}
        >
          <ArrowBack sx={{ fontSize: 20 }} />
          Back
        </Box>

        <Box sx={{ maxWidth: 600, width: '100%', my: 'auto', py: { xs: 2, sm: 4 }, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <Box sx={{ mb: { xs: 2, sm: 4 }, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', width: '100%' }}>
            {/* Logo and text on same line */}
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, gap: { xs: 1.5, sm: 0 }, mb: 2 }}>
              <Box 
                component="img" 
                src={brand.shared.authIcon} 
                alt={`${brand.names.platform} logo`}
                sx={{ 
                  width: { xs: '48px', sm: '64px', md: '72px' },
                  height: 'auto',
                  mr: { xs: 0, sm: 2 }
                }}
              />
              
              <Box>
                <Typography
                  variant="h4"
                  sx={{
                    fontWeight: 200,
                    color: 'white',
                    textAlign: 'left',
                    fontSize: { xs: '1rem', sm: '1.125rem', md: '1.35rem' },
                    lineHeight: 1.2,
                  }}
                >
                  {isTeacher ? 'Teacher sign in to' : 'Welcome back to'}
                </Typography>
                <Typography
                  variant="h3"
                  sx={{
                    fontWeight: 700,
                    color: 'white',
                    textAlign: 'left',
                    fontSize: { xs: '1.375rem', sm: '1.625rem', md: '2rem' },
                    overflowWrap: 'break-word',
                    lineHeight: 1.2,
                  }}
                >
                  {brand.codeStats.name} at {brand.names.institution}
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
                mb: { xs: 2, sm: 4 },
                textAlign: 'left',
                fontWeight: 400,
                fontSize: { xs: '0.875rem', sm: '1.1rem' },
                lineHeight: 1.5,
              }}
            >
              {allowlist ? (
                isTeacher ? (
                  <>
                    Sign in with the Google account for the <b>email address an admin added</b> to the access
                    list. If this is your first time, you may be asked to request teacher access, which an
                    admin approves.
                  </>
                ) : (
                  <>
                    Sign in with the Google account for the <b>email address your coordinator added</b> to
                    track your competitive programming progress.
                  </>
                )
              ) : isTeacher ? (
                <>
                  Sign in with the <b>email assigned by {brand.names.institution}</b>. If this is your first time, you will be
                  asked to request teacher access, which an admin approves.
                </>
              ) : (
                <>Sign in with the <b>email assigned by {brand.names.institution}</b> to track your competitive programming progress.</>
              )}
            </Typography>

            {signInProblem && (
              <Typography
                role="alert"
                sx={{
                  color: 'white',
                  bgcolor: 'rgba(0,0,0,0.25)',
                  borderRadius: '4px',
                  px: 2,
                  py: 1,
                  mb: 2,
                  fontSize: { xs: '0.85rem', sm: '0.95rem' },
                }}
              >
                {signInProblem}
              </Typography>
            )}
            
            {/* Already Registered (students) */}
            {!isTeacher && (
              <Typography
                variant="body1"
                sx={{
                  mt: 3,
                  color: 'white',
                  mb: 2,
                  textAlign: 'left',
                  fontWeight: 400,
                  fontSize: { xs: '0.875rem', sm: '1rem' },
                }}
              >
                Not Yet Registered? <Link to="/register" style={{ color: 'white', fontWeight: 500, textDecoration: 'underline', display: 'inline-block', padding: '8px 2px' }}>Sign Up</Link>
              </Typography>
            )}
            
            {/* Google Login Button */}
            <Box data-theme="midnight" sx={{ width: '100%', maxWidth: { xs: '100%', sm: 320 }, mt: 1, mb: 3 }}>
              <UiButton
                variant="spotlight"
                fullWidth
                onClick={handleGoogleLogin}
                startIcon={<GoogleLogoIcon size={20} weight="bold" aria-hidden="true" />}
              >
                Continue with Google
              </UiButton>
            </Box>

            {/* The other entry point */}
            <Typography sx={{ color: 'white', opacity: 0.85, fontSize: { xs: '0.85rem', sm: '0.95rem' } }}>
              {isTeacher ? (
                <>Student? <Link to="/login" style={{ color: 'white', fontWeight: 500, textDecoration: 'underline', display: 'inline-block', padding: '8px 2px' }}>Sign in here</Link></>
              ) : (
                <>Faculty? <Link to="/teacher-login" style={{ color: 'white', fontWeight: 500, textDecoration: 'underline', display: 'inline-block', padding: '8px 2px' }}>Teacher sign in</Link></>
              )}
            </Typography>
          </Box>
        </Box>
      </Box>
    </>
  );
};

export default Login;
