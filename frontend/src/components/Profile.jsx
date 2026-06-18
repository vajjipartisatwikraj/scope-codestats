import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import {
  Box, Container, Grid, Typography, Button,
  IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Chip, MenuItem, useMediaQuery, DialogContentText,
  CircularProgress, Avatar, Tooltip, Autocomplete, InputAdornment,
  Alert
} from '@mui/material';
import { useTheme as useMuiTheme } from '@mui/material/styles';
import {
  Add as AddIcon, Edit as EditIcon, GitHub, LinkedIn, Email, Phone, School,
  Badge, OpenInNew, Delete as DeleteIcon, Close as CloseIcon,
  Search as SearchIcon, VerifiedUser as CertificateIcon,
  Work as InternshipIcon, EmojiEvents as AchievementIcon,
  Code as ProjectIcon, Description as ResumeIcon
} from '@mui/icons-material';
import { apiUrl } from '../config/apiConfig';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { toast } from 'react-toastify';
import EditProfile from './EditProfile';
import { getProfileImageUrl } from '../utils/profileUtils';

// Achievement types with icons
const achievementTypes = [
  { value: 'achievement', label: 'Achievements', icon: <AchievementIcon /> },
  { value: 'project', label: 'Projects', icon: <ProjectIcon /> },
  { value: 'internship', label: 'Internships', icon: <InternshipIcon /> },
  { value: 'certification', label: 'Certifications', icon: <CertificateIcon /> }
];

const MAX_ITEMS_PER_TYPE = 5;
const LIMITED_TYPES = ['project', 'internship'];
const LOGO_TOKEN = 'pk_RBjC8X-kSE2wrzZ-kFI4-g';

const getWordCount = (text) => text.trim().split(/\s+/).filter(w => w).length;

