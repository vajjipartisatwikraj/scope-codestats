import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import {
  Box, Container, Grid, Typography, Button, Card, CardContent,
  IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Chip, Stack, MenuItem, useMediaQuery, DialogContentText,
  CircularProgress, Divider, Avatar
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  Add as AddIcon, Edit as EditIcon, GitHub, LinkedIn, Email, Phone, School,
  Badge, OpenInNew, Delete as DeleteIcon, Close as CloseIcon
} from '@mui/icons-material';
import { apiUrl } from '../config/apiConfig';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';
import EditProfile from './EditProfile';
import { alpha } from '@mui/material/styles';
import { getProfileImageUrl } from '../utils/profileUtils';

// Achievement types
const achievementTypes = [
  { value: 'achievement', label: 'Achievements' },
  { value: 'project', label: 'Projects' },
  { value: 'internship', label: 'Internships' },
  { value: 'certification', label: 'Certifications' }
];

const Profile = () => {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  
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
    githubUrl: '',
    skills: [],
    interests: [],
    about: '',
  });
  const [achievements, setAchievements] = useState([]);
  const [codingProfiles, setCodingProfiles] = useState([]);

  // Dialog states
  const [openDialog, setOpenDialog] = useState(false);
  const [openProfileDialog, setOpenProfileDialog] = useState(false);
  const [openConfirmDialog, setOpenConfirmDialog] = useState(false);
  const [errorDialog, setErrorDialog] = useState({ open: false, title: '', message: '' });
  
  // Achievement form state
  const [achievementForm, setAchievementForm] = useState({
    type: 'achievement',
    title: '',
    description: '',
    tags: '',
    link: '',
    imageUrl: '',
    startDate: '',
    endDate: ''
  });
  const [editingAchievement, setEditingAchievement] = useState(null);

  // Filter achievements based on active tab
  const filteredAchievements = achievements.filter(
    achievement => achievement.type === activeTab
  );

  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

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
        console.error('Error loading profile data:', err);
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
      console.error('Error fetching profile:', error);
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
      console.error('Error fetching achievements:', error);
    }
  };

  // Tab click handler
  const handleTabClick = (tab) => {
    setActiveTab(tab);
  };

  // Edit profile - open dialog
  const handleEditProfileClick = () => {
    setOpenProfileDialog(true);
  };

  // Handle profile dialog close
  const handleCloseProfileDialog = () => {
    setOpenProfileDialog(false);
  };

  // Handle profile update from EditProfile component
  const handleProfileUpdate = (updatedProfileData) => {
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
      tags: '',
      link: '',
      imageUrl: '',
      startDate: '',
      endDate: ''
    });
    setEditingAchievement(null);
  };

  // Handle edit achievement button click
  const handleEditAchievement = (achievement) => {
    setEditingAchievement(achievement);
    
    // Convert array tags to comma-separated string if needed
    const tags = Array.isArray(achievement.tags) 
      ? achievement.tags.join(', ') 
      : achievement.tags || '';
    
    setAchievementForm({
      ...achievement,
      tags: tags
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
      
    try {
      // Format tags from comma-separated string to array if needed
      const formattedTags = typeof achievementForm.tags === 'string'
        ? achievementForm.tags.split(',').map(tag => tag.trim()).filter(tag => tag !== '')
        : achievementForm.tags;
      
      const achievementData = {
        ...achievementForm,
        tags: formattedTags
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
      console.error('Error saving achievement:', error);
      setErrorDialog({
        open: true,
        title: 'Error',
        message: error.response?.data?.message || 'Failed to save achievement. Please try again.'
      });
    }
  };

  // Format image URL (add default if empty)
  const formatImageUrl = (url) => {
    if (!url || url.trim() === '') {
      return 'https://via.placeholder.com/300x200?text=No+Image';
    }
    return url;
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
          bgcolor: theme.palette.background.paper,
          backdropFilter: 'blur(10px)',
          border: `1px solid ${theme.palette.divider}`,
          boxShadow: theme.shadows[4],
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
                  color: theme.palette.common.white,
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
                  color: theme.palette.common.white,
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
                  bgcolor: theme.palette.primary.main,
                  '&:hover': { bgcolor: theme.palette.primary.dark },
                  boxShadow: theme.shadows[4],
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
            bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.01)',
            p: 3, 
            borderRadius: '16px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            border: `1px solid ${theme.palette.divider}`
          }}>
            <Grid item xs={12} sm={6} md={3} sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Box sx={{ minWidth: 44, mr: 2, display: 'flex', justifyContent: 'center' }}>
                  <Badge sx={{ color: theme.palette.primary.main, fontSize: 28 }} />
                </Box>
                <Box>
                  <Typography variant="body2" sx={{ color: theme.palette.text.secondary, fontWeight: 500, mb: 0.5 }}>
                  Roll Number
                </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
                  {profileData.rollNumber}
                </Typography>
                </Box>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3} sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Box sx={{ minWidth: 44, mr: 2, display: 'flex', justifyContent: 'center' }}>
                  <School sx={{ color: theme.palette.primary.main, fontSize: 28 }} />
                </Box>
                <Box>
                  <Typography variant="body2" sx={{ color: theme.palette.text.secondary, fontWeight: 500, mb: 0.5 }}>
                  Department
                </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
                  {profileData.department}
                </Typography>
                </Box>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3} sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Box sx={{ minWidth: 44, mr: 2, display: 'flex', justifyContent: 'center' }}>
                  <Email sx={{ color: theme.palette.primary.main, fontSize: 28 }} />
                </Box>
                <Box>
                  <Typography variant="body2" sx={{ color: theme.palette.text.secondary, fontWeight: 500, mb: 0.5 }}>
                  Email
                </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
                  {auth?.user?.email}
                </Typography>
                </Box>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3} sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Box sx={{ minWidth: 44, mr: 2, display: 'flex', justifyContent: 'center' }}>
                  <Phone sx={{ color: theme.palette.primary.main, fontSize: 28 }} />
                </Box>
                <Box>
                  <Typography variant="body2" sx={{ color: theme.palette.text.secondary, fontWeight: 500, mb: 0.5 }}>
                  Phone
                </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
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
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            border: `1px solid ${theme.palette.divider}`,
            bgcolor: theme.palette.background.paper,
            mb: 3
          }}>
            <Typography variant="h6" sx={{ mb: 2, color: theme.palette.text.primary }}>About</Typography>
            <Typography 
              variant="body1" 
              sx={{ 
                color: theme.palette.text.primary,
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
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  border: `1px solid ${theme.palette.divider}`,
                  bgcolor: theme.palette.background.paper
                }}>
                  <Typography variant="h6" sx={{ mb: 2, color: theme.palette.text.primary }}>Skills</Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {profileData.skills.map((skill, index) => (
                      <Chip 
                        key={index} 
                        label={skill} 
                        sx={{
                          bgcolor: alpha(theme.palette.primary.main, 0.1),
                          color: theme.palette.primary.main,
                          border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                          '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.2) }
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
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  border: `1px solid ${theme.palette.divider}`,
                  bgcolor: theme.palette.background.paper
                }}>
                  <Typography variant="h6" sx={{ mb: 2, color: theme.palette.text.primary }}>Interests</Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {profileData.interests.map((interest, index) => (
                      <Chip 
                        key={index} 
                        label={interest} 
                        sx={{
                          bgcolor: alpha(theme.palette.primary.main, 0.1),
                          color: theme.palette.primary.main,
                          border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                          '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.2) }
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
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              border: `1px solid ${theme.palette.divider}`,
              bgcolor: theme.palette.background.paper,
              textAlign: 'center'
            }}>
              <Typography variant="body1" sx={{ color: theme.palette.text.secondary, fontStyle: 'italic' }}>
                No skills or interests added yet. Edit your profile to add some!
              </Typography>
            </Box>
          )}

          {/* Social Links with improved styling */}
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center',
            p: 3,
            borderRadius: '16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            border: `1px solid ${theme.palette.divider}`,
            bgcolor: theme.palette.background.paper,
            mb: 3
          }}>
            <Typography variant="h6" sx={{ color: theme.palette.text.primary, mr: 2 }}>
              Social Links
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, ml: 2 }}>
              {profileData.githubUrl && (
                <IconButton 
                  href={profileData.githubUrl} 
                  target="_blank"
                  size="large"
                  sx={{ 
                    color: '#24292e', // GitHub's color
                    bgcolor: 'rgba(36, 41, 46, 0.1)',
                    '&:hover': { 
                      color: '#24292e',
                      bgcolor: 'rgba(36, 41, 46, 0.2)'
                    },
                    p: 2,
                    width: 56,
                    height: 56
                  }}
                >
                  <GitHub sx={{ fontSize: 28 }} />
                </IconButton>
              )}
              {profileData.linkedinUrl && (
                <IconButton 
                  href={profileData.linkedinUrl} 
                  target="_blank"
                  size="large"
                  sx={{ 
                    color: '#0077b5', // LinkedIn's color
                    bgcolor: 'rgba(0,119,181,0.1)',
                    '&:hover': { 
                      color: '#0077b5',
                      bgcolor: 'rgba(0,119,181,0.2)'
                    },
                    p: 2,
                    width: 56,
                    height: 56
                  }}
                >
                  <LinkedIn sx={{ fontSize: 28 }} />
                </IconButton>
              )}
              {!profileData.githubUrl && !profileData.linkedinUrl && (
                <Typography variant="body2" sx={{ color: theme.palette.text.secondary, fontStyle: 'italic' }}>
                  No social links added yet
                </Typography>
              )}
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Achievements Section with improved styling */}
      <Box sx={{ 
        p: { xs: 2, sm: 3 },
        borderRadius: '16px',
        boxShadow: theme.shadows[2],
        border: `1px solid ${theme.palette.divider}`,
        bgcolor: theme.palette.background.paper,
        mb: 4,
        width: '100%',
        overflow: 'hidden'
      }}>
        <Box sx={{ 
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', sm: 'center' },
          gap: { xs: 2, sm: 0 },
          mb: { xs: 3, sm: 4 }
        }}>
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            Achievements
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              resetAchievementForm();
              setOpenDialog(true);
            }}
            sx={{ 
              bgcolor: theme.palette.primary.main,
              '&:hover': { bgcolor: theme.palette.primary.dark },
              width: { xs: '100%', sm: 'auto' }
            }}
          >
            Add {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
          </Button>
        </Box>

        {/* Achievement Tabs */}
        <Box sx={{ 
          bgcolor: theme.palette.action.hover,
          borderRadius: '16px',
          p: { xs: 1, sm: 2 },
          mb: 3
        }}>
          <Stack 
            direction="row" 
            spacing={1}
            sx={{
              overflowX: 'auto',
              pb: 1,
              '&::-webkit-scrollbar': {
                height: '6px',
              },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: theme.palette.divider,
                borderRadius: '3px',
              },
              flexWrap: { xs: 'nowrap', sm: 'wrap' }
            }}
          >
            {achievementTypes.map((type) => (
              <Chip
                key={type.value}
                label={type.label}
                onClick={() => handleTabClick(type.value)}
                sx={{
                  bgcolor: activeTab === type.value ? theme.palette.primary.main : theme.palette.action.selected,
                  color: activeTab === type.value ? theme.palette.primary.contrastText : theme.palette.text.secondary,
                  '&:hover': {
                    bgcolor: activeTab === type.value ? theme.palette.primary.dark : theme.palette.action.hover,
                  },
                  fontSize: { xs: '0.75rem', sm: '0.875rem' },
                  height: { xs: '28px', sm: '32px' },
                  flexShrink: 0
                }}
              />
            ))}
          </Stack>
        </Box>

        {/* Achievements Grid with Empty State */}
        {filteredAchievements.length > 0 ? (
          <Grid container spacing={2}>
            {filteredAchievements.map((achievement) => (
              <Grid item xs={12} sm={6} md={4} key={achievement._id}>
                <Card sx={{ 
                  bgcolor: theme.palette.background.paper,
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: '16px',
                  transition: 'transform 0.2s',
                  overflow: 'hidden',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  '&:hover': {
                    transform: 'translateY(-4px)'
                  }
                }}>
                  {/* Image Section */}
                  <Box sx={{ 
                    position: 'relative',
                    width: '100%',
                    height: { xs: '150px', sm: '180px' },
                    overflow: 'hidden',
                    bgcolor: theme.palette.action.disabledBackground
                  }}>
                    <Box 
                      component="img"
                      src={formatImageUrl(achievement.imageUrl)}
                      alt={achievement.title}
                      sx={{ 
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        display: 'block',
                      }}
                      onError={(e) => {
                        e.target.onerror = null; 
                        e.target.src = "https://via.placeholder.com/150";
                      }}
                    />
                  </Box>
                  <CardContent sx={{ 
                    flexGrow: 1,
                    p: { xs: 1.5, sm: 2 }
                  }}>
                    <Typography variant="h6" sx={{ 
                      mb: 1,
                      fontSize: { xs: '1rem', sm: '1.25rem' }
                    }}>
                      {achievement.title}
                    </Typography>
                    <Typography variant="body2" sx={{ 
                      color: theme.palette.text.secondary,
                      mb: 1.5, 
                      fontSize: { xs: '0.75rem', sm: '0.875rem' }
                    }}>
                      {achievement.description}
                    </Typography>
                    <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ mb: 1.5 }}>
                      {(Array.isArray(achievement.tags) ? achievement.tags : 
                        achievement.tags?.split(',') || []).map((tag, index) => (
                        <Chip
                          key={index}
                          label={typeof tag === 'string' ? tag.trim() : tag}
                          size="small"
                          sx={{
                            bgcolor: alpha(theme.palette.primary.main, 0.1),
                            color: theme.palette.primary.main,
                            height: { xs: '20px', sm: '24px' },
                            fontSize: { xs: '0.65rem', sm: '0.75rem' }
                          }}
                        />
                      ))}
                    </Stack>
                    <Box sx={{ 
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <Typography variant="caption" sx={{ 
                        color: theme.palette.text.disabled,
                        fontSize: { xs: '0.65rem', sm: '0.75rem' }
                      }}>
                        {achievement.startDate}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        {achievement.link && (
                          <IconButton
                            size="small"
                            onClick={() => window.open(achievement.link, '_blank')}
                            sx={{ color: theme.palette.text.secondary }}
                          >
                            <OpenInNew fontSize="small" />
                          </IconButton>
                        )}
                        <IconButton
                          size="small"
                          onClick={() => handleEditAchievement(achievement)}
                          sx={{ color: theme.palette.text.secondary }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        ) : (
          <Box 
            sx={{ 
              textAlign: 'center', 
              py: { xs: 5, sm: 8 },
              px: { xs: 2, sm: 3 },
              bgcolor: theme.palette.action.hover,
              borderRadius: '16px',
            }}
          >
            <Typography variant="h6" sx={{ 
              color: theme.palette.text.disabled, 
              mb: 2,
              fontSize: { xs: '0.95rem', sm: '1.25rem' }
            }}>
              No {activeTab === 'achievement' ? 'achievements' : activeTab + 's'} added yet
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                resetAchievementForm();
                setOpenDialog(true);
              }}
              sx={{ 
                bgcolor: theme.palette.primary.main,
                '&:hover': { bgcolor: theme.palette.primary.dark },
                width: { xs: '100%', sm: 'auto' },
                fontSize: { xs: '0.8rem', sm: '0.875rem' }
              }}
            >
              Add Your First {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
            </Button>
          </Box>
        )}
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
          {editingAchievement ? 'Edit Achievement' : 'Add Achievement'}
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
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Tags (comma-separated)"
                  value={achievementForm.tags}
                  onChange={(e) => setAchievementForm({ ...achievementForm, tags: e.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Link"
                  value={achievementForm.link}
                  onChange={(e) => setAchievementForm({ ...achievementForm, link: e.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Image URL"
                  value={achievementForm.imageUrl}
                  onChange={(e) => {
                    // Basic URL validation
                    const url = e.target.value.trim();
                    // Allow empty value or a valid URL
                    setAchievementForm({ 
                      ...achievementForm, 
                      imageUrl: url 
                    });
                  }}
                  error={!!(achievementForm.imageUrl && !/^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/.test(achievementForm.imageUrl))}
                  helperText={
                    achievementForm.imageUrl && 
                    !/^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/.test(achievementForm.imageUrl) ?
                    "Please enter a valid URL" : 
                    "Enter an image URL (e.g., https://example.com/image.jpg)"
                  }
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
            {editingAchievement ? 'Update' : 'Add'}
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
    </Container>
  );
};

export default Profile;