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
  const [expandedCards, setExpandedCards] = useState({});
  
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

  const handleEnrollCourse = async (courseId) => {
    if (!token) {
      toast.error('Please log in to enroll in courses');
      return;
    }
    
    try {
      await axios.post(`${apiUrl}/courses/${courseId}/enroll`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Successfully enrolled in the course!');
      // Optionally redirect to course page
      navigate(`/courses/${courseId}`);
    } catch (err) {
      if (err.response?.status === 401) {
        toast.error('Authentication error. Please log in again.');
      } else {
        toast.error('Failed to enroll in course. Please try again.');
      }
    }
  };

  const handleExpandCard = (courseId) => {
    setExpandedCards(prev => ({
      ...prev,
      [courseId]: !prev[courseId]
    }));
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
    <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
      {/* Header Section */}
      <Box sx={{ mb: 6, textAlign: 'center' }}>
        <Typography 
          variant="h3" 
          component="h1" 
          sx={{ 
            fontWeight: 700, 
            mb: 2,
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
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                bgcolor: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                borderRadius: 1,
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: darkMode ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)',
                },
              },
            }}
          />
          <Box sx={{ display: 'flex', gap: 1 }}>
            <IconButton 
              sx={{ 
                bgcolor: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', 
                borderRadius: 1,
                '&:hover': { bgcolor: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }
              }}
            >
              <FilterList sx={{ color: getTextColor(0.7) }} />
            </IconButton>
            <IconButton 
              sx={{ 
                bgcolor: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', 
                borderRadius: 1,
                '&:hover': { bgcolor: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }
              }}
            >
              <Sort sx={{ color: getTextColor(0.7) }} />
            </IconButton>
          </Box>
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
                    bgcolor: darkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.01)',
                    backdropFilter: 'blur(10px)',
                    border: darkMode ? '1px solid rgba(0, 0, 0, 0.7)' : '1px solid rgba(0, 0, 0, 0.3)',
                    borderRadius: '16px',
                    overflow: 'visible',
                    position: 'relative',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-8px)',
                      boxShadow: darkMode ? '0 20px 40px rgba(0,0,0,0.4)' : '0 20px 40px rgba(0,0,0,0.1)',
                      border: '1px solid #000',
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
                    
                    {/* Save Button */}
                    <IconButton 
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSaveCourse(course._id);
                      }}
                      sx={{ 
                        position: 'absolute',
                        top: 12,
                        right: 12,
                        bgcolor: 'rgba(0,0,0,0.5)',
                        backdropFilter: 'blur(5px)',
                        '&:hover': { 
                          bgcolor: 'rgba(0,0,0,0.7)',
                          transform: 'scale(1.1)'
                        },
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {savedCourses.includes(course._id) ? 
                        <Bookmark sx={{ color: '#0088cc' }} /> : 
                        <BookmarkBorder sx={{ color: 'white' }} />
                      }
                    </IconButton>
                  </Box>

                  <CardContent sx={{ p: 3 }}>
                    {/* Course Title and Instructor */}
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="h5" gutterBottom sx={{ 
                        fontWeight: 600,
                        fontSize: '1.25rem',
                        lineHeight: 1.3,
                        mb: 1,
                        color: getTextColor(1)
                      }}>
                        {course.title}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar 
                          sx={{ 
                            width: 28, 
                            height: 28,
                            bgcolor: '#0088cc',
                            fontSize: '0.875rem'
                          }}
                        >
                          {course.instructor.charAt(0)}
                        </Avatar>
                        <Typography variant="body2" sx={{ color: getTextColor(0.7) }}>
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
                              bgcolor: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                              color: getTextColor(0.7),
                            }}
                          />
                        )}
                      </Stack>
                    </Box>

                    {/* Course Info */}
                    <Box sx={{ 
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, 1fr)',
                      gap: 2,
                      mb: 2,
                      p: 2,
                      bgcolor: darkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
                      borderRadius: '12px'
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <AccessTime sx={{ fontSize: 20, color: '#0088cc' }} />
                        <Typography variant="body2" sx={{ color: getTextColor(0.7) }}>
                          {course.duration}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <People sx={{ fontSize: 20, color: '#0088cc' }} />
                        <Typography variant="body2" sx={{ color: getTextColor(0.7) }}>
                          {course.enrolled || 0} enrolled
                        </Typography>
                      </Box>
                    </Box>

                    {/* More Details Button */}
                    <Button
                      onClick={() => handleExpandCard(course._id)}
                      endIcon={expandedCards[course._id] ? <ExpandLess /> : <ExpandMore />}
                      sx={{
                        width: '100%',
                        justifyContent: 'space-between',
                        color: getTextColor(0.7),
                        mb: 2,
                        '&:hover': {
                          bgcolor: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
                        }
                      }}
                    >
                      More Details
                    </Button>

                    {/* Expandable Description */}
                    <Collapse in={expandedCards[course._id]}>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          color: getTextColor(0.6),
                          mb: 2,
                          px: 1
                        }}
                      >
                        {course.description}
                      </Typography>
                    </Collapse>

                    {/* Enroll Button */}
                    <Button 
                      variant="contained" 
                      fullWidth
                      endIcon={<ArrowForward />}
                      onClick={() => handleEnrollCourse(course._id)}
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
                      Enroll Now
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
  );
};

export default Courses;