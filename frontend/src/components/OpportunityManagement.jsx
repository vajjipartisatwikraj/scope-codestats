import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Stack,
  InputAdornment,
  Autocomplete,
  CardMedia,
  Divider,
  Switch,
  FormControlLabel,
  useTheme,
  useMediaQuery,
  Paper,
  Avatar
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  LocationOn as LocationIcon,
  EmojiEvents as PrizeIcon,
  Business as OrganizerIcon,
  Link as LinkIcon,
  Event as EventIcon,
  Category as CategoryIcon
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { apiUrl } from '../config/apiConfig';

const OpportunityManagement = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { token } = useAuth();
  const [opportunities, setOpportunities] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingOpportunity, setEditingOpportunity] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    organizer: '',
    category: 'other',
    difficulty: 'intermediate',
    deadline: '',
    registrationOpen: true,
    location: '',
    link: '',
    tags: [],
    prize: '',
    eligibility: '',
    applicationLink: ''
  });

  const categories = [
    { value: 'hackathon', label: 'Hackathon' },
    { value: 'competition', label: 'Competition' },
    { value: 'internship', label: 'Internship' },
    { value: 'workshop', label: 'Workshop' },
    { value: 'other', label: 'Other' }
  ];

  const difficulties = [
    { value: 'beginner', label: 'Beginner' },
    { value: 'intermediate', label: 'Intermediate' },
    { value: 'advanced', label: 'Advanced' }
  ];

  useEffect(() => {
    fetchOpportunities();
  }, []);

  const fetchOpportunities = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${apiUrl}/admin/opportunities`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOpportunities(response.data);
    } catch (error) {
      console.error('Error fetching opportunities:', error);
      toast.error('Failed to fetch opportunities');
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = (opportunity = null) => {
    if (opportunity) {
      setEditingOpportunity(opportunity);
      setFormData({
        title: opportunity.title,
        description: opportunity.description,
        organizer: opportunity.organizer || '',
        category: opportunity.category || 'other',
        difficulty: opportunity.difficulty || 'intermediate',
        deadline: opportunity.deadline?.split('T')[0] || '',
        registrationOpen: opportunity.registrationOpen ?? true,
        location: opportunity.location || '',
        link: opportunity.link || '',
        tags: opportunity.tags || [],
        prize: opportunity.prize || '',
        eligibility: opportunity.eligibility || '',
        applicationLink: opportunity.applicationLink || ''
      });
    } else {
      setEditingOpportunity(null);
      setFormData({
        title: '',
        description: '',
        organizer: '',
        category: 'other',
        difficulty: 'intermediate',
        deadline: '',
        registrationOpen: true,
        location: '',
        link: '',
        tags: [],
        prize: '',
        eligibility: '',
        applicationLink: ''
      });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingOpportunity(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingOpportunity) {
        await axios.put(
          `${apiUrl}/admin/opportunities/${editingOpportunity._id}`,
          formData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success('Opportunity updated successfully');
      } else {
        await axios.post(
          `${apiUrl}/admin/opportunities`,
          formData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success('Opportunity created successfully');
      }
      handleClose();
      fetchOpportunities();
    } catch (error) {
      console.error('Operation error:', error);
      toast.error(error.response?.data?.message || 'Operation failed');
    }
  };

  const handleDelete = async (opportunityId) => {
    if (window.confirm('Are you sure you want to delete this opportunity?')) {
      try {
        await axios.delete(`${apiUrl}/admin/opportunities/${opportunityId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Opportunity deleted successfully');
        fetchOpportunities();
      } catch (error) {
        console.error('Delete error:', error);
        toast.error('Failed to delete opportunity');
      }
    }
  };

  const filteredOpportunities = opportunities.filter(opportunity =>
    opportunity.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    opportunity.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    opportunity.organizer.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box 
      sx={{ 
        backgroundColor: theme.palette.mode === 'dark' ? '#121212' : '#f5f5f7',
        minHeight: '100vh',
        pt: 3,
        pb: 8
      }}
    >
      <Container maxWidth="xl">
        {/* Header */}
        <Paper 
          elevation={0} 
          sx={{ 
            p: { xs: 2, md: 3 }, 
            mb: 3, 
            borderRadius: 2, 
            background: 'linear-gradient(135deg, #FF6B6B 0%, #FF4B2B 100%)',
            color: 'white'
          }}
        >
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={8}>
              <Typography variant={isMobile ? "h5" : "h4"} fontWeight="bold" gutterBottom>
                Opportunity Management
              </Typography>
              <Typography variant={isMobile ? "body2" : "subtitle1"}>
                Manage competitions, hackathons, and other opportunities
              </Typography>
            </Grid>
            <Grid item xs={12} md={4} sx={{ display: 'flex', justifyContent: { xs: 'flex-start', md: 'flex-end' } }}>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => handleOpen()}
                sx={{ 
                  bgcolor: 'white', 
                  color: 'primary.main',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' },
                  borderRadius: 2,
                  px: 3,
                  py: 1
                }}
              >
                Add Opportunity
              </Button>
            </Grid>
          </Grid>
        </Paper>

        <TextField
          fullWidth
          variant="outlined"
          placeholder="Search opportunities..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ 
            mb: 4,
            '& .MuiOutlinedInput-root': {
              bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'white',
              borderRadius: 2,
              '&:hover': {
                '& > fieldset': {
                  borderColor: 'primary.main',
                }
              }
            }
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />

        <Grid container spacing={3}>
          {filteredOpportunities.map((opportunity) => (
            <Grid item xs={12} sm={6} md={4} key={opportunity._id}>
              <Card 
                sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  borderRadius: 3,
                  bgcolor: theme.palette.mode === 'dark' ? '#1a1a1a' : 'white',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 12px 30px rgba(0,0,0,0.15)'
                  }
                }}
              >
                <CardContent sx={{ flexGrow: 1, p: 3 }}>
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                    {opportunity.title}
                  </Typography>
                  <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
                    <Chip
                      icon={<CategoryIcon />}
                      label={opportunity.category}
                      size="small"
                      sx={{
                        bgcolor: 'primary.main',
                        color: 'white',
                        '& .MuiChip-icon': {
                          color: 'white'
                        }
                      }}
                    />
                    <Chip
                      label={opportunity.difficulty}
                      size="small"
                      sx={{
                        bgcolor: 'secondary.main',
                        color: 'white'
                      }}
                    />
                    <Chip
                      label={opportunity.registrationOpen ? 'Open' : 'Closed'}
                      size="small"
                      sx={{
                        bgcolor: opportunity.registrationOpen ? '#2ecc71' : '#e74c3c',
                        color: 'white'
                      }}
                    />
                  </Stack>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      mb: 2,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      height: '40px'
                    }}
                  >
                    {opportunity.description}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <Avatar 
                      sx={{ 
                        width: 24, 
                        height: 24, 
                        bgcolor: 'primary.main',
                        fontSize: '0.875rem'
                      }}
                    >
                      <OrganizerIcon sx={{ fontSize: 16 }} />
                    </Avatar>
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {opportunity.organizer}
                    </Typography>
                  </Box>
                  {opportunity.location && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <LocationIcon color="action" fontSize="small" />
                      <Typography variant="body2" color="text.secondary" noWrap>
                        {opportunity.location}
                      </Typography>
                    </Box>
                  )}
                  {opportunity.prize && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <PrizeIcon color="action" fontSize="small" />
                      <Typography variant="body2" color="text.secondary" noWrap>
                        {opportunity.prize}
                      </Typography>
                    </Box>
                  )}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <EventIcon color="action" fontSize="small" />
                    <Typography variant="body2" color="text.secondary">
                      Deadline: {new Date(opportunity.deadline).toLocaleDateString()}
                    </Typography>
                  </Box>
                </CardContent>
                <Divider />
                <CardActions sx={{ justifyContent: 'space-between', px: 2, py: 1.5 }}>
                  <Box>
                    {opportunity.applicationLink && (
                      <IconButton
                        href={opportunity.applicationLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        size="small"
                        sx={{ color: 'primary.main' }}
                      >
                        <LinkIcon />
                      </IconButton>
                    )}
                  </Box>
                  <Box>
                    <IconButton 
                      onClick={() => handleOpen(opportunity)}
                      size="small"
                      sx={{ 
                        color: 'primary.main',
                        mr: 1
                      }}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton 
                      onClick={() => handleDelete(opportunity._id)}
                      size="small"
                      sx={{ color: 'error.main' }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Dialog 
          open={open} 
          onClose={handleClose} 
          maxWidth="md" 
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 3,
              bgcolor: theme.palette.mode === 'dark' ? '#1a1a1a' : 'white'
            }
          }}
        >
          <DialogTitle sx={{ 
            pb: 2,
            borderBottom: 1,
            borderColor: 'divider'
          }}>
            <Typography variant="h5" component="div" fontWeight="bold">
              {editingOpportunity ? 'Edit Opportunity' : 'Add Opportunity'}
            </Typography>
          </DialogTitle>
          <DialogContent dividers sx={{ p: 3 }}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  sx={{ 
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2
                    }
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  multiline
                  rows={4}
                  required
                  sx={{ 
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2
                    }
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Organizer"
                  value={formData.organizer}
                  onChange={(e) => setFormData({ ...formData, organizer: e.target.value })}
                  required
                  sx={{ 
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2
                    }
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="City, Country or Online"
                  sx={{ 
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2
                    }
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Category</InputLabel>
                  <Select
                    value={formData.category}
                    label="Category"
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    sx={{ borderRadius: 2 }}
                  >
                    {categories.map((category) => (
                      <MenuItem key={category.value} value={category.value}>
                        {category.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Difficulty</InputLabel>
                  <Select
                    value={formData.difficulty}
                    label="Difficulty"
                    onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                    sx={{ borderRadius: 2 }}
                  >
                    {difficulties.map((difficulty) => (
                      <MenuItem key={difficulty.value} value={difficulty.value}>
                        {difficulty.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Deadline"
                  type="date"
                  value={formData.deadline}
                  onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                  required
                  InputLabelProps={{
                    shrink: true,
                  }}
                  sx={{ 
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2
                    }
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.registrationOpen}
                      onChange={(e) => setFormData({ ...formData, registrationOpen: e.target.checked })}
                      color="primary"
                    />
                  }
                  label="Registration Open"
                  sx={{ mt: 2 }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Prize"
                  value={formData.prize}
                  onChange={(e) => setFormData({ ...formData, prize: e.target.value })}
                  placeholder="e.g., $1000, Certificates, etc."
                  sx={{ 
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2
                    }
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Application Link"
                  value={formData.applicationLink}
                  onChange={(e) => setFormData({ ...formData, applicationLink: e.target.value })}
                  placeholder="https://example.com/apply"
                  sx={{ 
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2
                    }
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Eligibility"
                  value={formData.eligibility}
                  onChange={(e) => setFormData({ ...formData, eligibility: e.target.value })}
                  multiline
                  rows={2}
                  placeholder="Who can participate?"
                  sx={{ 
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2
                    }
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <Autocomplete
                  multiple
                  freeSolo
                  value={formData.tags}
                  onChange={(e, newValue) => setFormData({ ...formData, tags: newValue })}
                  options={[]}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Tags"
                      placeholder="Add tags and press enter"
                      sx={{ 
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 2
                        }
                      }}
                    />
                  )}
                  sx={{ 
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2
                    }
                  }}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 3, borderTop: 1, borderColor: 'divider' }}>
            <Button 
              onClick={handleClose}
              variant="outlined"
              sx={{ 
                borderRadius: 2,
                px: 3,
                mr: 1
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              variant="contained" 
              sx={{ 
                borderRadius: 2,
                px: 3
              }}
            >
              {editingOpportunity ? 'Update Opportunity' : 'Create Opportunity'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
};

export default OpportunityManagement; 