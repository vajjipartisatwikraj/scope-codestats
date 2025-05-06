import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Grid, 
  Card, 
  CardContent, 
  CardMedia, 
  Container,
  Button,
  Chip,
  TextField,
  InputAdornment,
  IconButton,
  Divider,
  Rating,
  Avatar,
  Stack,
  Tab,
  Tabs,
  useMediaQuery,
  useTheme as useMuiTheme,
  Fade,
  Grow,
  CircularProgress,
  Alert,
  Collapse
} from '@mui/material';
import { 
  Search, 
  Code, 
  Bookmark, 
  BookmarkBorder, 
  AccessTime, 
  People, 
  Star, 
  ArrowForward,
  FilterList,
  Sort,
  ExpandMore,
  ExpandLess
} from '@mui/icons-material';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { apiUrl } from '../config/apiConfig';

const Courses = () => {
  const muiTheme = useMuiTheme();
  const { darkMode } = useTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('sm'));
  const [searchTerm, setSearchTerm] = useState('');
  const [tabValue, setTabValue] = useState(0);
  const [savedCourses, setSavedCourses] = useState([]);
  const [courses, setCourses] = useState([]);
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

  useEffect(() => {
    if (token) {
      fetchCourses();
      fetchSavedCourses();
    } else {
      setError('Please log in to view courses');
      setLoading(false);
    }
  }, [token]);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      
      if (!token) {
        setError('Please log in to view courses');
        setLoading(false);
        return;
      }
      
      const response = await axios.get(`${apiUrl}/courses`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      setCourses(response.data);
      
      setLoading(false);
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Authentication error. Please log in again.');
        // Optionally redirect to login
        // navigate('/login');
      } else {
        setError('Failed to load courses. Please try again later.');
      }
      setLoading(false);
    }
  };

  const fetchSavedCourses = async () => {
    try {
      const savedResponse = await axios.get(`${apiUrl}/courses/saved`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      setSavedCourses(savedResponse.data);
    } catch (err) {
      setError('Failed to load saved courses');
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const toggleSaveCourse = async (courseId) => {
    if (!token) {
      toast.error('Please log in to save courses');
      return;
    }
    
    try {
      if (savedCourses.includes(courseId)) {
        await axios.delete(`${apiUrl}/courses/${courseId}/save`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSavedCourses(savedCourses.filter(id => id !== courseId));
        toast.success('Course removed from saved courses');
      } else {
        await axios.post(`${apiUrl}/courses/${courseId}/save`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSavedCourses([...savedCourses, courseId]);
        toast.success('Course saved successfully');
      }
    } catch (err) {
      if (err.response?.status === 401) {
        toast.error('Authentication error. Please log in again.');
      } else {
        toast.error('Failed to save course. Please try again.');
      }
    }
  };

  const visitCourseLink = (courseLink) => {
    if (courseLink) {
      window.open(courseLink, '_blank');
    } else {
      // Removed console.error statement
      // Could add a toast notification here instead if needed
    }
  };

  const filteredCourses = courses.filter(course => {
    if (searchTerm && !course.title.toLowerCase().includes(searchTerm.toLowerCase()) && 
        !course.description.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    
    if (tabValue === 1 && course.category !== 'algorithms') return false;
    if (tabValue === 2 && course.category !== 'data-structures') return false;
    if (tabValue === 3 && course.category !== 'competitive') return false;
    if (tabValue === 4 && course.category !== 'problem-solving') return false;
    
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
          Programming Courses
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
          Enhance your competitive programming skills with our expert-led courses
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
            placeholder="Search courses..."
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
          <Tab label="All Courses" />
          <Tab label="Algorithms" />
          <Tab label="Data Structures" />
          <Tab label="Competitive" />
          <Tab label="Problem Solving" />
        </Tabs>
      </Box>

      {/* Course Cards */}
      <Grid container spacing={3}>
        {filteredCourses.length > 0 ? (
          filteredCourses.map((course, index) => (
            <Grid item xs={12} sm={6} md={4} key={course._id}>
              <Grow in={true} timeout={(index + 1) * 200}>
                <Card 
                  sx={{ 
                    height: '100%',
                    bgcolor: darkMode ? 'rgba(255,255,255,0.08)' : '#ffffff',
                    backdropFilter: 'blur(10px)',
                    border: darkMode ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.1)',
                    borderRadius: '16px',
                    overflow: 'visible',
                    position: 'relative',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-8px)',
                      boxShadow: darkMode ? '0 20px 40px rgba(0,0,0,0.4)' : '0 20px 40px rgba(0,0,0,0.1)',
                      border: darkMode ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid rgba(0, 0, 0, 0.2)',
                      '& .course-image': {
                        transform: 'scale(1.05)',
                      },
                      '& .course-level': {
                        transform: 'translateY(-5px)',
                      }
                    }
                  }}
                >
                  {/* Course Level Badge */}
                  <Chip 
                    label={course.level}
                    className="course-level"
                    sx={{ 
                      position: 'absolute',
                      top: -12,
                      right: 16,
                      zIndex: 2,
                      bgcolor: course.level === 'Beginner' ? 'rgba(76, 175, 80, 0.9)' : 
                              course.level === 'Intermediate' ? 'rgba(255, 152, 0, 0.9)' : 
                              'rgba(244, 67, 54, 0.9)',
                      color: 'white',
                      backdropFilter: 'blur(5px)',
                      transition: 'transform 0.3s ease',
                      fontWeight: 600,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                    }}
                  />

                  {/* Course Image with Gradient Overlay */}
                  <Box sx={{ position: 'relative', overflow: 'hidden', borderRadius: '16px 16px 0 0' }}>
                    <CardMedia
                      component="img"
                      height="200"
                      image={course.image}
                      alt={course.title}
                      className="course-image"
                      sx={{
                        transition: 'transform 0.5s ease',
                      }}
                    />
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.8) 100%)',
                      }}
                    />
                  </Box>

                  <CardContent sx={{ p: 3 }}>
                    {/* Course Title and Instructor */}
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="h5" gutterBottom sx={{ 
                        fontWeight: 700,
                        fontSize: { xs: '1.2rem', sm: '1.3rem', md: '1.5rem' },
                        lineHeight: 1.3,
                        mb: 1,
                        color: getTextColor(1)
                      }}>
                        {course.title}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar 
                          sx={{ 
                            width: { xs: 28, sm: 32 }, 
                            height: { xs: 28, sm: 32 },
                            bgcolor: '#0088cc',
                            fontSize: { xs: '0.9rem', sm: '1rem' }
                          }}
                        >
                          {course.instructor.charAt(0)}
                        </Avatar>
                        <Typography sx={{ 
                          fontSize: { xs: '0.9rem', sm: '1rem', md: '1.1rem' },
                          fontWeight: 500,
                          color: getTextColor(0.85)
                        }}>
                          {course.instructor}
                        </Typography>
                      </Box>
                    </Box>

                    {/* Course Topics */}
                    <Box sx={{ mb: 3 }}>
                      <Stack direction="row" flexWrap="wrap" gap={0.8}>
                        {course.topics.slice(0, 3).map((topic, index) => (
                          <Chip
                            key={index}
                            label={topic}
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
                        {course.topics.length > 3 && (
                          <Chip
                            label={`+${course.topics.length - 3}`}
                            size="small"
                            sx={{
                              fontSize: { xs: '0.7rem', sm: '0.75rem' },
                              height: { xs: 24, sm: 28 },
                              bgcolor: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                              color: getTextColor(0.7),
                            }}
                          />
                        )}
                      </Stack>
                    </Box>

                    {/* Course Description - Below tags, above duration */}
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        color: getTextColor(0.7),
                        mb: 3,
                        px: 1,
                        lineHeight: 1.6,
                        fontSize: { xs: '0.8rem', sm: '0.85rem', md: '0.9rem' }
                      }}
                    >
                      {course.description}
                    </Typography>

                    {/* Course Info */}
                    <Box sx={{ 
                      display: 'flex',
                      gap: 2,
                      mb: 3,
                      p: 2,
                      bgcolor: darkMode ? 'rgba(0,136,204,0.05)' : 'rgba(0,136,204,0.03)',
                      border: '1px solid rgba(0,136,204,0.3)',
                      borderRadius: '12px',
                      justifyContent: 'center'
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <AccessTime sx={{ fontSize: 20, color: '#0088cc' }} />
                        <Typography variant="body2" sx={{ color: getTextColor(0.8), fontWeight: 500 }}>
                          {course.duration}
                        </Typography>
                      </Box>
                    </Box>

                    {/* View Course Button */}
                    <Button 
                      variant="contained" 
                      fullWidth
                      endIcon={<ArrowForward />}
                      onClick={() => visitCourseLink(course.courseLink)}
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
                      View Course
                    </Button>
                  </CardContent>
                </Card>
              </Grow>
            </Grid>
          ))
        ) : (
          <Box sx={{ width: '100%', textAlign: 'center', py: 8 }}>
            <Typography variant="h6" sx={{ color: getTextColor(0.5) }}>
              No courses found matching your criteria
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

export default Courses;