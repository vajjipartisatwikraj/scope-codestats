import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  Grid,
  Card,
  CardContent,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Divider,
  Chip,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tab,
  LinearProgress,
  Badge,
  Tooltip,
  useTheme
} from '@mui/material';
import {
  People as PeopleIcon,
  EmojiEvents as TrophyIcon,
  Assessment as AssessmentIcon,
  Code as CodeIcon,
  ArrowBack as BackIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Timer as TimerIcon,
  Person as PersonIcon,
  School as SchoolIcon,
  BugReport as BugIcon,
  SportsScore as ScoreIcon,
  DonutLarge as DonutLargeIcon,
  BarChart as BarChartIcon,
  StarRate as StarIcon
} from '@mui/icons-material';
import axios from 'axios';
import { apiUrl } from '../../config/apiConfig';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title, 
  Tooltip as ChartTooltip, 
  Legend, 
  ArcElement,
  PointElement,
  LineElement,
  RadialLinearScale
} from 'chart.js';
import { Bar, Doughnut, Line, Radar } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  ChartTooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  RadialLinearScale
);

// Tab panel component
function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`stats-tabpanel-${index}`}
      aria-labelledby={`stats-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const CohortStats = () => {
  const { cohortId } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  
  const [loading, setLoading] = useState(true);
  const [cohort, setCohort] = useState(null);
  const [stats, setStats] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [activeTab, setActiveTab] = useState(0);
  
  // Fetch cohort stats on component mount
  useEffect(() => {
    fetchCohortStats();
  }, [cohortId, token]);
  
  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };
  
  // Fetch cohort stats from the API
  const fetchCohortStats = async () => {
    setLoading(true);
    try {
      // Fetch cohort details
      const cohortResponse = await axios.get(
        `${apiUrl}/cohorts/admin/${cohortId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      setCohort(cohortResponse.data);
      
      // Fetch cohort statistics using the new endpoint
      const statsResponse = await axios.get(
        `${apiUrl}/cohorts/${cohortId}/stats`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      setStats(statsResponse.data);
      
      // Fetch leaderboard
      const leaderboardResponse = await axios.get(
        `${apiUrl}/cohorts/${cohortId}/leaderboard`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      setLeaderboard(leaderboardResponse.data);
    } catch (error) {
      console.error('Error fetching cohort stats:', error);
      toast.error('Failed to fetch cohort statistics');
      
      // Set empty stats if API fails
      setStats({
        totalEnrolled: 0,
        activeUsers: 0,
        completionRate: 0,
        moduleCompletionRates: []
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Go back to cohort management
  const handleBack = () => {
    navigate('/admin/cohorts');
  };
  
  // Prepare chart data for module completion stats
  const getModuleCompletionData = () => {
    if (!stats || !stats.moduleCompletionRates || stats.moduleCompletionRates.length === 0) return null;
    
    const labels = stats.moduleCompletionRates.map(module => module.name);
    const completionData = stats.moduleCompletionRates.map(module => module.completion);
    
    return {
      labels,
      datasets: [
        {
          label: 'Completion Rate (%)',
          data: completionData,
          backgroundColor: 'rgba(33, 150, 243, 0.6)',
          borderColor: 'rgba(33, 150, 243, 1)',
          borderWidth: 1
        }
      ]
    };
  };
  
  // Prepare chart data for difficulty distribution
  const getDifficultyDistributionData = () => {
    if (!stats || !stats.questionStats) return null;
    
    // Count questions by difficulty
    const difficultyCount = {
      easy: 0,
      medium: 0,
      hard: 0
    };
    
    stats.questionStats.forEach(question => {
      difficultyCount[question.difficultyLevel]++;
    });
    
    return {
      labels: ['Easy', 'Medium', 'Hard'],
      datasets: [
        {
          data: [difficultyCount.easy, difficultyCount.medium, difficultyCount.hard],
          backgroundColor: [
            'rgba(76, 175, 80, 0.6)',
            'rgba(255, 152, 0, 0.6)',
            'rgba(244, 67, 54, 0.6)'
          ],
          borderColor: [
            'rgba(76, 175, 80, 1)',
            'rgba(255, 152, 0, 1)',
            'rgba(244, 67, 54, 1)'
          ],
          borderWidth: 1
        }
      ]
    };
  };
  
  // Prepare chart data for user progress over time
  const getProgressOverTimeData = () => {
    if (!stats || !stats.progressOverTime) return null;
    
    const dates = stats.progressOverTime.map(entry => new Date(entry.date).toLocaleDateString());
    const completions = stats.progressOverTime.map(entry => entry.completions);
    
    return {
      labels: dates,
      datasets: [
        {
          label: 'Questions Completed',
          data: completions,
          fill: false,
          backgroundColor: 'rgba(33, 150, 243, 0.6)',
          borderColor: 'rgba(33, 150, 243, 1)',
          tension: 0.1
        }
      ]
    };
  };
  
  // Prepare chart data for problem solution distribution
  const getProblemSolutionDistributionData = () => {
    if (!stats || !stats.languageDistribution) return null;
    
    const labels = Object.keys(stats.languageDistribution);
    const data = Object.values(stats.languageDistribution);
    
    return {
      labels,
      datasets: [
        {
          data,
          backgroundColor: [
            'rgba(33, 150, 243, 0.6)',
            'rgba(76, 175, 80, 0.6)',
            'rgba(255, 152, 0, 0.6)',
            'rgba(244, 67, 54, 0.6)',
            'rgba(156, 39, 176, 0.6)'
          ],
          borderColor: [
            'rgba(33, 150, 243, 1)',
            'rgba(76, 175, 80, 1)',
            'rgba(255, 152, 0, 1)',
            'rgba(244, 67, 54, 1)',
            'rgba(156, 39, 176, 1)'
          ],
          borderWidth: 1
        }
      ]
    };
  };
  
  // Render the overview stats cards
  const renderOverviewStats = () => {
    if (!stats) return null;
    
    return (
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2} sx={{ borderRadius: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <PeopleIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Eligible Students</Typography>
              </Box>
              <Typography variant="h3" sx={{ textAlign: 'center', my: 2 }}>
                {stats.totalEnrolled || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total eligible for the cohort
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2} sx={{ borderRadius: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <SchoolIcon color="info" sx={{ mr: 1 }} />
                <Typography variant="h6">Enrolled Students</Typography>
              </Box>
              <Typography variant="h3" sx={{ textAlign: 'center', my: 2 }}>
                {stats.enrolledUsers || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Students actively enrolled
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2} sx={{ borderRadius: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <AssessmentIcon color="success" sx={{ mr: 1 }} />
                <Typography variant="h6">Completion Rate</Typography>
              </Box>
              <Typography variant="h3" sx={{ textAlign: 'center', my: 2 }}>
                {stats.completionRate || 0}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Overall course completion
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2} sx={{ borderRadius: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <TimeIcon color="warning" sx={{ mr: 1 }} />
                <Typography variant="h6">Active Students</Typography>
              </Box>
              <Typography variant="h3" sx={{ textAlign: 'center', my: 2 }}>
                {stats.activeUsers || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Students with activity
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    );
  };
  
  // Render the leaderboard
  const renderLeaderboard = () => {
    if (!leaderboard || leaderboard.length === 0) {
      return (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography>No leaderboard data available yet.</Typography>
        </Paper>
      );
    }
    
    return (
      <Paper elevation={2} sx={{ borderRadius: 2 }}>
        <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center' }}>
          <TrophyIcon color="warning" sx={{ mr: 1 }} />
          <Typography variant="h6">Leaderboard</Typography>
        </Box>
        
        <List sx={{ width: '100%' }}>
          {leaderboard.map((entry, index) => (
            <React.Fragment key={entry.user._id}>
              <ListItem 
                sx={{
                  bgcolor: index < 3 ? 
                    (theme.palette.mode === 'dark' ? 
                      `rgba(255, 215, 0, ${0.2 - index * 0.05})` : 
                      `rgba(255, 215, 0, ${0.3 - index * 0.1})`) 
                    : 'transparent'
                }}
              >
                <Box 
                  sx={{ 
                    minWidth: 36, 
                    display: 'flex', 
                    justifyContent: 'center', 
                    alignItems: 'center',
                    mr: 2
                  }}
                >
                  {index === 0 ? (
                    <Avatar 
                      sx={{ 
                        bgcolor: 'warning.light', 
                        color: 'warning.contrastText',
                        width: 32,
                        height: 32
                      }}
                    >
                      <StarIcon fontSize="small" />
                    </Avatar>
                  ) : (
                    <Typography 
                      variant="body1" 
                      sx={{ 
                        fontWeight: 'bold', 
                        color: index < 3 ? 'warning.main' : 'text.secondary'
                      }}
                    >
                      {index + 1}
                    </Typography>
                  )}
                </Box>
                
                <ListItemAvatar>
                  <Avatar 
                    sx={{ 
                      bgcolor: `${['primary', 'secondary', 'success', 'info', 'warning'][index % 5]}.main`,
                      width: 40,
                      height: 40
                    }}
                  >
                    {entry.user.name.charAt(0).toUpperCase()}
                  </Avatar>
                </ListItemAvatar>
                
                <ListItemText 
                  primary={entry.user.name}
                  secondary={`${entry.user.department || 'Unknown'} - ${entry.user.rollNumber || 'No Roll Number'}`}
                  primaryTypographyProps={{ fontWeight: index < 3 ? 'bold' : 'normal' }}
                />
                
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', minWidth: 100 }}>
                  <Chip 
                    label={`${entry.totalScore} points`}
                    color={index < 3 ? 'warning' : 'default'}
                    variant={index < 3 ? 'filled' : 'outlined'}
                    size="small"
                  />
                </Box>
              </ListItem>
              {index < leaderboard.length - 1 && <Divider variant="inset" component="li" />}
            </React.Fragment>
          ))}
        </List>
      </Paper>
    );
  };
  
  // Render the module stats
  const renderModuleStats = () => {
    if (!stats || !stats.moduleCompletionRates || stats.moduleCompletionRates.length === 0) {
      return (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography>No module statistics available yet.</Typography>
        </Paper>
      );
    }
    
    return (
      <Paper elevation={2} sx={{ p: 3, borderRadius: 2 }}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Module Completion Rates
          </Typography>
          {getModuleCompletionData() && (
            <Box sx={{ height: 300, maxWidth: '100%' }}>
              <Bar
                data={getModuleCompletionData()}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      display: false
                    },
                    tooltip: {
                      callbacks: {
                        label: function(context) {
                          return `${context.parsed.y.toFixed(1)}% completion rate`;
                        }
                      }
                    }
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      max: 100,
                      title: {
                        display: true,
                        text: 'Completion Rate (%)'
                      }
                    }
                  }
                }}
              />
            </Box>
          )}
        </Box>
        
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Module</TableCell>
                <TableCell align="center">Completion Rate</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {stats.moduleCompletionRates.map((module, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold">
                      {module.name}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Box sx={{ width: '100%', mr: 1 }}>
                        <LinearProgress 
                          variant="determinate" 
                          value={module.completion || 0} 
                          color={
                            module.completion > 75 ? 'success' : 
                            module.completion > 50 ? 'info' : 
                            module.completion > 25 ? 'warning' : 'error'
                          }
                          sx={{ height: 8, borderRadius: 4 }}
                        />
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        {module.completion?.toFixed(0) || 0}%
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    );
  };
  
  // Render the question stats
  const renderQuestionStats = () => {
    if (!stats || !stats.questionStats) {
      return (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography>No question statistics available yet.</Typography>
        </Paper>
      );
    }
    
    // Sort questions by difficulty for the table
    const sortedQuestions = [...stats.questionStats].sort((a, b) => {
      if (a.difficultyLevel === b.difficultyLevel) {
        return b.acceptanceRate - a.acceptanceRate;
      }
      const difficultyOrder = { easy: 1, medium: 2, hard: 3 };
      return difficultyOrder[a.difficultyLevel] - difficultyOrder[b.difficultyLevel];
    });
    
    return (
      <Paper elevation={2} sx={{ p: 3, borderRadius: 2 }}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Question Difficulty Distribution
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              {getDifficultyDistributionData() && (
                <Box sx={{ height: 300, display: 'flex', justifyContent: 'center' }}>
                  <Doughnut
                    data={getDifficultyDistributionData()}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'right'
                        }
                      }
                    }}
                  />
                </Box>
              )}
            </Grid>
            
            <Grid item xs={12} md={6}>
              {getProblemSolutionDistributionData() && (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Languages Used in Solutions
                  </Typography>
                  <Box sx={{ height: 300, display: 'flex', justifyContent: 'center' }}>
                    <Doughnut
                      data={getProblemSolutionDistributionData()}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            position: 'right'
                          }
                        }
                      }}
                    />
                  </Box>
                </Box>
              )}
            </Grid>
          </Grid>
        </Box>
        
        <Typography variant="h6" gutterBottom>
          Most Challenging Problems
        </Typography>
        
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Question</TableCell>
                <TableCell align="center">Type</TableCell>
                <TableCell align="center">Difficulty</TableCell>
                <TableCell align="center">Submissions</TableCell>
                <TableCell align="center">Acceptance Rate</TableCell>
                <TableCell align="center">Avg. Time</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedQuestions
                .sort((a, b) => a.acceptanceRate - b.acceptanceRate) // Sort by acceptance rate ascending
                .slice(0, 10) // Get top 10 most challenging
                .map((question, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold">
                        {question.title}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Chip 
                        size="small" 
                        label={question.type === 'programming' ? 'Code' : 'MCQ'} 
                        color={question.type === 'programming' ? 'primary' : 'secondary'}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Chip 
                        size="small" 
                        label={question.difficultyLevel.toUpperCase()}
                        color={
                          question.difficultyLevel === 'easy' ? 'success' :
                          question.difficultyLevel === 'medium' ? 'warning' : 'error'
                        }
                      />
                    </TableCell>
                    <TableCell align="center">{question.totalSubmissions}</TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Box sx={{ width: '100%', mr: 1 }}>
                          <LinearProgress 
                            variant="determinate" 
                            value={question.acceptanceRate || 0} 
                            color={
                              question.acceptanceRate > 75 ? 'success' : 
                              question.acceptanceRate > 50 ? 'info' : 
                              question.acceptanceRate > 25 ? 'warning' : 'error'
                            }
                            sx={{ height: 8, borderRadius: 4 }}
                          />
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                          {question.acceptanceRate?.toFixed(0) || 0}%
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="center">{question.averageTime ? `${question.averageTime.toFixed(0)} ms` : 'N/A'}</TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    );
  };
  
  // Render the user progress over time chart
  const renderProgressOverTime = () => {
    if (!stats || !stats.progressOverTime) {
      return (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography>No progress data available yet.</Typography>
        </Paper>
      );
    }
    
    return (
      <Paper elevation={2} sx={{ p: 3, borderRadius: 2 }}>
        <Typography variant="h6" gutterBottom>
          Progress Over Time
        </Typography>
        
        {getProgressOverTimeData() && (
          <Box sx={{ height: 400, maxWidth: '100%' }}>
            <Line
              data={getProgressOverTimeData()}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    display: true,
                    position: 'top'
                  }
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    title: {
                      display: true,
                      text: 'Number of Completions'
                    }
                  }
                }
              }}
            />
          </Box>
        )}
      </Paper>
    );
  };
  
  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 6 }}>
      <Button
        startIcon={<BackIcon />}
        onClick={handleBack}
        sx={{ mb: 2 }}
      >
        Back to Cohort Management
      </Button>
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {cohort && (
            <Box sx={{ mb: 4 }}>
              <Typography variant="h4" gutterBottom>
                {cohort.title} - Statistics
              </Typography>
              <Typography variant="body1" color="text.secondary">
                {cohort.description}
              </Typography>
              <Box sx={{ display: 'flex', mt: 1, flexWrap: 'wrap', gap: 1 }}>
                <Chip 
                  icon={<CalendarIcon />} 
                  label={`Start: ${new Date(cohort.startDate).toLocaleDateString()}`} 
                  size="small" 
                  color="primary"
                  variant="outlined"
                />
                <Chip 
                  icon={<CalendarIcon />} 
                  label={`End: ${new Date(cohort.endDate).toLocaleDateString()}`} 
                  size="small" 
                  color="primary"
                  variant="outlined"
                />
                <Chip 
                  icon={<PeopleIcon />} 
                  label={`${cohort.eligibleUsers?.length || 0} eligible users`} 
                  size="small" 
                  color="primary"
                  variant="outlined"
                />
              </Box>
            </Box>
          )}
          
          <Box sx={{ mb: 4 }}>
            {renderOverviewStats()}
          </Box>
          
          <Box sx={{ mb: 4 }}>
            <Tabs value={activeTab} onChange={handleTabChange} centered>
              <Tab label="Leaderboard" icon={<TrophyIcon />} iconPosition="start" />
              <Tab label="Modules" icon={<SchoolIcon />} iconPosition="start" />
              <Tab label="Questions" icon={<CodeIcon />} iconPosition="start" />
              <Tab label="Progress" icon={<AssessmentIcon />} iconPosition="start" />
            </Tabs>
            
            <TabPanel value={activeTab} index={0}>
              {renderLeaderboard()}
            </TabPanel>
            
            <TabPanel value={activeTab} index={1}>
              {renderModuleStats()}
            </TabPanel>
            
            <TabPanel value={activeTab} index={2}>
              {renderQuestionStats()}
            </TabPanel>
            
            <TabPanel value={activeTab} index={3}>
              {renderProgressOverTime()}
            </TabPanel>
          </Box>
        </>
      )}
    </Container>
  );
};

export default CohortStats; 