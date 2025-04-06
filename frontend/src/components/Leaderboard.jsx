import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Tooltip,
  Alert,
  useMediaQuery,
  Card,
  Avatar,
  Grid,
  TextField,
  InputAdornment,
  Chip,
  Button,
  Stack,
  Divider,
  Slide,
  Zoom,
  Tab,
  Tabs,
  Menu,
  Pagination,
  Badge,
  LinearProgress,
  FormControlLabel,
  TablePagination
} from '@mui/material';
import { useSwipeable } from 'react-swipeable';
import {
  Search,
  EmojiEvents,
  School,
  WorkspacePremium,
  LocalFireDepartment,
  TrendingUp,
  Code,
  ArrowUpward,
  ArrowDownward,
  Whatshot,
  Public,
  Group,
  ArrowDropDown,
  Visibility,
  Star,
  SportsScore,
  EmojiPeople,
  Equalizer,
  FilterList,
  Refresh
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { apiUrl } from '../config/apiConfig';
import { getProfileImageUrl } from '../utils/profileUtils';

const departments = [
  'ALL', 'CSE', 'CSC', 'CSD', 'ECE', 'IT', 'CSM', 'CSIT', 'AERO', 'MECH', 'OTHER'
];

const platforms = {
  geeksforgeeks: 'GeeksforGeeks',
  leetcode: 'LeetCode',
  hackerrank: 'HackerRank',
  codechef: 'CodeChef',
  codeforces: 'CodeForces',
  github: 'GitHub'
};

const platformColors = {
  geeksforgeeks: '#2f8d46',
  leetcode: '#ffa116',
  hackerrank: '#00ab6c',
  codechef: '#5b4638',
  codeforces: '#1f8acb',
  github: '#2dba4e'
};

const getInitials = (name) => {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase();
};

// Add the getStudentYear function after the getInitials function
const getStudentYear = (graduatingYear) => {
  if (!graduatingYear) return '-';
  
  const currentYear = new Date().getFullYear();
  const yearsToGraduation = graduatingYear - currentYear;
  
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
      return 'Incoming';
    default:
      if (yearsToGraduation > 4) {
        return 'Future';
      } else if (yearsToGraduation < -4) {
        return 'Alumni';
      } else {
        return `Year ${4 - yearsToGraduation}`;
      }
  }
};

// Add platform groupings for each leaderboard type
const leaderboardConfigs = {
  problems: {
    title: 'Problems Solved Leaderboard',
    platforms: ['geeksforgeeks', 'leetcode', 'hackerrank', 'codechef', 'codeforces'],
    valueKey: 'problemsSolved',
    label: 'Problems Solved'
  },
  score: {
    title: 'Score Leaderboard',
    platforms: Object.keys(platforms),
    valueKey: 'totalScore',
    label: 'Total Score'
  }
};

const Leaderboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState('totalScore');
  const [sortOrder, setSortOrder] = useState('desc');
  const [department, setDepartment] = useState('ALL');
  const [year, setYear] = useState('ALL');
  const [section, setSection] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [anchorElDepartment, setAnchorElDepartment] = useState(null);
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [leaderboardType, setLeaderboardType] = useState('score');
  const [animateTop3, setAnimateTop3] = useState(false);
  const { token } = useAuth();
  const { darkMode } = useTheme();

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    fetchLeaderboard();
  }, [department, section, year, leaderboardType, token]);

  useEffect(() => {
    // Animate top 3 cards after component mounts
    setAnimateTop3(true);
  }, []);

  const fetchLeaderboard = async () => {
    if (!token) return;
    
    try {
      setError('');
      setLoading(true);

      // Determine the sort field based on leaderboard type
      const config = leaderboardConfigs[leaderboardType];
      const sortField = config.valueKey;

      const params = new URLSearchParams({
        sortBy: sortField,
        order: sortOrder,
        ...(department !== 'ALL' && { department }),
        ...(section !== 'All' && { section }),
        ...(year !== 'All' && { year }),
        leaderboardType, // Send the leaderboard type to the backend
        includeUserData: 'true', // Explicitly request data from users collection
        includePlatformDetails: 'true', // Still include platform details
        fields: 'contestsParticipated,rating,problemsSolved,score,totalScore', // Fields we need
        debug: 'true' // Request debugging info from the backend
      });

      
      const res = await axios.get(`${apiUrl}/leaderboard?${params}`, {
        headers: { 'x-auth-token': token }
      });
      
      // Process the data to handle both users and profiles collections
      const processedData = res.data.map(user => {
        // Calculate totals for all platforms
        let totalContests = 0;
        let highestRating = 0;
        let totalRating = 0; // Add a total rating counter
        
        // IMPORTANT: Recalculate the total problems solved from individual platform values
        // to ensure consistency between total and individual platform displays
        let totalProblemsSolved = 0;
        
        // Process platform data from both collections
        const allPlatforms = leaderboardConfigs.problems.platforms;
        
        // First, check the user.platforms (from users collection) for data
        if (user.platforms) {
          allPlatforms.forEach(platform => {
            if (!user.platforms[platform]) return;
            
            // Extract problems solved from the users collection
            const platformData = user.platforms[platform];
            const problemsValue = platformData.problemsSolved || platformData.totalSolved || 0;
            totalProblemsSolved += parseInt(problemsValue) || 0;
            
            // Extract contest count and rating
            let contestsValue = platformData.contestsParticipated || platformData.contests || 0;
            let ratingValue = platformData.rating || platformData.maxRating || 0;
            
            // Add to totals
            totalContests += parseInt(contestsValue) || 0;
            if (parseInt(ratingValue) > 0) {
              totalRating += parseInt(ratingValue) || 0; // Sum up all platform ratings
              highestRating = Math.max(highestRating, parseInt(ratingValue) || 0);
            }
          });
        }
        
        // Also check platformScores (from profiles collection) for platforms not already counted
        if (user.platformScores) {
          allPlatforms.forEach(platform => {
            // Only use profile data if we don't have user data for this platform
            if (!user.platforms?.[platform] && user.platformScores[platform]) {
              const platformData = user.platformScores[platform];
              
              // Add problems solved
              const problemsValue = platformData.problemsSolved || 0;
              totalProblemsSolved += parseInt(problemsValue) || 0;
              
              // Add contests and rating if needed
              const contestsValue = platformData.contestsParticipated || 0;
              totalContests += parseInt(contestsValue) || 0;
              
              const ratingValue = platformData.rating || 0;
              if (parseInt(ratingValue) > 0) {
                totalRating += parseInt(ratingValue) || 0; // Sum up ratings from profiles too
                highestRating = Math.max(highestRating, parseInt(ratingValue) || 0);
              }
            }
          });
        }
        
        // For debugging, compare our calculated values with the backend values
        
        return {
          ...user,
          problemsSolved: totalProblemsSolved, // Override with our calculated value
          totalContestsParticipated: totalContests,
          highestRating: highestRating,
          totalRating: totalRating // Add the total rating to the user object
        };
      });
      
      // Ensure the data is sorted correctly in the frontend
      const sortedData = [...processedData].sort((a, b) => {
        let valueA, valueB;
        
        // Get the correct values based on leaderboard type
        if (leaderboardType === 'score') {
          valueA = a.totalScore || 0;
          valueB = b.totalScore || 0;
        } else if (leaderboardType === 'problems') {
          valueA = a.problemsSolved || 0;
          valueB = b.problemsSolved || 0;
        } else if (leaderboardType === 'contests') {
          valueA = a.totalContestsParticipated || 0;
          valueB = b.totalContestsParticipated || 0;
        } else if (leaderboardType === 'rating') {
          // Use total rating for sorting in the rating leaderboard
          valueA = a.totalRating || 0;
          valueB = b.totalRating || 0;
        } else {
          valueA = a[sortBy] || 0;
          valueB = b[sortBy] || 0;
        }
        
        // Sort in the requested order
        return sortOrder === 'desc' ? (valueB - valueA) : (valueA - valueB);
      });
      
      const usersWithRanks = sortedData.map((user, index) => ({
        ...user,
        overallRank: index + 1
      }));

      // Calculate department-specific ranks
      const departmentRanks = {};
      departments.forEach(dept => {
        if (dept !== 'ALL') {
          const deptUsers = usersWithRanks.filter(u => u.department === dept);
          deptUsers.forEach((user, index) => {
            if (!departmentRanks[user._id]) departmentRanks[user._id] = {};
            departmentRanks[user._id][dept] = index + 1;
          });
        }
      });

      // Add department ranks to users
      const usersWithAllRanks = usersWithRanks.map(user => ({
        ...user,
        departmentRank: departmentRanks[user._id]?.[user.department] || '-',
      }));

      setUsers(usersWithAllRanks);
      setFilteredUsers(usersWithAllRanks);
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to fetch leaderboard';
      setError(message);
      toast.error(message);
      setUsers([]);
      setFilteredUsers([]);
    } finally {
      setLoading(false);
    }
  };

  // Update the applyFilters function to handle department, section, and year filters
  const applyFilters = () => {
    let filtered = [...users];

    // If search term exists, filter by name first
    if (searchTerm.trim() !== '') {
      filtered = filtered.filter(user => 
        user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.rollNumber?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply department, section, and year filters
    if (department !== 'ALL') {
      filtered = filtered.filter(user => user.department === department);
    }
    
    if (section !== 'All') {
      filtered = filtered.filter(user => user.section === section);
    }
    
    if (year !== 'ALL') {
      filtered = filtered.filter(user => user.graduatingYear === parseInt(year));
    }

    // Get the correct sort field based on leaderboard type
    let actualSortField = sortBy;
    // Make sure we're sorting by the correct field for the current leaderboard type
    if (leaderboardType === 'score') {
      actualSortField = 'totalScore';
    } else if (leaderboardType === 'problems') {
      actualSortField = 'problemsSolved';
    } else if (leaderboardType === 'contests') {
      actualSortField = 'totalContestsParticipated';
    } else if (leaderboardType === 'rating') {
      actualSortField = 'totalRating';
    }
    
    // Only use sortBy for column clicks like names, dept, etc.
    if (['name', 'department', 'section', 'rollNumber', 'graduatingYear'].includes(sortBy)) {
      actualSortField = sortBy;
    }

    filtered.sort((a, b) => {
      let valueA, valueB;
      
      // Handle text fields with string comparison
      if (['name', 'department', 'section', 'rollNumber'].includes(actualSortField)) {
        valueA = (a[actualSortField] || '').toString().toLowerCase();
        valueB = (b[actualSortField] || '').toString().toLowerCase();
        
        return sortOrder === 'asc' 
          ? valueA.localeCompare(valueB)
          : valueB.localeCompare(valueA);
      } else {
        // Numeric comparison for all other fields
        valueA = a[actualSortField] || 0;
        valueB = b[actualSortField] || 0;
  
        return sortOrder === 'desc' ? (valueB - valueA) : (valueA - valueB);
      }
    });

    setFilteredUsers(filtered);
  };

  // Add effect to call applyFilters whenever filters change
  useEffect(() => {
    if (users.length > 0) {
      applyFilters();
    }
  }, [searchTerm, department, section, year, sortBy, sortOrder, users]);

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    switch (name) {
      case 'department':
        setDepartment(value);
        break;
      case 'section':
        setSection(value);
        break;
      case 'year':
        setYear(value);
        break;
      case 'sortBy':
        setSortBy(value);
        break;
      case 'sortOrder':
        setSortOrder(value);
        break;
      default:
        break;
    }
  };

  const handleSort = (field) => {
    // Special case for the "Year" column - we need to map to the actual field name
    const actualField = field === 'year' ? 'graduatingYear' : field;
    
    if (sortBy === actualField) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(actualField);
      // Default to descending for score/problems/etc, but ascending for names and other text fields
      if (['name', 'department', 'section', 'rollNumber'].includes(actualField)) {
        setSortOrder('asc');
      } else {
        setSortOrder('desc');
      }
    }
  };

  const SortIcon = ({ field }) => {
    // Special case for the "Year" column - we need to map to the actual field name
    const actualField = field === 'year' ? 'graduatingYear' : field;
    
    if (sortBy !== actualField) return null;
    return sortOrder === 'asc' ? <ArrowUpward fontSize="small" /> : <ArrowDownward fontSize="small" />;
  };

  const handleTabChange = (event, newValue) => {
    setLeaderboardType(newValue);
    
    // Update sortBy based on the leaderboard type
    if (newValue === 'score') {
      setSortBy('totalScore');
    } else if (newValue === 'problems') {
      setSortBy('problemsSolved');
    }
  };

  const StatsCard = ({ title, value, icon: Icon, color }) => (
    <Card sx={{
      bgcolor: darkMode ? '#1a1a1a' : '#ffffff',
      p: 2,
      borderRadius: 3,
      border: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
      display: 'flex',
      alignItems: 'center',
      gap: 2,
      boxShadow: darkMode ? 'none' : '0 2px 8px rgba(0,0,0,0.08)'
    }}>
      <Box sx={{
        width: 48,
        height: 48,
        borderRadius: 2,
        bgcolor: `${color}22`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <Icon sx={{ color: color }} />
      </Box>
      <Box>
        <Typography variant="body2" sx={{ color: darkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)' }}>
          {title}
        </Typography>
        <Typography variant="h6" sx={{ color: darkMode ? 'white' : 'black', fontWeight: 600 }}>
          {value}
        </Typography>
      </Box>
    </Card>
  );

  // Update the getPlatformDataValue helper function to check data sources correctly
  const getPlatformDataValue = (user, platform, key) => {
    if (!user) return 0;
    
    // First check in user.platforms (from users collection - platformData in backend)
    if (user.platforms && user.platforms[platform]) {
      const platformData = user.platforms[platform];
      
      // Check for direct property match
      if (platformData[key] !== undefined && platformData[key] !== null) {
        return parseInt(platformData[key]) || 0;
      }
      
      // Special case for totalSolved in LeetCode -> problemsSolved
      if (key === 'problemsSolved' && platformData.totalSolved !== undefined) {
        return parseInt(platformData.totalSolved) || 0;
      }
      
      // Special case for contests in various platforms
      if (key === 'contestsParticipated') {
        // Try various property names
        const contestsValue = 
          platformData.contestsParticipated || 
          platformData.contests || 
          platformData.attendedContestsCount || 
          0;
        return parseInt(contestsValue) || 0;
      }
      
      // Special case for ratings
      if (key === 'rating') {
        // Try various property names
        const ratingValue = 
          platformData.rating || 
          platformData.contestRating || 
          platformData.currentRating || 
          platformData.maxRating || 
          platformData.ratingHistory?.[(platformData.ratingHistory?.length || 0) - 1]?.rating || // Get latest rating from history if exists
          0;
          
        return parseInt(ratingValue) || 0;
      }
    }
    
    // Then check in platformScores (from profiles collection) as fallback
    if (user.platformScores && user.platformScores[platform]) {
      const platformData = user.platformScores[platform];
      
      // Check for direct property match
      if (platformData[key] !== undefined && platformData[key] !== null) {
        return parseInt(platformData[key]) || 0;
      }
      
      // Special handling for rating in profiles
      if (key === 'rating' && platformData.rating !== undefined) {
        const ratingValue = platformData.rating;
        return parseInt(ratingValue) || 0;
      }
      
      // Check if the key is in details
      if (platformData.details && platformData.details[key] !== undefined) {
        const detailValue = platformData.details[key];
        return parseInt(detailValue) || 0;
      }
    }
    
    return 0;
  };

  const TopThreeCard = ({ user, rank, delay, leaderboardType }) => {
    const [profileImage, setProfileImage] = useState('');
    
    useEffect(() => {
      // Set profile image from user data or default
      setProfileImage(getProfileImageUrl(user.profilePicture));
    }, [user]);

    const colors = ['#FF8C00', '#4CAF50', '#2196F3']; // Orange, Green, Blue
    const icons = [WorkspacePremium, EmojiEvents, LocalFireDepartment];
    const Icon = icons[rank - 1];
    const config = leaderboardConfigs[leaderboardType];
    
    // Get the value and label based on leaderboard type
    const getValue = () => {
      if (leaderboardType === 'score') {
        return user.totalScore || 0;
      } else if (leaderboardType === 'problems') {
        return user.problemsSolved || 0;
      } else if (leaderboardType === 'contests') {
        return user.totalContestsParticipated || 0;
      } else if (leaderboardType === 'rating') {
        return user.totalRating || 0;
      }
      
      return 0;
    };
    
    // Get platform-specific values based on leaderboard type
    const getPlatformValues = () => {
      return config.platforms
        .map(platform => {
          let value = 0;
          
          if (leaderboardType === 'problems') {
            value = getPlatformDataValue(user, platform, 'problemsSolved');
          } else if (leaderboardType === 'contests') {
            value = getPlatformDataValue(user, platform, 'contestsParticipated');
          } else if (leaderboardType === 'rating') {
            value = getPlatformDataValue(user, platform, 'rating');
          } else {
            // For score leaderboard
            value = getPlatformDataValue(user, platform, 'score');
          }
          
          return {
            platform,
            value
          };
        })
        .filter(item => item.value > 0);
    };
    
    const platformValues = getPlatformValues();
    
    return (
      <Zoom in={animateTop3} style={{ transitionDelay: delay }}>
        <Card
          sx={{
            p: { xs: 2, sm: 3 },
            pt: { xs: 3, sm: 4 },
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            background: darkMode 
              ? `linear-gradient(135deg, ${colors[rank - 1]}22 0%, #1a1a1a 100%)`
              : `linear-gradient(135deg, ${colors[rank - 1]}22 0%, #ffffff 100%)`,
            border: darkMode 
              ? `3px solid ${colors[rank - 1]}70` 
              : `3px solid ${colors[rank - 1]}`,
            borderRadius: '24px',
            position: 'relative',
            overflow: 'visible',
            boxShadow: `0 8px 32px ${colors[rank - 1]}22`,
            transform: rank === 1 ? { sm: 'scale(1.05)' } : 'none',
            transition: 'all 0.3s ease',
            '&:hover': {
              transform: { sm: 'translateY(-8px)' },
              boxShadow: `0 12px 40px ${colors[rank - 1]}33`,
            },
            mt: 6,
            height: { xs: 430, sm: 460 }
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              top: -25,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 60,
              height: 60,
              borderRadius: '50%',
              bgcolor: colors[rank - 1],
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 4px 20px ${colors[rank - 1]}66`,
              zIndex: 2,
              border: `3px solid ${darkMode ? '#1a1a1a' : '#ffffff'}`,
            }}
          >
            <Icon sx={{ fontSize: 34, color: darkMode ? '#1a1a1a' : '#ffffff' }} />
          </Box>
          <Box sx={{ height: 35, width: '100%' }} />
          <Avatar
            alt={user.name}
            src={profileImage}
            sx={{
              width: { xs: 60, sm: 70, md: 90 },
              height: { xs: 60, sm: 70, md: 90 },
              border: `4px solid ${['#FFD700', '#C0C0C0', '#CD7F32'][rank-1]}`,
              boxShadow: `0 2px 10px ${['#FFD700', '#C0C0C0', '#CD7F32'][rank-1]}50`,
              mb: 2,
              mt: 1,
              position: 'relative',
              zIndex: 1,
            }}
          />
          <Typography variant="h6" sx={{ 
            fontWeight: 600, 
            mb: 1, 
            textAlign: 'center',
            color: darkMode ? 'white' : 'rgba(0,0,0,0.87)',
            width: '100%',
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            lineHeight: 1.3,
            height: '2.6em',
            px: 1,
          }}>
            {user.name}
          </Typography>
          <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
            <Chip
              label={user.department}
              size="small"
              sx={{
                bgcolor: `${colors[rank - 1]}22`,
                color: colors[rank - 1],
                fontWeight: 500,
              }}
            />
            <Chip
              label={user.section}
              size="small"
              sx={{
                bgcolor: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.07)',
                color: darkMode ? 'white' : 'rgba(0,0,0,0.7)',
              }}
            />
          </Stack>
          <Box sx={{ 
            display: 'flex', 
            gap: 2, 
            mb: 2,
            flexWrap: 'wrap',
            justifyContent: 'center',
            maxHeight: 70,
            overflow: 'auto',
            width: '100%',
            px: 1
          }}>
            {platformValues.length > 0 ? (
              platformValues.map(({ platform, value }) => (
                <Tooltip key={platform} title={`${platforms[platform]}: ${value}`}>
                  <Box sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    bgcolor: `${platformColors[platform]}22`,
                    color: platformColors[platform],
                    px: 1,
                    py: 0.5,
                    borderRadius: 1,
                    fontSize: '0.75rem'
                  }}>
                    <Box
                      sx={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        bgcolor: platformColors[platform],
                      }}
                    />
                    {value}
                  </Box>
                </Tooltip>
              ))
            ) : (
              <Typography variant="caption" sx={{ opacity: 0.7, fontStyle: 'italic' }}>
                No platform data available
              </Typography>
            )}
          </Box>
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <Typography variant="h4" sx={{ fontWeight: 700, color: colors[rank - 1] }}>
              {getValue()}
            </Typography>
            <Typography variant="body2" sx={{ 
              color: darkMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)', 
              mt: 1 
            }}>
              {config.label}
            </Typography>
          </Box>
        </Card>
      </Zoom>
    );
  };

  // Update the TableHead to show only relevant platforms
  const renderTableHead = () => {
    const config = leaderboardConfigs[leaderboardType];
    
    return (
      <TableHead>
        <TableRow sx={{ 
          bgcolor: darkMode ? 'rgba(0, 136, 204, 0.35)' : '#ffffff',
          borderRadius: 2,
          '& .MuiTableCell-root': { 
            fontWeight: 700,
            whiteSpace: 'nowrap',
            color: darkMode ? '#ffffff' : '#000000',
            py: 2,
            borderBottom: darkMode ? '1px solid rgba(0, 136, 204, 0.3)' : '1px solid rgba(0, 0, 0, 0.1)'
          }
        }}>
          <TableCell>Rank</TableCell>
          <TableCell>
            <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                 onClick={() => handleSort('name')}>
              Name <SortIcon field="name" />
            </Box>
          </TableCell>
          <TableCell>
            <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer', color: darkMode ? 'white' : 'black'}}
                 onClick={() => handleSort('rollNumber')}>
              Roll No <SortIcon field="rollNumber" />
            </Box>
          </TableCell>
          <TableCell>
            <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                 onClick={() => handleSort('department')}>
              Dept <SortIcon field="department" />
            </Box>
          </TableCell>
          <TableCell>
            <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                 onClick={() => handleSort('section')}>
              Sec <SortIcon field="section" />
            </Box>
          </TableCell>
          <TableCell>
            <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                 onClick={() => handleSort('year')}>
              Year <SortIcon field="year" />
            </Box>
          </TableCell>
          <TableCell>
            <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                 onClick={() => handleSort(config.valueKey)}>
              {config.label} <SortIcon field={config.valueKey} />
            </Box>
          </TableCell>
          
          {/* Platform headers */}
          {config.platforms.map((platform) => (
            <TableCell key={platform}>
              <Tooltip title={platforms[platform]}>
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 0.5, 
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '1rem',
                  color: `${platformColors[platform]} !important`,
                }}>
                  <span style={{
                    color: platformColors[platform],
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontWeight: 'bold',
                    textShadow: darkMode ? 'none' : '0 0 2px rgba(0,0,0,0.2)'
                  }}>
                    {platforms[platform]}
                  </span>
                </Box>
              </Tooltip>
            </TableCell>
          ))}
          
          <TableCell>Department Rank</TableCell>
        </TableRow>
      </TableHead>
    );
  };

  const LeaderboardRow = ({ user, index }) => {
    // Add a state to track profile image loading
    const [profileImage, setProfileImage] = useState('');
    
    useEffect(() => {
      // Set profile image from user data or default
      setProfileImage(getProfileImageUrl(user.profilePicture));
    }, [user, index]);
    
    const config = leaderboardConfigs[leaderboardType];
    
    // Get the value for the current leaderboard type
    const getLeaderboardCellValue = () => {
      if (leaderboardType === 'score') {
        return user.totalScore || 0;
      } else if (leaderboardType === 'problems') {
        return user.problemsSolved || 0;
      }
      return 0;
    };
    
    // Get the platform-specific value for a given platform
    const getPlatformValue = (platform) => {
      // Access platform data directly from platformScores
      if (user.platformScores && user.platformScores[platform]) {
        if (leaderboardType === 'problems') {
          return user.platformScores[platform].problemsSolved || 0;
        }
        if (leaderboardType === 'score') {
          return user.platformScores[platform].score || 0;
        }
      }
      return 0;
    };
    
    return (
      <TableRow
        hover
        onClick={() => handleUserClick(user.email)}
        sx={{
          '&:last-child td, &:last-child th': { border: 0 },
          bgcolor: darkMode 
            ? (index % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'transparent')
            : '#ffffff',
          cursor: 'pointer',
          transition: 'all 0.2s',
          '&:hover': {
            bgcolor: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'
          },
          ...(index < 3 && {
            bgcolor: darkMode ? 'rgba(0, 136, 204, 0.1)' : 'rgba(0, 136, 204, 0.05)',
          }),
        }}
      >
        <TableCell 
          align="center" 
          sx={{ 
            p: 1, 
            width: '60px',
            borderBottom: `1px solid ${darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}` 
          }}
        >
          <Box 
            sx={{ 
              width: 32, 
              height: 32, 
              borderRadius: '50%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              bgcolor: index < 3 ? ['#FFD700', '#C0C0C0', '#CD7F32'][index] : 'transparent',
              color: index < 3 ? '#000' : darkMode ? 'white' : 'rgba(0,0,0,0.8)',
              fontWeight: 'bold'
            }}
          >
            {index + 1}
          </Box>
        </TableCell>
        
        <TableCell sx={{ 
          borderBottom: `1px solid ${darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}` 
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar
              alt={user.name || 'User'}
              src={profileImage}
              sx={{ 
                width: 40, 
                height: 40,
                border: `2px solid ${darkMode ? 'rgba(0,136,204,0.5)' : 'rgba(0,136,204,0.3)'}`,
              }}
            />
            <Box>
              <Typography variant="body1" fontWeight="medium">
                {user.name}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {user.department} - {getStudentYear(user.graduatingYear)}
              </Typography>
            </Box>
          </Box>
        </TableCell>
        
        <TableCell>
          <Typography variant="body2">
            {user.rollNumber ? user.rollNumber.toUpperCase() : '-'}
          </Typography>
        </TableCell>
        <TableCell>
          <Typography variant="body2">{user.department || '-'}</Typography>
        </TableCell>
        <TableCell>
          <Typography variant="body2">{user.section || '-'}</Typography>
        </TableCell>
        <TableCell>
          <Typography variant="body2">{user.graduatingYear}</Typography>
        </TableCell>
        <TableCell>
          <Typography variant="body2" sx={{ color: '#0088cc', fontWeight: 600 }}>
            {getLeaderboardCellValue()}
          </Typography>
        </TableCell>
        
        {/* Platform-specific cells */}
        {config.platforms.map((platform) => (
          <TableCell key={platform}>
            <Typography 
              variant="body2" 
              sx={{ 
                color: platformColors[platform],
                opacity: getPlatformValue(platform) > 0 ? 1 : 0.4,
                fontWeight: getPlatformValue(platform) > 0 ? 600 : 400
              }}
            >
              {getPlatformValue(platform)}
            </Typography>
          </TableCell>
        ))}
        
        <TableCell>
          <Typography variant="body2">{user.departmentRank}</Typography>
        </TableCell>
      </TableRow>
    );
  };

  const handleUserClick = (email) => {
    if (!email) return;
    const username = email.split('@')[0];
    navigate(`/user-view/${username}`);
  };

  const handleDepartmentClick = (event) => {
    setAnchorElDepartment(event.currentTarget);
  };

  const handleDepartmentClose = () => {
    setAnchorElDepartment(null);
  };

  const handleDepartmentSelect = (dept) => {
    handleFilterChange({ target: { name: 'department', value: dept } });
    handleDepartmentClose();
  };

  const handleRowsPerPageChange = (event) => {
    setRowsPerPage(event.target.value);
    setPage(1);
  };

  const PaginationControls = ({ page, totalPages, rowsPerPage, onPageChange, onRowsPerPageChange }) => (
    <Box sx={{
      mt: 3,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 2,
      bgcolor: darkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
      borderRadius: '8px',
      p: 2
    }}>
      {/* Left side - Entries per page */}
      <Box sx={{ 
        display: 'flex',
        alignItems: 'center',
        gap: 1 
      }}>
        <Select
          value={rowsPerPage}
          onChange={(e) => onRowsPerPageChange(e.target.value)}
          size="small"
          sx={{
            minWidth: 65,
            height: 32,
            color: darkMode ? 'white' : 'black',
            '.MuiOutlinedInput-notchedOutline': { border: 'none' },
            bgcolor: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
            '&:hover': { bgcolor: darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' },
            '& .MuiSelect-icon': { color: darkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.54)' }
          }}
        >
          {[5, 10, 25, 50, 100].map(value => (
            <MenuItem key={value} value={value}>{value}</MenuItem>
          ))}
        </Select>
        <Typography variant="body2" sx={{ color: darkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)' }}>
          per page
        </Typography>
      </Box>

      {/* Center - Page numbers */}
      <Stack direction="row" spacing={0.5}>
        {[...Array(Math.min(5, totalPages))].map((_, idx) => {
          const pageNum = idx + 1;
          return (
            <Button
              key={idx}
              onClick={() => onPageChange(pageNum)}
              variant={page === pageNum ? 'contained' : 'text'}
              sx={{
                minWidth: 32,
                height: 32,
                p: 0,
                bgcolor: page === pageNum ? '#0088cc !important' : 'transparent',
                color: page === pageNum 
                  ? 'white' 
                  : darkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)',
                '&:hover': {
                  bgcolor: page === pageNum 
                    ? '#0088cc' 
                    : darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'
                }
              }}
            >
              {pageNum}
            </Button>
          );
        })}
      </Stack>

      {/* Right side - Current range display */}
      <Typography variant="body2" sx={{ color: darkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)' }}>
        {`${(page - 1) * rowsPerPage + 1}-${Math.min(page * rowsPerPage, totalPages * rowsPerPage)}`}
      </Typography>
    </Box>
  );

  // Add a proper leaderboard type change handler
  const handleLeaderboardTypeChange = (type) => {
    setLeaderboardType(type);
    
    // Update sortBy based on the new leaderboard type
    if (type === 'score') {
      setSortBy('totalScore');
    } else if (type === 'problems') {
      setSortBy('problemsSolved');
    } else if (type === 'contests') {
      setSortBy('totalContestsParticipated');
    } else if (type === 'rating') {
      setSortBy('totalRating');
    }
    
    setPage(1); // Reset to first page when changing leaderboard type
  };

  // Get the title for the current leaderboard type
  const getLeaderboardTitle = () => {
    return leaderboardConfigs[leaderboardType].title;
  };

  // Update getStatsCardInfo to use correct values
  const getStatsCardInfo = () => {
    const baseStats = [
      {
        title: "Total Users",
        value: users.length,
        icon: Group,
        color: "#0088cc"
      }
    ];

    // Add leaderboard type specific stats
    if (leaderboardType === 'score') {
      return [
        ...baseStats,
        {
          title: "Active Platforms",
          value: Object.keys(platforms).length,
          icon: Public,
          color: "#00bfff"
        },
        {
          title: "Total Score",
          value: users.reduce((sum, user) => sum + (user.totalScore || 0), 0).toLocaleString(),
          icon: EmojiEvents,
          color: "#ff9800"
        }
      ];
    } else if (leaderboardType === 'problems') {
      return [
        ...baseStats,
        {
          title: "Platforms Tracked",
          value: leaderboardConfigs.problems.platforms.length,
          icon: Code,
          color: "#00bfff"
        },
        {
          title: "Total Problems Solved",
          value: users.reduce((sum, user) => sum + (user.problemsSolved || 0), 0).toLocaleString(),
          icon: Code,
          color: "#ff9800"
        }
      ];
    }

    return baseStats;
  };

  // Update the ProblemsSolvedSummary component to work for any user
  const ProblemsSolvedSummary = ({ users, leaderboardConfig }) => {
    // Only show for problems leaderboard type
    if (!users.length || leaderboardConfig.valueKey !== 'problemsSolved') {
      return null;
    }

    // Get the user (current user or top user)
    // If we wanted to show for the logged-in user, we'd need to filter the users array
    const topUser = users[0]; // For now, just use the top user
    
    // Get all platform values for the user
    const platformValues = leaderboardConfig.platforms
      .map(platform => {
        // We use this function to ensure consistent access to platform data
        const value = getPlatformDataValue(topUser, platform, 'problemsSolved');
        return {
          platform,
          value: value,
          color: platformColors[platform]
        };
      })
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value); // Show highest values first

    // Calculate the total
    const total = platformValues.reduce((sum, item) => sum + item.value, 0);
    
    // Make sure our total matches the recalculated problemsSolved value
    if (total !== topUser.problemsSolved) {
      console.warn(`Platform values sum (${total}) doesn't match problemsSolved (${topUser.problemsSolved})`);
    }
    
    return (
      <Card sx={{
        bgcolor: darkMode ? '#1a1a1a' : '#ffffff',
        p: 2,
        borderRadius: 3,
        border: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
        mb: 3,
        boxShadow: darkMode ? 'none' : '0 2px 8px rgba(0,0,0,0.08)'
      }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ color: darkMode ? 'white' : 'black', fontWeight: 600 }}>
            Problems Solved
          </Typography>
          <Typography variant="h4" sx={{ color: '#0088cc', fontWeight: 700 }}>
            {topUser.problemsSolved}
          </Typography>
        </Box>
        
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 1
        }}>
          {platformValues.map(({ platform, value, color }) => (
            <Box key={platform} sx={{ 
              display: 'flex', 
              alignItems: 'center',
              bgcolor: `${color}22`,
              py: 0.5,
              px: 1.5,
              borderRadius: 2,
              gap: 1
            }}>
              <Typography variant="body2" sx={{ color: color, fontWeight: 600 }}>
                {platforms[platform]}
              </Typography>
              <Typography variant="h6" sx={{ color: darkMode ? 'white' : 'black', fontWeight: 700 }}>
                {value}
              </Typography>
            </Box>
          ))}
        </Box>
      </Card>
    );
  };

  // Add effect to ensure sortBy is synchronized with leaderboardType
  useEffect(() => {
    // Update sortBy if it doesn't match the current leaderboard type
    const config = leaderboardConfigs[leaderboardType];
    if (config && config.valueKey && sortBy !== config.valueKey) {
      if (leaderboardType === 'score') {
        setSortBy('totalScore');
      } else if (leaderboardType === 'problems') {
        setSortBy('problemsSolved');
      } else if (leaderboardType === 'contests') {
        setSortBy('totalContestsParticipated');
      } else if (leaderboardType === 'rating') {
        setSortBy('totalRating');
      }
    }
  }, [leaderboardType]);

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
        mt: { xs: 2, sm: 4 }, 
        mb: 4,
        px: { xs: 2, sm: 3 },
        maxWidth: '100vw',
        overflowX: 'hidden'
      }}
    >
      {/* Header Section */}
      <Box sx={{ 
        textAlign: 'center',
        position: 'relative',
        mb: { xs: 3, sm: 4 },
        maxWidth: '1200px',
        mx: 'auto'
      }}>
        
        
        <Typography 
          variant="h3" 
          component="h1" 
          sx={{ 
            fontWeight: 700,
            background: 'linear-gradient(45deg, #0088cc 30%, #00bfff 90%)',
            backgroundClip: 'text',
            textFillColor: 'transparent',
            mb: 1,
            fontSize: { xs: '2rem', sm: '2.5rem' }
          }}
        >
          Leaderboard
        </Typography>
        <Typography 
          variant="h6" 
          sx={{ 
            color: darkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)', 
            mb: 1,
            fontSize: { xs: '0.9rem', sm: '1rem' }
          }}
        >
          MLRIT's Top Competitive Programmers
        </Typography>
        <Typography 
          variant="h5" 
          sx={{ 
            color: darkMode ? 'white' : 'black', 
            mb: 3,
            fontSize: { xs: '1.1rem', sm: '1.3rem' },
            fontWeight: 600
          }}
        >
          {getLeaderboardTitle()}
        </Typography>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {getStatsCardInfo().map((stat, index) => (
          <Grid item xs={6} sm={4} key={index}>
            <StatsCard
              title={stat.title}
              value={stat.value}
              icon={stat.icon}
              color={stat.color}
            />
          </Grid>
        ))}
      </Grid>

      {/* Problems Solved Summary */}
      <ProblemsSolvedSummary 
        users={users} 
        leaderboardConfig={leaderboardConfigs[leaderboardType]} 
      />

      {/* Top 3 Section - Below stats cards */}
      {users.length > 0 && users.slice(0, 3).length === 3 && !searchTerm && (
        <Box sx={{ 
          mb: { xs: 3, sm: 4 },
          maxWidth: '1200px',
          mx: 'auto'
        }}>
          <Grid container spacing={2} justifyContent="center">
            <Grid item xs={12} sm={4} md={3} order={{ xs: 2, sm: 1 }}>
              <TopThreeCard user={users[1]} rank={2} delay="200ms" leaderboardType={leaderboardType} />
            </Grid>
            <Grid item xs={12} sm={4} md={3} order={{ xs: 1, sm: 2 }}>
              <TopThreeCard user={users[0]} rank={1} delay="0ms" leaderboardType={leaderboardType} />
            </Grid>
            <Grid item xs={12} sm={4} md={3} order={{ xs: 3, sm: 3 }}>
              <TopThreeCard user={users[2]} rank={3} delay="400ms" leaderboardType={leaderboardType} />
            </Grid>
          </Grid>
        </Box>
      )}

      {/* Search and Filter Bar */}
      <Box sx={{ 
        display: 'flex', 
        flexDirection: { xs: 'column', sm: 'row' }, 
        justifyContent: 'space-between',
        alignItems: 'center',
        mb: 3,
        gap: 2
      }}>
        <TextField
          placeholder="Search by name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          variant="outlined"
          size="small"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search sx={{ color: darkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)' }} />
              </InputAdornment>
            ),
            sx: {
              color: darkMode ? 'white' : 'black',
              borderRadius: 1,
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: darkMode ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.23)'
              },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: darkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'
              },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                borderColor: '#0088cc'
              },
            },
          }}
        />
      </Box>

      {/* Filters and Sorting UI */}
      <Box sx={{ 
        mt: 2,
        mb: 3,
        px: 2,
        py: 2.5,
        borderRadius: 2,
        bgcolor: darkMode ? 'rgba(18, 18, 18, 0.98)' : '#ffffff',
        border: `1px solid ${darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
        boxShadow: darkMode ? '0 2px 10px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.05)',
        maxWidth: '1200px',
        mx: 'auto'
      }}>
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          mb: 2
        }}>
          <FilterList sx={{ color: '#0088cc', mr: 1 }} />
          <Typography variant="subtitle1" fontWeight={600} sx={{ color: darkMode ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.8)' }}>
            Filters & Sorting
          </Typography>
          
          <Box sx={{ flexGrow: 1 }} />
          
          <Button 
            size="small"
            variant="outlined"
            onClick={() => {
              setDepartment('ALL');
              setSection('All');
              setYear('ALL');
              setSearchTerm('');
              setSortBy(leaderboardConfigs[leaderboardType].valueKey);
              setSortOrder('desc');
            }}
            startIcon={<Refresh />}
            sx={{
              borderColor: '#0088cc',
              color: '#0088cc',
              '&:hover': {
                borderColor: '#006699',
                bgcolor: 'rgba(0,136,204,0.1)'
              },
              textTransform: 'none'
            }}
          >
            Reset Filters
          </Button>
        </Box>
        
        <Grid container spacing={2}>
          {/* Department Filter */}
          <Grid item xs={12} sm={6} md={3}>
            <FormControl 
              fullWidth
              size="small"
              variant="outlined"
            >
              <InputLabel 
                id="department-filter-label"
                sx={{ 
                  color: darkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)'
                }}
              >
                Department
              </InputLabel>
              <Select
                labelId="department-filter-label"
                id="department-filter"
                name="department"
                value={department}
                label="Department"
                onChange={handleFilterChange}
                sx={{
                  color: darkMode ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.8)',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: darkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#0088cc'
                  },
                  '& .MuiSvgIcon-root': {
                    color: darkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.54)'
                  }
                }}
                MenuProps={{
                  PaperProps: {
                    sx: {
                      bgcolor: darkMode ? 'rgba(18, 18, 18, 0.98)' : '#ffffff',
                    }
                  }
                }}
              >
                <MenuItem value="ALL">All Departments</MenuItem>
                {departments.filter(d => d !== 'ALL').map((dept) => (
                  <MenuItem key={dept} value={dept}>{dept}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          {/* Academic Year Filter */}
          <Grid item xs={12} sm={6} md={3}>
            <FormControl 
              fullWidth
              size="small"
              variant="outlined"
            >
              <InputLabel 
                id="year-filter-label"
                sx={{ 
                  color: darkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)'
                }}
              >
                Graduation Year
              </InputLabel>
              <Select
                labelId="year-filter-label"
                id="year-filter"
                name="year"
                value={year}
                label="Graduation Year"
                onChange={handleFilterChange}
                sx={{
                  color: darkMode ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.8)',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: darkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#0088cc'
                  },
                  '& .MuiSvgIcon-root': {
                    color: darkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.54)'
                  }
                }}
                MenuProps={{
                  PaperProps: {
                    sx: {
                      bgcolor: darkMode ? 'rgba(18, 18, 18, 0.98)' : '#ffffff',
                    }
                  }
                }}
              >
                <MenuItem value="ALL">All Years</MenuItem>
                {[2024, 2025, 2026, 2027].map((yr) => (
                  <MenuItem key={yr} value={yr}>{yr}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          {/* Section Filter */}
          <Grid item xs={12} sm={6} md={3}>
            <FormControl 
              fullWidth
              size="small"
              variant="outlined"
            >
              <InputLabel 
                id="section-filter-label"
                sx={{ 
                  color: darkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)'
                }}
              >
                Section
              </InputLabel>
              <Select
                labelId="section-filter-label"
                id="section-filter"
                name="section"
                value={section}
                label="Section"
                onChange={handleFilterChange}
                sx={{
                  color: darkMode ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.8)',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: darkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#0088cc'
                  },
                  '& .MuiSvgIcon-root': {
                    color: darkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.54)'
                  }
                }}
                MenuProps={{
                  PaperProps: {
                    sx: {
                      bgcolor: darkMode ? 'rgba(18, 18, 18, 0.98)' : '#ffffff',
                    }
                  }
                }}
              >
                <MenuItem value="All">All Sections</MenuItem>
                {['A', 'B', 'C', 'D', 'E', 'F', 'G'].map((sect) => (
                  <MenuItem key={sect} value={sect}>Section {sect}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          {/* Sort Order */}
          <Grid item xs={12} sm={6} md={3}>
            <FormControl 
              fullWidth
              size="small"
              variant="outlined"
            >
              <InputLabel 
                id="sort-order-label"
                sx={{ 
                  color: darkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)'
                }}
              >
                Sort Order
              </InputLabel>
              <Select
                labelId="sort-order-label"
                id="sort-order"
                name="sortOrder"
                value={sortOrder}
                label="Sort Order"
                onChange={handleFilterChange}
                sx={{
                  color: darkMode ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.8)',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: darkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#0088cc'
                  },
                  '& .MuiSvgIcon-root': {
                    color: darkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.54)'
                  }
                }}
                MenuProps={{
                  PaperProps: {
                    sx: {
                      bgcolor: darkMode ? 'rgba(18, 18, 18, 0.98)' : '#ffffff',
                    }
                  }
                }}
              >
                <MenuItem value="desc">Highest First</MenuItem>
                <MenuItem value="asc">Lowest First</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
        
        {/* Active Filters Display */}
        {(department !== 'ALL' || section !== 'All' || year !== 'ALL' || searchTerm.trim() !== '') && (
          <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            <Typography variant="body2" sx={{ color: darkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)', mr: 1 }}>
              Active Filters:
            </Typography>
            
            {department !== 'ALL' && (
              <Chip 
                size="small" 
                label={`Department: ${department}`} 
                onDelete={() => setDepartment('ALL')}
                sx={{ bgcolor: darkMode ? 'rgba(0,136,204,0.2)' : '#0088cc20', color: '#0088cc' }}
              />
            )}
            
            {section !== 'All' && (
              <Chip 
                size="small" 
                label={`Section: ${section}`} 
                onDelete={() => setSection('All')}
                sx={{ bgcolor: darkMode ? 'rgba(0,136,204,0.2)' : '#0088cc20', color: '#0088cc' }}
              />
            )}
            
            {year !== 'ALL' && (
              <Chip 
                size="small" 
                label={`Year: ${year}`} 
                onDelete={() => setYear('ALL')}
                sx={{ bgcolor: darkMode ? 'rgba(0,136,204,0.2)' : '#0088cc20', color: '#0088cc' }}
              />
            )}
            
            {searchTerm.trim() !== '' && (
              <Chip 
                size="small" 
                label={`Search: "${searchTerm}"`} 
                onDelete={() => setSearchTerm('')}
                sx={{ bgcolor: darkMode ? 'rgba(0,136,204,0.2)' : '#0088cc20', color: '#0088cc' }}
              />
            )}
          </Box>
        )}
        
        {/* Results count */}
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="body2" sx={{ color: darkMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)' }}>
            Showing {filteredUsers.length} of {users.length} users
          </Typography>
          
          {filteredUsers.length === 0 && users.length > 0 && (
            <Typography variant="body2" sx={{ color: 'warning.main' }}>
              No users match the current filters
            </Typography>
          )}
        </Box>
      </Box>

      {/* Navigation Tabs */}
      <Box sx={{ 
        display: 'flex',
        gap: 2,
        mb: 4,
        flexWrap: 'wrap',
        justifyContent: 'center'
      }}>
        <Button
          variant={leaderboardType === 'score' ? 'contained' : 'outlined'}
          startIcon={<EmojiEvents />}
          onClick={() => handleLeaderboardTypeChange('score')}
          sx={{
            borderColor: darkMode ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.23)',
            color: leaderboardType === 'score' 
              ? 'white' 
              : darkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)',
            borderRadius: 2,
            '&.MuiButton-contained': {
              bgcolor: '#0088cc',
              '&:hover': {
                bgcolor: '#006699',
              },
            },
            '&.MuiButton-outlined': {
              '&:hover': {
                borderColor: '#0088cc',
                bgcolor: 'rgba(0,136,204,0.1)',
              },
            }
          }}
        >
          By Score
        </Button>
        <Button
          variant={leaderboardType === 'problems' ? 'contained' : 'outlined'}
          startIcon={<Code />}
          onClick={() => handleLeaderboardTypeChange('problems')}
          sx={{
            borderColor: darkMode ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.23)',
            color: leaderboardType === 'problems' 
              ? 'white' 
              : darkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)',
            borderRadius: 2,
            '&.MuiButton-contained': {
              bgcolor: '#0088cc',
              '&:hover': {
                bgcolor: '#006699',
              },
            },
            '&.MuiButton-outlined': {
              '&:hover': {
                borderColor: '#0088cc',
                bgcolor: 'rgba(0,136,204,0.1)',
              },
            }
          }}
        >
          By Problems Solved
        </Button>
      </Box>

      {/* Main Leaderboard */}
      <Paper
        elevation={0}
        sx={{
          bgcolor: darkMode ? 'transparent' : '#ffffff',
          borderRadius: 2,
          overflow: 'auto',
          maxWidth: '100%'
        }}
      >
        <TableContainer sx={{ maxWidth: '100%' }}>
          <Table sx={{ 
            width: '100%',
            '& .MuiTableCell-root': { 
              color: darkMode ? '#ffffff' : '#000000',
              borderBottom: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
              padding: '12px 16px',
              fontSize: '0.875rem',
              whiteSpace: 'nowrap'
            }
          }}>
            {renderTableHead()}
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell 
                    colSpan={10 + Object.keys(platforms).length} 
                    align="center"
                  >
                    <Box sx={{ py: 4, color: darkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}>
                      <Typography variant="h6" gutterBottom>
                        No users found
                      </Typography>
                      <Typography variant="body2">
                        Try adjusting your filters
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers
                  .slice((page - 1) * rowsPerPage, page * rowsPerPage)
                  .map((user, index) => (
                    <LeaderboardRow 
                      key={user._id} 
                      user={user} 
                      index={index + ((page - 1) * rowsPerPage)}
                    />
                  ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination and Entries Count */}
        <PaginationControls
          page={page}
          totalPages={Math.ceil(filteredUsers.length / rowsPerPage)}
          rowsPerPage={rowsPerPage}
          onPageChange={setPage}
          onRowsPerPageChange={(value) => {
            setRowsPerPage(value);
            setPage(1);
          }}
        />
      </Paper>

      {/* Admin Exclusion Note */}
      <Box sx={{ px: 3, pt: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
        <Typography variant="h6" gutterBottom>
          {leaderboardType === 'score' ? 'Score Leaderboard' : 'Problems Solved Leaderboard'}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Admin accounts are excluded from rankings
        </Typography>
      </Box>
    </Container>
  );
};

export default Leaderboard;