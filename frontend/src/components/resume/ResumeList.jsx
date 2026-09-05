import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Box,
  Button,
  CircularProgress,
  Container,
  Grid,
  Grow,
  IconButton,
  InputAdornment,
  TextField,
  Typography,
} from "@mui/material";
import {
  Add as AddIcon,
  Article as ArticleIcon,
  CheckCircle as CheckCircleIcon,
  Delete as DeleteIcon,
  OpenInNew as OpenInNewIcon,
  Search as SearchIcon,
} from "@mui/icons-material";
import { toast } from "react-toastify";
import { apiUrl } from "../../config/apiConfig";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContext";
import ResumeCard from "./ResumeCard";
import StyledDialog from "../common/StyledDialog";

// Opens the builder in its own tab, as the editor is a full-screen surface
const openEditor = (resumeId) =>
  window.open(`/build-resume/${resumeId}/edit`, "_blank", "noopener");

const ResumeList = () => {
  const auth = useAuth();
  const { darkMode } = useTheme();

  const [resumes, setResumes] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [limit, setLimit] = useState(5);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [createDialog, setCreateDialog] = useState({ open: false, title: "", template: "" });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, resume: null });
  const [busy, setBusy] = useState(false);

  // Matches the helper used across the platform's list pages
  const getTextColor = (opacity) =>
    darkMode ? `rgba(255, 255, 255, ${opacity})` : `rgba(0, 0, 0, ${opacity})`;

  const authHeader = useMemo(
    () => ({ headers: { Authorization: `Bearer ${auth?.token}` } }),
    [auth?.token],
  );

  const loadResumes = useCallback(async () => {
    try {
      const response = await axios.get(`${apiUrl}/resumes`, authHeader);
      setResumes(response.data.resumes || []);
      setLimit(response.data.limit ?? 5);
    } catch {
      toast.error("Could not load your resumes");
    }
  }, [authHeader]);

  useEffect(() => {
    if (!auth?.token) return;

    const load = async () => {
      setLoading(true);
      try {
        const templatesResponse = await axios.get(`${apiUrl}/resumes/templates`, authHeader);
        setTemplates(templatesResponse.data.templates || []);
        await loadResumes();
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [auth?.token, authHeader, loadResumes]);

  const templateName = (templateId) =>
    templates.find((template) => template.id === templateId)?.name || templateId;

  // Client-side filtering keeps typing instant; the list is capped at 5
  const visibleResumes = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return resumes;
    return resumes.filter((resume) => resume.title.toLowerCase().includes(query));
  }, [resumes, search]);

  const atLimit = resumes.length >= limit;

  const openCreateDialog = () =>
    setCreateDialog({ open: true, title: "", template: templates[0]?.id || "" });

  const closeCreateDialog = () => setCreateDialog({ open: false, title: "", template: "" });

  const handleCreate = async () => {
    const title = createDialog.title.trim();
    if (!title) {
      toast.error("Please name your resume");
      return;
    }

    setBusy(true);
    try {
      const response = await axios.post(
        `${apiUrl}/resumes`,
        { title, template: createDialog.template },
        authHeader,
      );
      closeCreateDialog();
      await loadResumes();
      openEditor(response.data._id);
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not create the resume");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    setBusy(true);
    try {
      await axios.delete(`${apiUrl}/resumes/${deleteDialog.resume._id}`, authHeader);
      setDeleteDialog({ open: false, resume: null });
      await loadResumes();
      toast.success("Resume deleted");
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not delete the resume");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth={false} sx={{ py: 6, px: { xs: 2, sm: 10 } }}>
      {/* Hero banner */}
      <Box
        sx={{
          maxWidth: "100%",
          mx: "auto",
          mt: 4,
          mb: 6,
          bgcolor: "#0585E0",
          border: `1px solid ${darkMode ? "#232323" : "transparent"}`,
          borderRadius: "20px",
          position: "relative",
          display: "flex",
          alignItems: "center",
          minHeight: "100px",
          overflow: "visible",
        }}
      >
        <Box sx={{ width: "85%", p: { xs: 3, md: 3 }, position: "relative", zIndex: 2 }}>
          <Typography
            variant="h4"
            sx={{
              color: "#ffffff",
              fontWeight: 700,
              mb: 2,
              fontSize: { xs: "1.75rem", sm: "1.7rem" },
            }}
          >
            Build my Resume
          </Typography>
          <Typography
            variant="body1"
            sx={{
              color: "#ffffff",
              fontWeight: 200,
              fontSize: { xs: "0.9rem", sm: "1rem" },
              lineHeight: 1.6,
              maxWidth: "600px",
            }}
          >
            Craft recruiter-ready resumes from your profile — pick a template, import your
            details, and preview every page live.
          </Typography>
        </Box>

        <Box
          sx={{
            width: "18%",
            position: "absolute",
            right: "5%",
            bottom: 0,
            zIndex: 1,
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            overflow: "visible",
            height: "100%",
          }}
        >
          <Box
            component="img"
            src="/courses.png"
            alt="Resume Builder"
            sx={{
              width: "120%",
              height: "auto",
              maxWidth: "none",
              objectFit: "contain",
              objectPosition: "bottom",
              filter: darkMode
                ? "drop-shadow(-20px 20px 40px rgba(50, 50, 50, 0.9))"
                : "none",
              animation: "floatAnimation 6s ease-in-out infinite, fadeIn 1s ease-out",
              "@keyframes floatAnimation": {
                "0%": { transform: "translateX(0px) rotate(0deg)" },
                "25%": { transform: "translateX(10px) rotate(1deg)" },
                "75%": { transform: "translateX(-10px) rotate(-1deg)" },
                "100%": { transform: "translateX(0px) rotate(0deg)" },
              },
              "@keyframes fadeIn": {
                "0%": { opacity: 0, transform: "translateX(-20px)" },
                "100%": { opacity: 1, transform: "translateX(0)" },
              },
            }}
          />
        </Box>
      </Box>

      {/* Search + create */}
      <Box sx={{ mb: 6, textAlign: "center" }}>
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            gap: 2,
            maxWidth: "700px",
            mx: "auto",
            mb: 2,
          }}
        >
          <TextField
            fullWidth
            placeholder="Search resumes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: getTextColor(0.5) }} />
                </InputAdornment>
              ),
              endAdornment: search && (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setSearch("")}
                    size="small"
                    sx={{
                      bgcolor: "#0088cc",
                      color: "white",
                      "&:hover": { bgcolor: "#006699" },
                      mr: -0.5,
                      width: 30,
                      height: 30,
                    }}
                  >
                    <Box component="span" sx={{ fontSize: "1.2rem", fontWeight: "bold" }}>
                      ×
                    </Box>
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{
              "& .MuiOutlinedInput-root": {
                bgcolor: darkMode ? "rgba(255,255,255,0.08)" : "white",
                borderRadius: 1,
                border: "1px solid",
                borderColor: darkMode ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.15)",
                "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#0088cc" },
                "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "#0088cc" },
              },
            }}
          />

          <Button
            variant="contained"
            startIcon={<AddIcon />}
            disabled={atLimit}
            onClick={openCreateDialog}
            sx={{
              flexShrink: 0,
              px: 3,
              textTransform: "none",
              whiteSpace: "nowrap",
              bgcolor: "#0088cc",
              "&:hover": { bgcolor: "#006699" },
            }}
          >
            Create Resume
          </Button>
        </Box>

        <Typography
          variant="body2"
          sx={{ color: atLimit ? "#ff9800" : getTextColor(0.5) }}
        >
          {atLimit
            ? `You have reached the limit of ${limit} resumes. Delete one to create another.`
            : `${resumes.length} of ${limit} resumes used`}
        </Typography>
      </Box>

      {/* Resume cards */}
      <Grid container spacing={3}>
        {visibleResumes.length > 0 ? (
          visibleResumes.map((resume, index) => (
            <Grid item xs={12} sm={6} md={4} key={resume._id}>
              <Grow in timeout={(index + 1) * 200}>
                <Box sx={{ height: "100%" }}>
                  <ResumeCard
                    resume={resume}
                    templateName={templateName(resume.template)}
                    darkMode={darkMode}
                    onEdit={(item) => openEditor(item._id)}
                    onDelete={(item) => setDeleteDialog({ open: true, resume: item })}
                  />
                </Box>
              </Grow>
            </Grid>
          ))
        ) : (
          <Box sx={{ width: "100%", textAlign: "center", py: 8 }}>
            <Typography variant="h6" sx={{ color: getTextColor(0.5) }}>
              {search.trim()
                ? "No resumes found matching your criteria"
                : "You have not created any resumes yet"}
            </Typography>
            <Button
              variant="outlined"
              sx={{ mt: 2, borderColor: "#0088cc", color: "#0088cc" }}
              onClick={() => {
                if (search.trim()) {
                  setSearch("");
                  return;
                }
                openCreateDialog();
              }}
            >
              {search.trim() ? "Clear Filters" : "Create your first resume"}
            </Button>
          </Box>
        )}
      </Grid>

      {/* Create */}
      <StyledDialog
        open={createDialog.open}
        onClose={closeCreateDialog}
        darkMode={darkMode}
        icon={<ArticleIcon />}
        title="Create a resume"
        subtitle="Name it, pick a template, and start editing straight away."
        actions={
          <>
            <Button onClick={closeCreateDialog} sx={{ textTransform: "none", color: getTextColor(0.6) }}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleCreate}
              disabled={busy || !createDialog.title.trim()}
              startIcon={
                busy ? <CircularProgress size={16} color="inherit" /> : <OpenInNewIcon />
              }
              sx={{
                textTransform: "none",
                px: 2.5,
                borderRadius: "10px",
                bgcolor: "#0088cc",
                "&:hover": { bgcolor: "#006699" },
              }}
            >
              Create & Open
            </Button>
          </>
        }
      >
        <TextField
          autoFocus
          fullWidth
          label="Resume name"
          placeholder="e.g. Backend Internship"
          value={createDialog.title}
          onChange={(e) => setCreateDialog((prev) => ({ ...prev, title: e.target.value }))}
          onKeyDown={(e) => {
            if (e.key === "Enter" && createDialog.title.trim() && !busy) handleCreate();
          }}
          inputProps={{ maxLength: 80 }}
          helperText={`${createDialog.title.length}/80`}
          sx={{ "& .MuiOutlinedInput-root": { borderRadius: "10px" } }}
        />

        <Typography
          variant="overline"
          sx={{ display: "block", mt: 2, mb: 1, letterSpacing: 1, color: getTextColor(0.6) }}
        >
          Template
        </Typography>

        {/* Picking a look is a visual choice, so show the templates as cards */}
        <Grid container spacing={1.5}>
          {templates.map((template) => {
            const selected = createDialog.template === template.id;
            return (
              <Grid item xs={12} sm={6} key={template.id}>
                <Box
                  role="button"
                  tabIndex={0}
                  onClick={() => setCreateDialog((prev) => ({ ...prev, template: template.id }))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setCreateDialog((prev) => ({ ...prev, template: template.id }));
                    }
                  }}
                  sx={{
                    p: 2,
                    height: "100%",
                    cursor: "pointer",
                    borderRadius: "12px",
                    border: `1px solid ${
                      selected ? "#0088cc" : darkMode ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)"
                    }`,
                    bgcolor: selected
                      ? "rgba(0,136,204,0.10)"
                      : darkMode
                        ? "rgba(255,255,255,0.04)"
                        : "transparent",
                    transition: "all 0.2s ease",
                    "&:hover": { borderColor: "#0088cc" },
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Typography
                      sx={{
                        fontWeight: 600,
                        color: selected ? "#0088cc" : darkMode ? "#fff" : "#000",
                      }}
                    >
                      {template.name}
                    </Typography>
                    <Box sx={{ flexGrow: 1 }} />
                    {selected && <CheckCircleIcon sx={{ fontSize: 18, color: "#0088cc" }} />}
                  </Box>
                  <Typography variant="caption" sx={{ color: getTextColor(0.55) }}>
                    {template.category || "Resume template"}
                  </Typography>
                </Box>
              </Grid>
            );
          })}
        </Grid>
      </StyledDialog>

      {/* Delete */}
      <StyledDialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, resume: null })}
        darkMode={darkMode}
        maxWidth="xs"
        accent="#f44336"
        icon={<DeleteIcon />}
        title="Delete resume"
        subtitle="This cannot be undone."
        actions={
          <>
            <Button
              onClick={() => setDeleteDialog({ open: false, resume: null })}
              sx={{ textTransform: "none", color: getTextColor(0.6) }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              color="error"
              onClick={handleDelete}
              disabled={busy}
              startIcon={busy ? <CircularProgress size={16} color="inherit" /> : <DeleteIcon />}
              sx={{ textTransform: "none", px: 2.5, borderRadius: "10px" }}
            >
              Delete
            </Button>
          </>
        }
      >
        <Typography variant="body2" sx={{ color: getTextColor(0.7) }}>
          <Box component="span" sx={{ fontWeight: 700, color: darkMode ? "#fff" : "#000" }}>
            {deleteDialog.resume?.title}
          </Box>{" "}
          will be permanently deleted, along with everything you have written in it.
        </Typography>
      </StyledDialog>
    </Container>
  );
};

export default ResumeList;
