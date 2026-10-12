import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, Box, Button, CircularProgress, Container, Typography, useTheme } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import RecordVoiceOverIcon from "@mui/icons-material/RecordVoiceOver";
import FileUploadOutlinedIcon from "@mui/icons-material/FileUploadOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { toast } from "react-toastify";
import StyledDialog from "../common/StyledDialog";
import PageHero from "./PageHero";
import CommunicationTestStudentsDialog from "./CommunicationTestStudentsDialog";
import AdminTestCard from "./admin/AdminTestCard";
import Reveal from "./setup/Reveal";
import SetupButton from "./setup/SetupButton";
import useSurface from "./setup/useSurface";
import { downloadTestFile, readImportFile, toDuplicatePayload } from "./admin/testTransfer";
import { adminApi, apiErrorMessage } from "../../services/speechTestApi";

const heroButtonSx = {
  fontWeight: 700,
  textTransform: "none",
  borderRadius: "10px",
  bgcolor: "#ffffff",
  color: "#0585E0",
  "&:hover": { bgcolor: "rgba(255,255,255,0.9)" },
  "&.Mui-disabled": { bgcolor: "rgba(255,255,255,0.6)", color: "#0585E0" },
};

/** Teacher / admin page: every communication test as a card, with the actions for it. */
const CommunicationTestManagement = () => {
  const navigate = useNavigate();
  const isDark = useTheme().palette.mode === "dark";
  const { border } = useSurface();
  const fileInput = useRef(null);

  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [studentsFor, setStudentsFor] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [judge, setJudge] = useState(null);

  const load = useCallback(async () => {
    try {
      const data = await adminApi.list();
      setTests(data.tests || []);
    } catch (error) {
      toast.error(apiErrorMessage(error, "Could not load communication tests"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    adminApi
      .judgeStatus()
      .then(setJudge)
      .catch(() => setJudge({ configured: false, error: "Could not check the speech judge" }));
  }, [load]);

  /** Runs an action with the page locked, turning a failure into a toast. */
  const run = async (action, fallback) => {
    setBusy(true);
    try {
      await action();
    } catch (error) {
      const problems = error?.response?.data?.problems;
      toast.error(
        error?.response
          ? problems?.length
            ? `${apiErrorMessage(error)}: ${problems.join("; ")}`
            : apiErrorMessage(error, fallback)
          : error.message || fallback
      );
    } finally {
      setBusy(false);
    }
  };

  const togglePublish = (test) =>
    run(async () => {
      await adminApi.publish(test._id, !test.isPublished);
      toast.success(test.isPublished ? "Test hidden from students" : "Test published to eligible students");
      await load();
    }, "Could not update");

  const duplicate = (test) =>
    run(async () => {
      const { test: full } = await adminApi.get(test._id);
      await adminApi.create(toDuplicatePayload(full));
      toast.success("Duplicated as a draft. Check its schedule and add students.");
      await load();
    }, "Could not duplicate the test");

  const exportJson = (test) =>
    run(async () => {
      const { test: full } = await adminApi.get(test._id);
      downloadTestFile(full);
    }, "Could not download the test");

  const importJson = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    run(async () => {
      const { test } = await adminApi.create(await readImportFile(file));
      toast.success("Imported as a draft. Check its schedule and add students.");
      navigate(`/admin/communication-tests/${test._id}/edit`);
    }, "Could not import the file");
  };

  const confirmDelete = () =>
    run(async () => {
      await adminApi.remove(deleting._id);
      toast.success("Test deleted");
      setDeleting(null);
      await load();
    }, "Could not delete the test");

  const judgeProblem =
    judge && (!judge.configured || judge.error || (judge.ready && judge.ready.ready === false));

  return (
    <Box sx={{ pb: 8 }}>
      <PageHero
        title="Communication Test"
        icon={<RecordVoiceOverIcon sx={{ fontSize: "1.7rem" }} />}
        description="Schedule speaking tests for your students. Build timed sections of reading, repeat, jumbled sentences, Q&A, storytelling, fill in the blanks, MCQ and email writing. Scoring is done by the speech judge."
        actions={
          <>
            <Button
              variant="contained"
              startIcon={<FileUploadOutlinedIcon />}
              onClick={() => fileInput.current?.click()}
              disabled={busy}
              sx={heroButtonSx}
            >
              Import JSON
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate("/admin/communication-tests/new")}
              sx={heroButtonSx}
            >
              New test
            </Button>
          </>
        }
      />
      <input ref={fileInput} type="file" accept=".json,application/json" hidden onChange={importJson} />

      <Container maxWidth={false} sx={{ px: { xs: 2, sm: 10 }, mt: 2 }}>
        <Box sx={{ maxWidth: 1400, mx: "auto" }}>
          {judgeProblem && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              {!judge.configured
                ? "The speech judge is not configured on the server (SPEECHJUDGE_API_KEY is missing). Students can take tests but sections will not be scored."
                : judge.error
                ? `The speech judge could not be reached: ${judge.error}`
                : "The speech judge is still loading its models. Scoring will be delayed until it is ready."}
            </Alert>
          )}

          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
              <CircularProgress />
            </Box>
          ) : tests.length === 0 ? (
            <Box sx={{ p: 6, textAlign: "center", borderRadius: "18px", border: `1px dashed ${border}` }}>
              <RecordVoiceOverIcon sx={{ fontSize: 48, color: "primary.main", mb: 1 }} />
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                No communication tests yet
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Create your first test, or import one from a JSON file.
              </Typography>
              <Box sx={{ display: "flex", justifyContent: "center", gap: 1.5, flexWrap: "wrap" }}>
                <SetupButton startIcon={<AddIcon />} onClick={() => navigate("/admin/communication-tests/new")}>
                  Create a test
                </SetupButton>
                <SetupButton
                  variant="secondary"
                  startIcon={<FileUploadOutlinedIcon />}
                  onClick={() => fileInput.current?.click()}
                  disabled={busy}
                >
                  Import JSON
                </SetupButton>
              </Box>
            </Box>
          ) : (
            <Box
              sx={{
                display: "grid",
                gap: 3,
                gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))", xl: "repeat(3, minmax(0, 1fr))" },
              }}
            >
              {tests.map((test, index) => (
                <Reveal key={test._id} y={12} delay={Math.min(index, 8) * 0.04} sx={{ display: "flex" }}>
                  <Box sx={{ width: "100%", opacity: busy ? 0.7 : 1, pointerEvents: busy ? "none" : "auto" }}>
                    <AdminTestCard
                      test={test}
                      onEdit={() => navigate(`/admin/communication-tests/${test._id}/edit`)}
                      onResults={() => navigate(`/admin/communication-tests/${test._id}/results`)}
                      onStudents={() => setStudentsFor(test._id)}
                      onTogglePublish={togglePublish}
                      onDuplicate={duplicate}
                      onExport={exportJson}
                      onDelete={setDeleting}
                    />
                  </Box>
                </Reveal>
              ))}
            </Box>
          )}
        </Box>
      </Container>

      <CommunicationTestStudentsDialog
        open={Boolean(studentsFor)}
        testId={studentsFor}
        onClose={() => {
          setStudentsFor(null);
          load();
        }}
      />

      <StyledDialog
        open={Boolean(deleting)}
        onClose={() => !busy && setDeleting(null)}
        darkMode={isDark}
        icon={<DeleteOutlineIcon />}
        accent="#d32f2f"
        title="Delete this test?"
        subtitle={deleting?.title}
        actions={
          <>
            <Button onClick={() => setDeleting(null)} disabled={busy} sx={{ textTransform: "none" }}>
              Cancel
            </Button>
            <Button
              variant="contained"
              color="error"
              onClick={confirmDelete}
              disabled={busy}
              sx={{ textTransform: "none", fontWeight: 700 }}
            >
              {busy ? "Deleting…" : "Delete test"}
            </Button>
          </>
        }
      >
        <Typography variant="body2">
          This permanently deletes the test and every student's attempt and score
          {deleting?.attemptCount ? ` (${deleting.attemptCount} attempt${deleting.attemptCount === 1 ? "" : "s"})` : ""}.
          It cannot be undone.
        </Typography>
      </StyledDialog>
    </Box>
  );
};

export default CommunicationTestManagement;
