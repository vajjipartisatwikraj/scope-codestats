import React from 'react';
import { Card, formatNumber, pluralize } from '../ui';
import { Heatmap, HeatmapLegend } from '../custom-components';
import { streaksOf } from './profileModel';

/**
 * A year of solving, one square per day (the custom Heatmap), with the three figures that matter
 * under it: the longest streak, the streak that is still going and the best day. The shades come
 * from the server (level 0 to 4), so they match the student's own dashboard. The squares are at least\n * 15px, so the whole year does not shrink to dots on a phone: the grid scrolls sideways instead.
 *
 *   activity   { dailyActivity: [{ date, count, level }], activeDays, totalCount, days } or null
 */
export default function ActivityCard({ activity }) {
  if (!activity || !Array.isArray(activity.dailyActivity)) return null;

  const total = activity.totalCount || 0;
  const active = activity.activeDays || 0;
  const streaks = streaksOf(activity.dailyActivity);

  return (
    <Card
      className="pp-card"
      title="Activity"
      description={
        total > 0
          ? `${pluralize(total, 'problem')} solved on ${pluralize(active, 'day')} in the last 12 months`
          : 'No problems solved in the last 12 months yet'
      }
      actions={<HeatmapLegend />}
    >
      <div className="pp-heat">
        <Heatmap
          data={activity.dailyActivity}
          getDate={(day) => day.date}
          getValue={(day) => day.count}
          getLevel={(day) => day.level}
          days={activity.days || 365}
          gap={3}
          minCellSize={15}
          getTooltip={(day, info) => `${info.date}: ${pluralize(info.value, 'problem')} solved`}
          title="Problems solved per day over the last 12 months"
          summary={`${pluralize(total, 'problem')} solved on ${pluralize(active, 'day')}. Longest streak ${pluralize(streaks.longest, 'day')}.`}
        />
      </div>

      <dl className="pp-figures">
        <div>
          <dt>Longest streak</dt>
          <dd>{pluralize(streaks.longest, 'day')}</dd>
        </div>
        <div>
          <dt>Current streak</dt>
          <dd>{pluralize(streaks.current, 'day')}</dd>
        </div>
        <div>
          <dt>Best day</dt>
          <dd>{streaks.best > 0 ? `${formatNumber(streaks.best)} solved` : '\u2013'}</dd>
        </div>
      </dl>
    </Card>
  );
}
