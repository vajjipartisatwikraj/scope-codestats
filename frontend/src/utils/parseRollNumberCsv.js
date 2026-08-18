/**
 * Extracts roll numbers from an uploaded CSV or plain text file.
 *
 * Written to accept whatever an admin actually exports rather than demanding one
 * exact shape:
 *   - one roll number per line, or several per line separated by commas,
 *     semicolons or tabs
 *   - quoted values, with quotes stripped
 *   - a header row such as "Roll Number" or "rollno", detected and skipped
 *   - Windows, Unix or classic Mac line endings
 *   - blank lines and stray whitespace
 *
 * Case is preserved here. The server matches case-insensitively, and echoing the
 * admin's own spelling back makes a "not found" list easier to cross-check.
 */

/** Header-ish first cells that should not be treated as a roll number. */
const HEADER_HINTS = [
  "roll",
  "rollno",
  "roll no",
  "roll number",
  "rollnumber",
  "hallticket",
  "hall ticket",
  "student",
  "id",
  "sno",
  "s.no",
  "serial",
];

const stripQuotes = (value) =>
  value.replace(/^["'\s]+|["'\s]+$/g, "");

const looksLikeHeader = (cells) => {
  if (cells.length === 0) return false;
  const first = cells[0].toLowerCase();
  return HEADER_HINTS.some((hint) => first === hint || first.includes(hint));
};

/**
 * @param {string} text raw file contents
 * @returns {{rollNumbers: string[], skippedHeader: boolean, blankLines: number}}
 */
export const parseRollNumberCsv = (text) => {
  const lines = String(text || "")
    .replace(/\r\n?/g, "\n")
    .split("\n");

  const rollNumbers = [];
  let skippedHeader = false;
  let blankLines = 0;

  lines.forEach((line, index) => {
    const cells = line
      .split(/[,;\t]/)
      .map(stripQuotes)
      .filter((cell) => cell.length > 0);

    if (cells.length === 0) {
      blankLines += 1;
      return;
    }

    // Only the very first non-empty row can be a header.
    if (index === 0 && looksLikeHeader(cells)) {
      skippedHeader = true;
      return;
    }

    cells.forEach((cell) => rollNumbers.push(cell));
  });

  // De-duplicate case-insensitively while keeping the first spelling.
  const seen = new Set();
  const unique = [];
  rollNumbers.forEach((roll) => {
    const key = roll.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    unique.push(roll);
  });

  return {
    rollNumbers: unique,
    totalCells: rollNumbers.length,
    duplicates: rollNumbers.length - unique.length,
    skippedHeader,
    blankLines,
  };
};

export default parseRollNumberCsv;
