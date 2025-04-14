import React, { useEffect } from 'react';
import './Landing.css';
import { 
  Box, 
  Container, 
  Typography, 
  Button, 
  Grid, 
  Paper, 
  useTheme, 
  Stack,
  Divider,
  Avatar,
  Card,
  CardContent,
  useMediaQuery,
  Fade,
  Grow,
  Zoom,
  GlobalStyles
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { School, EmojiEvents, Timeline, Group, KeyboardArrowRight } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

const Landing = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { token } = useAuth();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  useEffect(() => {
    if (token) {
      navigate('/dashboard');
    }
  }, [token, navigate]);

  if (token) {
    return null;
  }

  const features = [
    {
      icon: <School sx={{ fontSize: 40, color: '#0077b6' }} />,
      title: 'Track Your Progress',
      description: 'Monitor your performance across multiple competitive programming platforms in one place.'
    },
    {
      icon: <EmojiEvents sx={{ fontSize: 40, color: '#FFD700' }} />,
      title: 'Compete & Compare',
      description: 'Join the leaderboard and compete with fellow students to improve your skills.'
    },
    {
      icon: <Timeline sx={{ fontSize: 40, color: '#4CAF50' }} />,
      title: 'Learning Resources',
      description: 'Access curated courses and materials to enhance your competitive programming journey.'
    },
    {
      icon: <Group sx={{ fontSize: 40, color: '#2196F3' }} />,
      title: 'Community',
      description: 'Be part of a growing community of competitive programmers at MLRIT.'
    }
  ];

  return (
    <>
      {/* Global styles to ensure the landing page takes the full screen */}
      <GlobalStyles 
        styles={{
          'body, html': {
            margin: 0,
            padding: 0,
            width: '100%',
            height: '100%',
            backgroundColor: '#0077b6',
            overflowX: 'hidden'
          },
          '#root': {
            width: '100%',
            margin: 0,
            padding: 0
          },
          '#root > div': {
            width: '100%',
            margin: 0,
            padding: 0
          }
        }} 
      />
      
      <Box sx={{ 
        width: '100vw',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: '#0077b6', // Main blue background color
        margin: 0,
        padding: 0,
        boxSizing: 'border-box',
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0
      }}>
        {/* Hero Section with Enhanced Design */}
        <Box 
          sx={{ 
            background: 'linear-gradient(135deg, #005f8f 0%, #0077b6 50%, #00a8e8 100%)',
            width: '100%',
            height: '90vh',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            color: 'white',
            position: 'relative',
            overflow: 'hidden',
            py: { xs: 4, md: 0 }
          }}
        >
          {/* Animated Background Elements */}
          <Box sx={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            opacity: 0.07,
            backgroundImage: 'url("data:image/svg+xml,%3Csvg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"%3E%3Cpath d="M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z" fill="%23ffffff" fill-opacity="1" fill-rule="evenodd"/%3E%3C/svg%3E")',
            backgroundSize: '15rem',
            zIndex: 1
          }} />
          
          {/* Floating Geometric Shapes */}
          <Box sx={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            overflow: 'hidden',
            zIndex: 0
          }}>
            {/* Circle 1 */}
            <Box sx={{
              position: 'absolute',
              width: '300px',
              height: '300px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(0,168,232,0.3) 0%, rgba(0,119,182,0) 70%)',
              top: '10%',
              left: '5%',
              animation: 'float 15s infinite ease-in-out'
            }} />
            
            {/* Circle 2 */}
            <Box sx={{
              position: 'absolute',
              width: '200px',
              height: '200px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(0,168,232,0.2) 0%, rgba(0,119,182,0) 70%)',
              bottom: '15%',
              right: '10%',
              animation: 'float 20s infinite ease-in-out reverse'
            }} />
            
            {/* Circle 3 */}
            <Box sx={{
              position: 'absolute',
              width: '150px',
              height: '150px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 70%)',
              top: '30%',
              right: '20%',
              animation: 'float 12s infinite ease-in-out'
            }} />
            
            {/* Blob Shape */}
            <Box sx={{
              position: 'absolute',
              width: '500px',
              height: '500px',
              bottom: '-200px',
              left: '-100px',
              opacity: 0.05,
              backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath fill=\'%23FFFFFF\' d=\'M47.5,-57.2C59.9,-46.1,67.3,-29.7,69.4,-13.2C71.5,3.3,68.3,19.8,59.9,32.5C51.5,45.2,37.8,54.1,22.7,59.5C7.6,64.9,-8.9,66.8,-23.6,62C-38.3,57.1,-51.1,45.4,-58.9,30.8C-66.7,16.1,-69.4,-1.7,-65.3,-17.9C-61.3,-34.1,-50.4,-48.8,-37,-58.7C-23.5,-68.6,-7.5,-73.6,7.2,-81.9C21.8,-90.2,43.6,-101.9,46.2,-93.1C48.8,-84.4,35.1,-68.2,47.5,-57.2Z\' transform=\'translate(100 100)\' /%3E%3C/svg%3E")',
              backgroundSize: 'contain',
              backgroundRepeat: 'no-repeat'
            }} />
            
            {/* Animated flow overlay */}
            <Box sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'url("data:image/svg+xml,%3Csvg width=\'2000\' height=\'1500\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cdefs%3E%3ClinearGradient id=\'a\' gradientTransform=\'rotate(90)\'%3E%3Cstop offset=\'5%\' stop-color=\'%23007cbe\' stop-opacity=\'0\'/%3E%3Cstop offset=\'95%\' stop-color=\'%230096d5\' stop-opacity=\'.1\'/%3E%3C/linearGradient%3E%3C/defs%3E%3Cpath fill=\'url(%23a)\' d=\'M0 0h2000v1500H0z\'/%3E%3Cpath d=\'M0 0v166c280 187 1720 187 2000 0V0z\' fill-opacity=\'.1\'/%3E%3C/svg%3E")',
              backgroundSize: 'cover',
              opacity: 0.3
            }} />
          </Box>

          <Container 
            maxWidth={false} 
            disableGutters 
            sx={{ 
              display: 'flex', 
              width: '100%', 
              height: '100%',
              px: { xs: 3, sm: 4, md: 6, lg: 8 },
              position: 'relative',
              zIndex: 2
            }}
          >
            <Fade in={true} timeout={1000}>
              <Box
                sx={{ 
                  display: 'flex',
                  flexDirection: { xs: 'column', md: 'row' },
                  alignItems: 'center',
                  justifyContent: { xs: 'center', md: 'space-between' },
                  width: '100%',
                  height: '100%',
                  gap: 4
                }}
              >
                <Box sx={{ 
                  maxWidth: { xs: '100%', md: '55%' }, 
                  textAlign: { xs: 'center', md: 'left' },
                  position: 'relative',
                  zIndex: 3,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: { xs: 'center', md: 'flex-start' }
                }}>
                  <Stack 
                    direction="row" 
                    spacing={2} 
                    alignItems="center" 
                    sx={{ 
                      mb: 4, 
                      justifyContent: { xs: 'center', md: 'flex-start' },
                      position: 'relative',
                      '&::after': {
                        content: '""',
                        position: 'absolute',
                        width: { xs: '40px', md: '60px' },
                        height: '2px',
                        background: 'linear-gradient(90deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0) 100%)',
                        bottom: '-10px',
                        left: { xs: 'calc(50% - 20px)', md: '0' }
                      }
                    }}
                  >
                    <Box sx={{
                      width: 50,
                      height: 50,
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'rgba(255, 255, 255, 0.1)',
                      backdropFilter: 'blur(5px)',
                      boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}>
                      <img 
                        src="/scope_logo.png" 
                        alt="Scope Logo" 
                        style={{ 
                          width: 40, 
                          height: 40,
                          objectFit: 'contain',
                          filter: 'drop-shadow(0px 4px 8px rgba(0, 0, 0, 0.2))'
                        }} 
                      />
                    </Box>
                    <Fade in={true} style={{ transitionDelay: '300ms' }}>
                      <Typography 
                        variant="h6" 
                        component="span"
                        sx={{ 
                          fontWeight: 700,
                          letterSpacing: 2,
                          textTransform: 'uppercase',
                          color: 'rgba(255, 255, 255, 0.95)',
                          background: 'linear-gradient(90deg, rgba(255,255,255,1) 0%, rgba(200,240,255,0.9) 100%)',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                        }}
                      >
                        SCOPE presents
                      </Typography>
                    </Fade>
                  </Stack>
                  
                  <Fade in={true} style={{ transitionDelay: '500ms' }}>
                    <Typography
                      variant="h1"
                      component="h1"
                      gutterBottom
                      sx={{
                        fontWeight: 800,
                        lineHeight: 1.1,
                        fontSize: { xs: '2.75rem', sm: '3.5rem', md: '4.5rem' },
                        textShadow: '0px 4px 12px rgba(0, 0, 0, 0.15)',
                        mb: 3,
                        background: 'linear-gradient(90deg, rgba(255,255,255,1) 0%, rgba(200,240,255,0.9) 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        position: 'relative',
                        textAlign: { xs: 'center', md: 'left' },
                        '&::after': {
                          content: '""',
                          position: 'absolute',
                          width: { xs: '80px', md: '120px' },
                          height: '8px',
                          background: 'linear-gradient(90deg, rgba(0,168,232,0.7) 0%, rgba(0,168,232,0) 100%)',
                          bottom: '-10px',
                          left: { xs: 'calc(50% - 40px)', md: '0' },
                          borderRadius: '4px'
                        }
                      }}
                    >
                      Code Stats
                    </Typography>
                  </Fade>
                  
                  <Fade in={true} style={{ transitionDelay: '700ms' }}>
                    <Typography 
                      variant="h6" 
                      color="rgba(255, 255, 255, 0.9)"
                      sx={{ 
                        mb: 6, 
                        fontWeight: 400, 
                        fontSize: '1.25rem', 
                        maxWidth: '600px',
                        lineHeight: 1.6,
                        textShadow: '0 2px 10px rgba(0,0,0,0.1)',
                        position: 'relative',
                        pl: { md: 4, xs: 0 },
                        textAlign: { xs: 'center', md: 'left' },
                        mx: { xs: 'auto', md: 0 },
                        '&::before': {
                          content: { md: '""', xs: 'none' },
                          position: 'absolute',
                          width: '2px',
                          height: '100%',
                          background: 'linear-gradient(180deg, rgba(0,168,232,0.7) 0%, rgba(0,168,232,0) 100%)',
                          left: '0',
                          top: '0',
                          borderRadius: '2px'
                        }
                      }}
                    >
                      Your one-stop solution for tracking competitive programming progress across multiple platforms
                    </Typography>
                  </Fade>
                  
                  <Stack 
                    direction={{ xs: 'column', sm: 'row' }} 
                    spacing={3}
                    sx={{ 
                      justifyContent: { xs: 'center', md: 'flex-start' },
                      width: { xs: '100%', sm: 'auto' },
                      alignItems: 'center'
                    }}
                  >
                    <Fade in={true} style={{ transitionDelay: '900ms' }}>
                      <Button
                        variant="contained"
                        size="large"
                        onClick={() => navigate('/register')}
                        endIcon={<KeyboardArrowRight />}
                        sx={{ 
                          py: 2, 
                          px: 4,
                          fontWeight: 600,
                          fontSize: '1rem',
                          backgroundColor: 'rgba(0, 0, 0, 0.8)',
                          color: 'white',
                          borderRadius: '50px',
                          boxShadow: '0 5px 15px rgba(0, 0, 0, 0.2)',
                          position: 'relative',
                          overflow: 'hidden',
                          width: { xs: '100%', sm: 'auto' },
                          '&::before': {
                            content: '""',
                            position: 'absolute',
                            top: 0,
                            left: '-100%',
                            width: '100%',
                            height: '100%',
                            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
                            transition: 'all 0.5s',
                          },
                          '&:hover': {
                            backgroundColor: 'rgba(0, 0, 0, 0.9)',
                            transform: 'translateY(-3px)',
                            boxShadow: '0 8px 25px rgba(0, 0, 0, 0.3)',
                            '&::before': {
                              left: '100%'
                            }
                          }
                        }}
                      >
                        Get Started
                      </Button>
                    </Fade>
                    
                    <Fade in={true} style={{ transitionDelay: '1100ms' }}>
                      <Button
                        variant="outlined"
                        size="large"
                        onClick={() => navigate('/login')}
                        sx={{ 
                          py: 2, 
                          px: 4,
                          fontWeight: 600,
                          fontSize: '1rem',
                          color: 'white',
                          borderColor: 'rgba(255, 255, 255, 0.4)',
                          borderWidth: '2px',
                          borderRadius: '50px',
                          backdropFilter: 'blur(5px)',
                          background: 'rgba(255, 255, 255, 0.05)',
                          transition: 'all 0.3s ease',
                          width: { xs: '100%', sm: 'auto' },
                          '&:hover': {
                            borderColor: 'white',
                            backgroundColor: 'rgba(255, 255, 255, 0.1)',
                            transform: 'translateY(-3px)',
                            boxShadow: '0 5px 15px rgba(0, 0, 0, 0.1)'
                          }
                        }}
                      >
                        Sign In
                      </Button>
                    </Fade>
                  </Stack>
                </Box>
                
                {/* Enhanced Dark container for Scope Club logo on the right */}
                {!isMobile && (
                  <Fade in={true} style={{ transitionDelay: '700ms' }}>
                    <Box
                      sx={{ 
                        maxWidth: '40%',
                        minWidth: { md: '400px' },
                        minHeight: '350px',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        position: 'relative',
                        backgroundColor: 'rgba(0, 0, 0, 0.9)',
                        backdropFilter: 'blur(10px)',
                        borderRadius: '20px',
                        p: 4,
                        boxShadow: '0px 20px 40px rgba(0, 0, 0, 0.3), 0px 0px 50px rgba(0, 168, 232, 0.1)',
                        overflow: 'hidden',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        '&::before': {
                          content: '""',
                          position: 'absolute',
                          width: '150%',
                          height: '150%',
                          background: 'radial-gradient(circle, rgba(0,168,232,0.05) 0%, rgba(0,0,0,0) 70%)',
                          top: '-25%',
                          left: '-25%'
                        }
                      }}
                    >
                      {/* Decorative dots */}
                      <Box sx={{
                        position: 'absolute',
                        width: 15,
                        height: 15,
                        borderRadius: '50%',
                        backgroundColor: '#444',
                        top: '20px',
                        left: '20px',
                      }} />
                      
                      <Box sx={{
                        position: 'absolute',
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        backgroundColor: '#666',
                        top: '20px',
                        left: '45px',
                      }} />
                      
                      <Box sx={{
                        position: 'absolute',
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        backgroundColor: '#333',
                        top: '20px',
                        left: '65px',
                      }} />
                      
                      {/* Decorative grid lines */}
                      <Box sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        opacity: 0.2,
                        backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px)',
                        backgroundSize: '20px 20px',
                      }} />
                      
                      {/* Main scope logo in center */}
                      <Box
                        component="img"
                        src="/scope_logo.png"
                        alt="SCOPE CLUB"
                        sx={{
                          width: '100%',
                          maxWidth: 300,
                          height: 'auto',
                          objectFit: 'contain',
                          filter: 'drop-shadow(0px 10px 25px rgba(0, 0, 0, 0.5))',
                          animation: 'pulse 4s infinite ease-in-out',
                          '@keyframes pulse': {
                            '0%': { opacity: 0.9, transform: 'scale(0.98)' },
                            '50%': { opacity: 1, transform: 'scale(1.02)' },
                            '100%': { opacity: 0.9, transform: 'scale(0.98)' },
                          }
                        }}
                      />
                      
                      {/* Decorative dot in bottom right */}
                      <Box sx={{
                        position: 'absolute',
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #0077b6 0%, #00a8e8 100%)',
                        boxShadow: '0 0 15px rgba(0, 168, 232, 0.7)',
                        bottom: '30px',
                        right: '30px',
                      }} />
                      
                      {/* Glowing effect */}
                      <Box sx={{
                        position: 'absolute',
                        width: '80%',
                        height: '40%',
                        borderRadius: '50%',
                        background: 'radial-gradient(ellipse at center, rgba(0,168,232,0.15) 0%, rgba(0,119,182,0) 70%)',
                        filter: 'blur(20px)',
                        bottom: '-10%',
                        left: '10%',
                      }} />
                    </Box>
                  </Fade>
                )}
              </Box>
            </Fade>
          </Container>
        </Box>

        {/* Wave separator */}
        <Box sx={{
          height: 50,
          width: '100%',
          background: 'white',
          position: 'relative',
          zIndex: 1,
          mt: 0,
          '&::before': {
            content: '""',
            position: 'absolute',
            top: -50,
            left: 0,
            right: 0,
            height: 50,
            background: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1440 120'%3E%3Cpath fill='%23FFFFFF' fill-opacity='1' d='M0,96L80,101.3C160,107,320,117,480,112C640,107,800,85,960,80C1120,75,1280,85,1360,90.7L1440,96L1440,320L1360,320C1280,320,1120,320,960,320C800,320,640,320,480,320C320,320,160,320,80,320L0,320Z'%3E%3C/path%3E%3C/svg%3E")`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }
        }} />

        {/* Features Section */}
        <Box sx={{ 
          py: 8, 
          bgcolor: 'white',
          width: '100%'
        }}>
          <Container 
            maxWidth={false} 
            disableGutters
            sx={{ 
              width: '100%', 
              px: { xs: 3, sm: 4, md: 6, lg: 8 } 
            }}
          >
            <Fade in={true} timeout={1000}>
              <Box sx={{ textAlign: 'center', mb: 8 }}>
                <Typography 
                  variant="overline" 
                  component="p" 
                  sx={{ 
                    color: '#0077b6', 
                    fontWeight: 600,
                    letterSpacing: 2 
                  }}
                >
                  POWERFUL FEATURES
                </Typography>
                <Typography 
                  variant="h3" 
                  component="h2" 
                  sx={{ 
                    fontWeight: 700, 
                    mb: 2,
                    color: '#0077b6'
                  }}
                >
                  Everything You Need
                </Typography>
                <Typography 
                  variant="body1" 
                  color="text.secondary" 
                  sx={{ 
                    maxWidth: 650, 
                    mx: 'auto',
                    fontSize: '1.1rem',
                    color: '#000',
                    fontWeight: 500
                  }}
                >
                  Code Stats offers a suite of essential tools to help you monitor, analyze, and improve your competitive programming skills.
                </Typography>
              </Box>
            </Fade>

            <Grid container spacing={4} sx={{ mt: 2, width: '100%', mx: 0 }}>
              {features.map((feature, index) => (
                <Grid item xs={12} sm={6} md={3} key={index}>
                  <Zoom in={true} style={{ transitionDelay: `${200 * index}ms` }}>
                    <Paper
                      component={Card}
                      elevation={3}
                      sx={{
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        borderRadius: 3,
                        overflow: 'hidden',
                        transition: 'all 0.3s ease',
                        backgroundColor: '#0077b6',
                        border: '1px solid rgba(255,255,255,0.1)',
                        boxShadow: '0px 10px 25px rgba(0, 119, 182, 0.3)',
                        '&:hover': {
                          transform: 'translateY(-10px)',
                          boxShadow: '0px 15px 35px rgba(0, 119, 182, 0.4)',
                        }
                      }}
                    >
                      <Box 
                        sx={{ 
                          p: 3, 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          backgroundColor: 'rgba(255,255,255,0.15)',
                          borderBottom: '1px solid rgba(255,255,255,0.1)'
                        }}
                      >
                        <Avatar
                          sx={{
                            width: 70,
                            height: 70,
                            backgroundColor: 'rgba(255,255,255,0.9)',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
                          }}
                        >
                          {feature.icon}
                        </Avatar>
                      </Box>
                      <CardContent sx={{ p: 3, flexGrow: 1 }}>
                        <Typography 
                          variant="h6" 
                          component="h3" 
                          gutterBottom
                          sx={{ 
                            fontWeight: 600,
                            textAlign: 'center',
                            color: 'white'
                          }}
                        >
                          {feature.title}
                        </Typography>
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            textAlign: 'center',
                            lineHeight: 1.6,
                            color: 'rgba(255,255,255,0.9)'
                          }}
                        >
                          {feature.description}
                        </Typography>
                      </CardContent>
                    </Paper>
                  </Zoom>
                </Grid>
              ))}
            </Grid>
          </Container>
        </Box>

        {/* Footer Section with Logo and Copyright */}
        <Box 
          component="footer" 
          sx={{ 
            py: 4, 
            bgcolor: '#f8f9fa',
            borderTop: '1px solid rgba(0,119,182,0.1)',
            width: '100%'
          }}
        >
          <Container 
            maxWidth={false} 
            disableGutters
            sx={{ 
              width: '100%', 
              px: { xs: 3, sm: 4, md: 6, lg: 8 } 
            }}
          >
            <Fade in={true} timeout={1000}>
              <Stack 
                direction={{ xs: 'column', sm: 'row' }} 
                justifyContent="space-between" 
                alignItems="center" 
                spacing={2}
              >
                <Stack direction="row" spacing={1} alignItems="center">
                  <img 
                    src="/codestats.png" 
                    alt="Code Stats Logo" 
                    style={{ width: 32, height: 32 }} 
                  />
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#0077b6' }}>
                    Code Stats
                  </Typography>
                </Stack>
                <Typography variant="body2" sx={{ color: '#000' }}>
                  © {new Date().getFullYear()} MLRIT SCOPE. All rights reserved.
                </Typography>
              </Stack>
            </Fade>
          </Container>
        </Box>
      </Box>
    </>
  );
};

export default Landing;