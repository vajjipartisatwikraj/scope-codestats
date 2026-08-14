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
  Tooltip,
  useTheme,
} from "@mui/material";
import {
  CloudUpload as CloudUploadIcon,
  ContentPaste as ContentPasteIcon,
  ContentCopy as ContentCopyIcon,
  CheckCircle as CheckCircleIcon,
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
          solutionCode:
            'import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        // Complete reference solution\n    }\n}',
        },
        {
          name: "python",
          version: "3.10.0",
          boilerplateCode: "# Your code here\n",
          solutionCode: "# Complete reference solution\n", 
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

// Keep these in sync with the backend limits in bulkQuestionUploadService.js.
const MAX_FILES = 25;
const MAX_QUESTIONS = 100;

const BulkQuestionUpload = ({ onUpload, onCancel, loading: parentLoading }) => {
  const theme = useTheme();
  const fileInputRef = useRef(null);
  const [files, setFiles] = useState([]);
  const [parseError, setParseError] = useState("");
  const [showPaste, setShowPaste] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [showPreview, setShowPreview] = useState(true);
  const [copied, setCopied] = useState(false);

  const isDark = theme.palette.mode === "dark";
  const questions = files.flatMap((file) =>
    file.questions.map((question, index) => ({
      ...question,
      sourceName: file.name,
      sourceIndex: index,
    }))
  );

  const isNonEmptyString = (value) =>
    typeof value === "string" && value.trim().length > 0;

  const validateQuestion = (question) => {
    const issues = [];

    if (!question || typeof question !== "object" || Array.isArray(question)) {
      return ["must be a question object"];
    }
    if (!isNonEmptyString(question.title)) issues.push("missing 'title'");
    if (!isNonEmptyString(question.description))
      issues.push("missing 'description'");
    if (!isNonEmptyString(question.type)) issues.push("missing 'type'");
    else if (!["mcq", "programming"].includes(question.type))
      issues.push("'type' must be 'mcq' or 'programming'");

    if (
      question.marks !== undefined &&
      (typeof question.marks !== "number" ||
        !Number.isFinite(question.marks) ||
        question.marks <= 0)
    ) {
      issues.push("'marks' must be a positive number");
    }

    if (question.difficultyLevel !== undefined &&
        !["easy", "medium", "hard"].includes(question.difficultyLevel)) {
      issues.push("'difficultyLevel' must be 'easy', 'medium', or 'hard'");
    }

    if (question.type === "mcq") {
      if (!Array.isArray(question.options) || question.options.length < 2) {
        issues.push("MCQ needs at least 2 options");
      } else {
        question.options.forEach((option, optionIndex) => {
          if (!option || !isNonEmptyString(option.text)) {
            issues.push(`option ${optionIndex + 1} is missing 'text'`);
          }
        });
        if (!question.options.some((option) => option?.isCorrect === true)) {
          issues.push("MCQ needs at least one correct option");
        }
      }
    }

    if (question.type === "programming") {
      if (!Array.isArray(question.languages) || question.languages.length === 0) {
        issues.push("programming question needs at least 1 language");
      } else {
        question.languages.forEach((language, languageIndex) => {
          const languageLabel = `language ${languageIndex + 1}`;
          if (!language || !isNonEmptyString(language.name)) {
            issues.push(`${languageLabel} is missing 'name'`);
            return;
          }
          if (![
            "c",
            "cpp",
            "java",
            "python",
            "javascript",
          ].includes(language.name)) {
            issues.push(`${languageLabel} has an unsupported 'name'`);
          }
          if (!isNonEmptyString(language.boilerplateCode)) {
            issues.push(`${languageLabel} is missing 'boilerplateCode'`);
          }
          if (!isNonEmptyString(language.solutionCode)) {
            issues.push(`${languageLabel} is missing 'solutionCode'`);
          }
        });
      }

      if (!isNonEmptyString(question.defaultLanguage)) {
        issues.push("programming question is missing 'defaultLanguage'");
      } else if (
        Array.isArray(question.languages) &&
        !question.languages.some(
          (language) => language?.name === question.defaultLanguage
        )
      ) {
        issues.push("'defaultLanguage' must match one of the languages");
      }

      if (!Array.isArray(question.testCases) || question.testCases.length === 0) {
        issues.push("programming question needs at least 1 test case");
      } else {
        question.testCases.forEach((testCase, testCaseIndex) => {
          if (!testCase || typeof testCase !== "object") {
            issues.push(`test case ${testCaseIndex + 1} must be an object`);
            return;
          }
          if (typeof testCase.input !== "string")
            issues.push(`test case ${testCaseIndex + 1} needs a string 'input'`);
          if (typeof testCase.output !== "string")
            issues.push(`test case ${testCaseIndex + 1} needs a string 'output'`);
        });
      }

      ["timeLimit", "memoryLimit"].forEach((field) => {
        const value = question.constraints?.[field];
        if (
          value !== undefined &&
          (typeof value !== "number" ||
            !Number.isFinite(value) ||
            value <= 0)
        ) {
          issues.push(`'constraints.${field}' must be a positive number`);
        }
      });
    }

    return issues;
  };

  const parseSource = ({ name, text }) => {
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (error) {
      throw new Error(`${name}: invalid JSON (${error.message})`);
    }

    const sourceName = name;
    let sourceQuestions;
    if (Array.isArray(parsed)) {
      sourceQuestions = parsed;
    } else if (parsed && Array.isArray(parsed.questions)) {
      sourceQuestions = parsed.questions;
    } else if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      sourceQuestions = [parsed];
    } else {
      throw new Error(
        `${name}: JSON must be one question object, an array, or an object with a 'questions' array`
      );
    }

    if (sourceQuestions.length === 0) {
      throw new Error(`${sourceName}: no questions found`);
    }

    return { name: sourceName, questions: sourceQuestions };
  };

  const loadBatch = (rawFiles) => {
    try {
      const nextFiles = rawFiles.map(parseSource);
      const totalQuestions = nextFiles.reduce(
        (total, file) => total + file.questions.length,
        0
      );

      if (totalQuestions > MAX_QUESTIONS) {
        throw new Error(
          `Batch contains ${totalQuestions} questions; the maximum is ${MAX_QUESTIONS}`
        );
      }

      const errors = [];
      nextFiles.forEach((file) => {
        file.questions.forEach((question, questionIndex) => {
          validateQuestion(question).forEach((reason) => {
            errors.push(
              `${file.name} — Question ${questionIndex + 1}: ${reason}`
            );
          });
        });
      });

      if (errors.length > 0) throw new Error(errors.join("\n"));

      setFiles(nextFiles);
      setParseError("");
      setShowPaste(false);
      setPasteText("");
    } catch (error) {
      setFiles([]);
      setParseError(error.message);
    }
  };

  const readFile = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) =>
        resolve({ name: file.name, text: event.target.result });
      reader.onerror = () => reject(new Error(`${file.name}: failed to read file`));
      reader.readAsText(file);
    });

  const handleFileUpload = async (event) => {
    const selectedFiles = Array.from(event.target.files || []);
    event.target.value = "";
    if (selectedFiles.length === 0) return;

    if (selectedFiles.length > MAX_FILES) {
      setFiles([]);
      setParseError(
        `Selected ${selectedFiles.length} files; the maximum is ${MAX_FILES} files per batch`
      );
      return;
    }

    const invalidFile = selectedFiles.find(
      (file) => !file.name.toLowerCase().endsWith(".json")
    );
    if (invalidFile) {
      setFiles([]);
      setParseError(`${invalidFile.name}: only .json files are accepted`);
      return;
    }

    try {
      const rawFiles = await Promise.all(selectedFiles.map(readFile));
      loadBatch(rawFiles);
    } catch (error) {
      setFiles([]);
      setParseError(error.message);
    }
  };

  const handlePasteSubmit = () => {
    if (!pasteText.trim()) return;
    loadBatch([{ name: "Pasted JSON", text: pasteText }]);
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

  // Submit the fully validated atomic batch
  const handleUpload = () => {
    if (questions.length === 0) return;
    onUpload({ files });
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
              Upload Questions JSON Files
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ textAlign: "center", maxWidth: 450 }}
            >
              Select up to {MAX_FILES} JSON files in one batch. Every file and
              question is validated first; if anything is invalid, nothing is
              loaded or uploaded.
            </Typography>

            <input
              type="file"
              accept=".json"
              multiple
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
              Choose JSON Files
            </Button>

            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ mt: 1.5 }}
            >
              Maximum {MAX_FILES} .json files and {MAX_QUESTIONS} total questions
              per atomic upload
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
                    Paste one JSON source directly
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
                  setFiles([]);
                  setParseError("");
                }}
              >
                Clear All
              </Button>
            </Box>
          </Box>

          <Alert severity="info" sx={{ mb: 2 }}>
            This is an all-or-nothing upload. All {questions.length} questions from{" "}
            {files.length} source{files.length === 1 ? "" : "s"} will be created,
            or none will be created if validation fails.
          </Alert>

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
                    <TableCell sx={{ fontWeight: 700 }}>Source file</TableCell>
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
                  </TableRow>
                </TableHead>
                <TableBody>
                  {questions.map((q, index) => (
                    <TableRow key={`${q.sourceName}-${q.sourceIndex}`} hover>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>
                        <Typography variant="body2" noWrap sx={{ maxWidth: 180 }}>
                          {q.sourceName}
                        </Typography>
                      </TableCell>
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
