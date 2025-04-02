import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  Collapse,
  List,
  ListItem,
  ListItemText,
  Chip
} from '@mui/material';
import { toast } from 'react-toastify';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { apiUrl } from '../config/apiConfig';

const platforms = [
  { 
    name: 'LeetCode',
    key: 'leetcode',
    logo: 'https://assets.leetcode.com/static_assets/public/icons/favicon-192x192.png',
    color: '#FFA116',
    gradient: 'linear-gradient(135deg, rgba(255, 161, 22, 0.8) 0%, rgba(255, 118, 0, 0.8) 100%)',
    description: 'Enhance your problem-solving skills'
  },
  { 
    name: 'CodeChef',
    key: 'codechef',
    logo: 'https://cdn.codechef.com/images/cc-logo.svg',
    color: '#5B4638',
    gradient: 'linear-gradient(135deg, rgba(91, 70, 56, 0.8) 0%, rgba(120, 95, 77, 0.8) 100%)',
    description: 'Competitive programming challenges'
  },
  {
    name: 'GeeksforGeeks',
    key: 'geeksforgeeks',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/43/GeeksforGeeks.svg/2560px-GeeksforGeeks.svg.png',
    color: '#2F8D46',
    gradient: 'linear-gradient(135deg, rgba(47, 141, 70, 0.8) 0%, rgba(67, 182, 93, 0.8) 100%)',
    description: 'Computer science portal for geeks'
  },
  {
    name: 'HackerRank',
    key: 'hackerrank',
    logo: 'https://cdn4.iconfinder.com/data/icons/logos-and-brands/512/160_Hackerrank_logo_logos-512.png',
    color: '#00AB6C',
    gradient: 'linear-gradient(135deg, rgba(0, 171, 108, 0.8) 0%, rgba(0, 199, 126, 0.8) 100%)',
    description: 'Practice coding challenges'
  },
  {
    name: 'CodeForces',
    key: 'codeforces',
    logo: 'https://cdn.iconscout.com/icon/free/png-256/free-codeforces-3628695-3029920.png',
    color: '#FF3333',
    gradient: 'linear-gradient(135deg, rgba(255, 51, 51, 0.8) 0%, rgba(255, 71, 71, 0.8) 100%)',
    description: 'Competitive programming contests'
  },
  {
    name: 'GitHub',
    key: 'github',
    logo: 'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png',
    color: '#333333',
    gradient: 'linear-gradient(135deg, rgba(51, 51, 51, 0.8) 0%, rgba(0, 0, 0, 0.8) 100%)',
    description: 'Track your code contributions'
  }
];

const platformColors = {
  geeksforgeeks: '#2f8d46',
  codechef: '#5b4638',
  codeforces: '#ff3333',
  leetcode: '#ffa116',
  hackerrank: '#00ab6c',
  github: '#333333'
};

