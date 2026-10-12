import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Alert, Box, Button, CircularProgress, Container, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { toast } from "react-toastify";
import PageHero from "./PageHero";
import CommunicationTestStudentsDialog from "./CommunicationTestStudentsDialog";
import TestDetailsForm from "./admin/TestDetailsForm";
import EditorSummaryCard from "./admin/EditorSummaryCard";
import SectionEditorCard from "./admin/SectionEditorCard";
import SectionTypePicker from "./admin/SectionTypePicker";
import SetupButton from "./setup/SetupButton";
import useSurface from "./setup/useSurface";
import { blankQuestion, blankSection, emptyForm, fromServer, toPayload, validateForm } from "./admin/testFormModel";
import { downloadTestFile } from "./admin/testTransfer";
import { adminApi, apiErrorMessage } from "../../services/speechTestApi";
import useNotFoundRedirect from "./useNotFoundRedirect";

const SectionTitle = ({ children, hint }) => {
  const { muted } = useSurface();
  return (
    <Box sx={{ mb: 1.5 }}>
      <Typography component="h2" sx={{ fontWeight: 700, fontSize: "1.15rem" }}>
        {children}
      </Typography>
      {hint && <Typography sx={{ color: muted, fontSize: "0.88rem", mt: 0.25 }}>{hint}</Typography>}
    </Box>
  );
};

/**
 * Create / edit a communication test. Laid out like the student's test pages:
 * the details and a list of collapsible sections on the left, and a card with
 * the test's headline numbers and main actions on the right.
 * Eligible students are managed from the Students button once the test exists.
 */
