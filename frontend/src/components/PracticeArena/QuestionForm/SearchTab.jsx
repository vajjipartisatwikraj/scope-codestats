import React, { memo } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  CircularProgress,
  InputAdornment,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip
} from '@mui/material';
import {
  Search as SearchIcon,
  ContentCopy as ContentCopyIcon
} from '@mui/icons-material';

const SearchTab = memo(({ 
  searchQuery,
  searchResults,
  isSearching,
  onSetSearchQuery,
  onSearchQuestions,
  onLoadQuestion
}) => {
  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Search Existing Questions
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Search for existing questions to load into the form and use as templates.
      </Typography>
      
      <Paper variant="outlined" sx={{ p: 3, mt: 2 }}>
        <Box sx={{ display: 'flex', mb: 3 }}>
          <TextField
            label="Search by title, description, or tags"
            variant="outlined"
            fullWidth
            value={searchQuery}
            onChange={(e) => onSetSearchQuery(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                onSearchQuestions();
              }
            }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton 
                    edge="end" 
                    onClick={onSearchQuestions}
                    disabled={isSearching}
                  >
                    {isSearching ? <CircularProgress size={20} /> : <SearchIcon />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </Box>
        
        <Button
          variant="contained"
          startIcon={isSearching ? <CircularProgress size={20} /> : <SearchIcon />}
          onClick={onSearchQuestions}
          disabled={isSearching || !searchQuery.trim()}
          fullWidth
        >
          {isSearching ? 'Searching...' : 'Search Questions'}
        </Button>
      </Paper>
      
      {/* Search Results */}
      {isSearching ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : searchResults.length > 0 ? (
        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            Search Results ({searchResults.length} found)
          </Typography>
          
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Title</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Difficulty</TableCell>
                  <TableCell>Marks</TableCell>
                  <TableCell>Tags</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {searchResults.map((question) => (
                  <TableRow key={question._id} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                        {question.title}
                      </Typography>
                      {question.description && (
                        <Typography variant="caption" color="text.secondary">
                          {question.description.substring(0, 100)}
                          {question.description.length > 100 ? '...' : ''}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip 
                        size="small" 
                        color={question.type === 'programming' ? 'primary' : 'secondary'}
                        label={question.type === 'programming' ? 'Programming' : 'MCQ'}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip 
                        size="small" 
                        label={question.difficultyLevel}
                        color={
                          question.difficultyLevel === 'easy' ? 'success' :
                          question.difficultyLevel === 'medium' ? 'warning' : 'error'
                        }
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>{question.marks}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {question.tags && question.tags.slice(0, 3).map((tag, index) => (
                          <Chip
                            key={index}
                            size="small"
                            label={tag}
                            variant="outlined"
                            sx={{ fontSize: '0.7rem' }}
                          />
                        ))}
                        {question.tags && question.tags.length > 3 && (
                          <Chip
                            size="small"
                            label={`+${question.tags.length - 3}`}
                            variant="outlined"
                            sx={{ fontSize: '0.7rem' }}
                          />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<ContentCopyIcon />}
                        onClick={() => onLoadQuestion(question)}
                      >
                        Load
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      ) : searchQuery && !isSearching ? (
        <Box sx={{ textAlign: 'center', p: 4, color: 'text.secondary' }}>
          <Typography variant="body1">
            No questions found matching your search.
          </Typography>
          <Typography variant="body2">
            Try different keywords or search terms.
          </Typography>
        </Box>
      ) : (
        <Box sx={{ textAlign: 'center', p: 4, color: 'text.secondary' }}>
          <Typography variant="body1">
            Enter keywords and click search to find existing questions.
          </Typography>
        </Box>
      )}
    </Box>
  );
});

SearchTab.displayName = 'SearchTab';

export default SearchTab;
