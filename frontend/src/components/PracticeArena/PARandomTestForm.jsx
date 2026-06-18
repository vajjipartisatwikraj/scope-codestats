import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Chip,
  CircularProgress,
  Slider,
  Divider,
  Alert,
  FormHelperText,
  Autocomplete,
  Stack,
  alpha
} from '@mui/material';
import { 
  Code as CodeIcon,
  Timer as TimerIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { useTheme as useAppTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import axios from 'axios';
import { apiUrl } from '../../config/apiConfig';
import { toast } from 'react-toastify';

const PARandomTestForm = ({ onClose }) => {
  const { darkMode } = useAppTheme();
  const { token } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  
  // Form state
  const [loading, setLoading] = useState(false);
  const [subjects, setSubjects] = useState([]);
  const [topics, setTopics] = useState([]);
  const [formData, setFormData] = useState({
    title: 'My Practice Test',
    subject: '',
    selectedTopics: [],
    difficulty: 'mixed',
    mcqCount: 5,
    programmingCount: 2,
    timeLimit: 60 // minutes
  });
  const [errors, setErrors] = useState({});
  
  // Fetch subjects and topics on component mount
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch available subjects (question banks)
        const subjectsResponse = await axios.get(
          `${apiUrl}/practice-arena/subjects`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        // Fetch available topics (tags)
        const topicsResponse = await axios.get(
          `${apiUrl}/practice-arena/topics`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        setSubjects(subjectsResponse.data || []);
        setTopics(topicsResponse.data || []);
      } catch (error) {
        console.error('Error fetching options:', error);
        toast.error('Failed to load subjects and topics');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [token]);
  
  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    
    // Clear error when field is edited
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: ''
      });
    }
  };
  
  // Handle topic selection
  const handleTopicChange = (event, newValue) => {
    setFormData({
      ...formData,
      selectedTopics: newValue
    });
  };
  
  // Handle slider changes for question counts
  const handleSliderChange = (name) => (event, newValue) => {
    setFormData({
      ...formData,
      [name]: newValue
    });
  };
  
  // Validate the form
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.subject) {
      newErrors.subject = 'Please select a subject';
    }
    
    if (formData.mcqCount === 0 && formData.programmingCount === 0) {
      newErrors.questionCount = 'Please select at least one question';
    }
    
    if (formData.timeLimit < 5) {
      newErrors.timeLimit = 'Time limit must be at least 5 minutes';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      setLoading(true);
      
      try {
        // Prepare test parameters
        const testParams = {
          title: formData.title,
          subject: formData.subject,
          topics: formData.selectedTopics,
          difficulty: formData.difficulty,
          questionTypes: {
            mcq: { count: formData.mcqCount },
            programming: { count: formData.programmingCount }
          },
          timeLimit: formData.timeLimit
        };
        
        // Create the test
        const response = await axios.post(
          `${apiUrl}/practice-arena/tests`,
          testParams,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        toast.success('Practice test created! Ready to start.');
        
        // Navigate to the test page
        navigate(`/practice-arena/tests/${response.data.test._id}`);
      } catch (error) {
        console.error('Error creating test:', error);
        
        // Handle specific errors
        if (error.response?.status === 400 && error.response?.data?.message?.includes('Not enough questions')) {
          toast.error(`${error.response.data.message}. Try different criteria.`);
        } else {
          toast.error('Failed to create practice test. Please try again.');
        }
      } finally {
        setLoading(false);
      }
    }
  };
  
  const isDark = theme.palette.mode === 'dark';
  const inputSx = {
    '& .MuiOutlinedInput-root': {
      borderRadius: '8px',
      fontSize: '0.95rem',
      '&.Mui-focused fieldset': { borderColor: '#0088CC' }
    },
    '& .MuiInputLabel-root': { fontSize: '0.95rem' },
    '& .MuiInputLabel-root.Mui-focused': { color: '#0088CC' }
  };

  const sliderSx = (color) => ({
    color,
    height: 4,
    '& .MuiSlider-thumb': { width: 16, height: 16, bgcolor: '#fff', border: `2px solid ${color}` },
    '& .MuiSlider-track': { height: 4, border: 'none' },
    '& .MuiSlider-rail': { height: 4, opacity: 0.2 },
    '& .MuiSlider-mark': { bgcolor: 'transparent' },
    '& .MuiSlider-markLabel': { fontSize: '0.8rem', color: 'text.secondary' },
  });

  return (
    <Box sx={{ width: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <Box sx={{ px: 3, py: 2.5, bgcolor: '#0088CC', borderRadius: '12px 12px 0 0' }}>
        <Typography sx={{ fontWeight: 700, color: '#fff', fontSize: '1.25rem' }}>
          Create Practice Test
        </Typography>
        <Typography sx={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.9rem', mt: 0.25 }}>
          Configure and start a personalized test
        </Typography>
      </Box>

      {/* Body */}
      <Box sx={{ px: 3, py: 3, bgcolor: isDark ? '#0a0a0a' : '#f8f9fa', borderRadius: '0 0 12px 12px' }}>
        {errors.questionCount && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: '8px', fontSize: '0.9rem' }}>
            {errors.questionCount}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <Stack spacing={3}>
            {/* Title */}
            <TextField
              fullWidth size="small" label="Test Title" name="title"
              value={formData.title} onChange={handleChange} sx={inputSx}
            />

            {/* Subject & Difficulty row */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <FormControl fullWidth size="small" error={!!errors.subject}>
                <InputLabel sx={{ '&.Mui-focused': { color: '#0088CC' } }}>Subject *</InputLabel>
                <Select name="subject" value={formData.subject} onChange={handleChange} label="Subject *"
                  sx={{ borderRadius: '8px', fontSize: '0.95rem', '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#0088CC' } }}>
                  {subjects.length === 0
                    ? <MenuItem disabled>No subjects available</MenuItem>
                    : subjects.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                </Select>
                {errors.subject && <FormHelperText>{errors.subject}</FormHelperText>}
              </FormControl>

              <FormControl fullWidth size="small">
                <InputLabel sx={{ '&.Mui-focused': { color: '#0088CC' } }}>Difficulty</InputLabel>
                <Select name="difficulty" value={formData.difficulty} onChange={handleChange} label="Difficulty"
                  sx={{ borderRadius: '8px', fontSize: '0.95rem', '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#0088CC' } }}>
                  <MenuItem value="easy">Easy</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="hard">Hard</MenuItem>
                  <MenuItem value="mixed">Mixed</MenuItem>
                </Select>
              </FormControl>
            </Stack>

            {/* Topics */}
            <Box>
              <Autocomplete
                multiple size="small" options={topics}
                value={formData.selectedTopics} onChange={handleTopicChange}
                renderInput={(params) => (
                  <TextField {...params} label="Topics (Optional)" placeholder="Select topics..." sx={inputSx} />
                )}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip label={option} {...getTagProps({ index })} size="small"
                      sx={{ bgcolor: '#0088CC', color: '#fff', fontSize: '0.8rem', height: 26, borderRadius: '6px',
                        '& .MuiChip-deleteIcon': { color: 'rgba(255,255,255,0.7)', '&:hover': { color: '#fff' } } }} />
                  ))
                }
              />
              <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary', mt: 0.5, ml: 0.5 }}>
                Leave empty to include all topics
              </Typography>
            </Box>

            {/* Divider */}
            <Divider sx={{ opacity: 0.5 }} />

            {/* Questions & Time */}
            <Typography sx={{ fontWeight: 600, fontSize: '0.95rem', color: 'text.primary' }}>
              Questions & Time
            </Typography>

            {/* MCQ slider */}
            <Box>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <CheckCircleIcon sx={{ fontSize: 18, color: '#4caf50' }} />
                  <Typography sx={{ fontSize: '0.9rem', fontWeight: 500, color: 'text.primary' }}>MCQ</Typography>
                </Stack>
                <Typography sx={{ fontSize: '0.9rem', fontWeight: 700, color: '#4caf50' }}>{formData.mcqCount}</Typography>
              </Stack>
              <Slider
                value={formData.mcqCount} onChange={handleSliderChange('mcqCount')}
                step={1} min={0} max={15}
                marks={[{ value: 0, label: '0' }, { value: 5, label: '5' }, { value: 10, label: '10' }, { value: 15, label: '15' }]}
                sx={sliderSx('#4caf50')}
              />
            </Box>

            {/* Programming slider */}
            <Box>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <CodeIcon sx={{ fontSize: 18, color: '#0088CC' }} />
                  <Typography sx={{ fontSize: '0.9rem', fontWeight: 500, color: 'text.primary' }}>Programming</Typography>
                </Stack>
                <Typography sx={{ fontSize: '0.9rem', fontWeight: 700, color: '#0088CC' }}>{formData.programmingCount}</Typography>
              </Stack>
              <Slider
                value={formData.programmingCount} onChange={handleSliderChange('programmingCount')}
                step={1} min={0} max={10}
                marks={[{ value: 0, label: '0' }, { value: 3, label: '3' }, { value: 7, label: '7' }, { value: 10, label: '10' }]}
                sx={sliderSx('#0088CC')}
              />
            </Box>

            {/* Time slider */}
            <Box>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <TimerIcon sx={{ fontSize: 18, color: '#ff9800' }} />
                  <Typography sx={{ fontSize: '0.9rem', fontWeight: 500, color: 'text.primary' }}>Time Limit</Typography>
                </Stack>
                <Typography sx={{ fontSize: '0.9rem', fontWeight: 700, color: '#ff9800' }}>{formData.timeLimit}m</Typography>
              </Stack>
              <Slider
                value={formData.timeLimit} onChange={handleSliderChange('timeLimit')}
                step={10} min={10} max={180}
                marks={[{ value: 10, label: '10m' }, { value: 60, label: '1h' }, { value: 120, label: '2h' }, { value: 180, label: '3h' }]}
                sx={sliderSx('#ff9800')}
              />
              {errors.timeLimit && <FormHelperText error sx={{ fontSize: '0.8rem', mt: 0.5 }}>{errors.timeLimit}</FormHelperText>}
            </Box>

            {/* Summary */}
            <Stack direction="row" spacing={3} justifyContent="center" alignItems="center" sx={{ py: 0.5 }}>
              <Stack direction="row" spacing={0.5} alignItems="center">
                <CheckCircleIcon sx={{ fontSize: 16, color: '#0088CC' }} />
                <Typography sx={{ fontSize: '0.9rem', color: 'text.secondary' }}>
                  <strong style={{ color: '#0088CC' }}>{formData.mcqCount + formData.programmingCount}</strong> Total
                </Typography>
              </Stack>
              <Stack direction="row" spacing={0.5} alignItems="center">
                <CheckCircleIcon sx={{ fontSize: 16, color: '#4caf50' }} />
                <Typography sx={{ fontSize: '0.9rem', color: 'text.secondary' }}>
                  <strong style={{ color: '#4caf50' }}>{formData.mcqCount}</strong> MCQ
                </Typography>
              </Stack>
              <Stack direction="row" spacing={0.5} alignItems="center">
                <CodeIcon sx={{ fontSize: 16, color: '#0088CC' }} />
                <Typography sx={{ fontSize: '0.9rem', color: 'text.secondary' }}>
                  <strong style={{ color: '#0088CC' }}>{formData.programmingCount}</strong> Code
                </Typography>
              </Stack>
              <Stack direction="row" spacing={0.5} alignItems="center">
                <TimerIcon sx={{ fontSize: 16, color: '#ff9800' }} />
                <Typography sx={{ fontSize: '0.9rem', color: 'text.secondary' }}>
                  <strong style={{ color: '#ff9800' }}>{formData.timeLimit}m</strong>
                </Typography>
              </Stack>
            </Stack>

            {/* Buttons */}
            <Stack direction="row" spacing={2} sx={{ pt: 0.5 }}>
              <Button variant="outlined" onClick={onClose} fullWidth
                sx={{
                  py: 1.2, borderRadius: '8px', textTransform: 'none', fontSize: '0.9rem', fontWeight: 600,
                  borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)', color: 'text.primary',
                  '&:hover': { borderColor: '#0088CC', bgcolor: alpha('#0088CC', 0.05) }
                }}>
                Cancel
              </Button>
              <Button type="submit" variant="contained" disabled={loading} fullWidth
                sx={{
                  py: 1.2, borderRadius: '8px', textTransform: 'none', fontSize: '0.9rem', fontWeight: 600,
                  bgcolor: '#0088CC', '&:hover': { bgcolor: '#006699' },
                  '&.Mui-disabled': { bgcolor: alpha('#0088CC', 0.3), color: 'rgba(255,255,255,0.5)' }
                }}>
                {loading ? (
                  <Stack direction="row" spacing={1} alignItems="center">
                    <CircularProgress size={16} sx={{ color: 'white' }} />
                    <span>Creating...</span>
                  </Stack>
                ) : 'Create Test'}
              </Button>
            </Stack>
          </Stack>
        </form>
      </Box>
    </Box>
  );
};

export default PARandomTestForm; 