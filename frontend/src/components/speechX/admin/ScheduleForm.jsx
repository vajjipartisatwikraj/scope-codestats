import React from "react";
import { FormSection, Notice, TextField } from "../../ui";

const pad = (value) => String(value).padStart(2, "0");

/** Date -> the "2026-10-26T12:10" a datetime-local input shows (device time zone), or "". */
export const toLocalInput = (date) =>
  date instanceof Date && !Number.isNaN(date.getTime())
    ? `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
    : "";

/** The value of a datetime-local input -> a Date (device time zone), or null when empty or invalid. */
export const fromLocalInput = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const zoneName = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  } catch {
    return "";
  }
};

/**
 * The "Schedule" step: when students can start the test. Native datetime-local fields (the Material
 * UI date-time pickers are gone); the form keeps Date objects, as before.
 *
 * Props: form, onChange(field, value), errors ({ start, end }).
 */
const ScheduleForm = ({ form, onChange, errors = {} }) => {
  const zone = zoneName();
  return (
    <FormSection title="Schedule" description="The window during which students can start the test.">
      <TextField
        id="sxa-start"
        type="datetime-local"
        label="Start time"
        value={toLocalInput(form.startTime)}
        onChange={(event) => onChange("startTime", fromLocalInput(event.target.value))}
        required
        error={errors.start}
        hint={zone ? `Times use this device's time zone (${zone}).` : undefined}
      />
      <TextField
        id="sxa-end"
        type="datetime-local"
        label="End time"
        value={toLocalInput(form.endTime)}
        min={toLocalInput(form.startTime) || undefined}
        onChange={(event) => onChange("endTime", fromLocalInput(event.target.value))}
        required
        error={errors.end}
      />
      <div className="ui-form-grid__wide">
        <Notice tone="info">
          Students can start any time between the start and end time. A section that is still running at the end time
          is submitted automatically.
        </Notice>
      </div>
    </FormSection>
  );
};

export default ScheduleForm;
