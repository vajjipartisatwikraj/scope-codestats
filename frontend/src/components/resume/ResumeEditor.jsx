import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import {
  Box,
  Button,
  CircularProgress,
  ListItemText,
  Menu,
  MenuItem,
  Typography,
} from "@mui/material";
import {
  Save as SaveIcon,
  Download as DownloadIcon,
  ArrowDropDown as ArrowDropDownIcon,
} from "@mui/icons-material";
import { toast } from "react-toastify";
import { apiUrl } from "../../config/apiConfig";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContext";
import ResumeSidebar, { RESUME_SIDEBAR_WIDTH } from "./ResumeSidebar";
import ResumeEditPanel from "./ResumeEditPanel";
import ResumePreview from "./ResumePreview";
import { getTemplateComponent } from "./templates";
import { EXPORT_FORMATS, exportResumeAsWord } from "../../utils/resumeExport";
import { downloadResumePdf } from "../../utils/resumePdf";
import {
  applyProfileSnapshot,
  buildFields,
  isResumeDirty,
  setFieldValue,
  formatUpdatedAt,
} from "../../utils/resume";

const NAVBAR_HEIGHT = 48;
// The edit column takes 30% of the screen, the preview gets the rest
const EDIT_PANEL_WIDTH = "30%";

/**
 * Full-screen resume editor, opened in its own tab from the resume list.
 * Layout: blue rail, top bar with Save, edit panel, live paper preview.
 */
