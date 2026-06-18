import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Drawer,
  List,
  ListItem,
  IconButton,
  Tooltip,
  CircularProgress
} from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';
import { apiUrl } from '../../config/apiConfig';
import { toast } from 'react-toastify';

const SidebarNavigation = ({ darkMode }) => {
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

  // Reduced width from 80px to 60px
  const sidebarWidth = 60;

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: sidebarWidth,
        flexShrink: 0,
        position: 'fixed',
        height: '100%',
        [`& .MuiDrawer-paper`]: { 
          width: sidebarWidth, 
          boxSizing: 'border-box',
          bgcolor: navBgColor, // Apply themed background color
          color: darkMode ? '#fff' : '#fff', // Text is white in both themes
          borderRight: 'none', // Remove border to avoid gap
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        },
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
          <Tooltip title={isPrevDisabled ? "No previous question" : "Previous Question"} placement="right">
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
          
          <Tooltip title={isNextDisabled ? "No next question" : "Next Question"} placement="right">
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
    </Drawer>
  );
};

export default SidebarNavigation; 