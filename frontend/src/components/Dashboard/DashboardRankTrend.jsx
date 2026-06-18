import React from 'react';
import { Box, Typography, Button, Grid, CircularProgress, Chip, useMediaQuery, useTheme as useMuiTheme } from '@mui/material';
import { ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip as RechartsTooltip } from 'recharts';
import { getLiquidGlassStyle, getInnerGlassStyle, getButtonGlassStyle } from './dashboardUtils';

/**
 * Dashboard Rank Trend Component
 * Displays user's rank progression over time with statistics and area chart
 * 
 * Props:
 * - rankHistory: Object containing rank data points and statistics
 * - rankLoading: Boolean indicating if data is being fetched
 * - rankTimeFilter: String ('weekly', 'monthly', 'yearly')
 * - setRankTimeFilter: Function to update time filter
 * - darkMode: Boolean for theme styling
 * - rankStats: Object with calculated statistics (current, best, average, trend, trendText)
 */
const DashboardRankTrend = ({ rankHistory, rankLoading, rankTimeFilter, setRankTimeFilter, darkMode, rankStats }) => {
  const muiTheme = useMuiTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('sm'));

  return (
    <Box
      sx={{
        ...getLiquidGlassStyle(darkMode),
        width: '100%',
        maxWidth: '1200px',
        mx: 'auto',
        mb: 0,
      }}
    >
      {/* Header with Time Filters */}
      <Box
        sx={{ 
          px: { xs: 2, sm: 3 },
          py: { xs: 1.5, sm: 1.5 },
          borderBottom: darkMode 
            ? '0.5px solid rgba(255, 255, 255, 0.10)' 
            : '0.5px solid rgba(0, 0, 0, 0.08)',
          background: 'transparent',
          display: 'flex', 
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between', 
          alignItems: { xs: 'flex-start', sm: 'center' },
          gap: { xs: 1.5, sm: 0 }
        }}
      >
        <Typography
          variant="h6"
          sx={{
            fontWeight: 500,
            fontSize: { xs: '1rem', sm: '1.1rem' },
            color: darkMode ? '#FFFFFF' : 'rgba(0, 0, 0, 0.75)',
            letterSpacing: '-0.01em',
          }}
        >
          Your Rank Trend
        </Typography>
        
        {/* Time Filter Buttons */}
        <Box sx={{ display: 'flex', gap: 1, width: { xs: '100%', sm: 'auto' } }}>
          {['weekly', 'monthly', 'yearly'].map((filter) => (
            <Button
              key={filter}
              size="small"
              variant={rankTimeFilter === filter ? 'contained' : 'outlined'}
              onClick={() => setRankTimeFilter(filter)}
              sx={{
                ...getButtonGlassStyle(darkMode, rankTimeFilter === filter),
                minWidth: { xs: 'auto', sm: '70px' },
                flex: { xs: 1, sm: 'none' },
                height: '32px',
                fontSize: '0.75rem',
                textTransform: 'capitalize',
                borderRadius: '16px',
              }}
            >
              {filter === 'weekly' ? 'Week' : filter === 'monthly' ? 'Month' : 'Year'}
            </Button>
          ))}
        </Box>
      </Box>

      {/* Content Section */}
      <Box sx={{ p: { xs: 2, sm: 2.5, md: 3 } }}>
        {/* Grid Layout - Statistics on Left, Chart on Right */}
        <Grid container spacing={{ xs: 2, sm: 2.5, md: 3 }} alignItems="stretch">
          {/* Rank Statistics - Left Side */}
          <Grid item xs={12} md={4}>
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: 2,
              height: '100%',
              justifyContent: 'space-between'
            }}>
              {/* Current Rank */}
              <Box sx={{ 
                ...getInnerGlassStyle(darkMode),
                p: { xs: 1.5, sm: 2 }, 
                textAlign: 'center'
              }}>
                <Typography variant="h5" sx={{ 
                  color: '#0585E0',
                  fontWeight: 600,
                  fontFamily: 'nekst, monospace',
                  fontSize: { xs: '1.5rem', sm: '1.8rem' }
                }}>
                  {rankStats.current || 'N/A'}
                </Typography>
                <Typography variant="caption" sx={{ 
                  color: darkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)',
                  fontSize: { xs: '0.7rem', sm: '0.75rem' },
                  fontWeight: 500
                }}>
                  Current Rank
                </Typography>
              </Box>
              
              {/* Best and Average Rank */}
              <Box sx={{ display: 'flex', gap: { xs: 1, sm: 1.5 } }}>
                <Box sx={{ 
                  ...getInnerGlassStyle(darkMode),
                  flex: 1,
                  p: { xs: 1.25, sm: 1.5 }, 
                  background: darkMode 
                    ? 'linear-gradient(135deg, rgba(76,175,80,0.15) 0%, rgba(0,0,0,0.6) 100%)'
                    : 'linear-gradient(135deg, rgba(76,175,80,0.25) 0%, rgba(76,175,80,0.15) 100%)',
                  borderColor: darkMode ? 'rgba(76,175,80,0.3)' : 'rgba(76,175,80,0.5)',
                  textAlign: 'center'
                }}>
                  <Typography variant="h6" sx={{ 
                    color: '#4CAF50',
                    fontWeight: 600,
                    fontSize: { xs: '0.85rem', sm: '0.95rem' }
                  }}>
                    {rankStats.best || 'N/A'}
                  </Typography>
                  <Typography variant="caption" sx={{ 
                    color: darkMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)',
                    fontSize: { xs: '0.6rem', sm: '0.65rem' }
                  }}>
                    Best
                  </Typography>
                </Box>
                
                <Box sx={{ 
                  ...getInnerGlassStyle(darkMode),
                  flex: 1,
                  p: { xs: 1.25, sm: 1.5 }, 
                  background: darkMode 
                    ? 'linear-gradient(135deg, rgba(255,193,7,0.15) 0%, rgba(0,0,0,0.6) 100%)'
                    : 'linear-gradient(135deg, rgba(255,193,7,0.25) 0%, rgba(255,193,7,0.15) 100%)',
                  borderColor: darkMode ? 'rgba(255,193,7,0.3)' : 'rgba(255,193,7,0.5)',
                  textAlign: 'center'
                }}>
                  <Typography variant="h6" sx={{ 
                    color: '#FFC107',
                    fontWeight: 600,
                    fontSize: { xs: '0.85rem', sm: '0.95rem' }
                  }}>
                    {rankStats.average || 'N/A'}
                  </Typography>
                  <Typography variant="caption" sx={{ 
                    color: darkMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)',
                    fontSize: { xs: '0.6rem', sm: '0.65rem' }
                  }}>
                    Average
                  </Typography>
                </Box>
              </Box>
              
              {/* Trend Analysis */}
              <Box sx={{ 
                ...getInnerGlassStyle(darkMode),
                p: { xs: 1.5, sm: 2 }, 
                textAlign: 'center',
                flexGrow: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center'
              }}>
                <Chip
                  label={
                    rankStats.trend === 'improving' ? 'Improving ↑' :
                    rankStats.trend === 'declining' ? 'Declining ↓' :
                    rankStats.trend === 'stable' ? 'Stable →' :
                    'No Data'
                  }
                  color={
                    rankStats.trend === 'improving' ? 'success' :
                    rankStats.trend === 'declining' ? 'error' :
                    rankStats.trend === 'stable' ? 'warning' :
                    'default'
                  }
                  sx={{ 
                    fontWeight: 600,
                    fontSize: { xs: '0.7rem', sm: '0.75rem' }
                  }}
                />
                <Typography variant="caption" sx={{ 
                  color: darkMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)',
                  fontSize: { xs: '0.65rem', sm: '0.7rem' },
                  display: 'block',
                  mt: 1
                }}>
                  {rankStats.trendText || 'No trend data'}
                </Typography>
              </Box>
            </Box>
          </Grid>
          
          {/* Rank Trend Chart - Right Side */}
          <Grid item xs={12} md={8}>
            <Box sx={{
              ...getInnerGlassStyle(darkMode),
              p: { xs: 1.5, sm: 2, md: 2.5 },
              height: { xs: '280px', sm: '300px', md: '320px' },
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
              overflow: 'hidden',
            }}>
              {/* Header with platform name and current rank */}
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: { xs: 1.5, sm: 2 }
              }}>
                <Box>
                  <Typography variant="h6" sx={{
                    color: '#0585E0',
                    fontWeight: 700,
                    fontSize: '1.1rem',
                    textTransform: 'capitalize'
                  }}>
                    Overall Rank Trend
                  </Typography>
                  <Typography variant="caption" sx={{
                    color: darkMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)',
                    fontSize: '0.75rem'
                  }}>
                    {rankTimeFilter === 'weekly' ? 'Weekly Progress' : 
                     rankTimeFilter === 'monthly' ? 'Monthly Progress' : 
                     'Yearly Progress'}
                  </Typography>
                </Box>
                
                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="h5" sx={{
                    color: '#0585E0',
                    fontWeight: 700,
                    fontSize: '1.4rem'
                  }}>
                    {rankStats.current || 'N/A'}
                  </Typography>
                  <Typography variant="caption" sx={{
                    color: rankStats.trend === 'improving' ? '#4CAF50' : 
                           rankStats.trend === 'declining' ? '#f44336' : '#FFC107',
                    fontWeight: 600,
                    fontSize: '0.7rem'
                  }}>
                    {rankStats.trend === 'improving' ? '↑' : 
                     rankStats.trend === 'declining' ? '↓' : '→'}
                  </Typography>
                </Box>
              </Box>

              {/* Rank Trend Area Chart */}
              <Box sx={{ flexGrow: 1, height: '240px' }}>
                {rankLoading ? (
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      height: '100%',
                      flexDirection: 'column',
                      gap: 2
                    }}
                  >
                    <CircularProgress size={32} sx={{ color: '#0585E0' }} />
                    <Typography variant="caption" sx={{ 
                      color: darkMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)',
                      fontSize: '0.75rem'
                    }}>
                      Loading chart data...
                    </Typography>
                  </Box>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={(() => {
                      // Use real rank data from rankHistory
                      if (!rankHistory || !rankHistory.data) {
                        return [];
                      }
                      
                      return rankHistory.data
                        .filter(item => item.rank !== null && item.rank !== undefined && item.rank > 0)
                        .map(item => ({
                          period: item.period,
                          rank: item.rank
                        }));
                    })()}
                    margin={isMobile 
                      ? { top: 5, right: 0, left: 0, bottom: 5 }
                      : { top: 10, right: 10, left: 5, bottom: 10 }
                    }
                  >
                    <defs>
                      <linearGradient id="colorRank" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0585E0" stopOpacity={0.8}/>
                        <stop offset="50%" stopColor="#0585E0" stopOpacity={0.4}/>
                        <stop offset="100%" stopColor="#0585E0" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid 
                      strokeDasharray="3 3" 
                      stroke={darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'} 
                      horizontal={true}
                      vertical={false}
                    />
                    <XAxis 
                      dataKey="period" 
                      axisLine={false}
                      tickLine={false}
                      tick={{
                        fontSize: isMobile ? 9 : 11,
                        fill: darkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)'
                      }}
                    />
                    <YAxis 
                      axisLine={false}
                      tickLine={false}
                      tick={{
                        fontSize: isMobile ? 8 : 10,
                        fill: darkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)'
                      }}
                      tickFormatter={(value) => `#${value}`}
                      domain={['dataMin', 'dataMax']}
                      scale="linear"
                      reversed={true}
                      width={isMobile ? 28 : 35}
                    />
                    <RechartsTooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const rankValue = payload[0].value;
                          
                          return (
                            <Box sx={{
                              background: darkMode
                                ? 'rgba(255, 255, 255, 0.05)'
                                : 'rgba(255, 255, 255, 0.15)',
                              backdropFilter: 'blur(100px) saturate(180%)',
                              WebkitBackdropFilter: 'blur(100px) saturate(180%)',
                              border: darkMode 
                                ? '1px solid rgba(255, 255, 255, 0.18)'
                                : '1px solid rgba(255, 255, 255, 0.4)',
                              borderRadius: '14px',
                              overflow: 'hidden',
                              boxShadow: darkMode
                                ? `
                                  0 8px 32px rgba(0, 0, 0, 0.4),
                                  0 2px 8px rgba(0, 0, 0, 0.2),
                                  inset 0 1px 0 rgba(255, 255, 255, 0.15),
                                  inset 0 -1px 0 rgba(0, 0, 0, 0.1)
                                `
                                : `
                                  0 8px 32px rgba(0, 0, 0, 0.12),
                                  0 2px 8px rgba(0, 0, 0, 0.08),
                                  inset 0 1px 0 rgba(255, 255, 255, 0.6),
                                  inset 0 -1px 0 rgba(0, 0, 0, 0.05)
                                `,
                              minWidth: '140px'
                            }}>
                              {/* Header with Period - Left aligned with separator */}
                              <Box sx={{ 
                                px: 2,
                                py: 1.25,
                                borderBottom: darkMode 
                                  ? '0.5px solid rgba(255, 255, 255, 0.2)' 
                                  : '0.5px solid rgba(255, 255, 255, 0.3)',
                              }}>
                                <Typography sx={{ 
                                  fontWeight: 600, 
                                  fontSize: '0.8rem',
                                  color: '#FFFFFF',
                                  letterSpacing: '-0.01em',
                                  textShadow: darkMode 
                                    ? '0 2px 8px rgba(0,0,0,0.3)' 
                                    : '0 2px 8px rgba(0,0,0,0.2)'
                                }}>
                                  {label}
                                </Typography>
                              </Box>
                              
                              {/* Content Section - Rank Only */}
                              <Box sx={{ px: 2, py: 1.5 }}>
                                <Box sx={{ 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  justifyContent: 'space-between',
                                  gap: 2
                                }}>
                                  <Typography sx={{ 
                                    fontSize: '0.75rem',
                                    color: 'rgba(255,255,255,0.85)',
                                    fontWeight: 500,
                                    textShadow: '0 1px 4px rgba(0,0,0,0.2)'
                                  }}>
                                    Overall Rank
                                  </Typography>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                    <Box sx={{
                                      width: '6px',
                                      height: '6px',
                                      borderRadius: '50%',
                                      bgcolor: '#0585E0',
                                      boxShadow: '0 0 8px rgba(5,133,224,0.8)'
                                    }} />
                                    <Typography sx={{ 
                                      fontSize: '0.85rem',
                                      color: '#0585E0',
                                      fontFamily: 'nekst, monospace',
                                      fontWeight: 700,
                                      textShadow: '0 1px 4px rgba(0,0,0,0.3)',
                                      filter: 'brightness(1.2)'
                                    }}>
                                      #{rankValue}
                                    </Typography>
                                  </Box>
                                </Box>
                              </Box>
                            </Box>
                          );
                        }
                        return null;
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="rank" 
                      stroke="#0585E0" 
                      fillOpacity={1}
                      fill="url(#colorRank)"
                      strokeWidth={3}
                      dot={{
                        fill: '#0585E0',
                        strokeWidth: 2,
                        stroke: '#ffffff',
                        r: 4
                      }}
                      activeDot={{
                        r: 6,
                        fill: '#0585E0',
                        stroke: '#ffffff',
                        strokeWidth: 2
                      }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
                )}
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};

export default DashboardRankTrend;
