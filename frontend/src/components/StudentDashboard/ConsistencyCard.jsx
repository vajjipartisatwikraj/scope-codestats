import React from 'react';
import { Gauge } from '../custom-components';
import Card, { CardEmpty, CardNotice, Skeleton, failureMessage } from './Card';
import { longestStreak } from './dashboardModel';
import { pluralize } from './formatters';

/**
 * The consistency index, 0 to 5, on a dial. The server works it out from how many of the last
 * 7 days the student's total score changed (6 or 7 days is 5, 5 days is 4, and so on) and keeps
 * it on the student (User.weeklyActivity), so this card shows exactly that number.
 *
 * "Active" is that same count of days. "Longest streak" is the most days in a row with a problem
 * solved in the activity heatmap of the last 12 months.
 *
 * One of the three tiles on the right: the dial takes the space between the title and the line
 * of plain text under it ("Active 6 of 7 days", "Longest streak 2").
 */
export default function ConsistencyCard({ weekly, heatmap }) {
  const { data, loading, error, reload } = weekly;

  let body;
  if (loading) {
    body = <Skeleton height="fill" label="Loading your consistency" />;
  } else if (error) {
    body = <CardNotice message={failureMessage('your consistency index', error)} onRetry={reload} />;
  } else if (!data) {
    body = (
      <CardEmpty title="Not calculated yet">
        Your index appears after your next profile update.
      </CardEmpty>
    );
  } else {
    const index = Number(data.consistencyIndex) || 0;
    const active = Number(data.activeDays) || 0;
    const streak = heatmap.data ? longestStreak(heatmap.data.dailyActivity) : null;

    body = (
      <>
        <div className="sd-dial">
          <Gauge
            value={index}
            min={0}
            max={5}
            ticks={30}
            tickLength={20}
            tickWidth={4.6}
            style={{ '--ga-size': 'min(100cqw, 190cqh)' }}
            label="Consistency index"
            valueDescription={`${index} out of 5, active on ${active} of the last 7 days`}
            colors={{ fill: 'var(--ds-on-accent)', track: 'var(--ds-accent-press)', text: 'var(--ds-on-accent)' }}
          >
            {({ text }) => (
              <>
                <span className="sd-gauge__value">{text}</span>
                <span className="sd-gauge__unit">out of 5</span>
              </>
            )}
          </Gauge>
        </div>

        <p className="sd-foot-row sd-foot-row--soft">
          <span title={`Active on ${active} of the last 7 days`}>
            Active <span className="sd-long">{active} of 7 days</span>
            <span className="sd-short">{active}/7</span>
          </span>
          <span
            title={
              streak === null
                ? undefined
                : `The most days in a row with a problem solved, in the last 12 months: ${pluralize(streak, 'day')}`
            }
          >
            <span className="sd-long">Longest streak</span>
            <span className="sd-short">Streak</span> {streak === null ? '-' : streak}
          </span>
        </p>
      </>
    );
  }

  return (
    <Card tone="accent" className="sd-card--consistency" aria-labelledby="sd-consistency-title">
      <div>
        <h2 className="sd-label sd-label--title" id="sd-consistency-title">
          Consistency index
        </h2>
        <p className="sd-hint">Out of 5 · last 7 days</p>
      </div>
      {body}
    </Card>
  );
}
