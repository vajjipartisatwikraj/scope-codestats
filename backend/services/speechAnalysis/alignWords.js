/**
 * Word-by-word comparison of the sentence the student should have said and the
 * words the speech recogniser heard, for the Transcription tab.
 *
 * The judge reports totals (substitutions, deletions, insertions) but not which
 * words they were, so the pairing is rebuilt here with a standard edit-distance
 * alignment over normalised words.
 */

const { displayWord, normalizeWord } = require("./common");

const tokens = (text) =>
  String(text || "")
    .split(/\s+/)
    .map((raw) => ({ shown: displayWord(raw), key: normalizeWord(raw) }))
    .filter((t) => t.key);

/**
 * @returns {{ rows: Array<{expected: string|null, heard: string|null, status: string}>,
 *             counts: {matches:number, substitutions:number, missing:number, extra:number},
 *             expectedCount: number }}
 *   status is match | substitution | missing | extra
 */
function alignWords(expectedText, heardText) {
  const expected = tokens(expectedText);
  const heard = tokens(heardText);
  const n = expected.length;
  const m = heard.length;

  // cost[i][j] = fewest edits turning expected[i:] into heard[j:]
  const cost = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i -= 1) cost[i][m] = cost[i + 1][m] + 1;
  for (let j = m - 1; j >= 0; j -= 1) cost[n][j] = cost[n][j + 1] + 1;
  for (let i = n - 1; i >= 0; i -= 1) {
    for (let j = m - 1; j >= 0; j -= 1) {
      const diagonal = cost[i + 1][j + 1] + (expected[i].key === heard[j].key ? 0 : 1);
      cost[i][j] = Math.min(diagonal, cost[i + 1][j] + 1, cost[i][j + 1] + 1);
    }
  }

  const rows = [];
  let i = 0;
  let j = 0;
  while (i < n || j < m) {
    if (i < n && j < m) {
      const same = expected[i].key === heard[j].key;
      if (cost[i][j] === cost[i + 1][j + 1] + (same ? 0 : 1)) {
        rows.push({
          expected: expected[i].shown,
          heard: heard[j].shown,
          status: same ? "match" : "substitution",
        });
        i += 1;
        j += 1;
        continue;
      }
    }
    if (i < n && (j === m || cost[i][j] === cost[i + 1][j] + 1)) {
      rows.push({ expected: expected[i].shown, heard: null, status: "missing" });
      i += 1;
    } else {
      rows.push({ expected: null, heard: heard[j].shown, status: "extra" });
      j += 1;
    }
  }

  const count = (status) => rows.filter((row) => row.status === status).length;
  return {
    rows,
    counts: {
      matches: count("match"),
      substitutions: count("substitution"),
      missing: count("missing"),
      extra: count("extra"),
    },
    expectedCount: n,
  };
}

module.exports = { alignWords };
