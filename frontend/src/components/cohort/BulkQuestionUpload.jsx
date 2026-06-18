import React, { useState, useRef } from "react";
import {
  Box,
  Typography,
  Button,
  Paper,
  CircularProgress,
  TextField,
  Divider,
  Alert,
  Collapse,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  useTheme,
} from "@mui/material";
import {
  CloudUpload as CloudUploadIcon,
  ContentPaste as ContentPasteIcon,
  ContentCopy as ContentCopyIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Download as DownloadIcon,
} from "@mui/icons-material";

const SAMPLE_JSON = {
  questions: [
    {
      title: "Two Sum",
      description:
        "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.",
      type: "programming",
      difficultyLevel: "easy",
      marks: 10,
      languages: [
        {
          name: "java",
          version: "15.0.2",
          boilerplateCode:
            'import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        // Your code here\n    }\n}',
          solutionCode: "",
        },
        {
          name: "python",
          version: "3.10.0",
          boilerplateCode: "# Your code here\n",
          solutionCode: "",
        },
      ],
      defaultLanguage: "java",
      testCases: [
        {
          input: "4\n2 7 11 15\n9",
          output: "0 1",
          hidden: false,
          explanation: "nums[0] + nums[1] = 2 + 7 = 9",
        },
        {
          input: "3\n3 2 4\n6",
          output: "1 2",
          hidden: true,
        },
      ],
      constraints: { timeLimit: 1000, memoryLimit: 256 },
      hints: ["Try using a hash map for O(n) solution"],
      tags: ["arrays", "hash-map"],
      companies: ["Google", "Amazon"],
    },
    {
      title: "What is the time complexity of binary search?",
      description:
        "Select the correct time complexity of the binary search algorithm on a sorted array of n elements.",
      type: "mcq",
      difficultyLevel: "easy",
      marks: 5,
      options: [
        { text: "O(n)", isCorrect: false },
        { text: "O(log n)", isCorrect: true },
        { text: "O(n log n)", isCorrect: false },
        { text: "O(1)", isCorrect: false },
      ],
      tags: ["binary-search", "complexity"],
    },
  ],
};

