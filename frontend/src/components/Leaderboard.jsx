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
  Refresh,
  ArrowBack,
  ArrowForward
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

const getStudentYear = (graduatingYear) => {
  if (!graduatingYear) return '-';
  
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth(); // 0-based (0 = January, 6 = July)
  
  // Academic year logic: Academic year runs from July to June
  // If we've crossed July (month >= 6), students advance to next year
  // If we haven't crossed July (month < 6), still in previous academic year
  let yearsToGraduation;
  if (currentMonth >= 6) { // July or later (academic year has progressed)
    yearsToGraduation = graduatingYear - currentYear - 1;
  } else { // Before July (still in previous academic year)
    yearsToGraduation = graduatingYear - currentYear;
  }
  
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
    default:
      return 'Graduated'; // Simplified to only show specified years
  }
};

// Function to convert year of study to graduation year based on current academic year
const getGraduationYearFromStudyYear = (studyYear) => {
  if (!studyYear || studyYear === 'ALL') return null;
  
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth(); // 0-based (0 = January, 6 = July)
  
  let baseYear;
  if (currentMonth >= 6) { // July or later (academic year has progressed)
    baseYear = currentYear + 1;
  } else { // Before July (still in previous academic year)
    baseYear = currentYear;
  }
  
  switch (studyYear) {
    case 'First':
      return baseYear + 3;
    case 'Second':
      return baseYear + 2;
    case 'Third':
      return baseYear + 1;
    case 'Fourth':
      return baseYear;
    case 'Graduated':
      // Return multiple years for graduated students (last 4 years)
      return [baseYear - 1, baseYear - 2, baseYear - 3, baseYear - 4];
    default:
      return null;
  }
};

const leaderboardConfigs = {
  problems: {
    title: 'Problems Solved Leaderboard',
    platforms: ['geeksforgeeks', 'leetcode', 'hackerrank', 'codechef', 'codeforces'],
    valueKey: 'problemsSolved',
    label: 'Problems Solved'
  },
  score: {
    title: 'Score Leaderboard',
    platforms: ['leetcode', 'codechef', 'hackerrank', 'codeforces', 'github', 'geeksforgeeks'],
    valueKey: 'totalScore',
    label: 'Total Score'
  }
};

const Leaderboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [topUsersLoading, setTopUsersLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [topUsers, setTopUsers] = useState([]);
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState('totalScore');
  const [sortOrder, setSortOrder] = useState('desc');
  const [department, setDepartment] = useState('ALL');
  const [year, setYear] = useState('ALL');
  const [section, setSection] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10); // Changed from 25 to 10
  const [leaderboardType, setLeaderboardType] = useState('score');
  const [animateTop3, setAnimateTop3] = useState(false);
  
  // New state for server-side pagination
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 0,
    totalUsers: 0,
    usersPerPage: 10, // Changed from 25 to 10
    hasNextPage: false,
    hasPrevPage: false
  });
  const [stats, setStats] = useState({
    totalUsers: 0,
    departments: [],
    sections: [],
    years: [],
    totalScore: 0,
    totalProblems: 0,
    activePlatforms: 6
  });
  const [currentUserData, setCurrentUserData] = useState(null);
  const [currentUserRank, setCurrentUserRank] = useState(null);
  
  const { token, user: currentAuthUser } = useAuth();
  const { darkMode } = useTheme();

  // Custom scrollbar styles
  const scrollbarStyles = {
    '&::-webkit-scrollbar': {
      width: '8px',
      height: '8px',
    },
    '&::-webkit-scrollbar-track': {
      backgroundColor: darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 136, 204, 0.05)',
      borderRadius: '10px',
    },
    '&::-webkit-scrollbar-thumb': {
      backgroundColor: darkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 136, 204, 0.4)',
      borderRadius: '10px',
      '&:hover': {
        backgroundColor: darkMode ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 136, 204, 0.6)',
      },
    },
  };

  // Debounce search to reduce API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300); // 300ms debounce
    
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset page when filters change
  useEffect(() => {
    if (page !== 1) {
      setPage(1);
    }
  }, [department, section, year, leaderboardType, debouncedSearchTerm, sortBy, sortOrder]);

  // Main data fetching effect
  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    fetchLeaderboard();
  }, [department, section, year, leaderboardType, debouncedSearchTerm, sortBy, sortOrder, page, rowsPerPage, token]);

  // Fetch top users separately for better performance
  useEffect(() => {
    if (token && !debouncedSearchTerm) {
      fetchTopUsers();
    }
  }, [department, section, year, leaderboardType, token]);

  // Fetch stats once on mount
  useEffect(() => {
    if (token) {
      fetchStats();
    }
  }, [token]);

  useEffect(() => {
    // Animate top 3 cards after component mounts
    setAnimateTop3(true);
  }, []);

  const fetchStats = async () => {
    try {
      const res = await axios.get(`${apiUrl}/leaderboard/stats`, {
        headers: { 'x-auth-token': token }
      });
      setStats(res.data);
    } catch (err) {
      console.warn('Failed to fetch stats:', err);
    }
  };

  const fetchTopUsers = async () => {
    try {
      setTopUsersLoading(true);
      
      // Convert study year to graduation year(s) for API call
      const graduationYears = getGraduationYearFromStudyYear(year);
      
      const params = new URLSearchParams({
        leaderboardType,
        limit: '3',
        ...(department !== 'ALL' && { department }),
        ...(section !== 'All' && { section })
      });

      // Add graduation year(s) to params
      if (graduationYears) {
        if (Array.isArray(graduationYears)) {
          // For "Graduated" - add multiple graduation years
          graduationYears.forEach(gradYear => {
            params.append('graduatingYear', gradYear);
          });
        } else {
          // For specific study years - add single graduation year
          params.append('graduatingYear', graduationYears);
        }
      }

      const res = await axios.get(`${apiUrl}/leaderboard/top?${params}`, {
        headers: { 'x-auth-token': token }
      });
      
      setTopUsers(res.data || []);
    } catch (err) {
      console.warn('Failed to fetch top users:', err);
      setTopUsers([]);
    } finally {
      setTopUsersLoading(false);
    }
  };

  const fetchLeaderboard = async () => {
    if (!token) return;
    
    try {
      setError('');
      setLoading(true);

      const config = leaderboardConfigs[leaderboardType];
      const sortField = config.valueKey;

      // Convert study year to graduation year(s) for API call
      const graduationYears = getGraduationYearFromStudyYear(year);
      
      const params = new URLSearchParams({
        sortBy: sortField,
        order: sortOrder,
        page: page.toString(),
        limit: rowsPerPage.toString(),
        leaderboardType,
        ...(department !== 'ALL' && { department }),
        ...(section !== 'All' && { section }),
        ...(debouncedSearchTerm.trim() && { search: debouncedSearchTerm.trim() })
      });

      // Add graduation year(s) to params
      if (graduationYears) {
        if (Array.isArray(graduationYears)) {
          // For "Graduated" - add multiple graduation years
          graduationYears.forEach(gradYear => {
            params.append('graduatingYear', gradYear);
          });
        } else {
          // For specific study years - add single graduation year
          params.append('graduatingYear', graduationYears);
        }
      }

      const res = await axios.get(`${apiUrl}/leaderboard?${params}`, {
        headers: { 'x-auth-token': token }
      });
      
      // Use backend data directly - no client-side processing needed
      setUsers(res.data.users || []);
      setPagination(res.data.pagination || {});
      setCurrentUserData(res.data.currentUserData);
      setCurrentUserRank(res.data.currentUserRank);
      
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to fetch leaderboard';
      setError(message);
      toast.error(message);
      setUsers([]);
      setPagination({});
      setCurrentUserData(null);
      setCurrentUserRank(null);
    } finally {
      setLoading(false);
    }
  };

  // Simplified handlers - no client-side processing
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
      default:
        break;
    }
  };

  const handleSort = (field) => {
    const actualField = field === 'year' ? 'graduatingYear' : field;
    
    if (sortBy === actualField) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(actualField);
      setSortOrder(['name', 'department', 'section', 'rollNumber'].includes(actualField) ? 'asc' : 'desc');
    }
  };

  const SortIcon = ({ field }) => {
    const actualField = field === 'year' ? 'graduatingYear' : field;
    
    if (sortBy !== actualField) return null;
    return sortOrder === 'asc' ? <ArrowUpward fontSize="small" /> : <ArrowDownward fontSize="small" />;
  };

  const handleLeaderboardTypeChange = (type) => {
    setLeaderboardType(type);
    
    // Update sortBy based on the new leaderboard type
    if (type === 'score') {
      setSortBy('totalScore');
    } else if (type === 'problems') {
      setSortBy('problemsSolved');
    }
    
    setPage(1);
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
    
    // Smart scroll to show the leaderboard table without going to the very top
    setTimeout(() => {
      const tableElement = document.querySelector('#leaderboard-table');
      if (tableElement) {
        const rect = tableElement.getBoundingClientRect();
        const currentScrollY = window.pageYOffset || document.documentElement.scrollTop;
        
        // Calculate desired scroll position
        // Offset by 100px to show some context above the table (works for both mobile and desktop)
        const targetScrollY = currentScrollY + rect.top - 100;
        
        // Only scroll if the table is not already visible or if we need to scroll up significantly
        if (rect.top < 0 || rect.top > window.innerHeight * 0.8) {
          window.scrollTo({
            top: Math.max(0, targetScrollY),
            behavior: 'smooth'
          });
        }
      }
    }, 100); // Small delay to ensure the new page data has loaded
  };

  const handleRowsPerPageChange = (newRowsPerPage) => {
    setRowsPerPage(newRowsPerPage);
    setPage(1);
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
          {typeof value === 'number' ? value.toLocaleString() : value}
        </Typography>
      </Box>
    </Card>
  );

  const getPlatformDataValue = (user, platform, key) => {
  if (!user) return 0;
  
  // Check platformScores first (optimized backend response)
  if (user.platformScores && user.platformScores[platform]) {
    const value = user.platformScores[platform][key];
    return parseInt(value) || 0;
  }
  
  return 0;
};

