import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Paper,
  Chip,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid,
  Divider,
  Container,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import QuizIcon from '@mui/icons-material/Quiz';
import CodeIcon from '@mui/icons-material/Code';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AssignmentIcon from '@mui/icons-material/Assignment';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme as useAppTheme } from '../../contexts/ThemeContext';
import { useTheme } from '@mui/material/styles';
import axios from 'axios';
import { apiUrl } from '../../config/apiConfig';
import { format } from 'date-fns';

const PATestResults = () => {
  const { testId } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const { darkMode } = useAppTheme();
  const theme = useTheme();

  const [loading, setLoading] = useState(true);
  const [testData, setTestData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchTestResults();
  }, [testId]);

  const fetchTestResults = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${apiUrl}/practice-arena/tests/${testId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      setTestData(response.data);
    } catch (err) {
      console.error('Error fetching test results:', err);
      setError('Failed to load test results');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return format(new Date(dateString), 'PPp');
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '0s';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  const getSubmissionForQuestion = (questionId) => {
    return testData?.submissions?.find(sub => sub.question._id === questionId);
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty?.toLowerCase()) {
      case 'easy':
        return '#4CAF50';
      case 'medium':
        return '#FF9800';
      case 'hard':
        return '#f44336';
      default:
        return '#9C27B0';
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
        <CircularProgress size={60} sx={{ color: '#0088CC' }} />
      </Box>
    );
  }

  if (error || !testData) {
    return (
      <Container maxWidth="md" sx={{ py: 8, textAlign: 'center' }}>
        <Typography variant="h6" color="error" gutterBottom>
          {error || 'Test not found'}
        </Typography>
        <Button
          variant="contained"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/practice-arena')}
          sx={{ mt: 2, bgcolor: '#0088CC', '&:hover': { bgcolor: '#006699' } }}
        >
          Back to Practice Arena
        </Button>
      </Container>
    );
  }

  const completedQuestions = testData.submissions?.filter(s => s.isCorrect).length || 0;
  const totalQuestions = testData.questions?.length || 0;
  const accuracyPercentage = totalQuestions > 0 ? ((completedQuestions / totalQuestions) * 100).toFixed(1) : 0;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'transparent', pb: 6 }}>
      {/* Header */}
      <Container
        maxWidth={false}
        sx={{
          py: 2,
          px: { xs: 2, sm: 8 },
          bgcolor: '#0088CC',
          borderBottom: 'none',
        }}
      >
        <Box sx={{ maxWidth: '1200px', mx: 'auto' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700, color: 'white', mb: 0.5 }}>
                {testData.title}
              </Typography>
              <Typography variant="body2" sx={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.9)' }}>
                Test Results & Detailed Analysis
              </Typography>
            </Box>
            
            <Button
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate('/practice-arena')}
              sx={{
                color: 'white',
                fontSize: '0.85rem',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' }
              }}
            >
              Back to Practice Arena
            </Button>
          </Box>
        </Box>
      </Container>

      {/* Main Content */}
      <Container
        maxWidth={false}
        sx={{
          px: { xs: 2, sm: 8 },
          mt: 3,
        }}
      >
        <Box sx={{ maxWidth: '1200px', mx: 'auto' }}>
          {/* Summary Cards */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {/* Score Card */}
            <Grid item xs={12} md={3}>
              <Card
                sx={{
                  bgcolor: darkMode ? 'rgba(0,136,204,0.1)' : 'rgba(0,136,204,0.05)',
                  border: `1px solid ${darkMode ? 'rgba(0,136,204,0.3)' : 'rgba(0,136,204,0.2)'}`,
                  borderRadius: '12px',
                }}
              >
                <CardContent sx={{ py: 1.5, px: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                    <TrendingUpIcon sx={{ color: '#0088CC', mr: 1, fontSize: '1.2rem' }} />
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                      Final Score
                    </Typography>
                  </Box>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: '#0088CC' }}>
                    {testData.totalScore}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                    out of {testData.maxPossibleScore} points
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* Accuracy Card */}
            <Grid item xs={12} md={3}>
              <Card
                sx={{
                  bgcolor: '#0f0f0f',
                  border: `1px solid ${darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.1)'}`,
                  borderRadius: '12px',
                }}
              >
                <CardContent sx={{ py: 1.5, px: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                    <CheckCircleIcon sx={{ color: '#4CAF50', mr: 1, fontSize: '1.2rem' }} />
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                      Accuracy
                    </Typography>
                  </Box>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: theme.palette.text.primary }}>
                    {accuracyPercentage}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                    {completedQuestions} / {totalQuestions} correct
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* Time Card */}
            <Grid item xs={12} md={3}>
              <Card
                sx={{
                  bgcolor: '#0f0f0f',
                  border: `1px solid ${darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.1)'}`,
                  borderRadius: '12px',
                }}
              >
                <CardContent sx={{ py: 1.5, px: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                    <AccessTimeIcon sx={{ color: '#FF9800', mr: 1, fontSize: '1.2rem' }} />
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                      Time Taken
                    </Typography>
                  </Box>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: theme.palette.text.primary }}>
                    {formatDuration(testData.totalTimeTaken || 0)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                    of {testData.parameters?.timeLimit || 0} min
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* Status Card */}
            <Grid item xs={12} md={3}>
              <Card
                sx={{
                  bgcolor: '#0f0f0f',
                  border: `1px solid ${darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.1)'}`,
                  borderRadius: '12px',
                }}
              >
                <CardContent sx={{ py: 1.5, px: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                    <AssignmentIcon sx={{ color: '#9C27B0', mr: 1, fontSize: '1.2rem' }} />
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                      Status
                    </Typography>
                  </Box>
                  <Chip
                    label={testData.status === 'completed' ? 'Completed' : testData.status}
                    sx={{
                      bgcolor: '#4CAF50',
                      color: 'white',
                      fontWeight: 700,
                      fontSize: '0.75rem',
                      height: '28px',
                      mt: 0.5,
                      textTransform: 'capitalize'
                    }}
                  />
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontSize: '0.75rem' }}>
                    {formatDate(testData.endTime)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Test Metadata */}
          <Paper
            sx={{
              p: 2,
              mb: 3,
              bgcolor: '#0f0f0f',
              border: `1px solid ${darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.1)'}`,
              borderRadius: '12px',
            }}
          >
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5, color: theme.palette.text.primary, fontSize: '1rem' }}>
              Test Information
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={4}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CalendarTodayIcon sx={{ fontSize: 18, color: '#0088CC' }} />
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Start Time</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
                      {formatDate(testData.startTime)}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <QuizIcon sx={{ fontSize: 18, color: '#0088CC' }} />
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Subject</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
                      {testData.parameters?.subject || 'Mixed'}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CodeIcon sx={{ fontSize: 18, color: '#0088CC' }} />
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Difficulty</Typography>
                    <Chip
                      label={testData.parameters?.difficulty || 'Mixed'}
                      size="small"
                      sx={{
                        bgcolor: `${getDifficultyColor(testData.parameters?.difficulty)}22`,
                        color: getDifficultyColor(testData.parameters?.difficulty),
                        fontWeight: 600,
                        fontSize: '0.7rem',
                        height: '22px',
                        textTransform: 'capitalize',
                        mt: 0.5
                      }}
                    />
                  </Box>
                </Box>
              </Grid>
              {testData.parameters?.topics && testData.parameters.topics.length > 0 && (
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                    Topics Covered
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {testData.parameters.topics.map((topic, index) => (
                      <Chip
                        key={index}
                        label={topic}
                        size="small"
                        sx={{
                          bgcolor: darkMode ? 'rgba(0,136,204,0.15)' : 'rgba(0,136,204,0.1)',
                          color: '#0088CC',
                          fontSize: '0.75rem'
                        }}
                      />
                    ))}
                  </Box>
                </Grid>
              )}
            </Grid>
          </Paper>

          {/* Questions & Submissions Accordion */}
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5, color: theme.palette.text.primary, fontSize: '1rem' }}>
            Detailed Question Analysis
          </Typography>

          {testData.questions?.map((question, index) => {
            const submission = getSubmissionForQuestion(question._id);
            const isCorrect = submission?.isCorrect || false;
            const isProgramming = question.type === 'programming';

            return (
              <Accordion
                key={question._id}
                sx={{
                  mb: 1.5,
                  bgcolor: '#0f0f0f',
                  border: `1px solid ${darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.1)'}`,
                  borderRadius: '12px !important',
                  '&:before': { display: 'none' },
                  boxShadow: 'none',
                }}
              >
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon sx={{ fontSize: '1.2rem' }} />}
                  sx={{
                    borderRadius: '12px',
                    minHeight: '48px',
                    '&.Mui-expanded': { minHeight: '48px' },
                    '& .MuiAccordionSummary-content': { my: 1 },
                    '&:hover': {
                      bgcolor: darkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,136,204,0.03)'
                    }
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 1.5 }}>
                    <Chip
                      label={`Q${index + 1}`}
                      sx={{
                        bgcolor: '#0088CC',
                        color: 'white',
                        fontWeight: 700,
                        fontSize: '0.75rem',
                        height: '26px',
                        minWidth: 42
                      }}
                    />
                    <Typography sx={{ flex: 1, fontWeight: 600, color: theme.palette.text.primary, fontSize: '0.9rem' }}>
                      {question.title}
                    </Typography>
                    <Chip
                      label={question.difficultyLevel || 'Medium'}
                      size="small"
                      sx={{
                        bgcolor: `${getDifficultyColor(question.difficultyLevel)}22`,
                        color: getDifficultyColor(question.difficultyLevel),
                        fontWeight: 600,
                        fontSize: '0.7rem',
                        height: '22px',
                        textTransform: 'capitalize',
                        display: { xs: 'none', sm: 'flex' }
                      }}
                    />
                    <Chip
                      icon={isCorrect ? <CheckCircleIcon /> : <CancelIcon />}
                      label={isCorrect ? 'Correct' : submission ? 'Wrong' : 'Not Attempted'}
                      size="small"
                      sx={{
                        bgcolor: isCorrect ? 'rgba(76,175,80,0.1)' : submission ? 'rgba(244,67,54,0.1)' : 'rgba(158,158,158,0.1)',
                        color: isCorrect ? '#4CAF50' : submission ? '#f44336' : '#9E9E9E',
                        fontWeight: 600,
                        '& .MuiChip-icon': {
                          color: isCorrect ? '#4CAF50' : submission ? '#f44336' : '#9E9E9E'
                        }
                      }}
                    />
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Divider sx={{ mb: 2 }} />

                  {/* Question Description */}
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: theme.palette.text.primary, fontSize: '0.85rem' }}>
                      Question Description
                    </Typography>
                    <Box
                      sx={{
                        p: 1.5,
                        bgcolor: '#0f0f0f',
                        borderRadius: '8px',
                        fontSize: '0.85rem',
                        '& p': { marginBottom: '0.5em', color: theme.palette.text.secondary, fontSize: '0.85rem' },
                        '& strong': { color: theme.palette.text.primary },
                        '& code': { 
                          bgcolor: darkMode ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.1)',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontFamily: 'monospace',
                          fontSize: '0.8rem'
                        },
                        '& pre': {
                          bgcolor: darkMode ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.1)',
                          padding: '10px',
                          borderRadius: '4px',
                          overflow: 'auto',
                          fontSize: '0.8rem'
                        },
                        '& h3': { 
                          fontSize: '0.9rem',
                          fontWeight: 600,
                          marginTop: '0.5em',
                          marginBottom: '0.5em',
                          color: theme.palette.text.primary
                        },
                        '& ol, & ul': { 
                          paddingLeft: '1.5em',
                          color: theme.palette.text.secondary,
                          fontSize: '0.85rem'
                        },
                        '& li': { marginBottom: '0.25em' }
                      }}
                      dangerouslySetInnerHTML={{ __html: question.description }}
                    />
                  </Box>

                  {/* MCQ Options */}
                  {!isProgramming && question.options && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: theme.palette.text.primary, fontSize: '0.85rem' }}>
                        Options
                      </Typography>
                      {question.options.map((option, optIndex) => {
                        const isSelected = submission?.selectedOption === option._id;
                        const isCorrectOption = option.isCorrect;

                        return (
                          <Box
                            key={option._id}
                            sx={{
                              p: 1.5,
                              mb: 1,
                              borderRadius: '8px',
                              border: `2px solid ${
                                isCorrectOption ? '#4CAF50' :
                                isSelected ? '#f44336' :
                                darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
                              }`,
                              bgcolor: isCorrectOption ? 'rgba(76,175,80,0.05)' :
                                       isSelected ? 'rgba(244,67,54,0.05)' :
                                       'transparent',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1.5
                            }}
                          >
                            <Chip
                              label={String.fromCharCode(65 + optIndex)}
                              size="small"
                              sx={{
                                bgcolor: isCorrectOption ? '#4CAF50' : isSelected ? '#f44336' : '#0088CC',
                                color: 'white',
                                fontWeight: 700,
                                fontSize: '0.7rem',
                                height: '24px',
                                minWidth: 28
                              }}
                            />
                            <Typography variant="body2" sx={{ flex: 1, fontSize: '0.85rem' }}>
                              {option.text}
                            </Typography>
                            {isCorrectOption && (
                              <Chip
                                icon={<CheckCircleIcon sx={{ fontSize: '0.9rem' }} />}
                                label="Correct Answer"
                                size="small"
                                sx={{
                                  bgcolor: 'rgba(76,175,80,0.2)',
                                  color: '#4CAF50',
                                  fontWeight: 600,
                                  '& .MuiChip-icon': { color: '#4CAF50' }
                                }}
                              />
                            )}
                            {isSelected && !isCorrectOption && (
                              <Chip
                                icon={<CancelIcon />}
                                label="Your Answer"
                                size="small"
                                sx={{
                                  bgcolor: 'rgba(244,67,54,0.2)',
                                  color: '#f44336',
                                  fontWeight: 600,
                                  '& .MuiChip-icon': { color: '#f44336' }
                                }}
                              />
                            )}
                          </Box>
                        );
                      })}
                    </Box>
                  )}

                  {/* Programming Submission */}
                  {isProgramming && submission && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: theme.palette.text.primary, fontSize: '0.85rem' }}>
                        Your Code Submission
                      </Typography>
                      <Paper
                        sx={{
                          p: 1.5,
                          bgcolor: darkMode ? '#1e1e1e' : '#f5f5f5',
                          borderRadius: '8px',
                          border: `1px solid ${darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                          overflow: 'auto'
                        }}
                      >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Chip
                            label={submission.language}
                            size="small"
                            sx={{
                              bgcolor: '#0088CC',
                              color: 'white',
                              fontWeight: 600,
                              fontSize: '0.7rem',
                              height: '22px'
                            }}
                          />
                          <Chip
                            label={submission.status || 'Submitted'}
                            size="small"
                            sx={{
                              bgcolor: submission.status === 'accepted' ? 'rgba(76,175,80,0.2)' : 'rgba(244,67,54,0.2)',
                              color: submission.status === 'accepted' ? '#4CAF50' : '#f44336',
                              fontWeight: 600,
                              fontSize: '0.7rem',
                              height: '22px',
                              textTransform: 'capitalize'
                            }}
                          />
                        </Box>
                        <pre
                          style={{
                            margin: 0,
                            fontFamily: 'monospace',
                            fontSize: '0.8rem',
                            whiteSpace: 'pre-wrap',
                            color: darkMode ? '#d4d4d4' : '#000000'
                          }}
                        >
                          {submission.code || 'No code submitted'}
                        </pre>
                      </Paper>

                      {/* Test Case Results */}
                      {submission.testCaseResults && submission.testCaseResults.length > 0 && (
                        <Box sx={{ mt: 1.5 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: theme.palette.text.primary, fontSize: '0.85rem' }}>
                            Test Case Results ({submission.testCasesPassed} / {submission.totalTestCases} passed)
                          </Typography>
                          <TableContainer
                            component={Paper}
                            sx={{
                              bgcolor: '#0f0f0f',
                              border: `1px solid ${darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.1)'}`,
                              borderRadius: '8px'
                            }}
                          >
                            <Table size="small">
                              <TableHead>
                                <TableRow sx={{ bgcolor: darkMode ? 'rgba(0,136,204,0.1)' : 'rgba(0,136,204,0.05)' }}>
                                  <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', py: 1 }}>Test Case</TableCell>
                                  <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', py: 1 }}>Status</TableCell>
                                  <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', py: 1 }}>Input</TableCell>
                                  <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', py: 1 }}>Expected</TableCell>
                                  <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', py: 1 }}>Actual</TableCell>
                                  <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', py: 1 }} align="right">Time (ms)</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {submission.testCaseResults.map((tc, tcIndex) => (
                                  <TableRow
                                    key={tcIndex}
                                    sx={{
                                      '&:hover': {
                                        bgcolor: darkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,136,204,0.03)'
                                      }
                                    }}
                                  >
                                    <TableCell sx={{ fontSize: '0.8rem', py: 0.75 }}>#{tcIndex + 1}</TableCell>
                                    <TableCell>
                                      <Chip
                                        icon={tc.passed ? <CheckCircleIcon /> : <CancelIcon />}
                                        label={tc.passed ? 'Passed' : 'Failed'}
                                        size="small"
                                        sx={{
                                          bgcolor: tc.passed ? 'rgba(76,175,80,0.1)' : 'rgba(244,67,54,0.1)',
                                          color: tc.passed ? '#4CAF50' : '#f44336',
                                          fontWeight: 600,
                                          '& .MuiChip-icon': {
                                            color: tc.passed ? '#4CAF50' : '#f44336'
                                          }
                                        }}
                                      />
                                    </TableCell>
                                    <TableCell>
                                      <Typography
                                        variant="caption"
                                        sx={{
                                          fontFamily: 'monospace',
                                          fontSize: '0.75rem',
                                          maxWidth: 100,
                                          display: 'block',
                                          overflow: 'hidden',
                                          textOverflow: 'ellipsis',
                                          whiteSpace: 'nowrap'
                                        }}
                                      >
                                        {tc.input || '-'}
                                      </Typography>
                                    </TableCell>
                                    <TableCell>
                                      <Typography
                                        variant="caption"
                                        sx={{
                                          fontFamily: 'monospace',
                                          fontSize: '0.75rem',
                                          maxWidth: 100,
                                          display: 'block',
                                          overflow: 'hidden',
                                          textOverflow: 'ellipsis',
                                          whiteSpace: 'nowrap'
                                        }}
                                      >
                                        {tc.expectedOutput || '-'}
                                      </Typography>
                                    </TableCell>
                                    <TableCell>
                                      <Typography
                                        variant="caption"
                                        sx={{
                                          fontFamily: 'monospace',
                                          fontSize: '0.75rem',
                                          maxWidth: 100,
                                          display: 'block',
                                          overflow: 'hidden',
                                          textOverflow: 'ellipsis',
                                          whiteSpace: 'nowrap',
                                          color: tc.passed ? 'inherit' : '#f44336'
                                        }}
                                      >
                                        {tc.actualOutput || '-'}
                                      </Typography>
                                    </TableCell>
                                    <TableCell align="right">
                                      <Typography variant="caption">
                                        {tc.executionTime || 0}
                                      </Typography>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </TableContainer>
                        </Box>
                      )}
                    </Box>
                  )}

                  {/* Submission Stats */}
                  {submission && (
                    <Grid container spacing={1.5}>
                      <Grid item xs={6} sm={3}>
                        <Box sx={{ textAlign: 'center', p: 1.5, bgcolor: darkMode ? 'rgba(0,136,204,0.05)' : 'rgba(0,136,204,0.03)', borderRadius: '8px' }}>
                          <Typography variant="h6" sx={{ fontWeight: 700, color: '#0088CC', fontSize: '1.1rem' }}>
                            {submission.score || 0}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                            Points Earned
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <Box sx={{ textAlign: 'center', p: 1.5, bgcolor: '#0f0f0f', borderRadius: '8px' }}>
                          <Typography variant="h6" sx={{ fontWeight: 700, color: theme.palette.text.primary, fontSize: '1.1rem' }}>
                            {formatDuration(submission.timeTaken || 0)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                            Time Taken
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <Box sx={{ textAlign: 'center', p: 1.5, bgcolor: '#0f0f0f', borderRadius: '8px' }}>
                          <Typography variant="h6" sx={{ fontWeight: 700, color: theme.palette.text.primary, fontSize: '1.1rem' }}>
                            {question.marks || 0}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                            Max Points
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <Box sx={{ textAlign: 'center', p: 1.5, bgcolor: '#0f0f0f', borderRadius: '8px' }}>
                          <Typography variant="h6" sx={{ fontWeight: 700, color: theme.palette.text.primary, fontSize: '1.1rem' }}>
                            {formatDate(submission.submittedAt)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                            Submitted At
                          </Typography>
                        </Box>
                      </Grid>
                    </Grid>
                  )}

                  {!submission && (
                    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', textAlign: 'center', py: 3 }}>
                      You did not attempt this question
                    </Typography>
                  )}
                </AccordionDetails>
              </Accordion>
            );
          })}
        </Box>
      </Container>
    </Box>
  );
};

export default PATestResults;
