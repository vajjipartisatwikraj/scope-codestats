import React from 'react';
import { Box, Typography, Tooltip } from '@mui/material';
import { getLiquidGlassStyle } from './dashboardUtils';

/**
 * Dashboard Heatmap Component
 * Displays 365-day activity heatmap showing user's daily coding activity
 * 
 * Props:
 * - analyticsData: Object containing dailyActivity array with { date, count, level } per day
 * - loading: Boolean indicating if data is being fetched
 * - darkMode: Boolean for theme styling
 */
const DashboardHeatmap = ({ analyticsData, loading, darkMode }) => {
  if (loading || !analyticsData || analyticsData.error) {
    return null;
  }
  // Render whenever we have activity data — even if platform analytics is
  // empty (e.g. a user who only solves in-app cohort/practice problems).
  const hasActivity =
    Array.isArray(analyticsData.dailyActivity) &&
    analyticsData.dailyActivity.length > 0;
  if (analyticsData.empty && !hasActivity) {
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
        animation: `slideInUp 0.6s ease-out 0.6s forwards`,
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
          Daily Activity Heatmap (Last Year)
        </Typography>
      </Box>

      {/* Content Section */}
      <Box sx={{ p: 3 }}>
      {(() => {
        // Generate heatmap for exactly 365 days back from today
        const today = new Date();
        const startDate = new Date(today);
        startDate.setDate(today.getDate() - 364); // 364 days back + current day = 365 total days
        
        // Generate all 365 days
        const allDays = [];
        const currentDate = new Date(startDate);
        
        // Format a date as a YYYY-MM-DD key in IST to align with backend dateKeys
        const toISTKey = (d) =>
          d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

        for (let i = 0; i < 365; i++) {
          const dateString = toISTKey(currentDate);
          
          // Find matching data for this date
          const dayData = analyticsData?.dailyActivity ? 
            analyticsData.dailyActivity.find(d => d.date === dateString) : null;
          
          // Problems solved that day + precomputed intensity bucket (0-4)
          const count = dayData ? dayData.count : 0;
          const level = dayData ? dayData.level : 0;
          
          allDays.push({
            date: dateString,
            day: currentDate.getDate(),
            month: currentDate.getMonth(),
            year: currentDate.getFullYear(),
            monthName: currentDate.toLocaleDateString('en-US', { month: 'short' }),
            count,
            level,
            dayOfWeek: currentDate.getDay() // 0 = Sunday, 1 = Monday, etc.
          });
          
          // Move to next day
          currentDate.setDate(currentDate.getDate() + 1);
        }

        // Level (0-4) → opacity for the blue activity color
        const LEVEL_OPACITY = [0, 0.25, 0.45, 0.7, 1];
        
        // Group days by months for display
        const monthsMap = new Map();
        allDays.forEach(day => {
          const monthKey = `${day.year}-${day.month}`;
          if (!monthsMap.has(monthKey)) {
            monthsMap.set(monthKey, {
              name: day.monthName,
              year: day.year,
              days: []
            });
          }
          monthsMap.get(monthKey).days.push(day);
        });
        
        const months = Array.from(monthsMap.values());
        
        return (
          <Box>
            {/* Scrollable wrapper for mobile */}
            <Box sx={{
              overflowX: 'auto',
              overflowY: 'hidden',
              pb: 1,
              // Custom scrollbar styling
              '&::-webkit-scrollbar': {
                height: '6px',
              },
              '&::-webkit-scrollbar-track': {
                background: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                borderRadius: '10px',
              },
              '&::-webkit-scrollbar-thumb': {
                background: darkMode ? 'rgba(5,133,224,0.5)' : 'rgba(5,133,224,0.4)',
                borderRadius: '10px',
                '&:hover': {
                  background: darkMode ? 'rgba(5,133,224,0.7)' : 'rgba(5,133,224,0.6)',
                }
              },
              // Smooth scrolling
              scrollBehavior: 'smooth',
              WebkitOverflowScrolling: 'touch',
            }}>
            {/* Days grid - larger boxes with increased gaps */}
            <Box sx={{
              display: 'flex',
              flexDirection: 'column',
              width: '100%',
              minWidth: '800px', // Minimum width to ensure content doesn't compress on mobile
            }}>
              {/* Days grid - horizontal layout */}
              <Box sx={{
                display: 'flex',
                width: '100%',
                gap: '1px',
                mb: 1
              }}>
                {months.map((month, monthIndex) => {
                  // Group days by weeks for vertical layout within each month
                  const weeks = [];
                  
                  // Process all days in this month
                  let currentWeek = new Array(7).fill(null);
                  let weekStarted = false;
                  
                  month.days.forEach((dayData, dayIndex) => {
                    const dayOfWeek = dayData.dayOfWeek;
                    
                    // If this is the first day of the month, start from its day of week
                    if (dayIndex === 0 && !weekStarted) {
                      // Fill empty days before the first day
                      for (let i = 0; i < dayOfWeek; i++) {
                        currentWeek[i] = null;
                      }
                      weekStarted = true;
                    }
                    
                    currentWeek[dayOfWeek] = dayData;
                    
                    // If we've filled a week (Sunday) or it's the last day, push the week
                    if (dayOfWeek === 6 || dayIndex === month.days.length - 1) {
                      weeks.push([...currentWeek]);
                      currentWeek = new Array(7).fill(null);
                    }
                  });
                  
                  return (
                    <Box
                      key={month.name + month.year}
                      sx={{
                        flex: '1 1 0',
                        display: 'flex',
                        justifyContent: 'center',
                        gap: '2px'
                      }}
                    >
                      {weeks.map((week, weekIndex) => (
                        <Box
                          key={weekIndex}
                          sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '2px'
                          }}
                        >
                          {week.map((dayData, dayIndex) => {
                            if (!dayData) {
                              return (
                                <Box
                                  key={`empty-${monthIndex}-${weekIndex}-${dayIndex}`}
                                  sx={{
                                    width: '12px',
                                    height: '12px',
                                    borderRadius: '2px',
                                    bgcolor: darkMode ? 'rgba(60, 60, 60, 0.2)' : 'rgba(220, 220, 220, 0.3)',
                                    opacity: 0,
                                  }}
                                />
                              );
                            }

                            const formattedDate = new Date(dayData.date).toLocaleDateString('en-US', { 
                              weekday: 'short', 
                              year: 'numeric', 
                              month: 'short', 
                              day: 'numeric' 
                            });

                            return (
                              <Tooltip
                                key={dayData.date}
                                title={
                                  <Box>
                                    {/* Header with Date - Left aligned with separator */}
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
                                        {formattedDate}
                                      </Typography>
                                    </Box>
                                    
                                    {/* Content Section - Problems Solved */}
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
                                          Problems Solved
                                        </Typography>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                          <Box sx={{
                                            width: '6px',
                                            height: '6px',
                                            borderRadius: '50%',
                                            bgcolor: dayData.count > 0 ? '#0585E0' : '#9E9E9E',
                                            boxShadow: dayData.count > 0 
                                              ? '0 0 8px rgba(5,133,224,0.8)' 
                                              : 'none'
                                          }} />
                                          <Typography sx={{ 
                                            fontSize: '0.85rem',
                                            color: dayData.count > 0 ? '#0585E0' : 'rgba(255,255,255,0.8)',
                                            fontFamily: 'nekst, monospace',
                                            fontWeight: 700,
                                            textShadow: '0 1px 4px rgba(0,0,0,0.3)',
                                            filter: 'brightness(1.2)'
                                          }}>
                                            {dayData.count} {dayData.count === 1 ? 'problem' : 'problems'}
                                          </Typography>
                                        </Box>
                                      </Box>
                                    </Box>
                                  </Box>
                                }
                                placement="top"
                                arrow
                                componentsProps={{
                                  tooltip: {
                                    sx: {
                                      // Complete Transparent Glassmorphism
                                      background: darkMode
                                        ? 'rgba(255, 255, 255, 0.05)'
                                        : 'rgba(255, 255, 255, 0.15)',
                                      backdropFilter: 'blur(100px) saturate(180%)',
                                      WebkitBackdropFilter: 'blur(100px) saturate(180%)',
                                      border: darkMode
                                        ? '1px solid rgba(255, 255, 255, 0.18)'
                                        : '1px solid rgba(255, 255, 255, 0.4)',
                                      borderRadius: '14px',
                                      boxShadow: darkMode
                                        ? '0 8px 32px 0 rgba(0, 0, 0, 0.5), inset 0 1px 0 0 rgba(255, 255, 255, 0.2)'
                                        : '0 8px 32px 0 rgba(31, 38, 135, 0.2), inset 0 1px 0 0 rgba(255, 255, 255, 0.8)',
                                      padding: 0,
                                      minWidth: '200px',
                                      maxWidth: '240px',
                                      overflow: 'hidden',
                                      // Glass top highlight
                                      '&::before': {
                                        content: '""',
                                        position: 'absolute',
                                        top: 0,
                                        left: '10%',
                                        right: '10%',
                                        height: '1px',
                                        background: darkMode
                                          ? 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)'
                                          : 'linear-gradient(90deg, transparent, rgba(255,255,255,0.9), transparent)',
                                        borderRadius: '14px 14px 0 0',
                                      }
                                    }
                                  },
                                  arrow: {
                                    sx: {
                                      color: darkMode 
                                        ? 'rgba(255, 255, 255, 0.05)' 
                                        : 'rgba(255, 255, 255, 0.15)',
                                      '&::before': {
                                        border: darkMode 
                                          ? '1px solid rgba(255, 255, 255, 0.18)' 
                                          : '1px solid rgba(255, 255, 255, 0.4)',
                                      }
                                    }
                                  }
                                }}
                              >
                                <Box
                                  sx={{
                                    width: '12px',
                                    height: '12px',
                                    borderRadius: '2px',
                                    bgcolor: dayData.level > 0 
                                      ? `rgba(5, 133, 224, ${LEVEL_OPACITY[dayData.level] || 1})`
                                      : darkMode ? 'rgba(70, 70, 70, 0.3)' : 'rgba(200, 200, 200, 0.4)',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    opacity: 1,
                                    transform: 'scale(0)',
                                    animation: `scaleIn 0.1s ease-out ${1.0 + monthIndex * 0.05 + weekIndex * 0.02}s forwards`,
                                    '&:hover': {
                                      transform: 'scale(1.3)',
                                      zIndex: 10,
                                      boxShadow: dayData.level > 0 
                                        ? '0 0 8px rgba(5, 133, 224, 0.8)'
                                        : `0 0 8px ${darkMode ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'}`
                                    },
                                    '@keyframes scaleIn': {
                                      '0%': {
                                        opacity: 0,
                                        transform: 'scale(0)'
                                      },
                                      '100%': {
                                        opacity: 1,
                                        transform: 'scale(1)'
                                      }
                                    }
                                  }}
                                />
                              </Tooltip>
                            );
                          })}
                        </Box>
                      ))}
                    </Box>
                  );
                })}
              </Box>
              
              {/* Month labels row - horizontal at bottom */}
              <Box sx={{
                display: 'flex',
                width: '100%',
                mt: 1.5
              }}>
                {months.map((month, monthIndex) => (
                  <Box
                    key={month.name + month.year}
                    sx={{
                      flex: '1 1 0',
                      display: 'flex',
                      justifyContent: 'center'
                    }}
                  >
                    <Typography 
                      variant="caption" 
                      sx={{
                        color: darkMode ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.7)',
                        fontSize: {
                          xs: '0.55rem',  // Smaller on mobile
                          sm: '0.65rem',  // Medium on tablets
                          md: '0.75rem'   // Normal on desktop
                        },
                        fontWeight: 600,
                        textShadow: darkMode 
                          ? '0 1px 2px rgba(0,0,0,0.5)' 
                          : '0 1px 2px rgba(255,255,255,0.8)',
                        // Hide every other month on very small screens
                        display: {
                          xs: monthIndex % 2 === 0 ? 'block' : 'none',  // Show only even indices on mobile
                          sm: 'block'  // Show all on tablet and up
                        }
                      }}
                    >
                      {month.name}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>
            </Box>
          </Box>
        );
      })()}
      
      {/* Intensity Legend */}
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center',
        mt: 3,
        gap: 1.5
      }}>
        {/* Legend Label */}
        <Typography variant="caption" sx={{ 
          color: darkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.65)',
          fontSize: '0.7rem',
          fontWeight: 600,
          letterSpacing: '0.5px',
          textTransform: 'uppercase',
        }}>
          Activity Intensity
        </Typography>
        
        {/* Legend Scale */}
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1 }}>
        <Typography variant="caption" sx={{ 
          color: darkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)',
          fontSize: '0.65rem',
          fontWeight: 600,
        }}>
          Less
        </Typography>
        <Box sx={{ display: 'flex', gap: '3px' }}>
          {[0, 0.25, 0.45, 0.7, 1].map((opacity, i) => (
            <Box
              key={i}
              sx={{
                width: '14px',
                height: '14px',
                borderRadius: '3px',
                border: `1px solid ${darkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0,0,0,0.15)'}`,
                bgcolor: opacity > 0 
                  ? `rgba(5, 133, 224, ${opacity})`
                  : darkMode ? 'rgba(70, 70, 70, 0.3)' : 'rgba(200, 200, 200, 0.3)',
                transition: 'transform 0.2s ease',
                '&:hover': {
                  transform: 'scale(1.2)',
                }
              }}
              title={
                i === 0 ? 'No problems solved' :
                i === 1 ? '1-2 problems' :
                i === 2 ? '3-5 problems' :
                i === 3 ? '6-9 problems' :
                '10+ problems'
              }
            />
          ))}
        </Box>
        <Typography variant="caption" sx={{ 
          color: darkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)',
          fontSize: '0.65rem',
          fontWeight: 600,
        }}>
          More
        </Typography>
      </Box>
      </Box>
      </Box>
    </Box>
  );
};

export default DashboardHeatmap;
