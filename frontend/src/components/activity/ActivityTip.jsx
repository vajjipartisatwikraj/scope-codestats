import React from 'react';
import { PlatformIcon, TipTitle } from '../custom-components';
import { activityCount, formatActivityDay, sourceRows } from './activityModel';
import './activityTip.css';

/**
 * What the heatmap shows when a day is pointed at: the date, one row for each source that had activity
 * (the platform's mark, its name, and the number with what it counts), and the total when there is more
 * than one. A day with nothing says so. It goes inside the Heatmap's `renderTooltip`, with
 * `tipClassName={ACTIVITY_TIP_CLASS}`.
 *
 *   entry   the day from the server ({ count, sources }), or undefined for a day without activity
 *   date    'YYYY-MM-DD'
 */
export const ACTIVITY_TIP_CLASS = 'act-tip';

export default function ActivityTip({ entry, date }) {
  const rows = sourceRows(entry);

  return (
    <>
      <TipTitle>{formatActivityDay(date)}</TipTitle>
      {rows.length === 0 ? (
        <span className="act-tip__none">No activity</span>
      ) : (
        <>
          {rows.map((row) => (
            <span key={row.key} className="act-tip__row">
              <PlatformIcon platform={row.icon} size={16} color={row.color} />
              <span className="act-tip__label">{row.label}</span>
              <span className="act-tip__figure">
                <strong>{row.text}</strong> {row.unit}
              </span>
            </span>
          ))}
          {rows.length > 1 ? (
            <span className="act-tip__total">
              <span>Total</span>
              <strong>{activityCount(entry.count)}</strong>
            </span>
          ) : null}
        </>
      )}
    </>
  );
}
