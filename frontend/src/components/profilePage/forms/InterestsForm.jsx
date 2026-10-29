import React from 'react';
import { TagInput } from '../../custom-components';
import { interestOptions } from '../../../constants/profileOptions';

/** The areas the student wants to grow in: type your own or pick from the suggestions */
export default function InterestsForm({ draft, set }) {
  return (
    <TagInput
      label="Interests"
      value={draft.interests}
      onChange={(interests) => set({ interests })}
      suggestions={interestOptions}
      maxSuggestions={12}
      placeholder="Type an interest and press Enter"
      hint="Pick from the suggestions or type your own. Aim for the areas you want to grow in."
    />
  );
}
