import React, { memo } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Grid,
  Paper,
  Chip
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';

const AdditionalDetailsTab = memo(({ 
  formData,
  newHint,
  newTag,
  newCompany,
  onSetNewHint,
  onSetNewTag,
  onSetNewCompany,
  onAddHint,
  onRemoveHint,
  onAddTag,
  onRemoveTag,
  onAddCompany,
  onRemoveCompany,
  onInputChange
}) => {
  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Additional Details
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Add optional details like hints, tags, and company information.
      </Typography>
      
      <Grid container spacing={3}>
        {/* Hints Section */}
        <Grid item xs={12}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              Hints
            </Typography>
            
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <TextField
                label="Add Hint"
                value={newHint}
                onChange={(e) => onSetNewHint(e.target.value)}
                fullWidth
                placeholder="Enter a hint to help students..."
              />
              <Button
                startIcon={<AddIcon />}
                variant="outlined"
                onClick={onAddHint}
                disabled={!newHint.trim()}
              >
                Add
              </Button>
            </Box>
            
            {formData.hints.length > 0 && (
              <List dense>
                {formData.hints.map((hint, index) => (
                  <ListItem key={index} sx={{ bgcolor: 'background.default', mb: 0.5, borderRadius: 1 }}>
                    <ListItemText primary={hint} />
                    <ListItemSecondaryAction>
                      <IconButton edge="end" onClick={() => onRemoveHint(index)} color="error">
                        <DeleteIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            )}
          </Paper>
        </Grid>
        
        {/* Tags Section */}
        <Grid item xs={12} sm={6}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              Tags
            </Typography>
            
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <TextField
                label="Add Tag"
                value={newTag}
                onChange={(e) => onSetNewTag(e.target.value)}
                fullWidth
                placeholder="e.g., arrays, sorting, dp..."
              />
              <Button
                startIcon={<AddIcon />}
                variant="outlined"
                onClick={onAddTag}
                disabled={!newTag.trim()}
              >
                Add
              </Button>
            </Box>
            
            {formData.tags.length > 0 && (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {formData.tags.map((tag, index) => (
                  <Chip
                    key={index}
                    label={tag}
                    onDelete={() => onRemoveTag(index)}
                    color="primary"
                    variant="outlined"
                  />
                ))}
              </Box>
            )}
          </Paper>
        </Grid>
        
        {/* Companies Section */}
        <Grid item xs={12} sm={6}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              Companies
            </Typography>
            
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <TextField
                label="Add Company"
                value={newCompany}
                onChange={(e) => onSetNewCompany(e.target.value)}
                fullWidth
                placeholder="e.g., Google, Microsoft..."
              />
              <Button
                startIcon={<AddIcon />}
                variant="outlined"
                onClick={onAddCompany}
                disabled={!newCompany.trim()}
              >
                Add
              </Button>
            </Box>
            
            {formData.companies.length > 0 && (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {formData.companies.map((company, index) => (
                  <Chip
                    key={index}
                    label={company}
                    onDelete={() => onRemoveCompany(index)}
                    color="secondary"
                    variant="outlined"
                  />
                ))}
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
});

AdditionalDetailsTab.displayName = 'AdditionalDetailsTab';

export default AdditionalDetailsTab;