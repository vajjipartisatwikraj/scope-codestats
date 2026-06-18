import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  IconButton,
  Divider,
  Grid,
  Alert,
  Tooltip,
  useTheme
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Refresh as RefreshIcon,
  BugReport as BugReportIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import axios from 'axios';
import { apiUrl } from '../../config/apiConfig';
import { toast } from 'react-toastify';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme as useAppTheme } from '../../contexts/ThemeContext';

const QuestionReports = () => {
  const { cohortId } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const { darkMode } = useAppTheme();
  const theme = useTheme();
  
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [adminResponse, setAdminResponse] = useState('');
  const [status, setStatus] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  // Status options
  const statusOptions = [
    { value: 'pending', label: 'Pending' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'resolved', label: 'Resolved' },
    { value: 'rejected', label: 'Rejected' }
  ];
  
  // Report type mapping
  const reportTypes = {
    test_case_issue: 'Test Case Issue',
    incorrect_question: 'Incorrect Question',
    constraints_issue: 'Constraints Issue',
    technical_issue: 'Technical Issue',
    other: 'Other Issue'
  };
  
  // Status color mapping
  const statusColors = {
    pending: {
      color: darkMode ? '#f0c000' : '#b45309',
      bgColor: darkMode ? 'rgba(240, 192, 0, 0.1)' : 'rgba(240, 192, 0, 0.1)'
    },
    in_progress: {
      color: darkMode ? '#0088cc' : '#0066b2',
      bgColor: darkMode ? 'rgba(0, 136, 204, 0.1)' : 'rgba(0, 136, 204, 0.1)'
    },
    resolved: {
      color: darkMode ? '#00c853' : '#2e7d32',
      bgColor: darkMode ? 'rgba(0, 200, 83, 0.1)' : 'rgba(0, 200, 83, 0.1)'
    },
    rejected: {
      color: darkMode ? '#ff5252' : '#d32f2f',
      bgColor: darkMode ? 'rgba(255, 82, 82, 0.1)' : 'rgba(255, 82, 82, 0.1)'
    }
  };
  
  // Fetch reports on component mount
  useEffect(() => {
    fetchReports();
  }, [cohortId]);
  
  // Fetch reports for this cohort
  const fetchReports = async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        `${apiUrl}/cohorts/${cohortId}/reports`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      setReports(response.data);
    } catch (error) {
      console.error('Error fetching reports:', error);
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };
  
  // Format date string
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };
  
  // Handle clicking on a report
  const handleClickReport = (report) => {
    setSelectedReport(report);
    setAdminResponse(report.adminResponse || '');
    setStatus(report.status);
    setOpenDialog(true);
  };
  
  // Close the dialog
  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedReport(null);
    setAdminResponse('');
    setStatus('');
  };
  
  // Update a report
  const handleUpdateReport = async () => {
    if (!selectedReport) return;
    
    setSubmitting(true);
    try {
      const response = await axios.put(
        `${apiUrl}/cohorts/${cohortId}/reports/${selectedReport._id}`,
        { status, adminResponse },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      toast.success('Report updated successfully');
      
      // Close dialog and refresh reports
      handleCloseDialog();
      fetchReports();
    } catch (error) {
      console.error('Error updating report:', error);
      toast.error('Failed to update report');
    } finally {
      setSubmitting(false);
    }
  };
  
  // Delete a report
  const handleDeleteReport = async (reportId) => {
    if (!window.confirm('Are you sure you want to delete this report? This action cannot be undone.')) {
      return;
    }
    
    setSubmitting(true);
    try {
      await axios.delete(
        `${apiUrl}/cohorts/${cohortId}/reports/${reportId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      toast.success('Report deleted successfully');
      
      // If deleting from dialog, close it
      if (selectedReport && selectedReport._id === reportId) {
        handleCloseDialog();
      }
      
      fetchReports(); // Refresh the reports list
    } catch (error) {
      console.error('Error deleting report:', error);
      toast.error('Failed to delete report');
    } finally {
      setSubmitting(false);
    }
  };
  
  // Navigate back to cohort page
  const handleBack = () => {
    navigate(`/cohorts/${cohortId}`);
  };

  // Render status chip based on status value
  const renderStatusChip = (status) => {
    const statusColor = statusColors[status] || {
      color: '#757575',
      bgColor: 'rgba(0, 0, 0, 0.1)'
    };
    
    return (
      <Chip
        label={status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
        sx={{
          color: statusColor.color,
          bgcolor: statusColor.bgColor,
          fontWeight: 500,
          fontSize: '0.75rem'
        }}
        size="small"
      />
    );
  };
  
  return (
    <Box sx={{ 
      p: 3, 
      maxWidth: '1200px', 
      mx: 'auto',
      minHeight: 'calc(100vh - 64px)',
      bgcolor: darkMode ? '#121212' : '#f5f7fa'
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton onClick={handleBack} sx={{ mr: 2 }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h5" component="h1">
          Question Reports
        </Typography>
        <Box sx={{ flexGrow: 1 }} />
        <Tooltip title="Refresh">
          <span>
            <IconButton onClick={fetchReports} disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </span>
        </Tooltip>
      </Box>
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
          <CircularProgress />
        </Box>
      ) : reports.length > 0 ? (
        <TableContainer component={Paper} sx={{ 
          bgcolor: darkMode ? '#1A1A1A' : '#FFFFFF',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
        }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>Question</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Module</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Issue Type</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Reported By</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Date</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {reports.map((report) => (
                <TableRow key={report._id} hover>
                  <TableCell>{report.question?.title || 'Unknown Question'}</TableCell>
                  <TableCell>{report.module?.title || 'Unknown Module'}</TableCell>
                  <TableCell>{reportTypes[report.reportType] || report.reportType}</TableCell>
                  <TableCell>{report.user?.name || 'Unknown User'}</TableCell>
                  <TableCell>{formatDate(report.createdAt)}</TableCell>
                  <TableCell>{renderStatusChip(report.status)}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button 
                        variant="outlined" 
                        size="small" 
                        onClick={() => handleClickReport(report)}
                      >
                        View
                      </Button>
                      <Button
                        variant="outlined"
                        color="error"
                        size="small"
                        onClick={() => handleDeleteReport(report._id)}
                        startIcon={<DeleteIcon />}
                      >
                        Delete
                      </Button>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Alert severity="info" sx={{ mt: 2 }}>
          No reports found for this cohort.
        </Alert>
      )}
      
      {/* Report Details Dialog */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        {selectedReport && (
          <>
            <DialogTitle>
              Report Details
            </DialogTitle>
            
            <DialogContent dividers>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="textSecondary">Question</Typography>
                  <Typography variant="body1" sx={{ mb: 2 }}>
                    {selectedReport.question?.title || 'Unknown Question'}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="textSecondary">Module</Typography>
                  <Typography variant="body1" sx={{ mb: 2 }}>
                    {selectedReport.module?.title || 'Unknown Module'}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="textSecondary">Issue Type</Typography>
                  <Typography variant="body1" sx={{ mb: 2 }}>
                    {reportTypes[selectedReport.reportType] || selectedReport.reportType}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="textSecondary">Reported By</Typography>
                  <Typography variant="body1" sx={{ mb: 2 }}>
                    {selectedReport.user?.name || 'Unknown User'} ({selectedReport.user?.email || ''})
                  </Typography>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="textSecondary">Date Reported</Typography>
                  <Typography variant="body1" sx={{ mb: 2 }}>
                    {formatDate(selectedReport.createdAt)}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="textSecondary">Current Status</Typography>
                  <Box sx={{ mb: 2 }}>
                    {renderStatusChip(selectedReport.status)}
                  </Box>
                </Grid>
                
                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="subtitle2" color="textSecondary">Description</Typography>
                  <Paper 
                    elevation={0}
                    sx={{ 
                      p: 2, 
                      mt: 1, 
                      mb: 2, 
                      bgcolor: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
                      whiteSpace: 'pre-wrap'
                    }}
                  >
                    {selectedReport.description}
                  </Paper>
                </Grid>
                
                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="subtitle1" sx={{ mb: 2 }}>Admin Response</Typography>
                  
                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel>Status</InputLabel>
                    <Select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      label="Status"
                    >
                      {statusOptions.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  
                  <TextField
                    label="Response"
                    multiline
                    rows={4}
                    fullWidth
                    value={adminResponse}
                    onChange={(e) => setAdminResponse(e.target.value)}
                    placeholder="Provide a response to this report..."
                  />
                </Grid>
              </Grid>
            </DialogContent>
            
            <DialogActions>
              <Button 
                onClick={() => handleDeleteReport(selectedReport._id)}
                variant="outlined"
                color="error"
                startIcon={<DeleteIcon />}
                disabled={submitting}
                sx={{ mr: 'auto' }}
              >
                Delete Report
              </Button>
              <Button onClick={handleCloseDialog} color="inherit">
                Cancel
              </Button>
              <Button
                onClick={handleUpdateReport}
                variant="contained"
                color="primary"
                disabled={submitting || status === selectedReport.status && adminResponse === selectedReport.adminResponse}
              >
                {submitting ? 'Updating...' : 'Update Report'}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default QuestionReports;