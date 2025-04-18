import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Chip,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TablePagination,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  Badge,
  Stack,
  useTheme,
  useMediaQuery,
  Card,
  CardContent,
  Divider
} from '@mui/material';
import {
  BugReport as BugReportIcon,
  Error as ErrorIcon,
  Build as BuildIcon,
  FilterList as FilterListIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  Comment as CommentIcon,
  AccessTime as AccessTimeIcon,
  Person as PersonIcon,
  Star as StarIcon,
  ArrowUpward as ArrowUpwardIcon,
  Help as HelpIcon,
  MoreVert as MoreVertIcon,
  LightbulbOutlined as LightbulbIcon
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import axios from 'axios';
import { apiUrl } from '../config/apiConfig';

const ReportIssuesTab = ({ token, isMobile, theme }) => {
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  const [loading, setLoading] = useState(true);
  const [issues, setIssues] = useState([]);
  const [totalIssues, setTotalIssues] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentIssue, setCurrentIssue] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isResponseOpen, setIsResponseOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [adminResponse, setAdminResponse] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [anchorEl, setAnchorEl] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  
  // Stats
  const [stats, setStats] = useState({
    total: 0,
    new: 0,
    inProgress: 0,
    resolved: 0,
    bug: 0,
    feature: 0,
    improvement: 0,
    other: 0
  });
  
  // Fetch issues based on filters
  const fetchIssues = async () => {
    setLoading(true);
    
    try {
      // Build query params
      const params = new URLSearchParams();
      params.append('skip', page * rowsPerPage);
      params.append('limit', rowsPerPage);
      
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      
      if (typeFilter !== 'all') {
        params.append('type', typeFilter);
      }
      
      const response = await axios.get(`${apiUrl}/issues?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data && response.data.success) {
        // Filter issues by search query if provided
        let filteredIssues = response.data.issues;
        
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase();
          filteredIssues = filteredIssues.filter(issue => 
            issue.description.toLowerCase().includes(query) ||
            issue.user?.name?.toLowerCase().includes(query) ||
            issue.user?.email?.toLowerCase().includes(query) ||
            issue.page.toLowerCase().includes(query)
          );
        }
        
        setIssues(filteredIssues);
        setTotalIssues(response.data.total);
        
        // Calculate stats
        calculateStats(response.data.issues);
      }
    } catch (error) {
      toast.error('Failed to fetch reported issues');
    } finally {
      setLoading(false);
    }
  };
  
  // Calculate stats for the dashboard
  const calculateStats = (issuesData) => {
    const newStats = {
      total: totalIssues,
      new: 0,
      inProgress: 0,
      resolved: 0,
      rejected: 0,
      bug: 0,
      feature: 0,
      improvement: 0,
      other: 0
    };
    
    // Count issues by status and type
    issuesData.forEach(issue => {
      // Count by status
      if (issue.status === 'new') newStats.new++;
      else if (issue.status === 'in_progress') newStats.inProgress++;
      else if (issue.status === 'resolved') newStats.resolved++;
      else if (issue.status === 'rejected') newStats.rejected++;
      
      // Count by type
      if (issue.type === 'bug') newStats.bug++;
      else if (issue.type === 'feature') newStats.feature++;
      else if (issue.type === 'improvement') newStats.improvement++;
      else if (issue.type === 'other') newStats.other++;
    });
    
    setStats(newStats);
  };
  
  // Handle pagination change
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };
  
  // Handle rows per page change
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };
  
  // Open issue details
  const handleOpenDetails = (issue) => {
    setCurrentIssue(issue);
    setIsDetailsOpen(true);
  };
  
  // Close issue details
  const handleCloseDetails = () => {
    setIsDetailsOpen(false);
  };
  
  // Open response dialog
  const handleOpenResponse = (issue) => {
    setCurrentIssue(issue);
    setAdminResponse(issue.adminResponse || '');
    setIsResponseOpen(true);
    setAnchorEl(null);
  };
  
  // Close response dialog
  const handleCloseResponse = () => {
    setIsResponseOpen(false);
    setAdminResponse('');
  };
  
  // Submit admin response
  const handleSubmitResponse = async () => {
    try {
      const response = await axios.put(`${apiUrl}/issues/${currentIssue._id}`, {
        adminResponse,
        status: 'in_progress'
      }, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data && response.data.success) {
        toast.success('Response submitted successfully');
        
        // Update the issue in state
        setIssues(prevIssues => 
          prevIssues.map(issue => 
            issue._id === currentIssue._id
              ? { ...issue, adminResponse, status: 'in_progress' }
              : issue
          )
        );
        
        handleCloseResponse();
        fetchIssues(); // Refresh issues to get updated stats
      }
    } catch (error) {
      toast.error('Failed to submit response');
    }
  };
  
  // Open delete confirmation
  const handleOpenDelete = (issue) => {
    setCurrentIssue(issue);
    setIsDeleteOpen(true);
    setAnchorEl(null);
  };
  
  // Close delete confirmation
  const handleCloseDelete = () => {
    setIsDeleteOpen(false);
  };
  
  // Delete issue
  const handleDeleteIssue = async () => {
    try {
      const response = await axios.delete(`${apiUrl}/issues/${currentIssue._id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data && response.data.success) {
        toast.success('Issue deleted successfully');
        
        // Remove the issue from state
        setIssues(prevIssues => 
          prevIssues.filter(issue => issue._id !== currentIssue._id)
        );
        
        setTotalIssues(prev => prev - 1);
        handleCloseDelete();
      }
    } catch (error) {
      toast.error('Failed to delete issue');
    }
  };
  
  // Update issue status
  const handleUpdateStatus = async (issueId, newStatus) => {
    try {
      const response = await axios.put(`${apiUrl}/issues/${issueId}`, {
        status: newStatus
      }, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data && response.data.success) {
        toast.success(`Issue marked as ${newStatus.replace('_', ' ')}`);
        
        // Update the issue in state
        setIssues(prevIssues => 
          prevIssues.map(issue => 
            issue._id === issueId
              ? { ...issue, status: newStatus }
              : issue
          )
        );
        
        setAnchorEl(null);
        fetchIssues(); // Refresh issues to get updated stats
      }
    } catch (error) {
      toast.error('Failed to update issue status');
    }
  };
  
  // Open menu
  const handleMenuOpen = (event, issue) => {
    setCurrentIssue(issue);
    setAnchorEl(event.currentTarget);
  };
  
  // Close menu
  const handleMenuClose = () => {
    setAnchorEl(null);
  };
  
  // Get status chip based on status value
  const renderStatusChip = (status) => {
    switch (status) {
      case 'new':
        return (
          <Chip 
            label="New" 
            size="small" 
            color="error" 
            sx={{ fontWeight: 'medium' }}
          />
        );
      case 'in_progress':
        return (
          <Chip 
            label="In Progress" 
            size="small" 
            color="warning" 
            sx={{ fontWeight: 'medium' }}
          />
        );
      case 'resolved':
        return (
          <Chip 
            label="Resolved" 
            size="small" 
            color="success" 
            sx={{ fontWeight: 'medium' }}
          />
        );
      case 'rejected':
        return (
          <Chip 
            label="Rejected" 
            size="small" 
            color="default" 
            sx={{ fontWeight: 'medium' }}
          />
        );
      default:
        return null;
    }
  };
  
  // Get type chip based on type value
  const renderTypeChip = (type) => {
    switch (type) {
      case 'bug':
        return (
          <Chip 
            icon={<BugReportIcon fontSize="small" />} 
            label="Bug" 
            size="small" 
            variant="outlined" 
            color="error"
          />
        );
      case 'feature':
        return (
          <Chip 
            icon={<StarIcon fontSize="small" />} 
            label="Feature" 
            size="small" 
            variant="outlined" 
            color="primary"
          />
        );
      case 'improvement':
        return (
          <Chip 
            icon={<ArrowUpwardIcon fontSize="small" />} 
            label="Improvement" 
            size="small" 
            variant="outlined" 
            color="secondary"
          />
        );
      case 'other':
        return (
          <Chip 
            icon={<HelpIcon fontSize="small" />} 
            label="Other" 
            size="small" 
            variant="outlined" 
            color="default"
          />
        );
      default:
        return null;
    }
  };
  
  // Format date string
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };
  
  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    
    // Apply filters based on tab
    switch (newValue) {
      case 0: // All
        setStatusFilter('all');
        break;
      case 1: // New
        setStatusFilter('new');
        break;
      case 2: // In Progress
        setStatusFilter('in_progress');
        break;
      case 3: // Resolved
        setStatusFilter('resolved');
        break;
      default:
        setStatusFilter('all');
    }
    
    setPage(0); // Reset to first page
  };
  
  // Initial data fetch
  useEffect(() => {
    fetchIssues();
  }, [page, rowsPerPage, statusFilter, typeFilter, token]);
  
  // Effect for search with debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchIssues();
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);
  
  return (
    <Box>
      {/* Dashboard Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card 
            elevation={0} 
            sx={{ 
              borderRadius: 2, 
              overflow: 'hidden',
              border: `1px solid ${theme.palette.divider}` 
            }}
          >
            <Box sx={{ height: 5, bgcolor: theme.palette.primary.main }}></Box>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <BugReportIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="body2" color="text.secondary">
                  Total Issues
                </Typography>
              </Box>
              <Typography variant="h4" fontWeight="bold">
                {totalIssues}
              </Typography>
              <Box sx={{ mt: 1, display: 'flex', alignItems: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  {stats.new} new issues
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card 
            elevation={0} 
            sx={{ 
              borderRadius: 2, 
              overflow: 'hidden',
              border: `1px solid ${theme.palette.divider}` 
            }}
          >
            <Box sx={{ height: 5, bgcolor: theme.palette.error.main }}></Box>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <ErrorIcon color="error" sx={{ mr: 1 }} />
                <Typography variant="body2" color="text.secondary">
                  Bug Reports
                </Typography>
              </Box>
              <Typography variant="h4" fontWeight="bold">
                {stats.bug}
              </Typography>
              <Box sx={{ mt: 1, display: 'flex', alignItems: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  {Math.round((stats.bug / totalIssues || 0) * 100)}% of all issues
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card 
            elevation={0} 
            sx={{ 
              borderRadius: 2, 
              overflow: 'hidden',
              border: `1px solid ${theme.palette.divider}` 
            }}
          >
            <Box sx={{ height: 5, bgcolor: theme.palette.secondary.main }}></Box>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <LightbulbIcon color="secondary" sx={{ mr: 1 }} />
                <Typography variant="body2" color="text.secondary">
                  Feature Requests
                </Typography>
              </Box>
              <Typography variant="h4" fontWeight="bold">
                {stats.feature}
              </Typography>
              <Box sx={{ mt: 1, display: 'flex', alignItems: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  {Math.round((stats.feature / totalIssues || 0) * 100)}% of all issues
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card 
            elevation={0} 
            sx={{ 
              borderRadius: 2, 
              overflow: 'hidden',
              border: `1px solid ${theme.palette.divider}` 
            }}
          >
            <Box sx={{ height: 5, bgcolor: theme.palette.success.main }}></Box>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <CheckCircleIcon color="success" sx={{ mr: 1 }} />
                <Typography variant="body2" color="text.secondary">
                  Resolved Issues
                </Typography>
              </Box>
              <Typography variant="h4" fontWeight="bold">
                {stats.resolved}
              </Typography>
              <Box sx={{ mt: 1, display: 'flex', alignItems: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  Resolution rate: {Math.round((stats.resolved / totalIssues || 0) * 100)}%
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      {/* Filters and Tabs */}
      <Paper 
        elevation={0} 
        sx={{ 
          p: { xs: 2, md: 3 }, 
          mb: 3, 
          borderRadius: 2,
          border: `1px solid ${theme.palette.divider}` 
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' }, mb: 2 }}>
          <Typography variant="h6" fontWeight="bold" sx={{ mb: { xs: 2, sm: 0 } }}>
            <BugReportIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Reported Issues
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              size="small"
              placeholder="Search issues..."
              variant="outlined"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
              }}
              sx={{ width: { xs: '100%', sm: '200px' } }}
            />
            
            <Tooltip title="Refresh issues">
              <IconButton onClick={fetchIssues} disabled={loading} color="primary" size="small">
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
        
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs 
            value={activeTab} 
            onChange={handleTabChange}
            variant={isMobile ? "scrollable" : "standard"}
            scrollButtons="auto"
            allowScrollButtonsMobile
            sx={{ '& .MuiTab-root': { minWidth: '80px' } }}
          >
            <Tab 
              label={
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  All
                  <Badge 
                    badgeContent={totalIssues} 
                    color="primary" 
                    sx={{ ml: 1 }}
                    max={999}
                  />
                </Box>
              } 
            />
            <Tab 
              label={
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  New
                  <Badge 
                    badgeContent={stats.new} 
                    color="error" 
                    sx={{ ml: 1 }}
                    max={999}
                  />
                </Box>
              } 
            />
            <Tab 
              label={
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  In Progress
                  <Badge 
                    badgeContent={stats.inProgress} 
                    color="warning" 
                    sx={{ ml: 1 }}
                    max={999}
                  />
                </Box>
              } 
            />
            <Tab 
              label={
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  Resolved
                  <Badge 
                    badgeContent={stats.resolved} 
                    color="success" 
                    sx={{ ml: 1 }}
                    max={999}
                  />
                </Box>
              } 
            />
          </Tabs>
        </Box>
        
        <Box sx={{ display: 'flex', mt: 2, mb: 2, alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <FormControl variant="outlined" size="small" sx={{ minWidth: 150 }}>
            <InputLabel id="type-filter-label">Filter by Type</InputLabel>
            <Select
              labelId="type-filter-label"
              id="type-filter"
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(0);
              }}
              label="Filter by Type"
            >
              <MenuItem value="all">All Types</MenuItem>
              <MenuItem value="bug">Bug Reports</MenuItem>
              <MenuItem value="feature">Feature Requests</MenuItem>
              <MenuItem value="improvement">Improvements</MenuItem>
              <MenuItem value="other">Other</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Paper>
      
      {/* Issue List Table */}
      <Paper 
        elevation={0} 
        sx={{ 
          borderRadius: 2,
          overflow: 'hidden',
          border: `1px solid ${theme.palette.divider}` 
        }}
      >
        <TableContainer sx={{ maxHeight: 600 }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell width="15%">Type</TableCell>
                <TableCell width="15%">Status</TableCell>
                <TableCell width="20%">Reported By</TableCell>
                <TableCell width="15%">Page</TableCell>
                <TableCell width="20%">Reported On</TableCell>
                <TableCell width="15%" align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                    <CircularProgress size={30} />
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      Loading reported issues...
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : issues.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                    <Typography variant="body1">
                      No issues found matching the current filters.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                issues.map(issue => (
                  <TableRow 
                    key={issue._id} 
                    hover 
                    sx={{ 
                      cursor: 'pointer',
                      '&:hover': { bgcolor: theme.palette.action.hover }
                    }}
                    onClick={() => handleOpenDetails(issue)}
                  >
                    <TableCell>{renderTypeChip(issue.type)}</TableCell>
                    <TableCell>{renderStatusChip(issue.status)}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <PersonIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                            {issue.user?.name || 'Unknown User'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {issue.user?.email || 'No email provided'}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={issue.page} 
                        size="small" 
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <AccessTimeIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                        <Typography variant="body2">
                          {formatDate(issue.createdAt)}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                        {issue.adminResponse ? (
                          <Tooltip title="View Response">
                            <IconButton 
                              size="small" 
                              color="primary"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenResponse(issue);
                              }}
                            >
                              <CommentIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        ) : (
                          <Tooltip title="Add Response">
                            <IconButton 
                              size="small" 
                              color="primary"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenResponse(issue);
                              }}
                            >
                              <CommentIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        
                        <Tooltip title="More Actions">
                          <IconButton 
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMenuOpen(e, issue);
                            }}
                          >
                            <MoreVertIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        
        {/* Table Pagination */}
        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={totalIssues}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>
      
      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        {currentIssue?.status !== 'resolved' && (
          <MenuItem 
            onClick={() => handleUpdateStatus(currentIssue?._id, 'resolved')}
            sx={{ color: theme.palette.success.main }}
          >
            <CheckCircleIcon fontSize="small" sx={{ mr: 1 }} />
            Mark as Resolved
          </MenuItem>
        )}
        
        {currentIssue?.status !== 'in_progress' && currentIssue?.status !== 'resolved' && (
          <MenuItem 
            onClick={() => handleUpdateStatus(currentIssue?._id, 'in_progress')}
            sx={{ color: theme.palette.warning.main }}
          >
            <BuildIcon fontSize="small" sx={{ mr: 1 }} />
            Mark as In Progress
          </MenuItem>
        )}
        
        <MenuItem 
          onClick={() => handleOpenResponse(currentIssue)}
          sx={{ color: theme.palette.primary.main }}
        >
          <CommentIcon fontSize="small" sx={{ mr: 1 }} />
          {currentIssue?.adminResponse ? 'Edit Response' : 'Add Response'}
        </MenuItem>
        
        <Divider />
        
        <MenuItem 
          onClick={() => handleOpenDelete(currentIssue)}
          sx={{ color: theme.palette.error.main }}
        >
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
          Delete Issue
        </MenuItem>
      </Menu>
      
      {/* Issue Details Dialog */}
      <Dialog
        open={isDetailsOpen}
        onClose={handleCloseDetails}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <BugReportIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
              <Typography variant="h6" component="span">
                Issue Details
              </Typography>
            </Box>
            
            {currentIssue && renderStatusChip(currentIssue.status)}
          </Box>
        </DialogTitle>
        
        <DialogContent sx={{ pt: 2 }}>
          {currentIssue && (
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Reported By
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 'medium', mb: 2 }}>
                  {currentIssue.user?.name || 'Unknown User'}
                </Typography>
                
                <Typography variant="subtitle2" color="text.secondary">
                  Email
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {currentIssue.user?.email || 'No email provided'}
                </Typography>
                
                <Typography variant="subtitle2" color="text.secondary">
                  Department
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {currentIssue.user?.department || 'Not specified'}
                </Typography>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Issue Type
                </Typography>
                <Box sx={{ mb: 2 }}>
                  {renderTypeChip(currentIssue.type)}
                </Box>
                
                <Typography variant="subtitle2" color="text.secondary">
                  Page / Section
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {currentIssue.page}
                </Typography>
                
                <Typography variant="subtitle2" color="text.secondary">
                  Reported On
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {formatDate(currentIssue.createdAt)}
                </Typography>
              </Grid>
              
              <Grid item xs={12}>
                <Divider sx={{ my: 1 }} />
                
                <Typography variant="subtitle2" color="text.secondary">
                  Description
                </Typography>
                <Paper
                  variant="outlined"
                  sx={{ 
                    p: 2, 
                    mt: 1, 
                    mb: 2, 
                    bgcolor: theme.palette.background.default,
                    minHeight: '100px'
                  }}
                >
                  <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                    {currentIssue.description}
                  </Typography>
                </Paper>
                
                {currentIssue.adminResponse && (
                  <>
                    <Typography variant="subtitle2" color="text.secondary">
                      Admin Response
                    </Typography>
                    <Paper
                      variant="outlined"
                      sx={{ 
                        p: 2, 
                        mt: 1, 
                        bgcolor: theme.palette.primary.light,
                        minHeight: '80px',
                        border: `1px solid ${theme.palette.primary.light}`
                      }}
                    >
                      <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                        {currentIssue.adminResponse}
                      </Typography>
                    </Paper>
                    
                    {currentIssue.resolvedBy && (
                      <Typography variant="caption" sx={{ display: 'block', mt: 1, textAlign: 'right' }}>
                        Response from: {currentIssue.resolvedBy.name || 'Admin'}
                      </Typography>
                    )}
                  </>
                )}
              </Grid>
            </Grid>
          )}
        </DialogContent>
        
        <DialogActions sx={{ px: 3, pb: 2 }}>
          {currentIssue && currentIssue.status !== 'resolved' && (
            <Button 
              color="success" 
              variant="outlined"
              startIcon={<CheckCircleIcon />}
              onClick={() => {
                handleUpdateStatus(currentIssue._id, 'resolved');
                handleCloseDetails();
              }}
            >
              Mark as Resolved
            </Button>
          )}
          
          <Button 
            color="primary" 
            variant="outlined"
            startIcon={<CommentIcon />}
            onClick={() => {
              handleOpenResponse(currentIssue);
              handleCloseDetails();
            }}
          >
            {currentIssue?.adminResponse ? 'Edit Response' : 'Add Response'}
          </Button>
          
          <Button onClick={handleCloseDetails}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Response Dialog */}
      <Dialog
        open={isResponseOpen}
        onClose={handleCloseResponse}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <CommentIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
            <Typography variant="h6" component="span">
              {currentIssue?.adminResponse ? 'Edit Response' : 'Add Response'}
            </Typography>
          </Box>
        </DialogTitle>
        
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Your response will be visible to the user who reported this issue.
          </DialogContentText>
          
          <TextField
            autoFocus
            multiline
            rows={6}
            fullWidth
            variant="outlined"
            label="Admin Response"
            placeholder="Enter your response to this issue..."
            value={adminResponse}
            onChange={(e) => setAdminResponse(e.target.value)}
          />
        </DialogContent>
        
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleCloseResponse}>
            Cancel
          </Button>
          <Button 
            color="primary" 
            variant="contained"
            onClick={handleSubmitResponse}
            disabled={!adminResponse.trim()}
          >
            Submit Response
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog
        open={isDeleteOpen}
        onClose={handleCloseDelete}
      >
        <DialogTitle>
          Delete Issue
        </DialogTitle>
        
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this issue? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={handleCloseDelete}>
            Cancel
          </Button>
          <Button 
            color="error" 
            variant="contained"
            onClick={handleDeleteIssue}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ReportIssuesTab; 