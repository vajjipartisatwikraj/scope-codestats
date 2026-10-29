import React from 'react';
import { MiniBars } from '../custom-components';
import Card, { CardEmpty, CardNotice, Skeleton, failureMessage } from './Card';
import { dailyGains, gainOver, hasScores } from './dashboardModel';
import { formatDay, formatNumber, signed, topPercent } from './formatters';

/**
 * The student's total score, with the points gained on each of the last 14 days as a strip of
 * bars, the gain over the last 7 days and where that puts them among the ranked students.
 * All of it comes from GET /platform-progress/me/scores. Pressing the tile opens the score view.
 *
 * It is one of the three tiles on the right, so it is built to fit a small box: the name on the
 * left and the figure on the right, the strip of bars (centred on the middle of the height that
 * is left, the best day taking just over half of it), and one
 * line of plain text under it (the gain this week, the share of students).
 */
export default function OverallScoreCard({ state, onOpen }) {
  const { data, loading, error, reload } = state;
  const ready = hasScores(data);
  const share = ready ? topPercent(data.summary.overall?.percentile) : null;

  let body;
  if (loading) {
    body = <Skeleton height="fill" label="Loading your score" />;
  } else if (error) {
    body = <CardNotice message={failureMessage('your score', error)} onRetry={reload} />;
  } else if (!ready) {
    body = (
      <CardEmpty title="No score yet">
        {data?.message || 'Your score appears after your first profile update.'}
      </CardEmpty>
    );
  } else {
    const gains = dailyGains(data, 14);
    const week = gainOver(data, 7);
    const latest = gains.length ? gains[gains.length - 1].value : 0;

    body = (
      <>
        <MiniBars
          className="sd-overall__bars"
          data={gains}
          getKey={(gain) => gain.date}
          getValue={(gain) => gain.value}
          getLabel={(gain) => formatDay(gain.date)}
          getTooltip={(gain) => `${formatDay(gain.date)}: ${signed(gain.value)} points`}
          height="fill"
          align="center"
          maxShare={0.55}
          gap={6}
          highlight="none"
          title="Points gained per day over the last 14 days"
          summary={`Today ${signed(latest)} points. ${week === null ? '' : `${signed(week)} points in the last 7 days.`}`}
          colors={{ bar: 'var(--sd-bars)', empty: 'var(--sd-bars)' }}
        />
        <p className="sd-foot-row">
          {week !== null && <span>{signed(week)} this week</span>}
          {share && (
            <span title={`${share} of ranked students`}>
              {share}
              <span className="sd-wide"> of students</span>
            </span>
          )}
        </p>
      </>
    );
  }

  return (
    <Card tone="ink" className="sd-card--overall" aria-labelledby="sd-overall-title" onOpen={onOpen} openLabel="Open score details">
      <div className="sd-top">
        <h2 className="sd-label" id="sd-overall-title">
          Overall score
        </h2>
        {ready && (
          <p className="sd-figure">
            <span className="sd-figure__value">{formatNumber(data.summary.totalScore)}</span>
            <span className="sd-figure__unit">pts</span>
          </p>
        )}
      </div>
      {body}
    </Card>
  );
}
