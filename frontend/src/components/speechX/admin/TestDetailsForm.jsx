import React from "react";
import { FormSection, TextField } from "../../ui";

/**
 * The "Details" step: title, description and instructions of a test.
 * (The schedule is its own step, see ScheduleForm.)
 *
 * Props: form, onChange(field, value), errors ({ title }).
 */
const TestDetailsForm = ({ form, onChange, errors = {} }) => (
  <FormSection title="Test details" description="The name and the instructions students read before they start.">
    <TextField
      id="sxa-title"
      className="ui-form-grid__wide"
      label="Title"
      value={form.title}
      onChange={(event) => onChange("title", event.target.value)}
      required
      maxLength={150}
      error={errors.title}
    />
    <TextField
      id="sxa-description"
      className="ui-form-grid__wide"
      label="Description"
      value={form.description}
      onChange={(event) => onChange("description", event.target.value)}
      multiline
      rows={3}
      maxLength={2000}
    />
    <TextField
      id="sxa-instructions"
      className="ui-form-grid__wide"
      label="Instructions for students"
      value={form.instructions}
      onChange={(event) => onChange("instructions", event.target.value)}
      multiline
      rows={4}
      maxLength={3000}
      hint="Shown before the test starts. Example: use a quiet room and a headset."
    />
  </FormSection>
);

export default TestDetailsForm;
