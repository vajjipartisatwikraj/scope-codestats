import React, { useId, useState } from "react";
import { CheckCircleIcon } from "@phosphor-icons/react/dist/csr/CheckCircle";
import { Button, Checkbox, Dialog, TextField } from "../../ui";
import PaperThumbnail from "./PaperThumbnail";

const NAME_LIMIT = 80;

/**
 * The form inside the dialog. It lives only while the dialog is open, so it starts empty every
 * time. An empty name is an inline error linked to the field, and the field takes focus.
 */
function NewResumeForm({ formId, templates, busy, onCreate }) {
  const [title, setTitle] = useState("");
  const [template, setTemplate] = useState(templates[0]?.id || "");
  const [useProfile, setUseProfile] = useState(true);
  const [error, setError] = useState("");
  const nameId = useId();
  const legendId = useId();

  const submit = (event) => {
    event.preventDefault();
    if (busy) return;
    const name = title.trim();
    if (!name) {
      setError("Name your resume to continue");
      // The first error takes focus
      const field = document.getElementById(nameId);
      if (field) field.focus();
      return;
    }
    onCreate(name, template, useProfile);
  };

  return (
    <form id={formId} className="rbl-new" onSubmit={submit} noValidate>
      <TextField
        id={nameId}
        label="Resume name"
        placeholder="e.g. Backend internship"
        value={title}
        maxLength={NAME_LIMIT}
        error={error}
        hint={`${title.length} of ${NAME_LIMIT}`}
        data-autofocus=""
        onChange={(event) => {
          setTitle(event.target.value);
          if (error) setError("");
        }}
        autoComplete="off"
      />

      <Checkbox
        label="Start with the details from my profile"
        checked={useProfile}
        onChange={(event) => setUseProfile(event.target.checked)}
      />

      <fieldset className="rbl-new__templates">
        <legend className="rbl-new__legend" id={legendId}>
          Template
        </legend>
        {/* Picking a look is a visual choice, so each template is a tile with a preview */}
        <div className="rbl-tiles" role="radiogroup" aria-labelledby={legendId}>
          {templates.map((item) => {
            const selected = template === item.id;
            return (
              <label key={item.id} className="rbl-tile">
                <input
                  type="radio"
                  name="resume-template"
                  className="ui-sr"
                  value={item.id}
                  checked={selected}
                  onChange={() => setTemplate(item.id)}
                />
                <span className="rbl-tile__face" data-selected={selected ? "true" : "false"}>
                  <span className="rbl-tile__preview">
                    <PaperThumbnail html={item.previewHtml} />
                  </span>
                  <span className="rbl-tile__text">
                    <span className="rbl-tile__name">{item.name}</span>
                    <span className="rbl-tile__category">{item.category || "Resume template"}</span>
                  </span>
                  {selected ? (
                    <CheckCircleIcon
                      className="rbl-tile__check"
                      size={24}
                      weight="fill"
                      aria-hidden="true"
                    />
                  ) : null}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>
    </form>
  );
}

/**
 * New resume (a short form of two things, so a dialog: design/screens.md section 17).
 *
 *   open, onClose
 *   templates   the template catalogue
 *   busy        the resume is being created
 *   onCreate(title, templateId, useProfile)
 */
export default function NewResumeDialog({ open, onClose, templates, busy, onCreate }) {
  const formId = useId();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      busy={busy}
      size="lg"
      title="New resume"
      description="Name it and choose a look. You can change the template later without losing anything. The editor opens in a new tab."
      actions={
        <>
          <Button onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" form={formId} loading={busy}>
            Create resume
          </Button>
        </>
      }
    >
      <NewResumeForm formId={formId} templates={templates} busy={busy} onCreate={onCreate} />
    </Dialog>
  );
}
