import React, { useEffect, useRef } from 'react';
import './shared.css';
import './Heatmap.css';
import { clamp, cx, finiteOr } from './chartUtils';

/**
 * Heatmap: a calendar grid with one square per day, weeks as columns, shaded by how much
 * happened on each day (the contribution graph pattern). Month names sit under the columns.
 *
 * It works on calendar dates, not moments in time, so it never shifts a day because of a time
 * zone. Dates may be 'YYYY-MM-DD' strings, Date objects or timestamps.
 *
 * Data
 *   data              array of anything with a date; days that are missing count as empty
 *   getDate(item, i)      the day               default item.date
 *   getValue(item, i)     a number              default item.value, else item.count
 *   getLevel(item, value) the shade to use, 0 up to colors.length - 1. Use it when the server
 *                         already decides the shade.
 *   thresholds            [1, 3, 6, 10]: the smallest value of level 1, 2, 3 ... Without
 *                         getLevel or thresholds the shades are scaled to the biggest value.
 *
 * Range
 *   endDate           last day shown      default today (the browser's calendar day)
 *   startDate         first day shown     default `days` days before endDate
 *   days (365)        length of the default range
 *   weekStartsOn (1)  0 = Sunday, 1 = Monday ... the first row of every column
 *
 * Look
 *   colors            CSS colours from the emptiest shade to the fullest, at least 2.
 *                     Default: five steps of the accent colour.
 *   shape ('rounded') 'rounded' | 'circle' | 'square'
 *   gap (3)           space between squares in px
 *   minCellSize (9)   below this size per square the grid scrolls sideways instead of shrinking
 *   scrollToEnd (true) start scrolled to the latest week when the grid scrolls
 *   fill (false)      fit the grid to the box the parent leaves (the parent must be a flex column
 *                     with a height of its own). The squares stay SQUARE: their side is the
 *                     biggest one that fits both the width and the height, and the grid is
 *                     centred in the box. Otherwise the side follows from the width alone.
 *   showMonths (true) month names under the grid
 *   animate (true)    the squares appear once on mount in a soft diagonal wave, from the first
 *                     week to the last (not when reduced motion is requested)
 *
 * Hover text
 *   formatDate(day)   how a day is written       default "12 Mar 2026"
 *   getTooltip(item, { date, value, level })   whole hover text; default "12 Mar 2026: 3".
 *                     `item` is undefined for a day that has no entry in `data`.
 *
 * Accessibility
 *   title, summary    the text equivalent. Without `summary`: "N of M days have activity".
 *   className, style  passed to the root element
 *
 * Also exported: HeatmapLegend, the "Less ... More" key. Give it the same `colors` and `shape`.
 *
 * CSS variables: --hm-l0 ... --hm-l4 (the shades), --hm-label
 */

const DAY_MS = 86400000;

/** Whole days since 1970-01-01 for the calendar date in the value, or NaN. */
export function toDayNumber(input) {
  if (input instanceof Date) {
    if (Number.isNaN(input.getTime())) return NaN;
    return Math.floor(Date.UTC(input.getFullYear(), input.getMonth(), input.getDate()) / DAY_MS);
  }
  if (typeof input === 'number') return toDayNumber(new Date(input));
  if (typeof input === 'string') {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(input);
    if (match) return Math.floor(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) / DAY_MS);
    return toDayNumber(new Date(input));
  }
  return NaN;
}

const dateOfDay = (day) => new Date(day * DAY_MS);
const weekdayOf = (day) => dateOfDay(day).getUTCDay();
const isoOfDay = (day) => dateOfDay(day).toISOString().slice(0, 10);

const DATE_FORMAT = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const MONTH_FORMAT = new Intl.DateTimeFormat('en-IN', { month: 'short', timeZone: 'UTC' });

const defaultDate = (item) => (item ? item.date : undefined);
const defaultValue = (item) => (item ? (item.value !== undefined ? item.value : item.count) : undefined);

const LEVELS = 5;
const levelCountOf = (colors) => (Array.isArray(colors) && colors.length >= 2 ? colors.length : LEVELS);

/** { '--hm-l0': colors[0], ... } when the caller gave colours; otherwise the CSS defaults apply. */
function shadeVars(colors) {
  const vars = {};
  if (Array.isArray(colors) && colors.length >= 2) {
    colors.forEach((color, level) => {
      vars[`--hm-l${level}`] = color;
    });
  }
  return vars;
}

