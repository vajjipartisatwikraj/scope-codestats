import React, { memo } from 'react';
import {
  Box,
  Typography,
  Alert,
  TextField,
  Button,
  FormControlLabel,
  Switch,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Grid,
  Paper,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  CloudUpload as CloudUploadIcon,
  PlayArrow as PlayArrowIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import { formatTime, formatMemory } from './utils';

const TestCasesTab = memo(({ 
  formData,
  errors,
  newTestCase,
  testCaseResults,
  isRunningTest,
  testCaseFileInputRef,
  isUploadingTestCases,
  onTestCaseChange,
  onAddTestCase,
  onRemoveTestCase,
  onToggleTestCaseVisibility,
  onTestCaseFileUpload,
  onTestCaseUploadButtonClick,
  onValidateAllTestCases
}) => {
  // Helper function to read file content
  const readFileContent = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(e);
      reader.readAsText(file);
    });
  };

  // Render test case results
  const renderTestCaseResults = () => {
    if (testCaseResults.length === 0) return null;
    
    return (
      <Box sx={{ mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Test Case Results
        </Typography>
        <Paper variant="outlined" sx={{ p: 0 }}>
          <List sx={{ p: 0 }}>
            {testCaseResults.map((result, index) => (
              <ListItem 
                key={index}
                divider={index < testCaseResults.length - 1}
                sx={{ 
                  bgcolor: result.passed ? 'success.light' : 'error.light',
                  borderRadius: index === 0 ? '4px 4px 0 0' : index === testCaseResults.length - 1 ? '0 0 4px 4px' : 0,
                }}
              >
                <Box sx={{ width: '100%' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
                      {result.passed ? (
                        <CheckCircleIcon color="success" sx={{ mr: 1 }} />
                      ) : (
                        <CancelIcon color="error" sx={{ mr: 1 }} />
                      )}
                      Test Case #{result.index + 1}
                    </Typography>
                    <Chip 
                      label={`${formatTime(result.executionTime)}`} 
                      size="small" 
                      color={result.passed ? "success" : "error"}
                    />
                  </Box>
                  
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary" gutterBottom sx={{ fontWeight: 600 }}>
                        Expected Output:
                      </Typography>
                      <Box 
                        component="pre"
                        sx={{ 
                          p: 2, 
                          bgcolor: 'success.dark',
                          color: 'success.contrastText',
                          fontFamily: '"Fira Code", "Consolas", "Monaco", monospace',
                          fontSize: '0.8rem',
                          maxHeight: '120px',
                          overflow: 'auto',
                          whiteSpace: 'pre-wrap',
                          wordWrap: 'break-word',
                          borderRadius: 1,
                          border: '2px solid',
                          borderColor: 'success.main',
                          margin: 0,
                          lineHeight: 1.4,
                          '&::-webkit-scrollbar': {
                            width: '6px',
                            height: '6px',
                          },
                          '&::-webkit-scrollbar-track': {
                            backgroundColor: 'transparent',
                          },
                          '&::-webkit-scrollbar-thumb': {
                            backgroundColor: 'success.light',
                            borderRadius: '3px',
                          }
                        }}
                      >
                        {result.expected || '(No output)'}
                      </Box>
                    </Grid>
                    
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary" gutterBottom sx={{ fontWeight: 600 }}>
                        Actual Output:
                      </Typography>
                      <Box 
                        component="pre"
                        sx={{ 
                          p: 2, 
                          bgcolor: result.passed ? 'success.dark' : 'error.dark',
                          color: result.passed ? 'success.contrastText' : 'error.contrastText',
                          fontFamily: '"Fira Code", "Consolas", "Monaco", monospace',
                          fontSize: '0.8rem',
                          maxHeight: '120px',
                          overflow: 'auto',
                          whiteSpace: 'pre-wrap',
                          wordWrap: 'break-word',
                          borderRadius: 1,
                          border: '2px solid',
                          borderColor: result.passed ? 'success.main' : 'error.main',
                          margin: 0,
                          lineHeight: 1.4,
                          '&::-webkit-scrollbar': {
                            width: '6px',
                            height: '6px',
                          },
                          '&::-webkit-scrollbar-track': {
                            backgroundColor: 'transparent',
                          },
                          '&::-webkit-scrollbar-thumb': {
                            backgroundColor: result.passed ? 'success.light' : 'error.light',
                            borderRadius: '3px',
                          }
                        }}
                      >
                        {result.actual || '(No output)'}
                      </Box>
                    </Grid>
                    
                    {result.error && (
                      <Grid item xs={12}>
                        <Typography variant="body2" color="error" gutterBottom sx={{ fontWeight: 600 }}>
                          Error:
                        </Typography>
                        <Box 
                          component="pre"
                          sx={{ 
                            p: 2, 
                            bgcolor: 'error.dark',
                            color: 'error.contrastText',
                            fontFamily: '"Fira Code", "Consolas", "Monaco", monospace',
                            fontSize: '0.8rem',
                            maxHeight: '120px',
                            overflow: 'auto',
                            whiteSpace: 'pre-wrap',
                            wordWrap: 'break-word',
                            borderRadius: 1,
                            border: '2px solid',
                            borderColor: 'error.main',
                            margin: 0,
                            lineHeight: 1.4,
                            '&::-webkit-scrollbar': {
                              width: '6px',
                              height: '6px',
                            },
                            '&::-webkit-scrollbar-track': {
                              backgroundColor: 'transparent',
                            },
                            '&::-webkit-scrollbar-thumb': {
                              backgroundColor: 'error.light',
                              borderRadius: '3px',
                            }
                          }}
                        >
                          {result.error}
                        </Box>
                      </Grid>
                    )}
                  </Grid>
                </Box>
              </ListItem>
            ))}
          </List>
        </Paper>
      </Box>
    );
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Test Cases
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Add test cases to validate solutions. Test cases can be marked as hidden from students.
      </Typography>
      
      {errors.testCases && (
        <Alert severity="error" sx={{ mt: 1, mb: 2 }}>
          {errors.testCases}
        </Alert>
      )}
      
      {/* Upload Test Cases from Files */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3, bgcolor: 'background.default' }}>
        <Typography variant="subtitle1" gutterBottom>
          Upload Test Cases from Files
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Upload .in and .out files (e.g., test1.in, test1.out) to automatically create test cases.
        </Typography>
        
        <input
          type="file"
          accept=".in,.out"
          multiple
          onChange={onTestCaseFileUpload}
          style={{ display: 'none' }}
          ref={testCaseFileInputRef}
        />
        
        <Button
          variant="outlined"
          startIcon={isUploadingTestCases ? <CircularProgress size={20} /> : <CloudUploadIcon />}
          onClick={onTestCaseUploadButtonClick}
          disabled={isUploadingTestCases}
        >
          {isUploadingTestCases ? 'Processing...' : 'Upload .in/.out Files'}
        </Button>
      </Paper>
      
      {/* Add New Test Case */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom>
          Add New Test Case
        </Typography>
        
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Input"
              multiline
              rows={4}
              fullWidth
              value={newTestCase.input}
              onChange={(e) => onTestCaseChange('input', e.target.value)}
              placeholder="Enter test input..."
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField
              label="Expected Output"
              multiline
              rows={4}
              fullWidth
              value={newTestCase.output}
              onChange={(e) => onTestCaseChange('output', e.target.value)}
              placeholder="Enter expected output..."
            />
          </Grid>
          
          <Grid item xs={12}>
            <TextField
              label="Explanation (Optional)"
              multiline
              rows={2}
              fullWidth
              value={newTestCase.explanation}
              onChange={(e) => onTestCaseChange('explanation', e.target.value)}
              placeholder="Explain this test case..."
            />
          </Grid>
          
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={newTestCase.hidden}
                    onChange={(e) => onTestCaseChange('hidden', e.target.checked)}
                  />
                }
                label="Hidden from students"
              />
              
              <Button
                startIcon={<AddIcon />}
                variant="contained"
                onClick={onAddTestCase}
                disabled={!newTestCase.input.trim() || !newTestCase.output.trim()}
              >
                Add Test Case
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>
      
      {/* Test Cases List */}
      {formData.testCases.length > 0 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="subtitle1">
              Test Cases ({formData.testCases.length})
            </Typography>
            <Button
              startIcon={isRunningTest ? <CircularProgress size={20} /> : <PlayArrowIcon />}
              variant="outlined"
              color="primary"
              onClick={onValidateAllTestCases}
              disabled={isRunningTest || formData.testCases.length === 0}
            >
              {isRunningTest ? 'Validating...' : 'Validate All Test Cases'}
            </Button>
          </Box>
          
          <List>
            {formData.testCases.map((testCase, index) => (
              <ListItem
                key={index}
                sx={{ 
                  bgcolor: 'background.paper',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  mb: 1,
                  flexDirection: 'column',
                  alignItems: 'stretch'
                }}
              >
                <Box sx={{ display: 'flex', width: '100%', alignItems: 'center', mb: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                    Test Case #{index + 1}
                  </Typography>
                  
                  <Box sx={{ ml: 'auto', display: 'flex', gap: 1 }}>
                    <Chip
                      size="small"
                      icon={testCase.hidden ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      label={testCase.hidden ? 'Hidden' : 'Visible'}
                      color={testCase.hidden ? 'warning' : 'success'}
                      variant="outlined"
                      onClick={() => onToggleTestCaseVisibility(index)}
                      sx={{ cursor: 'pointer' }}
                    />
                    
                    <IconButton 
                      size="small"
                      onClick={() => onRemoveTestCase(index)}
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </Box>
                
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                      Input:
                    </Typography>
                    <Box 
                      component="pre"
                      sx={{ 
                        p: 2, 
                        mt: 1,
                        bgcolor: 'grey.900',
                        color: '#00ff00',
                        fontFamily: '"Fira Code", "Consolas", "Monaco", monospace',
                        fontSize: '0.8rem',
                        maxHeight: '120px',
                        overflow: 'auto',
                        whiteSpace: 'pre-wrap',
                        wordWrap: 'break-word',
                        borderRadius: 1,
                        border: '1px solid',
                        borderColor: 'grey.700',
                        margin: 0,
                        lineHeight: 1.4,
                        '&::-webkit-scrollbar': {
                          width: '6px',
                          height: '6px',
                        },
                        '&::-webkit-scrollbar-track': {
                          backgroundColor: 'transparent',
                        },
                        '&::-webkit-scrollbar-thumb': {
                          backgroundColor: 'grey.600',
                          borderRadius: '3px',
                        }
                      }}
                    >
                      {testCase.input || '(No input)'}
                    </Box>
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                      Expected Output:
                    </Typography>
                    <Box 
                      component="pre"
                      sx={{ 
                        p: 2, 
                        mt: 1,
                        bgcolor: 'grey.900',
                        color: '#ffff00',
                        fontFamily: '"Fira Code", "Consolas", "Monaco", monospace',
                        fontSize: '0.8rem',
                        maxHeight: '120px',
                        overflow: 'auto',
                        whiteSpace: 'pre-wrap',
                        wordWrap: 'break-word',
                        borderRadius: 1,
                        border: '1px solid',
                        borderColor: 'grey.700',
                        margin: 0,
                        lineHeight: 1.4,
                        '&::-webkit-scrollbar': {
                          width: '6px',
                          height: '6px',
                        },
                        '&::-webkit-scrollbar-track': {
                          backgroundColor: 'transparent',
                        },
                        '&::-webkit-scrollbar-thumb': {
                          backgroundColor: 'grey.600',
                          borderRadius: '3px',
                        }
                      }}
                    >
                      {testCase.output || '(No output)'}
                    </Box>
                  </Grid>
                  
                  {testCase.explanation && (
                    <Grid item xs={12}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, mb: 0.5 }}>
                        Explanation:
                      </Typography>
                      <Box 
                        sx={{ 
                          p: 1.5,
                          bgcolor: 'background.paper',
                          borderRadius: 1,
                          border: '1px solid',
                          borderColor: 'divider'
                        }}
                      >
                        <Typography variant="body2" color="text.primary" sx={{ lineHeight: 1.5 }}>
                          {testCase.explanation}
                        </Typography>
                      </Box>
                    </Grid>
                  )}
                </Grid>
              </ListItem>
            ))}
          </List>
          
          {/* Test Case Results */}
          {renderTestCaseResults()}
        </Box>
      )}
    </Box>
  );
});

TestCasesTab.displayName = 'TestCasesTab';

export default TestCasesTab;
