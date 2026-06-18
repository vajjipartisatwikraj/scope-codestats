import React from 'react';
import { Box, Typography, Button, useMediaQuery } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';

const NotFound = () => {
  const navigate = useNavigate();
  const { theme, darkMode } = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: isMobile ? '16px' : '20px',
        textAlign: 'center',
        backgroundColor: darkMode ? '#000000' : '#ffffff',
      }}
    >
      <Box
        component="img"
        src={darkMode ? '/404-dark.png' : '/404-light.png'}
        alt="404 Not Found"
        sx={{
          maxWidth: '100%',
          height: 'auto',
          width: isMobile ? '300px' : isTablet ? '400px' : '500px',
          maxHeight: isMobile ? '300px' : isTablet ? '350px' : '450px',
          objectFit: 'contain',
          marginBottom: isMobile ? 2 : 3,
        }}
      />
      <Typography
        variant={isMobile ? "h5" : "h4"}
        sx={{
          marginBottom: isMobile ? 1 : 1.5,
          fontWeight: 600,
          color: darkMode ? '#ffffff' : '#191919',
          fontSize: isMobile ? '1.25rem' : isTablet ? '1.35rem' : '1.5rem',
        }}
      >
        Oops! Page Not Found
      </Typography>
      <Typography
        variant="body1"
        sx={{
          marginBottom: isMobile ? 2 : 3,
          color: darkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)',
          maxWidth: isMobile ? '280px' : isTablet ? '400px' : '500px',
          fontSize: isMobile ? '0.75rem' : isTablet ? '0.775rem' : '0.8rem',
          px: isMobile ? 2 : 0,
        }}
      >
        The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
      </Typography>
      <Button
        variant="contained"
        onClick={() => navigate('/')}
        sx={{
          backgroundColor: darkMode ? '#0088cc' : '#0a66c2',
          '&:hover': {
            backgroundColor: darkMode ? '#006699' : '#004182',
          },
          textTransform: 'none',
          fontWeight: 500,
          fontSize: isMobile ? '0.8rem' : '0.9rem',
          padding: isMobile ? '4px 16px' : '6px 20px',
          minWidth: isMobile ? '120px' : '140px',
        }}
      >
        Go to Homepage
      </Button>
    </Box>
  );
};

export default NotFound; 