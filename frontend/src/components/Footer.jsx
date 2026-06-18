import React, { useState, useEffect } from 'react';
import { Box, Container, Typography, useMediaQuery } from '@mui/material';
import { useTheme } from '../contexts/ThemeContext';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Footer = () => {
  const { darkMode, theme } = useTheme();
  const { token } = useAuth();
  const location = useLocation();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Check if current path is an auth page or public page
  const isAuthPage = location.pathname === '/login' || 
                    location.pathname === '/register' || 
                    location.pathname.startsWith('/register');
  const isPublicPage = location.pathname.startsWith('/public-profile/');
  const isCohortProblemPage = /^\/cohorts\/[^/]+\/modules\/[^/]+\/questions\/[^/]+$/.test(location.pathname);
  const isTestPage = location.pathname.startsWith('/practice-arena/tests/');
  
  // Determine if navigation is shown
  const shouldShowNavigation = token && !isAuthPage && !isCohortProblemPage && !isTestPage && !isPublicPage;
  
  // Listen to sidebar state changes through body classes
  useEffect(() => {
    const checkSidebarState = () => {
      const isExpanded = document.body.classList.contains('sidebar-expanded');
      setSidebarOpen(isExpanded);
    };
    
    // Initial check
    checkSidebarState();
    
    // Listen for class changes
    const observer = new MutationObserver(checkSidebarState);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['class']
    });
    
    return () => observer.disconnect();
  }, []);
  
  // Calculate sidebar width
  const sidebarWidth = isMobile ? 0 : (sidebarOpen ? 280 : 75);
  
  // Theme-aware colors
  const themeColors = {
    footerBg: darkMode ? '#000000' : '#ffffff',
    text: darkMode ? '#ffffff' : '#191919',
    border: darkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.15)',
  };

  return (
    <Box 
      component="footer" 
      sx={{
        position: 'relative',
        background: themeColors.footerBg,
        backdropFilter: 'blur(10px)',
        width: shouldShowNavigation && !isMobile ? `calc(100% - ${sidebarWidth}px)` : '100%',
        ml: shouldShowNavigation && !isMobile ? `${sidebarWidth}px` : 0,
        mt: 'auto',
        py: 1.5, // Reduced height
        borderTop: `1px solid ${themeColors.border}`,
        zIndex: 10,
        transition: 'all 0.25s ease',
      }}
    >
      <Container 
        maxWidth={false}
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: 'center',
          justifyContent: 'center',
          gap: 1.5, // Reduced gap
          px: 2, // Add some padding
        }}
      >
        {/* Logo Section */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center',
          justifyContent: 'center', 
        }}>
          {/* SCOPE Club Logo */}
          <img 
            src={darkMode ? "/footer-dark.png" : "/footer-light.png"} 
            alt="SCOPE Club" 
            style={{ 
              height: '32px', // Reduced from 40px to 32px
              width: 'auto',
              objectFit: 'contain'
            }} 
          />
        </Box>
        
        {/* Copyright Section */}
        <Typography 
          variant="body2" 
          component="div"
          sx={{ 
            color: darkMode ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.8)',
            fontSize: '0.85rem', // Slightly smaller text
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontWeight: 500,
          }}
        >
          <Box component="span" sx={{ fontSize: '0.9rem', lineHeight: 1 }}>©</Box>
          2025 SCOPE club, All rights Reserved
        </Typography>
      </Container>
    </Box>
  );
};

export default Footer; 