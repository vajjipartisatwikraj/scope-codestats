import React from 'react';
import { Box, Grid, Typography, Tooltip } from '@mui/material';
import { formatTooltipDate, getInnerGlassStyle, getLiquidGlassStyle } from './dashboardUtils';

const DashboardPerformance = ({ dashboardStats, loading, darkMode }) => {
  if (loading || !dashboardStats) {
    return null;
  }

  return (
    <Box
      sx={{
        ...getLiquidGlassStyle(darkMode),
        width: '100%',
        maxWidth: '1200px',
        mx: 'auto',
        mb: 0,
        opacity: 0,
        transform: 'translateY(30px)',
        animation: `slideInUp 0.6s ease-out 0.2s forwards`,
        '@keyframes slideInUp': {
          '0%': {
            opacity: 0,
            transform: 'translateY(30px)'
          },
          '100%': {
            opacity: 1,
            transform: 'translateY(0)'
          }
        }
      }}
    >
      {/* Header Section */}
      <Box
        sx={{ 
          px: 3,
          py: 1.5,
          borderBottom: darkMode 
            ? '0.5px solid rgba(255, 255, 255, 0.10)' 
            : '0.5px solid rgba(0, 0, 0, 0.08)',
          background: 'transparent',
        }}
      >
        <Typography
          variant="h6"
          sx={{
            fontWeight: 500,
            fontSize: '1.1rem',
            color: darkMode ? '#FFFFFF' : 'rgba(0, 0, 0, 0.75)',
            letterSpacing: '-0.01em',
          }}
        >
          Your Performance Overview
        </Typography>
      </Box>

      {/* Content Section */}
      <Box sx={{ p: 3 }}>
        <Grid container spacing={3}>
          {/* SCOPE Score Card */}
          <Grid item xs={12} md={3}>
            <Box sx={{ 
              ...getInnerGlassStyle(darkMode),
              p: 2.5, 
              textAlign: 'center',
              background: darkMode 
                ? 'linear-gradient(135deg, rgba(33,150,243,0.15) 0%, rgba(0,0,0,0.6) 100%)'
                : 'linear-gradient(135deg, rgba(33,150,243,0.25) 0%, rgba(33,150,243,0.15) 100%)',
              borderColor: darkMode ? 'rgba(33,150,243,0.3)' : 'rgba(33,150,243,0.5)'
            }}>
              <Typography variant="h4" sx={{ 
                color: '#2196F3',
                fontWeight: 700,
                fontFamily: 'nekst, monospace',
                fontSize: '2rem'
              }}>
                {dashboardStats?.currentScore?.toLocaleString() || '0'}
              </Typography>
              <Typography variant="body2" sx={{ 
                color: darkMode ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.7)',
                fontWeight: 500,
                mt: 0.5
              }}>
                SCOPE Score
              </Typography>
              {dashboardStats?.scoreChangeLastMonth && dashboardStats.scoreChangeLastMonth !== 0 && (
                <Tooltip 
                  title={
                    <Box sx={{ py: 0.5, px: 0.5 }}>
                      <Typography variant="caption" sx={{ fontWeight: 600, display: 'block' }}>
                        Compared to:
                      </Typography>
                      <Typography variant="caption" sx={{ fontSize: '0.85rem' }}>
                        {dashboardStats?.pastDate ? formatTooltipDate(dashboardStats.pastDate) : 'N/A'}
                      </Typography>
                    </Box>
                  }
                  arrow
                  placement="bottom"
                  componentsProps={{
                    tooltip: {
                      sx: {
                        bgcolor: darkMode ? 'rgba(30, 30, 30, 0.98)' : 'rgba(50, 50, 50, 0.95)',
                        color: '#fff',
                        borderRadius: '8px',
                        padding: '8px 12px',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                        border: `1px solid ${darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.2)'}`,
                        backdropFilter: 'blur(10px)',
                        fontSize: '0.8rem'
                      }
                    },
                    arrow: {
                      sx: {
                        color: darkMode ? 'rgba(30, 30, 30, 0.98)' : 'rgba(50, 50, 50, 0.95)',
                        '&::before': {
                          border: `1px solid ${darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.2)'}`,
                        }
                      }
                    }
                  }}
                >
                  <Typography variant="caption" sx={{ 
                    color: dashboardStats.scoreChangeLastMonth > 0 ? '#4CAF50' : '#f44336',
                    fontWeight: 600,
                    display: 'block',
                    mt: 0.5,
                    cursor: 'help',
                    '&:hover': {
                      opacity: 0.8
                    }
                  }}>
                    {dashboardStats.scoreChangeLastMonth > 0 ? '+' : ''}{dashboardStats.scoreChangeLastMonth} (30d)
                  </Typography>
                </Tooltip>
              )}
            </Box>
          </Grid>
          
          {/* Global Rank Card */}
          <Grid item xs={12} md={3}>
            <Box sx={{ 
              ...getInnerGlassStyle(darkMode),
              p: 2.5, 
              textAlign: 'center',
              background: darkMode 
                ? 'linear-gradient(135deg, rgba(255,193,7,0.15) 0%, rgba(0,0,0,0.6) 100%)'
                : 'linear-gradient(135deg, rgba(255,193,7,0.25) 0%, rgba(255,193,7,0.15) 100%)',
              borderColor: darkMode ? 'rgba(255,193,7,0.3)' : 'rgba(255,193,7,0.5)'
            }}>
              <Typography variant="h4" sx={{ 
                color: '#FFC107',
                fontWeight: 700,
                fontFamily: 'nekst, monospace',
                fontSize: '2rem'
              }}>
                #{dashboardStats?.currentRank > 0 ? dashboardStats.currentRank : 'N/A'}
              </Typography>
              <Typography variant="body2" sx={{ 
                color: darkMode ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.7)',
                fontWeight: 500,
                mt: 0.5
              }}>
                Global Rank
              </Typography>
              {dashboardStats?.rankChangeLastMonth && dashboardStats.rankChangeLastMonth !== 0 && (
                <Tooltip 
                  title={
                    <Box sx={{ py: 0.5, px: 0.5 }}>
                      <Typography variant="caption" sx={{ fontWeight: 600, display: 'block' }}>
                        Compared to:
                      </Typography>
                      <Typography variant="caption" sx={{ fontSize: '0.85rem' }}>
                        {dashboardStats?.pastDate ? formatTooltipDate(dashboardStats.pastDate) : 'N/A'}
                      </Typography>
                    </Box>
                  }
                  arrow
                  placement="bottom"
                  componentsProps={{
                    tooltip: {
                      sx: {
                        bgcolor: darkMode ? 'rgba(30, 30, 30, 0.98)' : 'rgba(50, 50, 50, 0.95)',
                        color: '#fff',
                        borderRadius: '8px',
                        padding: '8px 12px',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                        border: `1px solid ${darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.2)'}`,
                        backdropFilter: 'blur(10px)',
                        fontSize: '0.8rem'
                      }
                    },
                    arrow: {
                      sx: {
                        color: darkMode ? 'rgba(30, 30, 30, 0.98)' : 'rgba(50, 50, 50, 0.95)',
                        '&::before': {
                          border: `1px solid ${darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.2)'}`,
                        }
                      }
                    }
                  }}
                >
                  <Typography variant="caption" sx={{ 
                    color: dashboardStats.rankChangeLastMonth > 0 ? '#4CAF50' : '#f44336',
                    fontWeight: 600,
                    display: 'block',
                    mt: 0.5,
                    cursor: 'help',
                    '&:hover': {
                      opacity: 0.8
                    }
                  }}>
                    {dashboardStats.rankChangeLastMonth > 0 ? '↑' : '↓'}{Math.abs(dashboardStats.rankChangeLastMonth)} (30d)
                  </Typography>
                </Tooltip>
              )}
            </Box>
          </Grid>
          
          {/* Problems Solved Card */}
          <Grid item xs={12} md={3}>
            <Box sx={{ 
              ...getInnerGlassStyle(darkMode),
              p: 2.5, 
              textAlign: 'center',
              background: darkMode 
                ? 'linear-gradient(135deg, rgba(76,175,80,0.15) 0%, rgba(0,0,0,0.6) 100%)'
                : 'linear-gradient(135deg, rgba(76,175,80,0.25) 0%, rgba(76,175,80,0.15) 100%)',
              borderColor: darkMode ? 'rgba(76,175,80,0.3)' : 'rgba(76,175,80,0.5)'
            }}>
              <Typography variant="h4" sx={{ 
                color: '#4CAF50',
                fontWeight: 700,
                fontFamily: 'nekst, monospace',
                fontSize: '2rem'
              }}>
                {dashboardStats?.currentProblems || '0'}
              </Typography>
              <Typography variant="body2" sx={{ 
                color: darkMode ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.7)',
                fontWeight: 500,
                mt: 0.5
              }}>
                Problems Solved
              </Typography>
              {dashboardStats?.problemsChangeLastMonth && dashboardStats.problemsChangeLastMonth !== 0 && (
                <Tooltip 
                  title={
                    <Box sx={{ py: 0.5, px: 0.5 }}>
                      <Typography variant="caption" sx={{ fontWeight: 600, display: 'block' }}>
                        Compared to:
                      </Typography>
                      <Typography variant="caption" sx={{ fontSize: '0.85rem' }}>
                        {dashboardStats?.pastDate ? formatTooltipDate(dashboardStats.pastDate) : 'N/A'}
                      </Typography>
                    </Box>
                  }
                  arrow
                  placement="bottom"
                  componentsProps={{
                    tooltip: {
                      sx: {
                        bgcolor: darkMode ? 'rgba(30, 30, 30, 0.98)' : 'rgba(50, 50, 50, 0.95)',
                        color: '#fff',
                        borderRadius: '8px',
                        padding: '8px 12px',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                        border: `1px solid ${darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.2)'}`,
                        backdropFilter: 'blur(10px)',
                        fontSize: '0.8rem'
                      }
                    },
                    arrow: {
                      sx: {
                        color: darkMode ? 'rgba(30, 30, 30, 0.98)' : 'rgba(50, 50, 50, 0.95)',
                        '&::before': {
                          border: `1px solid ${darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.2)'}`,
                        }
                      }
                    }
                  }}
                >
                  <Typography variant="caption" sx={{ 
                    color: dashboardStats.problemsChangeLastMonth > 0 ? '#4CAF50' : '#f44336',
                    fontWeight: 600,
                    display: 'block',
                    mt: 0.5,
                    cursor: 'help',
                    '&:hover': {
                      opacity: 0.8
                    }
                  }}>
                    {dashboardStats.problemsChangeLastMonth > 0 ? '+' : ''}{dashboardStats.problemsChangeLastMonth} (30d)
                  </Typography>
                </Tooltip>
              )}
            </Box>
          </Grid>
          
          {/* Active Days Card */}
          <Grid item xs={12} md={3}>
            <Box sx={{ 
              ...getInnerGlassStyle(darkMode),
              p: 2.5, 
              textAlign: 'center',
              background: darkMode 
                ? 'linear-gradient(135deg, rgba(156,39,176,0.15) 0%, rgba(0,0,0,0.6) 100%)'
                : 'linear-gradient(135deg, rgba(156,39,176,0.25) 0%, rgba(156,39,176,0.15) 100%)',
              borderColor: darkMode ? 'rgba(156,39,176,0.3)' : 'rgba(156,39,176,0.5)'
            }}>
              <Typography variant="h4" sx={{ 
                color: '#9C27B0',
                fontWeight: 700,
                fontFamily: 'nekst, monospace',
                fontSize: '2rem'
              }}>
                {dashboardStats?.totalActiveDays || 0}/365
              </Typography>
              <Typography variant="body2" sx={{ 
                color: darkMode ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.7)',
                fontWeight: 500,
                mt: 0.5
              }}>
                Active Days
              </Typography>
              <Typography variant="caption" sx={{ 
                color: '#9C27B0',
                fontWeight: 600,
                display: 'block',
                mt: 0.5
              }}>
                {Math.round((dashboardStats?.totalActiveDays / 365) * 100) || 0}% Active
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};

export default DashboardPerformance;
