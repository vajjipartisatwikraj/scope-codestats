import React, { useState, useEffect, useMemo } from 'react';
import { 
  Box, 
  Typography, 
  Grid, 
  Card, 
  CardContent, 
  CardActions, 
  Button,
  Container,
  Chip,
  TextField,
  InputAdornment,
  IconButton,
  Divider,
  Avatar,
  Stack,
  Tab,
  Tabs,
  useMediaQuery,
  useTheme as useMuiTheme,
  Fade,
  Grow,
  Badge,
  CardHeader,
  CircularProgress,
  Alert
} from '@mui/material';
import { 
  Search, 
  Event, 
  LocationOn, 
  CalendarToday, 
  OpenInNew, 
  FilterList,
  Sort,
  Star,
  AccessTime,
  Public,
  Code,
  School,
  Work
} from '@mui/icons-material';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
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
  const navigate = useNavigate();
  
  // Helper functions for theme-aware styling
  const getTextColor = (opacity) => darkMode 
    ? `rgba(255, 255, 255, ${opacity})`
    : `rgba(0, 0, 0, ${opacity})`;
    
  const getDividerColor = () => darkMode 
    ? 'rgba(255, 255, 255, 0.1)'
    : 'rgba(0, 0, 0, 0.1)';
    
  const getHoverBgColor = (baseColor) => darkMode
    ? `${baseColor}30`
    : `${baseColor}15`;
    
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

  const getCategoryIcon = (category) => {
    switch(category) {
      case 'competition': return <Code />;
      case 'hackathon': return <Event />;
      case 'internship': return <Work />;
      case 'workshop': return <School />;
      default: return <Event />;
    }
  };

  const getDifficultyColor = (difficulty) => {
    switch(difficulty) {
      case 'Beginner': return '#4caf50';
      case 'Intermediate': return '#ff9800';
      case 'Advanced': return '#f44336';
      default: return '#0088cc';
    }
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
      <Container maxWidth={false} sx={{ py: 6, px: { xs: 2, sm: 3 } }}>
      {/* Header Section */}
      <Box sx={{ mb: 6, textAlign: 'center' }}>
        <Typography 
          variant="h3" 
          component="h1" 
          sx={{ 
            fontWeight: 700, 
            mb: 2,
            fontSize: { xs: '1.8rem', sm: '2.2rem', md: '2.5rem' },
            background: 'linear-gradient(45deg, #0088cc 30%, #00bfff 90%)',
            backgroundClip: 'text',
            textFillColor: 'transparent',
          }}
        >
          Competitive Programming Opportunities
        </Typography>
        <Typography 
          variant="h6" 
          color="text.secondary" 
          sx={{ 
            maxWidth: '800px', 
            mx: 'auto', 
            mb: 4,
            fontSize: { xs: '0.9rem', sm: '1rem', md: '1.1rem' },
            color: getTextColor(0.7)
          }}
        >
          Discover competitions, hackathons, internships, and workshops to advance your programming career
        </Typography>
        
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
      
      {/* Footer */}
      <Box 
        sx={{ 
          width: '100%', 
          mt: 4, 
          p: { xs: 1.5, sm: 2 },
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <a 
            href="http://scopeclub.mlrit.ac.in/teams" 
            target="_blank" 
            rel="noopener noreferrer"
            style={{ display: 'flex' }}
          >
            <img 
              src="/WhatsApp-Image-2025-05-05-at-18.01.19_44a57ceb.svg" 
              alt="SCOPE CLUB Logo" 
              style={{ 
                width: 96, 
                height: 56, 
                marginRight: '16px',
                filter: darkMode ? 'invert(1)' : 'brightness(0.8)'
              }} 
            />
          </a>
          <Typography 
            variant="body1" 
            sx={{ 
              color: 'text.secondary',
              fontWeight: 500,
              fontSize: { xs: '0.75rem', sm: '0.8rem' }
            }}
          >
            © 2025 SCOPE CLUB. All rights reserved.
          </Typography>
        </Box>
      </Box>
    </>
  );
};

export default Opportunities;