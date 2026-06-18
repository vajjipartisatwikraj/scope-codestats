import React, { useState, useEffect } from "react";
import {
  Box,
  TextField,
  Button,
  Typography,
  Divider,
  IconButton,
  Grid,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Paper,
  Collapse,
  Alert,
} from "@mui/material";
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  VideoLibrary as VideoIcon,
  Description as DocumentIcon,
  MenuBook as MenuBookIcon,
  Link as LinkIcon,
  Save as SaveIcon,
  Preview as PreviewIcon,
  Code as CodeIcon,
} from "@mui/icons-material";

const ModuleForm = ({ initialData, onSave, onCancel, isEdit = false }) => {
  const [previewMode, setPreviewMode] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    order: 0,
    videoResource: "",
    documentationUrl: "",
    resources: [],
  });
  const [newResource, setNewResource] = useState({
    title: "",
    url: "",
    type: "article",
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        resources: initialData.resources || [],
      });
    }
  }, [initialData]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });

    // Clear error when field is edited
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: "",
      });
    }
  };

  const handleResourceChange = (e) => {
    const { name, value } = e.target;
    setNewResource({
      ...newResource,
      [name]: value,
    });
  };

  const addResource = () => {
    if (!newResource.title.trim() || !newResource.url.trim()) {
      return;
    }

    setFormData({
      ...formData,
      resources: [...formData.resources, { ...newResource }],
    });

    // Reset new resource form
    setNewResource({
      title: "",
      url: "",
      type: "article",
    });
  };

  const removeResource = (index) => {
    const updatedResources = [...formData.resources];
    updatedResources.splice(index, 1);
    setFormData({
      ...formData,
      resources: updatedResources,
    });
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = "Title is required";
    }

    if (!formData.description.trim()) {
      newErrors.description = "Description is required";
    }

    if (formData.videoResource && !isValidUrl(formData.videoResource)) {
      newErrors.videoResource = "Please enter a valid URL";
    }

    // documentationUrl is now HTML content, not a URL, so no validation needed

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidUrl = (url) => {
    try {
      new URL(url);
      return true;
    } catch (error) {
      return false;
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (validateForm()) {
      onSave(formData);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <TextField
            required
            fullWidth
            label="Module Title"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            error={!!errors.title}
            helperText={errors.title}
          />
        </Grid>

        <Grid item xs={12}>
          <TextField
            required
            fullWidth
            label="Description"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            multiline
            rows={4}
            error={!!errors.description}
            helperText={errors.description}
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Order"
            name="order"
            type="number"
            value={formData.order}
            onChange={handleInputChange}
            InputProps={{ inputProps: { min: 0 } }}
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Video Resource URL"
            name="videoResource"
            value={formData.videoResource}
            onChange={handleInputChange}
            placeholder="https://example.com/video"
            error={!!errors.videoResource}
            helperText={errors.videoResource}
            InputProps={{
              startAdornment: <VideoIcon color="action" sx={{ mr: 1 }} />,
            }}
          />
        </Grid>

        <Grid item xs={12}>
          <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
            Documentation/Notes (HTML)
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Provide detailed documentation or notes in HTML format. This will be
            displayed to students.
          </Typography>

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
              disabled={!formData.documentationUrl}
            >
              Preview
            </Button>
          </Box>

          {!previewMode ? (
            <TextField
              fullWidth
              multiline
              rows={12}
              name="documentationUrl"
              value={formData.documentationUrl}
              onChange={handleInputChange}
              placeholder={`Enter HTML content for documentation. Example:

<h2>Module Overview</h2>
<p>This module covers <strong>fundamental concepts</strong>.</p>

<h3>Key Topics:</h3>
<ul>
  <li>Topic 1</li>
  <li>Topic 2</li>
  <li>Topic 3</li>
</ul>

<h3>Code Example:</h3>
<pre><code>function example() {
    console.log("Hello World");
}</code></pre>`}
              error={!!errors.documentationUrl}
              helperText={
                errors.documentationUrl ||
                "Supports HTML: headings, paragraphs, lists, code blocks, tables, etc."
              }
              sx={{
                fontFamily: '"Fira Code", "Consolas", "Monaco", monospace',
                fontSize: "0.9rem",
                "& textarea": {
                  fontFamily: '"Fira Code", "Consolas", "Monaco", monospace',
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
              <Box
                className="documentation-preview"
                sx={{
                  "& h1, & h2, & h3, & h4": {
                    marginTop: 2,
                    marginBottom: 1,
                    fontWeight: 600,
                  },
                  "& p": {
                    marginBottom: 1,
                    lineHeight: 1.6,
                  },
                  "& pre": {
                    backgroundColor: "rgba(0,0,0,0.05)",
                    padding: 2,
                    borderRadius: 1,
                    overflow: "auto",
                    fontSize: "0.9rem",
                  },
                  "& code": {
                    fontFamily: '"Fira Code", "Consolas", "Monaco", monospace',
                    backgroundColor: "rgba(0,0,0,0.05)",
                    padding: "2px 6px",
                    borderRadius: "3px",
                  },
                  "& pre code": {
                    backgroundColor: "transparent",
                    padding: 0,
                  },
                  "& ul, & ol": {
                    paddingLeft: 3,
                    marginBottom: 1,
                  },
                  "& table": {
                    borderCollapse: "collapse",
                    width: "100%",
                    marginBottom: 2,
                  },
                  "& th, & td": {
                    border: "1px solid",
                    borderColor: "divider",
                    padding: 1,
                  },
                  "& th": {
                    backgroundColor: "action.hover",
                    fontWeight: 600,
                  },
                  "& img": {
                    maxWidth: "100%",
                    height: "auto",
                    marginBottom: 1,
                  },
                }}
                dangerouslySetInnerHTML={{ __html: formData.documentationUrl }}
              />
            </Paper>
          )}
        </Grid>
      </Grid>

      <Box sx={{ mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Additional Resources
        </Typography>
        <Divider sx={{ mb: 2 }} />

        <Grid container spacing={2} alignItems="flex-end">
          <Grid item xs={12} sm={5}>
            <TextField
              fullWidth
              label="Resource Title"
              name="title"
              value={newResource.title}
              onChange={handleResourceChange}
              placeholder="e.g., Java Documentation"
            />
          </Grid>

          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="URL"
              name="url"
              value={newResource.url}
              onChange={handleResourceChange}
              placeholder="https://example.com"
              InputProps={{
                startAdornment: <LinkIcon color="action" sx={{ mr: 1 }} />,
              }}
            />
          </Grid>

          <Grid item xs={12} sm={2}>
            <FormControl fullWidth>
              <InputLabel>Type</InputLabel>
              <Select
                name="type"
                value={newResource.type}
                onChange={handleResourceChange}
                label="Type"
              >
                <MenuItem value="video">Video</MenuItem>
                <MenuItem value="document">Document</MenuItem>
                <MenuItem value="tutorial">Tutorial</MenuItem>
                <MenuItem value="article">Article</MenuItem>
                <MenuItem value="other">Other</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={1}>
            <Button
              variant="contained"
              color="primary"
              onClick={addResource}
              disabled={!newResource.title || !newResource.url}
              sx={{ minWidth: "auto" }}
            >
              <AddIcon />
            </Button>
          </Grid>
        </Grid>

        {formData.resources.length > 0 ? (
          <List sx={{ mt: 2 }}>
            {formData.resources.map((resource, index) => (
              <ListItem
                key={index}
                sx={{
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 1,
                  mb: 1,
                }}
              >
                <ListItemText
                  primary={resource.title}
                  secondary={
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <a
                        href={resource.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: "inherit" }}
                      >
                        {resource.url}
                      </a>
                      <Chip
                        label={resource.type}
                        size="small"
                        icon={
                          resource.type === "video" ? (
                            <VideoIcon fontSize="small" />
                          ) : resource.type === "document" ? (
                            <DocumentIcon fontSize="small" />
                          ) : (
                            <MenuBookIcon fontSize="small" />
                          )
                        }
                      />
                    </Box>
                  }
                />
                <ListItemSecondaryAction>
                  <IconButton
                    edge="end"
                    aria-label="delete"
                    onClick={() => removeResource(index)}
                    color="error"
                  >
                    <DeleteIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        ) : (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 2, textAlign: "center" }}
          >
            No additional resources added yet.
          </Typography>
        )}
      </Box>

      <Box sx={{ mt: 4, display: "flex", justifyContent: "flex-end", gap: 2 }}>
        <Button onClick={onCancel} variant="outlined">
          Cancel
        </Button>
        <Button
          type="submit"
          variant="contained"
          color="primary"
          startIcon={<SaveIcon />}
        >
          {isEdit ? "Update Module" : "Create Module"}
        </Button>
      </Box>
    </Box>
  );
};

export default ModuleForm;
