import React, { useId } from "react";
import { TextField } from "../../ui";
import BulletsEditor from "./BulletsEditor";
import RepeaterEditor from "./RepeaterEditor";
import RichTextArea from "./RichTextArea";

/**
 * The input of one field. It handles every field type a template can use (text, url, multiline,
 * bullets, repeater), so a field a template adds shows up here with no change.
 *
 *   definition   the field definition from the template (key, label, type, limits)
 *   value        the field's current value
 *   showLabel    show the field's name; false when the section card already carries it
 *   onChange(value)
 */
export default function FieldEditor({ definition, value, showLabel, onChange }) {
  const id = useId();
  const labelId = `${id}-label`;
  const hintId = definition.helperText ? `${id}-hint` : undefined;

  let control;
  if (definition.type === "repeater") {
    control = <RepeaterEditor definition={definition} items={value} onChange={onChange} />;
  } else if (definition.type === "bullets") {
    control = <BulletsEditor definition={definition} points={value} label={definition.label} onChange={onChange} />;
  } else if (definition.type === "multiline") {
    control = (
      <RichTextArea
        id={`${id}-input`}
        labelledBy={showLabel ? labelId : undefined}
        ariaLabel={definition.label}
        describedBy={hintId}
        value={value ?? ""}
        rows={4}
        maxLength={definition.maxLength}
        placeholder={definition.placeholder}
        onChange={onChange}
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
        value={value ?? ""}
        maxLength={definition.maxLength}
        autoComplete="off"
        onChange={(event) => onChange(event.target.value)}
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
      {showLabel ? (
        <div className="rbe-field__head">
          <label className="rbe-field__label" id={labelId} htmlFor={grouped ? undefined : `${id}-input`}>
            {definition.label}
          </label>
        </div>
      ) : null}

      {definition.helperText ? (
        <p className="rbe-field__hint" id={hintId}>
          {definition.helperText}
        </p>
      ) : null}

      {control}
    </div>
  );
}
