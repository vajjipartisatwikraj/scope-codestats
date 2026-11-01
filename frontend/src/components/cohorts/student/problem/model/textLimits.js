/** The limits of a note or a report: 500 characters and 100 words */
export const MAX_CHARACTERS = 500;
export const MAX_WORDS = 100;

export const wordCount = (text) => text.trim().split(/\s+/).filter(Boolean).length;
export const withinLimits = (text) => text.length <= MAX_CHARACTERS && wordCount(text) <= MAX_WORDS;
