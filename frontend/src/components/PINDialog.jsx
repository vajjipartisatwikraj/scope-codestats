import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  IconButton,
  InputAdornment
} from '@mui/material';
import {
  Lock as LockIcon,
  Visibility,
  VisibilityOff
} from '@mui/icons-material';

const PINDialog = ({ open, onClose, onSubmit, mode = 'decrypt', error }) => {
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);

  const handleSubmit = () => {
    if (pin.trim()) {
      onSubmit(pin);
      setPin('');
    }
  };

  const handleClose = () => {
    setPin('');
    onClose();
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && pin.trim()) {
      handleSubmit();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '16px',
          bgcolor: 'background.paper'
        }
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box display="flex" alignItems="center" gap={1}>
          <LockIcon sx={{ color: '#0088CC' }} />
          <Typography variant="h6" fontWeight={600}>
            {mode === 'decrypt' ? 'Enter PIN to Paste' : 'Content Copied'}
          </Typography>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        {mode === 'decrypt' ? (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              This content is encrypted. Enter your PIN to decrypt and paste.
            </Typography>
            
            {error && (
              <Alert severity="error" sx={{ mb: 2, borderRadius: '8px' }}>
                {error}
              </Alert>
            )}
            
            <TextField
              fullWidth
              label="Enter PIN"
              type={showPin ? 'text' : 'password'}
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              onKeyPress={handleKeyPress}
              autoFocus
              placeholder="Enter your PIN"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPin(!showPin)}
                      edge="end"
                    >
                      {showPin ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '12px'
                }
              }}
            />
          </>
        ) : (
          <Alert severity="success" sx={{ borderRadius: '8px' }}>
            Code has been encrypted and copied to clipboard. Use your PIN to paste it later.
          </Alert>
        )}
      </DialogContent>
      
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button
          onClick={handleClose}
          sx={{
            borderRadius: '8px',
            textTransform: 'none'
          }}
        >
          Cancel
        </Button>
        {mode === 'decrypt' && (
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={!pin.trim()}
            sx={{
              borderRadius: '8px',
              textTransform: 'none',
              bgcolor: '#0088CC',
              '&:hover': {
                bgcolor: '#006699'
              }
            }}
          >
            Decrypt & Paste
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default PINDialog;
