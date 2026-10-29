import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { ArrowLeftIcon } from "@phosphor-icons/react/dist/csr/ArrowLeft";
import { ArrowRightIcon } from "@phosphor-icons/react/dist/csr/ArrowRight";
import { FloppyDiskIcon } from "@phosphor-icons/react/dist/csr/FloppyDisk";
import { PlusIcon } from "@phosphor-icons/react/dist/csr/Plus";
import { Button, Card, EmptyState, Notice, Page, PageHeader, Skeleton, Stepper, StickyFooter, pluralize } from "../../ui";
import { SECTION_TYPE_META, TonalMark, useNotFoundRedirect } from "../shared";
import CommunicationTestStudentsDialog from "./CommunicationTestStudentsDialog";
import EditorSummaryCard from "./EditorSummaryCard";
import ScheduleForm from "./ScheduleForm";
import SectionEditorCard from "./SectionEditorCard";
import SectionTypePicker from "./SectionTypePicker";
import TestDetailsForm from "./TestDetailsForm";
import { SECTION_TYPE_ICON } from "./typeIcons";
import { blankQuestion, blankSection, emptyForm, findProblems, fromServer, toPayload, validateForm } from "./testFormModel";
import { downloadTestFile } from "./testTransfer";
import { adminApi, apiErrorMessage } from "../../../services/speechTestApi";
import "./speechAdmin.css";

const LIST_PATH = "/admin/communication-tests";
const PANEL_ID = "sxa-step-panel";

const STEPS = [
  { key: "details", label: "Details" },
  { key: "questions", label: "Questions" },
  { key: "schedule", label: "Schedule" },
  { key: "review", label: "Review" },
];
const STEP_KEYS = STEPS.map((step) => step.key);
const FORM_STEPS = ["details", "questions", "schedule"];

/** The id of the field a problem belongs to, so the editor can move focus to it. */
const targetIdOf = (problem) => {
  if (problem.field === "title") return "sxa-title";
  if (problem.field === "start") return "sxa-start";
  if (problem.field === "end") return "sxa-end";
  if (problem.field === "limit") return `sxa-s-${problem.sectionKey}-limit`;
  if (problem.field === "text") return `sxa-q-${problem.questionKey}-text`;
  return PANEL_ID;
};

/**
 * Create / edit a communication test (routes /admin/communication-tests/new and /:id/edit).
 *
 * A stepper of pills: Details (title, description, instructions), Questions (the sections and their
 * questions), Schedule (start and end) and Review (a summary and the actions that need a saved
 * test). One sticky footer: Back / Next, and Save (on the last step, and on every step when the test
 * already exists). Nothing is saved until Save; the same checks as before run on Save (and a step's
 * own checks run on Next), the message is shown as a toast and under the field, and the first field
 * with a problem takes focus.
 *
 * Once students have started a test, saved sections and questions are read-only. Eligible students
 * are managed from the Students button once the test exists.
 */
