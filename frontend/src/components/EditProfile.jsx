import React, { useState, useEffect } from 'react';
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  Typography,
  MenuItem,
  IconButton,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  CircularProgress,
  useTheme,
  Autocomplete,
  Chip,
  InputAdornment,
  Alert,
  Avatar
} from '@mui/material';
import { 
  Close as CloseIcon, 
  CheckCircle,
  Link as LinkIcon,
  CheckCircleOutline as VerifiedIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';
import { apiUrl } from '../config/apiConfig';

// Platform logo URLs
const platformLogos = {
  leetcode: 'https://assets.leetcode.com/static_assets/public/icons/favicon-192x192.png',
  codeforces: 'https://cdn.iconscout.com/icon/free/png-256/free-codeforces-3628695-3029920.png',
  codechef: 'https://cdn.codechef.com/images/cc-logo.svg',
  hackerrank: 'https://cdn4.iconfinder.com/data/icons/logos-and-brands/512/160_Hackerrank_logo_logos-512.png',
  geeksforgeeks: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/43/GeeksforGeeks.svg/2560px-GeeksforGeeks.svg.png'
};

// Options for skills and interests autocomplete
const skillOptions = [
  'JavaScript', 'TypeScript', 'React', 'Angular', 'Vue.js', 'Node.js', 'Express', 'MongoDB',
  'PostgreSQL', 'MySQL', 'GraphQL', 'REST API', 'Python', 'Django', 'Flask', 'Java', 
  'Spring Boot', 'C#', '.NET', 'PHP', 'Laravel', 'Ruby', 'Ruby on Rails', 'AWS', 
  'Azure', 'Google Cloud', 'Docker', 'Kubernetes', 'CI/CD', 'Git', 'GitHub', 
  'GitLab', 'HTML', 'CSS', 'SASS', 'LESS', 'Redux', 'MobX', 'Jest', 'Mocha', 
  'Cypress', 'Testing Library', 'Webpack', 'Babel', 'ESLint', 'Prettier',
  'Machine Learning', 'Deep Learning', 'Data Science', 'TensorFlow', 'PyTorch',
  'Pandas', 'NumPy', 'SciPy', 'R', 'Tableau', 'Power BI', 'Hadoop', 'Spark',
  'Big Data', 'C', 'C++', 'Swift', 'Kotlin', 'Flutter', 'React Native', 'Unity',
  'Web Design', 'UI/UX', 'Figma', 'Sketch', 'Adobe XD', 'Photoshop', 'Illustrator'
];

// Coding platform list for user profiles
const codingPlatforms = [
  { 
    key: 'leetcode', 
    name: 'LeetCode', 
    usernameField: 'leetcodeUsername',
    icon: platformLogos.leetcode,
    color: '#F89F1B',
    placeholder: 'Your LeetCode username'
  },
  { 
    key: 'codeforces', 
    name: 'Codeforces', 
    usernameField: 'codeforcesUsername',
    icon: platformLogos.codeforces,
    color: '#1F8ACB',
    placeholder: 'Your Codeforces handle'
  },
  { 
    key: 'codechef', 
    name: 'CodeChef', 
    usernameField: 'codechefUsername',
    icon: platformLogos.codechef,
    color: '#5B4638',
    placeholder: 'Your CodeChef username'
  },
  { 
    key: 'hackerrank', 
    name: 'HackerRank', 
    usernameField: 'hackerrankUsername',
    icon: platformLogos.hackerrank,
    color: '#2EC866',
    placeholder: 'Your HackerRank username'
  },
  { 
    key: 'geeksforgeeks', 
    name: 'GeeksforGeeks', 
    usernameField: 'gfgUsername',
    icon: platformLogos.geeksforgeeks,
    color: '#2F8D46',
    placeholder: 'Your GeeksforGeeks username'
  }
];

const interestOptions = [
  'Web Development', 'Mobile Development', 'Game Development', 'Data Science',
  'Machine Learning', 'Artificial Intelligence', 'Cloud Computing', 'DevOps',
  'Cybersecurity', 'Blockchain', 'IoT', 'AR/VR', 'Quantum Computing',
  'Robotics', 'Open Source', 'UI/UX Design', 'Product Management', 'Agile',
  'Scrum', 'Project Management', 'Technical Writing', 'Teaching/Mentoring',
  'Competitive Programming', 'Hackathons', 'Startups', 'Research',
  'Computer Graphics', 'Computer Vision', 'Natural Language Processing',
  'Data Engineering', 'Backend Development', 'Frontend Development',
  'Full Stack Development', 'Systems Programming', 'Low-level Programming',
  'Embedded Systems', 'Network Programming', 'Database Design',
  'Functional Programming', 'Object-Oriented Programming'
];

// Profile setup steps
const setupSteps = [
  {
    label: 'Basic Information',
    description: 'Let\'s set up your basic profile information',
    fields: ['name', 'phone', 'department', 'rollNumber', 'section', 'graduationYear'],
    requiredFields: ['name', 'department', 'rollNumber', 'section']
  },
  {
    label: 'Coding Platforms',
    description: 'Connect your coding platform accounts to track your progress',
    fields: codingPlatforms.map(platform => platform.usernameField),
    requiredFields: codingPlatforms.map(platform => platform.usernameField),
    platforms: codingPlatforms
  },
  {
    label: 'Skills & Interests',
    description: 'Tell us about your skills and interests',
    fields: ['skills', 'interests'],
    requiredFields: [] // Nothing required in this step
  },
  {
    label: 'Social Media',
    description: 'Add your social media links. For GitHub, please enter your username only (not the full URL).',
    fields: ['linkedinUrl', 'githubUrl'],
    requiredFields: ['githubUrl'] // Making GitHub URL required
  },
  {
    label: 'About Yourself',
    description: 'Add a short bio about yourself',
    fields: ['about'],
    requiredFields: [] // Nothing required in this step
  }
];

const EditProfile = ({ 
  open, 
  onClose, 
  profileData = {}, 
  auth, 
  isProfileSetup = false, 
  onProfileUpdate 
}) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [profileSetupComplete, setProfileSetupComplete] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [fieldErrors, setFieldErrors] = useState({});
  const [errorDialog, setErrorDialog] = useState({ open: false, title: '', message: '' });
  const [platformLinkStatus, setPlatformLinkStatus] = useState({});
  const [platformLinking, setPlatformLinking] = useState({});
  const [editProfileData, setEditProfileData] = useState({
    name: '',
    phone: '',
    department: '',
    section: '',
    rollNumber: '',
    graduationYear: new Date().getFullYear(),
    skills: [],
    interests: [],
    about: '',
    linkedinUrl: '',
    githubUrl: '',
    imageUrl: '',
    // Add platform usernames
    leetcodeUsername: '',
    codeforcesUsername: '',
    codechefUsername: '',
    hackerrankUsername: '',
    gfgUsername: '',
  });

  // Initialize editProfileData when profileData changes
  useEffect(() => {
    const calculateGraduationYear = (rollNumber) => {
      if (!rollNumber || rollNumber.length < 2) return new Date().getFullYear();
      
      // Extract first 2 digits from roll number
      const yearCode = rollNumber.substring(0, 2);
      if (!/^\d{2}$/.test(yearCode)) return new Date().getFullYear();
      
      // Calculate admission year (20XX) and add 4 years
      const admissionYear = 2000 + parseInt(yearCode, 10);
      return admissionYear + 4; // Graduation is 4 years after admission
    };

    // Extract GitHub username from profile data properly
    const extractGithubUsername = (profileData) => {
      if (profileData.githubUrl && typeof profileData.githubUrl === 'string') {
        // If it's a full GitHub URL, extract just the username
        if (profileData.githubUrl.includes('github.com/')) {
          const parts = profileData.githubUrl.split('github.com/');
          return parts[1]?.replace(/\/$/, '') || '';
        }
        // If it's already just a username
        return profileData.githubUrl;
      }
      
      // If profiles.github is an object, try to get the username
      if (profileData.profiles?.github) {
        if (typeof profileData.profiles.github === 'string') {
          // If it's a URL, extract username
          if (profileData.profiles.github.includes('github.com/')) {
            const parts = profileData.profiles.github.split('github.com/');
            return parts[1]?.replace(/\/$/, '') || '';
          }
          return profileData.profiles.github;
        } else if (typeof profileData.profiles.github === 'object') {
          // Try to get username from the object
          return profileData.profiles.github.username || '';
        }
      }
      
      return '';
    };

    // Helper function to extract usernames from profile data
    const getPlatformUsername = (profileData, platform) => {
      // First try direct property (profileData.platformUsername)
      if (profileData[`${platform}Username`]) {
        return profileData[`${platform}Username`];
      }
      
      // Then check in the profiles object (profileData.profiles.platform)
      if (profileData.profiles && profileData.profiles[platform]) {
        if (typeof profileData.profiles[platform] === 'string') {
          return profileData.profiles[platform];
        } else if (typeof profileData.profiles[platform] === 'object') {
          return profileData.profiles[platform].username || '';
        }
      }
      
      return '';
    };

    if (profileData && Object.keys(profileData).length > 0) {
      const graduationYear = calculateGraduationYear(profileData.rollNumber);
      const githubUsername = extractGithubUsername(profileData);
      
      // Add platform usernames with proper extraction
      const leetcodeUsername = getPlatformUsername(profileData, 'leetcode');
      const codeforcesUsername = getPlatformUsername(profileData, 'codeforces');
      const codechefUsername = getPlatformUsername(profileData, 'codechef');
      const hackerrankUsername = getPlatformUsername(profileData, 'hackerrank');
      const gfgUsername = getPlatformUsername(profileData, 'geeksforgeeks');
      
      setEditProfileData({
        name: profileData.name || auth?.user?.name || '',
        phone: profileData.phone || '',
        department: profileData.department || '',
        section: profileData.section || '',
        rollNumber: profileData.rollNumber || '',
        graduationYear: profileData.graduationYear || graduationYear,
        skills: profileData.skills || [],
        interests: profileData.interests || [],
        about: profileData.about || '',
        linkedinUrl: profileData.linkedinUrl || '',
        githubUrl: githubUsername,
        imageUrl: profileData.profilePicture || profileData.imageUrl || '',
        // Use the extracted usernames
        leetcodeUsername,
        codeforcesUsername,
        codechefUsername,
        hackerrankUsername,
        gfgUsername,
      });
      
      // Set platform link status for fields that already have values
      const platformStatus = {};
      codingPlatforms.forEach(platform => {
        const username = getPlatformUsername(profileData, platform.key);
        if (username) {
          platformStatus[platform.key] = {
            linked: true,
            message: `${platform.name} username saved!`
          };
        }
      });
      
      // Update the platformLinkStatus state if there are linked platforms
      if (Object.keys(platformStatus).length > 0) {
        setPlatformLinkStatus(platformStatus);
      }
    } else if (auth?.user) {
      // For new users, extract roll number from email and calculate graduation year
      const rollNumber = auth.user.rollNumber || auth.user.email?.split('@')[0].toUpperCase() || '';
      const graduationYear = calculateGraduationYear(rollNumber);
      
      setEditProfileData({
        name: auth.user.name || '',
        phone: '',
        department: auth.user.department || '', 
        section: auth.user.section || '',
        rollNumber: rollNumber,
        graduationYear: graduationYear,
        skills: [],
        interests: [],
        about: '',
        linkedinUrl: '',
        githubUrl: '',
        imageUrl: auth.user.profilePicture || '',
        // Add platform usernames
        leetcodeUsername: '',
        codeforcesUsername: '',
        codechefUsername: '',
        hackerrankUsername: '',
        gfgUsername: '',
      });
    }
  }, [profileData, auth?.user]);
  
  // Handle adding a skill tag
  const handleAddSkill = (newSkill) => {
    if (!newSkill || !newSkill.trim()) return;
    
    // Check if skill already exists to avoid duplicates
    const normalizedNewSkill = newSkill.trim();
    const currentSkills = Array.isArray(editProfileData.skills) ? 
      [...editProfileData.skills] : 
      [];
    
    if (!currentSkills.includes(normalizedNewSkill)) {
      const updatedSkills = [...currentSkills, normalizedNewSkill];
      setEditProfileData(prev => ({ ...prev, skills: updatedSkills }));
    }
  };

  // Handle adding an interest tag
  const handleAddInterest = (newInterest) => {
    if (!newInterest || !newInterest.trim()) return;
    
    // Check if interest already exists to avoid duplicates
    const normalizedNewInterest = newInterest.trim();
    const currentInterests = Array.isArray(editProfileData.interests) ? 
      [...editProfileData.interests] : 
      [];
    
    if (!currentInterests.includes(normalizedNewInterest)) {
      const updatedInterests = [...currentInterests, normalizedNewInterest];
      setEditProfileData(prev => ({ ...prev, interests: updatedInterests }));
    }
  };

  // Handle platform username linking
  const handlePlatformLink = async (platform) => {
    const { key, name, usernameField } = platform;
    const username = editProfileData[usernameField];

    if (!username || username.trim() === '') {
      setFieldErrors(prev => ({
        ...prev,
        [usernameField]: `Please enter your ${name} username`
      }));
      return;
    }

    try {
      // Set linking status
      setPlatformLinking(prev => ({ ...prev, [key]: true }));
      
      // Don't make an API call, just validate the username exists
      const trimmedUsername = username.trim();
      
      if (trimmedUsername) {
        // Update link status locally without API verification
        setPlatformLinkStatus(prev => ({ 
          ...prev, 
          [key]: {
            linked: true,
            message: `${name} username saved!`
          }
        }));
        
        // Update the username in editProfileData
        setEditProfileData(prev => ({
          ...prev,
          [usernameField]: trimmedUsername
        }));
        
        // Clear any existing error for this field
        if (fieldErrors[usernameField]) {
          setFieldErrors(prev => {
            const updated = { ...prev };
            delete updated[usernameField];
            return updated;
          });
        }
        
        toast.success(`${name} username saved!`);
      } else {
        setPlatformLinkStatus(prev => ({ 
          ...prev, 
          [key]: {
            linked: false,
            message: `Invalid ${name} username`
          }
        }));
        
        setFieldErrors(prev => ({
          ...prev,
          [usernameField]: `Invalid ${name} username`
        }));
        
        toast.error(`Invalid ${name} username`);
      }
    } catch (error) {
      setPlatformLinking(prev => ({ ...prev, [key]: false }));
    }
  };

  // Helper function to render profile fields based on field name
  const renderProfileField = (field, index, isEditMode = true) => {
    // Check if this is a platform username field
    const platform = codingPlatforms.find(p => p.usernameField === field);
    
    if (platform) {
      const isLinked = platformLinkStatus[platform.key]?.linked;
      const isLinking = platformLinking[platform.key];
      const linkMessage = platformLinkStatus[platform.key]?.message;
      
      return (
        <TextField
          key={index}
          label={`${platform.name} Username`}
          fullWidth
          margin="normal"
          name={field}
          disabled={!isEditMode || isLinking}
          value={editProfileData[field] || ''}
          onChange={handleProfileChange}
          error={!!fieldErrors[field]}
          helperText={fieldErrors[field] || platform.placeholder}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Box
                  sx={{
                    width: 28,
                    height: 28,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '50%',
                    overflow: 'hidden',
                    mr: 1
                  }}
                >
                <img
                  src={platform.icon}
                  alt={platform.name}
                    style={{ 
                      width: '100%', 
                      height: '100%', 
                      objectFit: 'contain'
                    }}
                  />
                </Box>
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                {isLinking ? (
                  <CircularProgress size={24} />
                ) : isLinked ? (
                  <CheckCircle fontSize="small" color="success" />
                ) : (
                  <Button
                    onClick={() => handlePlatformLink(platform)}
                    size="small"
                    color="primary"
                    disabled={!editProfileData[field]}
                    variant="text"
                    sx={{ 
                      minWidth: 'auto',
                      px: 1,
                      py: 0.5
                    }}
                  >
                    Save
                  </Button>
                )}
              </InputAdornment>
            ),
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              '& fieldset': {
                borderColor: isLinked ? theme.palette.success.main : undefined,
              },
              '&:hover fieldset': {
                borderColor: isLinked ? theme.palette.success.main : undefined,
              },
              '&.Mui-focused fieldset': {
                borderColor: isLinked ? theme.palette.success.main : undefined,
              },
            }
          }}
        />
      );
    }

    switch (field) {
      case 'name':
        return (
          <TextField
            key={index}
            label="Name"
            fullWidth
            margin="normal"
            name="name"
            disabled={true}
            value={editProfileData?.name || ''}
            onChange={handleProfileChange}
            error={!!fieldErrors.name}
            helperText={fieldErrors.name || ''}
            required
          />
        );
      case 'about':
        return (
          <TextField
            key={index}
            label="About"
            fullWidth
            margin="normal"
            name="about"
            disabled={!isEditMode}
            multiline
            rows={4}
            value={editProfileData?.about || ''}
            onChange={handleProfileChange}
            error={!!fieldErrors.about}
            helperText={fieldErrors.about || ''}
          />
        );
      case 'section':
        return (
          <TextField
            key={index}
            label="Section"
            fullWidth
            margin="normal"
            name="section"
            disabled={!isEditMode}
            select
            value={editProfileData?.section || ''}
            onChange={handleProfileChange}
            error={!!fieldErrors.section}
            helperText={fieldErrors.section || 'Select your class section (required)'}
            required
          >
            {['None', 'A', 'B', 'C', 'D', 'E', 'F', 'G'].map((option) => (
              <MenuItem key={option} value={option}>
                {option === 'None' ? 'None' : `Section ${option}`}
              </MenuItem>
            ))}
          </TextField>
        );
      case 'department':
        return (
          <TextField
            key={index}
            label="Department"
            fullWidth
            margin="normal"
            name="department"
            disabled={true}
            select
            value={editProfileData?.department || ''}
            onChange={handleProfileChange}
            error={!!fieldErrors.department}
            helperText={fieldErrors.department || ''}
            required
          >
            {[
              { value: 'AERO', label: 'Aeronautical Engineering' },
              { value: 'CSC', label: 'Computer Science & Cybersecurity' },
              { value: 'CSD', label: 'Computer Science & Data Science' },
              { value: 'CSE', label: 'Computer Science & Engineering' },
              { value: 'CSM', label: 'Computer Science & ML' },
              { value: 'CSIT', label: 'Computer Science & IT' },
              { value: 'IT', label: 'Information Technology' },
              { value: 'ECE', label: 'Electronics & Communication Engineering' },
              { value: 'MECH', label: 'Mechanical Engineering' },
              { value: 'EEE', label: 'Electrical & Electronics Engineering' }
            ].map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
        );
      case 'rollNumber':
        return (
          <TextField
            key={index}
            label="Roll Number"
            fullWidth
            margin="normal"
            name="rollNumber"
            disabled={true}
            value={editProfileData?.rollNumber || ''}
            onChange={handleProfileChange}
            error={!!fieldErrors.rollNumber}
            helperText={fieldErrors.rollNumber || ''}
            required
          />
        );
      case 'graduationYear':
        return (
          <TextField
            key={index}
            label="Graduation Year"
            fullWidth
            margin="normal"
            name="graduationYear"
            disabled={!isEditMode}
            type="number"
            value={editProfileData?.graduationYear || new Date().getFullYear()}
            onChange={handleProfileChange}
            error={!!fieldErrors.graduationYear}
            helperText={fieldErrors.graduationYear || ''}
          />
        );
      case 'phone':
        return (
          <TextField
            key={index}
            label="Phone"
            fullWidth
            margin="normal"
            name="phone"
            disabled={!isEditMode}
            value={editProfileData?.phone || ''}
            onChange={handleProfileChange}
            error={!!fieldErrors.phone}
            helperText={fieldErrors.phone || ''}
          />
        );
      case 'linkedinUrl':
        return (
          <TextField
            key={index}
            label="LinkedIn URL"
            fullWidth
            margin="normal"
            name="linkedinUrl"
            disabled={!isEditMode}
            value={editProfileData?.linkedinUrl || ''}
            onChange={handleProfileChange}
            error={!!fieldErrors.linkedinUrl}
            helperText={fieldErrors.linkedinUrl || ''}
          />
        );
      case 'githubUrl':
        return (
          <TextField
            key={index}
            label="GitHub Username"
            fullWidth
            margin="normal"
            name="githubUrl"
            disabled={!isEditMode}
            value={editProfileData?.githubUrl || ''}
            onChange={handleProfileChange}
            error={!!fieldErrors.githubUrl}
            helperText={fieldErrors.githubUrl || 'Enter your GitHub username (required)'}
            required
          />
        );
      case 'skills':
        return (
          <Autocomplete
            key={index}
            multiple
            freeSolo
            options={skillOptions}
            value={Array.isArray(editProfileData?.skills) ? editProfileData.skills : []}
            onChange={(e, newValue) => {
              // Ensure we always have an array of strings
              const processedSkills = newValue.map(skill => 
                typeof skill === 'string' ? skill.trim() : skill
              ).filter(skill => skill); // Remove any empty skills
              setEditProfileData(prev => ({ ...prev, skills: processedSkills }));
            }}
            onBlur={(e) => {
              // Check if there's text in the input and add it as a tag
              const inputValue = e.target.value?.trim();
              if (inputValue) {
                handleAddSkill(inputValue);
                // Clear the input (note: this might not work perfectly with MUI Autocomplete)
                setTimeout(() => {
                  e.target.value = '';
                }, 0);
              }
            }}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip
                  label={option}
                  {...getTagProps({ index })}
                  key={index}
                  size="small"
                  sx={{
                    bgcolor: theme.palette.mode === 'dark' ? 'rgba(0,136,204,0.1)' : 'rgba(0,136,204,0.05)',
                    color: '#0088cc',
                    border: '1px solid rgba(0,136,204,0.2)',
                  }}
                />
              ))
            }
            renderInput={(params) => (
              <TextField
                {...params}
                fullWidth
                margin="normal"
                label="Skills"
                placeholder="Add skills and press enter"
                helperText={fieldErrors.skills || "Enter your skills and press Enter or select from suggestions"}
                error={!!fieldErrors.skills}
                disabled={!isEditMode}
              />
            )}
            disabled={!isEditMode}
            sx={{ width: '100%', marginTop: 2, marginBottom: 1 }}
          />
        );
      case 'interests':
        return (
          <Autocomplete
            key={index}
            multiple
            freeSolo
            options={interestOptions}
            value={Array.isArray(editProfileData?.interests) ? editProfileData.interests : []}
            onChange={(e, newValue) => {
              // Ensure we always have an array of strings
              const processedInterests = newValue.map(interest => 
                typeof interest === 'string' ? interest.trim() : interest
              ).filter(interest => interest); // Remove any empty interests
              setEditProfileData(prev => ({ ...prev, interests: processedInterests }));
            }}
            onBlur={(e) => {
              // Check if there's text in the input and add it as a tag
              const inputValue = e.target.value?.trim();
              if (inputValue) {
                handleAddInterest(inputValue);
                // Clear the input (note: this might not work perfectly with MUI Autocomplete)
                setTimeout(() => {
                  e.target.value = '';
                }, 0);
              }
            }}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip
                  label={option}
                  {...getTagProps({ index })}
                  key={index}
                  size="small"
                  sx={{
                    bgcolor: theme.palette.mode === 'dark' ? 'rgba(25,118,210,0.1)' : 'rgba(25,118,210,0.05)',
                    color: theme.palette.primary.main,
                    border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(25,118,210,0.2)' : 'rgba(25,118,210,0.3)'}`,
                  }}
                />
              ))
            }
            renderInput={(params) => (
              <TextField
                {...params}
                fullWidth
                margin="normal"
                label="Interests"
                placeholder="Add interests and press enter"
                helperText={fieldErrors.interests || "Enter your interests and press Enter or select from suggestions"}
                error={!!fieldErrors.interests}
                disabled={!isEditMode}
              />
            )}
            disabled={!isEditMode}
            sx={{ width: '100%', marginTop: 2, marginBottom: 1 }}
          />
        );
      default:
        return null;
    }
  };

  // Handle profile form field changes
  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    
    // Special handling for skills and interests
    if (name === 'skills' || name === 'interests') {
      const valueArray = value.split(',').map(item => item.trim()).filter(item => item !== '');
      
      // Update the field value as an array
      setEditProfileData(prev => ({
        ...prev,
        [name]: valueArray
      }));
    } else {
      // Regular field handling
      setEditProfileData(prev => ({
        ...prev,
        [name]: value
      }));
    }
    
    // Clear error for this field if it has a value
    if (value.trim() !== '' && fieldErrors[name]) {
      setFieldErrors(prev => ({
        ...prev,
        [name]: undefined
      }));
    }
  };

  // Handle step navigation with validation
  const handleNext = () => {
    // Get required fields for the current step
    const requiredFields = setupSteps[activeStep].requiredFields || [];
    
    // Special validation for coding platforms step (step index 1)
    if (activeStep === 1) {
      // Check if any required platform username is empty
      const requiredPlatforms = codingPlatforms.filter(p => 
        requiredFields.includes(p.usernameField)
      );
      
      const emptyPlatforms = requiredPlatforms.filter(p => {
        const username = editProfileData[p.usernameField];
        return !username || username.trim() === '';
      });
      
      if (emptyPlatforms.length > 0) {
        // Set field errors for empty platform usernames
        const newFieldErrors = { ...fieldErrors };
        emptyPlatforms.forEach(platform => {
          newFieldErrors[platform.usernameField] = `Please enter your ${platform.name} username to continue`;
        });
        
        setFieldErrors(newFieldErrors);
        
        // Show error dialog for empty platforms
        const platformNames = emptyPlatforms.map(p => p.name).join(', ');
        setErrorDialog({
          open: true,
          title: 'Missing Platform Usernames',
          message: `Please enter usernames for the following platforms to continue: ${platformNames}`
        });
        
        return; // Don't proceed to next step
      }
      
      // Save each platform username by calling handlePlatformLink if not already linked
      for (const platform of requiredPlatforms) {
        if (!platformLinkStatus[platform.key]?.linked) {
          handlePlatformLink(platform);
        }
      }
    }
    
    // Default validation logic for other steps
    
    // Check if any required fields are empty
    const missingFields = requiredFields.filter(field => 
      !editProfileData[field] || 
      (typeof editProfileData[field] === 'string' && editProfileData[field].trim() === '') ||
      (Array.isArray(editProfileData[field]) && editProfileData[field].length === 0)
    );
    
    // If there are missing fields, show error messages
    if (missingFields.length > 0) {
      // Set field-level errors
      const newFieldErrors = { ...fieldErrors };
      
      missingFields.forEach(field => {
        newFieldErrors[field] = `${field.charAt(0).toUpperCase() + field.slice(1).replace(/([A-Z])/g, ' $1').toLowerCase()} is required`;
      });
      
      setFieldErrors(newFieldErrors);
      
      // Show error dialog for missing fields
      const formattedFieldNames = missingFields.map(f => 
        f.charAt(0).toUpperCase() + f.slice(1).replace(/([A-Z])/g, ' $1').toLowerCase()
      ).join(', ');
      
      setErrorDialog({
        open: true,
        title: 'Missing Required Fields',
        message: `Please fill in the following required fields to continue: ${formattedFieldNames}`
      });
      
      return; // Don't proceed to next step
    }
    
    // Clear field errors for this step
    const currentStepFields = setupSteps[activeStep].fields;
    const updatedFieldErrors = { ...fieldErrors };
    
    currentStepFields.forEach(field => {
      if (updatedFieldErrors[field]) {
        delete updatedFieldErrors[field];
      }
    });
    
    setFieldErrors(updatedFieldErrors);
    
    // Proceed to next step
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  // Handle back button click in stepper
  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
    // Clear any field errors when going back
    setFieldErrors({});
  };

  // Handle profile dialog submit
  const handleProfileDialogSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!auth?.token) return;
    
    try {
      setLoading(true);
      
      // Get all required fields from all steps
      const allRequiredFields = setupSteps.reduce((fields, step) => {
        return [...fields, ...(step.requiredFields || [])];
      }, []);
      
      // Check for missing required fields with better validation
      const missingFields = allRequiredFields.filter(field => 
        !editProfileData[field] || 
        (typeof editProfileData[field] === 'string' && editProfileData[field].trim() === '') ||
        (Array.isArray(editProfileData[field]) && editProfileData[field].length === 0)
      );
      
      if (missingFields.length > 0) {
        // Set field-level errors
        const newErrors = {};
        missingFields.forEach(field => {
          newErrors[field] = `${field.charAt(0).toUpperCase() + field.slice(1).replace(/([A-Z])/g, ' $1').toLowerCase()} is required`;
        });
        setFieldErrors(newErrors);
        
        // Format field names for better readability
        const formattedFieldNames = missingFields.map(f => 
          f.charAt(0).toUpperCase() + f.slice(1).replace(/([A-Z])/g, ' $1').toLowerCase()
        ).join(', ');
        
        setErrorDialog({
          open: true,
          title: 'Missing Required Fields',
          message: `Please fill in the following required fields to complete your profile: ${formattedFieldNames}`
        });
        setLoading(false);
        return;
      }
      
      // Clear any existing field errors
      setFieldErrors({});
      
      // Create a clean data object with only the fields we need
      const profileDataToSubmit = {
        name: editProfileData.name || '',
        phone: editProfileData.phone || '',
        department: editProfileData.department || '',
        section: editProfileData.section || '',
        rollNumber: editProfileData.rollNumber || '',
        graduationYear: editProfileData.graduationYear || new Date().getFullYear(),
        skills: editProfileData.skills || [],
        interests: editProfileData.interests || [],
        linkedinUrl: editProfileData.linkedinUrl || '',
        githubUrl: editProfileData.githubUrl || '', // Ensure this is a string
        about: editProfileData.about || '',
        profileCompleted: true,
        // Include profile picture URL
        profilePicture: editProfileData.imageUrl || '',
        // Include current step in multi-step setup
        currentStep: activeStep,
        // Add platform usernames without trying to verify them
        profiles: {
          leetcode: editProfileData.leetcodeUsername || '',
          codeforces: editProfileData.codeforcesUsername || '',
          codechef: editProfileData.codechefUsername || '',
          hackerrank: editProfileData.hackerrankUsername || '',
          geeksforgeeks: editProfileData.gfgUsername || '',
          github: editProfileData.githubUrl || ''
        }
      };
      
      try {
        // Update the user's profile without verifying platform usernames
        await axios.put(
          `${apiUrl}/profiles/me`,
          profileDataToSubmit,
          { headers: { Authorization: `Bearer ${auth.token}` } }
        );
        
        // If this is part of profile setup, also mark profile as completed
        if (isProfileSetup) {
          try {
            const response = await axios.post(
              `${apiUrl}/auth/completeRegistration`,
              profileDataToSubmit,
              { headers: { Authorization: `Bearer ${auth.token}` } }
            );
            
            // Update local user state
            if (auth.user) {
              const updatedUser = {
                ...auth.user,
                newUser: false,
                profileCompleted: true,
                profilePicture: editProfileData.imageUrl || auth.user.profilePicture,
                profiles: profileDataToSubmit.profiles
              };
              localStorage.setItem('user', JSON.stringify(updatedUser));
              auth.setUser && auth.setUser(updatedUser);
            }
            
            setProfileSetupComplete(true);
            toast.success('Profile setup completed successfully!');
          } catch (registrationError) {
            // Handle registration errors...
            // Existing error handling code
          }
        } else {
          toast.success('Profile updated successfully');
          
          // Update local user state with new platform usernames
          if (auth.user) {
            const updatedUser = {
              ...auth.user,
              profilePicture: editProfileData.imageUrl || auth.user.profilePicture,
              profiles: profileDataToSubmit.profiles
            };
            localStorage.setItem('user', JSON.stringify(updatedUser));
            auth.setUser && auth.setUser(updatedUser);
          }
        }
        
        // Notify parent component about the update
        if (onProfileUpdate) {
          onProfileUpdate(profileDataToSubmit);
        }
        
        // Close dialog if not in setup mode
        if (!isProfileSetup) {
          onClose();
        }
        
        // If setup is complete and user was in setup mode, redirect to dashboard
        if (isProfileSetup && profileSetupComplete) {
          setTimeout(() => {
            navigate('/dashboard');
          }, 2000);
        }
      } catch (error) {
        // Removed console.error statement
        setLinking(false);
        setPlatformLinkError(`Error saving ${name} username. Please try again.`);
      }
    } catch (error) {
      setErrorDialog({
        open: true,
        title: 'Error',
        message: 'An unexpected error occurred'
      });
    } finally {
      setLoading(false);
      setRetryCount(0);
    }
  };

  // Error dialog component
  const renderErrorDialog = () => {
    return (
      <Dialog
        open={errorDialog.open}
        onClose={() => setErrorDialog({ open: false, title: '', message: '' })}
        aria-labelledby="error-dialog-title"
        aria-describedby="error-dialog-description"
        container={() => document.getElementById('dialog-container') || document.body}
        disableEnforceFocus
      >
        <DialogTitle id="error-dialog-title">{errorDialog.title}</DialogTitle>
        <DialogContent>
          <Typography 
            id="error-dialog-description"
            component="div"
          >
            {errorDialog.message}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setErrorDialog({ open: false, title: '', message: '' })} 
            color="primary" 
            variant="contained"
          >
            OK
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  // First step - Basic Profile
  const renderBasicProfile = () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, width: '100%' }}>
      {/* Add profile image section */}
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 2 }}>
        <Avatar
          src={editProfileData.imageUrl || '/static/images/avatar.jpg'}
          alt={editProfileData.name || 'Profile Picture'}
          sx={{ 
            width: 120, 
            height: 120, 
            mb: 2,
            border: `3px solid ${theme.palette.mode === 'dark' ? 'rgba(0,136,204,0.5)' : 'rgba(0,136,204,0.3)'}`,
            boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
          }}
        />
        <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
          {editProfileData.imageUrl ? 'Your profile picture' : 'Using Google profile picture'}
        </Typography>
        <TextField
          fullWidth
          margin="normal"
          name="imageUrl"
          label="Profile Picture URL"
          placeholder="Enter a URL for your profile picture"
          value={editProfileData.imageUrl || ''}
          onChange={handleProfileChange}
          error={!!fieldErrors.imageUrl}
          helperText={fieldErrors.imageUrl || "Enter URL for your profile image or leave empty to use Google picture"}
          disabled={!isEditMode}
        />
      </Box>
      
      {/* Rest of the basic profile fields */}
      {renderProfileField('name', 0)}
      {renderProfileField('department', 1)}
      {renderProfileField('section', 2)}
      {renderProfileField('rollNumber', 3)}
      {renderProfileField('graduationYear', 4)}
      {renderProfileField('phone', 5)}
      {renderProfileField('about', 6)}
      {renderProfileField('linkedinUrl', 7)}
    </Box>
  );

  return (
    <>
      <Dialog 
        open={open} 
        onClose={() => !isProfileSetup && onClose()} // Prevent closing if in setup mode
        maxWidth="md" 
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: theme.palette.background.paper,
            color: theme.palette.text.primary,
            borderRadius: '12px',
          }
        }}
        container={() => document.getElementById('dialog-container') || document.body}
        disableEnforceFocus
      >
        <DialogTitle sx={{ 
          borderBottom: `1px solid ${theme.palette.divider}`,
          px: 3,
          py: 2,
        }}>
          <Typography 
            variant="h5" 
            component="div" 
            sx={{ fontWeight: 600 }}
          >
            {isProfileSetup ? 'Complete Your Profile' : 'Edit Profile'}
          </Typography>
          {isProfileSetup && (
            <Typography variant="body2" sx={{ mt: 1, color: theme.palette.text.secondary }}>
              Please complete your profile information to continue. This will help us provide a better experience.
            </Typography>
          )}
          {!isProfileSetup && (
            <IconButton
              aria-label="close"
              onClick={onClose}
              sx={{ position: 'absolute', right: 8, top: 8, color: theme.palette.text.secondary }}
            >
              <CloseIcon />
            </IconButton>
          )}
        </DialogTitle>

        <DialogContent sx={{ p: 3 }}>
          {isProfileSetup ? (
            // Stepper for guided setup
            <Box sx={{ mt: 2 }}>
              <Stepper activeStep={activeStep} orientation="vertical" sx={{
                '& .MuiStepLabel-label': { 
                  color: theme.palette.text.primary,
                  '&.Mui-active': { color: theme.palette.primary.main }
                },
                '& .MuiStepIcon-root': {
                  color: theme.palette.action.disabled,
                  '&.Mui-active, &.Mui-completed': { color: theme.palette.primary.main }
                }
              }}>
                {setupSteps.map((step, index) => (
                  <Step key={step.label}>
                    <StepLabel>
                      <Typography variant="h6" sx={{ color: index === activeStep ? theme.palette.primary.main : 'inherit' }}>
                        {step.label}
                      </Typography>
                    </StepLabel>
                    <StepContent>
                      <Typography 
                        variant="body2" 
                        component="div" 
                        sx={{ mb: 3, color: theme.palette.text.secondary }}
                      >
                        {step.description}
                        {index === 0 && (
                          <Typography variant="body2" sx={{ mt: 1, color: theme.palette.warning.main, fontWeight: 'medium' }}>
                            Fields marked with * are required to complete your profile.
                          </Typography>
                        )}
                        {index === 1 && (
                          <Typography variant="body2" sx={{ mt: 1, color: theme.palette.info.main, fontWeight: 'medium' }}>
                            Enter your usernames for coding platforms and click Save. All platform usernames are required.
                          </Typography>
                        )}
                      </Typography>
                      
                      {/* Special layout for Coding Platforms step */}
                      {index === 1 ? (
                        <Box sx={{ mb: 3 }}>
                          {/* Display success message when all required platforms are linked */}
                          {step.platforms && step.requiredFields && step.requiredFields.every(field => {
                            const platform = codingPlatforms.find(p => p.usernameField === field);
                            return platform && platformLinkStatus[platform.key]?.linked;
                          }) && (
                            <Alert 
                              severity="success" 
                              sx={{ mb: 3 }}
                              icon={<CheckCircle fontSize="inherit" />}
                            >
                              All platform usernames have been successfully saved! You can now continue.
                            </Alert>
                          )}
                          
                          <Grid container spacing={2}>
                            {step.platforms && step.platforms.map((platform, pidx) => (
                              <Grid item xs={12} sm={6} key={platform.key}>
                                {renderProfileField(platform.usernameField, `platform-${pidx}`)}
                              </Grid>
                            ))}
                          </Grid>
                        </Box>
                      ) : (
                        <Grid container spacing={3}>
                          {step.fields.map((field, idx) => (
                            <Grid item xs={12} sm={field === 'about' ? 12 : 6} key={idx}>
                              {renderProfileField(field, idx)}
                            </Grid>
                          ))}
                        </Grid>
                      )}
                      
                      <Box sx={{ mb: 2, mt: 3, display: 'flex', gap: 1 }}>
                        <Button
                          variant="contained"
                          onClick={index === setupSteps.length - 1 ? handleProfileDialogSubmit : handleNext}
                          sx={{
                            bgcolor: theme.palette.primary.main,
                            '&:hover': { bgcolor: theme.palette.primary.dark },
                            px: 3
                          }}
                        >
                          {index === setupSteps.length - 1 ? 'Complete Setup' : 'Continue'}
                        </Button>
                        <Button
                          disabled={index === 0}
                          onClick={handleBack}
                          sx={{ 
                            color: theme.palette.text.secondary,
                            '&:hover': { 
                              bgcolor: theme.palette.action.hover, 
                              color: theme.palette.text.primary 
                            } 
                          }}
                        >
                          Back
                        </Button>
                      </Box>
                    </StepContent>
                  </Step>
                ))}
              </Stepper>
              {activeStep === setupSteps.length && (
                <Box sx={{ p: 3, mt: 3, textAlign: 'center' }}>
                  <CheckCircle sx={{ fontSize: 60, color: theme.palette.success.main, mb: 2 }} />
                  <Typography variant="h5" sx={{ mb: 2 }}>
                    Profile Setup Complete!
                  </Typography>
                  <Typography variant="body1" sx={{ mb: 4, color: theme.palette.text.secondary }}>
                    Thank you for setting up your profile. You can now start using the application.
                  </Typography>
                  <Button
                    variant="contained"
                    onClick={() => navigate('/dashboard')}
                    sx={{
                      bgcolor: theme.palette.primary.main,
                      '&:hover': { bgcolor: theme.palette.primary.dark },
                    }}
                  >
                    Go to Dashboard
                  </Button>
                </Box>
              )}
            </Box>
          ) : (
            // Regular edit profile form
            <Grid container spacing={3}>
              {/* Personal Information */}
              <Grid item xs={12}>
                <Typography variant="h6" sx={{ mb: 2, color: theme.palette.primary.main }}>
                  Personal Information
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                {renderBasicProfile()}
              </Grid>

              {/* Coding Platforms */}
              <Grid item xs={12}>
                <Typography variant="h6" sx={{ mb: 2, mt: 2, color: theme.palette.primary.main }}>
                  Coding Platforms
                </Typography>
                <Typography variant="body2" sx={{ mb: 2, color: theme.palette.text.secondary }}>
                  Enter your usernames for coding platforms and click Save. All platform usernames are required.
                </Typography>
              </Grid>
              {codingPlatforms.map((platform, pidx) => (
                <Grid item xs={12} sm={6} key={platform.key}>
                  {renderProfileField(platform.usernameField, `platform-${pidx}`)}
                </Grid>
              ))}

              {/* Social Links */}
              <Grid item xs={12}>
                <Typography variant="h6" sx={{ mb: 2, mt: 2, color: theme.palette.primary.main }}>
                  Social Links
                </Typography>
                <Typography variant="body2" sx={{ mb: 2, color: theme.palette.text.secondary }}>
                  For GitHub, please enter your username only (not the full URL).
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                {renderProfileField('linkedinUrl')}
              </Grid>
              <Grid item xs={12} sm={6}>
                {renderProfileField('githubUrl')}
              </Grid>

              {/* Skills & Interests */}
              <Grid item xs={12}>
                <Typography variant="h6" sx={{ mb: 2, mt: 2, color: theme.palette.primary.main }}>
                  Skills & Interests
                </Typography>
              </Grid>
              <Grid item xs={12}>
                {renderProfileField('skills')}
              </Grid>
              <Grid item xs={12}>
                {renderProfileField('interests')}
              </Grid>

              {/* About */}
              <Grid item xs={12}>
                <Typography variant="h6" sx={{ mb: 2, mt: 2, color: theme.palette.primary.main }}>
                  About
                </Typography>
              </Grid>
              <Grid item xs={12}>
                {renderProfileField('about')}
              </Grid>
            </Grid>
          )}
          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
              <CircularProgress />
            </Box>
          )}
        </DialogContent>
        
        {!isProfileSetup && (
          <DialogActions sx={{ px: 3, py: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
            <Button 
              onClick={onClose}
              sx={{ color: theme.palette.text.secondary }}
            >
              Cancel
            </Button>
            <Button 
              variant="contained" 
              onClick={handleProfileDialogSubmit}
              disabled={loading}
              color="primary"
            >
              Save Changes
            </Button>
          </DialogActions>
        )}
      </Dialog>
      
      {/* Error Dialog */}
      {renderErrorDialog()}
    </>
  );
};

export default EditProfile; 