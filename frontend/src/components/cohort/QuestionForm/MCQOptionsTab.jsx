import React, { memo } from 'react';
import {
  Box,
  Typography,
  Alert,
  List,
  ListItem,
  TextField,
  IconButton,
  FormControlLabel,
  Radio,
  Button
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';

const MCQOptionsTab = memo(({ 
  formData,
  errors,
  onOptionChange,
  onAddOption,
  onRemoveOption
}) => {
  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Options
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Add multiple options and mark the correct one(s).
      </Typography>
      
      {errors.options && (
        <Alert severity="error" sx={{ mt: 1, mb: 2 }}>
          {errors.options}
        </Alert>
      )}
      
      {errors.optionsEmpty && (
        <Alert severity="error" sx={{ mt: 1, mb: 2 }}>
          {errors.optionsEmpty}
        </Alert>
      )}
      
      <List>
        {formData.options.map((option, index) => (
          <ListItem 
            key={index} 
            sx={{ 
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
              mb: 1
            }}
          >
            <FormControlLabel
              control={
                <Radio
                  checked={option.isCorrect}
                  onChange={() => onOptionChange(index, 'isCorrect', true)}
                  color="primary"
                />
              }
              label=""
            />
            
            <TextField
              value={option.text}
              onChange={(e) => onOptionChange(index, 'text', e.target.value)}
              fullWidth
              placeholder={`Option ${index + 1}`}
              variant="standard"
            />
            
            <IconButton 
              edge="end" 
              onClick={() => onRemoveOption(index)}
              disabled={formData.options.length <= 2}
              color="error"
            >
              <DeleteIcon />
            </IconButton>
          </ListItem>
        ))}
      </List>
      
      <Button
        startIcon={<AddIcon />}
        onClick={onAddOption}
        sx={{ mt: 1 }}
      >
        Add Option
      </Button>
    </Box>
  );
});

MCQOptionsTab.displayName = 'MCQOptionsTab';

export default MCQOptionsTab;
