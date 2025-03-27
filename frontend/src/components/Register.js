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

const Register = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
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
    
    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

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
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      const registerData = {
        name: formData.name.trim(),
        email: formData.email.toLowerCase().trim(),
        password: formData.password,
        confirmPassword: formData.confirmPassword
      };

      const response = await axios.post('http://localhost:5000/api/auth/register', registerData);
      
      if (response.data && response.data.success) {
        // After successful registration, attempt login
        const loginData = {
          email: formData.email.toLowerCase().trim(),
          password: formData.password
        };

        const loginRes = await axios.post('http://localhost:5000/api/auth/login', loginData);
        
        if (loginRes.data && loginRes.data.token) {
          login(loginRes.data.user, loginRes.data.token);
          toast.success('Registration successful!');
          navigate('/dashboard');
        } else {
          toast.error('Registration successful but login failed. Please try logging in.');
          navigate('/login');
        }
      }
    } catch (error) {
      console.error('Registration error:', error);
      
      if (error.response) {
        const message = error.response.data?.message || 
                       error.response.data?.error || 
                       'Registration failed';
        toast.error(message);
        
        if (error.response.status === 400) {
          const validationErrors = error.response.data?.errors;
          if (validationErrors) {
            setErrors(validationErrors);
          }
        }
      } else if (error.request) {
        toast.error('No response from server. Please check your connection.');
      } else {
        toast.error('An error occurred while trying to register');
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
            variant="h3" 
            sx={{ 
              fontWeight: 700, 
              mb: 3,
              fontSize: '2.5rem',
              letterSpacing: '0.5px'
            }}
          >
            COMPANY LOGO
          </Typography>
          <Typography 
            variant="h4" 
            sx={{ 
              fontWeight: 600, 
              mb: 2,
              fontSize: '2rem',
              letterSpacing: '0.5px'
            }}
          >
            Welcome!
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
            Create your account and start your journey with us.
          </Typography>
        </Box>
      </Box>

      {/* Register Form */}
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
          px: { xs: 2, sm: 4 },
        }}
      >
        <Box sx={{ maxWidth: 600, width: '100%' }}>
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
            <Typography
              variant="h4"
              sx={{
                fontWeight: 300,
                letterSpacing: '0.5px',
                color: 'white'
              }}
            >
              Create your
            </Typography>
            <Typography
              variant="h3"
              sx={{
                mb: 6,
                fontWeight: 500,
                letterSpacing: '0.5px',
                color: 'white'
              }}
            >
              Account
            </Typography>

            <Box sx={{ mt: 4 }}>
              <TextField
                fullWidth
                variant="standard"
                placeholder="Full Name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                error={!!errors.name}
                helperText={errors.name}
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
                placeholder="Confirm Password"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={handleChange}
                error={!!errors.confirmPassword}
                helperText={errors.confirmPassword}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton 
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        sx={{ color: 'rgba(255, 255, 255, 0.5)' }}
                      >
                        {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{
                  mb: 2,
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
                mt: 8,
                height: '45px',
                width: '100%',
                marginTop: '50px !important',
              }}>
                <Button
                  component={Link}
                  to="/login"
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
                  Login
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
                  Register
                </Button>
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>
    </>
  );
};

export default Register;