import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, Tooltip, CircularProgress } from '@mui/material';
import { SyncOutlined } from '@mui/icons-material';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { apiUrl } from '../config/apiConfig';

const SyncTimer = ({ onSyncRequired }) => {
  const [syncInfo, setSyncInfo] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [autoSyncTriggered, setAutoSyncTriggered] = useState(false);
  const auth = useAuth();

  // Format time remaining as HH:MM:SS
  const formatTimeRemaining = (ms) => {
    if (!ms) return '00:00:00';
    
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    return [hours, minutes, seconds]
      .map(v => v < 10 ? `0${v}` : v)
      .join(':');
  };

  // Fetch sync info from the server
  const fetchSyncInfo = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${apiUrl}/profiles/sync-info`, {
        headers: { Authorization: `Bearer ${auth.token}` }
      });
      
      setSyncInfo(response.data);
      setTimeRemaining(response.data.timeRemaining);
      setError(null);
    } catch (err) {
      console.error('Error fetching sync info:', err);
      setError('Could not fetch sync information');
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    if (auth?.token) {
      fetchSyncInfo();
    }
  }, [auth?.token]);

  // Determine if it's time to auto-sync (midnight)
  const shouldAutoSync = () => {
    if (!syncInfo) return false;
    
    const now = new Date();
    const nextSync = new Date(syncInfo.nextSync);
    
    // Check if we're within 1 minute of the scheduled sync time
    const timeDifference = Math.abs(nextSync - now);
    return timeDifference < 60000; // Within 1 minute of sync time
  };

  // Generate tooltip content with sync details
  const getTooltipContent = () => {
    if (!syncInfo) return "Profiles auto-sync daily at 5:25 PM IST";
    
    let content = `Profiles auto-sync daily at 5:25 PM IST`;
    
    if (syncInfo.lastSync) {
      const lastSyncDate = new Date(syncInfo.lastSync);
      content += `\nLast sync: ${lastSyncDate.toLocaleDateString()} at ${lastSyncDate.toLocaleTimeString()}`;
      
      if (syncInfo.syncStats) {
        const { totalProfiles, successfulUpdates, failedUpdates } = syncInfo.syncStats;
        content += `\nProfiles updated: ${successfulUpdates}/${totalProfiles} (${failedUpdates} failed)`;
      }
    } else {
      content += "\nNo sync has occurred yet";
    }
    
    const nextSyncDate = new Date(syncInfo.nextSync);
    content += `\nNext sync: ${nextSyncDate.toLocaleDateString()} at ${nextSyncDate.toLocaleTimeString()}`;
    
    return content;
  };

  // Update timer every second and check for auto-sync
  useEffect(() => {
    if (timeRemaining === null) return;
    
    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1000) {
          // When timer reaches zero, refresh the sync info
          fetchSyncInfo();
          
          // If it's midnight (auto-sync time) and we haven't triggered the sync yet
          if (shouldAutoSync() && !autoSyncTriggered && onSyncRequired) {
            console.log('Auto-sync triggered at:', new Date().toISOString());
            setAutoSyncTriggered(true);
            onSyncRequired(); // Call the sync function
            
            // Reset the flag after some time
            setTimeout(() => {
              setAutoSyncTriggered(false);
            }, 5 * 60 * 1000); // Reset after 5 minutes
          }
          
          return 0;
        }
        return prev - 1000;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [timeRemaining, syncInfo, autoSyncTriggered, onSyncRequired]);

  if (loading) {
    return null;
  }

  if (error) {
    return null;
  }

  return (
    <Tooltip 
      title={getTooltipContent()}
      placement="top"
      arrow
    >
      <Paper 
        elevation={1} 
        sx={{
          py: 1,
          px: 2,
          borderRadius: 1,
          display: 'inline-flex',
          alignItems: 'center',
          bgcolor: 'rgba(0,0,0,0.3)',
          border: '1px solid rgba(255,255,255,0.1)',
          maxWidth: 'fit-content'
        }}
      >
        <SyncOutlined 
          fontSize="small" 
          color="primary" 
          sx={{ mr: 1.5, opacity: 0.8 }} 
        />
        <Typography 
          variant="body2" 
          sx={{ 
            fontFamily: 'monospace',
            fontWeight: 'medium',
            color: '#0088cc'
          }}
        >
          {formatTimeRemaining(timeRemaining)}
        </Typography>
      </Paper>
    </Tooltip>
  );
};

export default SyncTimer; 