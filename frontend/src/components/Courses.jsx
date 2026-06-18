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
  AccessTime, 
  ArrowForward,
} from '@mui/icons-material';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { apiUrl } from '../config/apiConfig';

const Courses = () => {
  const muiTheme = useMuiTheme();
  const { darkMode } = useTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('sm'));
  const [searchTerm, setSearchTerm] = useState('');
  const [tabValue, setTabValue] = useState(0);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { token } = useAuth();
  
  // Helper functions for theme-aware styling
  const getTextColor = (opacity) => darkMode 
    ? `rgba(255, 255, 255, ${opacity})`
    : `rgba(0, 0, 0, ${opacity})`;

  useEffect(() => {
    if (token) {
      fetchCourses();
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

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const visitCourseLink = (courseLink) => {
    if (courseLink) {
      window.open(courseLink, '_blank');
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
            maxWidth: '100%',
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
              width: '85%',
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
              Courses
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
              Level up your skills with curated courses — learn, practice, and master competitive programming, all in one place.
            </Typography>
          </Box>

          {/* Image Section */}
          <Box
            sx={{
              width: '18%',
              position: 'absolute',
              right: '5%',
              bottom: 0,
              zIndex: 1,
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'center',
              overflow: 'visible',
              height: '100%'
            }}
          >
            <Box
              component="img"
              src="/courses.png"
              alt="Programming Cohorts"
              sx={{
                width: '120%',
                height: 'auto',
                maxWidth: 'none',
                objectFit: 'contain',
                objectPosition: 'bottom',
                filter: darkMode ? 'drop-shadow(-20px 20px 40px rgba(50, 50, 50, 0.9))' : 'none',
                animation: 'floatAnimation 6s ease-in-out infinite, fadeIn 1s ease-out',
                '@keyframes floatAnimation': {
                  '0%': {
                    transform: 'translateX(0px) rotate(0deg)'
                  },
                  '25%': {
                    transform: 'translateX(10px) rotate(1deg)'
                  },
                  '75%': {
                    transform: 'translateX(-10px) rotate(-1deg)'
                  },
                  '100%': {
                    transform: 'translateX(0px) rotate(0deg)'
                  }
                },
                '@keyframes fadeIn': {
                  '0%': {
                    opacity: 0,
                    transform: 'translateX(-20px)'
                  },
                  '100%': {
                    opacity: 1,
                    transform: 'translateX(0)'
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
    </>
  );
};

export default Courses;