import React, { useState, useEffect, useRef } from 'react';
import { Box, Container, Typography, TextField, IconButton, InputAdornment, CircularProgress, List, ListItem, ListItemText, ListItemAvatar, Avatar, Divider, Paper } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import PersonIcon from '@mui/icons-material/Person';
import GroupIcon from '@mui/icons-material/Group';
import WorkIcon from '@mui/icons-material/Work';
import SchoolIcon from '@mui/icons-material/School';
import CloseIcon from '@mui/icons-material/Close';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { apiUrl } from '../config/apiConfig';

// Animated Placeholder Component
const AnimatedPlaceholder = ({ darkMode }) => {
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [animationState, setAnimationState] = useState('visible');
  const searchTerms = ['Users', 'Courses', 'Opportunities', 'Cohorts'];
  
  useEffect(() => {
    // Start with visible state
    setAnimationState('visible');
    
    // After 2 seconds, start fade out
    const fadeOutTimer = setTimeout(() => {
      setAnimationState('fadeOut');
    }, 2000);
    
    // After fade out, change word and fade in
    const changeWordTimer = setTimeout(() => {
      setAnimationState('fadeIn');
      setCurrentWordIndex((prevIndex) => (prevIndex + 1) % searchTerms.length);
    }, 2300);
    
    // Clean up timers
    return () => {
      clearTimeout(fadeOutTimer);
      clearTimeout(changeWordTimer);
    };
  }, [currentWordIndex]);
  
  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center' }}>
      <Typography
        variant="body2"
        component="span"
        sx={{ 
          color: darkMode ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)',
          fontSize: '0.9rem',
          whiteSpace: 'nowrap'
        }}
      >
        Find 
      </Typography>
      <Typography
        variant="body2"
        component="span"
        sx={{
          color: darkMode ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)',
          fontSize: '0.9rem',
          width: '110px',
          display: 'inline-block',
          position: 'relative',
          overflow: 'hidden',
          height: '20px',
          ml: '3px'
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            left: 0,
            opacity: animationState === 'fadeOut' ? 0 : 1,
            transform: animationState === 'fadeIn' 
              ? 'translateY(-100%)' 
              : animationState === 'fadeOut' 
                ? 'translateY(100%)' 
                : 'translateY(0)',
            transition: 'transform 0.3s ease, opacity 0.3s ease',
            whiteSpace: 'nowrap'
          }}
        >
          "{searchTerms[currentWordIndex]}"
        </Box>
      </Typography>
    </Box>
  );
};

