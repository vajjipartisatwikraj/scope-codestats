import React from 'react';
import { TextField } from '../../ui';

/** LinkedIn and the resume: the two links people use to reach you and read more about you */
export default function LinksForm({ draft, set, errors }) {
  return (
    <div className="pf-fields">
      <TextField
        className="pf-fields__wide"
        label="LinkedIn"
        inputMode="url"
        autoCapitalize="none"
        value={draft.linkedinUrl}
        onChange={(event) => set({ linkedinUrl: event.target.value })}
        error={errors.linkedinUrl}
        placeholder="https://www.linkedin.com/in/your-name"
        hint="Paste your profile link, or just the name at the end of it."
      />
      <TextField
        className="pf-fields__wide"
        label="Resume"
        inputMode="url"
        autoCapitalize="none"
        value={draft.resumeLink}
        onChange={(event) => set({ resumeLink: event.target.value })}
        error={errors.resumeLink}
        placeholder="https://drive.google.com/file/d/..."
        hint="A link anyone can open. If it is on Google Drive, set sharing to Anyone with the link."
      />
    </div>
  );
}
