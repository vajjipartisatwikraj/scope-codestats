import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Box,
  Button,
  TextField,
  Typography,
  IconButton,
  InputAdornment,
} from '@mui/material';
import { Visibility, VisibilityOff, ArrowBack } from '@mui/icons-material';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState({});

  // Hide navbar and set dark background
  useEffect(() => {
    document.body.style.backgroundColor = '#000';
    document.body.classList.add('hide-navbar');
    return () => {
      document.body.style.backgroundColor = '';
      document.body.classList.remove('hide-navbar');
    };
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!formData.email.toLowerCase().endsWith('@mlrit.ac.in') && 
               !formData.email.toLowerCase().endsWith('@mlrinstitutions.ac.in')) {
      newErrors.email = 'Please use your MLRIT college email';
    }
    
    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      // Format email to lowercase to ensure consistency
      const loginData = {
        email: formData.email.toLowerCase().trim(),
        password: formData.password
      };

      // Add proper error handling and logging
      console.log('Attempting login with:', { email: loginData.email });
      
      const response = await axios.post('http://localhost:5000/api/auth/login', loginData);
      
      if (!response.data || !response.data.token || !response.data.user) {
        console.error('Invalid response format:', response.data);
        toast.error('Invalid server response format');
        return;
      }

      // Store user data and token in auth context
      await login(response.data.user, response.data.token);
      
      toast.success('Login successful!');
      
      // Check if user has completed registration
      const isNewUser = response.data.user.newUser;
      
      // Redirect based on registration status
      setTimeout(() => {
        if (isNewUser || isNewUser === undefined || isNewUser === null) {
          navigate('/register', { state: { activeStep: 1 } }); // Go to profile completion step
        } else {
          navigate('/dashboard');
        }
      }, 500);
    } catch (error) {
      console.error('Login error:', error);
      
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        const message = error.response.data?.message || 
                       error.response.data?.error || 
                       'Invalid credentials';
        toast.error(message);
        
        if (error.response.status === 400) {
          // Handle validation errors
          const validationErrors = error.response.data?.errors;
          if (validationErrors) {
            setErrors(validationErrors);
          }
        }
      } else if (error.request) {
        // The request was made but no response was received
        toast.error('No response from server. Please check your connection.');
      } else {
        // Something happened in setting up the request
        toast.error('An error occurred while trying to log in');
      }
    }
  };

  return (
    <>
      {/* Full screen blue background */}
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: { xs: '0%', md: '50%' },
          height: '100vh',
          bgcolor: '#0088cc',
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          color: 'white',
          textAlign: 'center',
          p: 4,
        }}
      >
        <Box sx={{ maxWidth: '400px' }}>
          <Typography 
            variant="h4" 
            sx={{ 
              fontWeight: 600, 
              mb: 2,
              fontSize: '2rem',
              letterSpacing: '0.5px'
            }}
          >
            Welcome Back!
          </Typography>
          <Typography 
            variant="body1" 
            sx={{ 
              fontSize: '1.1rem',
              opacity: 0.9,
              maxWidth: '80%',
              mx: 'auto',
              lineHeight: 1.5
            }}
          >
            Sign in to continue your journey with us.
          </Typography>
        </Box>
      </Box>

      {/* Login Form */}
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          right: 0,
          width: { xs: '100%', md: '50%' },
          height: '100vh',
          bgcolor: '#000',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          p: { xs: 5, sm: 6 },
        }}
      >
        <Box sx={{ maxWidth: 600, width: '100%', py:4 }}>
          <Button
            component={Link}
            to="/"
            startIcon={<ArrowBack />}
            sx={{
              color: '#0088cc',
              textTransform: 'none',
              fontSize: '1rem',
              mb: 2,
              '&:hover': {
                backgroundColor: 'transparent',
                opacity: 0.8,
              },
              marginBottom: '100px',
              position: 'absolute',
              top: '20px',
              left: '20px',
            }}
          >
            Go Back
          </Button>

          <Box>
            <Box sx={{ mb: 6 }}>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 300,
                  letterSpacing: '0.5px',
                  color: 'white',
                  textAlign: 'left'
                }}
              >
                Welcome to
              </Typography>
              <Typography
                variant="h3"
                sx={{
                  fontWeight: 600,
                  letterSpacing: '0.5px',
                  color: 'white',
                  textAlign: 'left'
                }}
              >
                SCOPE CODESTATS
              </Typography>
            </Box>

            <Box sx={{ mt: 4 }}>
              {/* Email and Password Fields */}
              <TextField
                fullWidth
                variant="standard"
                placeholder="College Email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                error={!!errors.email}
                helperText={errors.email}
                sx={{
                  mb: 4,
                  '& .MuiInput-underline:before': {
                    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
                  },
                  '& .MuiInput-underline:hover:before': {
                    borderBottomColor: 'rgba(255, 255, 255, 0.3)',
                  },
                  '& .MuiInput-underline:after': {
                    borderBottomColor: '#0088cc',
                  },
                  '& input': {
                    color: 'white',
                    fontSize: '1rem',
                    height: '32px',
                    '&::placeholder': {
                      color: 'rgba(255, 255, 255, 0.5)',
                      opacity: 1,
                    },
                  },
                  '& .MuiFormHelperText-root': {
                    color: 'error.main',
                  },
                }}
              />

              <TextField
                fullWidth
                variant="standard"
                placeholder="Password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleChange}
                error={!!errors.password}
                helperText={errors.password}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton 
                        onClick={() => setShowPassword(!showPassword)}
                        sx={{ color: 'rgba(255, 255, 255, 0.5)' }}
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{
                  mb: 5,
                  '& .MuiInput-underline:before': {
                    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
                  },
                  '& .MuiInput-underline:hover:before': {
                    borderBottomColor: 'rgba(255, 255, 255, 0.3)',
                  },
                  '& .MuiInput-underline:after': {
                    borderBottomColor: '#0088cc',
                  },
                  '& input': {
                    color: 'white',
                    fontSize: '1rem',
                    height: '32px',
                    '&::placeholder': {
                      color: 'rgba(255, 255, 255, 0.5)',
                      opacity: 1,
                    },
                  },
                  '& .MuiFormHelperText-root': {
                    color: 'error.main',
                  },
                }}
              />

              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                alignItems: 'center',
                mt: 1
              }}>
                <Button
                  component={Link}
                  to="/register"
                  variant="outlined"
                  sx={{
                    color: '#0088cc',
                    borderColor: '#0088cc',
                    textTransform: 'none',
                    fontSize: '1rem',
                    height: '45px',
                    minWidth: '120px',
                    px: 4,
                    '&:hover': {
                      borderColor: '#0088cc',
                      backgroundColor: 'transparent',
                    },
                  }}
                >
                  Register
                </Button>
                <Button
                  variant="contained"
                  onClick={handleSubmit}
                  sx={{
                    bgcolor: '#0088cc',
                    color: 'white',
                    textTransform: 'none',
                    fontSize: '1rem',
                    height: '45px',
                    minWidth: '120px',
                    px: 4,
                    '&:hover': {
                      bgcolor: '#0077b3',
                    },
                  }}
                >
                  Login
                </Button>
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>
    </>
  );
};

export default Login;