const BulkQuestionUpload = ({ onUpload, onCancel, loading: parentLoading }) => {
  const theme = useTheme();
  const fileInputRef = useRef(null);
  const [questions, setQuestions] = useState([]);
  const [parseError, setParseError] = useState("");
  const [showPaste, setShowPaste] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [showPreview, setShowPreview] = useState(true);
  const [copied, setCopied] = useState(false);

  const isDark = theme.palette.mode === "dark";

  // Parse and validate the JSON
  const parseJSON = (text) => {
    setParseError("");
    try {
      const parsed = JSON.parse(text);

      // Support both { questions: [...] } and direct array [...]
      let questionsArray;
      if (Array.isArray(parsed)) {
        questionsArray = parsed;
      } else if (parsed.questions && Array.isArray(parsed.questions)) {
        questionsArray = parsed.questions;
      } else if (parsed.title && parsed.type) {
        // Single question object
        questionsArray = [parsed];
      } else {
        setParseError(
          'Invalid format: JSON must be an array of questions, or an object with a "questions" array'
        );
        return;
      }

      if (questionsArray.length === 0) {
        setParseError("No questions found in the JSON");
        return;
      }

      // Validate each question
      const errors = [];
      questionsArray.forEach((q, i) => {
        const qNum = i + 1;
        if (!q.title)
          errors.push(`Q${qNum}: missing 'title'`);
        if (!q.description)
          errors.push(`Q${qNum}: missing 'description'`);
        if (!q.type || !["mcq", "programming"].includes(q.type))
          errors.push(`Q${qNum}: 'type' must be 'mcq' or 'programming'`);
        if (q.type === "mcq") {
          if (!q.options || q.options.length < 2)
            errors.push(`Q${qNum}: MCQ needs at least 2 options`);
          else if (!q.options.some((opt) => opt.isCorrect))
            errors.push(`Q${qNum}: MCQ needs at least one correct option`);
        }
        if (
          q.type === "programming" &&
          (!q.testCases || q.testCases.length === 0)
        )
          errors.push(`Q${qNum}: Programming question needs at least 1 test case`);
      });

      if (errors.length > 0) {
        setParseError(errors.join("\n"));
        return;
      }

      setQuestions(questionsArray);
      setShowPaste(false);
      setPasteText("");
    } catch (err) {
      setParseError("Invalid JSON: " + err.message);
    }
  };

  // Handle file upload
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.endsWith(".json")) {
      setParseError("Only .json files are accepted");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      parseJSON(event.target.result);
    };
    reader.onerror = () => {
      setParseError("Failed to read the file");
    };
    reader.readAsText(file);

    // Reset file input so same file can be re-selected
    e.target.value = "";
  };

  // Handle paste submit
  const handlePasteSubmit = () => {
    if (!pasteText.trim()) return;
    parseJSON(pasteText);
  };

  // Copy sample JSON to clipboard
  const handleCopySample = async () => {
    try {
      await navigator.clipboard.writeText(
        JSON.stringify(SAMPLE_JSON, null, 2)
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = JSON.stringify(SAMPLE_JSON, null, 2);
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Download sample JSON as file
  const handleDownloadSample = () => {
    const blob = new Blob([JSON.stringify(SAMPLE_JSON, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sample_questions.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  // Remove a question from the list
  const handleRemoveQuestion = (index) => {
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  // Submit the upload
  const handleUpload = () => {
    if (questions.length === 0) return;
    onUpload(questions);
  };

  const getDifficultyColor = (level) => {
    switch (level) {
      case "easy":
        return "success";
      case "medium":
        return "warning";
      case "hard":
        return "error";
      default:
        return "default";
    }
  };

  return (
    <Box>
      {/* If no questions parsed yet, show upload/paste UI */}
      {questions.length === 0 ? (
        <>
          {/* File Upload Area */}
          <Paper
            variant="outlined"
            sx={{
              p: 4,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              borderColor: "primary.main",
              borderStyle: "dashed",
              borderWidth: 2,
              bgcolor: isDark ? "rgba(0, 136, 204, 0.04)" : "rgba(0, 136, 204, 0.02)",
              borderRadius: 2,
              cursor: "pointer",
              transition: "all 0.2s",
              "&:hover": {
                borderColor: "primary.light",
                bgcolor: isDark ? "rgba(0, 136, 204, 0.08)" : "rgba(0, 136, 204, 0.05)",
              },
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <CloudUploadIcon
              sx={{ fontSize: 56, color: "primary.main", mb: 1.5 }}
            />
            <Typography variant="h6" gutterBottom>
              Upload Questions JSON File
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ textAlign: "center", maxWidth: 450 }}
            >
              Upload a JSON file containing an array of questions. All questions
              will be added to this module at once.
            </Typography>

            <input
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              style={{ display: "none" }}
              ref={fileInputRef}
            />

            <Button
              variant="contained"
              size="large"
              startIcon={<CloudUploadIcon />}
              sx={{ mt: 2 }}
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
            >
              Choose JSON File
            </Button>

            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ mt: 1.5 }}
            >
              Supports .json files — max 50 questions per upload
            </Typography>
          </Paper>

          {/* OR divider */}
          <Box sx={{ display: "flex", alignItems: "center", my: 2.5 }}>
            <Divider sx={{ flexGrow: 1 }} />
            <Typography
              variant="body2"
              sx={{ mx: 2, color: "text.secondary", fontWeight: 500 }}
            >
              OR
            </Typography>
            <Divider sx={{ flexGrow: 1 }} />
          </Box>

          {/* Paste JSON Section */}
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                mb: showPaste ? 2 : 0,
              }}
            >
              <Box>
                <Typography variant="subtitle1" fontWeight={600}>
                  Paste JSON Content
                </Typography>
                {!showPaste && (
                  <Typography variant="body2" color="text.secondary">
                    Paste a JSON array of questions directly
                  </Typography>
                )}
              </Box>
              <Button
                variant={showPaste ? "outlined" : "contained"}
                startIcon={<ContentPasteIcon />}
                onClick={() => {
                  setShowPaste(!showPaste);
                  if (!showPaste) setParseError("");
                }}
                size="small"
              >
                {showPaste ? "Cancel" : "Paste JSON"}
              </Button>
            </Box>

            <Collapse in={showPaste}>
              <TextField
                fullWidth
                multiline
                rows={14}
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder={`Paste your JSON here. Example:\n\n${JSON.stringify(
                  { questions: [{ title: "...", description: "...", type: "programming", "...": "..." }] },
                  null,
                  2
                )}`}
                sx={{
                  mb: 2,
                  "& textarea": {
                    fontFamily:
                      '"Fira Code", "Consolas", "Monaco", monospace',
                    fontSize: "0.85rem",
                  },
                }}
              />
              <Button
                variant="contained"
                onClick={handlePasteSubmit}
                disabled={!pasteText.trim()}
                fullWidth
                size="large"
              >
                Parse & Load Questions
              </Button>
            </Collapse>
          </Paper>

          {parseError && (
            <Alert
              severity="error"
              sx={{
                mt: 2,
                whiteSpace: "pre-line",
                "& .MuiAlert-message": {
                  fontFamily: "monospace",
                  fontSize: "0.85rem",
                },
              }}
            >
              {parseError}
            </Alert>
          )}

          {/* Sample JSON Template */}
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              mt: 2.5,
              borderRadius: 2,
              bgcolor: isDark ? "rgba(0,136,204,0.06)" : "rgba(0,136,204,0.03)",
              borderColor: isDark ? "rgba(0,136,204,0.2)" : "rgba(0,136,204,0.15)",
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                mb: 1,
              }}
            >
              <Typography variant="subtitle2" fontWeight={600}>
                Sample JSON Template
              </Typography>
              <Box sx={{ display: "flex", gap: 1 }}>
                <Tooltip title={copied ? "Copied!" : "Copy sample JSON"}>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={
                      copied ? <CheckCircleIcon /> : <ContentCopyIcon />
                    }
                    onClick={handleCopySample}
                    color={copied ? "success" : "primary"}
                  >
                    {copied ? "Copied" : "Copy"}
                  </Button>
                </Tooltip>
                <Tooltip title="Download as file">
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<DownloadIcon />}
                    onClick={handleDownloadSample}
                  >
                    Download
                  </Button>
                </Tooltip>
              </Box>
            </Box>
            <Box
              sx={{
                maxHeight: 300,
                overflow: "auto",
                bgcolor: isDark ? "#0d1117" : "#f6f8fa",
                borderRadius: 1,
                p: 2,
              }}
            >
              <Typography
                variant="body2"
                component="pre"
                sx={{
                  fontFamily:
                    '"Fira Code", "Consolas", "Monaco", monospace',
                  fontSize: "0.78rem",
                  margin: 0,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  color: isDark ? "#e6edf3" : "#24292f",
                }}
              >
                {JSON.stringify(SAMPLE_JSON, null, 2)}
              </Typography>
            </Box>
          </Paper>
        </>
      ) : (
        /* Questions Preview Table */
        <>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              mb: 2,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <CheckCircleIcon color="success" />
              <Typography variant="h6">
                {questions.length} Question{questions.length > 1 ? "s" : ""}{" "}
                Loaded
              </Typography>
            </Box>
            <Box sx={{ display: "flex", gap: 1 }}>
              <Button
                size="small"
                variant="outlined"
                startIcon={
                  showPreview ? <VisibilityOffIcon /> : <VisibilityIcon />
                }
                onClick={() => setShowPreview(!showPreview)}
              >
                {showPreview ? "Hide Preview" : "Show Preview"}
              </Button>
              <Button
                size="small"
                variant="outlined"
                color="error"
                onClick={() => {
                  setQuestions([]);
                  setParseError("");
                }}
              >
                Clear All
              </Button>
            </Box>
          </Box>

          <Collapse in={showPreview}>
            <TableContainer
              component={Paper}
              variant="outlined"
              sx={{
                maxHeight: 350,
                mb: 2,
                borderRadius: 2,
              }}
            >
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, width: 40 }}>#</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Title</TableCell>
                    <TableCell sx={{ fontWeight: 700, width: 110 }}>
                      Type
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, width: 100 }}>
                      Difficulty
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, width: 70 }}>
                      Marks
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, width: 80 }}>
                      Tests
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, width: 50 }}></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {questions.map((q, index) => (
                    <TableRow key={index} hover>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>
                        <Typography
                          variant="body2"
                          noWrap
                          sx={{ maxWidth: 300 }}
                        >
                          {q.title}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={q.type === "mcq" ? "MCQ" : "Programming"}
                          size="small"
                          color={q.type === "mcq" ? "info" : "primary"}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={q.difficultyLevel || "medium"}
                          size="small"
                          color={getDifficultyColor(
                            q.difficultyLevel || "medium"
                          )}
                          variant="filled"
                        />
                      </TableCell>
                      <TableCell>{q.marks || 10}</TableCell>
                      <TableCell>
                        {q.type === "mcq"
                          ? `${q.options?.length || 0} opts`
                          : `${q.testCases?.length || 0} cases`}
                      </TableCell>
                      <TableCell>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleRemoveQuestion(index)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Collapse>

          {/* Summary chips */}
          <Box sx={{ display: "flex", gap: 1, mb: 2, flexWrap: "wrap" }}>
            <Chip
              label={`${questions.filter((q) => q.type === "programming").length} Programming`}
              size="small"
              color="primary"
              variant="outlined"
            />
            <Chip
              label={`${questions.filter((q) => q.type === "mcq").length} MCQ`}
              size="small"
              color="info"
              variant="outlined"
            />
            <Chip
              label={`${questions.filter((q) => q.difficultyLevel === "easy").length} Easy`}
              size="small"
              color="success"
              variant="outlined"
            />
            <Chip
              label={`${questions.filter((q) => q.difficultyLevel === "medium" || !q.difficultyLevel).length} Medium`}
              size="small"
              color="warning"
              variant="outlined"
            />
            <Chip
              label={`${questions.filter((q) => q.difficultyLevel === "hard").length} Hard`}
              size="small"
              color="error"
              variant="outlined"
            />
            <Chip
              label={`Total Marks: ${questions.reduce((sum, q) => sum + (q.marks || 10), 0)}`}
              size="small"
              variant="outlined"
            />
          </Box>

          {/* Action Buttons */}
          <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
            <Button onClick={onCancel} variant="outlined" color="inherit">
              Cancel
            </Button>
            <Button
              variant="contained"
              color="primary"
              onClick={handleUpload}
              disabled={parentLoading || questions.length === 0}
              startIcon={
                parentLoading ? (
                  <CircularProgress size={20} color="inherit" />
                ) : (
                  <CloudUploadIcon />
                )
              }
              size="large"
            >
              {parentLoading
                ? "Uploading..."
                : `Upload ${questions.length} Question${questions.length > 1 ? "s" : ""}`}
            </Button>
          </Box>
        </>
      )}
    </Box>
  );
};

export default BulkQuestionUpload;
