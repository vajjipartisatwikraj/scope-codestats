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
  Code as ProjectIcon, Description as ResumeIcon,
  WorkspacePremium as RecognizedIcon
} from '@mui/icons-material';
import { apiUrl } from '../config/apiConfig';
import { normalizeSkillSets } from '../utils/skillSets';
import { departmentOptions, interestOptions } from '../constants/profileOptions';
import EditableSection from './profile/EditableSection';
import SkillSetsEditor from './profile/SkillSetsEditor';
import EducationEditor from './profile/EducationEditor';
import {
  asEditableEducation,
  formatDateRange,
  normalizeEducation,
  validateEducation
} from '../utils/education';
import {
  asEditablePoints,
  countWords,
  DESCRIPTION_LIMITS,
  getPointError,
  normalizeDescriptionPoints,
  validateDescriptionPoints
} from '../utils/descriptionPoints';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { toast } from 'react-toastify';
import EditProfile from './EditProfile';
import StyledDialog from './common/StyledDialog';
import CertificationSuggestions, {
  GOLD,
  GOLD_SOFT,
  GOLD_BORDER
} from './profile/CertificationSuggestions';
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

// A stored date is an ISO string, but <input type="date"> needs YYYY-MM-DD
const toDateInputValue = (value) => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
};

