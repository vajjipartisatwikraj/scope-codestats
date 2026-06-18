import React, { useState, useCallback } from 'react';
import {
  Box,
  TextField,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Paper,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider
} from '@mui/material';
import {
  Preview as PreviewIcon,
  ExpandMore as ExpandMoreIcon,
  Code as CodeIcon,
  FormatBold as FormatBoldIcon,
  FormatItalic as FormatItalicIcon,
  List as ListIcon,
  Image as ImageIcon,
  TableChart as TableIcon
} from '@mui/icons-material';

const HtmlDescriptionEditor = ({ value, onChange, error, helperText }) => {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const handlePreview = useCallback(() => {
    setPreviewOpen(true);
  }, []);

  const handleClosePreview = useCallback(() => {
    setPreviewOpen(false);
  }, []);

  const insertHtmlTag = useCallback((tag, example = '') => {
    const textarea = document.getElementById('description-textarea');
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    
    let insertText = '';
    switch (tag) {
      case 'p':
        insertText = `<p>${selectedText || 'Your paragraph text here'}</p>`;
        break;
      case 'strong':
        insertText = `<strong>${selectedText || 'Bold text'}</strong>`;
        break;
      case 'em':
        insertText = `<em>${selectedText || 'Italic text'}</em>`;
        break;
      case 'code':
        insertText = `<code>${selectedText || 'your code here'}</code>`;
        break;
      case 'ul':
        insertText = `<ul>\n  <li>${selectedText || 'List item 1'}</li>\n  <li>List item 2</li>\n</ul>`;
        break;
      case 'ol':
        insertText = `<ol>\n  <li>${selectedText || 'List item 1'}</li>\n  <li>List item 2</li>\n</ol>`;
        break;
      case 'table':
        insertText = `<table border="1" style="border-collapse: collapse; width: 100%;">
  <thead>
    <tr>
      <th>Header 1</th>
      <th>Header 2</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Data 1</td>
      <td>Data 2</td>
    </tr>
  </tbody>
</table>`;
        break;
      case 'img':
        insertText = `<img src="image-url" alt="Description" style="max-width: 100%; height: auto;" />`;
        break;
      case 'br':
        insertText = '<br />';
        break;
      case 'hr':
        insertText = '<hr />';
        break;
      default:
        insertText = example || `<${tag}>${selectedText}</${tag}>`;
    }

    const newValue = value.substring(0, start) + insertText + value.substring(end);
    onChange({ target: { name: 'description', value: newValue } });

    // Focus back on textarea and set cursor position
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + insertText.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 10);
  }, [value, onChange]);

  const htmlElements = [
    { tag: 'p', label: 'Paragraph', icon: <FormatBoldIcon />, color: 'primary' },
    { tag: 'strong', label: 'Bold', icon: <FormatBoldIcon />, color: 'secondary' },
    { tag: 'em', label: 'Italic', icon: <FormatItalicIcon />, color: 'secondary' },
    { tag: 'code', label: 'Code', icon: <CodeIcon />, color: 'info' },
    { tag: 'ul', label: 'Bullet List', icon: <ListIcon />, color: 'success' },
    { tag: 'ol', label: 'Numbered List', icon: <ListIcon />, color: 'success' },
    { tag: 'table', label: 'Table', icon: <TableIcon />, color: 'warning' },
    { tag: 'img', label: 'Image', icon: <ImageIcon />, color: 'error' },
    { tag: 'br', label: 'Line Break', color: 'default' },
    { tag: 'hr', label: 'Horizontal Rule', color: 'default' }
  ];

  const predefinedStyles = `
    /* Predefined styles for question descriptions */
    .question-description {
      font-family: 'Roboto', sans-serif;
      line-height: 1.6;
      color: #333;
    }
    
    .question-description h1, .question-description h2, .question-description h3 {
      color: #1976d2;
      margin-top: 1.5em;
      margin-bottom: 0.5em;
    }
    
    .question-description code {
      background-color: #f5f5f5;
      padding: 2px 6px;
      border-radius: 4px;
      font-family: 'Courier New', monospace;
      color: #d32f2f;
      border: 1px solid #e0e0e0;
    }
    
    .question-description pre {
      background-color: #f5f5f5;
      padding: 16px;
      border-radius: 8px;
      overflow-x: auto;
      border: 1px solid #e0e0e0;
      margin: 16px 0;
    }
    
    .question-description table {
      border-collapse: collapse;
      width: 100%;
      margin: 16px 0;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    
    .question-description th, .question-description td {
      border: 1px solid #ddd;
      padding: 12px;
      text-align: left;
    }
    
    .question-description th {
      background-color: #1976d2;
      color: white;
      font-weight: bold;
    }
    
    .question-description tr:nth-child(even) {
      background-color: #f9f9f9;
    }
    
    .question-description img {
      max-width: 100%;
      height: auto;
      border-radius: 8px;
      margin: 16px 0;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    
    .question-description ul, .question-description ol {
      margin: 16px 0;
      padding-left: 24px;
    }
    
    .question-description li {
      margin: 8px 0;
    }
    
    .question-description blockquote {
      border-left: 4px solid #1976d2;
      padding-left: 16px;
      margin: 16px 0;
      font-style: italic;
      background-color: #f8f9fa;
      padding: 16px;
      border-radius: 0 8px 8px 0;
    }
    
    .highlight {
      background-color: #fff3cd;
      padding: 2px 4px;
      border-radius: 4px;
    }
    
    .note {
      background-color: #e3f2fd;
      border: 1px solid #2196f3;
      padding: 16px;
      border-radius: 8px;
      margin: 16px 0;
    }
    
    .warning {
      background-color: #fff3e0;
      border: 1px solid #ff9800;
      padding: 16px;
      border-radius: 8px;
      margin: 16px 0;
    }
  `;

  return (
    <Box>
      <Typography variant="subtitle1" gutterBottom>
        Description* (HTML Supported)
      </Typography>
      
      {/* HTML Helper Buttons */}
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
          {htmlElements.map((element) => (
            <Chip
              key={element.tag}
              label={element.label}
              icon={element.icon}
              color={element.color}
              variant="outlined"
              size="small"
              clickable
              onClick={() => insertHtmlTag(element.tag)}
              sx={{ cursor: 'pointer' }}
            />
          ))}
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<PreviewIcon />}
            onClick={handlePreview}
            disabled={!value}
          >
            Preview
          </Button>
          <Button
            variant="text"
            size="small"
            onClick={() => setShowHelp(!showHelp)}
          >
            {showHelp ? 'Hide' : 'Show'} HTML Guide
          </Button>
        </Box>
      </Box>

      {/* HTML Guide */}
      {showHelp && (
        <Accordion sx={{ mb: 2 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle2">HTML Formatting Guide</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                  Basic Elements:
                </Typography>
                <Box component="pre" sx={{ fontSize: '0.75rem', backgroundColor: '#f5f5f5', p: 1, borderRadius: 1 }}>
{`<p>Paragraph text</p>
<strong>Bold text</strong>
<em>Italic text</em>
<code>Inline code</code>
<br /> <!-- Line break -->
<hr /> <!-- Horizontal line -->`}
                </Box>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                  Lists:
                </Typography>
                <Box component="pre" sx={{ fontSize: '0.75rem', backgroundColor: '#f5f5f5', p: 1, borderRadius: 1 }}>
{`<ul>
  <li>Bullet point 1</li>
  <li>Bullet point 2</li>
</ul>

<ol>
  <li>Numbered item 1</li>
  <li>Numbered item 2</li>
</ol>`}
                </Box>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                  Tables:
                </Typography>
                <Box component="pre" sx={{ fontSize: '0.75rem', backgroundColor: '#f5f5f5', p: 1, borderRadius: 1 }}>
{`<table border="1">
  <thead>
    <tr>
      <th>Header 1</th>
      <th>Header 2</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Data 1</td>
      <td>Data 2</td>
    </tr>
  </tbody>
</table>`}
                </Box>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                  Images & Special:
                </Typography>
                <Box component="pre" sx={{ fontSize: '0.75rem', backgroundColor: '#f5f5f5', p: 1, borderRadius: 1 }}>
{`<img src="url" alt="description" 
     style="max-width:400px;" />

<div class="note">
  Note: Important information
</div>

<div class="warning">
  Warning: Be careful here
</div>

<span class="highlight">
  Highlighted text
</span>`}
                </Box>
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>
      )}

      {/* Description Textarea */}
      <TextField
        id="description-textarea"
        name="description"
        value={value}
        onChange={onChange}
        fullWidth
        multiline
        rows={12}
        error={!!error}
        helperText={error || "Use HTML tags for formatting. Click elements above to insert them."}
        placeholder="Enter question description with HTML formatting...

Example:
<p>Solve the following problem:</p>
<p>Given an array of integers, find the <strong>maximum sum</strong> of any contiguous subarray.</p>

<div class='note'>
<strong>Note:</strong> This is a classic dynamic programming problem.
</div>

<p><strong>Example:</strong></p>
<table border='1' style='border-collapse: collapse;'>
  <tr>
    <th>Input</th>
    <th>Output</th>
  </tr>
  <tr>
    <td><code>[1, -3, 2, 1, -1]</code></td>
    <td><code>3</code></td>
  </tr>
</table>"
        sx={{
          '& .MuiInputBase-input': {
            fontFamily: 'Courier New, monospace',
            fontSize: '14px'
          }
        }}
      />

      {/* Preview Dialog */}
      <Dialog
        open={previewOpen}
        onClose={handleClosePreview}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { minHeight: '60vh' }
        }}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PreviewIcon />
            Description Preview
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <style>{predefinedStyles}</style>
          <Box 
            className="question-description"
            dangerouslySetInnerHTML={{ __html: value }} 
            sx={{ 
              minHeight: '200px',
              p: 2,
              border: '1px solid #e0e0e0',
              borderRadius: 1,
              backgroundColor: '#fafafa'
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClosePreview}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default HtmlDescriptionEditor;