const DomainSearch = ({ onDomainSelect, initialValue }) => {
  const [searchQuery, setSearchQuery] = useState(initialValue || '');
  const [domains, setDomains] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Search for domains based on query
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) {
      setDomains([]);
      return;
    }

    setLoading(true);
    
    // For demonstration, create domain suggestions based on the input
    // In a real app, this would call your API
    setTimeout(() => {
      // Create dynamic domain options that include common TLDs and the exact input
      const domainOptions = [
        { name: searchQuery, domain: searchQuery },
        { name: `${searchQuery}.com`, domain: `${searchQuery}.com` },
        { name: `${searchQuery}.org`, domain: `${searchQuery}.org` },
        { name: `${searchQuery}.net`, domain: `${searchQuery}.net` },
        { name: `${searchQuery}.ac.in`, domain: `${searchQuery}.ac.in` }
      ];
      
      setDomains(domainOptions);
      setLoading(false);
    }, 300);
  }, [searchQuery]);

  const handleInputChange = (e, newValue) => {
    setSearchQuery(newValue || '');
  };
  
  const handleChange = (e, option) => {
    if (option) {
      onDomainSelect(option.domain);
    }
  };
  
  const handleKeyDown = (e) => {
    // If Enter is pressed with no selection, use the raw input
    if (e.key === 'Enter' && searchQuery && !e.defaultPrevented) {
      e.preventDefault();
      onDomainSelect(searchQuery);
    }
  };

  return (
    <Autocomplete
      freeSolo
      options={domains}
      getOptionLabel={(option) => {
        if (typeof option === 'string') {
          return option;
        }
        return option.domain || '';
      }}
      loading={loading}
      inputValue={searchQuery}
      onInputChange={handleInputChange}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      renderInput={(params) => (
        <TextField
          {...params}
          label="Search organization domain"
          placeholder="e.g. nptel.ac.in, google.com"
          fullWidth
          InputProps={{
            ...params.InputProps,
            startAdornment: (
              <>
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
                {params.InputProps.startAdornment}
              </>
            ),
            endAdornment: (
              <>
                {loading ? <CircularProgress color="inherit" size={20} /> : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
      renderOption={(props, option) => (
        <li {...props}>
          <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 2 }}>
            <Box
              component="img"
              sx={{
                width: 28,
                height: 28,
                objectFit: 'contain',
                borderRadius: 0.5,
                bgcolor: 'transparent'
              }}
              src={`https://img.logo.dev/${option.domain}?token=${LOGO_TOKEN}`}
              alt={option.name}
              onError={(e) => {
                e.target.src = '/placeholder-logo.png';
              }}
            />
            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
              <Typography variant="body2" noWrap fontWeight={500}>
                {option.domain}
              </Typography>
            </Box>
          </Box>
        </li>
      )}
    />
  );
};

const DomainLogo = ({ domain, size = 24 }) => {
  if (!domain) return null;
  
  return (
    <Box
      component="img"
      sx={{
        width: size,
        height: size,
        objectFit: 'contain',
        borderRadius: 0.5
      }}
      src={`https://img.logo.dev/${domain}?token=${LOGO_TOKEN}`}
      alt={domain}
      onError={(e) => {
        e.target.src = '/placeholder-logo.png';
      }}
    />
  );
};

const Profile = () => {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useMuiTheme();
  const { darkMode } = useTheme();
  
  // Check if this is a profile setup flow
  const isProfileSetup = new URLSearchParams(location.search).get('setup') === 'true';
  
  // State variables for profile editing and viewing
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('achievement');
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    rollNumber: '',
    department: '',
    section: '',
    graduationYear: '',
    phone: '',
    linkedinUrl: '',
    resumeLink: '',
    githubUrl: '',
    skills: [],
    interests: [],
    about: '',
  });
  const [achievements, setAchievements] = useState([]);

  // Dialog states
  const [openDialog, setOpenDialog] = useState(false);
  const [openProfileDialog, setOpenProfileDialog] = useState(false);
  const [errorDialog, setErrorDialog] = useState({ open: false, title: '', message: '' });
  
  // Achievement form state
  const [achievementForm, setAchievementForm] = useState({
    type: 'achievement',
    title: '',
    description: '',
    tags: [],
    link: '',
    domainLink: '',
    startDate: '',
    endDate: ''
  });
  const [editingAchievement, setEditingAchievement] = useState(null);

  // Filter achievements based on active tab
  const filteredAchievements = achievements.filter(
    achievement => achievement.type === activeTab
  );

  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Add confirmation dialog state
  const [deleteConfirmation, setDeleteConfirmation] = useState({ open: false, achievementId: null });

  // Add handlers for tags input
  const [tagInput, setTagInput] = useState('');

  // Load profile data when component mounts
  useEffect(() => {
    const loadProfileData = async () => {
      if (!auth?.token) {
        navigate('/login');
        return;
      }
      
      setLoading(true);
      setError(null);
      
      try {
        // Fetch profile data and achievements separately
        await Promise.all([
          fetchProfileData(),
          fetchAchievements()
        ]);
      } catch (err) {
        setError('Failed to load profile data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    loadProfileData();
  }, [auth?.token, navigate]);

    // Automatically open profile dialog if in setup mode
  useEffect(() => {
    if (isProfileSetup && auth?.user?.newUser) {
      setOpenProfileDialog(true);
    }
  }, [isProfileSetup, auth?.user?.newUser]);

  // Fetch profile data from API
  const fetchProfileData = async () => {
    try {
      const profileResponse = await axios.get(`${apiUrl}/profiles/me`, {
        headers: { Authorization: `Bearer ${auth.token}` }
      });
      
      setProfileData(profileResponse.data);
    } catch (error) {
      // Error handled by parent loadProfileData
    }
  };

  // Fetch achievements from API
  const fetchAchievements = async () => {
    try {
      const achievementsResponse = await axios.get(`${apiUrl}/achievements`, {
        headers: { Authorization: `Bearer ${auth.token}` }
      });
      setAchievements(achievementsResponse.data);
    } catch (error) {
      // Error handled by parent loadProfileData
    }
  };

  // Edit profile - open dialog
  const handleEditProfileClick = () => {
    setOpenProfileDialog(true);
  };

  // Handle profile dialog close
  const handleCloseProfileDialog = () => {
    setOpenProfileDialog(false);
  };

  // Add a function for phone validation if none exists
  const validatePhone = (phone) => {
    if (!phone || !/^\d{10}$/.test(phone)) {
      return 'Please enter a valid 10-digit mobile number';
    }
    return '';
  };

  // Handle profile update from EditProfile component
  const handleProfileUpdate = (updatedProfileData) => {
    // Validate phone number
    if (updatedProfileData.phone) {
      const phoneError = validatePhone(updatedProfileData.phone);
      if (phoneError) {
        // Display error message
        toast.error(phoneError);
        return;
      }
    }

    // Update the local state with the new profile data
    setProfileData(updatedProfileData);
    
    // Close the profile dialog
    setOpenProfileDialog(false);
    
    // Reload profile data to ensure we have the latest from the server
    fetchProfileData();
    
    // Show success message
    toast.success('Profile updated successfully');
  };

  // Reset achievement form
  const resetAchievementForm = () => {
    setAchievementForm({
      type: activeTab,
      title: '',
      description: '',
      tags: [],
      link: '',
      domainLink: '',
      startDate: '',
      endDate: ''
    });
    setEditingAchievement(null);
  };

  // Handle edit achievement button click
  const handleEditAchievement = (achievement) => {
    setEditingAchievement(achievement);
    
    // Use the tags array directly if it exists
    const tags = Array.isArray(achievement.tags) 
      ? achievement.tags
      : achievement.tags ? achievement.tags.split(',').map(tag => tag.trim()).filter(tag => tag !== '') : [];
    
    setAchievementForm({
      ...achievement,
      tags: tags,
      domainLink: achievement.domainLink || ''
    });
    
    setOpenDialog(true);
  };

  // Handle achievement form submission
  const handleAchievementSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    if (!achievementForm.title || !achievementForm.description) {
      setErrorDialog({
        open: true,
        title: 'Missing Required Fields',
        message: 'Please fill in all required fields.'
      });
      return;
    }
    
    // Check if limit is reached for this type (only for limited types)
    if (LIMITED_TYPES.includes(achievementForm.type) && !editingAchievement) {
      const currentTypeCount = achievements.filter(a => a.type === achievementForm.type).length;
      if (currentTypeCount >= MAX_ITEMS_PER_TYPE) {
        setErrorDialog({
          open: true,
          title: 'Limit Reached',
          message: `You can only add up to ${MAX_ITEMS_PER_TYPE} ${achievementForm.type}s. Please delete an existing one to add more.`
        });
        return;
      }
    }
    
    const wordCount = getWordCount(achievementForm.description);
    if (wordCount > 40) {
      setErrorDialog({
        open: true,
        title: 'Description Too Long',
        message: `Your description is ${wordCount} words. Please limit it to 40 words or less.`
      });
      return;
    }

    try {
      // Use the tags array directly from state
      const achievementData = {
        ...achievementForm
      };
      
      let response;
      
      if (editingAchievement) {
        // Update existing achievement
        response = await axios.put(
          `${apiUrl}/achievements/${editingAchievement._id}`,
          achievementData,
          { headers: { Authorization: `Bearer ${auth.token}` } }
        );
        
        // Update the achievements state
        setAchievements(prevAchievements => 
          prevAchievements.map(achievement => 
            achievement._id === editingAchievement._id ? response.data : achievement
          )
        );
        
        toast.success('Achievement updated successfully');
        } else {
        // Create new achievement
        response = await axios.post(
          `${apiUrl}/achievements`,
          achievementData,
          { headers: { Authorization: `Bearer ${auth.token}` } }
        );
        
        // Add the new achievement to the state
        setAchievements(prevAchievements => [...prevAchievements, response.data]);
        
        toast.success('Achievement added successfully');
      }
      
      // Close dialog and reset form
      setOpenDialog(false);
      resetAchievementForm();
    } catch (error) {
      setErrorDialog({
        open: true,
        title: 'Error',
        message: error.response?.data?.message || 'Failed to save achievement. Please try again.'
      });
    }
  };

  // Add delete achievement handler
  const handleDeleteAchievement = async (achievementId) => {
    try {
      await axios.delete(
        `${apiUrl}/achievements/${achievementId}`,
        { headers: { Authorization: `Bearer ${auth.token}` } }
      );
      
      // Remove the achievement from state
      setAchievements(prevAchievements => 
        prevAchievements.filter(achievement => achievement._id !== achievementId)
      );
      
      toast.success('Achievement deleted successfully');
    } catch (error) {
      setErrorDialog({
        open: true,
        title: 'Error',
        message: error.response?.data?.message || 'Failed to delete achievement. Please try again.'
      });
    }
  };

  // Handle delete confirmation
  const handleDeleteConfirm = (achievementId) => {
    setDeleteConfirmation({ open: true, achievementId });
  };

  const handleDeleteConfirmed = async () => {
    if (!deleteConfirmation.achievementId) return;
    await handleDeleteAchievement(deleteConfirmation.achievementId);
    setDeleteConfirmation({ open: false, achievementId: null });
  };

  // Add handlers for tags input
  const handleTagInputChange = (e) => {
    setTagInput(e.target.value);
  };

  const handleTagInputKeyDown = (e) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      const newTag = tagInput.trim();
      if (!achievementForm.tags.includes(newTag)) {
        setAchievementForm({
          ...achievementForm,
          tags: [...achievementForm.tags, newTag]
        });
      }
      setTagInput('');
    }
  };

  const handleDeleteTag = (tagToDelete) => {
    setAchievementForm({
      ...achievementForm,
      tags: achievementForm.tags.filter(tag => tag !== tagToDelete)
    });
  };

  // Handle domain select
  const handleDomainSelect = (domain) => {
    if (domain) {
      setAchievementForm({
        ...achievementForm,
        domainLink: domain
      });
    }
  };

  // If loading, show spinner
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  // If error, show error message
  if (error) {
    return (
      <Box sx={{ textAlign: 'center', py: 5 }}>
        <Typography variant="h5" color="error" gutterBottom>
          {error}
        </Typography>
        <Button variant="contained" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 2, p: { xs: 0, sm: 2 } }}>
      {/* Hero Section with improved styling */}
      <Box
        sx={{
          position: 'relative',
          mb: 6,
          borderRadius: '24px',
          overflow: 'visible',
          bgcolor: darkMode ? 'transparent' : '#ffffff',
          backdropFilter: 'blur(10px)',
          border: `1px solid ${darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
          boxShadow: darkMode ? 'none' : '0 2px 8px rgba(0,0,0,0.08)',
        }}
      >
        {/* Cover Image/Gradient */}
        <Box
          sx={{
            height: '200px',
            background: 'linear-gradient(45deg, #0088cc 30%, #00bfff 90%)',
            opacity: 0.9,
            borderRadius: '24px 24px 0 0',
          }}
        />

        {/* Profile Info Section with better contrast */}
        <Box 
          sx={{ 
            position: 'relative',
            px: 3,
            pb: 3,
            mt: '-60px',
          }}
        >
          <Box sx={{ 
            display: 'flex', 
            flexDirection: { xs: 'column', md: 'row' },
            alignItems: { xs: 'center', md: 'flex-start' },
            gap: 1,
            mb: 3,
            zIndex: 1,
          }}>
            {/* Add profile avatar */}
            <Avatar
              src={getProfileImageUrl(profileData.profilePicture)}
              alt={profileData.name || 'User'}
              sx={{
                width: 120,
                height: 120,
                border: '4px solid white',
                boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
                mr: { xs: 0, md: 3 },
                mb: { xs: 2, md: 0 }
              }}
            >
              {profileData.name?.charAt(0).toUpperCase()}
            </Avatar>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: { xs: 'center', md: 'flex-start' } }}>
              <Typography 
                variant="h4" 
                sx={{ 
                  fontWeight: 600, 
                  mb: 0.5,
                  color: '#ffffff',
                  letterSpacing: '-0.5px',
                  textShadow: '0 2px 8px rgba(0,0,0,0.5)',
                }}
              >
                {profileData.name}
              </Typography>
              <Typography 
                variant="body1" 
                sx={{ 
                  mb: 2,
                  color: '#ffffff',
                  fontWeight: 500,
                  textShadow: '0 2px 6px rgba(0,0,0,0.5)',
                  backgroundColor: 'rgba(0, 0, 0, 0.3)',
                  padding: '4px 12px',
                  borderRadius: '16px',
                }}
              >
                {profileData.department} Department
              </Typography>
              <Button 
                startIcon={<EditIcon />} 
                onClick={handleEditProfileClick}
                variant="contained"
                sx={{
                  bgcolor: '#0088cc',
                  '&:hover': { bgcolor: '#006699' },
                  boxShadow: darkMode ? 'none' : '0 2px 8px rgba(0,0,0,0.08)',
                  borderRadius: '8px',
                  px: 2
                }}
              >
                Edit Profile
              </Button>
            </Box>
          </Box>

          {/* Quick Info Grid with improved styling */}
          <Grid container spacing={0} sx={{ 
            mb: 4, 
            bgcolor: darkMode ? 'rgba(23, 23, 23, 0.45)' : '#ffffff',
            p: 3, 
            borderRadius: '16px',
            boxShadow: darkMode ? 'none' : '0 2px 8px rgba(0,0,0,0.08)',
            border: `1px solid ${darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`
          }}>
            <Grid item xs={12} sm={6} md={3} sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Box sx={{ minWidth: 44, mr: 2, display: 'flex', justifyContent: 'center' }}>
                  <Badge sx={{ color: '#0088cc', fontSize: 28 }} />
                </Box>
                <Box>
                  <Typography variant="body2" sx={{ color: darkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)', fontWeight: 500, mb: 0.5 }}>
                  Roll Number
                </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600, color: darkMode ? '#ffffff' : '#000000' }}>
                  {profileData.rollNumber}
                </Typography>
                </Box>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3} sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Box sx={{ minWidth: 44, mr: 2, display: 'flex', justifyContent: 'center' }}>
                  <School sx={{ color: '#0088cc', fontSize: 28 }} />
                </Box>
                <Box>
                  <Typography variant="body2" sx={{ color: darkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)', fontWeight: 500, mb: 0.5 }}>
                  Department
                </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600, color: darkMode ? '#ffffff' : '#000000' }}>
                  {profileData.department}
                </Typography>
                </Box>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3} sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Box sx={{ minWidth: 44, mr: 2, display: 'flex', justifyContent: 'center' }}>
                  <Email sx={{ color: '#0088cc', fontSize: 28 }} />
                </Box>
                <Box>
                  <Typography variant="body2" sx={{ color: darkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)', fontWeight: 500, mb: 0.5 }}>
                  Email
                </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600, color: darkMode ? '#ffffff' : '#000000' }}>
                  {auth?.user?.email}
                </Typography>
                </Box>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3} sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Box sx={{ minWidth: 44, mr: 2, display: 'flex', justifyContent: 'center' }}>
                  <Phone sx={{ color: '#0088cc', fontSize: 28 }} />
                </Box>
                <Box>
                  <Typography variant="body2" sx={{ color: darkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)', fontWeight: 500, mb: 0.5 }}>
                  Phone
                </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600, color: darkMode ? '#ffffff' : '#000000' }}>
                  {profileData.phone || 'Not provided'}
                </Typography>
                </Box>
              </Box>
            </Grid>
          </Grid>

          {/* About Section with improved styling */}
          <Box sx={{
            p: 3,
            borderRadius: '16px',
            boxShadow: darkMode ? 'none' : '0 2px 8px rgba(0,0,0,0.08)',
            border: `1px solid ${darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
            bgcolor: darkMode ? 'rgba(23, 23, 23, 0.45)' : '#ffffff',
            mb: 3
          }}>
            <Typography variant="h6" sx={{ mb: 2, color: darkMode ? '#ffffff' : '#000000' }}>About</Typography>
            <Typography 
              variant="body1" 
              sx={{ 
                color: darkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)',
                lineHeight: 1.7,
                whiteSpace: 'pre-wrap'
              }}
            >
              {profileData.about || 'No bio provided yet.'}
            </Typography>
          </Box>

          {/* Skills & Interests with improved styling - displayed side by side */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            {profileData.skills && profileData.skills.length > 0 && (
              <Grid item xs={12} md={6}>
                <Box sx={{ 
                  height: '100%',
                  p: 3, 
                  borderRadius: '16px',
                  boxShadow: darkMode ? 'none' : '0 2px 8px rgba(0,0,0,0.08)',
                  border: `1px solid ${darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                  bgcolor: darkMode ? 'rgba(23, 23, 23, 0.45)' : '#ffffff'
                }}>
                  <Typography variant="h6" sx={{ mb: 2, color: darkMode ? '#ffffff' : '#000000' }}>Skills</Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {profileData.skills.map((skill, index) => (
                      <Chip 
                        key={index} 
                        label={skill} 
                        sx={{
                          bgcolor: 'rgba(0, 136, 204, 0.2)',
                          color: '#0088cc',
                          border: '1px solid rgba(0, 136, 204, 0.3)',
                          '&:hover': { bgcolor: 'rgba(0, 136, 204, 0.3)' }
                        }}
                      />
                    ))}
                  </Box>
                </Box>
              </Grid>
            )}
            {profileData.interests && profileData.interests.length > 0 && (
              <Grid item xs={12} md={6}>
                <Box sx={{ 
                  height: '100%',
                  p: 3, 
                  borderRadius: '16px',
                  boxShadow: darkMode ? 'none' : '0 2px 8px rgba(0,0,0,0.08)',
                  border: `1px solid ${darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                  bgcolor: darkMode ? 'rgba(23, 23, 23, 0.45)' : '#ffffff'
                }}>
                  <Typography variant="h6" sx={{ mb: 2, color: darkMode ? '#ffffff' : '#000000' }}>Interests</Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {profileData.interests.map((interest, index) => (
                      <Chip 
                        key={index} 
                        label={interest} 
                        sx={{
                          bgcolor: 'rgba(0, 136, 204, 0.2)',
                          color: '#0088cc',
                          border: '1px solid rgba(0, 136, 204, 0.3)',
                          '&:hover': { bgcolor: 'rgba(0, 136, 204, 0.3)' }
                        }}
                      />
                    ))}
                  </Box>
                </Box>
              </Grid>
            )}
          </Grid>

          {/* Empty state if no skills or interests */}
          {(!profileData.skills || profileData.skills.length === 0) && 
           (!profileData.interests || profileData.interests.length === 0) && (
            <Box sx={{ 
              mb: 3,
              p: 3, 
              borderRadius: '16px',
              boxShadow: darkMode ? 'none' : '0 2px 8px rgba(0,0,0,0.08)',
              border: `1px solid ${darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
              bgcolor: darkMode ? 'rgba(23, 23, 23, 0.45)' : '#ffffff',
              textAlign: 'center'
            }}>
              <Typography variant="body1" sx={{ color: darkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)', fontStyle: 'italic' }}>
                No skills or interests added yet. Edit your profile to add some!
              </Typography>
            </Box>
          )}

          {/* Social Links Section */}
          <Box sx={{ 
            p: { xs: 2, md: 3 }, 
            mb: 3,
            bgcolor: darkMode ? 'rgba(23, 23, 23, 0.45)' : '#ffffff',
            borderRadius: 2,
            boxShadow: darkMode ? 'none' : '0 2px 8px rgba(0,0,0,0.08)',
            border: `1px solid ${darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`
          }}>
            <Typography variant="h6" sx={{ 
              color: darkMode ? '#ffffff' : '#000000', 
              mb: 2,
              fontWeight: 500,
              fontSize: { xs: '1.1rem', md: '1.25rem' }
            }}>
              Social Links
            </Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              {profileData.linkedinUrl && (
                <IconButton 
                  href={profileData.linkedinUrl ? (profileData.linkedinUrl.includes('linkedin.com') ? profileData.linkedinUrl : `https://www.linkedin.com/in/${profileData.linkedinUrl}`) : '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{ 
                    width: { xs: 45, md: 50 },
                    height: { xs: 45, md: 50 },
                    bgcolor: darkMode ? 'rgba(0, 119, 181, 0.3)' : 'rgba(0, 119, 181, 0.1)',
                    color: '#0077b5',
                    '&:hover': { 
                      bgcolor: darkMode ? 'rgba(0, 119, 181, 0.4)' : 'rgba(0, 119, 181, 0.2)'
                    }
                  }}
                >
                  <LinkedIn sx={{ fontSize: { xs: 22, md: 24 } }} />
                </IconButton>
              )}
              {profileData.profiles?.github?.username && (
                <IconButton 
                  href={profileData.profiles?.github?.username ? (profileData.profiles.github.username.includes('github.com') ? profileData.profiles.github.username : `https://github.com/${profileData.profiles.github.username}`) : '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{ 
                    width: { xs: 45, md: 50 },
                    height: { xs: 45, md: 50 },
                    bgcolor: darkMode ? 'rgba(33, 33, 33, 0.4)' : 'rgba(33, 33, 33, 0.1)',
                    color: darkMode ? 'white' : '#333',
                    '&:hover': { 
                      bgcolor: darkMode ? 'rgba(33, 33, 33, 0.6)' : 'rgba(33, 33, 33, 0.2)'
                    }
                  }}
                >
                  <GitHub sx={{ fontSize: { xs: 22, md: 24 } }} />
                </IconButton>
              )}
              {profileData.resumeLink && (
                <IconButton 
                  href={profileData.resumeLink.startsWith('http') ? profileData.resumeLink : `https://${profileData.resumeLink}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{ 
                    width: { xs: 45, md: 50 },
                    height: { xs: 45, md: 50 },
                    bgcolor: darkMode ? 'rgba(0, 136, 204, 0.3)' : 'rgba(0, 136, 204, 0.1)',
                    color: '#0088cc',
                    '&:hover': { 
                      bgcolor: darkMode ? 'rgba(0, 136, 204, 0.4)' : 'rgba(0, 136, 204, 0.2)'
                    }
                  }}
                >
                  <ResumeIcon sx={{ fontSize: { xs: 22, md: 24 } }} />
                </IconButton>
              )}
              {!profileData.linkedinUrl && !profileData.profiles?.github?.username && !profileData.resumeLink && (
                <Typography variant="body2" sx={{ color: darkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}>
                  No social links added yet
                </Typography>
              )}
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Achievements Section */}
      <Box sx={{ 
        borderRadius: 2,
        bgcolor: darkMode ? 'rgba(23, 23, 23, 0.45)' : '#ffffff',
        boxShadow: darkMode ? 'none' : '0 2px 8px rgba(0,0,0,0.08)',
        border: `1px solid ${darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
        overflow: 'hidden',
        mb: 4,
        pb: 2
      }}>
        <Box sx={{ 
          px: { xs: 2, md: 3 },
          pt: { xs: 2, md: 3 },
          pb: 2,
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          justifyContent: { md: 'space-between' },
          alignItems: { md: 'center' },
          gap: { xs: 2, md: 0 }
        }}>
          <Typography variant="h6" sx={{ 
            fontWeight: 600, 
            color: darkMode ? '#ffffff' : '#000000',
            fontSize: { xs: '1.25rem', md: '1.5rem' }
          }}>
            Portfolio
          </Typography>
          
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              // Only check limits for project and internship types
              if (LIMITED_TYPES.includes(activeTab)) {
                const currentTypeCount = achievements.filter(a => a.type === activeTab).length;
                if (currentTypeCount >= MAX_ITEMS_PER_TYPE) {
                  setErrorDialog({
                    open: true,
                    title: 'Limit Reached',
                    message: `You can only add up to ${MAX_ITEMS_PER_TYPE} ${activeTab}s. Please delete an existing one to add more.`
                  });
                  return;
                }
              }
              resetAchievementForm();
              setOpenDialog(true);
            }}
            sx={{ 
              bgcolor: '#0088cc',
              '&:hover': {
                bgcolor: '#006699'
              },
              py: { xs: 1, md: 0.75 },
              width: { xs: '100%', md: 'auto' },
              borderRadius: 1
            }}
            disabled={LIMITED_TYPES.includes(activeTab) && achievements.filter(a => a.type === activeTab).length >= MAX_ITEMS_PER_TYPE}
          >
            Add New
          </Button>
        </Box>

        {/* Achievement Type Tabs */}
        <Box sx={{
          px: { xs: 2, md: 3 },
          mb: 3
        }}>
          <Box sx={{
            bgcolor: darkMode ? '#0A0A0A' : '#ffffff',
            borderRadius: 8,
            p: 0.5,
            display: 'flex',
            overflowX: 'auto',
            '&::-webkit-scrollbar': {
              display: 'none'
            },
            scrollbarWidth: 'none',
            border: `1px solid ${darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`
          }}>
            {achievementTypes.map((type) => (
              <Button
                key={`type-${type.value}`}
                startIcon={type.icon}
                onClick={() => setActiveTab(type.value)}
                sx={{
                  color: activeTab === type.value ? 'white' : darkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)',
                  bgcolor: activeTab === type.value ? '#0088cc' : 'transparent',
                  borderRadius: 6,
                  mx: 0.5,
                  px: 2,
                  py: 0.75,
                  textTransform: 'none',
                  fontSize: '0.85rem',
                  whiteSpace: 'nowrap',
                  minWidth: 'auto',
                  position: 'relative',
                  '&:hover': {
                    bgcolor: activeTab === type.value ? '#0088cc' : darkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.04)'
                  }
                }}
              >
                {type.label}
                <Typography
                  component="span"
                  sx={{
                    ml: 1,
                    fontSize: '0.75rem',
                    color: activeTab === type.value ? 'rgba(255,255,255,0.8)' : darkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)',
                    bgcolor: activeTab === type.value ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.1)',
                    px: 1,
                    py: 0.25,
                    borderRadius: '10px',
                    display: 'inline-block'
                  }}
                >
                  {achievements.filter(a => a.type === type.value).length}
                  {LIMITED_TYPES.includes(type.value) ? `/${MAX_ITEMS_PER_TYPE}` : ''}
                </Typography>
              </Button>
            ))}
          </Box>
        </Box>

        {/* Achievements Cards */}
        <Box sx={{ px: { xs: 2, md: 3 } }}>
          {filteredAchievements.length > 0 ? (
            <Box sx={{ 
              display: { xs: 'block', md: 'grid' },
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: 3
            }}>
              {filteredAchievements.map((achievement) => (
                <Box
                  key={achievement._id}
                  sx={{
                    mb: { xs: 3, md: 0 },
                    bgcolor: darkMode ? 'rgba(23, 23, 23, 0.45)' : '#ffffff',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'all 0.2s ease-in-out',
                    height: '100%',
                    minHeight: '220px',
                    border: `1px solid ${darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                    boxShadow: darkMode ? 'none' : '0 2px 8px rgba(0,0,0,0.08)',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: darkMode ? '0 8px 32px rgba(0, 136, 204, 0.15)' : '0 6px 16px rgba(0, 0, 0, 0.12)',
                    }
                  }}
                >
                  {/* Content area */}
                  <Box sx={{ 
                    p: { xs: 2.5, md: 3 }, 
                    flex: 1, 
                    display: 'flex', 
                    flexDirection: 'column',
                    gap: 1.5
                  }}>
                    <Typography 
                      variant="h6" 
                      sx={{ 
                        fontWeight: 600, 
                        color: darkMode ? '#ffffff' : '#000000',
                        fontSize: '1.1rem',
                        lineHeight: 1.3,
                        mb: 0.5
                      }}
                    >
                      {achievement.title}
                    </Typography>
                    
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        color: darkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)',
                        fontSize: '0.9rem',
                        lineHeight: 1.6,
                        flex: 1,
                        mb: 1
                      }}
                    >
                      {achievement.description}
                    </Typography>

                    {/* Tags Section */}
                    {achievement.tags && achievement.tags.length > 0 && (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1 }}>
                        {achievement.tags.map((tag, idx) => (
                          <Chip
                            key={idx}
                            label={tag}
                            size="small"
                            sx={{
                              bgcolor: darkMode ? 'rgba(0, 136, 204, 0.2)' : 'rgba(0, 136, 204, 0.1)',
                              color: '#0088cc',
                              border: '1px solid rgba(0, 136, 204, 0.3)',
                              height: '24px',
                              fontSize: '0.75rem',
                              fontWeight: 500,
                              '&:hover': {
                                bgcolor: darkMode ? 'rgba(0, 136, 204, 0.3)' : 'rgba(0, 136, 204, 0.2)'
                              }
                            }}
                          />
                        ))}
                      </Box>
                    )}

                    {achievement.certificateId && (
                      <Chip
                        label="certificate"
                        size="small"
                        sx={{
                          bgcolor: 'transparent',
                          color: '#0088cc',
                          border: '1px solid #0088cc',
                          height: '24px',
                          fontSize: '0.75rem',
                          width: 'fit-content',
                          fontWeight: 500
                        }}
                      />
                    )}
                  </Box>

                  {/* Action Buttons */}
                  <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'flex-end',
                    alignItems: 'center',
                    p: 1.5,
                    borderTop: `1px solid ${darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                    bgcolor: darkMode ? 'rgba(0, 0, 0, 0.2)' : 'rgba(0, 0, 0, 0.02)'
                  }}>
                    {achievement.domainLink && (
                      <Tooltip title={achievement.domainLink}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mr: 'auto' }}>
                          <DomainLogo domain={achievement.domainLink} size={20} />
                          <Typography variant="caption" sx={{ ml: 1, color: darkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}>
                            {achievement.domainLink}
                          </Typography>
                        </Box>
                      </Tooltip>
                    )}
                    <IconButton
                      href={achievement.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      size="small"
                      sx={{ 
                        color: '#0088cc',
                        '&:hover': {
                          bgcolor: darkMode ? 'rgba(0, 136, 204, 0.1)' : 'rgba(0, 136, 204, 0.05)'
                        }
                      }}
                      onClick={(e) => {
                        if (!achievement.link) {
                          e.preventDefault();
                        }
                      }}
                      disabled={!achievement.link}
                    >
                      <OpenInNew fontSize="small" />
                    </IconButton>
                    <IconButton
                      onClick={() => handleEditAchievement(achievement)}
                      size="small"
                      sx={{ 
                        color: darkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)',
                        ml: 1,
                        '&:hover': {
                          bgcolor: darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'
                        }
                      }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      onClick={() => handleDeleteConfirm(achievement._id)}
                      size="small"
                      sx={{ 
                        color: '#f44336',
                        ml: 1,
                        '&:hover': {
                          bgcolor: darkMode ? 'rgba(255, 0, 0, 0.1)' : 'rgba(255, 0, 0, 0.05)'
                        }
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>
              ))}
            </Box>
          ) : (
            <Box 
              sx={{ 
                textAlign: 'center', 
                py: 4,
                px: 2,
                bgcolor: darkMode ? 'rgba(23, 23, 23, 0.45)' : '#ffffff',
                borderRadius: 2,
                mb: 3,
                border: `1px solid ${darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`
              }}
            >
              <Typography variant="body2" sx={{ color: darkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}>
                No {activeTab === 'achievement' ? 'achievements' : activeTab + 's'} added yet
              </Typography>
            </Box>
          )}
        </Box>
      </Box>

      {/* Achievement Dialog */}
      <Dialog 
        open={openDialog} 
        onClose={() => setOpenDialog(false)} 
        maxWidth="sm" 
        fullWidth
        fullScreen={isMobile}
        container={() => document.getElementById('dialog-container') || document.body}
        disableEnforceFocus
      >
        <DialogTitle sx={{ 
          px: { xs: 2, sm: 3 },
          py: { xs: 1.5, sm: 2 }
        }}>
          {editingAchievement ? 'Edit Item' : 'Add New Item'}
        </DialogTitle>
        <DialogContent sx={{ px: { xs: 2, sm: 3 } }}>
          <Box component="form" onSubmit={handleAchievementSubmit} sx={{ mt: 2 }}>
            <Grid container spacing={{ xs: 1.5, sm: 2 }}>
              <Grid item xs={12}>
                <TextField
                  select
                  fullWidth
                  label="Type"
                  value={achievementForm.type}
                  onChange={(e) => {
                    // Reset dates if changing from internship to another type
                    if (e.target.value !== 'internship') {
                      setAchievementForm({
                        ...achievementForm,
                        type: e.target.value,
                        startDate: '',
                        endDate: ''
                      });
                    } else {
                      setAchievementForm({
                        ...achievementForm,
                        type: e.target.value
                      });
                    }
                  }}
                  required
                >
                  {achievementTypes.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Title"
                  value={achievementForm.title}
                  onChange={(e) => setAchievementForm({ ...achievementForm, title: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Description"
                  multiline
                  rows={4}
                  value={achievementForm.description}
                  onChange={(e) => setAchievementForm({ ...achievementForm, description: e.target.value })}
                  required
                  helperText={`${getWordCount(achievementForm.description)}/40 words (30-40 words recommended)`}
                  error={getWordCount(achievementForm.description) > 40}
                  FormHelperTextProps={{
                    sx: {
                      display: 'flex',
                      justifyContent: 'space-between',
                      width: '100%',
                      mt: 0.5
                    }
                  }}
                  placeholder="Keep your description concise (max 40 words)"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Tags"
                  value={tagInput}
                  onChange={handleTagInputChange}
                  onKeyDown={handleTagInputKeyDown}
                  placeholder="Type and press Enter to add tags"
                  helperText="Press Enter to add a tag"
                />
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                  {achievementForm.tags.map((tag, index) => (
                    <Chip
                      key={index}
                      label={tag}
                      onDelete={() => handleDeleteTag(tag)}
                      sx={{
                        bgcolor: 'rgba(0, 136, 204, 0.2)',
                        color: '#0088cc',
                        border: '1px solid rgba(0, 136, 204, 0.3)',
                        '&:hover': { bgcolor: 'rgba(0, 136, 204, 0.3)' }
                      }}
                    />
                  ))}
                </Box>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 500 }}>
                  Organization/Issuer Domain
                </Typography>
                <DomainSearch 
                  onDomainSelect={handleDomainSelect}
                  initialValue={achievementForm.domainLink} 
                />
                {achievementForm.domainLink && (
                  <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <DomainLogo domain={achievementForm.domainLink} size={20} />
                      <Typography variant="caption" sx={{ ml: 1 }}>
                        {achievementForm.domainLink}
                      </Typography>
                    </Box>
                    <IconButton 
                      size="small" 
                      onClick={() => setAchievementForm({...achievementForm, domainLink: ''})}
                      aria-label="Clear domain"
                    >
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </Box>
                )}
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Search and select the organization or issuer domain
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Link"
                  value={achievementForm.link}
                  onChange={(e) => setAchievementForm({ ...achievementForm, link: e.target.value })}
                  placeholder="Link to your certificate, project, etc."
                />
              </Grid>
              {achievementForm.type === 'internship' && (
                <>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Start Date"
                      type="date"
                      value={achievementForm.startDate}
                      onChange={(e) => setAchievementForm({ ...achievementForm, startDate: e.target.value })}
                      InputLabelProps={{ shrink: true }}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="End Date"
                      type="date"
                      value={achievementForm.endDate}
                      onChange={(e) => setAchievementForm({ ...achievementForm, endDate: e.target.value })}
                      InputLabelProps={{ shrink: true }}
                      required
                    />
                  </Grid>
                </>
              )}
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: { xs: 2, sm: 3 }, py: { xs: 1.5, sm: 2 } }}>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={handleAchievementSubmit} variant="contained" color="primary">
            {editingAchievement ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Profile Component */}
      <EditProfile 
        open={openProfileDialog}
        onClose={handleCloseProfileDialog}
        profileData={profileData}
        auth={auth}
        isProfileSetup={isProfileSetup}
        onProfileUpdate={handleProfileUpdate}
      />

      {/* Error Dialog */}
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
        <DialogActions sx={{ 
          p: 2, 
          pt: 1,
          display: 'flex',
          justifyContent: 'center' 
        }}>
            <Button 
            onClick={() => setErrorDialog({ open: false, title: '', message: '' })} 
            color="primary" 
              variant="contained" 
              fullWidth
              sx={{ borderRadius: 2, py: 1 }}
            >
            OK
            </Button>
          </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmation.open}
        onClose={() => setDeleteConfirmation({ open: false, achievementId: null })}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          elevation: 24,
          sx: {
            borderRadius: 2,
            position: 'relative',
            overflow: 'hidden'
          }
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <DeleteIcon color="error" />
            <Typography variant="h6">Confirm Deletion</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            This action cannot be undone.
          </Alert>
          <DialogContentText>
            Are you sure you want to delete this portfolio item?
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 1, display: 'flex', gap: 1 }}>
          <Button 
            onClick={() => setDeleteConfirmation({ open: false, achievementId: null })}
            color="inherit"
            fullWidth
            sx={{ borderRadius: 2 }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteConfirmed}
            color="error"
            variant="contained"
            startIcon={<DeleteIcon />}
            fullWidth
            sx={{ borderRadius: 2 }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Profile;