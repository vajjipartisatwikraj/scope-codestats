import React from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  IconButton,
  FormControl,
  Select,
  InputLabel,
  MenuItem,
  Tooltip,
  CircularProgress
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  BarChart as BarChartIcon
} from '@mui/icons-material';
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
  Cell
} from 'recharts';

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

const ProblemAnalyticsTab = ({ 
  stats, 
  loading, 
  selectedTimeframe, 
  handleTimeframeChange, 
  handleRefresh,
  isMobile,
  isTablet,
  theme
}) => {
  return (
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
          
          <Box sx={{ 
            height: isTablet ? 300 : 400, 
            mt: isMobile ? 1 : 2,
            minHeight: 300,
            minWidth: 200,
            position: 'relative'
          }}>
            <ResponsiveContainer width="100%" height="100%" aspect={isTablet ? 1.5 : 2}>
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
                <Box 
                  sx={{ 
                    bgcolor: index === 0 ? '#FFC107' : index === 1 ? '#9E9E9E' : index === 2 ? '#CD7F32' : theme.palette.primary.main,
                    color: 'white',
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mr: 2
                  }}
                >
                  {index + 1}
                </Box>
                <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
                  <Typography variant="body1" fontWeight="medium" noWrap>
                    {user.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" noWrap>
                    {user.department || 'No department'}
                  </Typography>
                </Box>
                <Box 
                  sx={{ 
                    fontWeight: 'bold',
                    bgcolor: index === 0 ? 'rgba(255, 193, 7, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                    color: index === 0 ? '#FF6D00' : 'text.primary',
                    px: 1.5,
                    py: 0.5,
                    borderRadius: 1
                  }}
                >
                  {user.totalScore} pts
                </Box>
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
          
          <Box sx={{ 
            height: isMobile ? 300 : 400, 
            mt: isMobile ? 2 : 3,
            minHeight: 300,
            minWidth: 200,
            position: 'relative'
          }}>
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
              <ResponsiveContainer width="100%" height="100%" aspect={isMobile ? 1.2 : 2}>
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
  );
};

export default ProblemAnalyticsTab; 