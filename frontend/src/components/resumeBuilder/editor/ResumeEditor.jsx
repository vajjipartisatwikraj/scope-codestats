import React, { useCallback, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import useMediaQuery from "../../../hooks/useMediaQuery";
import { ConfirmDialog, PillTabs } from "../../ui";
import ActionBar, { TITLE_ID } from "./ActionBar";
import EditPane from "./EditPane";
import { EditorError, EditorSkeleton } from "./EditorStates";
import PreviewPane from "./PreviewPane";
import TopBar from "./TopBar";
import useResumeEditor from "./useResumeEditor";
import "./resumeEditor.css";

const LIST_PATH = "/build-resume";
const DASHBOARD_PATH = "/dashboard";
const TAB_ITEMS = [
  { key: "edit", label: "Edit" },
  { key: "preview", label: "Preview" },
];

/**
 * The resume editor (route /build-resume/:id/edit): a full-screen focus surface, so the app's
 * navbar, rail and footer are hidden for it (App.jsx).
 *
 * From 1200px two panes sit side by side: the editor in section cards on the left and the live
 * preview on the right. Below that they are two tabs, Edit and Preview. Operate mode
 * (design/screens.md section 13).
 */
export default function ResumeEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const wide = useMediaQuery("(min-width: 1200px)");
  const editor = useResumeEditor(id);
  const { phase, error, template, draft, dirty } = editor;

  const [tab, setTab] = useState("edit");
  // Where the student is heading while the "leave without saving?" question is open (null = closed)
  const [leaveTo, setLeaveTo] = useState(null);

  const goToList = useCallback(() => navigate(LIST_PATH), [navigate]);
  const leaveFor = (path) => (dirty ? setLeaveTo(path) : navigate(path));
  const goBack = () => leaveFor(LIST_PATH);
  const goToDashboard = () => leaveFor(DASHBOARD_PATH);

  const { save } = editor;
  const onSave = useCallback(async () => {
    const result = await save();
    // The first problem takes focus
    if (result === "invalid") {
      const field = document.getElementById(TITLE_ID);
      if (field) field.focus();
    }
  }, [save]);

  const ready = phase === "ready" && Boolean(template);
  const unavailable = phase === "ready" && !template;

  let body = null;
  if (phase === "loading") {
    body = <EditorSkeleton wide={wide} />;
  } else if (phase === "error" || unavailable) {
    body = (
      <EditorError
        error={phase === "error" ? error : { unavailable: true }}
        onRetry={editor.retry}
        onBack={goToList}
      />
    );
  } else if (ready) {
    body = (
      <div className="rbe-body" data-wide={wide ? "true" : "false"}>
        {wide ? null : (
          <div className="rbe-tabs">
            <PillTabs label="Resume editor views" idPrefix="rbe" items={TAB_ITEMS} value={tab} onChange={setTab} />
          </div>
        )}

        <div
          className="rbe-pane"
          id="rbe-panel-edit"
          role={wide ? undefined : "tabpanel"}
          aria-labelledby={wide ? undefined : "rbe-tab-edit"}
          hidden={!wide && tab !== "edit"}
        >
          <EditPane
            templates={editor.templates}
            template={template}
            details={draft.details}
            importing={editor.importing}
            onTemplate={editor.changeTemplate}
            onField={editor.changeField}
            onSectionTitle={editor.changeSectionTitle}
            onBreak={editor.changeBreak}
            onImport={editor.importFromProfile}
            onLayout={editor.changeLayout}
            onLayoutReset={editor.resetLayout}
          />
        </div>

        <div
          className="rbe-pane"
          id="rbe-panel-preview"
          role={wide ? undefined : "tabpanel"}
          aria-labelledby={wide ? undefined : "rbe-tab-preview"}
          hidden={!wide && tab !== "preview"}
        >
          <PreviewPane html={editor.html} updating={editor.previewing} />
        </div>
      </div>
    );
  }

  return (
    <div className="rbe">
      <h1 className="ui-sr">Resume editor</h1>

      <TopBar onDashboard={goToDashboard} />

      {ready ? (
        <ActionBar
          title={draft.title}
          onTitle={editor.setTitle}
          titleInvalid={!draft.title.trim()}
          onBack={goBack}
          dirty={dirty}
          saving={editor.saving}
          updatedAt={editor.updatedAt}
          announcement={editor.announcement}
          exporting={editor.exporting}
          onExport={editor.exportAs}
          onSave={onSave}
        />
      ) : null}

      {body}

      <ConfirmDialog
        open={leaveTo !== null}
        onClose={() => setLeaveTo(null)}
        title="Leave without saving?"
        description="You have changes that are not saved. If you leave now, they will be lost."
        confirmLabel="Leave without saving"
        danger
        onConfirm={() => navigate(leaveTo)}
      />
    </div>
  );
}
