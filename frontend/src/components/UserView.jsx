import React, { useState, useEffect, useRef, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Grid,
  Paper,
  Typography,
  Chip,
  CircularProgress,
  useTheme as useMuiTheme,
  useMediaQuery,
  Tabs,
  Tab,
  Divider,
  Card,
  CardContent,
  IconButton,
  Button,
  Tooltip,
  Link as MuiLink,
} from '@mui/material';
import { PieChart, Pie, Cell, Legend, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import axios from 'axios';
import 'github-calendar/dist/github-calendar.css';
import GitHubCalendar from 'github-calendar';
import { OpenInNew } from '@mui/icons-material';
import { useTheme } from '../contexts/ThemeContext';
import { apiUrl } from '../config/apiConfig';

const achievementTypes = [
  { value: 'project', label: 'Project' },
  { value: 'internship', label: 'Internship' },
  { value: 'certification', label: 'Certification' },
  { value: 'achievement', label: 'Achievement' },
];

const getYear = (graduationYear) => {
  const currentYear = new Date().getFullYear();
  // Parse graduation year to ensure it's an integer
  const gradYear = parseInt(graduationYear, 10);
  const yearsToGraduation = gradYear - currentYear;
  
  switch (yearsToGraduation) {
    case 3:
      return 'First';
    case 2:
      return 'Second';
    case 1:
      return 'Third';
    case 0:
      return 'Fourth';
    case -1:
    case -2:
    case -3:
    case -4:
      return 'Graduated';
    case 4:
      return 'Incoming Student';
    default:
      if (yearsToGraduation > 4) {
        return 'Future Student';
      } else if (yearsToGraduation < -4) {
        return 'Alumni';
      } else {
        return `Year ${4 - yearsToGraduation}`;
      }
  }
};

const preparePieChartData = (codingProfiles, type) => {
  switch (type) {
    case 'overall':
      return [
        { name: 'LeetCode', value: codingProfiles?.leetcode?.score || 0, color: '#FFA116' },
        { name: 'CodeChef', value: codingProfiles?.codechef?.score || 0, color: '#5B4638' },
        { name: 'HackerRank', value: codingProfiles?.hackerrank?.score || 0, color: '#00EA64' },
        { name: 'CodeForces', value: codingProfiles?.codeforces?.score || 0, color: '#FF0000' },
        { name: 'GitHub', value: codingProfiles?.github?.score || 0, color: '#333' }
      ].filter(platform => platform.value > 0);

    case 'problems':
      return [
        { name: 'LeetCode', value: codingProfiles?.leetcode?.problemsSolved || 0, color: '#FFA116' },
        { name: 'CodeChef', value: codingProfiles?.codechef?.problemsSolved || 0, color: '#5B4638' },
        { name: 'HackerRank', value: codingProfiles?.hackerrank?.problemsSolved || 0, color: '#00EA64' },
        { name: 'CodeForces', value: codingProfiles?.codeforces?.problemsSolved || 0, color: '#FF0000' },
        { name: 'GeeksForGeeks', value: codingProfiles?.geeksforgeeks?.problemsSolved || 0, color: '#2F8D46' }
      ].filter(platform => platform.value > 0);

    case 'contests':
      return [
        { name: 'LeetCode', value: codingProfiles?.leetcode?.contestsParticipated || 0, color: '#FFA116' },
        { name: 'CodeChef', value: codingProfiles?.codechef?.contestsParticipated || 0, color: '#5B4638' },
        { name: 'CodeForces', value: codingProfiles?.codeforces?.contestsParticipated || 0, color: '#FF0000' },
        { name: 'GeeksForGeeks', value: codingProfiles?.geeksforgeeks?.contestsParticipated || 0, color: '#2F8D46' }
      ];

    case 'rating':
      return [
        { name: 'LeetCode', value: codingProfiles?.leetcode?.rating || 0, color: '#FFA116' },
        { name: 'CodeChef', value: codingProfiles?.codechef?.rating || 0, color: '#5B4638' },
        { name: 'CodeForces', value: codingProfiles?.codeforces?.rating || 0, color: '#FF0000' }
      ].filter(platform => platform.value > 0);

    default:
      return [];
  }
};

const fetchGitHubRepos = async (username) => {
  // Return 0 instead of making GitHub API call that causes 401 errors
  return 0;
};

const fetchGitHubContributions = async (username) => {
  // Return 0 instead of making GitHub API call that causes 401 errors
  return 0;
};

// Helper function to validate and format image URLs
const formatImageUrl = (url) => {
  if (!url) return "https://via.placeholder.com/150";
  
  // Remove spaces and replace quotes if they were accidentally copied
  url = url.trim().replace(/['"]/g, '');
  
  // Ensure URL starts with http:// or https://
  if (!url.match(/^https?:\/\//)) {
    url = 'https://' + url;
  }
  
  return url;
};

const UserView = () => {
  const { username } = useParams();
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('project');
  const [activeChartTab, setActiveChartTab] = useState('overall');
  const calendarRef = useRef(null);
  const navigate = useNavigate();

  const muiTheme = useMuiTheme();
  const { darkMode } = useTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(muiTheme.breakpoints.down('md'));
  
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

  // New helper functions for consistent component styling
  const getCardStyle = () => ({
    bgcolor: darkMode ? '#1a1a1a' : '#ffffff',
    color: darkMode ? 'white' : '#000000',
    borderRadius: '16px',
    boxShadow: darkMode 
      ? '0 4px 20px rgba(0, 0, 0, 0.25)' 
      : '0 4px 20px rgba(0, 0, 0, 0.1)',
    border: darkMode 
      ? '1px solid rgba(255, 255, 255, 0.05)' 
      : '1px solid rgba(0, 0, 0, 0.03)',
    backdropFilter: 'blur(10px)',
    transition: 'transform 0.2s, box-shadow 0.2s',
    '&:hover': {
      boxShadow: darkMode 
        ? '0 6px 25px rgba(0, 0, 0, 0.3)' 
        : '0 6px 25px rgba(0, 0, 0, 0.12)',
    }
  });

  const getInnerCardStyle = () => ({
    bgcolor: darkMode ? '#242424' : '#f5f5f5',
    borderRadius: '12px',
    border: darkMode 
      ? '1px solid rgba(255, 255, 255, 0.05)' 
      : '1px solid rgba(0, 0, 0, 0.05)',
    boxShadow: darkMode 
      ? '0 4px 12px rgba(0, 0, 0, 0.2)' 
      : '0 4px 12px rgba(0, 0, 0, 0.08)',
    transition: 'transform 0.2s, box-shadow 0.2s',
    '&:hover': {
      transform: 'translateY(-3px)',
      boxShadow: darkMode 
        ? '0 6px 16px rgba(0, 0, 0, 0.25)' 
        : '0 6px 16px rgba(0, 0, 0, 0.12)',
    }
  });

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await axios.get(`${apiUrl}/users/${username}`);
        const userData = response.data;
        
        if (userData.codingProfiles?.github?.username) {
          // Instead of making API calls that cause 401 errors, 
          // just use the data we already have from the backend
          setUserData({
            ...userData,
            codingProfiles: {
              ...userData.codingProfiles,
              github: {
                ...userData.codingProfiles.github,
                // Use existing values or default to 0
                publicRepos: userData.codingProfiles.github.publicRepos || 0,
                totalContributions: userData.codingProfiles.github.totalContributions || 0
              }
            }
          });
        } else {
          setUserData(userData);
        }
        setLoading(false);
      } catch (err) {
        console.error('Error fetching user data:', err);
        setError('Failed to load user data');
        setLoading(false);
      }
    };

    fetchUserData();
  }, [username]);

  useEffect(() => {
    if (userData?.codingProfiles?.github?.username && calendarRef.current) {
      GitHubCalendar(calendarRef.current, userData.codingProfiles.github.username, {
        responsive: true,
        tooltips: true,
        global_stats: false,
      });
    }
  }, [userData]);

  const filteredAchievements = userData?.achievements?.filter(
    achievement => achievement.type === activeTab
  ) || [];

  const ScoreGauge = ({ platform, data }) => {
    const getPlatformMaxScore = (platform) => {
      if (typeof platform !== 'string') {
        return 3000; // Default max score
      }
      
      switch (platform.toLowerCase()) {
        case 'leetcode':
          return 3000;
        case 'codechef':
          return 3000;
        case 'codeforces':
          return 3500;
        case 'geeksforgeeks':
          return 10000;
        case 'hackerrank':
          return 1000;
        default:
          return 3000;
      }
    };

    const maxScore = getPlatformMaxScore(platform);
    const score = data?.score || 0;
    
    // Get additional stats for tooltip content
    const getTooltipContent = () => {
      let content = `Score: ${score}`;
      
      if (typeof platform === 'string' && platform.toLowerCase() === 'codechef' && data?.contestsParticipated) {
        content += `\nContests Participated: ${data.contestsParticipated}`;
      }
      
      if (data?.problemsSolved) {
        content += `\nProblems Solved: ${data.problemsSolved}`;
      }
      
      if (data?.rating) {
        content += `\nRating: ${data.rating}`;
      }
      
      return content;
    };

    return (
      <Tooltip 
        title={getTooltipContent()}
        slotProps={{
          tooltip: {
            sx: {
              backgroundColor: darkMode ? '#333' : 'white',
              color: darkMode ? 'white' : '#333',
              border: darkMode ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid rgba(0, 0, 0, 0.1)',
              borderRadius: '8px',
              padding: '12px',
              fontSize: '14px',
              boxShadow: darkMode ? '0 4px 12px rgba(0, 0, 0, 0.5)' : '0 4px 12px rgba(0, 0, 0, 0.1)',
              zIndex: 1000
            }
          }
        }}
      >
        <Box sx={{ 
          position: 'relative', 
          width: '100%',
          minHeight: 120,
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center',
          justifyContent: 'space-between',
          ...getInnerCardStyle(),
          p: 2
        }}>
          <Box sx={{ position: 'relative', width: 60, height: 60, mb: 1 }}>
            <CircularProgress
              variant="determinate"
              value={100}
              size={60}
              thickness={4}
              sx={{
                color: darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                position: 'absolute',
                left: 0,
              }}
            />
            <CircularProgress
              variant="determinate"
              value={(score / maxScore) * 100}
              size={60}
              thickness={5}
              sx={{
                color: '#0088cc', // Use primary color instead of orange
                position: 'absolute',
                left: 0,
                '& .MuiCircularProgress-circle': {
                  strokeLinecap: 'round',
                },
              }}
            />
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: darkMode ? '#1a1a1a' : '#fff',
                width: 48,
                height: 48,
                borderRadius: '50%',
                margin: 'auto',
                border: darkMode ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid rgba(0, 0, 0, 0.05)',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
              }}
            >
              <Typography variant="body1" sx={{ fontWeight: 'bold', color: '#0088cc', fontSize: '0.9rem' }}>
                {score}
              </Typography>
              <Typography variant="caption" sx={{ color: getTextColor(0.7), fontSize: '0.6rem', lineHeight: 1 }}>
                Average
              </Typography>
              <Typography variant="caption" sx={{ color: getTextColor(0.7), fontSize: '0.6rem', lineHeight: 1 }}>
                Rating
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
            <Typography 
              variant="body2" 
              sx={{ 
                color: getTextColor(0.9), 
                fontWeight: 500,
                textAlign: 'center',
                width: '100%',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              {platform}
            </Typography>
          </Box>
        </Box>
      </Tooltip>
    );
  };

  if (loading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '80vh',
        flexDirection: 'column',
        gap: 2
      }}>
        <CircularProgress sx={{ color: '#0088cc' }} />
        <Typography variant="body1" sx={{ color: getTextColor(0.7) }}>
          Loading user profile...
        </Typography>
      </Box>
    );
  }

  if (error || !userData) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '80vh',
        flexDirection: 'column',
        gap: 2,
        p: 3,
        mx: 'auto',
        maxWidth: '600px',
        ...getCardStyle(),
        bgcolor: darkMode ? 'rgba(26, 26, 26, 0.8)' : 'rgba(255, 255, 255, 0.8)',
      }}>
        <Typography variant="h5" color="error" sx={{ mb: 2, textAlign: 'center' }}>{error || 'User not found'}</Typography>
        <Typography variant="body1" sx={{ color: getTextColor(0.7), mb: 3, textAlign: 'center' }}>
          We couldn't find the user profile you're looking for. The user may not exist or there might be a problem with the connection.
        </Typography>
        <Button 
          variant="contained" 
          onClick={() => navigate('/')}
          sx={{ 
            bgcolor: '#0088cc',
            '&:hover': { bgcolor: '#006699' },
            px: 4,
            py: 1,
            borderRadius: '8px'
          }}
        >
          Go Back Home
        </Button>
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: { xs: 2, sm: 4 }, mb: { xs: 2, sm: 4 } }}>
      <Grid container spacing={3}>
        {/* User Header - Always First on Mobile */}
        <Grid item xs={12}>
          <Paper sx={{ 
            p: { xs: 3, sm: 4 }, 
            ...getCardStyle(),
            position: 'relative',
            overflow: 'hidden',
          }}>
            {/* Background Pattern */}
            <Box sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '120px',
              background: 'linear-gradient(135deg, #0088cc 0%, #005580 100%)',
              opacity: darkMode ? 0.8 : 0.7,
            }} />

            <Grid container spacing={3}>
              <Grid item xs={12} sm={3} md={2} sx={{ position: 'relative' }}>
                <Box sx={{ position: 'relative' }}>
                  <Box sx={{ 
                    width: { xs: 120, sm: 150 },
                    height: { xs: 120, sm: 150 },
                    borderRadius: '50%',
                    bgcolor: '#0088cc',
                    border: `4px solid ${darkMode ? '#1a1a1a' : '#ffffff'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: { xs: '2.5rem', sm: '3rem' },
                    color: 'white',
                    mx: { xs: 'auto', sm: 0 },
                    mt: { xs: 4, sm: 8 },
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
                    textTransform: 'uppercase'
                  }}>
                    {userData.name?.charAt(0).toUpperCase()}
                  </Box>
                </Box>
              </Grid>
              <Grid item xs={12} sm={9} md={10} sx={{ position: 'relative' }}>
                <Box sx={{ mt: { xs: 2, sm: 8 } }}>
                  <Typography variant="h2" sx={{ 
                    fontWeight: 800, 
                    color: darkMode ? '#fff' : '#000', 
                    textShadow: darkMode ? '0 2px 8px rgba(0,0,0,0.4)' : 'none',
                    letterSpacing: '0.5px',
                    fontSize: { xs: '1.0rem', sm: '2.0rem' },
                    lineHeight: 1.2,
                    wordBreak: 'break-word',
                    maxWidth: '100%'
                  }}>
                    {userData.name}
                  </Typography>
                  <Typography variant="h5" sx={{ 
                    mb: 3, 
                    color: darkMode ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.9)',
                    textShadow: darkMode ? '0 2px 6px rgba(0,0,0,0.3)' : 'none',
                    fontWeight: 600
                  }}>
                    {userData.department} • {userData.section}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="body2" sx={{ color: darkMode ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)', fontWeight: 400 }}>
                        Score
                      </Typography>
                      <Typography variant="h6" sx={{ color: '#0088cc', fontWeight: 600 }}>
                        {userData.totalScore || 0}
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="body2" sx={{ color: darkMode ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)', fontWeight: 400 }}>
                        Rank
                      </Typography>
                      <Typography variant="h6" sx={{ color: '#0088cc', fontWeight: 600 }}>
                        {userData.overallRank || 'N/A'}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Left Section */}
        <Grid item xs={12} md={4} sx={{ order: { xs: 2, md: 1 } }}>
          <Paper sx={{ 
            p: { xs: 2, sm: 3 }, 
            ...getCardStyle(),
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
          }}>
            {/* About Section */}
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: darkMode ? '#fff' : '#000' }}>About</Typography>
            <Typography variant="body2" sx={{ color: getTextColor(0.7), mb: 3, whiteSpace: 'pre-line', lineHeight: 1.7 }}>
              {userData.about || 'No description provided.'}
            </Typography>

            {/* Coding Profiles in About Section */}
            {(userData.codingProfiles?.leetcode?.username || 
              userData.codingProfiles?.codechef?.username || 
              userData.codingProfiles?.hackerrank?.username || 
              userData.codingProfiles?.codeforces?.username || 
              userData.codingProfiles?.github?.username) && (
              <>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: darkMode ? '#fff' : '#000', mt: 1 }}>
                  Coding Profiles
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {userData.codingProfiles?.leetcode?.username && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ 
                        width: 24, 
                        height: 24,
                        bgcolor: '#FFA116',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        zIndex: 100
                      }}>
                        L
                      </Box>
                      <Typography variant="body2" sx={{ color: getTextColor(0.7) }}>
                        LeetCode: <Typography 
                          component="a" 
                          href={`https://leetcode.com/${userData.codingProfiles.leetcode.username}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          sx={{ 
                            color: '#0088cc',
                            textDecoration: 'none',
                            '&:hover': {
                              textDecoration: 'underline'
                            }
                          }}
                        >
                          {userData.codingProfiles.leetcode.username}
                        </Typography>
                      </Typography>
                    </Box>
                  )}
                  
                  {userData.codingProfiles?.codechef?.username && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ 
                        width: 24, 
                        height: 24,
                        bgcolor: '#5B4638',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: '12px',
                        fontWeight: 'bold'
                      }}>
                        C
                      </Box>
                      <Typography variant="body2" sx={{ color: getTextColor(0.7) }}>
                        CodeChef: <Typography 
                          component="a" 
                          href={`https://www.codechef.com/users/${userData.codingProfiles.codechef.username}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          sx={{ 
                            color: '#0088cc',
                            textDecoration: 'none',
                            '&:hover': {
                              textDecoration: 'underline'
                            }
                          }}
                        >
                          {userData.codingProfiles.codechef.username}
                        </Typography>
                      </Typography>
                    </Box>
                  )}
                  
                  {userData.codingProfiles?.hackerrank?.username && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ 
                        width: 24, 
                        height: 24,
                        bgcolor: '#00EA64',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: '12px',
                        fontWeight: 'bold'
                      }}>
                        H
                      </Box>
                      <Typography variant="body2" sx={{ color: getTextColor(0.7) }}>
                        HackerRank: <Typography 
                          component="a" 
                          href={`https://www.hackerrank.com/${userData.codingProfiles.hackerrank.username}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          sx={{ 
                            color: '#0088cc',
                            textDecoration: 'none',
                            '&:hover': {
                              textDecoration: 'underline'
                            }
                          }}
                        >
                          {userData.codingProfiles.hackerrank.username}
                        </Typography>
                      </Typography>
                    </Box>
                  )}
                  
                  {userData.codingProfiles?.codeforces?.username && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ 
                        width: 24, 
                        height: 24,
                        bgcolor: '#FF0000',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: '12px',
                        fontWeight: 'bold'
                      }}>
                        CF
                      </Box>
                      <Typography variant="body2" sx={{ color: getTextColor(0.7) }}>
                        CodeForces: <Typography 
                          component="a" 
                          href={`https://codeforces.com/profile/${userData.codingProfiles.codeforces.username}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          sx={{ 
                            color: '#0088cc',
                            textDecoration: 'none',
                            '&:hover': {
                              textDecoration: 'underline'
                            }
                          }}
                        >
                          {userData.codingProfiles.codeforces.username}
                        </Typography>
                      </Typography>
                    </Box>
                  )}
                  
                  {userData.codingProfiles?.github?.username && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ 
                        width: 24, 
                        height: 24,
                        bgcolor: '#333',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: '12px',
                        fontWeight: 'bold'
                      }}>
                        G
                      </Box>
                      <Typography variant="body2" sx={{ color: getTextColor(0.7) }}>
                        GitHub: <Typography 
                          component="a" 
                          href={`https://github.com/${userData.codingProfiles.github.username}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          sx={{ 
                            color: '#0088cc',
                            textDecoration: 'none',
                            '&:hover': {
                              textDecoration: 'underline'
                            }
                          }}
                        >
                          {userData.codingProfiles.github.username}
                        </Typography>
                      </Typography>
                    </Box>
                  )}
                  {userData.codingProfiles?.geeksforgeeks?.username && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ 
                        width: 24, 
                        height: 24,
                        bgcolor: '#333',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: '12px',
                        fontWeight: 'bold'
                      }}>
                        G
                      </Box>
                      <Typography variant="body2" sx={{ color: getTextColor(0.7) }}>
                        Geeks For Geeks: <Typography 
                          component="a" 
                          href={`https://www.geeksforgeeks.org/user/${userData.codingProfiles.geeksforgeeks.username}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          sx={{ 
                            color: '#0088cc',
                            textDecoration: 'none',
                            '&:hover': {
                              textDecoration: 'underline'
                            }
                          }}
                        >
                          {userData.codingProfiles.geeksforgeeks.username}
                        </Typography>
                      </Typography>
                    </Box>
                  )}

                </Box>
              </>
            )}

            <Divider sx={{ my: 2, borderColor: getDividerColor() }} />

            {/* Details Section */}
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', width: '100%' }}>
              <Typography variant="h6" gutterBottom sx={{ mt: 2, fontWeight: 600, color: darkMode ? '#fff' : '#000' }}>Details</Typography>
              <Box sx={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: 3,
                width: '100%',
                '& .MuiTypography-root': {
                  fontSize: '1rem',
                  color: darkMode ? 'white' : 'rgba(0, 0, 0, 0.87)'
                }
              }}>
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  width: '100%'
                }}>
                  <Typography sx={{ color: getTextColor(0.5) }}>
                    Email
                  </Typography>
                  <Typography>{userData.email}</Typography>
                </Box>
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  width: '100%'
                }}>
                  <Typography sx={{ color: getTextColor(0.5) }}>
                    Department
                  </Typography>
                  <Typography>{userData.department}</Typography>
                </Box>
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  width: '100%'
                }}>
                  <Typography sx={{ color: getTextColor(0.5) }}>
                    Section
                  </Typography>
                  <Typography>{userData.section}</Typography>
                </Box>
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  width: '100%'
                }}>
                  <Typography sx={{ color: getTextColor(0.5) }}>
                    Year
                  </Typography>
                  <Typography>{userData.graduatingYear ? `${getYear(userData.graduatingYear)}` : 'N/A'}</Typography>
                </Box>
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  width: '100%'
                }}>
                  <Typography sx={{ color: getTextColor(0.5) }}>
                    Contact
                  </Typography>
                  <Typography>{userData.mobileNumber}</Typography>
                </Box>
              </Box>

              <Divider sx={{ my: 2, borderColor: getDividerColor() }} />

              {/* Skills Section */}
              <Typography variant="h6" gutterBottom sx={{ mt: 2, fontWeight: 600, color: darkMode ? '#fff' : '#000' }}>Skills</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
                {userData.skills?.map((skill, index) => (
                  <Chip
                    key={index}
                    label={skill}
                    size={isMobile ? "small" : "medium"}
                    sx={{
                      bgcolor: darkMode ? 'rgba(0, 136, 204, 0.1)' : 'rgba(0, 136, 204, 0.05)',
                      color: '#0088cc',
                      border: `1px solid ${darkMode ? 'rgba(0, 136, 204, 0.2)' : 'rgba(0, 136, 204, 0.15)'}`,
                      '&:hover': { 
                        bgcolor: darkMode ? 'rgba(0, 136, 204, 0.2)' : 'rgba(0, 136, 204, 0.1)' 
                      }
                    }}
                  />
                ))}
              </Box>

              <Divider sx={{ my: 2, borderColor: getDividerColor() }} />

              {/* Interests Section */}
              <Typography variant="h6" gutterBottom sx={{ mt: 2, color: darkMode ? '#fff' : '#000', fontWeight: 600 }}>Interests</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {userData.interests?.map((interest, index) => (
                  <Chip
                    key={index}
                    label={interest}
                    size={isMobile ? "small" : "medium"}
                    sx={{
                      bgcolor: darkMode ? 'rgba(0, 136, 204, 0.1)' : 'rgba(0, 136, 204, 0.05)',
                      color: '#0088cc',
                      border: `1px solid ${darkMode ? 'rgba(0, 136, 204, 0.2)' : 'rgba(0, 136, 204, 0.15)'}`,
                      '&:hover': { 
                        bgcolor: darkMode ? 'rgba(0, 136, 204, 0.2)' : 'rgba(0, 136, 204, 0.1)' 
                      }
                    }}
                  />
                ))}
              </Box>
            </Box>
          </Paper>
        </Grid>

        {/* Right Section */}
        <Grid item xs={12} md={8} sx={{ order: { xs: 3, md: 2 }, display: 'flex', flexDirection: 'column' }}>
          {/* Coding Profiles Section */}
          <Paper sx={{ 
            p: { xs: 2, sm: 3 }, 
            mb: 3,
            ...getCardStyle(),
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
          }}>
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, color: darkMode ? '#fff' : '#000' }}>
              Coding Profiles
            </Typography>

            {/* Pie Charts Section */}
            <Box sx={{ mt: 3 }}>
              <Tabs 
                value={activeChartTab} 
                onChange={(e, newValue) => setActiveChartTab(newValue)}
                variant="scrollable"
                scrollButtons="auto"
                sx={{
                  mb: 3,
                  '& .MuiTab-root': {
                    color: getTextColor(0.7),
                    '&.Mui-selected': {
                      color: '#0088cc',
                    }
                  },
                  '& .MuiTabs-indicator': {
                    backgroundColor: '#0088cc',
                  }
                }}
              >
                <Tab label="Overall Score" value="overall" />
                <Tab label="Problems Solved" value="problems" />
                <Tab label="Contests" value="contests" />
                <Tab label="Rating" value="rating" />
              </Tabs>

              <Box sx={{ 
                width: '100%',
                height: { xs: 300, sm: 400 },
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                overflow: 'hidden',
                position: 'relative',
                backdropFilter: 'blur(5px)',
                borderRadius: '16px',
                bgcolor: darkMode ? 'rgba(0, 0, 0, 0.2)' : 'rgba(0, 0, 0, 0.03)',
                border: darkMode ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid rgba(0, 0, 0, 0.05)',
                boxShadow: darkMode ? '0 4px 8px rgba(0, 0, 0, 0.15)' : '0 4px 8px rgba(0, 0, 0, 0.05)',
              }}>
                <ResponsiveContainer width="100%" height="100%">
                <PieChart 
                    margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
                >
                  <Pie
                    data={preparePieChartData(userData.codingProfiles, activeChartTab)}
                    cx="50%"
                    cy="50%"
                    innerRadius={isMobile ? 60 : 80}
                    outerRadius={isMobile ? 80 : 120}
                      paddingAngle={4}
                    dataKey="value"
                      activeIndex={-1}
                      animationBegin={200}
                      animationDuration={800}
                      activeShape={(props) => {
                        const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
                        return (
                          <g>
                            <path 
                              d={`M ${cx},${cy} L ${cx + outerRadius * Math.cos(startAngle)},${cy + outerRadius * Math.sin(startAngle)} A ${outerRadius},${outerRadius} 0 0,1 ${cx + outerRadius * Math.cos(endAngle)},${cy + outerRadius * Math.sin(endAngle)} Z`}
                              fill={fill}
                              stroke={darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)"}
                              strokeWidth={1}
                            />
                          </g>
                        );
                      }}
                  >
                    {preparePieChartData(userData.codingProfiles, activeChartTab).map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.color}
                          style={{ cursor: 'pointer', filter: 'brightness(1)' }}
                          stroke={darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)"}
                          strokeWidth={1}
                        />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    contentStyle={{ 
                      backgroundColor: darkMode ? '#1E1E1E' : 'white',
                      color: darkMode ? 'white' : '#333',
                      border: darkMode ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid rgba(0, 0, 0, 0.1)',
                        borderRadius: '12px',
                      padding: '12px',
                      fontSize: '14px',
                      boxShadow: darkMode ? '0 4px 12px rgba(0, 0, 0, 0.5)' : '0 4px 12px rgba(0, 0, 0, 0.1)',
                      zIndex: 1000
                    }}
                    labelStyle={{
                      fontWeight: 'bold',
                      marginBottom: '6px',
                        color: '#0088cc'
                    }}
                    wrapperStyle={{
                      outline: 'none'
                    }}
                    itemStyle={{
                      color: darkMode ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.8)',
                      padding: '2px 0'
                    }}
                    isAnimationActive={true}
                    cursor={{ fill: 'transparent' }}
                    formatter={(value, name) => {
                      let label = value;
                      switch (activeChartTab) {
                        case 'overall':
                          label = `Score: ${value}`;
                          break;
                        case 'problems':
                          label = `Problems: ${value}`;
                          break;
                        case 'contests':
                          label = `Contests: ${value}`;
                          break;
                        case 'rating':
                          label = `Rating: ${value}`;
                          break;
                      }
                      return [label, name];
                    }}
                  />
                  <Legend
                    layout="horizontal"
                    align="center"
                    verticalAlign="bottom"
                    iconSize={10}
                    wrapperStyle={{
                      fontSize: '12px',
                      paddingTop: '20px',
                        color: getTextColor(0.9)
                    }}
                    formatter={(value, entry) => (
                      <span style={{ 
                          color: getTextColor(0.9),
                        fontWeight: 500,
                        padding: '4px 8px',
                        cursor: 'pointer'
                      }}>
                        {value}
                      </span>
                    )}
                  />
                </PieChart>
                </ResponsiveContainer>
                {/* Center Text */}
                <Box sx={{
                  position: 'absolute',
                  top: !isMobile ? '45%' : '40%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  textAlign: 'center',
                  width: isMobile ? '100px' : '120px',
                  height: isMobile ? '100px' : '120px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: darkMode ? '#1a1a1a' : '#ffffff',
                  border: darkMode ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.1)',
                  boxShadow: darkMode ? '0 4px 8px rgba(0, 0, 0, 0.3)' : '0 4px 8px rgba(0, 0, 0, 0.1)',
                  borderRadius: '50%',
                  zIndex: -5,
                  pointerEvents: 'none'
                }}>
                  <Typography 
                    variant="h4" 
                    sx={{ 
                      color: '#0088cc', 
                      fontWeight: 700,
                      fontSize: isMobile ? '1.75rem' : '2rem',
                      lineHeight: 1,
                      mb: 1
                    }}
                  >
                    {activeChartTab === 'rating' ? 
                      Math.round(preparePieChartData(userData.codingProfiles, activeChartTab)
                        .reduce((sum, item) => sum + item.value, 0) / 
                        preparePieChartData(userData.codingProfiles, activeChartTab).length) || 0 :
                      preparePieChartData(userData.codingProfiles, activeChartTab)
                        .reduce((sum, item) => sum + item.value, 0)}
                  </Typography>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      color: getTextColor(0.7),
                      fontSize: isMobile ? '0.7rem' : '0.8rem',
                      lineHeight: 1.2,
                      maxWidth: '80%'
                    }}
                  >
                    {activeChartTab === 'overall' ? 'Total Score' :
                     activeChartTab === 'problems' ? 'Total Problems' :
                     activeChartTab === 'contests' ? 'Total Contests' :
                     'Average Rating'}
                  </Typography>
                </Box>
              </Box>
            </Box>

            {/* GitHub Stats Section */}
            <Paper sx={{ 
              p: { xs: 2, sm: 3 }, 
              my: 3,
              ...getCardStyle(),
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
            }}>
              <Typography variant="h5" gutterBottom sx={{ mb: 2, fontWeight: 600, color: darkMode ? '#fff' : '#000' }}>
                GitHub Stats
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Box sx={{ 
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2
                  }}>
                    {userData?.codingProfiles?.github?.username ? (
                      <>
                        {/* GitHub Stats Cards */}
                        <Grid container spacing={2}>
                          <Grid item xs={12} sm={6} md={3}>
                            <Paper sx={{ 
                              p: 2, 
                              ...getInnerCardStyle(),
                              height: '100%',
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'center',
                            }}>
                              <Typography variant="body1" color={getTextColor(0.7)} sx={{ mb: 1 }}>
                                Public Repo's
                              </Typography>
                              <Typography 
                                variant="h5" 
                                sx={{ 
                                  color: '#0088cc', 
                                  fontWeight: 600,
                                  fontSize: { xs: '1.5rem', sm: '1.75rem' }
                                }}
                              >
                                {userData.codingProfiles?.github?.publicRepos || 0}
                              </Typography>
                            </Paper>
                          </Grid>
                          <Grid item xs={12} sm={6} md={3}>
                            <Paper sx={{ 
                              p: 2, 
                              ...getInnerCardStyle(),
                              height: '100%',
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'center',
                            }}>
                              <Typography variant="body1" color={getTextColor(0.7)} sx={{ mb: 1 }}>
                                Score
                              </Typography>
                              <Typography 
                                variant="h5" 
                                sx={{ 
                                  color: '#0088cc', 
                                  fontWeight: 600,
                                  fontSize: { xs: '1.5rem', sm: '1.75rem' }
                                }}
                              >
                                {userData.codingProfiles?.github?.score || 0}
                              </Typography>
                            </Paper>
                          </Grid>
                          <Grid item xs={12} sm={6} md={3}>
                            <Paper sx={{ 
                              p: 2, 
                              ...getInnerCardStyle(),
                              height: '100%',
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'center',
                            }}>
                              <Typography variant="body1" color={getTextColor(0.7)} sx={{ mb: 1 }}>
                                Rating
                              </Typography>
                              <Typography 
                                variant="h5" 
                                sx={{ 
                                  color: '#0088cc', 
                                  fontWeight: 600,
                                  fontSize: { xs: '1.5rem', sm: '1.75rem' }
                                }}
                              >
                                {userData.codingProfiles?.github?.rating || 0}
                              </Typography>
                            </Paper>
                          </Grid>
                          <Grid item xs={12} sm={6} md={3}>
                            <Paper sx={{ 
                              p: 2, 
                              ...getInnerCardStyle(),
                              height: '100%',
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'center',
                            }}>
                              <Typography variant="body1" color={getTextColor(0.7)} sx={{ mb: 1 }}>
                                Rank
                              </Typography>
                              <Typography 
                                variant="h5" 
                                sx={{ 
                                  color: '#0088cc', 
                                  fontWeight: 600, 
                                  textTransform: 'capitalize',
                                  fontSize: { xs: '1.5rem', sm: '1.75rem' }
                                }}
                              >
                                {userData.codingProfiles?.github?.rank || 'Unrated'}
                              </Typography>
                            </Paper>
                          </Grid>
                        </Grid>

                        {/* GitHub Contribution Calendar */}
                        <Paper sx={{ 
                          p: 2, 
                          ...getInnerCardStyle(),
                          mt: 1,
                        }}>
                          <Box sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            mb: 2
                          }}>
                            <Typography variant="h6" sx={{ 
                              color: darkMode ? 'white' : '#000000',
                              fontWeight: 500
                            }}>
                              Contribution Activity
                            </Typography>
                            <Box sx={{ textAlign: 'right' }}>
                              <Typography variant="body2" color={getTextColor(0.7)}>
                                Total Contributions
                              </Typography>
                              <Typography 
                                variant="h6" 
                                sx={{ 
                                  color: '#0088cc', 
                                  fontWeight: 600,
                                  fontSize: { xs: '1.25rem', sm: '1.5rem' }
                                }}
                              >
                                {userData.codingProfiles?.github?.totalContributions || 0}
                              </Typography>
                            </Box>
                          </Box>
                          <Box sx={{ 
                            '.calendar': {
                              maxWidth: '100%',
                              overflow: 'auto',
                              color: `${darkMode ? 'white' : '#000'} !important`,
                              fontSize: '14px !important'
                            },
                            '.contrib-number': {
                              color: '#0088cc !important',
                              fontSize: '20px !important',
                              fontWeight: '600 !important'
                            },
                            '.contrib-column': {
                              color: `${getTextColor(0.7)} !important`,
                              fontSize: '14px !important'
                            },
                            '.text-muted': {
                              color: `${getTextColor(0.5)} !important`,
                              fontSize: '14px !important'
                            }
                          }}>
                            <div ref={calendarRef}></div>
                          </Box>
                        </Paper>

                        {/* GitHub Stats Cards */}
                        <Grid container spacing={2} sx={{ mt: 0 }}>
                          <Grid item xs={12}>
                            <Paper sx={{ 
                              p: 2, 
                              ...getInnerCardStyle(),
                              height: '100%',
                            }}>
                              <Typography variant="h6" sx={{ 
                                mb: 2,
                                color: darkMode ? 'white' : '#000000',
                                fontWeight: 500
                              }}>
                                Contribution Streak
                              </Typography>
                              <Box sx={{ 
                                height: '200px',
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                overflow: 'hidden'
                              }}>
                                <img 
                                  src={`https://github-readme-streak-stats.herokuapp.com/?user=${userData.codingProfiles?.github?.username}&theme=${darkMode ? 'dark' : 'default'}&hide_border=true&background=${darkMode ? '242424' : 'ffffff'}&ring=0088cc&fire=0088cc&currStreakLabel=0088cc&sideLabels=${darkMode ? 'ffffff' : '333333'}&dates=${darkMode ? 'ffffff' : '333333'}&stroke=0088cc&card_width=850&sideNums=${darkMode ? 'ffffff' : '333333'}&currStreakNum=${darkMode ? 'ffffff' : '333333'}`}
                                  alt="GitHub Streak"
                                  style={{ 
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'contain',
                                    transform: 'scale(1.15)',
                                    transformOrigin: 'center'
                                  }}
                                />
                              </Box>
                            </Paper>
                          </Grid>
                        </Grid>
                      </>
                    ) : (
                      <Typography sx={{ color: getTextColor(0.7), textAlign: 'center', py: 4 }}>
                        No GitHub username provided
                      </Typography>
                    )}
                  </Box>
                </Grid>
              </Grid>
            </Paper>

            {/* Achievements Section */}
            <Paper sx={{ 
              p: { xs: 2, sm: 3 },
              ...getCardStyle(),
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
            }}>
              <Typography variant="h5" sx={{ 
                color: darkMode ? '#fff' : '#000',
                fontWeight: 700,
                position: 'relative',
                mb: 3
              }}>
                {achievementTypes.find(t => t.value === activeTab)?.label}s
              </Typography>

              <Box sx={{ 
                display: 'flex',
                flexDirection: { xs: 'row', sm: 'row' },
                gap: 2,
                mb: 3,
                borderBottom: `1px solid ${getDividerColor()}`,
                pb: 1,
                overflowX: 'auto',
                overflowY: 'hidden',
                whiteSpace: 'nowrap',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
                '&::-webkit-scrollbar': {
                  display: 'none'
                },
                WebkitOverflowScrolling: 'touch'
              }}>
                {achievementTypes.map((type) => (
                  <Typography 
                    key={type.value}
                    variant="button"
                    onClick={() => setActiveTab(type.value)}
                    sx={{ 
                      color: activeTab === type.value ? '#0088cc' : getTextColor(0.5),
                      cursor: 'pointer',
                      position: 'relative',
                      pb: 1,
                      px: { xs: 2, sm: 0 },
                      mr: 3,
                      '&:hover': {
                        color: activeTab === type.value ? '#0088cc' : getTextColor(0.8)
                      },
                      '&:after': activeTab === type.value ? {
                        content: '""',
                        position: 'absolute',
                        bottom: -1,
                        left: 0,
                        width: '100%',
                        height: '2px',
                        bgcolor: '#0088cc',
                      } : {}
                    }}
                  >
                    {type.label}s
                  </Typography>
                ))}
              </Box>

              <Box sx={{ width: '100%' }}>
                {filteredAchievements.map((achievement) => (
                  <Box
                    key={achievement._id}
                    sx={{
                      mb: 2,
                      borderRadius: '16px',
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: { xs: 'column', sm: 'row' },
                      width: '100%',
                      transition: 'all 0.3s ease',
                      ...getInnerCardStyle(),
                      transform: 'none',
                      '&:hover': {
                        transform: 'translateY(-5px)',
                        boxShadow: darkMode 
                          ? '0 8px 25px rgba(0, 0, 0, 0.3)' 
                          : '0 8px 25px rgba(0, 0, 0, 0.15)',
                      }
                    }}
                  >
                    {/* Image area - Full width on mobile, 35% on desktop */}
                    <Box
                      sx={{
                        width: { xs: '100%', sm: '35%' },
                        position: 'relative',
                        background: 'linear-gradient(135deg, #4a6cf7 0%, #2651fc 100%)',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        p: 0,
                        overflow: 'hidden',
                        minHeight: { xs: '180px', sm: '250px' },
                      }}
                    >
                      <Box 
                        component="img"
                        src={formatImageUrl(achievement.imageUrl)}
                        alt={achievement.title}
                        sx={{ 
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          display: 'block',
                        }}
                        onError={(e) => {
                          e.target.onerror = null; 
                          e.target.src = "https://via.placeholder.com/150";
                        }}
                      />
                    </Box>

                    {/* Content area - Full width on mobile, 65% on desktop */}
                    <Box
                      sx={{
                        width: { xs: '100%', sm: '65%' },
                        p: { xs: 2, sm: 3 },
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        bgcolor: darkMode ? '#242424' : '#ffffff',
                      }}
                    >
                      <Box>
                        <Typography
                          variant="h5"
                          sx={{
                            fontWeight: 700,
                            color: darkMode ? '#fff' : '#000',
                            mb: 1,
                            fontSize: { xs: '1.2rem', sm: '1.5rem' },
                          }}
                        >
                          {achievement.title}
                        </Typography>

                        <Box
                          sx={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: 1,
                            mb: 2,
                          }}
                        >
                          {achievement.tags?.map((tech, i) => (
                            <Chip
                              key={i}
                              label={tech.trim()}
                              size={isMobile ? "small" : "medium"}
                              sx={{
                                bgcolor: darkMode ? 'rgba(0, 136, 204, 0.1)' : 'rgba(0, 136, 204, 0.05)',
                                color: '#0088cc',
                                border: `1px solid ${darkMode ? 'rgba(0, 136, 204, 0.2)' : 'rgba(0, 136, 204, 0.15)'}`,
                                borderRadius: '20px',
                                fontSize: { xs: '0.75rem', sm: '0.85rem' },
                                fontWeight: 500,
                                height: 'auto',
                                py: 0.5,
                                '&:hover': { 
                                  bgcolor: darkMode ? 'rgba(0, 136, 204, 0.2)' : 'rgba(0, 136, 204, 0.1)' 
                                }
                              }}
                            />
                          ))}
                        </Box>

                        <Typography
                          variant="body2"
                          sx={{
                            color: getTextColor(0.7),
                            mb: { xs: 2, sm: 3 },
                            overflow: 'hidden',
                            display: '-webkit-box',
                            WebkitLineClamp: { xs: 3, sm: 2 },
                            WebkitBoxOrient: 'vertical',
                            textOverflow: 'ellipsis',
                            fontSize: { xs: '0.875rem', sm: '1rem' },
                            lineHeight: { xs: 1.4, sm: 1.6 },
                          }}
                        >
                          {achievement.description || "Work on developing and..."}
                        </Typography>
                      </Box>

                      {achievement.link && (
                        <Button
                          variant="contained"
                          component="a"
                          href={achievement.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          sx={{
                            bgcolor: '#0088cc',
                            color: '#fff',
                            fontWeight: 600,
                            boxShadow: 'none',
                            px: { xs: 3, sm: 4 },
                            py: 1,
                            width: 'fit-content',
                            borderRadius: '8px',
                            textTransform: 'none',
                            fontSize: { xs: '0.875rem', sm: '1rem' },
                            '&:hover': {
                              bgcolor: '#006699',
                            },
                          }}
                        >
                          Visit
                        </Button>
                      )}
                    </Box>
                  </Box>
                ))}
                {filteredAchievements.length === 0 && (
                  <Box sx={{ 
                    textAlign: 'center',
                    py: 4,
                    color: getTextColor(0.5),
                    bgcolor: darkMode ? 'rgba(0, 0, 0, 0.2)' : 'rgba(0, 0, 0, 0.03)',
                    borderRadius: '16px',
                    border: darkMode ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid rgba(0, 0, 0, 0.05)',
                  }}>
                    <Typography>
                      No {achievementTypes.find(t => t.value === activeTab)?.label}s found
                    </Typography>
                  </Box>
                )}
              </Box>
            </Paper>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default UserView; 