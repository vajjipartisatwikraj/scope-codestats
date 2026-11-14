import React from 'react';
import { Heatmap, HeatmapLegend } from '../custom-components';
import ActivityTip, { ACTIVITY_TIP_CLASS } from '../activity/ActivityTip';
import { ACTIVITY_SOURCES, daysOfSource, shadesOf } from '../activity/activityModel';
import { formatNumber, pluralize } from '../ui';
import { streaksOf } from './profileModel';

/**
 * One year of activity as a heatmap, with the three figures that matter under it (the longest streak,
 * the streak that is still going and the best day). Pointing at a day opens the hover card.
 *
 *   sourceKey   'all' for cohorts and every platform together (the shades come from the server, so they
 *               match the student's own dashboard), or one source ('cohort', 'leetcode', 'codeforces',
 *               'codechef', 'hackerrank', 'github'): its own days, in its own colour
 *   activity    { dailyActivity: [{ date, count, level, sources }], activeDays, totalCount, days }
 *
 * The squares are at least 15px, so the whole year does not shrink to dots on a phone: the grid scrolls
 * sideways instead.
 */
export default function ActivityPanel({ activity, sourceKey = 'all' }) {
  const source = ACTIVITY_SOURCES.find((item) => item.key === sourceKey);
  const days = source ? daysOfSource(activity.dailyActivity, sourceKey) : activity.dailyActivity;
  const total = source ? days.reduce((sum, day) => sum + day.count, 0) : activity.totalCount || 0;
  const active = source ? days.length : activity.activeDays || 0;
  const streaks = streaksOf(days);
  const colors = source ? shadesOf(source.color) : undefined;

  const unit = (count) => (source ? (count === 1 ? source.one : source.many) : count === 1 ? 'activity' : 'activities');
  const summary =
    total > 0
      ? `${formatNumber(total)} ${unit(total)} on ${pluralize(active, 'day')} in the last 12 months`
      : `No ${source ? source.many : 'activity'} in the last 12 months yet`;

  return (
    <div className="pp-act">
      <div className="pp-act__head">
        <p className="pp-act__summary">{summary}</p>
        <HeatmapLegend colors={colors} />
      </div>

      <div className="pp-heat">
        <Heatmap
          data={days}
          getDate={(day) => day.date}
          getValue={(day) => day.count}
          getLevel={source ? undefined : (day) => day.level}
          colors={colors}
          days={activity.days || 365}
          gap={3}
          minCellSize={15}
          renderTooltip={(day, info) => <ActivityTip entry={day} date={info.date} />}
          tipClassName={ACTIVITY_TIP_CLASS}
          title={`${source ? source.label : 'All platforms'}: activity per day over the last 12 months`}
          summary={`${summary}. Longest streak ${pluralize(streaks.longest, 'day')}.`}
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
          <dd>{streaks.best > 0 ? `${formatNumber(streaks.best)} ${unit(streaks.best)}` : '\u2013'}</dd>
        </div>
      </dl>
    </div>
  );
}
