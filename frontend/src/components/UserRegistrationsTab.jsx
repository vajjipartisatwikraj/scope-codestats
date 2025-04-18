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
  CircularProgress,
  Card,
  CardContent
} from '@mui/material';
import {
  Refresh as RefreshIcon
} from '@mui/icons-material';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';

const UserRegistrationsTab = ({ 
  userRegistrationStats, 
  loading, 
  registrationTimeframe, 
  setRegistrationTimeframe,
  fetchUserRegistrationStats,
  isMobile,
  theme
}) => {
  return (
    <Grid container spacing={3}>
      {/* Registration Statistics Header */}
      <Grid item xs={12}>
        <Paper sx={{ p: 2, borderRadius: 2, mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
            <Typography variant="h6" sx={{ flexGrow: 1 }}>
              User Registration Analytics
            </Typography>
            
            <FormControl sx={{ minWidth: 150 }}>
              <InputLabel id="registration-timeframe-select-label">View By</InputLabel>
              <Select
                labelId="registration-timeframe-select-label"
                value={registrationTimeframe}
                label="View By"
                onChange={(e) => setRegistrationTimeframe(e.target.value)}
                size="small"
              >
                <MenuItem value="daily">Daily</MenuItem>
                <MenuItem value="weekly">Weekly</MenuItem>
                <MenuItem value="monthly">Monthly</MenuItem>
                <MenuItem value="department">By Department</MenuItem>
              </Select>
            </FormControl>
            
            <Tooltip title="Refresh data">
              <IconButton onClick={fetchUserRegistrationStats} size="small">
                <RefreshIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Paper>
      </Grid>
      
      {/* Summary Cards */}
      <Grid item xs={12}>
        <Grid container spacing={2}>
          {registrationTimeframe !== 'department' && (
            <Grid item xs={6} md={4}>
              <Card sx={{ 
                borderRadius: 2, 
                boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                backgroundColor: theme.palette.mode === 'dark' ? '#1E1E1E' : '#fff',
                overflow: 'hidden',
                height: '100%'
              }}>
                <Box sx={{ height: 5, bgcolor: '#4CAF50' }}></Box>
                <CardContent>
                  <Typography color="textSecondary" variant="body2" gutterBottom>
                    {registrationTimeframe === 'daily' ? "Today's Registrations" : 
                     registrationTimeframe === 'weekly' ? "This Week" : 
                     "This Month"}
                  </Typography>
                  <Typography variant="h5" fontWeight="bold">
                    {registrationTimeframe === 'daily' ? (userRegistrationStats?.summary?.today || 0) : 
                     registrationTimeframe === 'weekly' ? (userRegistrationStats?.summary?.thisWeek || 0) : 
                     (userRegistrationStats?.summary?.thisMonth || 0)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          )}
          
          <Grid item xs={6} md={registrationTimeframe === 'department' ? 6 : 4}>
            <Card sx={{ 
              borderRadius: 2, 
              boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
              backgroundColor: theme.palette.mode === 'dark' ? '#1E1E1E' : '#fff',
              overflow: 'hidden',
              height: '100%'
            }}>
              <Box sx={{ height: 5, bgcolor: '#FF9800' }}></Box>
              <CardContent>
                <Typography color="textSecondary" variant="body2" gutterBottom>
                  Total Users
                </Typography>
                <Typography variant="h5" fontWeight="bold">
                  {userRegistrationStats?.summary?.totalUsers || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={6} md={registrationTimeframe === 'department' ? 6 : 4}>
            <Card sx={{ 
              borderRadius: 2, 
              boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
              backgroundColor: theme.palette.mode === 'dark' ? '#1E1E1E' : '#fff',
              overflow: 'hidden',
              height: '100%'
            }}>
              <Box sx={{ height: 5, bgcolor: '#00BCD4' }}></Box>
              <CardContent>
                <Typography color="textSecondary" variant="body2" gutterBottom>
                  Regular Users
                </Typography>
                <Typography variant="h5" fontWeight="bold">
                  {userRegistrationStats?.summary?.regularUsers || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Grid>
      
      {/* Registration Chart */}
      <Grid item xs={12}>
        <Paper sx={{ p: { xs: 2, md: 3 }, borderRadius: 2 }}>
          <Typography variant="h6" gutterBottom>
            {registrationTimeframe === 'daily' ? 'Daily Registrations (Last 30 Days)' : 
             registrationTimeframe === 'weekly' ? 'Weekly Registrations (Last 12 Weeks)' : 
             registrationTimeframe === 'monthly' ? 'Monthly Registrations (Last 12 Months)' :
             'Registration by Department'}
          </Typography>
          
          <Box sx={{ 
            height: isMobile ? 300 : 400, 
            mt: 3,
            position: 'relative'
          }}>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <CircularProgress />
              </Box>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                {registrationTimeframe === 'department' ? (
                  <BarChart
                    data={userRegistrationStats?.departmentRegistrations || []}
                    margin={{ top: 20, right: 30, left: 30, bottom: isMobile ? 130 : 50 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis 
                      dataKey="department" 
                      tick={{ fontSize: isMobile ? 10 : 12 }}
                      angle={-45}
                      textAnchor="end"
                      height={isMobile ? 130 : 60}
                      interval={0}
                    />
                    <YAxis />
                    <RechartsTooltip 
                      formatter={(value, name) => {
                        if (name === 'regularCount') return [`${value} users`, 'Users'];
                        return [value, name];
                      }}
                    />
                    <Legend />
                    <Bar dataKey="regularCount" name="Regular Users" fill="#4CAF50" />
                  </BarChart>
                ) : (
                  <AreaChart 
                    data={registrationTimeframe === 'daily' 
                      ? userRegistrationStats?.dailyRegistrations?.map(item => ({
                          date: item._id,
                          display: new Date(item._id).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                          regularCount: item.regularCount,
                        }))
                      : registrationTimeframe === 'weekly'
                      ? userRegistrationStats?.weeklyRegistrations?.map(item => ({
                          date: item.weekLabel,
                          display: item.weekLabel,
                          regularCount: item.regularCount,
                        }))
                      : userRegistrationStats?.monthlyRegistrations?.map(item => ({
                          date: item.monthLabel,
                          display: item.monthLabel,
                          regularCount: item.regularCount,
                        }))
                    }
                    margin={{ top: 20, right: 30, left: 30, bottom: isMobile ? 60 : 30 }}
                  >
                    <defs>
                      <linearGradient id="colorRegular" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4CAF50" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#4CAF50" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis 
                      dataKey="display" 
                      tick={{ fontSize: isMobile ? 10 : 12 }}
                      angle={-45}
                      textAnchor="end"
                      height={isMobile ? 60 : 30}
                      interval={registrationTimeframe === 'daily' ? (isMobile ? 3 : 1) : 0}
                    />
                    <YAxis />
                    <RechartsTooltip 
                      formatter={(value, name) => {
                        if (name === 'regularCount') return [`${value} users`, 'Users'];
                        return [value, name];
                      }}
                      labelFormatter={(label) => {
                        return `Date: ${label}`;
                      }}
                    />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="regularCount" 
                      name="Users"
                      stroke="#4CAF50" 
                      fillOpacity={1} 
                      fill="url(#colorRegular)" 
                    />
                  </AreaChart>
                )}
              </ResponsiveContainer>
            )}
          </Box>
        </Paper>
      </Grid>
    </Grid>
  );
};

export default UserRegistrationsTab; 