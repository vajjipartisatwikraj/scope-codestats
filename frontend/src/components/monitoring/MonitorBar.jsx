import React from 'react';
import { ArrowsClockwiseIcon } from '@phosphor-icons/react/dist/csr/ArrowsClockwise';
import { IconButton } from '../ui';
import { PillTabs } from '../custom-components';

/**
 * The row at the top of a Monitoring tab: the range switch at the left, a reload button and a
 * line saying how fresh the numbers are at the right.
 *
 *   ranges       [{ key, label }]; leave it out for a tab with no range to choose (Judge0)
 *   range, onRange(key)
 *   onReload     reloads the tab
 *   loading      the tab is loading: the reload button spins
 *   caption      a node: "Updated 5:10 pm. The newest minute can be missing."
 *   label        the accessible name of the range switch
 */
export default function MonitorBar({ ranges, range, onRange, onReload, loading, caption, label }) {
  return (
    <div className="mon-bar">
      {ranges ? (
        <div className="mon-bar__range">
          <PillTabs items={ranges} value={range} onChange={onRange} label={label} size="sm" role="radiogroup" />
        </div>
      ) : null}
      <div className="mon-bar__end" data-alone={ranges ? undefined : 'true'}>
        {caption ? <p className="mon-bar__caption">{caption}</p> : null}
        <IconButton label="Reload" size="sm" onClick={onReload} disabled={loading} tooltip={false}>
          <ArrowsClockwiseIcon size={18} aria-hidden="true" className={loading ? 'mon-spin' : undefined} />
        </IconButton>
      </div>
    </div>
  );
}
