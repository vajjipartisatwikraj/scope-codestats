import React, { useEffect, useState } from 'react';
import { TimerIcon } from '@phosphor-icons/react/dist/csr/Timer';
import { StatGrid, StatTile, formatNumber } from '../ui';
import { formatCountdown, nextScheduledRun } from './syncModel';

/** The time left to the next nightly run, counting down every second */
function useCountdown() {
  const [nextRun, setNextRun] = useState(nextScheduledRun);
  const [text, setText] = useState('');

  useEffect(() => {
    const tick = () => {
      const left = nextRun - Date.now();
      if (left <= 0) {
        setNextRun(nextScheduledRun());
        setText('Starting now');
        return;
      }
      setText(formatCountdown(left));
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [nextRun]);

  return text;
}

/**
 * The first thing on the control panel: when the next nightly sync starts (the one inverted tile of
 * the screen, in the biggest numeral) and how the last 30 days went. A figure always comes with its
 * context. The totals are left out until they arrive.
 *
 *   stats   { totalSyncs, successfulSyncs, failedSyncs, cancelledSyncs, totalProfilesUpdated } or null
 */
export default function SyncTiles({ stats }) {
  const countdown = useCountdown();
  const total = stats ? stats.totalSyncs || 0 : 0;

  return (
    <StatGrid label="Profile sync summary" className="cp-tiles">
      <StatTile
        tone="spotlight"
        label="Next sync"
        value={countdown || '\u2013'}
        context="Every day at 12:00 AM IST"
        icon={<TimerIcon size={20} weight="regular" />}
      />
      <StatTile label="Successful syncs" value={stats ? stats.successfulSyncs || 0 : '\u2013'} context={stats ? `of ${formatNumber(total)} in the last 30 days` : 'Last 30 days'} />
      <StatTile label="Failed syncs" value={stats ? stats.failedSyncs || 0 : '\u2013'} context={stats ? `${formatNumber(stats.cancelledSyncs || 0)} cancelled in the last 30 days` : 'Last 30 days'} />
      <StatTile label="Profiles updated" value={stats ? stats.totalProfilesUpdated || 0 : '\u2013'} context="In the last 30 days" />
    </StatGrid>
  );
}