// "2026-05-01" -> "May 2026", for the read-only cards
const formatMonthYear = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
};

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
    education: [],
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
    description: ['', ''],
    tags: [],
    link: '',
    domainLink: '',
    // Internship specific
    startDate: '',
    endDate: '',
    role: '',
    // Certification specific
    issuer: '',
    issuedDate: '',
    expiryDate: ''
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

  // Catalogue of globally recognized certifications, loaded once
  const [certificationCatalog, setCertificationCatalog] = useState([]);

  // Inline section editing: which card is open, its draft values, save state
  const [editingSection, setEditingSection] = useState(null);
  const [sectionDraft, setSectionDraft] = useState({});
  const [savingSection, setSavingSection] = useState(false);

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

  // Recognized certification catalogue, used for the name suggestions
  useEffect(() => {
    if (!auth?.token) return;

    axios
      .get(`${apiUrl}/achievements/certifications/catalog`, {
        headers: { Authorization: `Bearer ${auth.token}` }
      })
      .then((response) => setCertificationCatalog(response.data.certifications || []))
      .catch(() => setCertificationCatalog([]));
  }, [auth?.token]);

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

  // ---- Inline per-section editing -------------------------------------------
  // Snapshot of the fields a section owns, used both to seed the draft and to
  // decide whether the Update button should be enabled.
  const getSectionValues = (section) => {
    switch (section) {
      case 'basic':
        return {
          department: profileData.department || '',
          phone: profileData.phone || '',
        };
      case 'about':
        return { about: profileData.about || '' };
      case 'education':
        return { education: asEditableEducation(profileData.education) };
      case 'skills':
        return { skills: normalizeSkillSets(profileData.skills) };
      case 'interests':
        return {
          interests: Array.isArray(profileData.interests) ? profileData.interests : [],
        };
      case 'social':
        return {
          linkedinUrl: profileData.linkedinUrl || '',
          githubUsername: profileData.profiles?.github?.username || '',
          resumeLink: profileData.resumeLink || '',
        };
      default:
        return {};
    }
  };

  const startSectionEdit = (section) => {
    setEditingSection(section);
    setSectionDraft(getSectionValues(section));
  };

  const cancelSectionEdit = () => {
    setEditingSection(null);
    setSectionDraft({});
  };

  const setDraftField = (field, value) => {
    setSectionDraft((prev) => ({ ...prev, [field]: value }));
  };

  const isSectionDirty = (section) =>
    editingSection === section &&
    JSON.stringify(sectionDraft) !== JSON.stringify(getSectionValues(section));

  // Saves only the fields belonging to the section being edited
  const handleSectionSave = async () => {
    const section = editingSection;
    const payload = {};

    if (section === 'basic') {
      const phoneError = validatePhone(sectionDraft.phone);
      if (phoneError) {
        toast.error(phoneError);
        return;
      }
      if (!sectionDraft.department) {
        toast.error('Please select a department');
        return;
      }
      payload.department = sectionDraft.department;
      payload.phone = sectionDraft.phone;
    } else if (section === 'about') {
      payload.about = sectionDraft.about || '';
    } else if (section === 'education') {
      const educationError = validateEducation(sectionDraft.education);
      if (educationError) {
        toast.error(educationError);
        return;
      }
      payload.education = normalizeEducation(sectionDraft.education, {
        engineeringStream: profileData.department || ''
      });
    } else if (section === 'skills') {
      payload.skills = normalizeSkillSets(sectionDraft.skills);
    } else if (section === 'interests') {
      payload.interests = sectionDraft.interests || [];
    } else if (section === 'social') {
      payload.linkedinUrl = sectionDraft.linkedinUrl || '';
      payload.resumeLink = sectionDraft.resumeLink || '';
      payload.githubUrl = sectionDraft.githubUsername || '';
    } else {
      return;
    }

    setSavingSection(true);
    try {
      await axios.put(`${apiUrl}/profiles/me`, payload, {
        headers: { Authorization: `Bearer ${auth.token}` }
      });
      await fetchProfileData();
      cancelSectionEdit();
      toast.success('Updated successfully');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update. Please try again.');
    } finally {
      setSavingSection(false);
    }
  };

  // Props shared by every editable section card
  const sectionProps = (section) => ({
    darkMode,
    editing: editingSection === section,
    dirty: isSectionDirty(section),
    saving: savingSection,
    onEdit: () => startSectionEdit(section),
    onCancel: cancelSectionEdit,
    onSave: handleSectionSave,
  });

  // Description points of the achievement being edited, kept editable (blanks
  // included) so rows don't disappear while typing
  const descriptionPoints = asEditablePoints(achievementForm.description);

  const setDescriptionPoints = (points) => {
    setAchievementForm((prev) => ({ ...prev, description: points }));
  };

  const handleDescriptionPointChange = (index, value) => {
    setDescriptionPoints(
      descriptionPoints.map((point, i) => (i === index ? value : point))
    );
  };

  // One click fills the name, issuer and issuer domain from the catalogue.
  // The server re-derives `recognized` from the title, so nothing is trusted here.
  const handleSelectRecognizedCertification = (entry) => {
    setAchievementForm((prev) => ({
      ...prev,
      title: entry.code ? `${entry.name} (${entry.code})` : entry.name,
      issuer: entry.issuer,
      domainLink: entry.domain
    }));
  };

  // Icon shown in the dialog header, following the selected type
  const activeTypeMeta = achievementTypes.find(
    (option) => option.value === achievementForm.type
  );

  // Switching type clears the fields that only belong to the previous one
  const handleAchievementTypeChange = (nextType) => {
    setAchievementForm((prev) => ({
      ...prev,
      type: nextType,
      ...(nextType === 'internship' ? {} : { startDate: '', endDate: '', role: '' }),
      ...(nextType === 'certification'
        ? {}
        : { issuer: '', issuedDate: '', expiryDate: '' })
    }));
  };

  const handleAddDescriptionPoint = () => {
    if (descriptionPoints.length >= DESCRIPTION_LIMITS.maxPoints) return;
    setDescriptionPoints([...descriptionPoints, '']);
  };

  const handleRemoveDescriptionPoint = (index) => {
    setDescriptionPoints(descriptionPoints.filter((_, i) => i !== index));
  };

  // Reset achievement form
  const resetAchievementForm = () => {
    setAchievementForm({
      type: activeTab,
      // Start with the minimum number of points
      description: Array(DESCRIPTION_LIMITS.minPoints).fill(''),
      title: '',
      tags: [],
      link: '',
      domainLink: '',
      startDate: '',
      endDate: '',
      role: '',
      issuer: '',
      issuedDate: '',
      expiryDate: ''
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
      // Handles both the points array and legacy single-string descriptions
      description: asEditablePoints(achievement.description),
      domainLink: achievement.domainLink || '',
      role: achievement.role || '',
      issuer: achievement.issuer || '',
      // type="date" inputs only accept YYYY-MM-DD, not the stored ISO string
      startDate: toDateInputValue(achievement.startDate),
      endDate: toDateInputValue(achievement.endDate),
      issuedDate: toDateInputValue(achievement.issuedDate),
      expiryDate: toDateInputValue(achievement.expiryDate)
    });
    
    setOpenDialog(true);
  };

  // Handle achievement form submission
  const handleAchievementSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    if (!achievementForm.title) {
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
    
    const descriptionError = validateDescriptionPoints(achievementForm.description);
    if (descriptionError) {
      toast.error(descriptionError);
      return;
    }

    // Date order checks. Values are YYYY-MM-DD so string comparison is safe.
    if (
      achievementForm.type === 'internship' &&
      achievementForm.startDate &&
      achievementForm.endDate &&
      achievementForm.startDate >= achievementForm.endDate
    ) {
      toast.error('Start date must be earlier than the end date');
      return;
    }

    if (
      achievementForm.type === 'certification' &&
      achievementForm.issuedDate &&
      achievementForm.expiryDate &&
      achievementForm.issuedDate >= achievementForm.expiryDate
    ) {
      toast.error('Issued date must be earlier than the expiry date');
      return;
    }

    try {
      // Use the tags array directly from state
      const achievementData = {
        ...achievementForm,
        description: normalizeDescriptionPoints(achievementForm.description)
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

          {/* Quick Info Grid - hover the card to edit department / phone */}
          <EditableSection
            {...sectionProps('basic')}
            sx={{
              mb: 4,
              bgcolor: darkMode ? 'rgba(23, 23, 23, 0.45)' : '#ffffff',
              p: 3,
              borderRadius: '16px',
              boxShadow: darkMode ? 'none' : '0 2px 8px rgba(0,0,0,0.08)',
              border: `1px solid ${darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`
            }}
            editContent={
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    select
                    fullWidth
                    label="Department"
                    value={sectionDraft.department || ''}
                    onChange={(e) => setDraftField('department', e.target.value)}
                  >
                    {departmentOptions.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Phone"
                    value={sectionDraft.phone || ''}
                    onChange={(e) => setDraftField('phone', e.target.value.replace(/\D/g, ''))}
                    helperText="Enter exactly 10 digits"
                    inputProps={{ maxLength: 10, inputMode: 'numeric' }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="caption" sx={{ color: darkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}>
                    Roll number and email cannot be changed.
                  </Typography>
                </Grid>
              </Grid>
            }
          >
          <Grid container spacing={0}>
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
          </EditableSection>

          {/* About Section with inline editing */}
          <EditableSection
            {...sectionProps('about')}
            title="About"
            sx={{
              p: 3,
              borderRadius: '16px',
              boxShadow: darkMode ? 'none' : '0 2px 8px rgba(0,0,0,0.08)',
              border: `1px solid ${darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
              bgcolor: darkMode ? 'rgba(23, 23, 23, 0.45)' : '#ffffff',
              mb: 3
            }}
            editContent={
              <TextField
                fullWidth
                multiline
                minRows={4}
                label="About"
                placeholder="Write a short bio about yourself"
                value={sectionDraft.about || ''}
                onChange={(e) => setDraftField('about', e.target.value)}
              />
            }
          >
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
          </EditableSection>

          {/* Education Section with inline editing */}
          <EditableSection
            {...sectionProps('education')}
            title="Education"
            sx={{
              p: 3,
              borderRadius: '16px',
              boxShadow: darkMode ? 'none' : '0 2px 8px rgba(0,0,0,0.08)',
              border: `1px solid ${darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
              bgcolor: darkMode ? 'rgba(23, 23, 23, 0.45)' : '#ffffff',
              mb: 3
            }}
            editContent={
              <EducationEditor
                value={sectionDraft.education}
                onChange={(education) => setDraftField('education', education)}
                department={profileData.department || ''}
                darkMode={darkMode}
              />
            }
          >
            {normalizeEducation(profileData.education).length === 0 ? (
              <Typography variant="body2" sx={{ color: darkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)', fontStyle: 'italic' }}>
                No education added yet.
              </Typography>
            ) : (
              normalizeEducation(profileData.education).map((entry, index) => (
                <Box
                  key={index}
                  sx={{
                    display: 'flex',
                    gap: 2,
                    py: 1.5,
                    borderTop: index === 0
                      ? 'none'
                      : `1px solid ${darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`
                  }}
                >
                  <School sx={{ color: '#0088cc', fontSize: 24, mt: 0.5 }} />
                  <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body1" sx={{ fontWeight: 600, color: darkMode ? '#ffffff' : '#000000' }}>
                        {entry.name || entry.level}
                      </Typography>
                      <Chip
                        label={entry.level}
                        size="small"
                        sx={{
                          bgcolor: 'rgba(0, 136, 204, 0.2)',
                          color: '#0088cc',
                          border: '1px solid rgba(0, 136, 204, 0.3)'
                        }}
                      />
                    </Box>
                    {entry.stream && (
                      <Typography variant="body2" sx={{ color: darkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)' }}>
                        {entry.stream}
                      </Typography>
                    )}
                    <Typography variant="body2" sx={{ color: darkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.55)' }}>
                      {[
                        formatDateRange(entry.startDate, entry.endDate),
                        entry.score !== null ? `${entry.scoreType}: ${entry.score}` : ''
                      ].filter(Boolean).join('  •  ')}
                    </Typography>
                  </Box>
                </Box>
              ))
            )}
          </EditableSection>

          {/* Skills & Interests - each card edits independently */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} md={6}>
              <EditableSection
                {...sectionProps('skills')}
                title="Skills"
                sx={{
                  height: '100%',
                  p: 3,
                  borderRadius: '16px',
                  boxShadow: darkMode ? 'none' : '0 2px 8px rgba(0,0,0,0.08)',
                  border: `1px solid ${darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                  bgcolor: darkMode ? 'rgba(23, 23, 23, 0.45)' : '#ffffff'
                }}
                editContent={
                  <SkillSetsEditor
                    value={sectionDraft.skills}
                    onChange={(skills) => setDraftField('skills', skills)}
                    darkMode={darkMode}
                  />
                }
              >
                {normalizeSkillSets(profileData.skills).length === 0 ? (
                  <Typography variant="body2" sx={{ color: darkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)', fontStyle: 'italic' }}>
                    No skills added yet.
                  </Typography>
                ) : (
                  normalizeSkillSets(profileData.skills).map((skillSet, setIndex) => (
                    <Box key={setIndex} sx={{ mb: 2 }}>
                      <Typography
                        variant="subtitle2"
                        sx={{ mb: 1, fontWeight: 600, color: darkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)' }}
                      >
                        {skillSet.name}
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {skillSet.skills.map((skill, index) => (
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
                  ))
                )}
              </EditableSection>
            </Grid>
            <Grid item xs={12} md={6}>
              <EditableSection
                {...sectionProps('interests')}
                title="Interests"
                sx={{
                  height: '100%',
                  p: 3,
                  borderRadius: '16px',
                  boxShadow: darkMode ? 'none' : '0 2px 8px rgba(0,0,0,0.08)',
                  border: `1px solid ${darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                  bgcolor: darkMode ? 'rgba(23, 23, 23, 0.45)' : '#ffffff'
                }}
                editContent={
                  <Autocomplete
                    multiple
                    freeSolo
                    options={interestOptions}
                    value={Array.isArray(sectionDraft.interests) ? sectionDraft.interests : []}
                    onChange={(e, newValue) =>
                      setDraftField(
                        'interests',
                        [...new Set(newValue.map((i) => String(i).trim()).filter(Boolean))]
                      )
                    }
                    renderTags={(value, getTagProps) =>
                      value.map((option, index) => (
                        <Chip
                          label={option}
                          {...getTagProps({ index })}
                          key={`${option}-${index}`}
                          size="small"
                          sx={{
                            bgcolor: darkMode ? 'rgba(0,136,204,0.2)' : 'rgba(0,136,204,0.1)',
                            color: '#0088cc',
                            border: '1px solid rgba(0,136,204,0.3)'
                          }}
                        />
                      ))
                    }
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        fullWidth
                        label="Interests"
                        placeholder="Add an interest and press enter"
                        helperText="Type an interest and press Enter, or pick from suggestions"
                      />
                    )}
                  />
                }
              >
                {!profileData.interests || profileData.interests.length === 0 ? (
                  <Typography variant="body2" sx={{ color: darkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)', fontStyle: 'italic' }}>
                    No interests added yet.
                  </Typography>
                ) : (
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
                )}
              </EditableSection>
            </Grid>
          </Grid>

          {/* Social Links Section with inline editing */}
          <EditableSection
            {...sectionProps('social')}
            title="Social Links"
            sx={{ 
              p: { xs: 2, md: 3 }, 
              mb: 3,
              bgcolor: darkMode ? 'rgba(23, 23, 23, 0.45)' : '#ffffff',
              borderRadius: 2,
              boxShadow: darkMode ? 'none' : '0 2px 8px rgba(0,0,0,0.08)',
              border: `1px solid ${darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`
            }}
            editContent={
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="LinkedIn"
                    placeholder="Profile URL or username"
                    value={sectionDraft.linkedinUrl || ''}
                    onChange={(e) => setDraftField('linkedinUrl', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="GitHub Username"
                    placeholder="e.g. octocat"
                    value={sectionDraft.githubUsername || ''}
                    onChange={(e) => setDraftField('githubUsername', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Resume Link"
                    placeholder="https://drive.google.com/..."
                    value={sectionDraft.resumeLink || ''}
                    onChange={(e) => setDraftField('resumeLink', e.target.value)}
                  />
                </Grid>
              </Grid>
            }
          >
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
          </EditableSection>
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
          {/* Explains the gold treatment without adding visual noise */}
          {activeTab === 'certification' && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 2 }}>
              <RecognizedIcon sx={{ fontSize: 16, color: GOLD }} />
              <Typography variant="caption" sx={{ color: darkMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)' }}>
                Note: globally recognized certificates appear in gold.
              </Typography>
            </Box>
          )}
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
                    // Recognized certificates are highlighted in gold
                    bgcolor: achievement.recognized
                      ? darkMode
                        ? 'rgba(201, 162, 39, 0.07)'
                        : 'rgba(201, 162, 39, 0.05)'
                      : darkMode ? 'rgba(23, 23, 23, 0.45)' : '#ffffff',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'all 0.2s ease-in-out',
                    height: '100%',
                    minHeight: '220px',
                    position: 'relative',
                    border: `1px solid ${
                      achievement.recognized
                        ? GOLD_BORDER
                        : darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
                    }`,
                    boxShadow: darkMode ? 'none' : '0 2px 8px rgba(0,0,0,0.08)',
                    // A thin gold rule along the top, kept subtle
                    ...(achievement.recognized && {
                      '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '3px',
                        background: `linear-gradient(90deg, ${GOLD} 0%, rgba(201,162,39,0.35) 100%)`
                      }
                    }),
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: darkMode
                        ? '0 8px 32px rgba(0, 136, 204, 0.15)'
                        : '0 6px 16px rgba(0, 0, 0, 0.12)',
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

                    {achievement.recognized && (
                      <Chip
                        size="small"
                        icon={<RecognizedIcon sx={{ fontSize: 15, color: `${GOLD} !important` }} />}
                        label="Recognized"
                        sx={{
                          alignSelf: 'flex-start',
                          height: '22px',
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          bgcolor: GOLD_SOFT,
                          color: GOLD,
                          border: `1px solid ${GOLD_BORDER}`
                        }}
                      />
                    )}

                    {/* Role / issuer, then the relevant date window */}
                    {(achievement.role || achievement.issuer) && (
                      <Typography
                        variant="body2"
                        sx={{ color: darkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)' }}
                      >
                        {achievement.role || achievement.issuer}
                      </Typography>
                    )}

                    {(() => {
                      const window = achievement.type === 'certification'
                        ? [
                            achievement.issuedDate ? `Issued ${formatMonthYear(achievement.issuedDate)}` : '',
                            achievement.expiryDate ? `Expires ${formatMonthYear(achievement.expiryDate)}` : ''
                          ]
                        : [
                            formatMonthYear(achievement.startDate),
                            achievement.startDate ? (formatMonthYear(achievement.endDate) || 'Present') : ''
                          ];
                      const label = window.filter(Boolean).join(
                        achievement.type === 'certification' ? '  •  ' : ' - '
                      );
                      return label ? (
                        <Typography
                          variant="caption"
                          sx={{ color: darkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.55)' }}
                        >
                          {label}
                        </Typography>
                      ) : null;
                    })()}

                    {/* Description points are intentionally not shown on the
                        profile card - they are still editable in the dialog */}

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
      <StyledDialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        darkMode={darkMode}
        fullScreen={isMobile}
        icon={activeTypeMeta?.icon}
        title={editingAchievement ? 'Edit Item' : 'Add New Item'}
        subtitle={
          editingAchievement
            ? 'Update the details of this portfolio item.'
            : 'Add an achievement, project, internship or certification.'
        }
        dialogProps={{
          container: () => document.getElementById('dialog-container') || document.body,
          disableEnforceFocus: true
        }}
        actions={
          <>
            <Button
              onClick={() => setOpenDialog(false)}
              sx={{ textTransform: 'none', color: darkMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)' }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAchievementSubmit}
              variant="contained"
              startIcon={editingAchievement ? <EditIcon /> : <AddIcon />}
              sx={{
                textTransform: 'none',
                px: 2.5,
                borderRadius: '10px',
                bgcolor: '#0088cc',
                '&:hover': { bgcolor: '#006699' }
              }}
            >
              {editingAchievement ? 'Update' : 'Create'}
            </Button>
          </>
        }
      >
          <Box component="form" onSubmit={handleAchievementSubmit}>
            {/* Type picker: a visual choice, so show the four kinds as tiles */}
            <Typography
              variant="overline"
              sx={{ display: 'block', mb: 1, letterSpacing: 1, color: darkMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)' }}
            >
              Type
            </Typography>
            <Grid container spacing={1.5} sx={{ mb: 3 }}>
              {achievementTypes.map((option) => {
                const selected = achievementForm.type === option.value;
                return (
                  <Grid item xs={6} sm={3} key={option.value}>
                    <Box
                      role="button"
                      tabIndex={0}
                      onClick={() => handleAchievementTypeChange(option.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleAchievementTypeChange(option.value);
                        }
                      }}
                      sx={{
                        p: 1.5,
                        height: '100%',
                        cursor: 'pointer',
                        textAlign: 'center',
                        borderRadius: '12px',
                        border: `1px solid ${selected ? '#0088cc' : darkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'}`,
                        bgcolor: selected
                          ? 'rgba(0,136,204,0.10)'
                          : darkMode ? 'rgba(255,255,255,0.04)' : 'transparent',
                        transition: 'all 0.2s ease',
                        '&:hover': { borderColor: '#0088cc' }
                      }}
                    >
                      <Box
                        sx={{
                          color: selected ? '#0088cc' : darkMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)',
                          '& svg': { fontSize: 22 }
                        }}
                      >
                        {option.icon}
                      </Box>
                      <Typography
                        variant="caption"
                        sx={{
                          display: 'block',
                          mt: 0.5,
                          fontWeight: selected ? 600 : 500,
                          color: selected ? '#0088cc' : darkMode ? '#fff' : '#000'
                        }}
                      >
                        {option.label}
                      </Typography>
                    </Box>
                  </Grid>
                );
              })}
            </Grid>

            <Grid container spacing={{ xs: 1.5, sm: 2 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label={achievementForm.type === 'certification' ? 'Certificate Name' : 'Title'}
                  value={achievementForm.title}
                  onChange={(e) => setAchievementForm({ ...achievementForm, title: e.target.value })}
                  required
                />

                {/* Recognized certificate suggestions */}
                {achievementForm.type === 'certification' && (
                  <CertificationSuggestions
                    catalog={certificationCatalog}
                    query={achievementForm.title}
                    darkMode={darkMode}
                    logoToken={LOGO_TOKEN}
                    onSelect={handleSelectRecognizedCertification}
                  />
                )}
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Description points
                </Typography>
                <Typography variant="caption" sx={{ display: 'block', mb: 1.5, color: darkMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)' }}>
                  {`${DESCRIPTION_LIMITS.minPoints}-${DESCRIPTION_LIMITS.maxPoints} points. Each point needs ${DESCRIPTION_LIMITS.minWords}-${DESCRIPTION_LIMITS.maxWords} words and ${DESCRIPTION_LIMITS.minChars}-${DESCRIPTION_LIMITS.maxChars} characters.`}
                </Typography>

                {descriptionPoints.map((point, pointIndex) => {
                  const pointError = point.trim() ? getPointError(point) : null;
                  return (
                    <Box key={pointIndex} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1.5 }}>
                      <TextField
                        fullWidth
                        multiline
                        minRows={2}
                        label={`Point ${pointIndex + 1}`}
                        value={point}
                        onChange={(e) => handleDescriptionPointChange(pointIndex, e.target.value)}
                        error={Boolean(pointError)}
                        helperText={
                          pointError ||
                          `${countWords(point)}/${DESCRIPTION_LIMITS.maxWords} words  •  ${point.trim().length}/${DESCRIPTION_LIMITS.maxChars} chars`
                        }
                      />
                      <IconButton
                        aria-label={`Remove point ${pointIndex + 1}`}
                        onClick={() => handleRemoveDescriptionPoint(pointIndex)}
                        disabled={descriptionPoints.length <= 1}
                        sx={{ color: '#f44336', mt: 1 }}
                      >
                        <CloseIcon />
                      </IconButton>
                    </Box>
                  );
                })}

                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleAddDescriptionPoint}
                  disabled={descriptionPoints.length >= DESCRIPTION_LIMITS.maxPoints}
                  sx={{ color: '#0088cc', borderColor: 'rgba(0,136,204,0.5)', textTransform: 'none' }}
                >
                  + Add Point
                </Button>
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
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Role"
                      value={achievementForm.role}
                      onChange={(e) => setAchievementForm({ ...achievementForm, role: e.target.value })}
                      placeholder="e.g. Software Development Intern"
                      helperText="The position you held"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Start Date"
                      type="date"
                      value={achievementForm.startDate}
                      onChange={(e) => setAchievementForm({ ...achievementForm, startDate: e.target.value })}
                      InputLabelProps={{ shrink: true }}
                      inputProps={{ max: achievementForm.endDate || undefined }}
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
                      inputProps={{ min: achievementForm.startDate || undefined }}
                      required
                    />
                  </Grid>
                </>
              )}
              {achievementForm.type === 'certification' && (
                <>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Issuer Name"
                      value={achievementForm.issuer}
                      onChange={(e) => setAchievementForm({ ...achievementForm, issuer: e.target.value })}
                      placeholder="e.g. Amazon Web Services"
                      helperText="The organization that issued this certification"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Issued Date"
                      type="date"
                      value={achievementForm.issuedDate}
                      onChange={(e) => setAchievementForm({ ...achievementForm, issuedDate: e.target.value })}
                      InputLabelProps={{ shrink: true }}
                      inputProps={{ max: achievementForm.expiryDate || undefined }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Expiry Date"
                      type="date"
                      value={achievementForm.expiryDate}
                      onChange={(e) => setAchievementForm({ ...achievementForm, expiryDate: e.target.value })}
                      InputLabelProps={{ shrink: true }}
                      inputProps={{ min: achievementForm.issuedDate || undefined }}
                      helperText="Leave empty if it does not expire"
                    />
                  </Grid>
                </>
              )}
            </Grid>
          </Box>
      </StyledDialog>

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