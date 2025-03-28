import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import './MultiStepRegister.css';
import {
  Box,
  Button,
  TextField,
  Typography,
  Container,
  Paper,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  InputAdornment,
  useTheme,
  Grid,
  FormHelperText,
  Fade,
  Tooltip,
} from '@mui/material';
import {
  Visibility as Eye,
  VisibilityOff as EyeSlash,
  ArrowBack,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const departments = ['AERO', 'CSC', 'CSD', 'CSE', 'CSM', 'CSIT', 'IT', 'ECE', 'MECH', 'EEE'];
const sections = ['None', 'A', 'B', 'C', 'D', 'E', 'F', 'G'];
const currentYear = new Date().getFullYear();
const graduatingYears = Array.from({ length: 7 }, (_, i) => currentYear + i);

const MultiStepRegister = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [activeStep, setActiveStep] = useState(location?.state?.activeStep || 0);

  const [formData, setFormData] = useState({
    // Basic Registration
    name: '',
    email: '',
    password: '',
    confirmPassword: '',

    // Profile Completion
    rollNumber: '',
    graduatingYear: '',
    department: '',
    section: '',
    mobileNumber: '',
    gender: 'Male',
    linkedinUrl: '',

    // Coding Profiles
    leetcode: '',
    hackerrank: '',
    codeforces: '',
    codechef: '',
    geeksforgeeks: '',
    github: '',

    // About Yourself
    about: '',
    skills: '',
    interests: ''
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Hide navbar and set dark background
  useEffect(() => {
    document.body.style.backgroundColor = '#1a1a1a';
    document.body.classList.add('hide-navbar');
    return () => {
      document.body.style.backgroundColor = '';
      document.body.classList.remove('hide-navbar');
    };
  }, []);

  // Initialize form data if coming from login redirect
  useEffect(() => {
    // Check if we're starting on step 1 (profile completion) which means we came from login
    if (activeStep === 1 && location?.state?.activeStep === 1) {
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      if (currentUser) {
        // Make sure graduation year is a valid number
        let graduatingYear = currentUser.graduatingYear;
        if (graduatingYear) {
          graduatingYear = Number(graduatingYear);
        } else {
          // Default to current year + 4 if none set
          graduatingYear = new Date().getFullYear() + 4;
        }
        
        console.log('Setting initial data on login redirect:', { 
          graduatingYear, 
          rollNumber: currentUser.rollNumber
        });
        
        setFormData(prev => ({
          ...prev,
          name: currentUser.name || '',
          email: currentUser.email || '',
          rollNumber: currentUser.rollNumber || '',
          department: currentUser.department || '',
          graduatingYear: graduatingYear,
          section: currentUser.section || '',
          gender: currentUser.gender || 'Male',
        }));
      }
    }
  }, []);

  // Load user data when component mounts, especially for redirected users after login
  useEffect(() => {
    // Check if we're on the profile completion step (step 1)
    if (activeStep === 1) {
      try {
        // Get current user data from localStorage
        const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
        
        // Calculate the correct graduation year from roll number
        let graduatingYear = currentUser.graduatingYear;
        
        // If the roll number exists, recalculate to ensure correct graduation year
        if (currentUser.rollNumber && currentUser.rollNumber.length >= 2) {
          // Extract year from roll number (first 2 digits)
          const yearCode = currentUser.rollNumber.substring(0, 2);
          const admissionYear = 2000 + parseInt(yearCode, 10);
          // Standard 4-year degree
          const calculatedYear = admissionYear + 4;
          
          console.log('Graduation year calculation:', {
            rollNumber: currentUser.rollNumber,
            yearCode,
            admissionYear,
            calculatedYear,
            storedYear: graduatingYear
          });
          
          // Use the calculated year rather than the stored one to ensure consistency
          graduatingYear = calculatedYear;
        } else if (graduatingYear) {
          // If no roll number but graduation year exists, convert to number
          graduatingYear = Number(graduatingYear);
        }
        
        // Update form data with user information
        setFormData(prev => ({
          ...prev,
          // Set these values from user data if available
          name: currentUser.name || prev.name,
          email: currentUser.email || prev.email,
          rollNumber: currentUser.rollNumber || prev.rollNumber,
          department: currentUser.department || prev.department,
          graduatingYear: graduatingYear || prev.graduatingYear, // Use the recalculated year
          section: currentUser.section || prev.section,
          mobileNumber: currentUser.mobileNumber || prev.mobileNumber,
          gender: currentUser.gender || prev.gender,
          linkedinUrl: currentUser.linkedinUrl || prev.linkedinUrl
        }));
        
        console.log('Loaded user data for profile completion:', {
          rollNumber: currentUser.rollNumber,
          department: currentUser.department,
          graduatingYear: graduatingYear
        });
      } catch (error) {
        console.error('Error loading user data:', error);
      }
    }
  }, [activeStep]);

  // Log when formData changes to debug the graduation year issue
  useEffect(() => {
    if (activeStep === 1) {
      console.log('Current formData:', {
        graduatingYear: formData.graduatingYear,
        typeOfGraduatingYear: typeof formData.graduatingYear,
        availableYears: graduatingYears
      });
    }
  }, [formData, activeStep]);

  const validateBasicRegistration = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!formData.email.endsWith('@mlrit.ac.in') && !formData.email.endsWith('@mlrinstitutions.ac.in')) 
      newErrors.email = 'Please use your MLRIT college email';
    if (!formData.password) newErrors.password = 'Password is required';
    else if (formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    else if (!/\d/.test(formData.password)) newErrors.password = 'Password must contain at least one number';
    else if (!/[A-Z]/.test(formData.password)) newErrors.password = 'Password must contain at least one uppercase letter';
    if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateProfileCompletion = async () => {
    const newErrors = {};
    // Skip validation for pre-filled fields
    
    if (!formData.section) newErrors.section = 'Section is required';
    if (!formData.mobileNumber.trim()) newErrors.mobileNumber = 'Mobile number is required';
    else if (!/^[6-9]\d{9}$/.test(formData.mobileNumber)) newErrors.mobileNumber = 'Please enter a valid 10-digit mobile number';
    if (!formData.gender) newErrors.gender = 'Gender is required';

    // Only validate mobile number uniqueness if it has changed
    try {
      // Check mobile number only if different from what's stored in local storage
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      if (!currentUser.mobileNumber || currentUser.mobileNumber !== formData.mobileNumber) {
        const response = await axios.post('http://localhost:5000/api/auth/validate', {
          mobileNumber: formData.mobileNumber
        });
        
        if (response.data.mobileNumberExists) {
          newErrors.mobileNumber = 'This mobile number is already registered';
        }
      }
    } catch (err) {
      console.error('Validation error:', err);
      toast.error('Error validating profile information');
      return false;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

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

  const handleNext = async () => {
    let isValid = false;
    
    switch (activeStep) {
      case 0:
        isValid = validateBasicRegistration();
        if (isValid) {
          try {
            // Register user after step 1
            await registerUser({
              name: formData.name,
              email: formData.email,
              password: formData.password,
              confirmPassword: formData.confirmPassword
            });
            setActiveStep((prevStep) => prevStep + 1);
          } catch (err) {
            console.error('Registration error:', err);
            isValid = false;
          }
        }
        break;
      case 1:
        isValid = await validateProfileCompletion();
        if (isValid) {
          setActiveStep((prevStep) => prevStep + 1);
        }
        break;
      default:
        isValid = true;
        setActiveStep((prevStep) => prevStep + 1);
        break;
    }
  };

  // Function to register user after completing step 1
  const registerUser = async (userData) => {
    try {
      const registerRes = await axios.post('/api/auth/register', userData);
      
      if (registerRes.data && registerRes.data.token && registerRes.data.user) {
        const { token, user } = registerRes.data;
        await login(user, token);
        toast.success('Account created successfully! Please complete your profile.');
        
        // Pre-fill form data with info from the registration
        setFormData(prev => ({
          ...prev,
          rollNumber: user.rollNumber || prev.rollNumber,
          department: user.department || prev.department,
          graduatingYear: user.graduatingYear || prev.graduatingYear
        }));
        
        return true;
      } else {
        throw new Error('Invalid registration response');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          error.message || 
                          'Registration failed';
      toast.error(errorMessage);
      throw error;
    }
  };

  const handleSkip = () => {
    if (activeStep === 3) {
      handleSubmit();
      return;
    }
    setActiveStep((prevStep) => prevStep + 1);
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      
      // Create profile update payload
      const profileData = {
        section: formData.section,
        mobileNumber: formData.mobileNumber,
        gender: formData.gender,
        linkedinUrl: formData.linkedinUrl || '',
        about: formData.about || '',
        skills: formData.skills || '',
        interests: formData.interests || '',
        profiles: {
          leetcode: formData.leetcode || '',
          hackerrank: formData.hackerrank || '',
          codeforces: formData.codeforces || '',
          codechef: formData.codechef || '',
          geeksforgeeks: formData.geeksforgeeks || '',
          github: formData.github || '',
        }
      };

      // Send update request
      console.log('Sending profile update data:', profileData);
      const updateRes = await axios.post('/api/auth/completeRegistration', profileData, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      console.log('Profile update response:', updateRes.data);
      
      // Update the user data in context
      if (updateRes.data && updateRes.data.user) {
        // Update user in context with the updated profile
        const user = updateRes.data.user;
        const token = localStorage.getItem('token');
        await login(user, token);
        
        toast.success('Profile completed successfully!');
        
        // Navigate to dashboard
        setTimeout(() => {
          navigate('/dashboard');
        }, 500);
      } else {
        console.error('Invalid update response:', updateRes.data);
        toast.error('Profile update failed: Invalid server response');
      }
    } catch (error) {
      console.error('Profile update error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });

      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          error.message || 
                          'Profile update failed';

      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const renderButtons = () => {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center',
        mt: 4,
        height: '45px',
        width: '100%',
      }}>
        <Box>
          {activeStep > 0 && (
            <Button
              onClick={handleBack}
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
              Back
            </Button>
          )}
        </Box>
        <Box sx={{ display: 'flex', gap: 2, marginLeft: 'auto' }}>
          {(activeStep === 2 || activeStep === 3) && (
            <Button
              variant="outlined"
              onClick={handleSkip}
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
              Skip
            </Button>
          )}
          <Button
            variant="contained"
            onClick={activeStep === 3 ? handleSubmit : handleNext}
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
            {activeStep === 3 ? 'Submit' : 'Next'}
          </Button>
        </Box>
      </Box>
    );
  };

  const commonTextFieldStyles = {
    mb: 3,
    width: '100%',
    '& .MuiInput-underline:before': {
      borderBottomColor: 'rgba(255, 255, 255, 0.2)',
    },
    '& .MuiInput-underline:hover:before': {
      borderBottomColor: 'rgba(255, 255, 255, 0.3)',
    },
    '& .MuiInput-underline:after': {
      borderBottomColor: '#0088cc',
    },
    '& input, & textarea': {
      color: 'white',
      fontSize: '1rem',
      height: '32px',
      padding: '8px 0',
      '&::placeholder': {
        color: 'rgba(255, 255, 255, 0.5)',
        opacity: 1,
      },
    },
    '& textarea': {
      height: 'auto',
    },
    '& .MuiFormHelperText-root': {
      color: '#ff4444',
      marginLeft: 0,
      marginTop: '4px',
    },
  };

  const commonSelectStyles = {
    width: '100%',
    mb: 3,
    '& .MuiInput-underline:before': {
      borderBottomColor: 'rgba(255, 255, 255, 0.2)',
    },
    '& .MuiInput-underline:hover:before': {
      borderBottomColor: 'rgba(255, 255, 255, 0.3)',
    },
    '& .MuiInput-underline:after': {
      borderBottomColor: '#0088cc',
    },
    '& .MuiSelect-select': {
      color: 'white',
      fontSize: '1rem',
      height: '1.4375em',
      padding: '8px 0', 
    },
    '& .MuiSelect-icon': {
      color: 'rgba(255, 255, 255, 0.5)',
    },
    '& .MuiFormHelperText-root': {
      color: '#ff4444',
      marginLeft: 0,
      marginTop: '4px',
    },
    '& .MuiInputLabel-root': {
      color: 'rgba(255, 255, 255, 0.5)',
      '&.Mui-focused': {
        color: '#0088cc',
      },
      transform: 'translate(0, 1.5px) scale(0.75)',
      transformOrigin: 'top left',
    },
    '& .MuiInputLabel-shrink': {
      transform: 'translate(0, 1.5px) scale(0.75)',
    },
  };

  const renderStepHeader = (title, subtitle) => (
    <>
      <Typography
        variant="h4"
        sx={{
          fontWeight: 300,
          letterSpacing: '0.5px',
          color: 'white'
        }}
      >
        {title}
      </Typography>
      <Typography
        variant="h3"
        sx={{
          mb: 6,
          fontWeight: 600,
          letterSpacing: '0.5px',
          color: 'white'
        }}
      >
        {subtitle}
      </Typography>
    </>
  );

  const renderBasicRegistration = () => (
    <Box>
      {renderStepHeader('Create your', 'Account')}

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
          sx={commonTextFieldStyles}
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
          sx={commonTextFieldStyles}
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
          sx={commonTextFieldStyles}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  onClick={() => setShowPassword(!showPassword)}
                  edge="end"
                >
                  {showPassword ? <Eye /> : <EyeSlash />}
                </IconButton>
              </InputAdornment>
            ),
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
          sx={commonTextFieldStyles}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  edge="end"
                >
                  {showConfirmPassword ? <Eye /> : <EyeSlash />}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
        {renderButtons()}
      </Box>
    </Box>
  );

  const renderProfileCompletion = () => (
    <Box>
      {renderStepHeader('Complete your', 'Profile')}

      <Box sx={{ 
        mt: 2, 
        '& .MuiGrid-item': {
          display: 'flex',
          flexDirection: 'column'
        }
      }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <Tooltip 
              title="This field is auto-filled based on your email and cannot be edited"
              placement="top"
              arrow
              enterDelay={300}
              leaveDelay={100}
            >
              <Box sx={{ width: '100%' }}>
                <TextField
                  fullWidth
                  variant="standard"
                  placeholder="Roll No"
                  name="rollNumber"
                  value={formData.rollNumber}
                  onChange={handleChange}
                  error={!!errors.rollNumber}
                  helperText={errors.rollNumber}
                  disabled={true}
                  sx={{
                    ...commonTextFieldStyles,
                    '& .Mui-disabled': {
                      color: 'rgba(255, 255, 255, 0.7) !important',
                      WebkitTextFillColor: 'rgba(255, 255, 255, 0.7) !important',
                    }
                  }}
                />
              </Box>
            </Tooltip>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Tooltip 
              title="This field is auto-filled based on your email and cannot be edited"
              placement="top"
              arrow
              enterDelay={300}
              leaveDelay={100}
            >
              <Box sx={{ width: '100%' }}>
                <FormControl 
                  fullWidth 
                  variant="standard"
                  error={!!errors.graduatingYear}
                  disabled={true}
                >
                  <InputLabel 
                    shrink 
                    sx={{ 
                      color: 'rgba(255, 255, 255, 0.5)',
                      transform: 'translate(0, 1.5px) scale(0.75)',
                      transformOrigin: 'top left'
                    }}
                  >
                    Year of Graduation
                  </InputLabel>
                  <Select
                    name="graduatingYear"
                    value={formData.graduatingYear ? Number(formData.graduatingYear) : ''}
                    onChange={handleChange}
                    displayEmpty
                    renderValue={(value) => (value !== '' ? value : 'Year of Graduation')}
                    sx={{
                      ...commonSelectStyles,
                      '& .Mui-disabled': {
                        color: 'rgba(255, 255, 255, 0.7) !important',
                        WebkitTextFillColor: 'rgba(255, 255, 255, 0.7) !important',
                      },
                      '.MuiSelect-select': {
                        paddingTop: '8px',
                        paddingBottom: '8px',
                      }
                    }}
                  >
                    {graduatingYears.map(year => (
                      <MenuItem key={year} value={year}>{year}</MenuItem>
                    ))}
                  </Select>
                  {errors.graduatingYear && (
                    <FormHelperText error>{errors.graduatingYear}</FormHelperText>
                  )}
                </FormControl>
              </Box>
            </Tooltip>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Tooltip 
              title="This field is auto-filled based on your email and cannot be edited"
              placement="top"
              arrow
              enterDelay={300}
              leaveDelay={100}
            >
              <Box sx={{ width: '100%' }}>
                <FormControl 
                  fullWidth 
                  variant="standard"
                  error={!!errors.department}
                  disabled={true}
                >
                  <InputLabel 
                    shrink 
                    sx={{ 
                      color: 'rgba(255, 255, 255, 0.5)',
                      transform: 'translate(0, 1.5px) scale(0.75)',
                      transformOrigin: 'top left'
                    }}
                  >
                    Department
                  </InputLabel>
                  <Select
                    name="department"
                    value={formData.department || ''}
                    onChange={handleChange}
                    displayEmpty
                    sx={{
                      ...commonSelectStyles,
                      '& .Mui-disabled': {
                        color: 'rgba(255, 255, 255, 0.7) !important',
                        WebkitTextFillColor: 'rgba(255, 255, 255, 0.7) !important',
                      },
                      '.MuiSelect-select': {
                        paddingTop: '8px',
                        paddingBottom: '8px',
                      }
                    }}
                  >
                    {departments.map(dept => (
                      <MenuItem key={dept} value={dept}>{dept}</MenuItem>
                    ))}
                  </Select>
                  {errors.department && (
                    <FormHelperText error>{errors.department}</FormHelperText>
                  )}
                </FormControl>
              </Box>
            </Tooltip>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl 
              fullWidth 
              variant="standard"
              error={!!errors.section}
            >
              <InputLabel 
                shrink 
                sx={{ 
                  color: 'rgba(255, 255, 255, 0.5)',
                  transform: 'translate(0, 1.5px) scale(0.75)',
                  transformOrigin: 'top left'
                }}
              >
                Section
              </InputLabel>
              <Select
                name="section"
                value={formData.section || ''}
                onChange={handleChange}
                displayEmpty
                sx={{
                  ...commonSelectStyles,
                  '.MuiSelect-select': {
                    paddingTop: '8px',
                    paddingBottom: '8px',
                  }
                }}
              >
                {sections.map(section => (
                  <MenuItem key={section} value={section}>{section}</MenuItem>
                ))}
              </Select>
              {errors.section && (
                <FormHelperText error>{errors.section}</FormHelperText>
              )}
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              variant="standard"
              placeholder="Contact Number"
              name="mobileNumber"
              value={formData.mobileNumber}
              onChange={handleChange}
              error={!!errors.mobileNumber}
              helperText={errors.mobileNumber}
              sx={{
                ...commonTextFieldStyles,
                mb: 1
              }}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              variant="standard"
              placeholder="LinkedIn"
              name="linkedinUrl"
              value={formData.linkedinUrl}
              onChange={handleChange}
              sx={{
                ...commonTextFieldStyles,
                mb: 1
              }}
            />
          </Grid>
        </Grid>
        <Box sx={{ mt: 2 }}>
          {renderButtons()}
        </Box>
      </Box>
    </Box>
  );

  const renderCodingProfiles = () => (
    <Box>
      {renderStepHeader('Connect your', 'Coding Profiles')}
      
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <TextField
            fullWidth
            variant="standard"
            placeholder="LeetCode Username"
            name="leetcode"
            value={formData.leetcode}
            onChange={handleChange}
            error={!!errors.leetcode}
            helperText={errors.leetcode}
            sx={commonTextFieldStyles}
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            variant="standard"
            placeholder="CodeChef Username"
            name="codechef"
            value={formData.codechef}
            onChange={handleChange}
            error={!!errors.codechef}
            helperText={errors.codechef}
            sx={commonTextFieldStyles}
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            variant="standard"
            placeholder="CodeForces Username"
            name="codeforces"
            value={formData.codeforces}
            onChange={handleChange}
            error={!!errors.codeforces}
            helperText={errors.codeforces}
            sx={commonTextFieldStyles}
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            variant="standard"
            placeholder="GeeksForGeeks Username"
            name="geeksforgeeks"
            value={formData.geeksforgeeks}
            onChange={handleChange}
            error={!!errors.geeksforgeeks}
            helperText={errors.geeksforgeeks}
            sx={commonTextFieldStyles}
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            variant="standard"
            placeholder="HackerRank Username"
            name="hackerrank"
            value={formData.hackerrank}
            onChange={handleChange}
            error={!!errors.hackerrank}
            helperText={errors.hackerrank}
            sx={commonTextFieldStyles}
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            variant="standard"
            placeholder="GitHub Username"
            name="github"
            value={formData.github}
            onChange={handleChange}
            error={!!errors.github}
            helperText={errors.github}
            sx={commonTextFieldStyles}
          />
        </Grid>
      </Grid>
      {renderButtons()}
    </Box>
  );

  const renderAboutYourself = () => (
    <Box>
      {renderStepHeader('Tell us', 'About Yourself')}
      
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <TextField
            fullWidth
            variant="standard"
            placeholder="About You"
            name="about"
            value={formData.about}
            onChange={handleChange}
            multiline
            rows={4}
            error={!!errors.about}
            helperText={errors.about}
            sx={commonTextFieldStyles}
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            variant="standard"
            placeholder="Skills (comma separated)"
            name="skills"
            value={formData.skills}
            onChange={handleChange}
            error={!!errors.skills}
            helperText={errors.skills}
            sx={commonTextFieldStyles}
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            variant="standard"
            placeholder="Interests (comma separated)"
            name="interests"
            value={formData.interests}
            onChange={handleChange}
            error={!!errors.interests}
            helperText={errors.interests}
            sx={commonTextFieldStyles}
          />
        </Grid>
      </Grid>
      {renderButtons()}
    </Box>
  );

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <Fade in={true} timeout={300}>
            {renderBasicRegistration()}
          </Fade>
        );
      case 1:
        return (
          <Fade in={true} timeout={300}>
            {renderProfileCompletion()}
          </Fade>
        );
      case 2:
        return (
          <Fade in={true} timeout={300}>
            {renderCodingProfiles()}
          </Fade>
        );
      case 3:
        return (
          <Fade in={true} timeout={300}>
            {renderAboutYourself()}
          </Fade>
        );
      default:
        return null;
    }
  };

  return (
    <>
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
          p: 4,
          zIndex: 0,
        }}
      >
        <Box sx={{ maxWidth: '400px', textAlign: 'center' }}>
          <Typography
            variant="h2"
            sx={{
              color: 'white',
              fontWeight: 600,
              mb: 2,
              fontSize: '2.5rem',
            }}
          >
          </Typography>
          <Typography
            variant="h4"
            sx={{
              color: 'white',
              fontWeight: 500,
              mb: 2,
            }}
          >
            Create Account
          </Typography>
          <Typography
            variant="body1"
            sx={{
              color: 'rgba(255, 255, 255, 0.8)',
              fontWeight: 400,
              lineHeight: 1.5,
              fontSize: '1.1rem',
              maxWidth: '80%',
              mx: 'auto'
            }}
          >
            Join us to start your competitive programming journey.
          </Typography>
        </Box>
      </Box>

      <Box
        sx={{
          position: 'fixed',
          top: 0,
          right: 0,
          width: { xs: '100%', md: '50%' },
          height: '100vh',
          bgcolor: '#000000',
          p: { xs: 5, sm: 6 },
          overflow: 'auto',
          zIndex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Box sx={{ maxWidth: 600, width: '100%', py:4 }}>
          <Button
            onClick={() => navigate(-1)}
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

          {renderStepContent()}
        </Box>
      </Box>
    </>
  );
};

export default MultiStepRegister;