const CommunicationTestEditor = () => {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const redirectIfNotFound = useNotFoundRedirect();
  const { border, muted } = useSurface();

  const [form, setForm] = useState(emptyForm());
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [attemptCount, setAttemptCount] = useState(0);
  const [eligibleCount, setEligibleCount] = useState(0);
  const [problems, setProblems] = useState([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [studentsOpen, setStudentsOpen] = useState(false);
  const [openKey, setOpenKey] = useState(null);

  // Once students have started, saved sections and questions are read-only.
  const started = attemptCount > 0;

  const load = useCallback(async () => {
    if (isNew) return;
    setLoading(true);
    try {
      const data = await adminApi.get(id);
      setForm(fromServer(data.test));
      setAttemptCount(data.attemptCount);
      setEligibleCount(data.eligibleCount);
    } catch (error) {
      if (redirectIfNotFound(error)) return;
      toast.error(apiErrorMessage(error, "Could not load this test"));
      navigate("/admin/communication-tests", { replace: true });
    } finally {
      setLoading(false);
    }
  }, [id, isNew, navigate, redirectIfNotFound]);

  useEffect(() => {
    load();
  }, [load]);

  const setField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const updateSection = (key, patch) =>
    setForm((prev) => ({
      ...prev,
      sections: prev.sections.map((s) => (s.key === key ? { ...s, ...patch } : s)),
    }));

  const updateQuestion = (sectionKey, questionKey, patch) =>
    setForm((prev) => ({
      ...prev,
      sections: prev.sections.map((s) =>
        s.key === sectionKey
          ? { ...s, questions: s.questions.map((q) => (q.key === questionKey ? { ...q, ...patch } : q)) }
          : s
      ),
    }));

  const addSection = (type) => {
    const section = blankSection(type);
    setPickerOpen(false);
    setForm((prev) => ({ ...prev, sections: [...prev.sections, section] }));
    setOpenKey(section.key);
  };

  const removeSection = (key) =>
    setForm((prev) => ({ ...prev, sections: prev.sections.filter((s) => s.key !== key) }));

  const moveSection = (key, direction) =>
    setForm((prev) => {
      const at = prev.sections.findIndex((s) => s.key === key);
      const to = at + direction;
      if (at < 0 || to < 0 || to >= prev.sections.length) return prev;
      const next = [...prev.sections];
      [next[at], next[to]] = [next[to], next[at]];
      return { ...prev, sections: next };
    });

  const addQuestion = (section) =>
    updateSection(section.key, { questions: [...section.questions, blankQuestion(section.type)] });

  const removeQuestion = (section, questionKey) =>
    updateSection(section.key, { questions: section.questions.filter((q) => q.key !== questionKey) });

  const save = async () => {
    const message = validateForm(form);
    if (message) {
      toast.error(message);
      return;
    }

    setSaving(true);
    setProblems([]);
    try {
      const payload = toPayload(form);
      if (isNew) {
        const data = await adminApi.create(payload);
        toast.success("Test created. Add students next.");
        navigate(`/admin/communication-tests/${data.test._id}/edit`, { replace: true });
      } else {
        const data = await adminApi.update(id, payload);
        setForm(fromServer(data.test));
        toast.success("Test saved");
      }
    } catch (error) {
      setProblems(error?.response?.data?.problems || []);
      toast.error(apiErrorMessage(error, "Could not save the test"));
    } finally {
      setSaving(false);
    }
  };

  // Downloads the saved version of the test (what is on the server, not unsaved edits).
  const exportJson = async () => {
    try {
      const { test } = await adminApi.get(id);
      downloadTestFile(test);
    } catch (error) {
      toast.error(apiErrorMessage(error, "Could not download the test"));
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 12 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ pb: 8 }}>
      <PageHero
        title={isNew ? "New Communication Test" : "Edit Communication Test"}
        description="Set the schedule, add timed sections and write the questions. Students only see the test after you publish it."
      />

      <Container maxWidth={false} sx={{ px: { xs: 2, sm: 10 } }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate("/admin/communication-tests")}
          sx={{ textTransform: "none", color: "text.secondary", mb: 1.5 }}
        >
          All tests
        </Button>

        {started && (
          <Alert severity="info" sx={{ mb: 2 }}>
            {attemptCount} student{attemptCount === 1 ? " has" : "s have"} started this test. Saved sections and
            questions are locked, but you can still add new ones and change the title, description and schedule.
          </Alert>
        )}

        {problems.length > 0 && (
          <Alert severity="error" sx={{ mb: 2 }}>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {problems.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </Alert>
        )}

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "minmax(0, 1fr) 340px" },
            gap: { xs: 3, md: 4 },
            alignItems: "start",
          }}
        >
          <Box sx={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
            <Box>
              <SectionTitle hint="The name, instructions and window during which students can take the test.">
                Test details
              </SectionTitle>
              <TestDetailsForm form={form} onChange={setField} />
            </Box>

            <Box>
              <Box sx={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 2 }}>
                <SectionTitle hint="Open a section to set its time limit and write its questions.">
                  Sections ({form.sections.length})
                </SectionTitle>
                <SetupButton variant="secondary" startIcon={<AddIcon />} onClick={() => setPickerOpen(true)} sx={{ mb: 1.5 }}>
                  Add section
                </SetupButton>
              </Box>

              {form.sections.length === 0 ? (
                <Box
                  sx={{
                    p: 4,
                    textAlign: "center",
                    borderRadius: "14px",
                    border: `1px dashed ${border}`,
                  }}
                >
                  <Typography sx={{ fontWeight: 600 }}>No sections yet</Typography>
                  <Typography sx={{ color: muted, fontSize: "0.9rem", mt: 0.5, mb: 2 }}>
                    Add a section, pick its type, set a time limit and add its questions.
                  </Typography>
                  <SetupButton startIcon={<AddIcon />} onClick={() => setPickerOpen(true)}>
                    Add the first section
                  </SetupButton>
                </Box>
              ) : (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                  {form.sections.map((section, index) => (
                    <SectionEditorCard
                      key={section.key}
                      index={index}
                      total={form.sections.length}
                      section={section}
                      open={openKey === section.key}
                      started={started}
                      onToggle={() => setOpenKey((current) => (current === section.key ? null : section.key))}
                      onChange={(patch) => updateSection(section.key, patch)}
                      onMove={(direction) => moveSection(section.key, direction)}
                      onRemove={() => removeSection(section.key)}
                      onQuestionChange={(questionKey, patch) => updateQuestion(section.key, questionKey, patch)}
                      onAddQuestion={() => addQuestion(section)}
                      onRemoveQuestion={(questionKey) => removeQuestion(section, questionKey)}
                    />
                  ))}
                </Box>
              )}
            </Box>
          </Box>

          <Box sx={{ position: { md: "sticky" }, top: { md: 88 } }}>
            <EditorSummaryCard
              form={form}
              isNew={isNew}
              saving={saving}
              eligibleCount={eligibleCount}
              onSave={save}
              onStudents={() => setStudentsOpen(true)}
              onExport={exportJson}
            />
          </Box>
        </Box>
      </Container>

      <SectionTypePicker open={pickerOpen} onClose={() => setPickerOpen(false)} onPick={addSection} />

      {!isNew && (
        <CommunicationTestStudentsDialog
          open={studentsOpen}
          testId={id}
          onClose={() => setStudentsOpen(false)}
          onChanged={(count) => setEligibleCount(count)}
        />
      )}
    </Box>
  );
};

export default CommunicationTestEditor;
