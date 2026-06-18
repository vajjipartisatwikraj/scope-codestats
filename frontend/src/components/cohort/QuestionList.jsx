import React from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  IconButton,
  Typography,
  Chip,
  Paper,
  Divider,
  Tooltip,
  Button
} from '@mui/material';
import {
  Code as CodeIcon,
  QuizOutlined as QuizIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  AddCircle as AddIcon,
  QuestionAnswer as QuestionIcon
} from '@mui/icons-material';

const QuestionList = ({ 
  questions = [], 
  onEditQuestion, 
  onDeleteQuestion, 
  onAddQuestion,
  module
}) => {
  // Get color based on difficulty level
  const getDifficultyColor = (level) => {
    switch (level) {
      case 'easy':
        return 'success';
      case 'medium':
        return 'warning';
      case 'hard':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">
          Questions in {module?.title || 'Module'}
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={onAddQuestion}
        >
          Add Question
        </Button>
      </Box>
      
      {questions.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary">
            No questions found in this module.
          </Typography>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={onAddQuestion}
            sx={{ mt: 2 }}
          >
            Add First Question
          </Button>
        </Paper>
      ) : (
        <Paper>
          <List>
            {questions.map((question, index) => (
              <React.Fragment key={question._id || index}>
                {index > 0 && <Divider />}
                <ListItem sx={{ py: 2 }}>
                  <ListItemIcon>
                    {question.type === 'mcq' ? (
                      <Tooltip title="Multiple Choice Question">
                        <QuizIcon color="primary" />
                      </Tooltip>
                    ) : (
                      <Tooltip title="Programming Question">
                        <CodeIcon color="secondary" />
                      </Tooltip>
                    )}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Typography variant="subtitle1" fontWeight="medium">
                        {question.title}
                      </Typography>
                    }
                    secondary={
                      <>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          {question.description.length > 150 
                            ? `${question.description.substring(0, 150)}...` 
                            : question.description}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                          <Chip 
                            label={question.difficultyLevel} 
                            size="small" 
                            color={getDifficultyColor(question.difficultyLevel)}
                          />
                          <Chip 
                            label={`${question.marks} points`} 
                            size="small" 
                            variant="outlined"
                          />
                          {question.type === 'programming' && question.languages && (
                            <Chip 
                              label={`${question.languages.length} languages`} 
                              size="small" 
                              variant="outlined"
                              icon={<CodeIcon fontSize="small" />}
                            />
                          )}
                          {question.stats && question.stats.totalSubmissions > 0 && (
                            <Tooltip title="Acceptance Rate">
                              <Chip 
                                label={`${question.stats.acceptanceRate.toFixed(1)}% acceptance`} 
                                size="small" 
                                variant="outlined"
                                color={question.stats.acceptanceRate < 50 ? 'error' : 'success'}
                              />
                            </Tooltip>
                          )}
                          {question.tags && question.tags.length > 0 && 
                            question.tags.map((tag, i) => (
                              <Chip 
                                key={i} 
                                label={tag} 
                                size="small" 
                                variant="outlined"
                              />
                            ))
                          }
                        </Box>
                      </>
                    }
                  />
                  <ListItemSecondaryAction>
                    <Box>
                      <Tooltip title="Edit Question">
                        <IconButton edge="end" onClick={() => onEditQuestion(question)}>
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete Question">
                        <IconButton edge="end" onClick={() => onDeleteQuestion(question._id)} color="error">
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </ListItemSecondaryAction>
                </ListItem>
              </React.Fragment>
            ))}
          </List>
        </Paper>
      )}
    </Box>
  );
};

export default QuestionList; 