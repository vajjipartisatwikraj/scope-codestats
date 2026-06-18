import React, { useState } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Alert,
  Divider,
} from "@mui/material";
import PreviewIcon from "@mui/icons-material/Preview";
import CodeIcon from "@mui/icons-material/Code";

const EditorialTab = ({ formData, onInputChange }) => {
  const [previewMode, setPreviewMode] = useState(false);

  const handleEditorialChange = (e) => {
    onInputChange({
      target: {
        name: "editorial",
        value: e.target.value,
      },
    });
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Editorial Content
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Provide a detailed explanation of the solution. You can use HTML
        formatting for rich content including headings, tables, code blocks,
        images, and more.
      </Typography>

      <Alert severity="info" sx={{ mb: 2 }}>
        <Typography variant="body2" sx={{ mb: 1 }}>
          <strong>Supported HTML Elements:</strong>
        </Typography>
        <Typography variant="caption" component="div">
          • Headings: &lt;h1&gt;, &lt;h2&gt;, &lt;h3&gt;
          <br />
          • Text: &lt;p&gt;, &lt;strong&gt;, &lt;em&gt;, &lt;code&gt;
          <br />
          • Lists: &lt;ul&gt;, &lt;ol&gt;, &lt;li&gt;
          <br />
          • Code Blocks: &lt;pre&gt;&lt;code&gt;...&lt;/code&gt;&lt;/pre&gt;
          <br />
          • Tables: &lt;table&gt;, &lt;thead&gt;, &lt;tbody&gt;, &lt;tr&gt;,
          &lt;th&gt;, &lt;td&gt;
          <br />
          • Images: &lt;img src="url" alt="description"&gt;
          <br />
          • Links: &lt;a href="url"&gt;text&lt;/a&gt;
          <br />
          • Blockquotes: &lt;blockquote&gt;
          <br />• Horizontal Rule: &lt;hr&gt;
        </Typography>
      </Alert>

      <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
        <Button
          variant={!previewMode ? "contained" : "outlined"}
          startIcon={<CodeIcon />}
          onClick={() => setPreviewMode(false)}
          size="small"
        >
          Edit HTML
        </Button>
        <Button
          variant={previewMode ? "contained" : "outlined"}
          startIcon={<PreviewIcon />}
          onClick={() => setPreviewMode(true)}
          size="small"
        >
          Preview
        </Button>
      </Box>

      {!previewMode ? (
        <TextField
          fullWidth
          multiline
          rows={20}
          value={formData.editorial || ""}
          onChange={handleEditorialChange}
          placeholder={`Enter HTML content for the editorial. Example:

<h2>Approach</h2>
<p>This problem can be solved using a <strong>greedy approach</strong>.</p>

<h3>Algorithm Steps:</h3>
<ol>
  <li>Initialize variables</li>
  <li>Iterate through the array</li>
  <li>Update the result</li>
</ol>

<h3>Example Code:</h3>
<pre><code>function solve(arr) {
    let result = 0;
    for (let i = 0; i < arr.length; i++) {
        result += arr[i];
    }
    return result;
}</code></pre>

<h3>Complexity Analysis:</h3>
<table>
  <thead>
    <tr>
      <th>Metric</th>
      <th>Complexity</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Time</td>
      <td>O(n)</td>
    </tr>
    <tr>
      <td>Space</td>
      <td>O(1)</td>
    </tr>
  </tbody>
</table>

<blockquote>
<strong>Note:</strong> This is the most optimal solution.
</blockquote>

<h3>Additional Resources:</h3>
<ul>
  <li><a href="https://example.com" target="_blank">Related Article</a></li>
  <li><a href="https://example.com" target="_blank">Video Tutorial</a></li>
</ul>`}
          variant="outlined"
          sx={{
            fontFamily:
              '"Fira Code", "JetBrains Mono", "Consolas", "Monaco", monospace',
            fontSize: "0.875rem",
            "& .MuiInputBase-input": {
              fontFamily:
                '"Fira Code", "JetBrains Mono", "Consolas", "Monaco", monospace',
            },
          }}
        />
      ) : (
        <Paper
          variant="outlined"
          sx={{
            p: 3,
            minHeight: "400px",
            maxHeight: "600px",
            overflow: "auto",
            bgcolor: "background.paper",
          }}
        >
          {formData.editorial ? (
            <Box
              className="editorial-preview"
              sx={{
                color: "text.primary",
                lineHeight: 1.7,
                fontSize: "0.875rem",
                wordWrap: "break-word",
                overflowWrap: "break-word",
                "& h1": {
                  fontSize: "1.75rem",
                  fontWeight: "bold",
                  marginTop: "1.5em",
                  marginBottom: "0.75em",
                  paddingBottom: "0.5em",
                  borderBottom: "2px solid",
                  borderColor: "primary.main",
                },
                "& h2": {
                  fontSize: "1.35rem",
                  fontWeight: "bold",
                  marginTop: "1.5em",
                  marginBottom: "0.75em",
                  color: "primary.main",
                },
                "& h3": {
                  fontSize: "1.15rem",
                  fontWeight: "600",
                  marginTop: "1.25em",
                  marginBottom: "0.5em",
                  color: "primary.main",
                },
                "& h4, & h5, & h6": {
                  fontSize: "1rem",
                  fontWeight: "600",
                  marginTop: "1em",
                  marginBottom: "0.5em",
                  color: "primary.main",
                },
                "& p": {
                  marginBottom: "0.875rem",
                  lineHeight: 1.7,
                  wordWrap: "break-word",
                },
                "& code": {
                  backgroundColor: "rgba(0, 136, 204, 0.1)",
                  color: "primary.main",
                  padding: "2px 6px",
                  borderRadius: "4px",
                  fontFamily:
                    '"Fira Code", "JetBrains Mono", "Consolas", "Monaco", monospace',
                  fontSize: "0.85em",
                  fontWeight: "500",
                  border: "1px solid rgba(0, 136, 204, 0.2)",
                  wordBreak: "break-word",
                },
                "& pre": {
                  backgroundColor: "action.hover",
                  padding: "12px",
                  borderRadius: "8px",
                  overflow: "auto",
                  border: "1px solid",
                  borderColor: "divider",
                  margin: "12px 0",
                  "& code": {
                    backgroundColor: "transparent",
                    border: "none",
                    padding: 0,
                    fontSize: "0.8rem",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  },
                },
                "& table": {
                  borderCollapse: "collapse",
                  width: "100% !important",
                  minWidth: "100%",
                  margin: "12px 0",
                  border: "1px solid",
                  borderColor: "divider",
                  tableLayout: "fixed",
                },
                "& thead": {
                  backgroundColor: "primary.main",
                },
                "& tbody": {},
                "& tr": {},
                "& th": {
                  padding: "8px 12px",
                  textAlign: "left",
                  fontWeight: "bold",
                  fontSize: "0.875rem",
                  color: "white",
                  border: "1px solid",
                  borderColor: "divider",
                  whiteSpace: "normal",
                  wordWrap: "break-word",
                  overflow: "hidden",
                },
                "& td": {
                  padding: "8px 12px",
                  fontSize: "0.875rem",
                  border: "1px solid",
                  borderColor: "divider",
                  whiteSpace: "normal",
                  wordWrap: "break-word",
                  overflow: "hidden",
                },
                "& tbody tr:nth-of-type(even)": {
                  backgroundColor: "action.hover",
                },
                "& img": {
                  maxWidth: "100%",
                  height: "auto",
                  display: "block",
                  margin: "12px 0",
                  borderRadius: "8px",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                },
                "& ul, & ol": {
                  margin: "12px 0",
                  paddingLeft: "24px",
                  wordWrap: "break-word",
                },
                "& li": {
                  margin: "6px 0",
                  wordWrap: "break-word",
                },
                "& blockquote": {
                  borderLeft: "4px solid",
                  borderColor: "primary.main",
                  paddingLeft: "16px",
                  margin: "12px 0",
                  fontStyle: "italic",
                  backgroundColor: "action.hover",
                  padding: "12px 12px 12px 16px",
                  borderRadius: "0 8px 8px 0",
                },
                "& a": {
                  color: "primary.main",
                  textDecoration: "none",
                  wordBreak: "break-word",
                  "&:hover": {
                    textDecoration: "underline",
                  },
                },
                "& hr": {
                  margin: "16px 0",
                  border: "none",
                  borderTop: "1px solid",
                  borderColor: "divider",
                },
                "& strong": {
                  fontWeight: "bold",
                },
                "& em": {
                  fontStyle: "italic",
                },
              }}
              dangerouslySetInnerHTML={{ __html: formData.editorial }}
            />
          ) : (
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                minHeight: "400px",
                color: "text.secondary",
              }}
            >
              <Typography variant="body1">
                No editorial content to preview. Add HTML content in the editor.
              </Typography>
            </Box>
          )}
        </Paper>
      )}
    </Box>
  );
};

export default EditorialTab;