const ResumeEditor = () => {
  const { id } = useParams();
  const auth = useAuth();
  const { darkMode } = useTheme();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportMenu, setExportMenu] = useState(null);

  // Unclipped copy of the resume, rendered off-screen purely as the export
  // source so the output flows across pages instead of inheriting the
  // preview's page windows.
  const exportRef = useRef(null);
  const [templates, setTemplates] = useState([]);
  const [fonts, setFonts] = useState([]);
  const [draft, setDraft] = useState({ title: "", template: "", font: "", fields: [] });
  const [updatedAt, setUpdatedAt] = useState(null);

  // Last persisted state, used to decide whether Save is enabled
  const savedRef = useRef({ title: "", template: "", font: "", fields: [] });

  const authHeader = useMemo(
    () => ({ headers: { Authorization: `Bearer ${auth?.token}` } }),
    [auth?.token],
  );

  useEffect(() => {
    if (!auth?.token) return;

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [templatesResponse, resumeResponse] = await Promise.all([
          axios.get(`${apiUrl}/resumes/templates`, authHeader),
          axios.get(`${apiUrl}/resumes/${id}`, authHeader),
        ]);
        if (cancelled) return;

        const templateList = templatesResponse.data.templates || [];
        const fontList = templatesResponse.data.fonts || [];
        const resume = resumeResponse.data;
        const template =
          templateList.find((item) => item.id === resume.template) || templateList[0];
        const font =
          fontList.find((item) => item.id === resume.font) ||
          fontList.find((item) => item.id === templatesResponse.data.defaultFont) ||
          fontList[0];

        const next = {
          title: resume.title,
          template: template?.id || resume.template,
          font: font?.id || resume.font || "",
          fields: buildFields(template, resume.fields),
        };

        setTemplates(templateList);
        setFonts(fontList);
        setDraft(next);
        savedRef.current = next;
        setUpdatedAt(resume.updatedAt);
        document.title = `${resume.title} · Resume Builder`;
      } catch (err) {
        if (!cancelled) {
          setError(
            err.response?.status === 404
              ? "This resume no longer exists."
              : "Could not load this resume. Please try again.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [id, auth?.token, authHeader]);

  const template = useMemo(
    () => templates.find((item) => item.id === draft.template),
    [templates, draft.template],
  );

  const font = useMemo(
    () => fonts.find((item) => item.id === draft.font) || fonts[0],
    [fonts, draft.font],
  );

  const dirty = template ? isResumeDirty(draft, savedRef.current) : false;

  // Switching template remaps the fields onto the new definition
  const handleTemplateChange = (templateId) => {
    const nextTemplate = templates.find((item) => item.id === templateId);
    if (!nextTemplate) return;
    setDraft((prev) => ({
      ...prev,
      template: templateId,
      fields: buildFields(nextTemplate, prev.fields),
    }));
  };

  const handleFieldChange = (key, patch) =>
    setDraft((prev) => ({ ...prev, fields: setFieldValue(prev.fields, key, patch) }));

  // Prefills the editor from the user's saved profile. Only updates the draft,
  // so the preview reflects it immediately and Save stays under the user's control.
  const handleImportFromProfile = async () => {
    setImporting(true);
    try {
      const response = await axios.get(`${apiUrl}/resumes/profile-data`, authHeader);
      const { fields: importedFields, applied } = applyProfileSnapshot(
        template,
        draft.fields,
        response.data.profile,
      );

      if (applied.length === 0) {
        toast.info("Your profile has nothing to import yet");
        return;
      }

      setDraft((prev) => ({ ...prev, fields: importedFields }));
      toast.success(`Imported ${applied.length} section${applied.length > 1 ? "s" : ""} from your profile`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not import from your profile");
    } finally {
      setImporting(false);
    }
  };

  const handleSave = async () => {
    if (!draft.title.trim()) {
      toast.error("Resume name is required");
      return;
    }

    setSaving(true);
    try {
      const response = await axios.put(`${apiUrl}/resumes/${id}`, draft, authHeader);
      const saved = {
        title: response.data.title,
        template: response.data.template,
        font: response.data.font,
        fields: buildFields(template, response.data.fields),
      };
      setDraft(saved);
      savedRef.current = saved;
      setUpdatedAt(response.data.updatedAt);
      document.title = `${saved.title} · Resume Builder`;
      toast.success("Resume saved");
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not save the resume");
    } finally {
      setSaving(false);
    }
  };

  // Exports the resume exactly as previewed. Works on the current draft, so
  // unsaved edits are included.
  const handleExport = async (format) => {
    setExportMenu(null);
    if (!template) return;

    setExporting(true);
    try {
      const options = {
        node: exportRef.current,
        title: draft.title || "resume",
        page: template.page,
      };

      if (format === "word") {
        exportResumeAsWord(options);
        toast.success("Word document downloaded");
      } else {
        await downloadResumePdf({
          template,
          fields: draft.fields,
          font,
          title: draft.title || "resume",
        });
        toast.success("PDF downloaded");
      }
    } catch (err) {
      toast.error(err.message || "Could not export the resume");
    } finally {
      setExporting(false);
    }
  };

  // Warn before losing unsaved edits
  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const panelBg = darkMode ? "#0A0A0A" : "#FFFFFF";
  const borderColor = darkMode ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)";
  const mutedColor = darkMode ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)";

  return (
    <Box
      sx={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        zIndex: 1200,
        bgcolor: darkMode ? "#232323" : "#f5f7fa",
        display: "flex",
      }}
    >
      <ResumeSidebar />

      <Box
        sx={{
          flexGrow: 1,
          height: "100%",
          ml: `${RESUME_SIDEBAR_WIDTH}px`,
          width: `calc(100% - ${RESUME_SIDEBAR_WIDTH}px)`,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
        }}
      >
        {/* Top bar */}
        <Box
          sx={{
            borderBottom: "1px solid #232528",
            bgcolor: panelBg,
            minHeight: `${NAVBAR_HEIGHT}px`,
            display: "flex",
            alignItems: "center",
            px: 2,
            py: 0.5,
            flexShrink: 0,
            backgroundImage: darkMode
              ? "linear-gradient(to right, rgba(10, 12, 16, 0.7), rgba(8, 9, 12, 0.7))"
              : "linear-gradient(to right, rgba(248, 250, 252, 0.9), rgba(255, 255, 255, 0.9))",
          }}
        >
          <Typography
            sx={{
              fontWeight: 600,
              fontSize: "0.95rem",
              color: darkMode ? "#fff" : "#0f172a",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {draft.title || "Resume"}
          </Typography>

          <Box sx={{ flexGrow: 1 }} />

          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Typography variant="caption" sx={{ color: mutedColor }}>
              {dirty
                ? "Unsaved changes"
                : updatedAt
                  ? `Saved ${formatUpdatedAt(updatedAt)}`
                  : ""}
            </Typography>

            {/* Export: format is chosen from the menu */}
            <Button
              variant="outlined"
              size="small"
              onClick={(e) => setExportMenu(e.currentTarget)}
              disabled={exporting || loading || !template}
              startIcon={
                exporting ? <CircularProgress size={14} /> : <DownloadIcon />
              }
              endIcon={<ArrowDropDownIcon />}
              sx={{
                height: 36,
                textTransform: "none",
                borderRadius: "4px",
                px: 2,
                color: "#0088cc",
                borderColor: "rgba(0,136,204,0.5)",
                "&:hover": { borderColor: "#0088cc", bgcolor: "rgba(0,136,204,0.06)" },
              }}
            >
              Export
            </Button>

            <Menu
              anchorEl={exportMenu}
              open={Boolean(exportMenu)}
              onClose={() => setExportMenu(null)}
              anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
              transformOrigin={{ vertical: "top", horizontal: "right" }}
              slotProps={{
                paper: {
                  sx: {
                    mt: 0.5,
                    minWidth: 250,
                    borderRadius: "12px",
                    bgcolor: darkMode ? "#121212" : "#ffffff",
                    border: `1px solid ${borderColor}`,
                    backgroundImage: "none",
                  },
                },
              }}
            >
              {EXPORT_FORMATS.map((format) => (
                <MenuItem
                  key={format.id}
                  onClick={() => handleExport(format.id)}
                  sx={{ py: 1 }}
                >
                  <ListItemText
                    primary={format.label}
                    secondary={format.hint}
                    primaryTypographyProps={{ fontSize: "0.9rem", fontWeight: 500 }}
                    secondaryTypographyProps={{ fontSize: "0.72rem" }}
                  />
                </MenuItem>
              ))}
            </Menu>

            <Button
              variant="contained"
              size="small"
              onClick={handleSave}
              disabled={!dirty || saving || loading || !template}
              startIcon={
                saving ? <CircularProgress size={14} color="inherit" /> : <SaveIcon />
              }
              sx={{
                height: 36,
                textTransform: "none",
                borderRadius: "4px",
                px: 2,
                backgroundColor: "#0088cc",
                "&:hover": { backgroundColor: "#006699" },
              }}
            >
              {saving ? "Saving..." : "Save Resume"}
            </Button>
          </Box>
        </Box>

        {/* Body */}
        {loading ? (
          <Box sx={{ flexGrow: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <CircularProgress />
          </Box>
        ) : error || !template ? (
          <Box sx={{ flexGrow: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Typography sx={{ color: mutedColor }}>
              {error || "This template is unavailable."}
            </Typography>
          </Box>
        ) : (
          <Box sx={{ flexGrow: 1, display: "flex", minHeight: 0, gap: 1, p: 1 }}>
            <Box
              sx={{
                width: EDIT_PANEL_WIDTH,
                minWidth: 300,
                flexShrink: 0,
                border: "1px solid",
                borderColor,
                borderRadius: "12px",
                bgcolor: panelBg,
                overflow: "hidden",
              }}
            >
              <ResumeEditPanel
                darkMode={darkMode}
                templates={templates}
                template={template}
                fonts={fonts}
                font={draft.font}
                title={draft.title}
                fields={draft.fields}
                importing={importing}
                onTitleChange={(title) => setDraft((prev) => ({ ...prev, title }))}
                onTemplateChange={handleTemplateChange}
                onFontChange={(nextFont) =>
                  setDraft((prev) => ({ ...prev, font: nextFont }))
                }
                onFieldChange={handleFieldChange}
                onImportFromProfile={handleImportFromProfile}
              />
            </Box>

            <Box
              sx={{
                flexGrow: 1,
                minWidth: 0,
                border: "1px solid",
                borderColor,
                borderRadius: "12px",
                bgcolor: panelBg,
                overflow: "hidden",
              }}
            >
              <ResumePreview
                darkMode={darkMode}
                template={template}
                fields={draft.fields}
                fontFamily={font?.cssFamily}
              />
            </Box>

            {/* Off-screen export source: full content at the printable width */}
            <Box
              aria-hidden
              sx={{
                position: "fixed",
                left: "-99999px",
                top: 0,
                width:
                  template.page.width -
                  (typeof template.page.margin === "number"
                    ? template.page.margin * 2
                    : (template.page.margin?.left || 0) + (template.page.margin?.right || 0)),
              }}
            >
              <Box ref={exportRef}>
                {React.createElement(getTemplateComponent(template.id), {
                  template,
                  fields: draft.fields,
                  fontFamily: font?.cssFamily,
                })}
              </Box>
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default ResumeEditor;
