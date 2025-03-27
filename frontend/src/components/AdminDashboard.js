import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Grid,
  Paper,
  Typography,
  Button,
  Card,
  CardContent,
  IconButton,
  CircularProgress,
  useTheme,
  Tabs,
  Tab,
  Alert,
  Menu,
  MenuItem,
  Divider,
  Avatar,
  Chip,
  FormControl,
  Select,
  InputLabel,
  List,
  ListItem,
  ListItemText,
  Tooltip,
  Badge,
  useMediaQuery,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TablePagination
} from '@mui/material';
import {
  BarChart as BarChartIcon,
  Refresh as RefreshIcon,
  TrendingUp,
  People,
  Assessment,
  FilterList,
  Code,
  PieChart as PieChartIcon,
  Leaderboard,
  FileDownload
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Sector,
  RadialBarChart,
  RadialBar,
  AreaChart,
  Area
} from 'recharts';
import axios from 'axios';
import * as XLSX from 'xlsx';

// Color palette for charts
const PLATFORM_COLORS = {
  leetcode: '#FFA116',
  codeforces: '#1E88E5',
  codechef: '#5B4638',
  geeksforgeeks: '#2F8D46',
  hackerrank: '#00EA64'
};

// Fallback colors for platforms
const CHART_COLORS = ['#8884d8', '#83a6ed', '#8dd1e1', '#82ca9d', '#a4de6c', '#d0ed57', '#ffc658'];

// Capitalize first letter
const capitalize = (str) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
};

// Function to format days in specific order: Wed, Thu, Fri, Sat, Sun, Mon, Tue
const formatDaysInOrder = (data) => {
  // Define the order of days (starting from Wednesday)
  const dayOrder = ['Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Mon', 'Tue'];
  
  // Sort data based on the day abbreviation
  if (Array.isArray(data)) {
    return [...data].sort((a, b) => {
      const dayA = a.day || new Date(a.date).toLocaleDateString('en-US', { weekday: 'short' }).substring(0, 3);
      const dayB = b.day || new Date(b.date).toLocaleDateString('en-US', { weekday: 'short' }).substring(0, 3);
      return dayOrder.indexOf(dayA) - dayOrder.indexOf(dayB);
    });
  }
  
  return data;
};

// Helper function to get ordered days for weekly data
const getOrderedWeeklyData = (data) => {
  if (!Array.isArray(data) || data.length === 0) return [];
  
  // Create an ordered template with all days
  const dayOrder = ['Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Mon', 'Tue'];
  const result = [];
  
  // Map the actual data to the ordered template
  dayOrder.forEach(dayAbbr => {
    const matchingDay = data.find(item => {
      const itemDay = new Date(item.date).toLocaleDateString('en-US', { weekday: 'short' }).substring(0, 3);
      return itemDay === dayAbbr;
    });
    
    if (matchingDay) {
      result.push(matchingDay);
    }
  });
  
  return result;
};

