import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Grid,
  Paper,
  Typography,
  TextField,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  Chip,
  Card,
  CardContent,
  CardActions,
  CircularProgress,
  useTheme,
  useMediaQuery,
  Avatar,
  Divider,
  Stack,
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, OpenInNew, GitHub, LinkedIn, Email, Phone, School, Class, Badge, CalendarToday } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';

const achievementTypes = [
  { value: 'internship', label: 'Internship' },
  { value: 'achievement', label: 'Achievement' },
  { value: 'project', label: 'Project' },
  { value: 'certification', label: 'Certification' },
];

const Profile = () => {
  const auth = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('project');
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phone: '',
    department: '',
    section: '',
    rollNumber: '',
    graduationYear: '',
    skills: [],
    interests: [],
    about: '',
    linkedinUrl: '',
    imageUrl: '',
    githubUrl: '',
  });

  const [achievements, setAchievements] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingAchievement, setEditingAchievement] = useState(null);
  const [achievementForm, setAchievementForm] = useState({
    type: '',
    title: '',
    description: '',
    tags: '',
    link: '',
    imageUrl: '',
    startDate: '',
    endDate: ''
  });

  const [openProfileDialog, setOpenProfileDialog] = useState(false);
  const [editProfileData, setEditProfileData] = useState({
    name: '',
    phone: '',
    department: '',
    section: '',
    rollNumber: '',
    graduationYear: '',
    skills: [],
    interests: [],
    about: '',
    linkedinUrl: '',
    githubUrl: '',
    imageUrl: '',
  });
  const [codingProfiles, setCodingProfiles] = useState({
    leetcode: { username: '', rating: 0 },
    codechef: { username: '', rating: 0 },
    hackerrank: { username: '', rating: 0 },
    codeforces: { username: '', rating: 0 }
  });

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));

  // Filter achievements based on active tab
  const filteredAchievements = achievements.filter(
    achievement => achievement.type === activeTab
  );

  // Tab click handler
  const handleTabClick = (tab) => {
    setActiveTab(tab);
  };

  useEffect(() => {
    const loadProfileData = async () => {
      if (!auth?.token) {
        navigate('/login');
        return;
      }
      
      setLoading(true);
      setError(null);
      
      try {
        // Fetch profile data and achievements separately to handle potential endpoint issues
        let profileData = null;
        let achievementsData = [];
        let codingProfilesData = {
          leetcode: { username: '', rating: 0 },
          codechef: { username: '', rating: 0 },
          hackerrank: { username: '', rating: 0 },
          codeforces: { username: '', rating: 0 },
          github: { username: '' }
        };
        
        // Fetch profile data
        try {
          const profileResponse = await axios.get('http://localhost:5000/api/profiles/me', {
            headers: { Authorization: `Bearer ${auth.token}` }
          });
          profileData = profileResponse.data;
        } catch (profileErr) {
          console.error('Error fetching profile:', profileErr);
          if (profileErr.response?.status !== 404) {
            throw profileErr; // Re-throw if it's not a 404 error
          }
        }
        
        // Fetch achievements
        try {
          const achievementsResponse = await axios.get('http://localhost:5000/api/achievements', {
            headers: { Authorization: `Bearer ${auth.token}` }
          });
          achievementsData = achievementsResponse.data;
        } catch (achievementsErr) {
          console.error('Error fetching achievements:', achievementsErr);
          if (achievementsErr.response?.status !== 404) {
            throw achievementsErr; // Re-throw if it's not a 404 error
          }
        }
        
        // Fetch coding profiles - handle 404 gracefully
        try {
          const codingProfilesResponse = await axios.get('http://localhost:5000/api/profiles/coding-profiles', {
            headers: { Authorization: `Bearer ${auth.token}` }
          });
          
          // Process coding profiles to ensure both score and rating properties
          const processedProfiles = {};
          Object.entries(codingProfilesResponse.data).forEach(([platform, data]) => {
            processedProfiles[platform] = {
              ...data,
              score: data.score || data.rating || 0,
              rating: data.rating || data.score || 0
            };
          });
          
          codingProfilesData = processedProfiles;
        } catch (codingProfilesErr) {
          console.error('Error fetching coding profiles:', codingProfilesErr);
          // Don't throw error for coding profiles - use default empty values
          // This endpoint might not exist yet
          codingProfilesData = {
            leetcode: { username: '', rating: 0, score: 0 },
            codechef: { username: '', rating: 0, score: 0 },
            hackerrank: { username: '', rating: 0, score: 0 },
            codeforces: { username: '', rating: 0, score: 0 },
            geeksforgeeks: { username: '', rating: 0, score: 0 },
            github: { username: '' }
          };
        }
        
        // Update state with fetched data
        if (profileData) setProfileData(profileData);
        setAchievements(achievementsData);
        setCodingProfiles(codingProfilesData);
        
      } catch (err) {
        console.error('Error loading profile data:', err);
        setError('Failed to load profile data. Please try again later.');
        toast.error('Failed to load profile data');
      } finally {
        setLoading(false);
      }
    };
    
    loadProfileData();
  }, [auth?.token, navigate]);

  // Keep these functions for individual updates
  const fetchProfileData = async () => {
    if (!auth?.token) return;
    
    try {
      const response = await axios.get('http://localhost:5000/api/profiles/me', {
        headers: { Authorization: `Bearer ${auth.token}` }
      });
      setProfileData(response.data);
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('Failed to load profile data');
    }
  };

  const fetchAchievements = async () => {
    if (!auth?.token) return;
    
    try {
      const response = await axios.get('http://localhost:5000/api/achievements', {
        headers: { Authorization: `Bearer ${auth.token}` }
      });
      setAchievements(response.data);
    } catch (error) {
      console.error('Error fetching achievements:', error);
      toast.error('Failed to load achievements');
    }
  };

  const fetchCodingProfiles = async () => {
    if (!auth?.token) return;
    
    try {
      const response = await axios.get('http://localhost:5000/api/profiles/coding-profiles', {
        headers: { Authorization: `Bearer ${auth.token}` }
      });
      
      // Ensure each profile has both score and rating properties
      const processedProfiles = {};
      Object.entries(response.data).forEach(([platform, data]) => {
        processedProfiles[platform] = {
          ...data,
          score: data.score || data.rating || 0,
          rating: data.rating || data.score || 0
        };
      });
      
      setCodingProfiles(processedProfiles);
    } catch (error) {
      console.error('Error fetching coding profiles:', error);
      // Only show toast for errors other than 404
      if (error.response?.status !== 404) {
        toast.error('Failed to load coding profiles');
      } else {
        // Set default empty values for coding profiles if endpoint doesn't exist
        setCodingProfiles({
          leetcode: { username: '', rating: 0, score: 0 },
          codechef: { username: '', rating: 0, score: 0 },
          hackerrank: { username: '', rating: 0, score: 0 },
          codeforces: { username: '', rating: 0, score: 0 },
          geeksforgeeks: { username: '', rating: 0, score: 0 },
          github: { username: '' }
        });
      }
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    if (!auth?.token) return;
    
    try {
      await axios.put(
        'http://localhost:5000/api/profiles/me',
        profileData,
        { headers: { Authorization: `Bearer ${auth.token}` } }
      );
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    }
  };

  const handleAchievementSubmit = async (e) => {
    e.preventDefault();
    if (!auth?.token) return;
    
    try {
      const formData = {
        ...achievementForm,
        tags: achievementForm.tags.split(',').map(tag => tag.trim()).filter(tag => tag)
      };

      // Only include dates if the type is internship
      if (formData.type !== 'internship') {
        delete formData.startDate;
        delete formData.endDate;
      } else if (!formData.startDate || !formData.endDate) {
        toast.error('Start date and end date are required for internships');
        return;
      }

      if (editingAchievement) {
        await axios.put(
          `http://localhost:5000/api/achievements/${editingAchievement._id}`,
          formData,
          { headers: { Authorization: `Bearer ${auth.token}` } }
        );
        toast.success('Achievement updated successfully');
      } else {
        await axios.post(
          'http://localhost:5000/api/achievements',
          formData,
          { headers: { Authorization: `Bearer ${auth.token}` } }
        );
        toast.success('Achievement added successfully');
      }

      setOpenDialog(false);
      setEditingAchievement(null);
      resetAchievementForm();
      fetchAchievements();
    } catch (error) {
      console.error('Error saving achievement:', error);
      toast.error('Failed to save achievement');
    }
  };

  const handleDeleteAchievement = async (id) => {
    if (!id || !auth?.token) {
      toast.error('Invalid achievement ID');
      return;
    }

    try {
      const confirmResult = window.confirm('Are you sure you want to delete this achievement?');
      if (!confirmResult) {
        return;
      }

      const response = await axios.delete(
        `http://localhost:5000/api/achievements/${id}`,
        {
          headers: { 
            Authorization: `Bearer ${auth.token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.status === 200) {
        toast.success('Achievement deleted successfully');
        // Update the local state to remove the deleted achievement
        setAchievements(prevAchievements => 
          prevAchievements.filter(achievement => achievement._id !== id)
        );
      } else {
        throw new Error('Failed to delete achievement');
      }
    } catch (error) {
      console.error('Error deleting achievement:', error);
      const errorMessage = error.response?.data?.message || 'Failed to delete achievement';
      toast.error(errorMessage);
      
      // If the error is 404 (not found), remove it from local state anyway
      if (error.response?.status === 404) {
        setAchievements(prevAchievements => 
          prevAchievements.filter(achievement => achievement._id !== id)
        );
      }
    }
  };

  const handleEditAchievement = (achievement) => {
    setEditingAchievement(achievement);
    setAchievementForm({
      type: achievement.type,
      title: achievement.title,
      description: achievement.description,
      tags: achievement.tags.join(', '),
      link: achievement.link || '',
      imageUrl: achievement.imageUrl || '',
      startDate: achievement.startDate ? achievement.startDate.split('T')[0] : '',
      endDate: achievement.endDate ? achievement.endDate.split('T')[0] : ''
    });
    setOpenDialog(true);
  };

  const resetAchievementForm = () => {
    setAchievementForm({
      type: '',
      title: '',
      description: '',
      tags: '',
      link: '',
      imageUrl: '',
      startDate: '',
      endDate: ''
    });
  };

  const ScoreGauge = ({ platform, score = 0, data, maxScore = 3000 }) => {
    // Handle both direct score prop and data.score structure
    let scoreValue = score;
    
    // If data object is provided (like in UserView), use data.score or data.rating
    if (data && typeof data === 'object') {
      scoreValue = data.score || data.rating || 0;
    }
    
    // Ensure score is a valid number
    const validScore = typeof scoreValue === 'number' && !isNaN(scoreValue) ? scoreValue : 0;
    // Ensure score is within bounds (0 to maxScore)
    const boundedScore = Math.max(0, Math.min(validScore, maxScore));
    // Calculate percentage safely
    const percentage = maxScore > 0 ? (boundedScore / maxScore) * 100 : 0;
    
    // Build tooltip content
    const getTooltipContent = () => {
      let content = `Score: ${boundedScore}`;
      
      if (data && typeof data === 'object') {
        if (typeof platform === 'string' && platform.toLowerCase() === 'codechef' && data.contestsParticipated) {
          content += `\nContests Participated: ${data.contestsParticipated}`;
        }
        
        if (data.problemsSolved) {
          content += `\nProblems Solved: ${data.problemsSolved}`;
        }
        
        if (data.rating && data.rating !== boundedScore) {
          content += `\nRating: ${data.rating}`;
        }
      }
      
      return content;
    };
    
    return (
      <Box sx={{ 
        position: 'relative', 
        width: '100%', 
        height: 120, 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center' 
      }}
      title={getTooltipContent()}
      >
        <CircularProgress
          variant="determinate"
          value={percentage}
          size={80}
          thickness={4}
          sx={{
            color: '#0088cc',
            '& .MuiCircularProgress-circle': {
              strokeLinecap: 'round',
            },
          }}
        />
        <Box sx={{
          position: 'absolute',
          top: 30,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'white' }}>
            {boundedScore}
          </Typography>
        </Box>
        <Typography variant="body2" sx={{ mt: 1, color: 'rgba(255, 255, 255, 0.7)' }}>
          {platform}
        </Typography>
      </Box>
    );
  };

  const handleEditProfileClick = () => {
    setEditProfileData({
      name: profileData.name,
      phone: profileData.phone,
      department: profileData.department,
      section: profileData.section,
      rollNumber: profileData.rollNumber,
      graduationYear: profileData.graduationYear,
      skills: profileData.skills,
      interests: profileData.interests,
      about: profileData.about,
      linkedinUrl: profileData.linkedinUrl,
      githubUrl: profileData.githubUrl,
      imageUrl: profileData.imageUrl,
    });
    setOpenProfileDialog(true);
  };

  const handleProfileDialogSubmit = async (e) => {
    e.preventDefault();
    if (!auth?.token) return;
    
    try {
      await axios.put(
        'http://localhost:5000/api/profiles/me',
        editProfileData,
        { headers: { Authorization: `Bearer ${auth.token}` } }
      );
      setProfileData(editProfileData);
      setOpenProfileDialog(false);
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    }
  };

  if (loading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center',
        minHeight: '50vh',
        mt: 4 
      }}>
        <CircularProgress size={60} thickness={4} sx={{ color: '#0088cc' }} />
        <Typography variant="h6" sx={{ mt: 2, color: 'rgba(255, 255, 255, 0.7)' }}>
          Loading profile data...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center',
        minHeight: '50vh',
        mt: 4 
      }}>
        <Typography variant="h5" color="error" gutterBottom>
          {error}
        </Typography>
        <Button 
          variant="contained" 
          onClick={() => window.location.reload()}
          sx={{ mt: 2 }}
        >
          Retry
        </Button>
      </Box>
    );
  }

  if (!profileData || Object.keys(profileData).length === 0) {
    return (
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center',
        minHeight: '50vh',
        mt: 4 
      }}>
        <Typography variant="h5" color="warning.main" gutterBottom>
          Profile data not found
        </Typography>
        <Button 
          variant="contained" 
          onClick={() => navigate('/dashboard')}
          sx={{ mt: 2 }}
        >
          Go to Dashboard
        </Button>
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
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
                {profileData.skills.map((skill, index) => (
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
                {profileData.interests.map((interest, index) => (
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
                  '&:hover': {
                    transform: 'translateY(-4px)'
                  }
                }}>
                  <CardContent>
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
                  onChange={(e) => setAchievementForm({ ...achievementForm, imageUrl: e.target.value })}
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

      {/* Profile Edit Dialog */}
      <Dialog 
        open={openProfileDialog} 
        onClose={() => setOpenProfileDialog(false)} 
        maxWidth="md" 
        fullWidth
        fullScreen={isMobile}
        PaperProps={{
          sx: {
            bgcolor: 'rgba(0,0,0,0.9)',
            backgroundImage: 'linear-gradient(rgba(0,136,204,0.05), rgba(0,0,0,0.9))',
            backdropFilter: 'blur(10px)',
            borderRadius: '16px',
          }
        }}
      >
        <DialogTitle sx={{ 
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          px: 3,
          py: 2,
        }}>
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            Edit Profile
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <Box component="form" onSubmit={handleProfileDialogSubmit}>
            <Grid container spacing={3}>
              {/* Personal Information */}
              <Grid item xs={12}>
                <Typography variant="h6" sx={{ mb: 2, color: '#0088cc' }}>
                  Personal Information
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Name"
                  value={editProfileData.name}
                  onChange={(e) => setEditProfileData({ ...editProfileData, name: e.target.value })}
                  required
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      bgcolor: 'rgba(255,255,255,0.05)',
                      '&:hover': {
                        bgcolor: 'rgba(255,255,255,0.08)',
                      }
                    }
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Phone"
                  value={editProfileData.phone}
                  onChange={(e) => setEditProfileData({ ...editProfileData, phone: e.target.value })}
                  required
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      bgcolor: 'rgba(255,255,255,0.05)',
                    }
                  }}
                />
              </Grid>

              {/* Academic Information */}
              <Grid item xs={12}>
                <Typography variant="h6" sx={{ mb: 2, mt: 2, color: '#0088cc' }}>
                  Academic Information
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Department"
                  value={editProfileData.department}
                  onChange={(e) => setEditProfileData({ ...editProfileData, department: e.target.value })}
                  required
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      bgcolor: 'rgba(255,255,255,0.05)',
                    }
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Section"
                  value={editProfileData.section}
                  onChange={(e) => setEditProfileData({ ...editProfileData, section: e.target.value })}
                  required
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      bgcolor: 'rgba(255,255,255,0.05)',
                    }
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Roll Number"
                  value={editProfileData.rollNumber}
                  onChange={(e) => setEditProfileData({ ...editProfileData, rollNumber: e.target.value })}
                  required
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      bgcolor: 'rgba(255,255,255,0.05)',
                    }
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Graduation Year"
                  type="number"
                  value={editProfileData.graduationYear}
                  onChange={(e) => setEditProfileData({ ...editProfileData, graduationYear: e.target.value })}
                  required
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      bgcolor: 'rgba(255,255,255,0.05)',
                    }
                  }}
                />
              </Grid>

              {/* Social Links */}
              <Grid item xs={12}>
                <Typography variant="h6" sx={{ mb: 2, mt: 2, color: '#0088cc' }}>
                  Social Links
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="LinkedIn URL"
                  value={editProfileData.linkedinUrl}
                  onChange={(e) => setEditProfileData({ ...editProfileData, linkedinUrl: e.target.value })}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      bgcolor: 'rgba(255,255,255,0.05)',
                    }
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="GitHub URL"
                  value={editProfileData.githubUrl}
                  onChange={(e) => setEditProfileData({ ...editProfileData, githubUrl: e.target.value })}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      bgcolor: 'rgba(255,255,255,0.05)',
                    }
                  }}
                />
              </Grid>

              {/* Skills & Interests */}
              <Grid item xs={12}>
                <Typography variant="h6" sx={{ mb: 2, mt: 2, color: '#0088cc' }}>
                  Skills & Interests
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Skills (comma-separated)"
                  value={editProfileData.skills.join(', ')}
                  onChange={(e) => setEditProfileData({ 
                    ...editProfileData, 
                    skills: e.target.value.split(',').map(skill => skill.trim()).filter(skill => skill)
                  })}
                  multiline
                  rows={2}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      bgcolor: 'rgba(255,255,255,0.05)',
                    }
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Interests (comma-separated)"
                  value={editProfileData.interests.join(', ')}
                  onChange={(e) => setEditProfileData({ 
                    ...editProfileData, 
                    interests: e.target.value.split(',').map(interest => interest.trim()).filter(interest => interest)
                  })}
                  multiline
                  rows={2}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      bgcolor: 'rgba(255,255,255,0.05)',
                    }
                  }}
                />
              </Grid>

              {/* About */}
              <Grid item xs={12}>
                <Typography variant="h6" sx={{ mb: 2, mt: 2, color: '#0088cc' }}>
                  About
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="About"
                  multiline
                  rows={4}
                  value={editProfileData.about}
                  onChange={(e) => setEditProfileData({ ...editProfileData, about: e.target.value })}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      bgcolor: 'rgba(255,255,255,0.05)',
                    }
                  }}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions sx={{ 
          p: 3, 
          borderTop: '1px solid rgba(255,255,255,0.1)',
        }}>
          <Button 
            onClick={() => setOpenProfileDialog(false)}
            sx={{ color: 'rgba(255,255,255,0.7)' }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleProfileDialogSubmit} 
            variant="contained" 
            sx={{
              bgcolor: '#0088cc',
              '&:hover': { bgcolor: '#006699' },
            }}
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Profile;