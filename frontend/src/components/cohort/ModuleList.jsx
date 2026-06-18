import React from 'react';
import {
  Box,
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  IconButton,
  Chip,
  Grid,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Tooltip,
  Paper
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  AddCircle as AddIcon,
  QuestionAnswer as QuestionIcon,
  VideoLibrary as VideoIcon,
  Description as DocumentIcon,
  MenuBook as MenuBookIcon,
  Reorder as ReorderIcon
} from '@mui/icons-material';

const ModuleList = ({ 
  modules, 
  onEditModule, 
  onDeleteModule, 
  onAddQuestion, 
  onNavigateToQuestion 
}) => {
  return (
    <Box>
      {modules.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary">
            No modules found. Create a new module to get started.
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {modules.map((module, index) => (
            <Grid item xs={12} key={module._id}>
              <Card sx={{ mb: 2 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box>
                      <Typography variant="h5" component="h2" gutterBottom>
                        {index + 1}. {module.title}
                      </Typography>
                      <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                        {module.description}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                        {module.videoResource && (
                          <Chip 
                            icon={<VideoIcon />} 
                            label="Video" 
                            size="small" 
                            variant="outlined" 
                          />
                        )}
                        {module.documentationUrl && (
                          <Chip 
                            icon={<DocumentIcon />} 
                            label="Documentation" 
                            size="small" 
                            variant="outlined" 
                          />
                        )}
                        <Chip 
                          icon={<QuestionIcon />} 
                          label={`${module.questions?.length || 0} Questions`} 
                          size="small" 
                          variant="outlined" 
                        />
                      </Box>
                    </Box>
                    <Box>
                      <IconButton 
                        size="small" 
                        onClick={() => onEditModule(module)}
                        color="primary"
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton 
                        size="small" 
                        onClick={() => onDeleteModule(module._id)}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </Box>
                  
                  {module.resources && module.resources.length > 0 && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" sx={{ mb: 1 }}>
                        Resources:
                      </Typography>
                      <List dense disablePadding>
                        {module.resources.map((resource, idx) => (
                          <ListItem key={idx} disablePadding sx={{ mb: 0.5 }}>
                            <ListItemIcon sx={{ minWidth: 36 }}>
                              {resource.type === 'video' ? (
                                <VideoIcon fontSize="small" />
                              ) : resource.type === 'document' ? (
                                <DocumentIcon fontSize="small" />
                              ) : (
                                <MenuBookIcon fontSize="small" />
                              )}
                            </ListItemIcon>
                            <ListItemText 
                              primary={resource.title} 
                              secondary={
                                <a 
                                  href={resource.url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  style={{ color: 'inherit', textDecoration: 'underline' }}
                                >
                                  {resource.url}
                                </a>
                              }
                            />
                          </ListItem>
                        ))}
                      </List>
                    </Box>
                  )}
                  
                  {module.questions && module.questions.length > 0 ? (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" sx={{ mb: 1 }}>
                        Questions:
                      </Typography>
                      <List dense>
                        {module.questions.map((question, idx) => (
                          <ListItem 
                            key={question._id}
                            sx={{ 
                              border: '1px solid',
                              borderColor: 'divider',
                              borderRadius: 1,
                              mb: 1,
                              cursor: 'pointer',
                              '&:hover': {
                                bgcolor: 'action.hover'
                              }
                            }}
                            onClick={(e) => {
                              e.preventDefault();
                              if (onNavigateToQuestion) {
                                // First try to use the provided callback
                                onNavigateToQuestion(module, question);
                              } else {
                                // Otherwise, open in a new tab directly
                                window.open(`/cohorts/${module.cohort}/modules/${module._id}/questions/${question._id}`, '_blank');
                              }
                            }}
                          >
                            <ListItemIcon>
                              {question.type === 'mcq' ? (
                                <Tooltip title="Multiple Choice">
                                  <ReorderIcon color="primary" />
                                </Tooltip>
                              ) : (
                                <Tooltip title="Programming">
                                  <QuestionIcon color="secondary" />
                                </Tooltip>
                              )}
                            </ListItemIcon>
                            <ListItemText 
                              primary={question.title}
                              secondary={
                                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                  <Chip 
                                    label={question.difficultyLevel} 
                                    size="small"
                                    color={
                                      question.difficultyLevel === 'easy' ? 'success' :
                                      question.difficultyLevel === 'medium' ? 'warning' : 'error'
                                    }
                                    sx={{ height: 20 }}
                                  />
                                  <Typography variant="caption">
                                    {question.marks} points
                                  </Typography>
                                </Box>
                              }
                            />
                            <ListItemSecondaryAction>
                              <IconButton
                                edge="end"
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onEditModule && onEditModule(module, question);
                                }}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </ListItemSecondaryAction>
                          </ListItem>
                        ))}
                      </List>
                    </Box>
                  ) : (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                      No questions added to this module yet.
                    </Typography>
                  )}
                </CardContent>
                <Divider />
                <CardActions sx={{ justifyContent: 'flex-end' }}>
                  <Button
                    startIcon={<AddIcon />}
                    onClick={() => onAddQuestion(module)}
                    variant="outlined"
                    size="small"
                  >
                    Add Question
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default ModuleList; 