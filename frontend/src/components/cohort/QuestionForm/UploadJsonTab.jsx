import React, { memo, useState } from "react";
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
} from "@mui/material";
import {
  CloudUpload as CloudUploadIcon,
  ContentPaste as ContentPasteIcon,
} from "@mui/icons-material";

const UploadJsonTab = memo(
  ({
    fileInputRef,
    isUploading,
    onFileUpload,
    onUploadButtonClick,
    onPasteJSON,
  }) => {
    const [pasteJSONText, setPasteJSONText] = useState("");
    const [pasteJSONError, setPasteJSONError] = useState("");
    const [showPasteJSON, setShowPasteJSON] = useState(false);

    const handlePasteJSON = () => {
      try {
        setPasteJSONError("");
        const parsed = JSON.parse(pasteJSONText);

        // Basic validation
        if (!parsed.title || !parsed.description || !parsed.type) {
          setPasteJSONError(
            "JSON must include title, description, and type fields"
          );
          return;
        }

        // Call parent handler
        if (onPasteJSON) {
          onPasteJSON(parsed);
          setPasteJSONText("");
          setShowPasteJSON(false);
        }
      } catch (error) {
        setPasteJSONError("Invalid JSON format: " + error.message);
      }
    };
    return (
      <Box>
        <Typography variant="h6" gutterBottom>
          Upload or Paste Question JSON
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Upload a JSON file or paste JSON content to automatically populate the
          form.
        </Typography>

        {/* File Upload Section */}
        <Paper
          variant="outlined"
          sx={{
            p: 4,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            borderColor: "primary.main",
            borderStyle: "dashed",
            bgcolor: "background.paper",
            mt: 2,
          }}
        >
          <CloudUploadIcon
            sx={{ fontSize: 64, color: "primary.main", mb: 2 }}
          />

          <Typography variant="h6" gutterBottom>
            Upload Question JSON File
          </Typography>

          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mb: 3, textAlign: "center", maxWidth: 400 }}
          >
            Upload a JSON file with question details to automatically populate
            the form. The JSON should include title, description, type, and
            other relevant fields.
          </Typography>

          <input
            type="file"
            accept=".json"
            onChange={onFileUpload}
            style={{ display: "none" }}
            ref={fileInputRef}
          />

          <Button
            variant="contained"
            size="large"
            startIcon={
              isUploading ? <CircularProgress size={20} /> : <CloudUploadIcon />
            }
            onClick={onUploadButtonClick}
            disabled={isUploading}
          >
            {isUploading ? "Processing..." : "Choose JSON File"}
          </Button>

          <Typography variant="caption" color="text.secondary" sx={{ mt: 2 }}>
            Supported format: .json files only
          </Typography>
        </Paper>

        {/* Divider */}
        <Box sx={{ display: "flex", alignItems: "center", my: 3 }}>
          <Divider sx={{ flexGrow: 1 }} />
          <Typography variant="body2" sx={{ mx: 2, color: "text.secondary" }}>
            OR
          </Typography>
          <Divider sx={{ flexGrow: 1 }} />
        </Box>

        {/* Paste JSON Section */}
        <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              mb: showPasteJSON ? 2 : 0,
            }}
          >
            <Box>
              <Typography variant="h6">Paste JSON Content</Typography>
              {!showPasteJSON && (
                <Typography variant="body2" color="text.secondary">
                  Paste JSON directly instead of uploading a file
                </Typography>
              )}
            </Box>
            <Button
              variant={showPasteJSON ? "outlined" : "contained"}
              startIcon={<ContentPasteIcon />}
              onClick={() => {
                setShowPasteJSON(!showPasteJSON);
                if (!showPasteJSON) {
                  setPasteJSONError("");
                }
              }}
            >
              {showPasteJSON ? "Cancel" : "Paste JSON"}
            </Button>
          </Box>

          <Collapse in={showPasteJSON}>
            <TextField
              fullWidth
              multiline
              rows={12}
              value={pasteJSONText}
              onChange={(e) => setPasteJSONText(e.target.value)}
              placeholder={`Paste your JSON here. Example:

{
  "title": "Sample Problem",
  "description": "Problem description...",
  "type": "programming",
  "difficultyLevel": "medium",
  ...
}`}
              sx={{
                mb: 2,
                fontFamily: '"Fira Code", "Consolas", "Monaco", monospace',
                "& textarea": {
                  fontFamily: '"Fira Code", "Consolas", "Monaco", monospace',
                  fontSize: "0.85rem",
                },
              }}
            />

            {pasteJSONError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {pasteJSONError}
              </Alert>
            )}

            <Button
              variant="contained"
              onClick={handlePasteJSON}
              disabled={!pasteJSONText.trim()}
              fullWidth
            >
              Load Question from JSON
            </Button>
          </Collapse>
        </Paper>

        <Paper variant="outlined" sx={{ p: 2, mt: 3, bgcolor: "info.light" }}>
          <Typography variant="subtitle2" gutterBottom>
            Expected JSON Format:
          </Typography>
          <Typography
            variant="body2"
            component="pre"
            sx={{
              fontFamily: "monospace",
              fontSize: "0.8rem",
              overflow: "auto",
            }}
          >
            {`{
  "title": "Sample Problem",
  "description": "Problem description...",
  "type": "programming", // or "mcq"
  "difficultyLevel": "medium",
  "marks": 10,
  "languages": [
    {
      "name": "java",
      "version": "15.0.2",
      "boilerplateCode": "public class Main {...}",
      "solutionCode": "// solution here"
    }
  ],
  "defaultLanguage": "java",
  "testCases": [
    {
      "input": "1 2",
      "output": "3",
      "hidden": false,
      "explanation": "1 + 2 = 3"
    }
  ],
  "constraints": {
    "timeLimit": 1000,
    "memoryLimit": 256
  },
  "hints": ["Use addition operator"],
  "tags": ["math", "basic"],
  "companies": ["Google", "Microsoft"]
}`}
          </Typography>
        </Paper>
      </Box>
    );
  }
);

UploadJsonTab.displayName = "UploadJsonTab";

export default UploadJsonTab;