const SearchPage = () => {
  const { darkMode } = useTheme();
  const { token } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef(null);
  const timeoutRef = useRef(null);
  
  // Get theme-aware colors for iOS Liquid Glass
  const themeColors = {
    searchBg: darkMode 
      ? 'rgba(30, 30, 30, 0.95)' 
      : 'rgba(255, 255, 255, 0.95)',
    searchHoverBg: darkMode 
      ? 'rgba(40, 40, 40, 0.98)' 
      : 'rgba(255, 255, 255, 0.98)',
    searchText: darkMode ? '#ffffff' : '#000000',
    searchPlaceholder: darkMode ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)',
    resultsBg: darkMode 
      ? 'rgba(25, 25, 25, 0.92)' 
      : 'rgba(255, 255, 255, 0.85)',
    resultsHoverBg: darkMode 
      ? 'rgba(35, 35, 35, 0.95)' 
      : 'rgba(250, 250, 250, 0.95)',
    sectionHeaderBg: darkMode
      ? 'rgba(255, 255, 255, 0.04)'
      : 'rgba(0, 0, 0, 0.02)',
    iconBg: darkMode
      ? 'rgba(30, 30, 30, 0.95)'
      : 'rgba(255, 255, 255, 0.95)',
    borderColor: darkMode 
      ? 'rgba(255, 255, 255, 0.12)' 
      : 'rgba(0, 0, 0, 0.10)',
    scrollbarThumb: darkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.25)',
    scrollbarTrack: 'transparent',
  };

  // Custom scrollbar style
  const customScrollbarStyle = {
    '&::-webkit-scrollbar': {
      width: '6px',
    },
    '&::-webkit-scrollbar-track': {
      background: themeColors.scrollbarTrack,
      marginTop: '8px',
      marginBottom: '8px',
    },
    '&::-webkit-scrollbar-thumb': {
      backgroundColor: themeColors.scrollbarThumb,
      borderRadius: '10px',
      transition: 'background-color 0.2s ease',
    },
    '&::-webkit-scrollbar-thumb:hover': {
      backgroundColor: darkMode ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)',
    },
    scrollbarWidth: 'thin',
    scrollbarColor: `${themeColors.scrollbarThumb} ${themeColors.scrollbarTrack}`
  };

  // Focus input on load
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      setIsFocused(true);
    }
  }, []);

  // Handle search
  useEffect(() => {
    if (!token || !query.trim()) {
      setResults(null);
      setLoading(false);
      return;
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await axios.get(`${apiUrl}/search?query=${query}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setResults(response.data);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [query, token]);

  const handleItemClick = (type, item) => {
    switch (type) {
      case 'user':
        navigate(`/user-view/${item.username}`);
        break;
      case 'cohort':
        navigate(`/cohorts/${item._id}`);
        break;
      case 'opportunity':
        navigate(`/opportunities/${item._id}`);
        break;
      case 'course':
        navigate(`/courses/${item._id}`);
        break;
      default:
        break;
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = () => {
    if (!query) {
      setIsFocused(false);
    }
  };

  const showAnimation = !isFocused && !query;

  return (
    <Box 
      sx={{ 
        width: '100%',
        minHeight: '100vh',
        height: '100%',
        overflow: 'auto',
        px: { xs: 2, sm: 3, md: 4 },
        py: { xs: 2, sm: 3 },
        ...customScrollbarStyle
      }}
    >
      {/* Search Header - Sticky */}
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: { xs: 1.5, sm: 2 },
        mb: 3,
        position: 'sticky',
        top: 0,
        zIndex: 100,
        pt: { xs: 1, sm: 1 },
        pb: { xs: 2, sm: 2 },
        backgroundColor: darkMode ? '#121212' : '#f5f5f5',
        maxWidth: '900px',
        mx: 'auto',
      }}>
        {/* Back Button with Glass Effect */}
        <IconButton 
          onClick={() => navigate(-1)} 
          sx={{ 
            color: themeColors.searchText,
            width: { xs: 46, sm: 50 },
            height: { xs: 46, sm: 50 },
            borderRadius: '16px',
            background: themeColors.iconBg,
            backdropFilter: 'blur(40px) saturate(150%)',
            WebkitBackdropFilter: 'blur(40px) saturate(150%)',
            border: `1px solid ${themeColors.borderColor}`,
            boxShadow: darkMode
              ? '0 8px 32px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.08)'
              : '0 4px 16px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.9)',
            transition: 'all 0.2s cubic-bezier(0.4, 0.0, 0.2, 1)',
            flexShrink: 0,
            '&:hover': {
              background: themeColors.searchHoverBg,
              transform: 'scale(1.05)',
              boxShadow: darkMode
                ? '0 12px 40px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.12)'
                : '0 6px 24px rgba(0, 0, 0, 0.12), inset 0 1px 0 rgba(255, 255, 255, 1)',
            },
            '&:active': {
              transform: 'scale(0.98)',
            }
          }}
        >
          <ArrowBackIcon sx={{ fontSize: { xs: 22, sm: 24 } }} />
        </IconButton>

        {/* Search Input with Advanced Glass Effect */}
        <Box sx={{ position: 'relative', flexGrow: 1 }}>
          <TextField
            inputRef={inputRef}
            fullWidth
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={handleFocus}
            onBlur={handleBlur}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '18px',
                backgroundColor: themeColors.searchBg,
                backdropFilter: 'blur(40px) saturate(150%)',
                WebkitBackdropFilter: 'blur(40px) saturate(150%)',
                height: { xs: '46px', sm: '50px' },
                border: `1px solid ${themeColors.borderColor}`,
                boxShadow: darkMode
                  ? '0 8px 32px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.08), inset 0 -1px 0 rgba(0, 0, 0, 0.3)'
                  : '0 4px 16px rgba(0, 0, 0, 0.08), inset 0 1px 2px rgba(255, 255, 255, 0.9), inset 0 -1px 1px rgba(0, 0, 0, 0.05)',
                transition: 'all 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)',
                '&:hover': {
                  backgroundColor: themeColors.searchHoverBg,
                  transform: 'translateY(-1px)',
                  boxShadow: darkMode
                    ? '0 12px 40px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.12), inset 0 -1px 0 rgba(0, 0, 0, 0.4)'
                    : '0 6px 24px rgba(0, 0, 0, 0.1), inset 0 1px 2px rgba(255, 255, 255, 1), inset 0 -1px 1px rgba(0, 0, 0, 0.06)',
                },
                '&.Mui-focused': {
                  backgroundColor: themeColors.searchHoverBg,
                  transform: 'translateY(-1px)',
                  border: `1.5px solid ${darkMode ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.2)'}`,
                  boxShadow: darkMode
                    ? '0 12px 48px rgba(0, 0, 0, 0.7), inset 0 2px 0 rgba(255, 255, 255, 0.12)'
                    : '0 8px 32px rgba(0, 0, 0, 0.12), inset 0 2px 2px rgba(255, 255, 255, 1)',
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  border: 'none',
                },
              },
              '& .MuiInputBase-input': {
                fontSize: { xs: '0.95rem', sm: '1rem' },
                fontWeight: 500,
                padding: { xs: '10px 16px 10px 48px', sm: '12px 18px 12px 52px' },
                color: themeColors.searchText,
                letterSpacing: '0.01em',
              },
              '& .MuiOutlinedInput-notchedOutline': {
                border: 'none',
              }
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start" sx={{ ml: { xs: 1, sm: 1.5 } }}>
                  <SearchIcon 
                    sx={{ 
                      fontSize: { xs: 22, sm: 24 }, 
                      color: themeColors.searchText,
                      opacity: 0.7
                    }} 
                  />
                </InputAdornment>
              ),
              endAdornment: query ? (
                <InputAdornment position="end" sx={{ mr: 0.5 }}>
                  {loading ? (
                    <CircularProgress 
                      size={18} 
                      thickness={4}
                      sx={{ 
                        color: themeColors.searchText,
                        opacity: 0.7
                      }} 
                    />
                  ) : (
                    <IconButton 
                      size="small" 
                      onClick={() => setQuery('')}
                      sx={{
                        color: themeColors.searchText,
                        opacity: 0.7,
                        width: 32,
                        height: 32,
                        borderRadius: '10px',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          opacity: 1,
                          backgroundColor: darkMode 
                            ? 'rgba(255, 255, 255, 0.1)' 
                            : 'rgba(0, 0, 0, 0.08)',
                        }
                      }}
                    >
                      <CloseIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  )}
                </InputAdornment>
              ) : null
            }}
          />
          {showAnimation && (
            <Box 
              sx={{ 
                position: 'absolute', 
                left: { xs: '50px', sm: '56px' }, 
                top: '50%', 
                transform: 'translateY(-50%)',
                pointerEvents: 'none'
              }}
            >
              <AnimatedPlaceholder darkMode={darkMode} />
            </Box>
          )}
        </Box>
      </Box>

      {/* Content Container */}
      <Box sx={{ maxWidth: '900px', mx: 'auto' }}>
        {/* Empty State */}
        {!query && (
          <Box sx={{ 
            textAlign: 'center', 
            mt: { xs: 8, sm: 12 }, 
            px: 2,
            opacity: 0.9
          }}>
            <Typography 
              variant="h6" 
              sx={{ 
                mb: 2, 
                fontSize: { xs: '1.1rem', sm: '1.35rem' },
                fontWeight: 600,
                color: 'text.primary',
                letterSpacing: '-0.01em'
              }}
            >
              Search for users, cohorts, opportunities, or courses
            </Typography>
            <Typography 
              variant="body2" 
              sx={{ 
                fontSize: { xs: '0.9rem', sm: '0.95rem' },
                color: 'text.secondary',
                opacity: 0.8
              }}
            >
              Type in the search box above to find what you're looking for
            </Typography>
          </Box>
        )}

        {/* Minimum Characters State */}
        {query && !loading && !results && (
          <Box sx={{ 
            textAlign: 'center', 
            mt: { xs: 8, sm: 12 }, 
            px: 2 
          }}>
            <Typography 
              variant="body1" 
              sx={{ 
                fontSize: { xs: '0.9rem', sm: '1rem' },
                color: 'text.secondary'
              }}
            >
              Enter at least 2 characters to search
            </Typography>
          </Box>
        )}

        {/* Search Results */}
        {query && results && (
          <Box sx={{ pb: 4 }}>
            {(results.users.length > 0 || 
              results.cohorts.length > 0 || 
              results.opportunities.length > 0 || 
              results.courses.length > 0) ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {/* Users Section */}
                {results?.users?.length > 0 && (
                  <Box>
                    <Typography 
                      variant="subtitle1" 
                      sx={{ 
                        fontWeight: 700, 
                        mb: 1.5,
                        px: 1,
                        fontSize: { xs: '0.95rem', sm: '1.05rem' },
                        color: 'text.primary',
                        letterSpacing: '-0.01em'
                      }}
                    >
                      Users <Box component="span" sx={{ opacity: 0.5, fontWeight: 500 }}>({results.users.length})</Box>
                    </Typography>
                    <List disablePadding sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {results.users.map((user) => (
                        <ListItem
                          key={user._id}
                          button
                          onClick={() => handleItemClick('user', user)}
                          sx={{ 
                            borderRadius: '16px',
                            px: { xs: 2, sm: 2.5 },
                            py: { xs: 1.5, sm: 1.75 },
                            backgroundColor: themeColors.resultsBg,
                            backdropFilter: 'blur(40px) saturate(150%)',
                            WebkitBackdropFilter: 'blur(40px) saturate(150%)',
                            border: `1px solid ${themeColors.borderColor}`,
                            boxShadow: darkMode
                              ? '0 8px 32px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.06)'
                              : '0 4px 16px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
                            transition: 'all 0.25s cubic-bezier(0.4, 0.0, 0.2, 1)',
                            cursor: 'pointer',
                            '&:hover': {
                              backgroundColor: themeColors.resultsHoverBg,
                              transform: 'translateX(6px) scale(1.01)',
                              boxShadow: darkMode
                                ? '0 12px 40px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.08)'
                                : '0 6px 24px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 1)',
                            },
                            '&:active': {
                              transform: 'translateX(4px) scale(0.99)',
                            }
                          }}
                        >
                          <ListItemAvatar sx={{ minWidth: { xs: 48, sm: 56 } }}>
                            <Avatar 
                              src={user.profilePicture} 
                              alt={user.name}
                              sx={{ 
                                width: { xs: 40, sm: 44 },
                                height: { xs: 40, sm: 44 },
                                boxShadow: darkMode
                                  ? '0 2px 8px rgba(0, 0, 0, 0.4)'
                                  : '0 2px 8px rgba(0, 0, 0, 0.1)',
                              }}
                            >
                              {!user.profilePicture && user.name?.[0]}
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText 
                            primary={user.name}
                            secondary={`${user.department || 'Department'} - ${user.section || 'Section'}`}
                            primaryTypographyProps={{
                              fontSize: { xs: '0.95rem', sm: '1rem' },
                              fontWeight: 600,
                              letterSpacing: '-0.01em',
                              color: 'text.primary'
                            }}
                            secondaryTypographyProps={{
                              fontSize: { xs: '0.8rem', sm: '0.85rem' },
                              color: 'text.secondary',
                              sx: { mt: 0.25 }
                            }}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                )}

                {/* Cohorts Section */}
                {results?.cohorts?.length > 0 && (
                  <Box>
                    <Typography 
                      variant="subtitle1" 
                      sx={{ 
                        fontWeight: 700, 
                        mb: 1.5,
                        px: 1,
                        fontSize: { xs: '0.95rem', sm: '1.05rem' },
                        color: 'text.primary',
                        letterSpacing: '-0.01em'
                      }}
                    >
                      Cohorts <Box component="span" sx={{ opacity: 0.5, fontWeight: 500 }}>({results.cohorts.length})</Box>
                    </Typography>
                    <List disablePadding sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {results.cohorts.map((cohort) => (
                        <ListItem
                          key={cohort._id}
                          button
                          onClick={() => handleItemClick('cohort', cohort)}
                          sx={{ 
                            borderRadius: '16px',
                            px: { xs: 2, sm: 2.5 },
                            py: { xs: 1.5, sm: 1.75 },
                            backgroundColor: themeColors.resultsBg,
                            backdropFilter: 'blur(40px) saturate(150%)',
                            WebkitBackdropFilter: 'blur(40px) saturate(150%)',
                            border: `1px solid ${themeColors.borderColor}`,
                            boxShadow: darkMode
                              ? '0 8px 32px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.06)'
                              : '0 4px 16px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
                            transition: 'all 0.25s cubic-bezier(0.4, 0.0, 0.2, 1)',
                            cursor: 'pointer',
                            '&:hover': {
                              backgroundColor: themeColors.resultsHoverBg,
                              transform: 'translateX(6px) scale(1.01)',
                              boxShadow: darkMode
                                ? '0 12px 40px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.08)'
                                : '0 6px 24px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 1)',
                            },
                            '&:active': {
                              transform: 'translateX(4px) scale(0.99)',
                            }
                          }}
                        >
                          <ListItemAvatar sx={{ minWidth: { xs: 48, sm: 56 } }}>
                            <Avatar 
                              sx={{ 
                                bgcolor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                width: { xs: 40, sm: 44 },
                                height: { xs: 40, sm: 44 },
                                boxShadow: '0 2px 12px rgba(102, 126, 234, 0.4)',
                              }}
                            >
                              <GroupIcon sx={{ fontSize: { xs: 20, sm: 22 } }} />
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText 
                            primary={cohort.title} 
                            secondary={cohort.description?.substring(0, 60) + (cohort.description?.length > 60 ? '...' : '')}
                            primaryTypographyProps={{
                              fontSize: { xs: '0.95rem', sm: '1rem' },
                              fontWeight: 600,
                              letterSpacing: '-0.01em',
                              color: 'text.primary'
                            }}
                            secondaryTypographyProps={{
                              fontSize: { xs: '0.8rem', sm: '0.85rem' },
                              color: 'text.secondary',
                              sx: { mt: 0.25 }
                            }}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                )}

                {/* Opportunities Section */}
                {results?.opportunities?.length > 0 && (
                  <Box>
                    <Typography 
                      variant="subtitle1" 
                      sx={{ 
                        fontWeight: 700, 
                        mb: 1.5,
                        px: 1,
                        fontSize: { xs: '0.95rem', sm: '1.05rem' },
                        color: 'text.primary',
                        letterSpacing: '-0.01em'
                      }}
                    >
                      Opportunities <Box component="span" sx={{ opacity: 0.5, fontWeight: 500 }}>({results.opportunities.length})</Box>
                    </Typography>
                    <List disablePadding sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {results.opportunities.map((opportunity) => (
                        <ListItem
                          key={opportunity._id}
                          button
                          onClick={() => handleItemClick('opportunity', opportunity)}
                          sx={{ 
                            borderRadius: '16px',
                            px: { xs: 2, sm: 2.5 },
                            py: { xs: 1.5, sm: 1.75 },
                            backgroundColor: themeColors.resultsBg,
                            backdropFilter: 'blur(40px) saturate(150%)',
                            WebkitBackdropFilter: 'blur(40px) saturate(150%)',
                            border: `1px solid ${themeColors.borderColor}`,
                            boxShadow: darkMode
                              ? '0 8px 32px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.06)'
                              : '0 4px 16px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
                            transition: 'all 0.25s cubic-bezier(0.4, 0.0, 0.2, 1)',
                            cursor: 'pointer',
                            '&:hover': {
                              backgroundColor: themeColors.resultsHoverBg,
                              transform: 'translateX(6px) scale(1.01)',
                              boxShadow: darkMode
                                ? '0 12px 40px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.08)'
                                : '0 6px 24px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 1)',
                            },
                            '&:active': {
                              transform: 'translateX(4px) scale(0.99)',
                            }
                          }}
                        >
                          <ListItemAvatar sx={{ minWidth: { xs: 48, sm: 56 } }}>
                            <Avatar 
                              sx={{ 
                                bgcolor: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                                background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                                width: { xs: 40, sm: 44 },
                                height: { xs: 40, sm: 44 },
                                boxShadow: '0 2px 12px rgba(245, 87, 108, 0.4)',
                              }}
                            >
                              <WorkIcon sx={{ fontSize: { xs: 20, sm: 22 } }} />
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText 
                            primary={opportunity.title} 
                            secondary={opportunity.company}
                            primaryTypographyProps={{
                              fontSize: { xs: '0.95rem', sm: '1rem' },
                              fontWeight: 600,
                              letterSpacing: '-0.01em',
                              color: 'text.primary'
                            }}
                            secondaryTypographyProps={{
                              fontSize: { xs: '0.8rem', sm: '0.85rem' },
                              color: 'text.secondary',
                              sx: { mt: 0.25 }
                            }}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                )}

                {/* Courses Section */}
                {results?.courses?.length > 0 && (
                  <Box>
                    <Typography 
                      variant="subtitle1" 
                      sx={{ 
                        fontWeight: 700, 
                        mb: 1.5,
                        px: 1,
                        fontSize: { xs: '0.95rem', sm: '1.05rem' },
                        color: 'text.primary',
                        letterSpacing: '-0.01em'
                      }}
                    >
                      Courses <Box component="span" sx={{ opacity: 0.5, fontWeight: 500 }}>({results.courses.length})</Box>
                    </Typography>
                    <List disablePadding sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {results.courses.map((course) => (
                        <ListItem
                          key={course._id}
                          button
                          onClick={() => handleItemClick('course', course)}
                          sx={{ 
                            borderRadius: '16px',
                            px: { xs: 2, sm: 2.5 },
                            py: { xs: 1.5, sm: 1.75 },
                            backgroundColor: themeColors.resultsBg,
                            backdropFilter: 'blur(40px) saturate(150%)',
                            WebkitBackdropFilter: 'blur(40px) saturate(150%)',
                            border: `1px solid ${themeColors.borderColor}`,
                            boxShadow: darkMode
                              ? '0 8px 32px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.06)'
                              : '0 4px 16px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
                            transition: 'all 0.25s cubic-bezier(0.4, 0.0, 0.2, 1)',
                            cursor: 'pointer',
                            '&:hover': {
                              backgroundColor: themeColors.resultsHoverBg,
                              transform: 'translateX(6px) scale(1.01)',
                              boxShadow: darkMode
                                ? '0 12px 40px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.08)'
                                : '0 6px 24px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 1)',
                            },
                            '&:active': {
                              transform: 'translateX(4px) scale(0.99)',
                            }
                          }}
                        >
                          <ListItemAvatar sx={{ minWidth: { xs: 48, sm: 56 } }}>
                            <Avatar 
                              sx={{ 
                                bgcolor: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                                background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                                width: { xs: 40, sm: 44 },
                                height: { xs: 40, sm: 44 },
                                boxShadow: '0 2px 12px rgba(79, 172, 254, 0.4)',
                              }}
                            >
                              <SchoolIcon sx={{ fontSize: { xs: 20, sm: 22 } }} />
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText 
                            primary={course.title} 
                            secondary={course.instructor}
                            primaryTypographyProps={{
                              fontSize: { xs: '0.95rem', sm: '1rem' },
                              fontWeight: 600,
                              letterSpacing: '-0.01em',
                              color: 'text.primary'
                            }}
                            secondaryTypographyProps={{
                              fontSize: { xs: '0.8rem', sm: '0.85rem' },
                              color: 'text.secondary',
                              sx: { mt: 0.25 }
                            }}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                )}
              </Box>
            ) : (
              /* No results */
              <Box sx={{ 
                textAlign: 'center', 
                mt: { xs: 8, sm: 12 }, 
                mb: { xs: 4, sm: 6 },
                px: 2 
              }}>
                <Box sx={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  opacity: 0.9
                }}>
                  <img 
                    src="/notFound.png" 
                    alt="No results found" 
                    style={{ 
                      width: '160px', 
                      height: 'auto',
                      marginBottom: '20px',
                      opacity: 0.8
                    }} 
                  />
                  <Typography 
                    variant="body1" 
                    sx={{ 
                      color: 'text.secondary',
                      fontSize: { xs: '0.95rem', sm: '1.05rem' },
                      fontWeight: 500
                    }}
                  >
                    No results found for "{query}"
                  </Typography>
                </Box>
              </Box>
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default SearchPage; 