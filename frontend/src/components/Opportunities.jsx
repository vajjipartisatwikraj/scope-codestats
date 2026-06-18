import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Grid, 
  Card, 
  Button,
  Container,
  Chip,
  TextField,
  InputAdornment,
  IconButton,
  Avatar,
  Stack,
  Tab,
  Tabs,
  useMediaQuery,
  useTheme as useMuiTheme,
  Grow,
  CircularProgress,
  Alert
} from '@mui/material';
import { 
  Search, 
  Event, 
  CalendarToday, 
  OpenInNew, 
  Star,
  AccessTime,
  Public,
} from '@mui/icons-material';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { apiUrl } from '../config/apiConfig';

const Opportunities = () => {
  const muiTheme = useMuiTheme();
  const { darkMode } = useTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('sm'));
  const [searchTerm, setSearchTerm] = useState('');
  const [tabValue, setTabValue] = useState(0);
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { token } = useAuth();
  
  // Helper functions for theme-aware styling
  const getTextColor = (opacity) => darkMode 
    ? `rgba(255, 255, 255, ${opacity})`
    : `rgba(0, 0, 0, ${opacity})`;
    
  const getCardBgColor = () => darkMode
    ? 'rgba(20, 20, 20, 0.95)'
    : '#ffffff';
    
  const getCardBorderColor = () => darkMode
    ? 'rgba(255, 255, 255, 0.05)'
    : 'rgba(0, 0, 0, 0.1)';
    
  const getCardShadow = () => darkMode
    ? '0 20px 40px rgba(0, 0, 0, 0.4)'
    : '0 20px 40px rgba(0, 0, 0, 0.1)';

  useEffect(() => {
    if (token) {
      fetchOpportunities();
    } else {
      setError('Please log in to view opportunities');
      setLoading(false);
    }
  }, [token]);

  const fetchOpportunities = async () => {
    try {
      setLoading(true);
      
      if (!token) {
        setError('Please log in to view opportunities');
        setLoading(false);
        return;
      }
      
      const response = await axios.get(`${apiUrl}/opportunities`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      setOpportunities(response.data);
      
      setLoading(false);
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Authentication error. Please log in again.');
        // Optionally redirect to login
        // navigate('/login');
      } else {
        setError('Failed to load opportunities. Please try again later.');
      }
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleApplyNow = (link) => {
    window.open(link, '_blank', 'noopener,noreferrer');
  };

  const getStatusStyles = (status) => {
    // If status is not provided or invalid, default to 'ongoing'
    const currentStatus = ['upcoming', 'ongoing', 'completed'].includes(status) ? status : 'ongoing';
    
    switch (currentStatus) {
      case 'upcoming':
        return {
          color: '#ffc107',
          backgroundColor: darkMode ? 'rgba(255, 193, 7, 0.1)' : 'rgba(255, 193, 7, 0.15)',
          borderColor: 'rgba(255, 193, 7, 0.3)',
          icon: <AccessTime fontSize="small" />
        };
      case 'ongoing':
        return {
          color: '#4caf50',
          backgroundColor: darkMode ? 'rgba(76, 175, 80, 0.1)' : 'rgba(76, 175, 80, 0.15)',
          borderColor: 'rgba(76, 175, 80, 0.3)',
          icon: <Public fontSize="small" />
        };
      case 'completed':
        return {
          color: '#f44336',
          backgroundColor: darkMode ? 'rgba(244, 67, 54, 0.1)' : 'rgba(244, 67, 54, 0.15)',
          borderColor: 'rgba(244, 67, 54, 0.3)',
          icon: <Event fontSize="small" />
        };
      default:
        // This case won't be reached due to the defaulting above,
        // but keeping it for safety
        return {
          color: '#4caf50', // ongoing color
          backgroundColor: darkMode ? 'rgba(76, 175, 80, 0.1)' : 'rgba(76, 175, 80, 0.15)',
          borderColor: 'rgba(76, 175, 80, 0.3)',
          icon: <Public fontSize="small" />
        };
    }
  };

  const filteredOpportunities = opportunities.filter(opportunity => {
    if (searchTerm && !opportunity.title.toLowerCase().includes(searchTerm.toLowerCase()) && 
        !opportunity.description.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    
    if (tabValue === 1 && opportunity.category !== 'competition') return false;
    if (tabValue === 2 && opportunity.category !== 'hackathon') return false;
    if (tabValue === 3 && opportunity.category !== 'internship') return false;
    if (tabValue === 4 && opportunity.category !== 'workshop') return false;
    
    return true;
  });

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress size={60} thickness={4} sx={{ color: '#0088cc' }} />
      </Box>
    );
  }

  

  return (
    <>
      <Container maxWidth={false} sx={{ py: 6, px: { xs: 2, sm: 10 } }}>
        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Programming Cohorts Section */}
        <Box
          sx={{
            maxWidth: '1200px',
            mx: 'auto',
            mt: 4,
            mb: 6,
            bgcolor: '#0585E0',
            border: `1px solid ${darkMode ? '#232323' : 'transparent'}`,
            borderRadius: '20px',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            minHeight: '100px',
            overflow: 'visible'
          }}
        >
          {/* Content Section (75%) */}
          <Box
            sx={{
              width: '75%',
              p: { xs: 3, md: 3 },
              position: 'relative',
              zIndex: 2
            }}
          >
            <Typography
              variant="h4"
              sx={{
                color: '#ffffff',
                fontWeight: 700,
                mb: 2,
                fontSize: { xs: '1.75rem', sm: '1.7rem' }
              }}
            >
              Opportunities
            </Typography>
            <Typography
              variant="body1"
              sx={{
                color: '#ffffff',
                fontWeight: 200,
                fontSize: { xs: '0.9rem', sm: '1rem' },
                lineHeight: 1.6,
                maxWidth: '600px'
              }}
            >
                    Enhance your programming skills with guided learning paths and practical problem-solving. Join our cohorts to learn, practice, and excel.
            </Typography>
          </Box>

          {/* Image Section */}
          <Box
            sx={{
              width: '23%',
              position: 'absolute',
              right: '5%',
              bottom: 0,
              zIndex: 1,
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'center',
              overflow: 'visible',
              height: '80%'
            }}
          >
            <Box
              component="img"
              src="/opportunities.png"
              alt="Programming Cohorts"
              sx={{
                width: '80%',
                height: 'auto',
                maxWidth: 'none',
                bottom: -10,
                objectFit: 'contain',
                objectPosition: 'bottom',
                filter: 'drop-shadow(-10px 10px 20px rgba(50, 50, 50, 0.5))',
                animation: 'floatAnimation 6s ease-in-out infinite, fadeIn 1s ease-out',
                '@keyframes floatAnimation': {
                  '0%': {
                    transform: 'translate(0px, 0px) rotate(0deg)'
                  },
                  '50%': {
                    transform: 'translate(-10px, -15px) rotate(-2deg)'
                  },
                  '100%': {
                    transform: 'translate(0px, 0px) rotate(0deg)'
                  }
                },
                '@keyframes fadeIn': {
                  '0%': {
                    opacity: 0,
                    transform: 'translate(10px, 20px)'
                  },
                  '100%': {
                    opacity: 1,
                    transform: 'translate(0, 0)'
                  }
                }
              }}
            />
          </Box>
        </Box>

        {/* Header Section */}
        <Box sx={{ mb: 6, textAlign: 'center' }}>
          
          
          {/* Search and Filter Bar */}
          <Box sx={{ 
            display: 'flex', 
            flexDirection: { xs: 'column', sm: 'row' },
            gap: 2,
            maxWidth: '700px',
            mx: 'auto',
            mb: 4
          }}>
            <TextField
              fullWidth
              placeholder="Search opportunities..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search sx={{ color: getTextColor(0.5) }} />
                  </InputAdornment>
                ),
                endAdornment: searchTerm && (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setSearchTerm('')}
                      size="small"
                      sx={{ 
                        bgcolor: '#0088cc', 
                        color: 'white', 
                        '&:hover': { bgcolor: '#006699' },
                        mr: -0.5,
                        width: 30,
                        height: 30
                      }}
                    >
                      <Box component="span" sx={{ fontSize: '1.2rem', fontWeight: 'bold' }}>×</Box>
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: darkMode ? 'rgba(255,255,255,0.08)' : 'white',
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: darkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)',
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#0088cc',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#0088cc',
                  },
                },
              }}
            />
          </Box>
          
          {/* Category Tabs */}
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            variant={isMobile ? "scrollable" : "standard"}
            scrollButtons={isMobile ? "auto" : false}
            centered={!isMobile}
            sx={{
              mb: 4,
              '& .MuiTab-root': {
                color: getTextColor(0.5),
                '&.Mui-selected': {
                  color: '#0088cc',
                },
              },
              '& .MuiTabs-indicator': {
                bgcolor: '#0088cc',
              },
            }}
          >
            <Tab key="all" label="All Opportunities" />
            <Tab key="competitions" label="Competitions" />
            <Tab key="hackathons" label="Hackathons" />
            <Tab key="internships" label="Internships" />
            <Tab key="workshops" label="Workshops" />
          </Tabs>
        </Box>

        {/* Opportunities Cards */}
        <Grid container spacing={2.5}>
          {filteredOpportunities.length > 0 ? (
            filteredOpportunities.map((opportunity, index) => (
              <Grid item xs={12} sm={6} md={4} key={opportunity._id}>
                <Grow in={true} timeout={(index + 1) * 200}>
                  <Card 
                    sx={{ 
                      height: 'auto',
                      display: 'flex',
                      flexDirection: 'column',
                      bgcolor: getCardBgColor(),
                      backdropFilter: 'blur(10px)',
                      border: `1px solid ${getCardBorderColor()}`,
                      borderRadius: '16px',
                      overflow: 'hidden',
                      position: 'relative',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        transform: 'translateY(-8px)',
                        boxShadow: getCardShadow(),
                        border: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.3)',
                      }
                    }}
                  >
                    {/* Status Badge */}
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 12,
                        right: 12,
                        zIndex: 2,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        px: 1.2,
                        py: 0.3,
                        borderRadius: '20px',
                        backgroundColor: getStatusStyles(opportunity.status).backgroundColor,
                        borderColor: getStatusStyles(opportunity.status).borderColor,
                        border: '1px solid',
                        color: getStatusStyles(opportunity.status).color
                      }}
                    >
                      {getStatusStyles(opportunity.status).icon}
                      <Typography 
                        variant="caption" 
                        sx={{ 
                          fontWeight: 600,
                          textTransform: 'capitalize',
                          letterSpacing: '0.5px',
                          fontSize: '0.7rem'
                        }}
                      >
                        {['upcoming', 'ongoing', 'completed'].includes(opportunity.status) 
                          ? opportunity.status 
                          : 'ongoing'}
                      </Typography>
                    </Box>

                    {/* Opportunity Image (if available) */}
                    {opportunity.image && (
                      <Box 
                        sx={{
                          height: 200,
                          width: '100%',
                          overflow: 'hidden',
                          borderTopLeftRadius: '16px',
                          borderTopRightRadius: '16px',
                          position: 'relative'
                        }}
                      >
                        <img 
                          src={opportunity.image}
                          alt={opportunity.title}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
                          }}
                          loading="lazy"
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      </Box>
                    )}

                    {/* Organization Logo & Title */}
                    <Box sx={{ 
                      p: 3, 
                      pb: 2.5,
                      display: 'flex',
                      flexDirection: 'column',
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                        <Avatar
                          alt={opportunity.organizer}
                          src={opportunity.organizerImageUrl}
                          sx={{ 
                            width: { xs: 40, sm: 48 }, 
                            height: { xs: 40, sm: 48 },
                            bgcolor: 'rgba(0,136,204,0.1)',
                            border: '2px solid rgba(0,136,204,0.2)',
                            color: '#0088cc',
                            fontWeight: 'bold'
                          }}
                        >
                          {opportunity.organizer ? opportunity.organizer.charAt(0).toUpperCase() : '?'}
                        </Avatar>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body2" sx={{ 
                            color: getTextColor(0.6), 
                            mb: 0.5,
                            fontSize: { xs: '0.75rem', sm: '0.8rem' }
                          }}>
                            {opportunity.organizer}
                          </Typography>
                          <Typography variant="h6" sx={{ 
                            fontWeight: 600, 
                            lineHeight: 1.3, 
                            color: getTextColor(0.9),
                            fontSize: { xs: '1.1rem', sm: '1.2rem', md: '1.25rem' }
                          }}>
                            {opportunity.title}
                          </Typography>
                        </Box>
                      </Box>

                      {/* Tags */}
                      <Stack direction="row" flexWrap="wrap" gap={0.8} sx={{ mb: 2 }}>
                        {opportunity.tags.map((tag, idx) => (
                          <Chip 
                            key={idx} 
                            label={tag}
                            size="small"
                            sx={{ 
                              fontSize: { xs: '0.7rem', sm: '0.75rem' },
                              height: { xs: 24, sm: 28 },
                              bgcolor: darkMode ? 'rgba(0,136,204,0.1)' : 'rgba(0,136,204,0.05)',
                              color: '#0088cc',
                              border: '1px solid rgba(0,136,204,0.2)',
                              '&:hover': {
                                bgcolor: darkMode ? 'rgba(0,136,204,0.2)' : 'rgba(0,136,204,0.1)',
                              }
                            }}
                          />
                        ))}
                      </Stack>

                      {/* Description */}
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          color: getTextColor(0.6),
                          mb: 2,
                          display: '-webkit-box',
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          lineHeight: 1.6,
                          fontSize: { xs: '0.8rem', sm: '0.85rem', md: '0.9rem' }
                        }}
                      >
                        {opportunity.description}
                      </Typography>

                      {/* Key Details */}
                      <Box sx={{ 
                        display: 'grid',
                        gridTemplateColumns: opportunity.category === 'hackathon' && opportunity.prize ? 'repeat(2, 1fr)' : '1fr',
                        gap: 2,
                        mb: 2.5,
                        p: 2,
                        bgcolor: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                        borderRadius: '12px'
                      }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <CalendarToday sx={{ fontSize: 18, color: '#0088cc' }} />
                          <Typography variant="body2" sx={{ color: getTextColor(0.7) }}>
                            {opportunity.deadline}
                          </Typography>
                        </Box>
                        {opportunity.category === 'hackathon' && opportunity.prize && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Star sx={{ fontSize: 18, color: '#ffd700' }} />
                            <Typography variant="body2" sx={{ color: '#ffd700' }}>
                              {opportunity.prize}
                            </Typography>
                          </Box>
                        )}
                      </Box>

                      {/* Apply Button */}
                      <Button 
                        variant="contained" 
                        fullWidth
                        endIcon={<OpenInNew />}
                        onClick={() => handleApplyNow(opportunity.link)}
                        sx={{ 
                          bgcolor: '#0088cc',
                          py: 1.5,
                          borderRadius: '12px',
                          textTransform: 'none',
                          fontSize: '1rem',
                          fontWeight: 600,
                          '&:hover': { 
                            bgcolor: '#006699',
                            transform: 'translateY(-2px)',
                            boxShadow: '0 6px 12px rgba(0,136,204,0.3)'
                          },
                          transition: 'all 0.2s ease'
                        }}
                      >
                        Apply Now
                      </Button>
                    </Box>
                  </Card>
                </Grow>
              </Grid>
            ))
          ) : (
            <Box sx={{ width: '100%', textAlign: 'center', py: 8 }}>
              <Typography variant="h6" sx={{ color: getTextColor(0.5) }}>
                No opportunities found matching your criteria
              </Typography>
              <Button 
                variant="outlined" 
                sx={{ mt: 2, borderColor: '#0088cc', color: '#0088cc' }}
                onClick={() => {
                  setSearchTerm('');
                  setTabValue(0);
                }}
              >
                Clear Filters
              </Button>
            </Box>
          )}
        </Grid>
      </Container>
    </>
  );
};

export default Opportunities;