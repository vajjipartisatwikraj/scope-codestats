import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  IconButton,
  Tooltip,
  CircularProgress,
  Typography,
  Chip,
} from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';
import { apiUrl } from '../../config/apiConfig';
import { toast } from 'react-toastify';

const SidebarNavigation = ({ darkMode, problemListOpen = false, onCloseProblemList }) => {
  const navigate = useNavigate();
  const { cohortId, moduleId, questionId } = useParams();
  const { toggleTheme } = useTheme();
  const { token } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [moduleQuestions, setModuleQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(-1);
  
  // Theme colors
  const navBgColor = '#0088CC'; // Both themes: blue
  const buttonBgColor = '#FFFFFF'; // Both themes: white button background
  const buttonColor = '#000000'; // Both themes: black icon color
  const buttonHoverBgColor = '#F0F0F0'; // Hover effect
  const disabledButtonColor = '#000000'; // Changed to black for better visibility

  // Fetch the list of questions in this module
  useEffect(() => {
    const fetchModuleQuestions = async () => {
      if (!moduleId || !cohortId) return;
      
      setLoading(true);
      try {
        const response = await axios.get(
          `${apiUrl}/cohorts/${cohortId}/modules/${moduleId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        if (response.data && response.data.questions) {
          setModuleQuestions(response.data.questions);
          
          // Find the index of the current question
          const index = response.data.questions.findIndex(q => q._id === questionId);
          setCurrentQuestionIndex(index);
        }
      } catch (error) {
        console.error('Error fetching module questions:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchModuleQuestions();
  }, [cohortId, moduleId, questionId, token]);
  
  const handleNavigateToHome = () => {
    navigate('/dashboard');
  };
  
  const handleNavigateToPreviousQuestion = () => {
    if (loading || currentQuestionIndex <= 0) return;
    
    // Get the previous question ID
    const prevIndex = currentQuestionIndex - 1;
    if (prevIndex >= 0 && moduleQuestions[prevIndex]) {
      const prevQuestionId = moduleQuestions[prevIndex]._id;
      navigate(`/cohorts/${cohortId}/modules/${moduleId}/questions/${prevQuestionId}`);
      toast.info("Navigating to previous question");
    }
  };
  
  const handleNavigateToNextQuestion = () => {
    if (loading || currentQuestionIndex === -1 || currentQuestionIndex >= moduleQuestions.length - 1) return;
    
    // Get the next question ID
    const nextIndex = currentQuestionIndex + 1;
    if (nextIndex < moduleQuestions.length && moduleQuestions[nextIndex]) {
      const nextQuestionId = moduleQuestions[nextIndex]._id;
      navigate(`/cohorts/${cohortId}/modules/${moduleId}/questions/${nextQuestionId}`);
      toast.info("Navigating to next question");
    }
  };

  // Determine if prev/next buttons should be disabled
  const isPrevDisabled = loading || currentQuestionIndex <= 0;
  const isNextDisabled = loading || currentQuestionIndex === -1 || currentQuestionIndex >= moduleQuestions.length - 1;

  // Platform-aware modifier label for shortcut hints
  const isMac =
    typeof navigator !== 'undefined' &&
    /Mac|iPod|iPhone|iPad/.test(navigator.platform);
  const modKey = isMac ? '⌘' : 'Ctrl';

  // Keyboard shortcuts for navigating problems:
  //   Previous = Ctrl/Cmd + Shift + ,   Next = Ctrl/Cmd + Shift + .
  useEffect(() => {
    const handleKey = (e) => {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod || !e.shiftKey) return;
      if (e.code === 'Comma') {
        e.preventDefault();
        handleNavigateToPreviousQuestion();
      } else if (e.code === 'Period') {
        e.preventDefault();
        handleNavigateToNextQuestion();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [currentQuestionIndex, moduleQuestions, loading]);

  // Reduced width from 80px to 60px
  const sidebarWidth = 60;

  // Difficulty color helper for the problem list
  const getDifficultyColor = (q) => {
    const d = (q.difficultyLevel || q.difficulty || 'medium').toLowerCase();
    if (d === 'easy') return '#7CFF9B';
    if (d === 'hard') return '#FF8A80';
    return '#FFD54F';
  };

  const isQuestionSolved = (q) =>
    q.isSolved || q.solved || q.status === 'accepted' || q.userStatus === 'accepted';

  const handleSelectQuestion = (q) => {
    if (onCloseProblemList) onCloseProblemList();
    if (q._id !== questionId) {
      navigate(`/cohorts/${cohortId}/modules/${moduleId}/questions/${q._id}`);
    }
  };

  return (
    <>
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        height: '100%',
        width: problemListOpen ? 400 : sidebarWidth,
        boxSizing: 'border-box',
        bgcolor: navBgColor, // Themed blue background
        color: '#fff',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'row',
        zIndex: problemListOpen ? 1360 : 1250,
        transition: 'width 0.34s cubic-bezier(0.22, 1, 0.36, 1)',
      }}
    >
      {/* Narrow icon column (always visible) */}
      <Box
        sx={{
          width: sidebarWidth,
          flexShrink: 0,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
      <Box>
        {/* Logo in rounded container with better sizing */}
        <Box 
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            p: 1,
            m: 1,
            mb: 2,
            borderRadius: '10px',
            bgcolor: '#FFFFFF', // White background
            boxShadow: darkMode ? '0 4px 8px rgba(0,0,0,0.3)' : '0 4px 8px rgba(0,0,0,0.1)',
            width: '48px',
            height: '48px',
            mx: 'auto' // Center horizontally
          }}
        >
          <img 
            src="/scope-blac.png" 
            alt="Scope Logo" 
            style={{ 
              maxHeight: '32px',
              maxWidth: '100%',
              objectFit: 'contain'
            }} 
          />
        </Box>
        
        {/* Navigation Menu - Just Home icon with premium rounded style */}
        <List>
          <ListItem sx={{ display: 'flex', justifyContent: 'center', mb: 2, p: 0.5 }}>
            <Tooltip title="Home" placement="right">
              <IconButton
                onClick={handleNavigateToHome}
                sx={{
                  width: 36,
                  height: 36,
                  bgcolor: buttonBgColor,
                  color: buttonColor,
                  borderRadius: '50%',
                  '&:hover': {
                    bgcolor: buttonHoverBgColor,
                    boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
                  }
                }}
              >
                <HomeIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
          </ListItem>
        </List>
      </Box>
      
      {/* Bottom Navigation - Theme toggle and navigation arrows */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
          <Tooltip title={isPrevDisabled ? "No previous question" : `Previous Question (${modKey} + Shift + ,)`} placement="right">
            <span> {/* Wrap in span to allow tooltip on disabled button */}
              <IconButton
                onClick={handleNavigateToPreviousQuestion}
                disabled={isPrevDisabled}
                sx={{
                  width: 32,
                  height: 32,
                  bgcolor: buttonBgColor,
                  color: disabledButtonColor, // Always use black for visibility
                  borderRadius: '50%',
                  '&:hover': {
                    bgcolor: isPrevDisabled ? buttonBgColor : buttonHoverBgColor,
                    boxShadow: isPrevDisabled ? 'none' : '0 4px 8px rgba(0,0,0,0.1)'
                  },
                  '&.Mui-disabled': {
                    bgcolor: buttonBgColor,
                    opacity: 0.5, // Less transparent to increase visibility
                    color: disabledButtonColor // Ensure black color when disabled
                  }
                }}
              >
                {loading ? (
                  <CircularProgress size={14} color="inherit" />
                ) : (
                  <ArrowBackIosNewIcon sx={{ fontSize: 14 }} />
                )}
              </IconButton>
            </span>
          </Tooltip>
          
          <Tooltip title={isNextDisabled ? "No next question" : `Next Question (${modKey} + Shift + .)`} placement="right">
            <span> {/* Wrap in span to allow tooltip on disabled button */}
              <IconButton
                onClick={handleNavigateToNextQuestion}
                disabled={isNextDisabled}
                sx={{
                  width: 32,
                  height: 32,
                  bgcolor: buttonBgColor,
                  color: disabledButtonColor, // Always use black for visibility
                  borderRadius: '50%',
                  '&:hover': {
                    bgcolor: isNextDisabled ? buttonBgColor : buttonHoverBgColor,
                    boxShadow: isNextDisabled ? 'none' : '0 4px 8px rgba(0,0,0,0.1)'
                  },
                  '&.Mui-disabled': {
                    bgcolor: buttonBgColor,
                    opacity: 0.5, // Less transparent to increase visibility
                    color: disabledButtonColor // Ensure black color when disabled
                  }
                }}
              >
                {loading ? (
                  <CircularProgress size={14} color="inherit" />
                ) : (
                  <ArrowForwardIosIcon sx={{ fontSize: 14 }} />
                )}
              </IconButton>
            </span>
          </Tooltip>
          
          <Tooltip title="Toggle Dark Mode" placement="right">
            <IconButton
              onClick={toggleTheme}
              sx={{
                width: 32,
                height: 32,
                bgcolor: buttonBgColor,
                color: buttonColor,
                borderRadius: '50%',
                mt: 1,
                '&:hover': {
                  bgcolor: buttonHoverBgColor,
                  boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
                }
              }}
            >
              {darkMode ? <Brightness7Icon sx={{ fontSize: 16, color: buttonColor }} /> : <Brightness4Icon sx={{ fontSize: 16, color: buttonColor }} />}
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
      </Box>
      {/* End narrow icon column */}

      {/* List column — visible only when the sidebar is expanded */}
      {problemListOpen && (
      <Box
        sx={{
          flex: 1,
          minWidth: 0,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          borderLeft: '1px solid rgba(255,255,255,0.22)',
        }}
      >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2.5,
          py: 2,
          borderBottom: '1px solid rgba(255,255,255,0.22)',
        }}
      >
        <Box>
          <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: '1rem', lineHeight: 1.2 }}>
            Problem List
          </Typography>
          <Typography sx={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.72rem' }}>
            {moduleQuestions.length} problem{moduleQuestions.length === 1 ? '' : 's'} in this module
          </Typography>
        </Box>
        <IconButton onClick={onCloseProblemList} size="small" sx={{ color: '#fff' }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Question list */}
      <Box
        sx={{
          flex: 1,
          overflow: 'auto',
          p: 1.25,
          '&::-webkit-scrollbar': { width: '8px' },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: 'rgba(255,255,255,0.3)',
            borderRadius: '4px',
          },
        }}
      >
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress size={26} sx={{ color: '#fff' }} />
          </Box>
        ) : moduleQuestions.length === 0 ? (
          <Typography sx={{ color: 'rgba(255,255,255,0.85)', textAlign: 'center', py: 6, fontSize: '0.9rem' }}>
            No problems found in this module.
          </Typography>
        ) : (
          <List sx={{ p: 0 }}>
            {moduleQuestions.map((q, index) => {
              const isCurrent = q._id === questionId;
              const solved = isQuestionSolved(q);
              return (
                <ListItemButton
                  key={q._id}
                  onClick={() => handleSelectQuestion(q)}
                  sx={{
                    borderRadius: '10px',
                    mb: 0.75,
                    px: 1.25,
                    py: 1,
                    gap: 1.25,
                    alignItems: 'flex-start',
                    bgcolor: isCurrent ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.08)',
                    border: '1px solid',
                    borderColor: isCurrent ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.12)',
                    '&:hover': {
                      bgcolor: 'rgba(255,255,255,0.18)',
                    },
                  }}
                >
                  <Box sx={{ pt: '2px', flexShrink: 0 }}>
                    {solved ? (
                      <CheckCircleIcon sx={{ fontSize: 20, color: '#7CFF9B' }} />
                    ) : (
                      <RadioButtonUncheckedIcon sx={{ fontSize: 20, color: 'rgba(255,255,255,0.6)' }} />
                    )}
                  </Box>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography
                      sx={{
                        color: '#fff',
                        fontWeight: isCurrent ? 700 : 500,
                        fontSize: '0.9rem',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {index + 1}. {q.title}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.25 }}>
                      <Typography
                        sx={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          color: getDifficultyColor(q),
                          textTransform: 'capitalize',
                        }}
                      >
                        {(q.difficultyLevel || q.difficulty || 'medium')}
                      </Typography>
                      {typeof q.marks === 'number' && (
                        <Typography sx={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.7)' }}>
                          • {q.marks} pts
                        </Typography>
                      )}
                    </Box>
                  </Box>
                  {isCurrent && (
                    <Chip
                      label="Current"
                      size="small"
                      sx={{
                        height: 20,
                        fontSize: '0.6rem',
                        fontWeight: 700,
                        bgcolor: 'rgba(255,255,255,0.9)',
                        color: navBgColor,
                      }}
                    />
                  )}
                </ListItemButton>
              );
            })}
          </List>
        )}
      </Box>
      </Box>
      )}
    </Box>

    {/* Blurred backdrop behind the expanded sidebar */}
    <Box
      onClick={onCloseProblemList}
      sx={{
        position: 'fixed',
        inset: 0,
        zIndex: 1350,
        bgcolor: 'rgba(0,0,0,0.45)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        opacity: problemListOpen ? 1 : 0,
        visibility: problemListOpen ? 'visible' : 'hidden',
        transition: 'opacity 0.3s ease, visibility 0.3s ease',
      }}
    />
    </>
  );
};

export default SidebarNavigation; 