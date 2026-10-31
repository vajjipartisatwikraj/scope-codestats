/**
 * Reads email addresses from an uploaded CSV or from pasted text.
 *
 * Accepts what an admin actually has rather than one exact shape:
 *   - one address per line, or several on a line separated by spaces
 *   - columns separated by commas, semicolons or tabs:  email, role, note  (role and note are
 *     optional and are recognised by what they contain, so their order does not matter; a role is
 *     the word "student" or "teacher")
 *   - quoted values, a header row such as "Email" (skipped), blank lines, any line ending
 *
 * Addresses are lower-cased and de-duplicated. Anything that does not look like an address is
 * reported in `invalid` and left out of `rows`; the server checks everything again.
 */

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ROLES = ['student', 'teacher'];
const HEADER = /^(e-?mails?|e-?mail address(es)?|mail|address)$/i;
const MAX_NOTE = 200;

const stripQuotes = (value) => value.replace(/^["'\s]+|["'\s]+$/g, '');

/**
 * @param {string} text
 * @param {'student'|'teacher'} [defaultRole]  the role of rows that do not name one
 * @returns {{rows: Array<{email: string, role: string, note: string}>, invalid: string[],
 *            duplicates: number, skippedHeader: boolean}}
 */
export function parseEmailCsv(text, defaultRole = 'student') {
  const lines = String(text || '').replace(/\r\n?/g, '\n').split('\n');

  const rows = [];
  const invalid = [];
  const seen = new Set();
  let duplicates = 0;
  let skippedHeader = false;
  let firstContent = true;

  const add = (email, role, note) => {
    const address = email.toLowerCase();
    if (!EMAIL.test(address)) {
      invalid.push(email);
      return;
    }
    if (seen.has(address)) {
      duplicates += 1;
      return;
    }
    seen.add(address);
    rows.push({ email: address, role, note });
  };

  lines.forEach((line) => {
    const cells = line.split(/[,;\t]/).map(stripQuotes).filter(Boolean);
    if (cells.length === 0) return;

    // Only the first row with content can be a header
    if (firstContent) {
      firstContent = false;
      if (HEADER.test(cells[0]) && !cells[0].includes('@')) {
        skippedHeader = true;
        return;
      }
    }

    // "a@x.com b@y.com" on one line: every word is an address
    if (cells.length === 1) {
      const words = cells[0].split(/\s+/).filter(Boolean);
      if (words.length > 1 && words.every((word) => word.includes('@'))) {
        words.forEach((word) => add(word, defaultRole, ''));
        return;
      }
    }

    const emailCell = cells.find((cell) => cell.includes('@')) || cells[0];
    const roleCell = cells.find((cell) => cell !== emailCell && ROLES.includes(cell.toLowerCase()));
    const noteCell = cells.find((cell) => cell !== emailCell && cell !== roleCell);

    add(emailCell, roleCell ? roleCell.toLowerCase() : defaultRole, noteCell ? noteCell.slice(0, MAX_NOTE) : '');
  });

  return { rows, invalid, duplicates, skippedHeader };
}

export default parseEmailCsv;
