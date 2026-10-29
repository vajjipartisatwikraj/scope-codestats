/**
 * Pure helpers for the academic year page: the month names, the academic year options, how a stored
 * value reads on screen, and the list of what a pending change would do to students.
 *
 * Nothing here reads the server. The sentences only restate what the configuration itself says (a
 * student whose graduating year has no mapping is shown as "Graduated", see utils/academicYearConfig.js),
 * so no number of students is claimed: the page does not know how many students a year has.
 */

export const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** The values the server accepts (models/AcademicYearConfig.js) */
export const ACADEMIC_YEARS = ['First Year', 'Second Year', 'Third Year', 'Fourth Year', 'Graduated'];

/** "First Year" -> "First year": the stored value, in sentence case for the screen */
export const yearLabel = (value) => (value ? value.charAt(0) + value.slice(1).toLowerCase() : '');

const byYearDescending = (a, b) => b.graduationYear - a.graduationYear;
export const sortMappings = (list) => [...list].sort(byYearDescending);

const keyOf = (mapping) => `${mapping.graduationYear}|${mapping.academicYear}|${mapping.displayName}`;

/** True when the mappings or the start month differ from what is saved */
export function hasChanges(saved, current) {
  if (saved.startMonth !== current.startMonth) return true;
  const before = sortMappings(saved.mappings).map(keyOf).join(';');
  const after = sortMappings(current.mappings).map(keyOf).join(';');
  return before !== after;
}

/**
 * What saving would change, as sentences about students. Each entry is { id, kind, text }.
 * kind is 'added' | 'changed' | 'removed' | 'month'.
 */
export function describeChanges(saved, current) {
  const before = new Map(saved.mappings.map((mapping) => [mapping.graduationYear, mapping]));
  const after = new Map(current.mappings.map((mapping) => [mapping.graduationYear, mapping]));
  const lines = [];

  sortMappings(current.mappings).forEach((mapping) => {
    const old = before.get(mapping.graduationYear);
    if (!old) {
      lines.push({
        id: `add-${mapping.graduationYear}`,
        kind: 'added',
        text: `Students graduating in ${mapping.graduationYear} will show as ${mapping.displayName} (${yearLabel(mapping.academicYear).toLowerCase()}).`,
      });
    } else if (old.academicYear !== mapping.academicYear || old.displayName !== mapping.displayName) {
      lines.push({
        id: `change-${mapping.graduationYear}`,
        kind: 'changed',
        text: `Students graduating in ${mapping.graduationYear} change from ${old.displayName} to ${mapping.displayName}.`,
      });
    }
  });

  sortMappings(saved.mappings).forEach((mapping) => {
    if (!after.has(mapping.graduationYear)) {
      lines.push({
        id: `remove-${mapping.graduationYear}`,
        kind: 'removed',
        text: `Students graduating in ${mapping.graduationYear} lose their mapping, so they show as Graduated.`,
      });
    }
  });

  if (saved.startMonth !== current.startMonth) {
    lines.push({
      id: 'month',
      kind: 'month',
      text: `Students move up a year when ${MONTH_NAMES[current.startMonth]} begins, instead of ${MONTH_NAMES[saved.startMonth]}.`,
    });
  }

  return lines;
}

/** How a row of the table differs from what is saved: 'new', 'changed' or null */
export function rowState(saved, mapping) {
  const old = saved.mappings.find((item) => item.graduationYear === mapping.graduationYear);
  if (!old) return 'new';
  return old.academicYear !== mapping.academicYear || old.displayName !== mapping.displayName ? 'changed' : null;
}
