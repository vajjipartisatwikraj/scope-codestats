import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import {
  Box, Container, Grid, Typography, Button, Card, CardContent,
  IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Chip, Stack, MenuItem, useMediaQuery, DialogContentText,
  CircularProgress, Divider
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

// Achievement types
const achievementTypes = [
  { value: 'achievement', label: 'Achievements' },
  { value: 'project', label: 'Projects' },
  { value: 'internship', label: 'Internships' },
  { value: 'certification', label: 'Certifications' },
  { value: 'hackathon', label: 'Hackathons' },
  { value: 'event', label: 'Events' }
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
      {/* Hero Section */}
      <Box
        sx={{
          position: 'relative',
          mb: 6,
          borderRadius: '24px',
          overflow: 'visible',
          bgcolor: 'rgba(255,255,255,0.03)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        {/* Cover Image/Gradient */}
        <Box
          sx={{
            height: '200px',
            background: 'linear-gradient(45deg, #0088cc 30%, #00bfff 90%)',
            opacity: 0.8,
            borderRadius: '24px 24px 0 0',
          }}
        />

        {/* Profile Info Section */}
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
            flexDirection: 'column',
            alignItems: { xs: 'center', md: 'flex-start' },
            gap: 1,
            mb: 3,
            zIndex: 1,
          }}>
            <Typography 
              variant="h2"
              sx={{ 
                fontWeight: 800, 
                color: '#fff',
                textTransform: 'uppercase',
                textShadow: '0 2px 8px rgba(0,0,0,0.4)',
                letterSpacing: '0.5px',
                mb: 1,
                fontSize: { xs: '1.5rem', md: '2rem' }
              }}
            >
              {profileData.name}
            </Typography>
            <Typography 
              variant="h3"
              sx={{ 
                color: 'rgba(255,255,255,0.9)', 
                mb: 3,
                mt: -1,
                textShadow: '0 2px 6px rgba(0,0,0,0.3)',
                fontWeight: 600,
                opacity: 0.95,
                fontSize: { xs: '1.8rem', md: '2.2rem' },
                letterSpacing: '0.5px'
              }}
            >
              {profileData.department} • {profileData.section}
            </Typography>
            <Button
              variant="contained"
              startIcon={<EditIcon />}
              onClick={handleEditProfileClick}
              sx={{
                bgcolor: '#0088cc',
                '&:hover': { bgcolor: '#006699' },
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              }}
            >
              Edit Profile
            </Button>
          </Box>

          {/* Quick Info Grid */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1,
                color: 'rgba(255,255,255,0.7)'
              }}>
                <Badge sx={{ color: '#0088cc' }} />
                <Typography>Roll: {profileData.rollNumber}</Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1,
                color: 'rgba(255,255,255,0.7)'
              }}>
                <School sx={{ color: '#0088cc' }} />
                <Typography>Batch of {profileData.graduationYear}</Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1,
                color: 'rgba(255,255,255,0.7)'
              }}>
                <Email sx={{ color: '#0088cc' }} />
                <Typography>{profileData.email}</Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1,
                color: 'rgba(255,255,255,0.7)'
              }}>
                <Phone sx={{ color: '#0088cc' }} />
                <Typography>{profileData.phone}</Typography>
              </Box>
            </Grid>
          </Grid>

          {/* About Section */}
          {profileData.about && (
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                About
              </Typography>
              <Typography sx={{ 
                color: 'rgba(255,255,255,0.7)',
                lineHeight: 1.7,
                whiteSpace: 'pre-wrap'
              }}>
                {profileData.about}
              </Typography>
            </Box>
          )}

          {/* Skills & Interests */}
          <Grid container spacing={4} sx={{ mb: 4 }}>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                Skills
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {profileData.skills && profileData.skills.map((skill, index) => (
                  <Chip
                    key={index}
                    label={skill}
                    sx={{
                      bgcolor: 'rgba(0,136,204,0.1)',
                      color: '#0088cc',
                      border: '1px solid rgba(0,136,204,0.2)',
                      '&:hover': { bgcolor: 'rgba(0,136,204,0.2)' }
                    }}
                  />
                ))}
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                Interests
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {profileData.interests && profileData.interests.map((interest, index) => (
                  <Chip
                    key={index}
                    label={interest}
                    sx={{
                      bgcolor: 'rgba(255,255,255,0.05)',
                      color: 'rgba(255,255,255,0.7)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' }
                    }}
                  />
                ))}
              </Box>
            </Grid>
          </Grid>

          {/* Social Links */}
          <Box sx={{ display: 'flex', gap: 2 }}>
            {profileData.githubUrl && (
              <IconButton 
                href={profileData.githubUrl} 
                target="_blank"
                sx={{ 
                  color: 'rgba(255,255,255,0.7)',
                  '&:hover': { color: '#0088cc' }
                }}
              >
                <GitHub />
              </IconButton>
            )}
            {profileData.linkedinUrl && (
              <IconButton 
                href={profileData.linkedinUrl} 
                target="_blank"
                sx={{ 
                  color: 'rgba(255,255,255,0.7)',
                  '&:hover': { color: '#0088cc' }
                }}
              >
                <LinkedIn />
              </IconButton>
            )}
          </Box>
        </Box>
      </Box>

      {/* Achievements Section */}
      <Box>
        <Box sx={{ 
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 4
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
              bgcolor: '#0088cc',
              '&:hover': { bgcolor: '#006699' }
            }}
          >
            Add {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
          </Button>
        </Box>

        {/* Achievement Tabs */}
        <Box sx={{ 
          bgcolor: 'rgba(255,255,255,0.03)',
          borderRadius: '16px',
          p: 2,
          mb: 3
        }}>
          <Stack 
            direction="row" 
            spacing={2}
            sx={{
              overflowX: 'auto',
              pb: 1,
              '&::-webkit-scrollbar': {
                height: '6px',
              },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: 'rgba(255,255,255,0.1)',
                borderRadius: '3px',
              }
            }}
          >
            {achievementTypes.map((type) => (
              <Chip
                key={type.value}
                label={type.label}
                onClick={() => handleTabClick(type.value)}
                sx={{
                  bgcolor: activeTab === type.value ? '#0088cc' : 'rgba(255,255,255,0.05)',
                  color: activeTab === type.value ? 'white' : 'rgba(255,255,255,0.7)',
                  '&:hover': {
                    bgcolor: activeTab === type.value ? '#006699' : 'rgba(255,255,255,0.1)',
                  }
                }}
              />
            ))}
          </Stack>
        </Box>

        {/* Achievements Grid with Empty State */}
        {filteredAchievements.length > 0 ? (
          <Grid container spacing={3}>
            {filteredAchievements.map((achievement) => (
              <Grid item xs={12} sm={6} md={4} key={achievement._id}>
                <Card sx={{ 
                  bgcolor: 'rgba(255,255,255,0.03)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255,255,255,0.05)',
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
                    height: '180px',
                    overflow: 'hidden',
                    bgcolor: 'rgba(0,0,0,0.2)'
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
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Typography variant="h6" sx={{ mb: 2 }}>
                      {achievement.title}
                    </Typography>
                    <Typography variant="body2" sx={{ 
                      color: 'rgba(255,255,255,0.7)',
                      mb: 2 
                    }}>
                      {achievement.description}
                    </Typography>
                    <Stack direction="row" flexWrap="wrap" spacing={1} sx={{ mb: 2 }}>
                      {(Array.isArray(achievement.tags) ? achievement.tags : 
                        achievement.tags?.split(',') || []).map((tag, index) => (
                        <Chip
                          key={index}
                          label={typeof tag === 'string' ? tag.trim() : tag}
                          size="small"
                          sx={{
                            bgcolor: 'rgba(0,136,204,0.1)',
                            color: '#0088cc',
                          }}
                        />
                      ))}
                    </Stack>
                    <Box sx={{ 
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                        {achievement.startDate}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        {achievement.link && (
                          <IconButton
                            size="small"
                            onClick={() => window.open(achievement.link, '_blank')}
                            sx={{ color: 'rgba(255,255,255,0.7)' }}
                          >
                            <OpenInNew fontSize="small" />
                          </IconButton>
                        )}
                        <IconButton
                          size="small"
                          onClick={() => handleEditAchievement(achievement)}
                          sx={{ color: 'rgba(255,255,255,0.7)' }}
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
              py: 8,
              bgcolor: 'rgba(255,255,255,0.03)',
              borderRadius: '16px',
            }}
          >
            <Typography variant="h6" sx={{ color: 'rgba(255,255,255,0.5)', mb: 2 }}>
              No {activeTab}s added yet
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                resetAchievementForm();
                setOpenDialog(true);
              }}
              sx={{ 
                bgcolor: '#0088cc',
                '&:hover': { bgcolor: '#006699' }
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
                  error={achievementForm.imageUrl && !/^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/.test(achievementForm.imageUrl)}
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
      >
        <DialogTitle id="error-dialog-title">{errorDialog.title}</DialogTitle>
        <DialogContent>
          <DialogContentText id="error-dialog-description">
            {errorDialog.message}
          </DialogContentText>
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