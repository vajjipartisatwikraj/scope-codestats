/** Small helpers shared by the speech analysis modules. */

const clamp01 = (value) => Math.min(1, Math.max(0, Number(value) || 0));

/** 0..1 -> whole number 0..100. */
const pct = (value) => Math.round(clamp01(value) * 100);

const round1 = (n) => Math.round(n * 10) / 10;
const round2 = (n) => Math.round(n * 100) / 100;

const isNumber = (value) => typeof value === "number" && Number.isFinite(value);

/** "word" -> "words", with the count in front: plural(2, "sound") = "2 sounds". */
const plural = (count, noun) => `${count} ${noun}${count === 1 ? "" : "s"}`;

/** Lower-case letters and digits only, so "Today." and "today" compare equal. */
const normalizeWord = (word) => String(word || "").toLowerCase().replace(/[^a-z0-9']+/g, "");

/** A word as it should be shown: punctuation trimmed from both ends. */
const displayWord = (word) => String(word || "").replace(/^[^\w']+|[^\w']+$/g, "");

module.exports = { clamp01, pct, round1, round2, isNumber, plural, normalizeWord, displayWord };