const AdminDashboard = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState('weekly');
  const [activePieIndex, setActivePieIndex] = useState(0);
  const [leaderboardData, setLeaderboardData] = useState([]);

  // Fetch admin stats
  const fetchAdminStats = async () => {
    setLoading(true);
    try {
      const response = await axios.get('http://localhost:5000/api/admin/stats', {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        params: {
          timeframe: selectedTimeframe
        }
      });

      if (response.data) {
        // Process and order the days in weekly data
        const processWeeklyData = (data) => {
          if (!Array.isArray(data) || data.length === 0) return [];
          
          // Create a map of existing data by date
          const dataByDate = {};
          data.forEach(item => {
            if (item.date) {
              dataByDate[item.date] = item;
            }
          });
          
          // Get last 7 days including today (backward from today)
          const result = [];
          const today = new Date();
          const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
          
          // Generate the last 7 days
          for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);
            
            const dateStr = date.toISOString().split('T')[0];
            const dayName = dayNames[date.getDay()];
            
            // Use actual data if exists, otherwise create placeholder with zero value
            if (dataByDate[dateStr]) {
              // Ensure the day property is set correctly
              result.push({
                ...dataByDate[dateStr],
                day: dayName
              });
            } else {
              // Create placeholder with zero value
              result.push({
                date: dateStr,
                problemsSolved: 0,
                day: dayName
              });
            }
          }
          
          return result;
        };
          
        // Format the weekly data to have ordered days
        if (response.data.problemsStats && response.data.problemsStats.weeklyProblemsByPlatform) {
          response.data.problemsStats.weeklyProblemsByPlatform = response.data.problemsStats.weeklyProblemsByPlatform.map(platform => {
            return {
              ...platform,
              data: processWeeklyData(platform.data)
            };
          });
        }
        
        // Also order weekly activity data if it exists
        if (response.data.activityStats && response.data.activityStats.weeklyActivity) {
          response.data.activityStats.weeklyActivity = processWeeklyData(
            response.data.activityStats.weeklyActivity
          );
        }
        
        setStats(response.data);
        
        // Fetch leaderboard data for export
        try {
          const leaderboardResponse = await axios.get('http://localhost:5000/api/leaderboard', {
            headers: { 
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          setLeaderboardData(leaderboardResponse.data || []);
          
          // Don't fetch individual platform details - this endpoint is causing 404 errors
          // We'll use what's available in the leaderboard response
        } catch (leaderboardError) {
          console.error('Error fetching leaderboard data:', leaderboardError);
          // Continue with the stats data we have
        }
      }
    } catch (error) {
      console.error('Error fetching admin stats:', error);
      const errorMessage = error.response?.status === 404 
        ? 'API endpoint not found. Please check server configuration.'
        : error.response?.status === 401
        ? 'Unauthorized access. Please log in again.'
        : 'Failed to fetch dashboard statistics. Please try again later.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminStats();
  }, [token]);
  
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleRefresh = () => {
    fetchAdminStats();
    toast.success('Dashboard data refreshed');
  };

  const handleTimeframeChange = (event) => {
    setSelectedTimeframe(event.target.value);
  };
  
  const onPieEnter = (_, index) => {
    setActivePieIndex(index);
  };

  const fetchExportData = async () => {
    try {
      toast.info('Preparing detailed export data, please wait...');
      
      // Get detailed user data including coding profiles
      const response = await axios.get('http://localhost:5000/api/leaderboard/export', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      // Debug: Log the structure of the first user in the response
      if (response.data && response.data.length > 0) {
        console.log('First user data sample:', response.data[0]);
        
        // Check GitHub profile data specifically
        const firstUser = response.data[0];
        if (firstUser.codingProfiles && firstUser.codingProfiles.github) {
          console.log('GitHub profile data:', firstUser.codingProfiles.github);
        } else {
          console.log('No GitHub profile data found');
        }
      }
      
      // Format the data for Excel export with all the requested fields
      const exportData = response.data.map(user => {
        // Get profile data from the user object
        const codingProfiles = user.codingProfiles || {};
        
        // Extract coding profiles
        const leetcode = codingProfiles.leetcode || {};
        const codeforces = codingProfiles.codeforces || {};
        const codechef = codingProfiles.codechef || {};
        const geeksforgeeks = codingProfiles.geeksforgeeks || {};
        const hackerrank = codingProfiles.hackerrank || {};
        const github = codingProfiles.github || {};
        
        // Extract GitHub data
        const githubContributions = github.totalCommits || 0;
        const githubCommits = github.totalCommits || 0;
        const githubRepos = github.publicRepos || 0;
        
        // Create a comprehensive user record with all requested fields
        return {
          // Basic user information
          'Rank': user.rank || '-',
          'Name': user.name || '-',
          'Roll Number': user.rollNumber || '-',
          'Email': user.email || '-',
          'Total Score': user.totalScore || 0,
          'Total Problems': user.totalProblemsSolved || 0,
          
          // LeetCode data
          'LeetCode Username': leetcode.username || '-',
          'LeetCode Problems': leetcode.problemsSolved || 0,
          'LeetCode Rating': leetcode.rating || 0,
          'LeetCode Contests': leetcode.contestsParticipated || 0,
          
          // CodeForces data
          'CodeForces Username': codeforces.username || '-',
          'CodeForces Problems': codeforces.problemsSolved || 0,
          'CodeForces Rating': codeforces.rating || 0,
          'CodeForces Contests': codeforces.contestsParticipated || 0,
          
          // CodeChef data
          'CodeChef Username': codechef.username || '-',
          'CodeChef Problems': codechef.problemsSolved || 0,
          'CodeChef Rating': codechef.rating || 0,
          'CodeChef Contests': codechef.contestsParticipated || 0,
          
          // GeeksforGeeks data
          'GFG Username': geeksforgeeks.username || '-',
          'GFG Problems': geeksforgeeks.problemsSolved || 0,
          
          // HackerRank data
          'HackerRank Username': hackerrank.username || '-',
          'HackerRank Problems': hackerrank.problemsSolved || 0,
          
          // GitHub data
          'GitHub Username': github.username || '-',
          'GitHub Contributions': githubContributions,
          'GitHub Commits': githubCommits,
          'GitHub Repositories': githubRepos,
        };
      });

      // Create a worksheet with the data
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      
      // Set column widths for better readability
      const colWidths = [
        { wch: 5 },  // Rank
        { wch: 25 }, // Name
        { wch: 15 }, // Roll Number
        { wch: 25 }, // Email
        { wch: 10 }, // Total Score
        { wch: 12 }, // Total Problems
        
        { wch: 20 }, // LeetCode Username
        { wch: 15 }, // LeetCode Problems
        { wch: 15 }, // LeetCode Rating
        { wch: 15 }, // LeetCode Contests
        
        { wch: 20 }, // CodeForces Username
        { wch: 15 }, // CodeForces Problems
        { wch: 15 }, // CodeForces Rating
        { wch: 15 }, // CodeForces Contests
        
        { wch: 20 }, // CodeChef Username
        { wch: 15 }, // CodeChef Problems
        { wch: 15 }, // CodeChef Rating
        { wch: 15 }, // CodeChef Contests
        
        { wch: 20 }, // GFG Username
        { wch: 15 }, // GFG Problems
        
        { wch: 20 }, // HackerRank Username
        { wch: 15 }, // HackerRank Problems
        
        { wch: 20 }, // GitHub Username
        { wch: 15 }, // GitHub Contributions
        { wch: 15 }, // GitHub Commits
        { wch: 15 }  // GitHub Repositories
      ];
      
      // Apply column widths
      worksheet['!cols'] = colWidths;
      
      // Create a workbook and append the worksheet
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Leaderboard");
      
      // Add sheet date in a cell
      const dateCell = XLSX.utils.encode_cell({r: 0, c: exportData[0] ? Object.keys(exportData[0]).length + 1 : 0});
      worksheet[dateCell] = { t: 's', v: `Generated: ${new Date().toLocaleString()}` };
      
      // Write the file
      XLSX.writeFile(workbook, "CodeTracker_Detailed_Leaderboard.xlsx");

      toast.success('Detailed leaderboard data exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export data. Please try again.');
    }
  };

  const exportToExcel = () => {
    fetchExportData();
  };

  const renderActiveShape = (props) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props;
  
    return (
      <g>
        {/* Black background rectangle */}
        <rect 
          x={cx - 60} 
          y={cy - 40} 
          width={120} 
          height={80} 
          fill="#121212" 
          rx={4}
          ry={4}
        />
        <text x={cx} y={cy} dy={-20} textAnchor="middle" fill="#fff">
          {payload.department}
        </text>
        <text x={cx} y={cy} textAnchor="middle" fill="#fff">
          {`${value} users`}
        </text>
        <text x={cx} y={cy} dy={20} textAnchor="middle" fill="rgba(255,255,255,0.7)">
          {`${(percent * 100).toFixed(1)}%`}
        </text>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
        />
        <Sector
          cx={cx}
          cy={cy}
          startAngle={startAngle}
          endAngle={endAngle}
          innerRadius={outerRadius + 6}
          outerRadius={outerRadius + 10}
          fill={fill}
        />
      </g>
    );
  };

  // Helper function to format time label based on timeframe
  const formatTimeLabel = (dataPoint) => {
    if (selectedTimeframe === 'weekly') {
      // Format as day of week
      return new Date(dataPoint.date).toLocaleDateString('en-US', { weekday: 'short' });
    } else if (selectedTimeframe === 'monthly') {
      // Format as week number in month
      const date = new Date(dataPoint.date);
      const weekNum = Math.ceil(date.getDate() / 7);
      return `Week ${weekNum}`;
    } else {
      // Format as month name for yearly view
      return new Date(dataPoint.date).toLocaleDateString('en-US', { month: 'short' });
    }
  };

  if (loading) {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          flexDirection: 'column',
          justifyContent: 'center', 
          alignItems: 'center',
          height: '100vh',
          gap: 3
        }}
      >
        <CircularProgress size={60} />
        <Typography variant="h6" color="text.secondary">
          Loading Admin Dashboard...
        </Typography>
      </Box>
    );
  }

  return (
    <Box 
      sx={{ 
        backgroundColor: theme.palette.mode === 'dark' ? '#121212' : '#f5f5f7',
        minHeight: '100vh',
        pt: 3,
        pb: 8
      }}
    >
      <Container maxWidth="xl">
        {/* Header */}
        <Paper 
          elevation={0} 
          sx={{ 
            p: { xs: 2, md: 3 }, 
            mb: 3, 
            borderRadius: 2, 
            background: 'linear-gradient(135deg, #6b73ff 0%, #000dff 100%)',
            color: 'white'
          }}
        >
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={8}>
              <Typography variant={isMobile ? "h5" : "h4"} fontWeight="bold" gutterBottom>
            Admin Dashboard
          </Typography>
              <Typography variant={isMobile ? "body2" : "subtitle1"}>
                Monitor user performance metrics and department analytics
              </Typography>
            </Grid>
            <Grid item xs={12} md={4} sx={{ display: 'flex', justifyContent: { xs: 'flex-start', md: 'flex-end' }, alignItems: 'center', mt: { xs: 1, md: 0 } }}>
              <Tooltip title="Refresh data">
                <IconButton 
                  onClick={handleRefresh} 
                  sx={{ 
                    color: 'white', 
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    '&:hover': { backgroundColor: 'rgba(255,255,255,0.2)' },
                    mr: 2
                  }}
                >
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
            <Button
              variant="contained"
              color="secondary"
                startIcon={<FileDownload />}
                onClick={exportToExcel}
                sx={{ 
                  bgcolor: 'white', 
                  color: 'primary.main',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' },
                  fontSize: { xs: '0.75rem', sm: '0.875rem' },
                  px: { xs: 2, sm: 3 }
                }}
              >
                {isMobile ? 'Export' : 'Export Leaderboard'}
            </Button>
            </Grid>
          </Grid>
        </Paper>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Key Metrics */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ 
              borderRadius: 2, 
              boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
              overflow: 'hidden',
              height: '100%'
            }}>
              <Box sx={{ height: 5, bgcolor: '#4CAF50' }}></Box>
              <CardContent sx={{ height: 'calc(100% - 5px)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Avatar sx={{ bgcolor: 'rgba(76, 175, 80, 0.1)', color: '#4CAF50', mr: 2 }}>
                    <People />
                  </Avatar>
                  <Typography color="textSecondary" fontWeight="medium">
                    Total Users
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {stats?.userStats.totalUsers || 0}
                  </Typography>
                  <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                    {stats?.userStats.activeUsers || 0} active this week
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ 
              borderRadius: 2, 
              boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
              overflow: 'hidden',
              height: '100%'
            }}>
              <Box sx={{ height: 5, bgcolor: '#673AB7' }}></Box>
              <CardContent sx={{ height: 'calc(100% - 5px)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Avatar sx={{ bgcolor: 'rgba(103, 58, 183, 0.1)', color: '#673AB7', mr: 2 }}>
                    <TrendingUp />
                  </Avatar>
                  <Typography color="textSecondary" fontWeight="medium">
                    Total Contributions
                  </Typography>
                </Box>
                <Box>
                  <Tooltip title="Total number of problems solved by all users across all coding platforms">
                    <Typography variant="h4" fontWeight="bold" sx={{ cursor: 'help' }}>
                      {stats?.problemsStats?.totalProblems?.toLocaleString() || stats?.problemsStats?.platformStats?.reduce((sum, platform) => sum + (platform.totalProblems || 0), 0).toLocaleString() || 0}
                    </Typography>
                  </Tooltip>
                  <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                    Problems solved across all platforms
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ 
              borderRadius: 2, 
              boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
              overflow: 'hidden',
              height: '100%'
            }}>
              <Box sx={{ height: 5, bgcolor: '#2196F3' }}></Box>
              <CardContent sx={{ height: 'calc(100% - 5px)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Avatar sx={{ bgcolor: 'rgba(33, 150, 243, 0.1)', color: '#2196F3', mr: 2 }}>
                    <Code />
                  </Avatar>
                  <Typography color="textSecondary" fontWeight="medium">
                    Total Platforms
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {stats?.platformEngagement?.length || 0}
                  </Typography>
                  <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                    {Math.round(stats?.problemsStats?.platformStats?.reduce((sum, platform) => sum + (platform.avgProblems || 0), 0) / (stats?.platformEngagement?.length || 1))} avg problems per platform
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ 
              borderRadius: 2, 
              boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
              overflow: 'hidden',
              height: '100%'
            }}>
              <Box sx={{ height: 5, bgcolor: '#F44336' }}></Box>
              <CardContent sx={{ height: 'calc(100% - 5px)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Avatar sx={{ bgcolor: 'rgba(244, 67, 54, 0.1)', color: '#F44336', mr: 2 }}>
                    <PieChartIcon />
                  </Avatar>
                  <Typography color="textSecondary" fontWeight="medium">
                    Departments
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {stats?.departmentStats?.length || 0}
                  </Typography>
                  <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                    Tracking performance across departments
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ 
              borderRadius: 2, 
              boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
              overflow: 'hidden',
              height: '100%'
            }}>
              <Box sx={{ height: 5, bgcolor: '#FF9800' }}></Box>
              <CardContent sx={{ height: 'calc(100% - 5px)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Avatar sx={{ bgcolor: 'rgba(255, 152, 0, 0.1)', color: '#FF9800', mr: 2 }}>
                    <Leaderboard />
                  </Avatar>
                  <Typography color="textSecondary" fontWeight="medium">
                    Top Performer
                  </Typography>
                </Box>
                <Box>
                  <Typography variant={isMobile ? "h6" : "h6"} fontWeight="bold" noWrap>
                    {stats?.userStats.topUsers?.[0]?.name || 'N/A'}
                  </Typography>
                  <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                    Score: {stats?.userStats.topUsers?.[0]?.totalScore || 0}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Tabs Navigation */}
        <Box sx={{ mb: 3, overflowX: 'auto' }}>
          <Tabs 
            value={activeTab} 
            onChange={handleTabChange} 
            variant={isMobile ? "scrollable" : "standard"}
            scrollButtons={isMobile ? "auto" : undefined}
            sx={{ 
              '& .MuiTabs-indicator': { 
                height: 3,
                borderRadius: '3px 3px 0 0' 
              },
              '& .MuiTab-root': { 
                textTransform: 'none', 
                fontWeight: 600,
                fontSize: isMobile ? '0.875rem' : '1rem',
                minWidth: isMobile ? 100 : 120
              } 
            }}
          >
            <Tab label="Problem Analytics" icon={<BarChartIcon />} iconPosition={isMobile ? "top" : "start"} />
            <Tab label="Department Stats" icon={<PieChartIcon />} iconPosition={isMobile ? "top" : "start"} />
          </Tabs>
        </Box>

        {/* Tab Content */}
        <Box sx={{ display: activeTab === 0 ? 'block' : 'none' }}>
            <Grid container spacing={3}>
            {/* Timeframe Filter */}
            <Grid item xs={12}>
              <Paper sx={{ p: 2, borderRadius: 2, mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                  <Typography variant="h6" sx={{ flexGrow: 1 }}>
                    Problem Solving Analytics
                  </Typography>
                  
                  <FormControl sx={{ minWidth: 150 }}>
                    <InputLabel id="timeframe-select-label">Timeframe</InputLabel>
                    <Select
                      labelId="timeframe-select-label"
                      value={selectedTimeframe}
                      label="Timeframe"
                      onChange={handleTimeframeChange}
                      size="small"
                    >
                      <MenuItem value="weekly">Weekly</MenuItem>
                      <MenuItem value="monthly">Monthly</MenuItem>
                      <MenuItem value="all">All Time</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
              </Paper>
            </Grid>
            
            {/* Platform Comparison Chart */}
            <Grid item xs={12} md={8}>
              <Paper sx={{ p: { xs: 2, md: 3 }, borderRadius: 2, height: '100%' }}>
                <Typography variant="h6" gutterBottom>
                  Problems Solved by Platform
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {selectedTimeframe === 'weekly' ? 'Last 7 days' : selectedTimeframe === 'monthly' ? 'Last 3 months' : 'Overall comparison'}
                </Typography>
                
                <Box sx={{ height: isTablet ? 300 : 400, mt: isMobile ? 1 : 2 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={stats?.problemsStats?.platformStats
                        ?.filter(platform => platform.platform !== 'github')
                        ?.map(platform => ({
                          name: capitalize(platform.platform),
                          totalProblems: platform.totalProblems,
                          avgProblems: platform.avgProblems,
                          userCount: platform.userCount,
                          fill: PLATFORM_COLORS[platform.platform] || CHART_COLORS[0]
                        })) || []}
                      margin={{ top: 20, right: 30, left: isMobile ? 0 : 20, bottom: isMobile ? 120 : 80 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis 
                        dataKey="name" 
                        tick={{ fontSize: isMobile ? 10 : 12 }}
                        angle={-45}
                        textAnchor="end"
                        height={isMobile ? 120 : 80}
                      />
                      <YAxis />
                      <RechartsTooltip 
                        formatter={(value, name, props) => {
                          if (name === 'totalProblems') return [`${value} problems`, 'Total Problems'];
                          if (name === 'avgProblems') return [`${value} problems/user`, 'Avg Per User'];
                          if (name === 'userCount') return [`${value} users`, 'Users'];
                          return [value, name];
                        }}
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid rgba(0,0,0,0.1)',
                          borderRadius: '4px',
                          color: '#000'
                        }}
                        labelStyle={{ color: '#333' }}
                      />
                      <Legend />
                      <Bar 
                        dataKey="totalProblems" 
                        name="Total Problems" 
                        fill={theme.palette.primary.main}
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar 
                        dataKey="avgProblems" 
                        name="Avg Per User" 
                        fill={theme.palette.secondary.main}
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
                </Paper>
              </Grid>
            
            {/* Top Performers */}
              <Grid item xs={12} md={4}>
                <Paper sx={{ p: { xs: 2, md: 3 }, borderRadius: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <Typography variant="h6" gutterBottom>
                  Top Performers
                  </Typography>
                  <Box 
                    sx={{ 
                    mt: 2, 
                      flexGrow: 1,
                      maxHeight: '400px', 
                    overflow: 'auto',
                    '&::-webkit-scrollbar': {
                      width: '8px',
                    },
                    '&::-webkit-scrollbar-track': {
                      background: 'rgba(0,0,0,0.1)',
                      borderRadius: '10px',
                    },
                    '&::-webkit-scrollbar-thumb': {
                      background: 'rgba(255,255,255,0.15)',
                      borderRadius: '10px',
                      '&:hover': {
                        background: 'rgba(255,255,255,0.25)',
                      }
                    }
                    }}
                  >
                  {stats?.userStats?.topUsers?.map((user, index) => (
                    <Box 
                      key={index}
                      sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        p: 1.5,
                        mb: 1.5,
                          mx: 1,
                        borderRadius: 1,
                        bgcolor: index === 0 ? 'rgba(255, 193, 7, 0.1)' : 'transparent',
                            border: index === 0 ? '1px solid rgba(255, 193, 7, 0.2)' : '1px solid rgba(255, 255, 255, 0.08)'
                      }}
                    >
                      <Avatar 
                        sx={{ 
                          bgcolor: index === 0 ? '#FFC107' : index === 1 ? '#9E9E9E' : index === 2 ? '#CD7F32' : theme.palette.primary.main,
                          color: 'white',
                          width: 36,
                          height: 36,
                          mr: 2
                        }}
                      >
                        {index + 1}
                      </Avatar>
                          <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
                        <Typography variant="body1" fontWeight="medium" noWrap>
                          {user.name}
                    </Typography>
                        <Typography variant="body2" color="text.secondary" noWrap>
                          {user.department || 'No department'}
                    </Typography>
                      </Box>
                      <Chip 
                        label={`${user.totalScore} pts`} 
                        size="small" 
                        sx={{ 
                          fontWeight: 'bold',
                              bgcolor: index === 0 ? 'rgba(255, 193, 7, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                          color: index === 0 ? '#FF6D00' : 'text.primary'
                        }}
                      />
                    </Box>
                  ))}
                  </Box>
                </Paper>
            </Grid>
            
            {/* Problems Over Time */}
            <Grid item xs={12}>
              <Paper sx={{ p: { xs: 2, md: 3 }, borderRadius: 2 }}>
                  <Typography variant="h6" gutterBottom>
                  Problems Solved Over Time
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    {selectedTimeframe === 'weekly' ? 'Daily trend for the past week' : 
                    selectedTimeframe === 'monthly' ? 'Weekly trend for the past 3 months' : 
                    'Monthly trend for the past year'}
                  </Typography>
                  <Tooltip title="Refresh data">
                    <IconButton onClick={handleRefresh} size="small">
                      <RefreshIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
                
                <Box sx={{ height: isMobile ? 300 : 400, mt: isMobile ? 2 : 3 }}>
                  {loading ? (
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      height: '100%',
                      flexDirection: 'column',
                      gap: 2
                    }}>
                      <CircularProgress size={40} />
                      <Typography variant="body2" color="text.secondary">
                        Loading chart data...
                      </Typography>
                    </Box>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        margin={{ top: 20, right: 30, left: isMobile ? 0 : 20, bottom: isMobile ? 20 : 10 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis 
                          dataKey="day" 
                          type="category" 
                          allowDuplicatedCategory={false}
                          tick={{ fontSize: isMobile ? 10 : 12 }}
                        />
                        <YAxis />
                        <RechartsTooltip 
                          formatter={(value, name) => [`${value} problems`, capitalize(name)]}
                          labelFormatter={(label) => {
                            // If it's a day abbreviation, get the full day name
                            if (typeof label === 'string' && label.length === 3) {
                              const days = {
                                'Sun': 'Sunday',
                                'Mon': 'Monday',
                                'Tue': 'Tuesday',
                                'Wed': 'Wednesday',
                                'Thu': 'Thursday',
                                'Fri': 'Friday',
                                'Sat': 'Saturday'
                              };
                              return days[label] || label;
                            }
                            return label;
                          }}
                          contentStyle={{
                            backgroundColor: 'white',
                            border: '1px solid rgba(0,0,0,0.1)',
                            borderRadius: '4px',
                            color: '#000'
                          }}
                          labelStyle={{ color: '#333' }}
                        />
                        <Legend layout={isMobile ? "horizontal" : "vertical"} verticalAlign={isMobile ? "bottom" : "middle"} align={isMobile ? "center" : "right"} />
                        
                        {selectedTimeframe === 'weekly' && stats?.problemsStats?.weeklyProblemsByPlatform?.length > 0
                          ? stats?.problemsStats?.weeklyProblemsByPlatform?.map((platform, index) => (
                              <Line
                                key={platform.platform}
                                data={platform.data}
                                name={capitalize(platform.platform)}
                                type="monotone"
                                dataKey="problemsSolved"
                                stroke={PLATFORM_COLORS[platform.platform] || CHART_COLORS[index % CHART_COLORS.length]}
                                activeDot={{ r: isMobile ? 6 : 8 }}
                                strokeWidth={isMobile ? 1.5 : 2}
                                connectNulls={true}
                              />
                            ))
                          : selectedTimeframe === 'monthly' && stats?.problemsStats?.monthlyProblemsByPlatform?.length > 0
                          ? stats?.problemsStats?.monthlyProblemsByPlatform?.map((platform, index) => (
                              <Line
                                key={platform.platform}
                                data={platform.data}
                                name={capitalize(platform.platform)}
                                type="monotone"
                                dataKey="problemsSolved"
                                stroke={PLATFORM_COLORS[platform.platform] || CHART_COLORS[index % CHART_COLORS.length]}
                                activeDot={{ r: isMobile ? 6 : 8 }}
                                strokeWidth={isMobile ? 1.5 : 2}
                                connectNulls={true}
                              />
                            ))
                          : stats?.problemsStats?.yearlyProblemsByPlatform?.length > 0
                          ? stats?.problemsStats?.yearlyProblemsByPlatform?.map((platform, index) => (
                              <Line
                                key={platform.platform}
                                data={platform.data}
                                name={capitalize(platform.platform)}
                                type="monotone"
                                dataKey="problemsSolved"
                                stroke={PLATFORM_COLORS[platform.platform] || CHART_COLORS[index % CHART_COLORS.length]}
                                activeDot={{ r: isMobile ? 6 : 8 }}
                                strokeWidth={isMobile ? 1.5 : 2}
                                connectNulls={true}
                              />
                            ))
                          : (
                            <Line
                              key="placeholder"
                              data={[{day: 'No Data', problemsSolved: 0}]}
                              name="No Data Available"
                              type="monotone"
                              dataKey="problemsSolved"
                              stroke="#ccc"
                              strokeDasharray="5 5"
                              connectNulls={true}
                            />
                          )
                        }
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </Box>
        
        {/* Department Analytics Tab */}
        <Box sx={{ display: activeTab === 1 ? 'block' : 'none' }}>
          <Grid container spacing={3}>
            {/* Department Distribution */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: { xs: 2, md: 3 }, borderRadius: 2, height: '100%' }}>
                <Typography variant="h6" gutterBottom>
                  Department Distribution
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  User count by department
                </Typography>
                
                <Box sx={{ height: isMobile ? 300 : 400, display: 'flex', justifyContent: 'center' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        activeIndex={activePieIndex}
                        activeShape={renderActiveShape}
                        data={stats?.departmentStats?.map((dept, index) => ({
                          department: dept.department,
                          value: dept.userCount
                        })) || []}
                        cx="50%"
                        cy="50%"
                        innerRadius={isMobile ? 50 : 70}
                        outerRadius={isMobile ? 80 : 100}
                        dataKey="value"
                        onMouseEnter={onPieEnter}
                      >
                        {stats?.departmentStats?.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={CHART_COLORS[index % CHART_COLORS.length]} 
                          />
                        )) || []}
                      </Pie>
                      <Legend wrapperStyle={{ fontSize: isMobile ? 10 : 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </Box>
              </Paper>
            </Grid>
            
            {/* Average Score by Department */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: { xs: 2, md: 3 }, borderRadius: 2, height: '100%' }}>
                <Typography variant="h6" gutterBottom>
                  Average Score by Department
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Performance comparison across departments
                </Typography>
                
                <Box sx={{ 
                  height: isMobile ? 300 : 400,
                  mt: 6  // Add margin top to move chart down
                }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={stats?.departmentStats?.map((dept, index) => ({
                        name: dept.department,
                        score: dept.avgScore,
                        fill: CHART_COLORS[index % CHART_COLORS.length]
                      })) || []}
                      margin={{ 
                        top: 20, 
                        right: 30, 
                        left: 40,  // Increased left margin for Y-axis label
                        bottom: isMobile ? 80 : 50 
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis 
                        dataKey="name"
                        tick={{ 
                          fontSize: isMobile ? 10 : 12,
                          fill: 'rgba(255,255,255,0.7)'
                        }}
                        angle={-45}
                        textAnchor="end"
                        height={isMobile ? 80 : 60}
                        interval={0}
                      />
                      <YAxis 
                        type="number"
                        tick={{ 
                          fontSize: isMobile ? 10 : 12,
                          fill: 'rgba(255,255,255,0.7)'
                        }}
                        label={{ 
                          value: 'Average Score', 
                          angle: -90, 
                          position: 'insideLeft',
                          offset: -30,  // Adjusted offset for better positioning
                          style: { 
                            textFill: 'rgba(255,255,255,0.7)',
                            fontSize: 12
                          }
                        }}
                      />
                      <RechartsTooltip 
                        formatter={(value) => [`${value} points`, 'Avg Score']}
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid rgba(0,0,0,0.1)',
                          borderRadius: '4px',
                          color: '#000'
                        }}
                        labelStyle={{ color: '#333' }}
                      />
                      <Bar 
                        dataKey="score" 
                        name="Average Score" 
                        radius={[4, 4, 0, 0]}
                        maxBarSize={60}
                      >
                        {stats?.departmentStats?.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={CHART_COLORS[index % CHART_COLORS.length]} 
                          />
                        )) || []}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
                </Paper>
              </Grid>
          </Grid>
        </Box>
      </Container>
    </Box>
  );
};

export default AdminDashboard;