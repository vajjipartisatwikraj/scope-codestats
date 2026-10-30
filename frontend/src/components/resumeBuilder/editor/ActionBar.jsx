import React, { useEffect } from "react";
import { ArrowLeftIcon } from "@phosphor-icons/react/dist/csr/ArrowLeft";
import { FloppyDiskIcon } from "@phosphor-icons/react/dist/csr/FloppyDisk";
import useMediaQuery from "../../../hooks/useMediaQuery";
import { Button, IconButton } from "../../ui";
import ExportMenu from "./ExportMenu";
import SaveStatus from "./SaveStatus";

export const TITLE_ID = "rbe-title";

/**
 * The row of actions at the top of the editor page, under the navbar: back to the list, the resume's
 * name as an inline editable title, the save state, Export and the one primary button, Save.
 *
 *   title, onTitle, titleInvalid   the name field (an empty name cannot be saved)
 *   onBack                         back to the list (the editor asks first when there are edits)
 *   dirty, saving, updatedAt, announcement   the save state
 *   exporting, onExport(formatId), onSave()
 *
 * Below 600px the save state is an icon, Export is an icon and the buttons are a little smaller.
 */
export default function ActionBar({
  title,
  onTitle,
  titleInvalid,
  onBack,
  dirty,
  saving,
  updatedAt,
  announcement,
  exporting,
  onExport,
  onSave,
}) {
  const compact = useMediaQuery("(max-width: 599.95px)");

  // Ctrl+S or Cmd+S saves instead of opening the browser's own dialog
  useEffect(() => {
    const onKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === "s") {
        event.preventDefault();
        if (dirty && !saving) onSave();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [dirty, saving, onSave]);

  return (
    <div className="rbe-actions">
      <IconButton label="Back to my resumes" size={compact ? "sm" : undefined} onClick={onBack}>
        <ArrowLeftIcon size={20} weight="regular" aria-hidden="true" />
      </IconButton>

      <input
        id={TITLE_ID}
        className="rbe-title"
        type="text"
        value={title}
        maxLength={80}
        placeholder="Name your resume"
        aria-label="Resume name"
        aria-invalid={titleInvalid ? true : undefined}
        autoComplete="off"
        onChange={(event) => onTitle(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
        }}
      />

      <div className="rbe-top__end">
        <SaveStatus dirty={dirty} saving={saving} updatedAt={updatedAt} announcement={announcement} />
        <ExportMenu exporting={exporting} onExport={onExport} compact={compact} />
        <Button
          className="rbe-save"
          variant="primary"
          size={compact ? "sm" : undefined}
          aria-keyshortcuts="Control+S Meta+S"
          startIcon={compact ? undefined : <FloppyDiskIcon size={18} weight="regular" aria-hidden="true" />}
          disabled={!dirty}
          loading={saving}
          onClick={onSave}
        >
          {saving ? "Saving" : "Save"}
        </Button>
      </div>
    </div>
  );
}
