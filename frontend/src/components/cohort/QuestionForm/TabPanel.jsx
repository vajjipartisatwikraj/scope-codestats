import React from 'react';
import { Box } from '@mui/material';

// Tab panel component
const TabPanel = ({ children, value, index, ...other }) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`question-form-tabpanel-${index}`}
      aria-labelledby={`question-form-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ py: 2 }}>
          {children}
        </Box>
      )}
    </div>
  );
};

export default TabPanel;
