import React, { useState, useEffect } from 'react';
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
  CircularProgress,
  Alert,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  tableCellClasses,
  styled
} from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import PendingIcon from '@mui/icons-material/Pending';
import axios from 'axios';

// Styled components
const StyledTableCell = styled(TableCell)(({ theme, darkMode }) => ({
  [`&.${tableCellClasses.head}`]: {
    backgroundColor: darkMode ? '#1A1A1A' : '#f5f5f5',
    color: darkMode ? '#fff' : theme.palette.common.black,
    fontWeight: 'bold',
    fontSize: '0.85rem',
    padding: '12px 16px',
  },
  [`&.${tableCellClasses.body}`]: {
    fontSize: '0.8rem',
    padding: '12px 16px',
    borderBottom: darkMode ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(0, 0, 0, 0.08)',
  },
}));

const StyledTableRow = styled(TableRow)(({ theme, darkMode }) => ({
  '&:nth-of-type(even)': {
    backgroundColor: darkMode ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)',
  },
  '&:hover': {
    backgroundColor: darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
  },
}));

const QuestionReportCenter = ({ cohortId, questionId, darkMode }) => {
  const { token } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [responseText, setResponseText] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchReports();
  }, [cohortId, questionId, token]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `/cohorts/${cohortId}/questions/${questionId}/reports`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setReports(response.data || []);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching reports:', err);
      setError('Failed to load reports');
      setLoading(false);
    }
  };

  const handleViewReport = (report) => {
    setSelectedReport(report);
    setResponseText(report.response || '');
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedReport(null);
    setResponseText('');
  };

  const handleUpdateReportStatus = async (status) => {
    if (!selectedReport) return;

    try {
      await axios.patch(
        `/cohorts/${cohortId}/questions/${questionId}/reports/${selectedReport._id}`,
        {
          status,
          response: responseText
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      // Refresh reports
      await fetchReports();
      handleCloseDialog();
    } catch (err) {
      console.error('Error updating report:', err);
      alert('Failed to update report');
    }
  };

  const getStatusChip = (status) => {
    const configs = {
      pending: { color: '#ed6c02', bg: 'rgba(237, 108, 2, 0.1)', label: 'Pending', icon: <PendingIcon fontSize="small" /> },
      resolved: { color: '#2e7d32', bg: 'rgba(46, 125, 50, 0.1)', label: 'Resolved', icon: <CheckIcon fontSize="small" /> },
      dismissed: { color: '#d32f2f', bg: 'rgba(211, 47, 47, 0.1)', label: 'Dismissed', icon: <CloseIcon fontSize="small" /> }
    };

    const config = configs[status] || configs.pending;
    
    return (
      <Chip
        icon={config.icon}
        label={config.label}
        size="small"
        sx={{
          backgroundColor: config.bg,
          color: config.color,
          border: `1px solid ${config.color}`,
          fontSize: '0.75rem',
          height: '24px'
        }}
      />
    );
  };

  const filteredReports = statusFilter === 'all' 
    ? reports 
    : reports.filter(r => r.status === statusFilter);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Question Reports ({filteredReports.length})
        </Typography>
        
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Status Filter</InputLabel>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            label="Status Filter"
          >
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="pending">Pending</MenuItem>
            <MenuItem value="resolved">Resolved</MenuItem>
            <MenuItem value="dismissed">Dismissed</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {filteredReports.length === 0 ? (
        <Alert severity="info">
          No reports found for this question.
        </Alert>
      ) : (
        <TableContainer 
          component={Paper}
          sx={{ 
            flex: 1,
            overflow: 'auto',
            backgroundColor: darkMode ? '#121212' : '#fff',
            boxShadow: darkMode ? '0 2px 8px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.1)',
          }}
        >
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <StyledTableCell darkMode={darkMode}>Reported By</StyledTableCell>
                <StyledTableCell darkMode={darkMode}>Issue Type</StyledTableCell>
                <StyledTableCell darkMode={darkMode}>Description</StyledTableCell>
                <StyledTableCell darkMode={darkMode}>Status</StyledTableCell>
                <StyledTableCell darkMode={darkMode}>Reported At</StyledTableCell>
                <StyledTableCell darkMode={darkMode} align="center">Actions</StyledTableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredReports.map((report) => (
                <StyledTableRow key={report._id} darkMode={darkMode}>
                  <StyledTableCell darkMode={darkMode}>
                    {report.user?.name || 'Unknown User'}
                  </StyledTableCell>
                  <StyledTableCell darkMode={darkMode}>
                    <Chip 
                      label={report.issueType || 'General'} 
                      size="small"
                      sx={{ fontSize: '0.7rem' }}
                    />
                  </StyledTableCell>
                  <StyledTableCell darkMode={darkMode}>
                    <Typography variant="body2" sx={{ 
                      maxWidth: '300px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {report.description}
                    </Typography>
                  </StyledTableCell>
                  <StyledTableCell darkMode={darkMode}>
                    {getStatusChip(report.status)}
                  </StyledTableCell>
                  <StyledTableCell darkMode={darkMode}>
                    {new Date(report.createdAt).toLocaleDateString()}
                  </StyledTableCell>
                  <StyledTableCell darkMode={darkMode} align="center">
                    <IconButton
                      size="small"
                      onClick={() => handleViewReport(report)}
                      sx={{ color: '#0088CC' }}
                    >
                      <VisibilityIcon fontSize="small" />
                    </IconButton>
                  </StyledTableCell>
                </StyledTableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Report Detail Dialog */}
      <Dialog 
        open={dialogOpen} 
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Report Details</DialogTitle>
        <DialogContent>
          {selectedReport && (
            <Box sx={{ pt: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                Reported By:
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                {selectedReport.user?.name || 'Unknown User'}
              </Typography>

              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                Issue Type:
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                {selectedReport.issueType || 'General'}
              </Typography>

              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                Description:
              </Typography>
              <Typography variant="body2" sx={{ mb: 2, whiteSpace: 'pre-wrap' }}>
                {selectedReport.description}
              </Typography>

              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                Status:
              </Typography>
              <Box sx={{ mb: 2 }}>
                {getStatusChip(selectedReport.status)}
              </Box>

              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                Admin Response:
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={4}
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                placeholder="Enter your response..."
                sx={{ mb: 2 }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button 
            onClick={() => handleUpdateReportStatus('dismissed')}
            color="error"
            variant="outlined"
          >
            Dismiss
          </Button>
          <Button 
            onClick={() => handleUpdateReportStatus('resolved')}
            color="success"
            variant="contained"
          >
            Mark as Resolved
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default QuestionReportCenter;
