import React from 'react';
import { TextField } from '../../ui';

/**
 * The bio. A few honest sentences read better than a long paragraph, so the field is tall enough for
 * a short one and the hint says what to cover. Line breaks are kept on the public profile.
 */
export default function AboutForm({ draft, set }) {
  const length = draft.about.trim().length;
  return (
    <TextField
      label="About you"
      multiline
      rows={9}
      value={draft.about}
      onChange={(event) => set({ about: event.target.value })}
      placeholder="I am a third-year CSE student who enjoys backend work. I solve graph problems for fun and am learning system design."
      hint={length === 0 ? 'Say who you are, what you build and what you are learning. Two or three sentences is plenty.' : `${length} characters. Around 150 to 400 reads well.`}
    />
  );
}