export default function Heatmap({
  data = [],
  getDate = defaultDate,
  getValue = defaultValue,
  getLevel,
  thresholds,
  endDate,
  startDate,
  days = 365,
  weekStartsOn = 1,
  colors,
  shape = 'rounded',
  gap = 3,
  minCellSize = 9,
  scrollToEnd = true,
  fill = false,
  showMonths = true,
  animate = true,
  formatDate,
  getTooltip,
  title,
  summary,
  className,
  style,
}) {
  const scrollRef = useRef(null);

  // ---- The calendar: which day sits in which square -------------------------------------
  const endDay = endDate !== undefined ? toDayNumber(endDate) : toDayNumber(new Date());
  const lastDay = Number.isNaN(endDay) ? toDayNumber(new Date()) : endDay;
  const startGiven = startDate !== undefined ? toDayNumber(startDate) : NaN;
  const firstDay = Number.isNaN(startGiven) ? lastDay - (Math.max(1, days) - 1) : Math.min(startGiven, lastDay);

  // Every column is a whole week, so the first one may begin before the first day shown
  const leadingBlanks = (weekdayOf(firstDay) - weekStartsOn + 7) % 7;
  const gridStart = firstDay - leadingBlanks;
  const weeks = Math.ceil((lastDay - gridStart + 1) / 7);

  // ---- The data, by day -----------------------------------------------------------------
  const items = Array.isArray(data) ? data : [];
  const byDay = new Map();
  items.forEach((item, index) => {
    const day = toDayNumber(getDate(item, index));
    if (!Number.isNaN(day)) byDay.set(day, { item, index });
  });

  const levelCount = levelCountOf(colors);
  const valueOf = (item, index) => Math.max(0, finiteOr(getValue(item, index), 0));

  let biggest = 0;
  if (!getLevel && !thresholds) {
    items.forEach((item, index) => {
      biggest = Math.max(biggest, valueOf(item, index));
    });
  }

  const levelFor = (item, value) => {
    if (getLevel) return clamp(Math.round(finiteOr(getLevel(item, value), 0)), 0, levelCount - 1);
    if (value <= 0) return 0;
    if (thresholds) {
      let level = 0;
      thresholds.forEach((limit) => {
        if (value >= limit) level += 1;
      });
      return Math.min(level, levelCount - 1);
    }
    return clamp(Math.ceil((value / biggest) * (levelCount - 1)), 1, levelCount - 1);
  };

  const describeDay = formatDate || ((day) => DATE_FORMAT.format(dateOfDay(day)));

  const cells = [];
  let activeDays = 0;
  let shownDays = 0;
  for (let offset = 0; offset < weeks * 7; offset += 1) {
    const day = gridStart + offset;
    if (day < firstDay || day > lastDay) {
      cells.push(<span key={offset} className="hm__cell hm__cell--void" aria-hidden="true" />);
      continue;
    }

    const entry = byDay.get(day);
    const item = entry ? entry.item : undefined;
    const value = entry ? valueOf(entry.item, entry.index) : 0;
    const level = entry ? levelFor(entry.item, value) : 0;
    shownDays += 1;
    if (value > 0) activeDays += 1;

    const tooltip = getTooltip
      ? getTooltip(item, { date: isoOfDay(day), value, level })
      : `${describeDay(day)}: ${value}`;

    cells.push(
      <span
        key={offset}
        className="hm__cell"
        style={{ backgroundColor: `var(--hm-l${level})`, '--w': Math.floor(offset / 7), '--r': offset % 7 }}
        data-level={level}
        title={tooltip}
      />
    );
  }

  // ---- Month names: one at the first column of each month, never crowded ------------------
  const monthMarks = [];
  if (showMonths) {
    let previous = -1;
    for (let week = 0; week < weeks; week += 1) {
      const shownDay = Math.max(gridStart + week * 7, firstDay);
      if (shownDay > lastDay) break;
      const date = dateOfDay(shownDay);
      const month = date.getUTCFullYear() * 12 + date.getUTCMonth();
      if (month !== previous) {
        monthMarks.push({ column: week, text: MONTH_FORMAT.format(date) });
        previous = month;
      }
    }
  }
  // A name needs about three columns; keep the later of two names that would overlap
  const visibleMonths = monthMarks.filter((mark, index) => {
    const next = index === monthMarks.length - 1 ? weeks : monthMarks[index + 1].column;
    return next - mark.column >= 3;
  });

  useEffect(() => {
    const node = scrollRef.current;
    if (scrollToEnd && node) node.scrollLeft = node.scrollWidth;
  }, [scrollToEnd, weeks]);

  const rootStyle = {
    '--n': weeks,
    '--hm-weeks': weeks,
    '--hm-gap': `${gap}px`,
    '--hm-min-cell': `${minCellSize}px`,
    ...shadeVars(colors),
    ...style,
  };

  const description = [
    title,
    summary !== undefined ? summary : `${activeDays} of ${shownDays} days have activity`,
  ]
    .filter(Boolean)
    .join('. ');

  return (
    <div
      className={cx('cc hm', className)}
      style={rootStyle}
      role="img"
      aria-label={description || undefined}
      data-shape={shape}
      data-fill={fill ? 'true' : 'false'}
      data-animate={animate ? 'true' : 'false'}
    >
      <div className="hm__scroll" ref={scrollRef}>
        <div className="hm__inner">
          <div className="hm__stage">
            <div className="hm__block">
              <div className="hm__grid">{cells}</div>
              {visibleMonths.length > 0 && (
                <div className="hm__months">
                  {visibleMonths.map((mark) => (
                    <span key={mark.column} className="hm__month" style={{ gridColumn: `${mark.column + 1} / span 3` }}>
                      {mark.text}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * The "Less ... More" key for a Heatmap. Put it anywhere, for example in a card header.
 * Pass the same `colors` and `shape` as the heatmap it explains.
 */
export function HeatmapLegend({ colors, shape = 'rounded', lessLabel = 'Less', moreLabel = 'More', className, style }) {
  return (
    <div
      className={cx('cc hm-legend', className)}
      style={{ ...shadeVars(colors), ...style }}
      data-shape={shape}
      aria-hidden="true"
    >
      <span className="hm-legend__text">{lessLabel}</span>
      {Array.from({ length: levelCountOf(colors) }, (_, level) => (
        <span key={level} className="hm-legend__cell" style={{ backgroundColor: `var(--hm-l${level})` }} />
      ))}
      <span className="hm-legend__text">{moreLabel}</span>
    </div>
  );
}