// Helper function to calculate total problems solved from platform scores
const calculateTotalProblemsFromPlatforms = (user, platforms) => {
  if (!user?.platformScores) return 0;
  
  return platforms.reduce((total, platform) => {
    const problems = user.platformScores[platform]?.problemsSolved || 0;
    return total + (parseInt(problems) || 0);
  }, 0);
};

  const TopThreeCard = ({ user, rank, delay, leaderboardType }) => {
    const [profileImage, setProfileImage] = useState('');
    const [isVisible, setIsVisible] = useState(false);
    
    useEffect(() => {
      setProfileImage(getProfileImageUrl(user.profilePicture));
      
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, delay);
      
      return () => clearTimeout(timer);
    }, [user, delay]);

    const colors = ['#FF8C00', '#4CAF50', '#2196F3'];
    const icons = [WorkspacePremium, EmojiEvents, LocalFireDepartment];
    const Icon = icons[rank - 1];
    const config = leaderboardConfigs[leaderboardType];
    
    const getValue = () => {
      if (leaderboardType === 'score') {
        return user.totalScore || 0;
      } else if (leaderboardType === 'problems') {
        // If backend problemsSolved is 0 or not available, calculate from platform scores
        const backendProblems = user.problemsSolved || 0;
        if (backendProblems === 0) {
          return calculateTotalProblemsFromPlatforms(user, config.platforms);
        }
        return backendProblems;
      }
      return 0;
    };
    
    const getPlatformValues = () => {
      return config.platforms
        .map(platform => {
          let value = 0;
          
          if (leaderboardType === 'problems') {
            value = getPlatformDataValue(user, platform, 'problemsSolved');
          } else {
            value = getPlatformDataValue(user, platform, 'score');
          }
          
          return { platform, value };
        })
        .filter(item => item.value > 0);
    };
    
    const platformValues = getPlatformValues();
    const isFirstPlace = rank === 1;
    
    return (
      <Zoom 
        in={isVisible} 
        style={{ transformOrigin: 'center' }}
        timeout={250}
      >
        <Card
          sx={{
            p: { xs: isFirstPlace ? 2 : 1.5, sm: isFirstPlace ? 3 : 2 },
            pt: { xs: isFirstPlace ? 3 : 2, sm: isFirstPlace ? 4 : 3 },
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
            transform: isFirstPlace ? { sm: 'scale(1.05)' } : 'none',
            transition: 'transform 0.3s ease, box-shadow 0.3s ease',
            '&:hover': {
              transform: { sm: isFirstPlace ? 'translateY(-8px) scale(1.05)' : 'translateY(-8px)' },
              boxShadow: `0 12px 40px ${colors[rank - 1]}33`,
            },
            mt: 6,
            height: { 
              xs: isFirstPlace ? 480 : 420, 
              sm: isFirstPlace ? 520 : 450 
            },
            maxWidth: isFirstPlace ? '100%' : '90%',
            mx: 'auto',
            cursor: 'pointer'
          }}
          onClick={() => handleUserClick(user.email)}
        >
          <Box
            sx={{
              position: 'absolute',
              top: -25,
              left: '50%',
              transform: 'translateX(-50%)',
              width: isFirstPlace ? 50 : 40,
              height: isFirstPlace ? 50 : 40,
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
            <Icon sx={{ fontSize: isFirstPlace ? 28 : 22, color: darkMode ? '#1a1a1a' : '#ffffff' }} />
          </Box>
          
          <Box sx={{ height: isFirstPlace ? 35 : 30, width: '100%' }} />
          
          <Box
            sx={{
              width: isFirstPlace ? 80 : 70,
              height: isFirstPlace ? 36 : 32,
              borderRadius: 20,
              bgcolor: colors[rank - 1],
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 4px 10px rgba(0,0,0,0.3)`,
              border: `2px solid ${darkMode ? '#1a1a1a' : '#ffffff'}`,
              zIndex: 3,
              fontWeight: 'bold',
              fontSize: isFirstPlace ? '1rem' : '0.9rem',
              color: '#ffffff',
              mb: isFirstPlace ? 1.5 : 1
            }}
          >
            Rank: {rank}
          </Box>
          
          <Avatar
            alt={user.name}
            src={profileImage}
            sx={{
              width: { 
                xs: isFirstPlace ? 65 : 55, 
                sm: isFirstPlace ? 75 : 65, 
                md: isFirstPlace ? 90 : 75 
              },
              height: { 
                xs: isFirstPlace ? 65 : 55, 
                sm: isFirstPlace ? 75 : 65, 
                md: isFirstPlace ? 90 : 75 
              },
              border: `4px solid ${['#FFD700', '#C0C0C0', '#CD7F32'][rank-1]}`,
              boxShadow: `0 2px 10px ${['#FFD700', '#C0C0C0', '#CD7F32'][rank-1]}50`,
              mb: isFirstPlace ? 2 : 1.5,
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
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            lineHeight: 1.3,
            minHeight: isFirstPlace ? '3.9em' : '3.6em',
            px: 1,
            fontSize: { 
              xs: isFirstPlace ? '0.95rem' : '0.85rem', 
              sm: isFirstPlace ? '1.1rem' : '0.95rem' 
            }
          }}>
            {user.name}
          </Typography>
          
          <Stack direction="row" spacing={1} sx={{ 
            mb: 2, 
            flexWrap: 'wrap', 
            justifyContent: 'center', 
            gap: 0.5,
            px: 1
          }}>
            <Chip
              label={user.department}
              size="small"
              sx={{
                bgcolor: `${colors[rank - 1]}22`,
                color: colors[rank - 1],
                fontWeight: 500,
                m: 0.5,
                fontSize: isFirstPlace ? '0.7rem' : '0.65rem',
                height: isFirstPlace ? 20 : 18
              }}
            />
            <Chip
              label={user.section}
              size="small"
              sx={{
                bgcolor: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.07)',
                color: darkMode ? 'white' : 'rgba(0,0,0,0.7)',
                m: 0.5,
                fontSize: isFirstPlace ? '0.7rem' : '0.65rem',
                height: isFirstPlace ? 20 : 18
              }}
            />
          </Stack>
          
          <Box sx={{ 
            display: 'flex', 
            gap: isFirstPlace ? 2 : 1.5, 
            mb: 2,
            flexWrap: 'wrap',
            justifyContent: 'center',
            maxHeight: isFirstPlace ? 90 : 80,
            overflow: 'auto',
            width: '100%',
            px: 1,
            ...scrollbarStyles
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
                    fontSize: isFirstPlace ? '0.7rem' : '0.65rem'
                  }}>
                    <Box
                      sx={{
                        width: isFirstPlace ? 5 : 4,
                        height: isFirstPlace ? 5 : 4,
                        borderRadius: '50%',
                        bgcolor: platformColors[platform],
                      }}
                    />
                    {value}
                  </Box>
                </Tooltip>
              ))
            ) : (
              <Typography variant="caption" sx={{ 
                opacity: 0.7, 
                fontStyle: 'italic',
                fontSize: isFirstPlace ? '0.7rem' : '0.65rem'
              }}>
                No platform data available
              </Typography>
            )}
          </Box>
          
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <Typography variant="h4" sx={{ 
              fontWeight: 700, 
              color: colors[rank - 1],
              fontSize: { 
                xs: isFirstPlace ? '1.8rem' : '1.5rem', 
                sm: isFirstPlace ? '2.2rem' : '1.8rem' 
              }
            }}>
              {getValue()}
            </Typography>
            <Typography variant="body2" sx={{ 
              color: darkMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)', 
              mt: 1,
              fontSize: isFirstPlace ? '0.75rem' : '0.7rem'
            }}>
              {config.label}
            </Typography>
          </Box>
        </Card>
      </Zoom>
    );
  };

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
            <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
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
        </TableRow>
      </TableHead>
    );
  };

  const LeaderboardRow = ({ user, index }) => {
    const [profileImage, setProfileImage] = useState('');
    
    useEffect(() => {
      setProfileImage(getProfileImageUrl(user.profilePicture));
    }, [user]);
    
    const config = leaderboardConfigs[leaderboardType];
    
    const getLeaderboardCellValue = () => {
      if (leaderboardType === 'score') {
        return user.totalScore || 0;
      } else if (leaderboardType === 'problems') {
        // If backend problemsSolved is 0 or not available, calculate from platform scores
        const backendProblems = user.problemsSolved || 0;
        if (backendProblems === 0) {
          return calculateTotalProblemsFromPlatforms(user, config.platforms);
        }
        return backendProblems;
      }
      return 0;
    };
    
    const getPlatformValue = (platform) => {
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
            {user.rank || index + 1}
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
      </TableRow>
    );
  };

  const handleUserClick = (email) => {
    if (!email) return;
    const username = email.split('@')[0];
    window.open(`/user-view/${username}`, '_blank');
  };

  const PaginationControls = () => (
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
      <Box sx={{ 
        display: 'flex',
        alignItems: 'center',
        gap: 1 
      }}>
        <Select
          value={rowsPerPage}
          onChange={(e) => handleRowsPerPageChange(e.target.value)}
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
          {[10, 25, 50, 100].map(value => (
            <MenuItem key={value} value={value}>{value}</MenuItem>
          ))}
        </Select>
        <Typography variant="body2" sx={{ color: darkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)' }}>
          per page
        </Typography>
      </Box>

      <Stack direction="row" spacing={0.5}>
        <Button
          onClick={() => handlePageChange(Math.max(1, page - 1))}
          disabled={!pagination.hasPrevPage}
          sx={{
            minWidth: 32,
            height: 32,
            p: 0,
            color: darkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)',
            '&:hover': {
              bgcolor: darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'
            },
            '&.Mui-disabled': {
              color: darkMode ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'
            }
          }}
        >
          <ArrowBack fontSize="small" />
        </Button>

        {(() => {
          const pageButtons = [];
          const maxVisiblePages = 5;
          const totalPages = pagination.totalPages;
          
          let startPage = Math.max(1, page - Math.floor(maxVisiblePages / 2));
          let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
          
          if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
          }
          
          for (let i = startPage; i <= endPage; i++) {
            pageButtons.push(
              <Button
                key={i}
                onClick={() => handlePageChange(i)}
                variant={page === i ? 'contained' : 'text'}
                sx={{
                  minWidth: 32,
                  height: 32,
                  p: 0,
                  bgcolor: page === i ? '#0088cc !important' : 'transparent',
                  color: page === i 
                    ? 'white' 
                    : darkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)',
                  '&:hover': {
                    bgcolor: page === i 
                      ? '#0088cc' 
                      : darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'
                  }
                }}
              >
                {i}
              </Button>
            );
          }
          
          return pageButtons;
        })()}
        
        <Button
          onClick={() => handlePageChange(Math.min(pagination.totalPages, page + 1))}
          disabled={!pagination.hasNextPage}
          sx={{
            minWidth: 32,
            height: 32,
            p: 0,
            color: darkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)',
            '&:hover': {
              bgcolor: darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'
            },
            '&.Mui-disabled': {
              color: darkMode ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'
            }
          }}
        >
          <ArrowForward fontSize="small" />
        </Button>
      </Stack>

      <Typography variant="body2" sx={{ color: darkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)' }}>
        {pagination.totalUsers === 0 
          ? 'No results' 
          : `${(page - 1) * rowsPerPage + 1}-${Math.min(page * rowsPerPage, pagination.totalUsers)} of ${pagination.totalUsers}`}
      </Typography>
    </Box>
  );

  const getStatsCardInfo = () => {
    const baseStats = [
      {
        title: "Total Users",
        value: stats.totalUsers,
        icon: Group,
        color: "#0088cc"
      }
    ];

    if (leaderboardType === 'score') {
      return [
        ...baseStats,
        {
          title: "Active Platforms",
          value: stats.activePlatforms,
          icon: Public,
          color: "#00bfff"
        },
        {
          title: "Total Score",
          value: stats.totalScore,
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
          value: stats.totalProblems,
          icon: Code,
          color: "#ff9800"
        }
      ];
    }

    return baseStats;
  };

  const getLeaderboardTitle = () => {
    return leaderboardConfigs[leaderboardType].title;
  };

  if (loading && users.length === 0) {
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
        mb: { xs: 8, sm: 10 },
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

      {/* Top 3 Section */}
      {topUsers.length > 0 && !debouncedSearchTerm && (
        <Box sx={{ 
          mb: { xs: 3, sm: 4 },
          maxWidth: '1200px',
          mx: 'auto'
        }}>
          {topUsersLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Grid container spacing={2} justifyContent="center" alignItems="flex-start">
              {topUsers.length > 1 && (
                <Grid item xs={12} sm={4} md={3} order={{ xs: 2, sm: 1 }} sx={{ mt: { sm: 4 } }}>
                  <TopThreeCard user={topUsers[1]} rank={2} delay={350} leaderboardType={leaderboardType} />
                </Grid>
              )}
              {topUsers.length > 0 && (
                <Grid item xs={12} sm={4} md={3} order={{ xs: 1, sm: 2 }} sx={{ mt: { sm: -3 } }}>
                  <TopThreeCard user={topUsers[0]} rank={1} delay={30} leaderboardType={leaderboardType} />
                </Grid>
              )}
              {topUsers.length > 2 && (
                <Grid item xs={12} sm={4} md={3} order={{ xs: 3, sm: 3 }} sx={{ mt: { sm: 4 } }}>
                  <TopThreeCard user={topUsers[2]} rank={3} delay={500} leaderboardType={leaderboardType} />
                </Grid>
              )}
            </Grid>
          )}
        </Box>
      )}

      {/* Search Bar */}
      <Box sx={{ 
        display: 'flex', 
        flexDirection: { xs: 'column', sm: 'row' }, 
        justifyContent: 'space-between',
        alignItems: 'center',
        mb: 3,
        gap: 2
      }}>
        <TextField
          placeholder="Search by name, email, or roll number..."
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
          sx={{ minWidth: { xs: '100%', sm: '300px' } }}
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
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small" variant="outlined">
              <InputLabel sx={{ color: darkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)' }}>
                Department
              </InputLabel>
              <Select
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
              >
                <MenuItem value="ALL">All Departments</MenuItem>
                {departments.filter(d => d !== 'ALL').map((dept) => (
                  <MenuItem key={dept} value={dept}>{dept}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small" variant="outlined">
              <InputLabel sx={{ color: darkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)' }}>
                Year of Study
              </InputLabel>
              <Select
                name="year"
                value={year}
                label="Year of Study"
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
              >
                <MenuItem value="ALL">All Students</MenuItem>
                <MenuItem value="First">First Year</MenuItem>
                <MenuItem value="Second">Second Year</MenuItem>
                <MenuItem value="Third">Third Year</MenuItem>
                <MenuItem value="Fourth">Fourth Year</MenuItem>
                <MenuItem value="Graduated">Graduated</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small" variant="outlined">
              <InputLabel sx={{ color: darkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)' }}>
                Section
              </InputLabel>
              <Select
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
              >
                <MenuItem value="All">All Sections</MenuItem>
                {['A', 'B', 'C', 'D', 'E', 'F', 'G'].map((sect) => (
                  <MenuItem key={sect} value={sect}>Section {sect}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small" variant="outlined">
              <InputLabel sx={{ color: darkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)' }}>
                Sort Order
              </InputLabel>
              <Select
                value={sortOrder}
                label="Sort Order"
                onChange={(e) => setSortOrder(e.target.value)}
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
              >
                <MenuItem value="desc">Highest First</MenuItem>
                <MenuItem value="asc">Lowest First</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
        
        {/* Active Filters Display */}
        {(department !== 'ALL' || section !== 'All' || year !== 'ALL' || debouncedSearchTerm.trim() !== '') && (
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
                label={`Year of Study: ${year}`} 
                onDelete={() => setYear('ALL')}
                sx={{ bgcolor: darkMode ? 'rgba(0,136,204,0.2)' : '#0088cc20', color: '#0088cc' }}
              />
            )}
            
            {debouncedSearchTerm.trim() !== '' && (
              <Chip 
                size="small" 
                label={`Search: "${debouncedSearchTerm}"`} 
                onDelete={() => setSearchTerm('')}
                sx={{ bgcolor: darkMode ? 'rgba(0,136,204,0.2)' : '#0088cc20', color: '#0088cc' }}
              />
            )}
          </Box>
        )}
        
        {/* Results count */}
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="body2" sx={{ color: darkMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)' }}>
            Showing {users.length} users (Page {pagination.currentPage} of {pagination.totalPages})
          </Typography>
          
          {users.length === 0 && (
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
          maxWidth: '100%',
          ...scrollbarStyles
        }}
      >
        <TableContainer 
          id="leaderboard-table"
          sx={{ 
          maxWidth: '100%',
          ...scrollbarStyles,
          position: 'relative'
        }}>
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
              {loading && users.length === 0 ? (
                <TableRow>
                  <TableCell 
                    colSpan={7 + leaderboardConfigs[leaderboardType].platforms.length} 
                    align="center"
                  >
                    <Box sx={{ py: 4 }}>
                      <CircularProgress />
                    </Box>
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell 
                    colSpan={7 + leaderboardConfigs[leaderboardType].platforms.length} 
                    align="center"
                  >
                    <Box sx={{ py: 4, color: darkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}>
                      <Typography variant="h6" gutterBottom>
                        No users found
                      </Typography>
                      <Typography variant="body2">
                        Try adjusting your filters or search terms
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user, index) => (
                  <LeaderboardRow 
                    key={user._id} 
                    user={user} 
                    index={index}
                  />
                ))
              )}

              {/* Current User Row */}
              {(currentUserData || currentAuthUser) && (
                <TableRow
                  onClick={() => currentUserData?.email && handleUserClick(currentUserData.email)}
                  sx={{
                    position: 'sticky',
                    bottom: 0,
                    zIndex: 10,
                    bgcolor: darkMode ? 'rgba(0, 136, 204, 0.2)' : 'rgba(0, 136, 204, 0.1)',
                    backdropFilter: 'blur(8px)',
                    boxShadow: '0 -2px 10px rgba(0,0,0,0.2)',
                    '& .MuiTableCell-root': {
                      borderTop: `1px solid ${darkMode ? 'rgba(0, 136, 204, 0.3)' : 'rgba(0, 136, 204, 0.2)'}`,
                      py: 1.5,
                    },
                    '&:hover': {
                      bgcolor: darkMode ? 'rgba(0, 136, 204, 0.25)' : 'rgba(0, 136, 204, 0.15)'
                    },
                    cursor: currentUserData?.email ? 'pointer' : 'default'
                  }}
                >
                  <TableCell align="center">
                    <Chip 
                      label={currentUserRank ? `#${currentUserRank}` : (currentUserData ? 'Not in filter' : 'Loading...')} 
                      color={currentUserRank ? 'primary' : 'default'}
                      size="small" 
                      sx={{ fontWeight: 'bold' }}
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Avatar
                        alt={(currentUserData?.name || currentAuthUser?.name) || 'User'}
                        src={getProfileImageUrl(currentUserData?.profilePicture || currentAuthUser?.profilePicture)}
                        sx={{ 
                          width: 36, 
                          height: 36,
                          border: `2px solid ${darkMode ? 'rgba(0,136,204,0.5)' : 'rgba(0,136,204,0.3)'}`,
                        }}
                      />
                      <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body1" fontWeight="medium">
                            {currentUserData?.name || currentAuthUser?.name || 'Unknown User'}
                          </Typography>
                          <Chip 
                            size="small" 
                            label="YOU" 
                            color="primary" 
                            variant="outlined" 
                            sx={{ height: 20, fontSize: '0.7rem' }}
                          />
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                          {(currentUserData?.department || currentAuthUser?.department || 'Unknown')} - {getStudentYear(currentUserData?.graduatingYear || currentAuthUser?.graduatingYear)}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {(currentUserData?.rollNumber || currentAuthUser?.rollNumber) ? (currentUserData?.rollNumber || currentAuthUser?.rollNumber).toUpperCase() : '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{currentUserData?.department || currentAuthUser?.department || '-'}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{currentUserData?.section || currentAuthUser?.section || '-'}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{currentUserData?.graduatingYear || currentAuthUser?.graduatingYear || '-'}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ color: '#0088cc', fontWeight: 600 }}>
                      {currentUserData ? (
                        leaderboardType === 'score' 
                          ? (currentUserData.totalScore || 0) 
                          : (() => {
                              const backendProblems = currentUserData.problemsSolved || 0;
                              if (backendProblems === 0) {
                                return calculateTotalProblemsFromPlatforms(currentUserData, leaderboardConfigs[leaderboardType].platforms);
                              }
                              return backendProblems;
                            })()
                      ) : '-'}
                    </Typography>
                  </TableCell>
                  
                  {leaderboardConfigs[leaderboardType].platforms.map((platform) => {
                    const value = currentUserData?.platformScores && currentUserData.platformScores[platform]
                      ? (leaderboardType === 'score' 
                        ? currentUserData.platformScores[platform].score 
                        : currentUserData.platformScores[platform].problemsSolved) || 0
                      : 0;
                      
                    return (
                      <TableCell key={platform}>
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            color: platformColors[platform],
                            opacity: value > 0 ? 1 : 0.4,
                            fontWeight: value > 0 ? 600 : 400
                          }}
                        >
                          {value || '-'}
                        </Typography>
                      </TableCell>
                    );
                  })}
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination Controls */}
        {pagination.totalPages > 1 && <PaginationControls />}
      </Paper>

      {/* Footer */}
      <Box sx={{ 
        px: 3, 
        pt: 3, 
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'center',
        width: '100%',
        mb: 2
      }}>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center',
          flexDirection: { xs: 'column', sm: 'row' },
          gap: { xs: 1, sm: 0 }
        }}>
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
              fontSize: { xs: '0.75rem', sm: '0.8rem' },
              textAlign: { xs: 'center', sm: 'left' }
            }}
          >
            © 2025 SCOPE CLUB. All rights reserved.
          </Typography>
        </Box>
      </Box>
    </Container>
  );
};

export default Leaderboard;