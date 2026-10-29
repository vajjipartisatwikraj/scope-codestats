import { PLATFORMS, TAB_PLATFORMS, TABS, platformValue, valueOf } from './leaderboardModel';

/**
 * Saves the students that match the filters, in the order they are listed, as a CSV file that
 * opens in Excel (a byte order mark tells it the text is UTF-8). For teachers and admins.
 *
 * A cell that starts with =, +, - or @ would be read as a formula by a spreadsheet, and names and
 * roll numbers are typed by students, so such a cell is written as text.
 */
const cell = (value) => {
  let text = value === null || value === undefined ? '' : String(value);
  if (typeof value === 'string' && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export default function exportCsv({ rows, tab, ranks, departmentRanks, yearName, now = new Date() }) {
  const info = TABS.find((entry) => entry.key === tab);
  const platforms = TAB_PLATFORMS[tab];

  const header = [
    'Rank',
    'Name',
    'Roll number',
    'Email',
    'Department',
    'Section',
    'Year of study',
    'Graduating year',
    'Consistency (0 to 5)',
    'Score change (last 7 days)',
    info.valueLabel,
    ...platforms.map((key) => PLATFORMS[key].name),
    'Department rank',
  ];

  const lines = rows.map((row) =>
    [
      ranks.get(row._id),
      row.name,
      row.rollNumber ? String(row.rollNumber).toUpperCase() : '',
      row.email,
      row.department,
      row.section,
      yearName(row.graduatingYear) === '\u2013' ? '' : yearName(row.graduatingYear),
      row.graduatingYear,
      row.consistencyIndex || 0,
      row.scoreChange || 0,
      valueOf(row, tab),
      ...platforms.map((key) => {
        const value = platformValue(row, key, tab);
        return value === null ? '' : value;
      }),
      departmentRanks.get(row._id),
    ]
      .map(cell)
      .join(',')
  );

  const body = `\uFEFF${[header.map(cell).join(','), ...lines].join('\r\n')}\r\n`;
  const blob = new Blob([body], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const stamp = now.toISOString().slice(0, 10).replace(/-/g, '');
  const link = document.createElement('a');
  link.href = url;
  link.download = `leaderboard-${tab}-${stamp}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
