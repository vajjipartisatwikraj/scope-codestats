import React, { useId } from "react";
import { TextField } from "../../ui";
import BulletsEditor from "./BulletsEditor";
import FontSizeControl from "./FontSizeControl";
import RepeaterEditor from "./RepeaterEditor";
import RichTextArea from "./RichTextArea";

/**
 * The editor of one template field. It handles every field type the templates support (text,
 * multiline, bullets, repeater), so a field added in backend/resumeTemplates shows up here with no
 * change. Each field also has its text size on the paper.
 *
 *   template     the template (for the text size bounds)
 *   definition   the field definition
 *   field        { key, value, fontSize }
 *   showLabel    show the field's name; false when the section card already carries it
 *   onChange(patch)   { value } or { fontSize }
 */
export default function FieldEditor({ template, definition, field, showLabel, onChange }) {
  const id = useId();
  const labelId = `${id}-label`;
  const hintId = definition.helperText ? `${id}-hint` : undefined;

  const setValue = (value) => onChange({ value });

  let control;
  if (definition.type === "repeater") {
    control = <RepeaterEditor definition={definition} items={field.value} onChange={setValue} />;
  } else if (definition.type === "bullets") {
    control = (
      <BulletsEditor definition={definition} points={field.value} label={definition.label} onChange={setValue} />
    );
  } else if (definition.type === "multiline") {
    control = (
      <RichTextArea
        id={`${id}-input`}
        labelledBy={showLabel ? labelId : undefined}
        ariaLabel={definition.label}
        describedBy={hintId}
        value={field.value ?? ""}
        rows={4}
        maxLength={definition.maxLength}
        placeholder={definition.placeholder}
        onChange={setValue}
      />
    );
  } else {
    control = (
      <TextField
        id={`${id}-input`}
        aria-label={showLabel ? undefined : definition.label}
        aria-labelledby={showLabel ? labelId : undefined}
        aria-describedby={hintId}
        placeholder={definition.placeholder}
        value={field.value ?? ""}
        maxLength={definition.maxLength}
        autoComplete="off"
        onChange={(event) => setValue(event.target.value)}
      />
    );
  }

  const grouped = definition.type === "repeater" || definition.type === "bullets";

  return (
    <div
      className="rbe-field"
      role={grouped ? "group" : undefined}
      aria-labelledby={grouped && showLabel ? labelId : undefined}
      aria-label={grouped && !showLabel ? definition.label : undefined}
    >
      <div className="rbe-field__head" data-labelled={showLabel ? "true" : "false"}>
        {showLabel ? (
          <label className="rbe-field__label" id={labelId} htmlFor={grouped ? undefined : `${id}-input`}>
            {definition.label}
          </label>
        ) : null}
        <FontSizeControl
          template={template}
          label={definition.label}
          value={field.fontSize}
          onChange={(fontSize) => onChange({ fontSize })}
        />
      </div>

      {definition.helperText ? (
        <p className="rbe-field__hint" id={hintId}>
          {definition.helperText}
        </p>
      ) : null}

      {control}
    </div>
  );
}
