import React, { memo, useState } from "react";
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
  IconButton,
  Chip,
  Grid,
  Paper,
  CircularProgress,
  Collapse,
} from "@mui/material";
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  CloudUpload as CloudUploadIcon,
  PlayArrow as PlayArrowIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Close as CloseIcon,
  ContentPaste as ContentPasteIcon,
} from "@mui/icons-material";
import { formatTime, formatMemory } from "./utils";

const TestCasesTab = memo(
  ({
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
    onValidateAllTestCases,
    onEditTestCase,
  }) => {
    // State to track which test case is being edited
    const [showPasteJSON, setShowPasteJSON] = useState(false);
    const [pasteJSONText, setPasteJSONText] = useState("");
    const [pasteJSONError, setPasteJSONError] = useState("");

    const [editingIndex, setEditingIndex] = useState(null);
    const [editedTestCase, setEditedTestCase] = useState({
      input: "",
      output: "",
      hidden: false,
      explanation: "",
    });

    // Handle paste JSON
    const handlePasteJSON = () => {
      setPasteJSONError("");

      try {
        const parsed = JSON.parse(pasteJSONText);

        // Validate format
        if (!Array.isArray(parsed)) {
          setPasteJSONError("JSON must be an array of test cases");
          return;
        }

        // Validate each test case
        const validTestCases = [];
        for (let i = 0; i < parsed.length; i++) {
          const tc = parsed[i];
          if (!tc.hasOwnProperty("input") || !tc.hasOwnProperty("output")) {
            setPasteJSONError(
              `Test case ${i + 1} must have 'input' and 'output' fields`
            );
            return;
          }

          validTestCases.push({
            input: String(tc.input || ""),
            output: String(tc.output || ""),
            hidden: Boolean(tc.hidden || false),
            explanation: String(tc.explanation || ""),
          });
        }

        // Add all test cases
        const currentTestCases = formData.testCases || [];
        onTestCaseChange([...currentTestCases, ...validTestCases]);

        // Clear and close
        setPasteJSONText("");
        setShowPasteJSON(false);
        alert(`Successfully added ${validTestCases.length} test case(s)!`);
      } catch (error) {
        setPasteJSONError(`Invalid JSON: ${error.message}`);
      }
    };

    // Start editing a test case
    const handleStartEdit = (index) => {
      setEditingIndex(index);
      setEditedTestCase({ ...formData.testCases[index] });
    };

    // Cancel editing
    const handleCancelEdit = () => {
      setEditingIndex(null);
      setEditedTestCase({
        input: "",
        output: "",
        hidden: false,
        explanation: "",
      });
    };

    // Save edited test case
    const handleSaveEdit = () => {
      if (!editedTestCase.input.trim() || !editedTestCase.output.trim()) {
        return;
      }
      onEditTestCase(editingIndex, editedTestCase);
      handleCancelEdit();
    };

    // Update edited test case field
    const handleEditedTestCaseChange = (field, value) => {
      setEditedTestCase((prev) => ({ ...prev, [field]: value }));
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
                    bgcolor: result.passed ? "success.light" : "error.light",
                    borderRadius:
                      index === 0
                        ? "4px 4px 0 0"
                        : index === testCaseResults.length - 1
                        ? "0 0 4px 4px"
                        : 0,
                  }}
                >
                  <Box sx={{ width: "100%" }}>
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        mb: 1,
                      }}
                    >
                      <Typography
                        variant="subtitle1"
                        sx={{
                          fontWeight: "bold",
                          display: "flex",
                          alignItems: "center",
                        }}
                      >
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
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          gutterBottom
                          sx={{ fontWeight: 600 }}
                        >
                          Expected Output:
                        </Typography>
                        <Box
                          component="pre"
                          sx={{
                            p: 2,
                            bgcolor: "success.dark",
                            color: "success.contrastText",
                            fontFamily:
                              '"Fira Code", "Consolas", "Monaco", monospace',
                            fontSize: "0.8rem",
                            maxHeight: "120px",
                            overflow: "auto",
                            whiteSpace: "pre-wrap",
                            wordWrap: "break-word",
                            borderRadius: 1,
                            border: "2px solid",
                            borderColor: "success.main",
                            margin: 0,
                            lineHeight: 1.4,
                            "&::-webkit-scrollbar": {
                              width: "6px",
                              height: "6px",
                            },
                            "&::-webkit-scrollbar-track": {
                              backgroundColor: "transparent",
                            },
                            "&::-webkit-scrollbar-thumb": {
                              backgroundColor: "success.light",
                              borderRadius: "3px",
                            },
                          }}
                        >
                          {result.expected || "(No output)"}
                        </Box>
                      </Grid>

                      <Grid item xs={12} sm={6}>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          gutterBottom
                          sx={{ fontWeight: 600 }}
                        >
                          Actual Output:
                        </Typography>
                        <Box
                          component="pre"
                          sx={{
                            p: 2,
                            bgcolor: result.passed
                              ? "success.dark"
                              : "error.dark",
                            color: result.passed
                              ? "success.contrastText"
                              : "error.contrastText",
                            fontFamily:
                              '"Fira Code", "Consolas", "Monaco", monospace',
                            fontSize: "0.8rem",
                            maxHeight: "120px",
                            overflow: "auto",
                            whiteSpace: "pre-wrap",
                            wordWrap: "break-word",
                            borderRadius: 1,
                            border: "2px solid",
                            borderColor: result.passed
                              ? "success.main"
                              : "error.main",
                            margin: 0,
                            lineHeight: 1.4,
                            "&::-webkit-scrollbar": {
                              width: "6px",
                              height: "6px",
                            },
                            "&::-webkit-scrollbar-track": {
                              backgroundColor: "transparent",
                            },
                            "&::-webkit-scrollbar-thumb": {
                              backgroundColor: result.passed
                                ? "success.light"
                                : "error.light",
                              borderRadius: "3px",
                            },
                          }}
                        >
                          {result.actual || "(No output)"}
                        </Box>
                      </Grid>

                      {result.error && (
                        <Grid item xs={12}>
                          <Typography
                            variant="body2"
                            color="error"
                            gutterBottom
                            sx={{ fontWeight: 600 }}
                          >
                            Error:
                          </Typography>
                          <Box
                            component="pre"
                            sx={{
                              p: 2,
                              bgcolor: "error.dark",
                              color: "error.contrastText",
                              fontFamily:
                                '"Fira Code", "Consolas", "Monaco", monospace',
                              fontSize: "0.8rem",
                              maxHeight: "120px",
                              overflow: "auto",
                              whiteSpace: "pre-wrap",
                              wordWrap: "break-word",
                              borderRadius: 1,
                              border: "2px solid",
                              borderColor: "error.main",
                              margin: 0,
                              lineHeight: 1.4,
                              "&::-webkit-scrollbar": {
                                width: "6px",
                                height: "6px",
                              },
                              "&::-webkit-scrollbar-track": {
                                backgroundColor: "transparent",
                              },
                              "&::-webkit-scrollbar-thumb": {
                                backgroundColor: "error.light",
                                borderRadius: "3px",
                              },
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
          Add test cases to validate solutions. Test cases can be marked as
          hidden from students.
        </Typography>

        {errors.testCases && (
          <Alert severity="error" sx={{ mt: 1, mb: 2 }}>
            {errors.testCases}
          </Alert>
        )}

        {/* Upload Test Cases from Files */}
        <Paper
          variant="outlined"
          sx={{ p: 2, mb: 3, bgcolor: "background.default" }}
        >
          <Typography variant="subtitle1" gutterBottom>
            Upload Test Cases from Files
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Upload .in and .out files (e.g., test1.in, test1.out) to
            automatically create test cases.
          </Typography>

          <input
            type="file"
            accept=".in,.out"
            multiple
            onChange={onTestCaseFileUpload}
            style={{ display: "none" }}
            ref={testCaseFileInputRef}
          />

          <Button
            variant="outlined"
            startIcon={
              isUploadingTestCases ? (
                <CircularProgress size={20} />
              ) : (
                <CloudUploadIcon />
              )
            }
            onClick={onTestCaseUploadButtonClick}
            disabled={isUploadingTestCases}
          >
            {isUploadingTestCases ? "Processing..." : "Upload .in/.out Files"}
          </Button>
        </Paper>

        {/* Paste JSON Test Cases */}
        <Paper
          variant="outlined"
          sx={{ p: 2, mb: 3, bgcolor: "background.default" }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              mb: showPasteJSON ? 2 : 0,
            }}
          >
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                Paste JSON Test Cases
              </Typography>
              {!showPasteJSON && (
                <Typography variant="body2" color="text.secondary">
                  Paste test cases in JSON format: [&#123;"input": "...",
                  "output": "...", "hidden": false&#125;, ...]
                </Typography>
              )}
            </Box>
            <Button
              variant={showPasteJSON ? "outlined" : "contained"}
              startIcon={showPasteJSON ? <CloseIcon /> : <ContentPasteIcon />}
              onClick={() => {
                setShowPasteJSON(!showPasteJSON);
                if (!showPasteJSON) {
                  setPasteJSONError("");
                }
              }}
              size="small"
            >
              {showPasteJSON ? "Cancel" : "Paste JSON"}
            </Button>
          </Box>

          <Collapse in={showPasteJSON}>
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Expected format: Array of objects with 'input', 'output',
                'hidden' (optional), and 'explanation' (optional) fields
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={8}
                value={pasteJSONText}
                onChange={(e) => setPasteJSONText(e.target.value)}
                placeholder={`[\n  {\n    "input": "3",\n    "output": "*\\n**\\n***",\n    "hidden": false,\n    "explanation": "Test case for n=3"\n  },\n  {\n    "input": "5",\n    "output": "*\\n**\\n***\\n****\\n*****",\n    "hidden": true\n  }\n]`}
                variant="outlined"
                sx={{
                  fontFamily: '"Fira Code", "Consolas", "Monaco", monospace',
                  fontSize: "0.85rem",
                  mb: 1,
                }}
              />

              {pasteJSONError && (
                <Alert severity="error" sx={{ mb: 1 }}>
                  {pasteJSONError}
                </Alert>
              )}

              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handlePasteJSON}
                disabled={!pasteJSONText.trim()}
              >
                Add Test Cases from JSON
              </Button>
            </Box>
          </Collapse>
        </Paper>

        {/* Add New Test Case */}
        <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            Add New Test Case
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography
                variant="body2"
                color="text.primary"
                sx={{ fontWeight: 600, mb: 1 }}
              >
                Input:
              </Typography>
              <TextField
                multiline
                minRows={4}
                maxRows={8}
                fullWidth
                value={newTestCase.input}
                onChange={(e) => onTestCaseChange("input", e.target.value)}
                placeholder="Enter test input (each line will be preserved)..."
                sx={{
                  "& .MuiInputBase-root": {
                    fontFamily: '"Fira Code", "Consolas", "Monaco", monospace',
                    fontSize: "0.85rem",
                    bgcolor: "background.paper",
                  },
                  "& .MuiInputBase-input": {
                    whiteSpace: "pre-wrap",
                  },
                }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Typography
                variant="body2"
                color="text.primary"
                sx={{ fontWeight: 600, mb: 1 }}
              >
                Expected Output:
              </Typography>
              <TextField
                multiline
                minRows={4}
                maxRows={8}
                fullWidth
                value={newTestCase.output}
                onChange={(e) => onTestCaseChange("output", e.target.value)}
                placeholder="Enter expected output (each line will be preserved)..."
                sx={{
                  "& .MuiInputBase-root": {
                    fontFamily: '"Fira Code", "Consolas", "Monaco", monospace',
                    fontSize: "0.85rem",
                    bgcolor: "background.paper",
                  },
                  "& .MuiInputBase-input": {
                    whiteSpace: "pre-wrap",
                  },
                }}
              />
            </Grid>

            <Grid item xs={12}>
              <Typography
                variant="body2"
                color="text.primary"
                sx={{ fontWeight: 600, mb: 1 }}
              >
                Explanation (Optional):
              </Typography>
              <TextField
                multiline
                minRows={2}
                maxRows={4}
                fullWidth
                value={newTestCase.explanation}
                onChange={(e) =>
                  onTestCaseChange("explanation", e.target.value)
                }
                placeholder="Explain this test case..."
              />
            </Grid>

            <Grid item xs={12}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <FormControlLabel
                  control={
                    <Switch
                      checked={newTestCase.hidden}
                      onChange={(e) =>
                        onTestCaseChange("hidden", e.target.checked)
                      }
                    />
                  }
                  label="Hidden from students"
                />

                <Button
                  startIcon={<AddIcon />}
                  variant="contained"
                  onClick={onAddTestCase}
                  disabled={
                    !newTestCase.input.trim() || !newTestCase.output.trim()
                  }
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
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 2,
              }}
            >
              <Typography variant="subtitle1">
                Test Cases ({formData.testCases.length})
              </Typography>
              <Button
                startIcon={
                  isRunningTest ? (
                    <CircularProgress size={20} />
                  ) : (
                    <PlayArrowIcon />
                  )
                }
                variant="outlined"
                color="primary"
                onClick={onValidateAllTestCases}
                disabled={isRunningTest || formData.testCases.length === 0}
              >
                {isRunningTest ? "Validating..." : "Validate All Test Cases"}
              </Button>
            </Box>

            <List>
              {formData.testCases.map((testCase, index) => (
                <ListItem
                  key={index}
                  sx={{
                    bgcolor: "background.paper",
                    border: "1px solid",
                    borderColor:
                      editingIndex === index ? "primary.main" : "divider",
                    borderRadius: 1,
                    mb: 1,
                    flexDirection: "column",
                    alignItems: "stretch",
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      width: "100%",
                      alignItems: "center",
                      mb: 1,
                    }}
                  >
                    <Typography variant="subtitle2" sx={{ fontWeight: "bold" }}>
                      Test Case #{index + 1}
                    </Typography>

                    <Box sx={{ ml: "auto", display: "flex", gap: 1 }}>
                      {editingIndex === index ? (
                        <>
                          <IconButton
                            size="small"
                            onClick={handleSaveEdit}
                            color="primary"
                            disabled={
                              !editedTestCase.input.trim() ||
                              !editedTestCase.output.trim()
                            }
                          >
                            <SaveIcon />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={handleCancelEdit}
                            color="secondary"
                          >
                            <CloseIcon />
                          </IconButton>
                        </>
                      ) : (
                        <>
                          <Chip
                            size="small"
                            icon={
                              testCase.hidden ? (
                                <VisibilityOffIcon />
                              ) : (
                                <VisibilityIcon />
                              )
                            }
                            label={testCase.hidden ? "Hidden" : "Visible"}
                            color={testCase.hidden ? "warning" : "success"}
                            variant="outlined"
                            onClick={() => onToggleTestCaseVisibility(index)}
                            sx={{ cursor: "pointer" }}
                          />

                          <IconButton
                            size="small"
                            onClick={() => handleStartEdit(index)}
                            color="primary"
                          >
                            <EditIcon />
                          </IconButton>

                          <IconButton
                            size="small"
                            onClick={() => onRemoveTestCase(index)}
                            color="error"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </>
                      )}
                    </Box>
                  </Box>

                  {editingIndex === index ? (
                    // Edit Mode
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ fontWeight: 600 }}
                        >
                          Input:
                        </Typography>
                        <TextField
                          multiline
                          minRows={4}
                          maxRows={8}
                          fullWidth
                          value={editedTestCase.input}
                          onChange={(e) =>
                            handleEditedTestCaseChange("input", e.target.value)
                          }
                          placeholder="Enter test input (each line will be preserved)..."
                          size="small"
                          sx={{
                            mt: 1,
                            "& .MuiInputBase-root": {
                              fontFamily:
                                '"Fira Code", "Consolas", "Monaco", monospace',
                              fontSize: "0.85rem",
                              bgcolor: "background.paper",
                            },
                            "& .MuiInputBase-input": {
                              whiteSpace: "pre-wrap",
                            },
                          }}
                        />
                      </Grid>

                      <Grid item xs={12} sm={6}>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ fontWeight: 600 }}
                        >
                          Expected Output:
                        </Typography>
                        <TextField
                          multiline
                          minRows={4}
                          maxRows={8}
                          fullWidth
                          value={editedTestCase.output}
                          onChange={(e) =>
                            handleEditedTestCaseChange("output", e.target.value)
                          }
                          placeholder="Enter expected output (each line will be preserved)..."
                          size="small"
                          sx={{
                            mt: 1,
                            "& .MuiInputBase-root": {
                              fontFamily:
                                '"Fira Code", "Consolas", "Monaco", monospace',
                              fontSize: "0.85rem",
                              bgcolor: "background.paper",
                            },
                            "& .MuiInputBase-input": {
                              whiteSpace: "pre-wrap",
                            },
                          }}
                        />
                      </Grid>

                      <Grid item xs={12}>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ fontWeight: 600 }}
                        >
                          Explanation (Optional):
                        </Typography>
                        <TextField
                          multiline
                          minRows={2}
                          maxRows={4}
                          fullWidth
                          value={editedTestCase.explanation}
                          onChange={(e) =>
                            handleEditedTestCaseChange(
                              "explanation",
                              e.target.value
                            )
                          }
                          placeholder="Explain this test case..."
                          size="small"
                          sx={{ mt: 1 }}
                        />
                      </Grid>

                      <Grid item xs={12}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={editedTestCase.hidden}
                              onChange={(e) =>
                                handleEditedTestCaseChange(
                                  "hidden",
                                  e.target.checked
                                )
                              }
                            />
                          }
                          label="Hidden from students"
                        />
                      </Grid>
                    </Grid>
                  ) : (
                    // View Mode
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ fontWeight: 600 }}
                        >
                          Input:
                        </Typography>
                        <Box
                          component="pre"
                          sx={{
                            p: 2,
                            mt: 1,
                            bgcolor: "grey.900",
                            color: "#00ff00",
                            fontFamily:
                              '"Fira Code", "Consolas", "Monaco", monospace',
                            fontSize: "0.8rem",
                            maxHeight: "120px",
                            overflow: "auto",
                            whiteSpace: "pre-wrap",
                            wordWrap: "break-word",
                            borderRadius: 1,
                            border: "1px solid",
                            borderColor: "grey.700",
                            margin: 0,
                            lineHeight: 1.4,
                            "&::-webkit-scrollbar": {
                              width: "6px",
                              height: "6px",
                            },
                            "&::-webkit-scrollbar-track": {
                              backgroundColor: "transparent",
                            },
                            "&::-webkit-scrollbar-thumb": {
                              backgroundColor: "grey.600",
                              borderRadius: "3px",
                            },
                          }}
                        >
                          {testCase.input || "(No input)"}
                        </Box>
                      </Grid>

                      <Grid item xs={12} sm={6}>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ fontWeight: 600 }}
                        >
                          Expected Output:
                        </Typography>
                        <Box
                          component="pre"
                          sx={{
                            p: 2,
                            mt: 1,
                            bgcolor: "grey.900",
                            color: "#ffff00",
                            fontFamily:
                              '"Fira Code", "Consolas", "Monaco", monospace',
                            fontSize: "0.8rem",
                            maxHeight: "120px",
                            overflow: "auto",
                            whiteSpace: "pre-wrap",
                            wordWrap: "break-word",
                            borderRadius: 1,
                            border: "1px solid",
                            borderColor: "grey.700",
                            margin: 0,
                            lineHeight: 1.4,
                            "&::-webkit-scrollbar": {
                              width: "6px",
                              height: "6px",
                            },
                            "&::-webkit-scrollbar-track": {
                              backgroundColor: "transparent",
                            },
                            "&::-webkit-scrollbar-thumb": {
                              backgroundColor: "grey.600",
                              borderRadius: "3px",
                            },
                          }}
                        >
                          {testCase.output || "(No output)"}
                        </Box>
                      </Grid>

                      {testCase.explanation && (
                        <Grid item xs={12}>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ fontWeight: 600, mb: 0.5 }}
                          >
                            Explanation:
                          </Typography>
                          <Box
                            sx={{
                              p: 1.5,
                              bgcolor: "background.paper",
                              borderRadius: 1,
                              border: "1px solid",
                              borderColor: "divider",
                            }}
                          >
                            <Typography
                              variant="body2"
                              color="text.primary"
                              sx={{ lineHeight: 1.5 }}
                            >
                              {testCase.explanation}
                            </Typography>
                          </Box>
                        </Grid>
                      )}
                    </Grid>
                  )}
                </ListItem>
              ))}
            </List>

            {/* Test Case Results */}
            {renderTestCaseResults()}
          </Box>
        )}
      </Box>
    );
  }
);

TestCasesTab.displayName = "TestCasesTab";

export default TestCasesTab;
