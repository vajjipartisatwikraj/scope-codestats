import React, { useState, useEffect, useMemo } from 'react';
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
  useMediaQuery,
  Tooltip
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
  Leaderboard as LeaderboardIcon,
  FileDownload as FileDownloadIcon,
  Sync as SyncIcon,
  Download as DownloadIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
  CheckCircle as CheckCircleIcon,
  Group as GroupIcon,
  CalendarToday as CalendarIcon,
  Timeline as TimelineIcon,
  BugReport as BugReportIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';
import axios from 'axios';
import * as XLSX from 'exceljs';
import { activeSyncState } from '../contexts/AuthContext';
import { apiUrl } from '../config/apiConfig';

// Import the new tab components
import ProblemAnalyticsTab from './ProblemAnalyticsTab';
import DepartmentStatsTab from './DepartmentStatsTab';
import UserRegistrationsTab from './UserRegistrationsTab';
import ProfileSyncTab from './ProfileSyncTab';
import ReportIssuesTab from './ReportIssuesTab';

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
  const [userRegistrationStats, setUserRegistrationStats] = useState(null);
  const [registrationTimeframe, setRegistrationTimeframe] = useState('daily');
  const [isMounted, setIsMounted] = useState(false);

  // Fetch admin stats
  const fetchAdminStats = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${apiUrl}/admin/stats`, {
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
              result.push({
                ...dataByDate[dateStr],
                day: dayName
              });
            } else {
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
          const leaderboardResponse = await axios.get(`${apiUrl}/leaderboard`, {
            headers: { 
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          setLeaderboardData(leaderboardResponse.data || []);
        } catch (leaderboardError) {
          // Continue with the stats data we have
        }
      }
    } catch (error) {
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

  // Fetch user registration statistics
  const fetchUserRegistrationStats = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${apiUrl}/admin/user-registration-stats`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data) {
        setUserRegistrationStats(response.data);
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to fetch registration statistics';
      toast.error(errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminStats();
    fetchUserRegistrationStats();
    setIsMounted(true);
    return () => setIsMounted(false);
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

  const exportToExcel = () => {
    toast.info('Preparing data for export...', { autoClose: 2000 });
    fetchExportData();
  };

  const fetchExportData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await axios.get(`${apiUrl}/leaderboard/export`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        params: {
          includeComplete: 'true',
          debug: 'true'
        }
      });
      
      if (!response.data || !Array.isArray(response.data) || response.data.length === 0) {
        toast.error('No data available for export');
        setLoading(false);
        return;
      }
      
      toast.info(`Processing export data for ${response.data.length} users...`, { autoClose: 2000 });
      
      const sortedData = [...response.data].sort((a, b) => {
        const scoreA = Math.max(
          Number(a.totalScore) || 0,
          Number(a.profiles?.totalScore) || 0, 
          Number(a.platformData?.totalScore) || 0
        );
        
        const scoreB = Math.max(
          Number(b.totalScore) || 0,
          Number(b.profiles?.totalScore) || 0, 
          Number(b.platformData?.totalScore) || 0
        );
        
        return scoreB - scoreA;
      });
      
      const exportData = sortedData.map((user, index) => {
        const calculatedRank = index + 1;
        
        const totalScore = Math.max(
          Number(user.totalScore) || 0,
          Number(user.profiles?.totalScore) || 0,
          Number(user.platformData?.totalScore) || 0
        );
        
        const totalProblems = Math.max(
          Number(user.totalProblemsSolved) || 0,
          Number(user.problemStats?.totalProblemsSolved) || 0,
          Number(user.profiles?.problemsSolved) || 0
        );
        
        const platformData = user.platformData || {};
        const codingProfiles = user.codingProfiles || {};
        const profiles = user.profiles || {};
        const platforms = user.platforms || {};
        
        const getPlatformScore = (platform) => {
          return Math.max(
            Number(platforms[platform]?.score) || 0,
            Number(codingProfiles[platform]?.score) || 0,
            Number(platformData[platform]?.score) || 0,
            Number(user.platformScores?.[platform]) || 0
          );
        };
        
        const getPlatformProblems = (platform) => {
          return Math.max(
            Number(platforms[platform]?.problemsSolved) || 0,
            Number(codingProfiles[platform]?.problemsSolved) || 0,
            Number(platformData[platform]?.problemsSolved) || 0,
            Number(platformData[platform]?.totalSolved) || 0
          );
        };
        
        const getPlatformUsername = (platform) => {
          return platforms[platform]?.username || 
                 codingProfiles[platform]?.username || 
                 platformData[platform]?.username || 
                 profiles[platform] || 
                 '-';
        };
        
        const githubStats = user.githubStats || platforms.github || codingProfiles.github || {};
        
        return {
          'Rank': calculatedRank,
          'Name': user.name || '',
          'Roll Number': user.rollNumber || '-',
          'Department': user.department || platformData.department || '-',
          'Section': user.section || platformData.section || '-',
          'Email': user.email || '-',
          'Graduation Year': user.graduatingYear || platformData.graduatingYear || '-',
          'Total Score': totalScore,
          'Total Problems': totalProblems,
          
          'LeetCode Username': getPlatformUsername('leetcode'),
          'LeetCode Score': getPlatformScore('leetcode'),
          'LeetCode Problems': getPlatformProblems('leetcode'),
          'LeetCode Rating': platforms.leetcode?.rating || 
                             codingProfiles.leetcode?.rating || 
                             platformData.leetcode?.rating || 0,
          
          'CodeForces Username': getPlatformUsername('codeforces'),
          'CodeForces Score': getPlatformScore('codeforces'),
          'CodeForces Problems': getPlatformProblems('codeforces'),
          'CodeForces Rating': platforms.codeforces?.rating || 
                               codingProfiles.codeforces?.rating || 
                               platformData.codeforces?.rating || 0,
          
          'CodeChef Username': getPlatformUsername('codechef'),
          'CodeChef Score': getPlatformScore('codechef'),
          'CodeChef Problems': getPlatformProblems('codechef'),
          'CodeChef Rating': platforms.codechef?.rating || 
                             codingProfiles.codechef?.rating || 
                             platformData.codechef?.rating || 0,
          
          'GFG Username': getPlatformUsername('geeksforgeeks'),
          'GFG Score': getPlatformScore('geeksforgeeks'),
          'GFG Problems': getPlatformProblems('geeksforgeeks'),
          'GFG Rating': platforms.geeksforgeeks?.rating || 
                        platforms.geeksforgeeks?.codingScore ||
                        codingProfiles.geeksforgeeks?.rating || 
                        codingProfiles.geeksforgeeks?.codingScore || 
                        platformData.geeksforgeeks?.rating || 
                        platformData.geeksforgeeks?.codingScore || 0,
          
          'HackerRank Username': getPlatformUsername('hackerrank'),
          'HackerRank Score': getPlatformScore('hackerrank'),
          'HackerRank Problems': getPlatformProblems('hackerrank'),
          
          'GitHub Username': getPlatformUsername('github'),
          'GitHub Score': getPlatformScore('github'),
          'GitHub Repositories': githubStats.publicRepos || 0,
          'GitHub Stars': githubStats.starsReceived || 0,
          'GitHub Followers': githubStats.followers || 0,
        };
      });

      const workbook = new XLSX.Workbook();
      const worksheet = workbook.addWorksheet('Leaderboard');
      
      if (exportData.length > 0) {
        const headers = Object.keys(exportData[0]);
        worksheet.columns = headers.map(header => ({
          header,
          key: header,
          width: header.length + 5
        }));
        
        const colWidths = {
          'Rank': 5,
          'Name': 25,
          'Roll Number': 15,
          'Department': 20,
          'Section': 10,
          'Email': 25,
          'Graduation Year': 15,
          'Total Score': 10,
          'Total Problems': 12
        };
        
        worksheet.columns.forEach(column => {
          if (colWidths[column.header]) {
            column.width = colWidths[column.header];
          } else if (column.header.includes('Username')) {
            column.width = 20;
          } else if (column.header.includes('Score')) {
            column.width = 15;
          } else {
            column.width = 15;
          }
        });
      }
      
      exportData.forEach(data => {
        worksheet.addRow(data);
      });
      
      const dateCell = worksheet.getCell(`A${exportData.length + 3}`);
      dateCell.value = `Generated: ${new Date().toLocaleString()}`;
      
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '4167B8' }
      };
      worksheet.getRow(1).font = {
        bold: true,
        color: { argb: 'FFFFFF' }
      };
      
      toast.info('Generating Excel file...', { autoClose: 1500 });
      
      const buffer = await workbook.xlsx.writeBuffer();
      
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'CodeTracker_Detailed_Leaderboard.xlsx';
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast.success(`Successfully exported data for ${exportData.length} users`);
    } catch (error) {
      let errorMessage = 'Failed to export data. Please try again.';
      
      if (error.response) {
        errorMessage = `Server error ${error.response.status}: ${error.response.data?.message || 'Failed to fetch data'}`;
      } else if (error.request) {
        errorMessage = 'No response from server. Please check your connection.';
      }
      
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Effect to check for active sync job on component mount
  useEffect(() => {
    const checkForActiveSyncJob = async () => {
      if (!token) return;

      try {
        activeSyncState.setInProgress(false);
      } catch (err) {
        // Handle error if needed
      }
    };

    checkForActiveSyncJob();
  }, [token]);

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
                startIcon={<FileDownloadIcon />}
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
                  <Box 
                    sx={{ 
                      bgcolor: 'rgba(76, 175, 80, 0.1)', 
                      color: '#4CAF50', 
                      width: 40, 
                      height: 40, 
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mr: 2
                    }}
                  >
                    <People />
                  </Box>
                  <Typography color="textSecondary" fontWeight="medium">
                    Total Users
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {stats?.userStats.totalUsers || 0}
                  </Typography>
                  <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography variant="body2" color="primary.main" fontWeight="medium">
                        Admin Users
                      </Typography>
                      <Typography variant="h6">
                        {stats?.userStats.adminUsers || 0}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" color="text.secondary" fontWeight="medium">
                        Regular Users
                      </Typography>
                      <Typography variant="h6">
                        {stats?.userStats.regularUsers || 0}
                      </Typography>
                    </Box>
                  </Box>
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
                  <Box 
                    sx={{ 
                      bgcolor: 'rgba(103, 58, 183, 0.1)', 
                      color: '#673AB7', 
                      width: 40, 
                      height: 40, 
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mr: 2
                    }}
                  >
                    <TrendingUp />
                  </Box>
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
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
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
                  <Box 
                    sx={{ 
                      bgcolor: 'rgba(33, 150, 243, 0.1)', 
                      color: '#2196F3', 
                      width: 40, 
                      height: 40, 
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mr: 2
                    }}
                  >
                    <Code />
                  </Box>
                  <Typography color="textSecondary" fontWeight="medium">
                    Total Platforms
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {stats?.platformEngagement?.length || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
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
                  <Box 
                    sx={{ 
                      bgcolor: 'rgba(244, 67, 54, 0.1)', 
                      color: '#F44336', 
                      width: 40, 
                      height: 40, 
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mr: 2
                    }}
                  >
                    <PieChartIcon />
                  </Box>
                  <Typography color="textSecondary" fontWeight="medium">
                    Departments
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {stats?.departmentStats?.length || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
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
                  <Box 
                    sx={{ 
                      bgcolor: 'rgba(255, 152, 0, 0.1)', 
                      color: '#FF9800', 
                      width: 40, 
                      height: 40, 
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mr: 2
                    }}
                  >
                    <LeaderboardIcon />
                  </Box>
                  <Typography color="textSecondary" fontWeight="medium">
                    Top Performer
                  </Typography>
                </Box>
                <Box>
                  <Typography variant={isMobile ? "h6" : "h6"} fontWeight="bold" noWrap>
                    {stats?.userStats.topUsers?.[0]?.name || 'N/A'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
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
            variant={isMobile ? "scrollable" : "fullWidth"}
            scrollButtons="auto"
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
            <Tab label="User Registrations" icon={<CalendarIcon />} iconPosition={isMobile ? "top" : "start"} />
            <Tab label="Profile Sync" icon={<SyncIcon />} iconPosition={isMobile ? "top" : "start"} />
            <Tab label="Reported Issues" icon={<BugReportIcon />} iconPosition={isMobile ? "top" : "start"} />
          </Tabs>
        </Box>

        {/* Tab Content */}
        {activeTab === 0 && (
          <ProblemAnalyticsTab 
            stats={stats}
            loading={loading}
            selectedTimeframe={selectedTimeframe}
            handleTimeframeChange={handleTimeframeChange}
            handleRefresh={handleRefresh}
            isMobile={isMobile}
            isTablet={isTablet}
            theme={theme}
          />
        )}
        
        {activeTab === 1 && (
          <DepartmentStatsTab 
            stats={stats}
            loading={loading}
            activePieIndex={activePieIndex}
            onPieEnter={onPieEnter}
            isMobile={isMobile}
            theme={theme}
          />
        )}
        
        {activeTab === 2 && (
          <UserRegistrationsTab 
            userRegistrationStats={userRegistrationStats}
            loading={loading}
            registrationTimeframe={registrationTimeframe}
            setRegistrationTimeframe={setRegistrationTimeframe}
            fetchUserRegistrationStats={fetchUserRegistrationStats}
            isMobile={isMobile}
            theme={theme}
          />
        )}
        
        {activeTab === 3 && (
          <ProfileSyncTab token={token} />
        )}
        
        {activeTab === 4 && (
          <ReportIssuesTab 
            token={token}
            isMobile={isMobile}
            theme={theme}
          />
        )}
      </Container>
    </Box>
  );
};

export default AdminDashboard;