const CommunicationTestEditor = () => {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const location = useLocation();
  const redirectIfNotFound = useNotFoundRedirect();

  const [form, setForm] = useState(emptyForm());
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [attemptCount, setAttemptCount] = useState(0);
  const [eligibleCount, setEligibleCount] = useState(0);
  const [serverProblems, setServerProblems] = useState([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [studentsOpen, setStudentsOpen] = useState(false);
  const [openKey, setOpenKey] = useState(null);

  const initialStep = STEP_KEYS.includes(location.state?.step) ? location.state.step : "details";
  const [step, setStep] = useState(initialStep);
  // The furthest step reached; the pills before it that are valid show as done
  const [reached, setReached] = useState(STEP_KEYS.indexOf(initialStep));
  // Steps whose problems are shown (after a failed Next or Save)
  const [attempted, setAttempted] = useState(() => new Set());
  const [focusTarget, setFocusTarget] = useState(null);

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
      setReached(STEPS.length - 1);
    } catch (error) {
      if (redirectIfNotFound(error)) return;
      toast.error(apiErrorMessage(error, "Could not load this test"));
      navigate(LIST_PATH, { replace: true });
    } finally {
      setLoading(false);
    }
  }, [id, isNew, navigate, redirectIfNotFound]);

  useEffect(() => {
    load();
  }, [load]);

  // Moves focus to a field (or the step panel) once the screen it is on has rendered
  useEffect(() => {
    if (!focusTarget) return;
    const element = document.getElementById(focusTarget.id);
    if (!element) return;
    element.focus({ preventScroll: true });
    if (focusTarget.id === PANEL_ID) {
      // A new step: bring the stepper (the top of the editor) into view
      const stepper = document.querySelector(".sxa-editor-page .ui-stepper");
      if (stepper) stepper.scrollIntoView({ block: "start" });
    } else {
      element.scrollIntoView({ block: "center" });
    }
  }, [focusTarget]);

  const problems = useMemo(() => findProblems(form), [form]);

  const goToStep = (key, targetId, sectionKey) => {
    setStep(key);
    setReached((current) => Math.max(current, STEP_KEYS.indexOf(key)));
    if (sectionKey) setOpenKey(sectionKey);
    setFocusTarget({ id: targetId || PANEL_ID, nonce: Date.now() });
  };

  const showProblem = (problem) => goToStep(problem.step, targetIdOf(problem), problem.sectionKey);

  const markAttempted = (steps) => setAttempted((current) => new Set([...current, ...steps]));

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

  const stepIndex = STEP_KEYS.indexOf(step);
  const isReview = step === "review";

  const back = () => goToStep(STEP_KEYS[Math.max(0, stepIndex - 1)]);

  const next = () => {
    const own = problems.filter((problem) => problem.step === step);
    if (own.length > 0) {
      markAttempted([step]);
      toast.error(own[0].message);
      showProblem(own[0]);
      return;
    }
    goToStep(STEP_KEYS[Math.min(STEP_KEYS.length - 1, stepIndex + 1)]);
  };

  const save = async () => {
    const message = validateForm(form);
    if (message) {
      toast.error(message);
      markAttempted(FORM_STEPS);
      showProblem(problems[0]);
      return;
    }

    setSaving(true);
    setServerProblems([]);
    try {
      const payload = toPayload(form);
      if (isNew) {
        const data = await adminApi.create(payload);
        toast.success("Test created. Add students next.");
        navigate(`${LIST_PATH}/${data.test._id}/edit`, { replace: true, state: { step: "review" } });
      } else {
        const data = await adminApi.update(id, payload);
        setForm(fromServer(data.test));
        toast.success("Test saved");
      }
    } catch (error) {
      setServerProblems(error?.response?.data?.problems || []);
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

  const header = (
    <PageHeader
      title={isNew ? "New communication test" : "Edit communication test"}
      description="Set the details, add timed sections and write the questions, then choose the schedule. Students only see the test after you publish it."
      actions={
        <Button variant="ghost" startIcon={<ArrowLeftIcon size={18} weight="bold" aria-hidden="true" />} onClick={() => navigate(LIST_PATH)}>
          All tests
        </Button>
      }
    />
  );

  if (loading) {
    return (
      <Page className="sxa-page">
        {header}
        <div aria-busy="true" aria-label="Loading the test">
          <Skeleton height={40} width="60%" radius="var(--ds-radius-pill)" />
          <Skeleton height={320} className="sxa-skeleton-gap" radius="var(--ds-radius-xl)" />
        </div>
      </Page>
    );
  }

  // ---- errors shown under the fields (only for steps the user has already tried to leave) ----
  const showFor = (key) => attempted.has(key);
  const detailsErrors = {
    title: showFor("details") && problems.some((p) => p.field === "title") ? "Give the test a title" : undefined,
  };
  const scheduleErrors = {};
  if (showFor("schedule")) {
    if (!form.startTime) scheduleErrors.start = "Set a start time";
    if (!form.endTime) scheduleErrors.end = "Set an end time";
    else if (form.startTime && form.endTime <= form.startTime) scheduleErrors.end = "The end time must be after the start time";
  }
  const sectionErrors = (section) => {
    if (!showFor("questions")) return {};
    const limit = Number(section.timeLimitMinutes);
    const limitBad = !Number.isFinite(limit) || limit < 1 || limit > 120;
    const blank = new Set(section.questions.filter((q) => !q.text.trim()).map((q) => q.key));
    return {
      limit: limitBad ? "Enter a time limit of 1 to 120 minutes" : undefined,
      text: blank.size > 0 ? "Every question needs text" : undefined,
      blank,
    };
  };

  const completed = STEPS.filter(
    (entry, index) => entry.key !== "review" && index <= reached && !problems.some((p) => p.step === entry.key)
  ).map((entry) => entry.key);

  // ---- the content of each step ----
  let content;
  if (step === "details") {
    content = <TestDetailsForm form={form} onChange={setField} errors={detailsErrors} />;
  } else if (step === "schedule") {
    content = <ScheduleForm form={form} onChange={setField} errors={scheduleErrors} />;
  } else if (step === "questions") {
    content = (
      <section className="sxa-sections" aria-labelledby="sxa-sections-title">
        <div className="sxa-sections__head">
          <div className="sxa-sections__text">
            <h2 className="sxa-sections__title" id="sxa-sections-title">
              Sections <span className="sxa-sections__count">({form.sections.length})</span>
            </h2>
            <p className="sxa-sections__hint">Open a section to set its time limit and write its questions.</p>
          </div>
          <Button startIcon={<PlusIcon size={18} weight="bold" aria-hidden="true" />} onClick={() => setPickerOpen(true)}>
            Add section
          </Button>
        </div>

        {form.sections.length === 0 ? (
          <Card>
            <EmptyState
              compact
              title="No sections yet"
              text="Add a section, pick its type, set a time limit and add its questions."
              action={
                <Button startIcon={<PlusIcon size={18} weight="bold" aria-hidden="true" />} onClick={() => setPickerOpen(true)}>
                  Add the first section
                </Button>
              }
            />
          </Card>
        ) : (
          <div className="sxa-sections__list">
            {form.sections.map((section, index) => (
              <SectionEditorCard
                key={section.key}
                index={index}
                total={form.sections.length}
                section={section}
                open={openKey === section.key}
                started={started}
                errors={sectionErrors(section)}
                onToggle={() => setOpenKey((current) => (current === section.key ? null : section.key))}
                onChange={(patch) => updateSection(section.key, patch)}
                onMove={(direction) => moveSection(section.key, direction)}
                onRemove={() => removeSection(section.key)}
                onQuestionChange={(questionKey, patch) => updateQuestion(section.key, questionKey, patch)}
                onAddQuestion={() => addQuestion(section)}
                onRemoveQuestion={(questionKey) => removeQuestion(section, questionKey)}
              />
            ))}
          </div>
        )}
      </section>
    );
  } else {
    content = (
      <div className="sxa-review">
        {problems.length > 0 ? (
          <Notice tone="warning" title="Fix these before you save">
            <ul className="sxa-review__problems">
              {problems.map((problem) => (
                <li key={`${problem.field}-${problem.sectionKey || ""}`}>
                  <span>{problem.message}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      markAttempted(FORM_STEPS);
                      showProblem(problem);
                    }}
                  >
                    Go to it
                  </Button>
                </li>
              ))}
            </ul>
          </Notice>
        ) : (
          <Notice tone="success">Everything needed to save is filled in.</Notice>
        )}

        <EditorSummaryCard
          form={form}
          isNew={isNew}
          eligibleCount={eligibleCount}
          onStudents={() => setStudentsOpen(true)}
          onExport={exportJson}
        />

        <Card
          title="Details"
          actions={
            <Button size="sm" onClick={() => goToStep("details")}>
              Edit details
            </Button>
          }
        >
          <dl className="sxa-facts" data-wide="true">
            <div className="sxa-fact">
              <dt>Title</dt>
              <dd>{form.title.trim() || "Not set"}</dd>
            </div>
            <div className="sxa-fact">
              <dt>Description</dt>
              <dd className="sxa-fact__long">{form.description.trim() || "None"}</dd>
            </div>
            <div className="sxa-fact">
              <dt>Instructions for students</dt>
              <dd className="sxa-fact__long">{form.instructions.trim() || "None"}</dd>
            </div>
          </dl>
        </Card>

        <Card
          title="Sections"
          description={pluralize(form.sections.length, "section")}
          actions={
            <Button size="sm" onClick={() => goToStep("questions")}>
              Edit questions
            </Button>
          }
        >
          {form.sections.length === 0 ? (
            <p className="sxa-summary__note">No sections yet. Students would see an empty test.</p>
          ) : (
            <ol className="sxa-review__sections">
              {form.sections.map((section, index) => {
                const meta = SECTION_TYPE_META[section.type];
                return (
                  <li key={section.key} className="sxa-review__section">
                    <TonalMark icon={SECTION_TYPE_ICON[section.type]} hue={meta.hue} size={32} />
                    <span className="sxa-review__name">
                      <span className="sxa-review__title">
                        {index + 1}. {section.title || meta.label}
                      </span>
                      <span className="sxa-review__meta">
                        {meta.label} · {section.timeLimitMinutes || "–"} min · {pluralize(section.questions.length, "question")}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
        </Card>
      </div>
    );
  }

  const nextLabel = STEPS[Math.min(STEPS.length - 1, stepIndex + 1)].label;

  return (
    <Page className="sxa-page sxa-editor-page">
      {header}

      {started ? (
        <Notice tone="info" className="sxa-editor__notice">
          {attemptCount} student{attemptCount === 1 ? " has" : "s have"} started this test. Saved sections and questions
          are locked, but you can still add new ones and change the title, description and schedule.
        </Notice>
      ) : null}

      {serverProblems.length > 0 ? (
        <Notice tone="danger" title="The test could not be saved" className="sxa-editor__notice">
          <ul className="sxa-review__problems">
            {serverProblems.map((problem) => (
              <li key={problem}>{problem}</li>
            ))}
          </ul>
        </Notice>
      ) : null}

      <Stepper
        steps={STEPS}
        current={step}
        completed={completed}
        onStepClick={(key) => goToStep(key)}
        label="Test editor steps"
      />

      <div className="sxa-editor">
        <div className="sxa-editor__layout" data-rail={isReview ? "false" : "true"}>
          <div
            className="sxa-editor__main"
            id={PANEL_ID}
            tabIndex={-1}
            role="group"
            aria-label={`Step ${stepIndex + 1} of ${STEPS.length}: ${STEPS[stepIndex].label}`}
          >
            {content}
          </div>

          {!isReview ? (
            <aside className="sxa-editor__rail" aria-label="Test summary">
              <EditorSummaryCard
                form={form}
                isNew={isNew}
                eligibleCount={eligibleCount}
                onStudents={() => setStudentsOpen(true)}
                onExport={exportJson}
              />
            </aside>
          ) : null}
        </div>

        <StickyFooter className="sxa-footer">
          <div className="sxa-footer__start">
            {stepIndex === 0 ? (
              <Button onClick={() => navigate(LIST_PATH)}>Cancel</Button>
            ) : (
              <Button startIcon={<ArrowLeftIcon size={18} weight="bold" aria-hidden="true" />} onClick={back}>
                Back
              </Button>
            )}
          </div>
          {!isReview && !isNew ? (
            <Button loading={saving} startIcon={<FloppyDiskIcon size={18} aria-hidden="true" />} onClick={save}>
              Save changes
            </Button>
          ) : null}
          {isReview ? (
            <Button variant="primary" loading={saving} startIcon={<FloppyDiskIcon size={18} aria-hidden="true" />} onClick={save}>
              {isNew ? "Create test" : "Save changes"}
            </Button>
          ) : (
            <Button variant="primary" endIcon={<ArrowRightIcon size={18} weight="bold" aria-hidden="true" />} onClick={next}>
              Next: {nextLabel}
            </Button>
          )}
        </StickyFooter>
      </div>

      <SectionTypePicker open={pickerOpen} onClose={() => setPickerOpen(false)} onPick={addSection} />

      {!isNew ? (
        <CommunicationTestStudentsDialog
          open={studentsOpen}
          testId={id}
          onClose={() => setStudentsOpen(false)}
          onChanged={(count) => setEligibleCount(count)}
        />
      ) : null}
    </Page>
  );
};

export default CommunicationTestEditor;