// Function to render platform-specific details
const renderPlatformDetails = (platform, details) => {
  if (!details) return null;
  
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Common details for all platforms
  const commonDetails = [
    { label: 'Score', value: details.score || '0' },
    { label: 'Problems Solved', value: details.problemsSolved || '0' },
    { label: 'Last Updated', value: formatDate(details.lastUpdated) }
  ];
  
  // Platform-specific details
  let platformDetails = [];
  
  switch (platform) {
    case 'github':
      platformDetails = [
        { label: 'Public Repos', value: details.publicRepos || '0' },
        { label: 'Total Commits', value: details.totalCommits || '0' },
        { label: 'Followers', value: details.followers || '0' },
        { label: 'Following', value: details.following || '0' },
        { label: 'Stars Received', value: details.starsReceived || '0' }
      ];
      break;
    case 'leetcode':
      platformDetails = [
        { label: 'Ranking', value: details.globalRank || details.ranking || 'N/A' },
        { label: 'Contest Rating', value: details.rating || '0' },
        { label: 'Reputation', value: details.reputation || '0' },
        { label: 'Easy Problems', value: details.easyProblemsSolved || '0' },
        { label: 'Medium Problems', value: details.mediumProblemsSolved || '0' },
        { label: 'Hard Problems', value: details.hardProblemsSolved || '0' },
        { label: 'Contests Participated', value: details.contestsParticipated || '0' }
      ];
      break;
      
    case 'codeforces':
      platformDetails = [
        { label: 'Rating', value: details.rating || '0' },
        { label: 'Max Rating', value: details.maxRating || '0' },
        { label: 'Rank', value: details.rank || 'Unrated' },
        { label: 'Contribution', value: details.contribution || '0' },
        { label: 'Contests Participated', value: details.contestsParticipated || '0' }
      ];
      break;
      
    case 'codechef':
      platformDetails = [
        { label: 'Rating', value: details.rating || '0' },
        { label: 'Global Rank', value: details.global_rank || details.globalRank || 'N/A' },
        { label: 'Country Rank', value: details.country_rank || details.countryRank || 'N/A' },
        { 
          label: 'Problems Solved', 
          value: details.problemsSolved || '0',
          highlight: true,
          description: 'Used as your total problems solved count'
        },
        { label: 'Contests Participated', value: details.contestsParticipated || '0' },
        { label: 'Partially Solved', value: details.partialSolved || '0' }
      ];
      break;
      
    case 'geeksforgeeks':
      platformDetails = [
        { label: 'Coding Score', value: details.codingScore || '0' },
        { label: 'Rank', value: details.rank || 'N/A' },
        { label: 'Institute Rank', value: details.instituteRank || 'N/A' },
        { label: 'Easy Problems', value: details.easyProblemsSolved || '0' },
        { label: 'Medium Problems', value: details.mediumProblemsSolved || '0' },
        { label: 'Hard Problems', value: details.hardProblemsSolved || '0' },
        { label: 'Contests Participated', value: details.contestsParticipated || '0' }
      ];
      break;
      
    case 'hackerrank':
      platformDetails = [
        { label: 'Badges', value: details.badges || details.badgesCount || '0' },
        { label: 'Certificates', value: details.certificates || details.certificatesCount || '0' },
        { label: 'Contests Participated', value: details.contestsParticipated || '0' }
      ];
      break;
      
    default:
      break;
  }
  
  return [...commonDetails, ...platformDetails];
};

// Function to format days in specific order: Wed, Thu, Fri, Sat, Sun, Mon, Tue
const formatDaysInOrder = (data) => {
  // Define the order of days (starting from Wednesday)
  const dayOrder = ['Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Mon', 'Tue'];
  
  // If data is already using these abbreviations, sort by the defined order
  if (Array.isArray(data) && data.some(item => item.day)) {
    return data.sort((a, b) => {
      return dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day);
    });
  }
  
  // If data is using full day names, convert and sort
  if (Array.isArray(data) && data.some(item => item.date)) {
    return data.map(item => {
      const date = new Date(item.date);
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
      return {
        ...item,
        day: dayName.substring(0, 3), // Ensure we get just the first 3 letters
        dayIndex: dayOrder.indexOf(dayName.substring(0, 3))
      };
    }).sort((a, b) => a.dayIndex - b.dayIndex);
  }
  
  return data;
};

// Helper function to get current week's data with ordered days
const getCurrentWeekData = () => {
  const days = [];
  const today = new Date();
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  // Start from Wednesday (3) and go through a full week
  let startDay = 3; // Wednesday's index in standard array
  
  for (let i = 0; i < 7; i++) {
    const dayIndex = (startDay + i) % 7;
    const dayName = dayNames[dayIndex];
    
    const date = new Date(today);
    // Adjust date to get the correct day of the week
    const diff = (dayIndex - today.getDay() + 7) % 7;
    date.setDate(today.getDate() + diff - 7); // Get last week's data
    
    days.push({
      day: dayName,
      date: date.toISOString().split('T')[0],
      value: 0 // Default value
    });
  }
  
  return days;
};

// When displaying activity in any chart that needs ordered days, use the formatDaysInOrder function
// Example usage in a chart data preparation function:
const prepareChartData = (rawData) => {
  // First get the base days in correct order
  const orderedDays = getCurrentWeekData();
  
  // Then add actual data values
  const chartData = orderedDays.map(day => {
    const matchingData = rawData.find(d => d.day === day.day || 
                                       new Date(d.date).toLocaleDateString('en-US', { weekday: 'short' }).substring(0, 3) === day.day);
    return {
      day: day.day,
      date: day.date,
      value: matchingData ? matchingData.value : 0
    };
  });
  
  return chartData;
};

