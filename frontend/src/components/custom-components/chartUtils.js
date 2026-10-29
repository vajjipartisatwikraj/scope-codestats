/**
 * Small helpers shared by the components in this folder.
 * Plain functions: no React and no styling.
 */

/** Joins class names and skips anything falsy. */
export const cx = (...parts) => parts.filter(Boolean).join(' ');

/** The value as a finite number, or `fallback` when it is not one. */
export function finiteOr(value, fallback = 0) {
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) ? number : fallback;
}

/** The value as a finite number, or null when it is missing or not a number. */
export function numberOrNull(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export const clamp = (value, low, high) => Math.min(high, Math.max(low, value));

/** 12 -> "12px". Strings (any CSS length) pass through unchanged. */
export const cssLength = (value) => (typeof value === 'number' ? `${value}px` : value);

const NUMBER_FORMAT = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });

/** The default number format of every component: Indian digit grouping, at most 2 decimals. */
export const formatNumber = (value) => NUMBER_FORMAT.format(value);

/**
 * Turns a `colors` prop into CSS variables.
 *
 * `map` says which variable each colour name sets, for example { bar: '--bc-bar' }. Only the
 * colours the caller gave are set, so the component's own CSS defaults stay in charge of the
 * rest. Any CSS colour works, including var(--ds-accent).
 */
export function colorVars(colors, map) {
  const vars = {};
  if (!colors) return vars;
  Object.keys(map).forEach((name) => {
    if (colors[name]) vars[map[name]] = colors[name];
  });
  return vars;
}

/**
 * Turns the `highlight` prop into a test for one item, so a chart can single out a bar.
 *
 *   'max' | 'min' | 'first' | 'last'   the item with the biggest or smallest value, or the ends
 *   'none'                              nothing
 *   a number                            the item at that index
 *   any other string                    the item whose key equals it
 *   a function                          (item, index, items) => boolean
 *   an array                            any of the above
 *
 * @returns {(index: number) => boolean}
 */
export function resolveHighlight(highlight, { items, values, keys }) {
  const indexOfBest = (isBetter) =>
    values.reduce((best, value, index) => (best === -1 || isBetter(value, values[best]) ? index : best), -1);

  const testFor = (rule) => {
    if (rule === 'max') {
      const at = indexOfBest((a, b) => a > b);
      return (index) => index === at;
    }
    if (rule === 'min') {
      const at = indexOfBest((a, b) => a < b);
      return (index) => index === at;
    }
    if (rule === 'first') return (index) => index === 0;
    if (rule === 'last') return (index) => index === values.length - 1;
    if (typeof rule === 'number') return (index) => index === rule;
    if (typeof rule === 'function') return (index) => Boolean(rule(items[index], index, items));
    if (typeof rule === 'string' && rule !== 'none') return (index) => String(keys[index]) === rule;
    return () => false;
  };

  const tests = (Array.isArray(highlight) ? highlight : [highlight]).map(testFor);
  return (index) => tests.some((test) => test(index));
}

/** "LeetCode: 82, CodeChef: 64": the default text equivalent of a chart. */
export function describeValues(labels, values, format = formatNumber, limit = 12) {
  const parts = values.slice(0, limit).map((value, index) => {
    const label = labels[index];
    const isText = typeof label === 'string' || typeof label === 'number';
    return isText && label !== '' ? `${label}: ${format(value)}` : format(value);
  });
  if (values.length > limit) parts.push(`and ${values.length - limit} more`);
  return parts.join(', ');
}

// The eight categorical series of DESIGN.md, in order. A chart that colours its own series or
// slices takes them from here, so every chart on a page agrees on which hue comes next.
const SERIES_NAMES = ['blue', 'teal', 'amber', 'violet', 'coral', 'green', 'sky', 'slate'];

/** The colour of the nth series, as a CSS variable of the design tokens: var(--ds-series-blue) ... */
export const seriesColor = (index) => `var(--ds-series-${SERIES_NAMES[((index % SERIES_NAMES.length) + SERIES_NAMES.length) % SERIES_NAMES.length]})`;

/**
 * Tick values for an axis: round numbers (steps of 1, 2, 2.5, 5 times a power of ten) that cover
 * low..high with about `count` ticks. The first tick is at or below `low` and the last at or
 * above `high`, so the scale can be widened to them.
 *
 * @returns {number[]} ticks from the smallest to the largest value
 */
export function niceTicks(low, high, count = 4) {
  if (!Number.isFinite(low) || !Number.isFinite(high)) return [];
  if (high === low) {
    const pad = Math.abs(low) < 1 ? 1 : Math.abs(low) * 0.1;
    low -= pad;
    high += pad;
  }
  const wanted = Math.max(2, count);
  const rough = (high - low) / (wanted - 1);
  const power = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * power).find((candidate) => candidate >= rough) || rough;
  const first = Math.floor(low / step + 1e-9) * step;
  const last = Math.ceil(high / step - 1e-9) * step;
  const ticks = [];
  for (let value = first; value <= last + step / 2; value += step) {
    ticks.push(Math.round(value / step) * step === value ? value : Math.round(value * 1e6) / 1e6);
  }
  return ticks;
}

/** Up to `count` indexes spread evenly from the first item to the last. */
export function spreadIndexes(total, count) {
  if (total <= 0) return [];
  if (total <= count || count < 2) return count < 2 ? [0] : Array.from({ length: total }, (_, i) => i);
  const picked = new Set();
  for (let k = 0; k < count; k += 1) picked.add(Math.round((k * (total - 1)) / (count - 1)));
  return [...picked];
}
