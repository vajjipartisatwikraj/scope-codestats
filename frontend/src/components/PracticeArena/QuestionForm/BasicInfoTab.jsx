import React from "react";
import {
  Box,
  TextField,
  Typography,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Paper,
  Alert,
  Collapse,
} from "@mui/material";
import LockIcon from "@mui/icons-material/Lock";

const BasicInfoTab = ({
  formData,
  errors,
  onInputChange,
  onNestedInputChange,
}) => {
  return (
    <Box>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <TextField
            label="Title"
            name="title"
            value={formData.title}
            onChange={onInputChange}
            fullWidth
            required
            error={!!errors.title}
            helperText={errors.title}
          />
        </Grid>

        <Grid item xs={12}>
          <TextField
            label="Question Bank"
            name="questionBank"
            value={formData.questionBank}
            onChange={onInputChange}
            fullWidth
            required
            error={!!errors.questionBank}
            helperText={
              errors.questionBank ||
              "The main question bank category (e.g., 'Data Structures & Algorithms', 'Exception Handling', 'Database')"
            }
          />
        </Grid>

        <Grid item xs={12}>
          <TextField
            label="Description"
            name="description"
            value={formData.description}
            onChange={onInputChange}
            fullWidth
            multiline
            rows={6}
            required
            error={!!errors.description}
            helperText={
              errors.description ||
              "Enter a detailed description of the problem"
            }
            placeholder="Describe the problem statement in detail..."
          />
        </Grid>

        <Grid item xs={12} sm={4}>
          <FormControl fullWidth>
            <InputLabel>Question Type</InputLabel>
            <Select
              name="type"
              value={formData.type}
              onChange={onInputChange}
              label="Question Type"
            >
              <MenuItem value="programming">Programming</MenuItem>
              <MenuItem value="mcq">Multiple Choice</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12} sm={4}>
          <FormControl fullWidth>
            <InputLabel>Difficulty Level</InputLabel>
            <Select
              name="difficultyLevel"
              value={formData.difficultyLevel}
              onChange={onInputChange}
              label="Difficulty Level"
            >
              <MenuItem value="easy">Easy</MenuItem>
              <MenuItem value="medium">Medium</MenuItem>
              <MenuItem value="hard">Hard</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12} sm={4}>
          <TextField
            label="Marks"
            name="marks"
            type="number"
            value={formData.marks}
            onChange={onInputChange}
            fullWidth
            required
            InputProps={{
              inputProps: { min: 1 },
            }}
          />
        </Grid>

        {formData.type === "programming" && (
          <>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Time Limit (ms)"
                type="number"
                value={formData.constraints.timeLimit}
                onChange={(e) =>
                  onNestedInputChange(e, "constraints", "timeLimit")
                }
                fullWidth
                InputProps={{
                  inputProps: { min: 100, max: 10000 },
                }}
                helperText="Time limit in milliseconds (100-10000)"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Memory Limit (MB)"
                type="number"
                value={formData.constraints.memoryLimit}
                onChange={(e) =>
                  onNestedInputChange(e, "constraints", "memoryLimit")
                }
                fullWidth
                InputProps={{
                  inputProps: { min: 16, max: 512 },
                }}
                helperText="Memory limit in megabytes (16-512)"
              />
            </Grid>

            {/* Info about encryption - always enabled */}
            <Grid item xs={12}>
              <Alert severity="info" sx={{ borderRadius: 1 }}>
                <Typography variant="body2" fontWeight={600} gutterBottom>
                  🔐 Code Editor Security (Always Enabled):
                </Typography>
                <Typography variant="body2" component="div">
                  • Code automatically encrypts when copied
                  <br />
                  • Automatically decrypts when pasted with unique key
                  <br />
                  • Prevents unauthorized code sharing
                  <br />
                  • Each user gets a unique encryption key
                  <br />• Session-based encryption keys
                </Typography>
              </Alert>
            </Grid>
          </>
        )}
      </Grid>
    </Box>
  );
};

export default BasicInfoTab;
