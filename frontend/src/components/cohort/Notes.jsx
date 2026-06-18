import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  TextField,
  Paper,
  Typography,
  Tooltip,
} from '@mui/material';
import { Save as SaveIcon } from '@mui/icons-material';
import axios from 'axios';
import { apiUrl } from '../../config/apiConfig';
import { toast } from 'react-toastify';
import { useAuth } from '../../contexts/AuthContext';

const Notes = ({ cohortId, moduleId, questionId }) => {
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { token } = useAuth();

  // Validation constants
  const MAX_CHARACTERS = 500;
  const MAX_WORDS = 100;

  // Validation functions
  const getWordCount = (text) => {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  };

  const isValidNotes = (text) => {
    const wordCount = getWordCount(text);
    return text.length <= MAX_CHARACTERS && wordCount <= MAX_WORDS;
  };

  const getCharacterCount = () => notes.length;
  const getWordCountForNotes = () => getWordCount(notes);

  // Load notes when component mounts
  useEffect(() => {
    fetchNotes();
  }, [cohortId, moduleId, questionId, token]);

  // Fetch notes from API
  const fetchNotes = async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        `${apiUrl}/cohorts/${cohortId}/modules/${moduleId}/questions/${questionId}/notes`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.data && response.data.notes) {
        setNotes(response.data.notes);
      }
    } catch (error) {
      console.error('Error fetching notes:', error);
      // Don't show error toast, just set empty notes if there's no data yet
    } finally {
      setLoading(false);
    }
  };

  // Save notes to API
  const saveNotes = async () => {
    if (!isValidNotes(notes)) {
      toast.error('Notes exceed the limit of 100 words or 500 characters');
      return;
    }

    setSaving(true);
    try {
      await axios.post(
        `${apiUrl}/cohorts/${cohortId}/modules/${moduleId}/questions/${questionId}/notes`,
        { notes },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      toast.success('Notes saved successfully');
    } catch (error) {
      console.error('Error saving notes:', error);
      toast.error('Failed to save notes');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ width: '100%', p: 2 }}>
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <Typography variant="h6" gutterBottom>
            Your Notes
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Write down your thoughts, solutions approaches, or any helpful information about this problem.
            (Max 100 words, 500 characters)
          </Typography>
          
          <Paper variant="outlined" sx={{ mb: 2 }}>
            <TextField
              multiline
              fullWidth
              minRows={10}
              maxRows={20}
              value={notes}
              onChange={(e) => {
                const newValue = e.target.value;
                if (isValidNotes(newValue)) {
                  setNotes(newValue);
                }
              }}
              placeholder="Write your notes here..."
              variant="outlined"
              error={!isValidNotes(notes) && notes.length > 0}
              helperText={
                <Box component="span" sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', px: 1, py: 0.5 }}>
                  <span>
                    {getCharacterCount()}/{MAX_CHARACTERS} characters, {getWordCountForNotes()}/{MAX_WORDS} words
                  </span>
                  {!isValidNotes(notes) && notes.length > 0 && (
                    <span style={{ color: '#f44336' }}>
                      Limit exceeded
                    </span>
                  )}
                </Box>
              }
              sx={{
                '& .MuiOutlinedInput-root': {
                  '& fieldset': {
                    border: 'none',
                  },
                },
                '& .MuiFormHelperText-root': {
                  fontSize: '0.7rem',
                  mx: 0,
                  mt: 0.5
                }
              }}
            />
          </Paper>
          
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Tooltip title="Save your notes for this question">
              <Button
                variant="contained"
                color="primary"
                startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
                onClick={saveNotes}
                disabled={saving || !isValidNotes(notes)}
              >
                Save
              </Button>
            </Tooltip>
          </Box>
        </>
      )}
    </Box>
  );
};

export default Notes; 