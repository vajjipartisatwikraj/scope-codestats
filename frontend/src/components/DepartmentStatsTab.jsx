import React from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  CircularProgress
} from '@mui/material';
import {
  PieChart,
  Pie,
  Sector,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend
} from 'recharts';

// Fallback colors for charts
const CHART_COLORS = ['#8884d8', '#83a6ed', '#8dd1e1', '#82ca9d', '#a4de6c', '#d0ed57', '#ffc658'];

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

const DepartmentStatsTab = ({ 
  stats, 
  loading, 
  activePieIndex, 
  onPieEnter,
  isMobile,
  theme
}) => {
  return (
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
          
          <Box sx={{ 
            height: isMobile ? 300 : 400, 
            display: 'flex', 
            justifyContent: 'center',
            minHeight: 300,
            minWidth: 200,
            position: 'relative'
          }}>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <CircularProgress />
              </Box>
            ) : (
              <ResponsiveContainer width="100%" height="100%" aspect={isMobile ? 1 : 1.5}>
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
            )}
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
            mt: 6,
            minHeight: 300,
            minWidth: 200,
            position: 'relative'
          }}>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <CircularProgress />
              </Box>
            ) : (
              <ResponsiveContainer width="100%" height="100%" aspect={isMobile ? 1 : 1.5}>
                <BarChart
                  data={stats?.departmentStats?.map((dept, index) => ({
                    name: dept.department,
                    score: dept.avgScore,
                    fill: CHART_COLORS[index % CHART_COLORS.length]
                  })) || []}
                  margin={{ 
                    top: 20, 
                    right: 30, 
                    left: 40,
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
                      offset: -30,
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
            )}
          </Box>
        </Paper>
      </Grid>
    </Grid>
  );
};

export default DepartmentStatsTab; 