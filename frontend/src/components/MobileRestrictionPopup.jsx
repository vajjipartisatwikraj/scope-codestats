import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Button,
  Box,
  useTheme,
  alpha,
  IconButton
} from '@mui/material';
import {
  PhoneAndroid as PhoneIcon,
  Computer as ComputerIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { useTheme as useAppTheme } from '../contexts/ThemeContext';

const MobileRestrictionPopup = ({ open, onClose, pageName = "this feature" }) => {
  const theme = useTheme();
  const { darkMode } = useAppTheme();

  // Liquid Glass UI styles for dark mode
  const liquidGlassStyles = {
    backdropFilter: 'blur(20px)',
    background: darkMode 
      ? 'linear-gradient(145deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05))'
      : 'linear-gradient(145deg, rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.7))',
    border: darkMode 
      ? '1px solid rgba(255, 255, 255, 0.2)' 
      : '1px solid rgba(0, 0, 0, 0.1)',
    borderRadius: '20px',
    boxShadow: darkMode
      ? '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
      : '0 8px 32px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
  };

  // Professional styles for light mode
  const professionalStyles = {
    background: darkMode
      ? 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)'
      : 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
    border: darkMode 
      ? '1px solid rgba(255, 255, 255, 0.1)' 
      : '1px solid rgba(0, 0, 0, 0.08)',
    borderRadius: '16px',
    boxShadow: darkMode
      ? '0 20px 40px rgba(0, 0, 0, 0.3)'
      : '0 20px 40px rgba(0, 0, 0, 0.08)',
  };

  const dialogStyles = darkMode ? liquidGlassStyles : professionalStyles;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          ...dialogStyles,
          overflow: 'hidden',
          position: 'relative',
          '&::before': darkMode ? {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'linear-gradient(45deg, rgba(0, 136, 204, 0.1), rgba(0, 136, 204, 0.05))',
            zIndex: -1,
          } : {},
        }
      }}
      BackdropProps={{
        sx: {
          backdropFilter: 'blur(8px)',
          backgroundColor: darkMode 
            ? 'rgba(0, 0, 0, 0.7)' 
            : 'rgba(0, 0, 0, 0.4)',
        }
      }}
    >
      {/* Close Button */}
      <IconButton
        onClick={onClose}
        sx={{
          position: 'absolute',
          right: 12,
          top: 12,
          zIndex: 1,
          color: darkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)',
          '&:hover': {
            color: darkMode ? '#ffffff' : '#000000',
            backgroundColor: darkMode 
              ? 'rgba(255, 255, 255, 0.1)' 
              : 'rgba(0, 0, 0, 0.05)',
          }
        }}
      >
        <CloseIcon />
      </IconButton>

      <DialogTitle component="div" sx={{ 
        textAlign: 'center', 
        pt: 4, 
        pb: 2,
        px: 4
      }}>
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          mb: 2 
        }}>
          <Box sx={{ 
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {/* Desktop Icon */}
            <ComputerIcon 
              sx={{ 
                fontSize: '4rem',
                color: darkMode ? '#0088CC' : '#0066CC',
                filter: darkMode 
                  ? 'drop-shadow(0 0 20px rgba(0, 136, 204, 0.5))'
                  : 'drop-shadow(0 4px 8px rgba(0, 102, 204, 0.3))',
                position: 'relative',
                zIndex: 2
              }} 
            />
            
            {/* Mobile Icon with prohibition sign */}
            <Box sx={{ 
              position: 'absolute',
              right: -10,
              bottom: -10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 40,
              height: 40,
              borderRadius: '50%',
              backgroundColor: darkMode 
                ? 'rgba(244, 67, 54, 0.2)' 
                : 'rgba(244, 67, 54, 0.1)',
              border: darkMode 
                ? '2px solid rgba(244, 67, 54, 0.6)' 
                : '2px solid rgba(244, 67, 54, 0.4)',
              backdropFilter: darkMode ? 'blur(10px)' : 'none',
            }}>
              <PhoneIcon sx={{ 
                fontSize: '1.5rem',
                color: '#f44336',
                position: 'relative'
              }} />
              {/* Prohibition line */}
              <Box sx={{
                position: 'absolute',
                width: '140%',
                height: '3px',
                backgroundColor: '#f44336',
                transform: 'rotate(-45deg)',
                borderRadius: '2px',
                boxShadow: darkMode 
                  ? '0 0 10px rgba(244, 67, 54, 0.5)'
                  : '0 2px 4px rgba(244, 67, 54, 0.3)',
              }} />
            </Box>
          </Box>
        </Box>
        
        <Typography 
          variant="h4" 
          component="h2" 
          sx={{ 
            fontWeight: 700,
            fontSize: '2rem',
            background: darkMode
              ? 'linear-gradient(45deg, #ffffff, #e0e0e0)'
              : 'linear-gradient(45deg, #1a1a1a, #333333)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            mb: 1,
            textAlign: 'center'
          }}
        >
          Desktop Only
        </Typography>
        
        <Typography 
          variant="subtitle1" 
          sx={{ 
            color: darkMode ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 0, 0, 0.7)',
            fontWeight: 500,
            fontSize: '1.1rem'
          }}
        >
          {pageName}
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ 
        textAlign: 'center', 
        px: 4, 
        pb: 2 
      }}>
        <Typography 
          variant="body1" 
          sx={{ 
            color: darkMode ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.8)',
            lineHeight: 1.6,
            fontSize: '1rem',
            mb: 2
          }}
        >
          This feature is optimized for desktop and larger screens to provide the best coding and learning experience.
        </Typography>
        
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column',
          gap: 1,
          p: 3,
          borderRadius: '12px',
          backgroundColor: darkMode 
            ? 'rgba(0, 136, 204, 0.1)' 
            : 'rgba(0, 136, 204, 0.05)',
          border: darkMode 
            ? '1px solid rgba(0, 136, 204, 0.3)' 
            : '1px solid rgba(0, 136, 204, 0.2)',
          backdropFilter: darkMode ? 'blur(10px)' : 'none',
        }}>
          <Typography 
            variant="body2" 
            sx={{ 
              color: darkMode ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 0, 0, 0.7)',
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: 1
            }}
          >
            <Box 
              component="span" 
              sx={{ 
                width: 6, 
                height: 6, 
                borderRadius: '50%', 
                backgroundColor: darkMode ? '#0088CC' : '#0066CC' 
              }} 
            />
            Better code editor experience
          </Typography>
          <Typography 
            variant="body2" 
            sx={{ 
              color: darkMode ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 0, 0, 0.7)',
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: 1
            }}
          >
            <Box 
              component="span" 
              sx={{ 
                width: 6, 
                height: 6, 
                borderRadius: '50%', 
                backgroundColor: darkMode ? '#0088CC' : '#0066CC' 
              }} 
            />
            Enhanced problem-solving interface
          </Typography>
          <Typography 
            variant="body2" 
            sx={{ 
              color: darkMode ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 0, 0, 0.7)',
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: 1
            }}
          >
            <Box 
              component="span" 
              sx={{ 
                width: 6, 
                height: 6, 
                borderRadius: '50%', 
                backgroundColor: darkMode ? '#0088CC' : '#0066CC' 
              }} 
            />
            Full feature accessibility
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions sx={{ 
        justifyContent: 'center', 
        px: 4, 
        pb: 4 
      }}>
        <Button
          onClick={onClose}
          variant="contained"
          size="large"
          sx={{
            background: darkMode
              ? 'linear-gradient(45deg, #0088CC, #0066AA)'
              : 'linear-gradient(45deg, #0066CC, #004499)',
            color: '#ffffff',
            borderRadius: '12px',
            px: 4,
            py: 1.5,
            fontSize: '1rem',
            fontWeight: 600,
            textTransform: 'none',
            boxShadow: darkMode
              ? '0 8px 24px rgba(0, 136, 204, 0.4)'
              : '0 8px 24px rgba(0, 102, 204, 0.3)',
            '&:hover': {
              background: darkMode
                ? 'linear-gradient(45deg, #0077B6, #005577)'
                : 'linear-gradient(45deg, #005599, #003366)',
              transform: 'translateY(-2px)',
              boxShadow: darkMode
                ? '0 12px 32px rgba(0, 136, 204, 0.5)'
                : '0 12px 32px rgba(0, 102, 204, 0.4)',
            },
            transition: 'all 0.3s ease',
          }}
        >
          I Understand
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default MobileRestrictionPopup;
