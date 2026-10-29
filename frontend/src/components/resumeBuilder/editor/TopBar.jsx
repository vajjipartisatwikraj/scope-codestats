import React, { useEffect } from "react";
import { ArrowLeftIcon } from "@phosphor-icons/react/dist/csr/ArrowLeft";
import { FloppyDiskIcon } from "@phosphor-icons/react/dist/csr/FloppyDisk";
import { MoonIcon } from "@phosphor-icons/react/dist/csr/Moon";
import { SunIcon } from "@phosphor-icons/react/dist/csr/Sun";
import { useTheme } from "../../../contexts/ThemeContext";
import { Button, IconButton } from "../../ui";
import ExportMenu from "./ExportMenu";
import SaveStatus from "./SaveStatus";

export const TITLE_ID = "rbe-title";

/**
 * The 64px top bar of the editor: back to the list, the resume's name as an inline editable title,
 * the save state, the theme switch, Export and the one primary button, Save.
 *
 *   title, onTitle, titleInvalid   the name field (an empty name cannot be saved)
 *   onBack                         back to the list (the editor asks first when there are edits)
 *   ready                          the resume is loaded; before that only Back is active
 *   dirty, saving, updatedAt, announcement   the save state
 *   exporting, onExport(formatId), onSave()
 */
export default function TopBar({
  title,
  onTitle,
  titleInvalid,
  onBack,
  ready,
  dirty,
  saving,
  updatedAt,
  announcement,
  exporting,
  onExport,
  onSave,
}) {
  const { themeName, toggleTheme } = useTheme();
  const toDaylight = themeName === "midnight";

  // Ctrl+S or Cmd+S saves instead of opening the browser's own dialog
  useEffect(() => {
    const onKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === "s") {
        event.preventDefault();
        if (ready && dirty && !saving) onSave();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [ready, dirty, saving, onSave]);

  return (
    <header className="rbe-top">
      <IconButton label="Back to my resumes" onClick={onBack}>
        <ArrowLeftIcon size={20} weight="regular" aria-hidden="true" />
      </IconButton>

      {ready ? (
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
      ) : (
        <span className="rbe-title rbe-title--static" />
      )}

      {ready ? (
        <div className="rbe-top__end">
          <SaveStatus dirty={dirty} saving={saving} updatedAt={updatedAt} announcement={announcement} />
          <IconButton
            label={toDaylight ? "Switch to the light theme" : "Switch to the dark theme"}
            tone="plain"
            onClick={toggleTheme}
          >
            {toDaylight ? (
              <SunIcon size={20} weight="regular" aria-hidden="true" />
            ) : (
              <MoonIcon size={20} weight="regular" aria-hidden="true" />
            )}
          </IconButton>
          <ExportMenu exporting={exporting} onExport={onExport} />
          <Button
            variant="primary"
            aria-keyshortcuts="Control+S Meta+S"
            startIcon={<FloppyDiskIcon size={18} weight="regular" aria-hidden="true" />}
            disabled={!dirty}
            loading={saving}
            onClick={onSave}
          >
            {saving ? "Saving" : "Save"}
          </Button>
        </div>
      ) : (
        <div className="rbe-top__end" />
      )}
    </header>
  );
}