const Dashboard = () => {
  const auth = useAuth();
  const navigate = useNavigate();
  const { darkMode } = useTheme();
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState({});
  const [profileDetails, setProfileDetails] = useState({});
  const [expandedProfiles, setExpandedProfiles] = useState({});
  const [platformData, setPlatformData] = useState({});
  const [updatingPlatforms, setUpdatingPlatforms] = useState({});
  const [cooldowns, setCooldowns] = useState({});
  const [remainingTimes, setRemainingTimes] = useState({});

  // Theme-based colors for reuse
  const themeColors = {
    background: 'transparent', // Always transparent background
    cardBg: darkMode ? '#121212' : '#ffffff',
    cardBorder: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
    inputBg: darkMode ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.05)',
    inputBorder: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.15)',
    text: {
      primary: darkMode ? '#ffffff' : '#000000',
      secondary: darkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)',
      muted: darkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)',
    },
    statsBg: darkMode ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.03)',
    statsItemBg: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'
  };

  useEffect(() => {
    if (!auth?.token) {
      navigate('/login');
      return;
    }
    fetchUserData();
  }, [auth?.token]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      const now = Date.now();
      let updatedTimes = {};
      let hasActiveCooldowns = false;

      Object.keys(cooldowns).forEach(platform => {
        const cooldownEnd = cooldowns[platform];
        if (cooldownEnd && cooldownEnd > now) {
          const remainingSeconds = Math.ceil((cooldownEnd - now) / 1000);
          updatedTimes[platform] = remainingSeconds;
          hasActiveCooldowns = true;
        } else if (cooldowns[platform]) {
          setCooldowns(prev => {
            const updated = { ...prev };
            delete updated[platform];
            return updated;
          });
        }
      });

      if (hasActiveCooldowns) {
        setRemainingTimes(updatedTimes);
      }
    }, 1000);

    return () => clearInterval(intervalId);
  }, [cooldowns]);

  const fetchUserData = async () => {
    if (!auth?.token) return;
    
    try {
      setLoading(true);
      
      // Try multiple endpoints to get the most complete user data
      let userData = null;
      let meResponse = null;
      let profilesResponse = null;
      let statsResponse = null;
      
      // 1. Try to get main user data from /me endpoint
      try {
        meResponse = await axios.get(`${apiUrl}/users/me`, {
          headers: { Authorization: `Bearer ${auth.token}` }
        });
        userData = meResponse.data;
      } catch (meError) {
        // Silent error handling
      }
      
      // 2. Try to get profiles data if me endpoint failed or returned incomplete data
      if (!userData || !userData.codingProfiles) {
        try {
          profilesResponse = await axios.get(`${apiUrl}/profiles/me`, {
            headers: { Authorization: `Bearer ${auth.token}` }
          });
          userData = {...userData, ...profilesResponse.data};
        } catch (profilesError) {
          // Silent error handling
        }
      }
      
      // 3. Get current stats data to ensure we have the latest
      try {
        statsResponse = await axios.get(`${apiUrl}/profiles/stats`, {
          headers: { Authorization: `Bearer ${auth.token}` }
        });
      } catch (statsError) {
        // Silent error handling
      }
      
      // If we couldn't get any data at all, show error
      if (!userData && !statsResponse) {
        throw new Error('Failed to retrieve any user data');
      }
      
      // Process data from all sources to build a complete profile picture
      const platformDataObj = {};
      const profileDetailsObj = {};
      const profilesObj = {};
      const cooldownsObj = {};
      const remainingTimesObj = {};
      const now = Date.now();

      platforms.forEach(platform => {
        const key = platform.key;
        let username = '';
        let details = null;
        let lastUpdateAttempt = null;
        
        // Extract username from userData (various formats)
        if (userData) {
          if (userData.profiles && userData.profiles[key]) {
            username = userData.profiles[key];
          } else if (userData.codingProfiles && userData.codingProfiles[key]) {
            username = userData.codingProfiles[key].username || '';
          } else if (userData[key]) {
            username = userData[key];
          }
          
          // Normalize username format - ensure we only store the actual username string
          if (typeof username === 'object') {
            username = username.username || '';
          }
          
          // Make sure username is a string and not undefined/null
          username = username ? String(username) : '';
          
          // Extract details from userData (various formats)
          if (userData.platformData && userData.platformData[key]) {
            details = userData.platformData[key];
          } else if (userData.codingProfiles && userData.codingProfiles[key]) {
            details = userData.codingProfiles[key];
          } else if (userData[`${key}Details`]) {
            details = userData[`${key}Details`];
          }
          
          // Check if we have lastUpdateAttempt in the data
          if (details && details.lastUpdateAttempt) {
            lastUpdateAttempt = new Date(details.lastUpdateAttempt).getTime();
          }
        }
        
        // Add null check for details
        if (!details) {
          details = {
            score: 0,
            problemsSolved: 0,
            lastUpdated: new Date()
          };
        }
        
        // Update with stats data if available
        if (statsResponse && statsResponse.data && statsResponse.data.success) {
          const platformStats = statsResponse.data.profiles.find(p => p.platform === key);
          if (platformStats) {
            details = {...details, ...platformStats};
            
            // Update the username from stats if needed for consistency
            if (platformStats.username && !username) {
              username = typeof platformStats.username === 'object' ? 
                platformStats.username.username || '' : platformStats.username || '';
            }
            
            if (platformStats.lastUpdateAttempt) {
              lastUpdateAttempt = new Date(platformStats.lastUpdateAttempt).getTime();
            }
          }
        }
        
        // Check if this platform is in cooldown period (updated in the last minute)
        if (lastUpdateAttempt) {
          const timeSinceLastAttempt = now - lastUpdateAttempt;
          const cooldownPeriod = 60 * 1000; // 1 minute in milliseconds
          
          if (timeSinceLastAttempt < cooldownPeriod) {
            // Calculate remaining cooldown time
            const remainingTimeMs = cooldownPeriod - timeSinceLastAttempt;
            const remainingTimeSec = Math.ceil(remainingTimeMs / 1000);
            
            // Set cooldown for this platform
            cooldownsObj[key] = now + remainingTimeMs;
            remainingTimesObj[key] = remainingTimeSec;
          }
        }
        
        // Ensure details has a username property
        if (details && username && !details.username) {
          details.username = username;
        }
        
        // Store extracted data
        platformDataObj[key] = { username, details };
        profileDetailsObj[key] = details;
        profilesObj[key] = username;
      });
      
      // Update state with all the data we've collected
      setPlatformData(platformDataObj);
      setProfileDetails(profileDetailsObj);
      setProfiles(profilesObj);
      setCooldowns(cooldownsObj);
      setRemainingTimes(remainingTimesObj);
      
      // Initialize all profiles as collapsed by default
      const expandedState = {};
      Object.keys(profilesObj).forEach(key => {
        expandedState[key] = false; // Always collapsed by default
      });
      setExpandedProfiles(expandedState);
      
      setLoading(false);
    } catch (error) {
      toast.error('Failed to load profile data. Please try again later.');
      setLoading(false);
    }
  };

  const handleSubmit = async (platform) => {
    if (!auth?.token) return;
    
    try {
      setUpdatingPlatforms(prev => ({ ...prev, [platform]: true }));
      const username = profiles[platform] || '';
      
      if (!username.trim()) {
        toast.error('Username cannot be empty');
        setUpdatingPlatforms(prev => ({ ...prev, [platform]: false }));
        return;
      }

      const response = await axios.post(
        `${apiUrl}/profiles/${platform}`,
        { username },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${auth.token}`
          }
        }
      );

      if (response.data.success) {
        // Success handling - always show success toast if we get here
        toast.success(`${platform} profile updated successfully!`);
        
        // Only update the username in profiles state if API confirmed it's valid
        setProfiles(prev => ({
          ...prev,
          [platform]: username
        }));
        
        // Update platforms data with the new data
        setPlatformData(prev => ({
          ...prev,
          [platform]: response.data.data
        }));
        
        // Update profile details with the new data
        setProfileDetails(prev => ({
          ...prev,
          [platform]: response.data.data.details
        }));
        
        // Only set cooldown after successful updates
        const cooldownEnd = Date.now() + (60 * 1000); // 1 minute in milliseconds
        setCooldowns(prev => ({ ...prev, [platform]: cooldownEnd }));
        setRemainingTimes(prev => ({ ...prev, [platform]: 60 }));
      } else {
        // If the update wasn't successful, don't set a cooldown
        toast.error(response.data.message || 'Failed to update profile');
        
        // Reset the input field to the previous valid username
        // This ensures incorrect usernames don't replace correct ones
        setProfiles(prev => ({
          ...prev,
          [platform]: platformData[platform]?.username || prev[platform]
        }));
      }
    } catch (error) {
      // Check if this is a rate limit error (429)
      if (error.response?.status === 429) {
        const remainingTime = error.response.data.remainingTime || 60;
        
        // Show toast with time remaining
        toast.error(error.response.data.message || `Rate limit exceeded. Please try again in ${remainingTime} seconds.`);
        
        // Only set a cooldown for rate limit errors
        const cooldownEnd = Date.now() + (remainingTime * 1000);
        setCooldowns(prev => ({ ...prev, [platform]: cooldownEnd }));
        setRemainingTimes(prev => ({ ...prev, [platform]: remainingTime }));
      } else {
        // For all other errors (including "profile not found"), don't set a cooldown
        let errorMessage = error.response?.data?.message || `Failed to update ${platform} profile. Please try again.`;
        
        // Format profile not found errors more clearly
        if (errorMessage.includes('not found') || errorMessage.includes('Profile Not Found')) {
          const platformName = platforms.find(p => p.key === platform)?.name || platform;
          
          // Add specific troubleshooting tips based on the platform
          if (platform === 'codeforces') {
            errorMessage = `${errorMessage}. Please check that the username exists and is spelled correctly.`;
          } else if (platform === 'hackerrank') {
            errorMessage = `${errorMessage}. Please verify your HackerRank username is correct.`;
          } else if (platform === 'geeksforgeeks') {
            errorMessage = `${errorMessage}. Please verify your GeeksforGeeks username is correct.`;
          } else {
            errorMessage = `${errorMessage}. Please verify the username and try again.`;
          }
        }
        
        toast.error(errorMessage);
        
        // Reset the input field to the previous valid username
        // This ensures incorrect usernames don't replace correct ones
        setProfiles(prev => ({
          ...prev,
          [platform]: platformData[platform]?.username || prev[platform]
        }));
      }
    } finally {
      setUpdatingPlatforms(prev => ({ ...prev, [platform]: false }));
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container 
      maxWidth={false} 
      sx={{ 
        py: 6,
        px: { xs: 1, sm: 3 },
        maxWidth: '100vw',
        overflowX: 'hidden',
        bgcolor: 'transparent', // Always transparent regardless of theme
        minHeight: '100vh'
      }}
    >
      {/* Header Section */}
      <Box sx={{ 
        mb: 6, 
        textAlign: 'center', 
        position: 'relative',
        maxWidth: '1200px',
        mx: 'auto'
      }}>
        <Typography 
          variant="h3" 
          component="h1" 
          sx={{ 
            fontWeight: 700,
            color: darkMode ? '#00BFFF' : '#0088cc',
            mb: 1,
            fontSize: { xs: '2rem', sm: '2.5rem' }
          }}
        >
          Dashboard
        </Typography>
        <Typography 
          variant="subtitle1" 
          sx={{ 
            color: themeColors.text.secondary, 
            mb: 3,
            fontSize: { xs: '0.9rem', sm: '1rem' }
          }}
        >
          Track your progress across multiple competitive programming platforms
        </Typography>
      </Box>

      {/* Platforms Grid */}
      <Grid 
        container 
        spacing={3} 
        sx={{ 
          maxWidth: '1200px',
          mx: 'auto',
          justifyContent: 'center',
          width: '100%',
          pl: { xs: 0 },
          pr: { xs: 0 }
        }}
      >
        {platforms.map((platform) => (
          <Grid 
            item 
            xs={12} sm={6} md={4} 
            key={platform.key}
            sx={{
              display: 'flex',
              justifyContent: 'center'
          }}  
          >
            <Card 
              sx={{ 
                width: '100%',
                maxWidth: { xs: '100%', sm: '100%' },
                bgcolor: 'transparent',
                borderRadius: 2,
                overflow: 'hidden',
                boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                border: 'none',
                borderTop: `5px solid ${platform.color}`,
                transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: `0 12px 28px rgba(0,0,0,0.15), 0 0 0 1px ${platform.color}40`,
                }
              }}
            >
              <CardContent sx={{ 
                p: 0, 
                pb: '0 !important',
                minHeight: '380px',
                display: 'flex',
                flexDirection: 'column',
                bgcolor: darkMode ? '#121212' : '#ffffff',
              }}>
                {/* Platform Header */}
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  px: 3,
                  py: 2.5,
                  borderBottom: `1px solid ${darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`,
                  background: darkMode ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.95)',
                }}>
                  <Box 
                    component="img"
                    src={platform.logo}
                    alt={platform.name}
                    sx={{ 
                      height: 30,
                      width: 30,
                      mr: 2,
                      objectFit: 'contain',
                    }}
                  />
                  <Typography variant="h6" sx={{ 
                    fontWeight: 700, 
                    color: platform.color,
                    fontSize: '1.2rem',
                    letterSpacing: '0.02em',
                  }}>
                    {platform.name}
                  </Typography>
                </Box>

                {/* Card Body Content */}
                <Box sx={{ 
                  p: 3,
                  display: 'flex',
                  flexDirection: 'column',
                  flexGrow: 1
                }}>
                  {/* Username Input Field */}
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="body2" sx={{ 
                      mb: 1,
                      fontWeight: 600,
                      fontSize: '0.85rem',
                      color: darkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)'
                    }}>
                      Username
                    </Typography>
                    <Box sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      bgcolor: darkMode ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.02)',
                      borderRadius: 2,
                      border: `1px solid ${darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                      position: 'relative',
                      overflow: 'hidden',
                      transition: 'all 0.2s ease',
                      '&:focus-within': {
                        border: `1px solid ${platform.color}`,
                        boxShadow: `0 0 0 3px ${platform.color}25`,
                      }
                    }}>
                      <input
                        value={typeof profiles[platform.key] === 'object' ? '' : (profiles[platform.key] || '')}
                        onChange={(e) => {
                          // Only update the input field, don't persist to backend until submission
                          setProfiles(prev => ({
                            ...prev,
                            [platform.key]: e.target.value
                          }));
                        }}
                        placeholder={`Enter ${platform.name} username`}
                        disabled={updatingPlatforms[platform.key] || Boolean(cooldowns[platform.key])}
                        style={{
                          width: '100%',
                          height: '46px',
                          padding: '0 15px',
                          paddingRight: '50px',
                          background: 'transparent',
                          color: darkMode ? 'white' : 'black',
                          border: 'none',
                          outline: 'none',
                          fontSize: '15px',
                          fontWeight: '500',
                        }}
                      />
                      
                      {/* Add reset button if text field value differs from stored valid username */}
                      {profiles[platform.key] !== platformData[platform.key]?.username && 
                       platformData[platform.key]?.username && (
                        <Box 
                          sx={{ 
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            position: 'absolute',
                            right: '48px',
                            height: '100%',
                            width: '48px',
                            color: darkMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)',
                            transition: '0.2s',
                            cursor: 'pointer',
                            '&:hover': {
                              color: platform.color,
                            }
                          }}
                          onClick={() => {
                            // Reset to the last valid username
                            setProfiles(prev => ({
                              ...prev,
                              [platform.key]: platformData[platform.key]?.username || ''
                            }));
                            toast.info(`Reset to last valid ${platform.name} username`);
                          }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                            <path d="M3 3v5h5" />
                          </svg>
                        </Box>
                      )}
                      
                      <Box 
                        sx={{ 
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          position: 'absolute',
                          right: 0,
                          height: '100%',
                          width: '48px',
                          bgcolor: cooldowns[platform.key] ? `${platform.color}40` : platform.color,
                          color: '#fff',
                          opacity: cooldowns[platform.key] ? 0.5 : 0.9,
                          transition: '0.2s',
                          cursor: cooldowns[platform.key] ? 'not-allowed' : 'pointer',
                          '&:hover': {
                            opacity: cooldowns[platform.key] ? 0.5 : 1
                          }
                        }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </Box>
                    </Box>
                  </Box>
                  
                  {/* Current Username Display - Always show */}
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 1, 
                      mb: 3,
                      p: 2,
                      borderRadius: 2,
                    bgcolor: profiles[platform.key] 
                      ? (darkMode ? `${platform.color}10` : `${platform.color}08`) 
                      : (darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'),
                    border: profiles[platform.key] 
                      ? `1px dashed ${platform.color}40`
                      : `1px dashed ${darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`
                    }}>
                      <Box sx={{ 
                        p: 1, 
                        borderRadius: '50%', 
                      bgcolor: profiles[platform.key] ? platform.color : (darkMode ? 'rgba(255,80,80,0.8)' : 'rgba(255,60,60,0.8)'),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.7rem',
                        color: '#fff'
                      }}>
                      {profiles[platform.key] ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18"></line>
                          <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                      )}
                      </Box>
                      <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                        <Typography variant="caption" sx={{ 
                        color: profiles[platform.key] ? platform.color : (darkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'),
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}>
                          Current Username
                        </Typography>
                        <Typography sx={{ 
                          fontFamily: 'monospace',
                          fontSize: '0.9rem',
                        color: profiles[platform.key] 
                          ? (darkMode ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)') 
                          : (darkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'),
                        fontWeight: profiles[platform.key] ? 600 : 400,
                        fontStyle: profiles[platform.key] ? 'normal' : 'italic'
                      }}>
                        {profiles[platform.key] ? profiles[platform.key] : 'Not provided'}
                        </Typography>
                      </Box>
                    </Box>

                  {/* Action Buttons */}
                  <Box sx={{ 
                    display: 'flex', 
                    gap: 2,
                    mt: 'auto',
                    flexDirection: 'column'
                  }}>
                    <Button
                      variant="contained"
                      onClick={() => handleSubmit(platform.key)}
                      disabled={updatingPlatforms[platform.key] || Boolean(cooldowns[platform.key])}
                      sx={{
                        py: 1.6,
                        bgcolor: cooldowns[platform.key] ? `${platform.color}70` : platform.color,
                        borderRadius: 2,
                        boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
                        fontSize: '0.9rem',
                        fontWeight: 600,
                        width: '100%',
                        '&:hover': {
                          bgcolor: cooldowns[platform.key] ? `${platform.color}70` : platform.color,
                          opacity: cooldowns[platform.key] ? 1 : 0.9,
                          boxShadow: cooldowns[platform.key] ? 'none' : `0 6px 12px ${platform.color}40`,
                          transform: cooldowns[platform.key] ? 'none' : 'translateY(-2px)',
                          cursor: cooldowns[platform.key] ? 'not-allowed' : 'pointer',
                        },
                        transition: 'all 0.3s ease',
                        position: 'relative',
                        overflow: 'hidden',
                      }}
                    >
                      {updatingPlatforms[platform.key] ? (
                        <CircularProgress size={20} color="inherit" />
                      ) : cooldowns[platform.key] ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <CircularProgress
                            variant="determinate"
                            value={(remainingTimes[platform.key] / 60) * 100}
                            size={20}
                            sx={{ 
                              color: 'rgba(255,255,255,0.9)',
                              position: 'absolute',
                              left: '15px',
                            }}
                          />
                          <Typography component="span" sx={{ 
                            fontSize: '0.9rem',
                            fontWeight: 600,
                            letterSpacing: '0.01em',
                          }}>
                            Update in {remainingTimes[platform.key]}s
                          </Typography>
                        </Box>
                      ) : (
                        'Update Profile'
                      )}
                    </Button>
                    
                    <Button
                      variant="outlined"
                      onClick={() => {
                        setExpandedProfiles(prev => ({
                          ...prev,
                          [platform.key]: !prev[platform.key]
                        }));
                      }}
                      sx={{
                        py: 1.4,
                        borderColor: expandedProfiles[platform.key] 
                          ? (darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)') 
                          : `${platform.color}30`,
                        color: expandedProfiles[platform.key] 
                          ? (darkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)')
                          : platform.color,
                        borderRadius: 2,
                        fontSize: '0.85rem',
                        fontWeight: 500,
                        borderWidth: '1px',
                        boxShadow: 'none',
                        backgroundColor: 'transparent',
                        '&:hover': {
                          borderColor: expandedProfiles[platform.key] 
                            ? (darkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)')
                            : platform.color,
                          bgcolor: 'transparent',
                          boxShadow: 'none',
                        },
                      }}
                    >
                      {expandedProfiles[platform.key] ? 'Hide Stats' : 'Show Stats'}
                    </Button>
                  </Box>
                </Box>
                
                {/* Profile Stats (Collapsed) */}
                <Collapse in={expandedProfiles[platform.key]} timeout="auto">
                  <Box 
                    sx={{ 
                      p: 3,
                      pt: 0,
                      pb: 3,
                    }}
                  >
                    {profileDetails[platform.key] ? (
                            <Box sx={{ 
                        bgcolor: darkMode ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.8)',
                        borderRadius: 2,
                        overflow: 'hidden',
                        border: `1px solid ${darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`,
                      }}>
                        {/* Stats header */}
                        <Box sx={{
                          bgcolor: darkMode ? `${platform.color}30` : `${platform.color}15`,
                          px: 2.5,
                          py: 1.5,
                          borderBottom: `1px solid ${darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`,
                              display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        }}>
                          <Typography sx={{
                                color: platform.color,
                            fontWeight: 600,
                            fontSize: '0.8rem',
                                textTransform: 'uppercase',
                            letterSpacing: '0.03em',
                          }}>
                            {platform.name} Stats
                          </Typography>
                          <Typography variant="caption" sx={{
                            color: darkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)',
                            fontSize: '0.7rem',
                          }}>
                            {profileDetails[platform.key].lastUpdated ? 
                              `Last updated: ${new Date(profileDetails[platform.key].lastUpdated).toLocaleDateString()}` :
                              'Not synced yet'}
                          </Typography>
                        </Box>

                        {/* Stats body */}
                        <Box sx={{ p: 0 }}>
                          {renderPlatformDetails(platform.key, profileDetails[platform.key])
                            .filter(detail => detail.label !== 'Last Updated') // Remove last updated since we show it in header
                            .map((detail, index) => (
                            <Box 
                              key={index}
                              sx={{ 
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                px: 2.5,
                                py: 1.8,
                                borderBottom: index !== renderPlatformDetails(platform.key, profileDetails[platform.key]).length - 2 ? 
                                  `1px solid ${darkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)'}` : 'none',
                                transition: 'all 0.2s ease',
                                '&:hover': {
                                  bgcolor: darkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.015)',
                                }
                              }}
                            >
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <Box sx={{ 
                                  width: 8, 
                                  height: 8, 
                                  borderRadius: '50%', 
                                  bgcolor: platform.color,
                                  mr: 1.5,
                                  opacity: 0.7
                                }} />
                                <Typography sx={{ 
                                  color: darkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)',
                                  fontSize: '0.8rem',
                                  fontWeight: 500,
                              }}>
                                {detail.label}
                              </Typography>
                              </Box>
                              
                              <Typography sx={{ 
                                fontFamily: 'nekst, monospace',
                                color: platform.color,
                                fontWeight: detail.label === 'Score' || detail.label === 'Problems Solved' || detail.label.includes('Rating') ? 700 : 600,
                                fontSize: detail.label === 'Score' || detail.label === 'Problems Solved' || detail.label.includes('Rating') ? '1.15rem' : '0.95rem',
                                lineHeight: 1,
                                display: 'flex',
                                alignItems: 'center',
                                pl: 1,
                              }}>
                                {detail.value}
                              </Typography>
                            </Box>
                        ))}
                        </Box>
                      </Box>
                    ) : (
                      <Box sx={{
                        p: 3,
                        borderRadius: 2,
                        bgcolor: darkMode ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.8)',
                        border: `1px solid ${darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexDirection: 'column',
                      }}>
                        {profiles[platform.key] ? (
                          <>
                            <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={platform.color + '90'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="12" cy="12" r="10"></circle>
                              <line x1="12" y1="8" x2="12" y2="12"></line>
                              <line x1="12" y1="16" x2="12.01" y2="16"></line>
                            </svg>
                            <Typography sx={{ 
                              color: platform.color,
                              textAlign: 'center',
                              fontWeight: 500,
                              fontSize: '0.85rem',
                              mt: 2
                            }}>
                              Profile found but not synced yet
                            </Typography>
                            <Typography sx={{ 
                              color: darkMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)',
                              textAlign: 'center',
                              fontWeight: 400,
                              fontSize: '0.75rem',
                              mt: 1
                            }}>
                              Click "Update Profile" to sync your stats
                            </Typography>
                          </>
                        ) : (
                          <>
                            <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={platform.color + '90'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21.21 15.89A10 10 0 1 1 8 2.83"></path>
                              <path d="M22 12A10 10 0 0 0 12 2v10z"></path>
                            </svg>
                            <Typography sx={{ 
                              color: darkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)',
                              textAlign: 'center',
                              fontWeight: 500,
                              fontSize: '0.85rem',
                              mt: 2
                            }}>
                              No stats available yet
                            </Typography>
                          </>
                        )}
                      </Box>
                    )}
                  </Box>
                </Collapse>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
};

export default Dashboard;