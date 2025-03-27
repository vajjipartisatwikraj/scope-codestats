import React, { useEffect } from 'react';
import { Box, Container, Typography, Button, Grid, Paper, useTheme } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { School, EmojiEvents, Timeline, Group } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

const Landing = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { token } = useAuth();

  useEffect(() => {
    if (token) {
      navigate('/dashboard');
    }
  }, [token, navigate]);

  if (token) {
    return null;
  }

  const features = [
    {
      icon: <School sx={{ fontSize: 40, color: theme.palette.primary.main }} />,
      title: 'Track Your Progress',
      description: 'Monitor your performance across multiple competitive programming platforms in one place.'
    },
    {
      icon: <EmojiEvents sx={{ fontSize: 40, color: theme.palette.secondary.main }} />,
      title: 'Compete & Compare',
      description: 'Join the leaderboard and compete with fellow students to improve your skills.'
    },
    {
      icon: <Timeline sx={{ fontSize: 40, color: theme.palette.success.main }} />,
      title: 'Learning Resources',
      description: 'Access curated courses and materials to enhance your competitive programming journey.'
    },
    {
      icon: <Group sx={{ fontSize: 40, color: theme.palette.info.main }} />,
      title: 'Community',
      description: 'Be part of a growing community of competitive programmers at MLRIT.'
    }
  ];

  return (
    <Box sx={{ 
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      bgcolor: 'background.default'
    }}>
      <Container maxWidth="lg" sx={{ mt: 8, mb: 4 }}>
        <Box sx={{ textAlign: 'center', mb: 8 }}>
          <Typography
            variant="h2"
            component="h1"
            gutterBottom
            sx={{
              fontWeight: 700,
              background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
              backgroundClip: 'text',
              textFillColor: 'transparent',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            CP Profile Tracker
          </Typography>
          <Typography variant="h5" color="text.secondary" paragraph>
            Your one-stop solution for tracking competitive programming progress
          </Typography>
          <Box sx={{ mt: 4 }}>
            <Button
              variant="contained"
              size="large"
              onClick={() => navigate('/register')}
              sx={{ mr: 2 }}
            >
              Get Started
            </Button>
            <Button
              variant="outlined"
              size="large"
              onClick={() => navigate('/login')}
            >
              Sign In
            </Button>
          </Box>
        </Box>

        <Grid container spacing={4}>
          {features.map((feature, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <Paper
                elevation={3}
                sx={{
                  p: 3,
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  transition: 'transform 0.2s',
                  '&:hover': {
                    transform: 'translateY(-5px)'
                  }
                }}
              >
                {feature.icon}
                <Typography variant="h6" component="h2" sx={{ mt: 2, mb: 1 }}>
                  {feature.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {feature.description}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
};

export default Landing;