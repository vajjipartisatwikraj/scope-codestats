import React, { useCallback, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import useMediaQuery from "../../../hooks/useMediaQuery";
import { ConfirmDialog, PillTabs } from "../../ui";
import { getTemplateComponent, pageGeometry } from "../templates";
import EditPane from "./EditPane";
import { EditorError, EditorSkeleton } from "./EditorStates";
import PreviewPane from "./PreviewPane";
import TopBar, { TITLE_ID } from "./TopBar";
import useResumeEditor from "./useResumeEditor";
import "./resumeEditor.css";

const LIST_PATH = "/build-resume";
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
  const { phase, error, template, font, draft, dirty } = editor;

  const [tab, setTab] = useState("edit");
  const [leaving, setLeaving] = useState(false);

  // An unclipped copy of the template at the printable width, kept off-screen as the Word export's
  // source so the output flows across pages instead of inheriting the preview's page windows.
  const exportRef = useRef(null);

  const goToList = useCallback(() => navigate(LIST_PATH), [navigate]);
  const goBack = () => (dirty ? setLeaving(true) : goToList());

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
  const geometry = template ? pageGeometry(template.page) : null;
  const Body = template ? getTemplateComponent(template.id) : null;

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
            fonts={editor.fonts}
            fontId={draft.font}
            fields={draft.fields}
            importing={editor.importing}
            onTemplate={editor.changeTemplate}
            onFont={editor.setFont}
            onField={editor.changeField}
            onImport={editor.importFromProfile}
          />
        </div>

        <div
          className="rbe-pane"
          id="rbe-panel-preview"
          role={wide ? undefined : "tabpanel"}
          aria-labelledby={wide ? undefined : "rbe-tab-preview"}
          hidden={!wide && tab !== "preview"}
        >
          <PreviewPane template={template} fields={draft.fields} fontFamily={font?.cssFamily} />
        </div>

        {/* Off-screen export source: full content at the printable width */}
        <div className="rbe-export-source" aria-hidden="true" inert="" style={{ width: geometry.contentWidth }}>
          <div ref={exportRef}>
            <Body template={template} fields={draft.fields} fontFamily={font?.cssFamily} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rbe">
      <h1 className="ui-sr">Resume editor</h1>

      <TopBar
        title={draft.title}
        onTitle={editor.setTitle}
        titleInvalid={ready && !draft.title.trim()}
        onBack={goBack}
        ready={ready}
        dirty={dirty}
        saving={editor.saving}
        updatedAt={editor.updatedAt}
        announcement={editor.announcement}
        exporting={editor.exporting}
        onExport={(format) => editor.exportAs(format, exportRef.current)}
        onSave={onSave}
      />

      {body}

      <ConfirmDialog
        open={leaving}
        onClose={() => setLeaving(false)}
        title="Leave without saving?"
        description="You have changes that are not saved. If you leave now, they will be lost."
        confirmLabel="Leave without saving"
        danger
        onConfirm={goToList}
      />
    </div>
  );
}
