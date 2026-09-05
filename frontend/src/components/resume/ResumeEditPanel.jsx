import React, { useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Divider,
  MenuItem,
  TextField,
  Typography,
} from "@mui/material";
import { CloudDownload as ImportIcon } from "@mui/icons-material";
import ResumeFieldEditor from "./ResumeFieldEditor";
import StyledDialog from "../common/StyledDialog";

/**
 * Left editing column. Renders itself from the template config, so a field
 * added in backend/resumeTemplates shows up here with no changes.
 */
const ResumeEditPanel = ({
  darkMode,
  templates,
  template,
  fonts,
  font,
  title,
  fields,
  importing,
  onTitleChange,
  onTemplateChange,
  onFontChange,
  onFieldChange,
  onImportFromProfile,
}) => {
  const mutedColor = darkMode ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)";
  const [confirmImport, setConfirmImport] = useState(false);

  const runImport = () => {
    setConfirmImport(false);
    onImportFromProfile();
  };

  return (
    <Box sx={{ height: "100%", overflowY: "auto", p: 2.5 }}>
      <Typography variant="overline" sx={{ color: mutedColor, letterSpacing: 1 }}>
        Resume
      </Typography>

      <TextField
        fullWidth
        size="small"
        label="Resume name"
        value={title}
        onChange={(e) => onTitleChange(e.target.value)}
        inputProps={{ maxLength: 80 }}
        sx={{ mt: 1.5 }}
      />

      <TextField
        select
        fullWidth
        size="small"
        label="Template"
        value={template.id}
        onChange={(e) => onTemplateChange(e.target.value)}
        sx={{ mt: 2 }}
      >
        {templates.map((option) => (
          <MenuItem key={option.id} value={option.id}>
            {option.name}
          </MenuItem>
        ))}
      </TextField>

      {/* Only fonts that survive the PDF and Word exports are offered */}
      <TextField
        select
        fullWidth
        size="small"
        label="Font style"
        value={font}
        onChange={(e) => onFontChange(e.target.value)}
        sx={{ mt: 2 }}
        SelectProps={{
          renderValue: (value) => {
            const option = fonts.find((item) => item.id === value);
            return (
              <Box component="span" sx={{ fontFamily: option?.cssFamily }}>
                {option?.name || value}
              </Box>
            );
          },
        }}
      >
        {fonts.map((option) => (
          <MenuItem key={option.id} value={option.id}>
            <Box sx={{ minWidth: 0 }}>
              {/* Each option previews itself in its own family */}
              <Typography sx={{ fontFamily: option.cssFamily, fontSize: "0.95rem" }}>
                {option.name}
              </Typography>
              <Typography variant="caption" sx={{ color: mutedColor }}>
                {option.category}
              </Typography>
            </Box>
          </MenuItem>
        ))}
      </TextField>

      {/* Pulls name, contact, about, education, skills, internships, projects
          and certifications from the saved profile */}
      <Button
        fullWidth
        variant="contained"
        disabled={importing}
        onClick={() => setConfirmImport(true)}
        startIcon={
          importing ? <CircularProgress size={16} color="inherit" /> : <ImportIcon />
        }
        sx={{
          mt: 1.5,
          textTransform: "none",
          bgcolor: "#0088cc",
          "&:hover": { bgcolor: "#006699" },
          borderRadius: "8px",
        }}
      >
        {importing ? "Importing..." : "Import from profile"}
      </Button>

      <Divider sx={{ my: 2.5 }} />

      {template.fields.map((definition) => {
        const field = fields.find((item) => item.key === definition.key);
        if (!field) return null;

        return (
          <Box key={definition.key}>
            {/* Section heading, mirroring how the field prints on the page */}
            {definition.section && (
              <Typography
                variant="overline"
                sx={{
                  display: "block",
                  mt: 1,
                  mb: 1.5,
                  letterSpacing: 1,
                  fontWeight: 700,
                  color: template.typography.colors.section,
                  borderBottom: `1px solid ${template.typography.colors.rule}`,
                }}
              >
                {definition.section}
              </Typography>
            )}

            <ResumeFieldEditor
              template={template}
              definition={definition}
              field={field}
              darkMode={darkMode}
              onChange={(patch) => onFieldChange(definition.key, patch)}
            />
          </Box>
        );
      })}

      <StyledDialog
        open={confirmImport}
        onClose={() => setConfirmImport(false)}
        darkMode={darkMode}
        maxWidth="xs"
        icon={<ImportIcon />}
        title="Import from profile"
        subtitle="Prefill this resume with your saved details."
        actions={
          <>
            <Button
              onClick={() => setConfirmImport(false)}
              sx={{ textTransform: "none", color: mutedColor }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={runImport}
              startIcon={<ImportIcon />}
              sx={{
                textTransform: "none",
                px: 2.5,
                borderRadius: "10px",
                bgcolor: "#0088cc",
                "&:hover": { bgcolor: "#006699" },
              }}
            >
              Import
            </Button>
          </>
        }
      >
        <Typography variant="body2" sx={{ color: mutedColor }}>
          This replaces the content of any section your profile has data for.
          Sections with nothing in your profile are left as they are, and font
          sizes are kept. Nothing is saved until you press Save Resume.
        </Typography>
      </StyledDialog>
    </Box>
  );
};

export default ResumeEditPanel;
