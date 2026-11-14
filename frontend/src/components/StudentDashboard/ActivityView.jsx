import React, { useMemo } from 'react';
import { Heatmap, HeatmapLegend, PlatformIcon } from '../custom-components';
import ActivityTip, { ACTIVITY_TIP_CLASS } from '../activity/ActivityTip';
import { ACTIVITY_SOURCES, activityCount, daysOfSource, shadesOf } from '../activity/activityModel';
import { ButtonLink } from './Card';
import { Block, Content, Grid, Kpi, KpiRow, ViewBody, ViewEmpty, ViewError, ViewHeader, ViewSkeleton, ViewTop } from './ExpandedParts';
import { longestStreak } from './dashboardModel';
import { formatNumber, pluralize, shortDay, todayInIndia } from './formatters';

/**
 * Every heatmap of the student, opened from the activity card (the card grows to fill the dashboard):
 * the overall one first, with cohorts and every platform together, then one for each source on its own
 * (CodeStats cohorts, LeetCode, Codeforces, CodeChef, HackerRank, GitHub), so it is clear where each
 * day's activity came from. Each source has its own colour (activity/activityModel.js), in its icon and
 * in the shades of its heatmap. Pointing at a day opens the same hover card as on the dashboard; on a
 * source's own heatmap it shows that source only.
 *
 * The data is the dashboard's own request (GET /dashboard/heatmap/:userId, last 12 months): each day
 * carries what every source contributed, and the single-source calendars are cut from it, so this view
 * needs no request of its own.
 */

const DAYS = 365;

const sourceNote = (days, source) => {
  const total = days.reduce((sum, day) => sum + day.count, 0);
  if (total === 0) return `No ${source.many} in the last 12 months`;
  const streak = longestStreak(days);
  return `${formatNumber(total)} ${total === 1 ? source.one : source.many} on ${pluralize(days.length, 'day')} · longest streak ${pluralize(streak, 'day')}`;
};

export default function ActivityView({ titleId, onClose, heatmap }) {
  const { data, loading, error, reload } = heatmap;
  const endKey = todayInIndia();
  const daily = useMemo(() => (Array.isArray(data?.dailyActivity) ? data.dailyActivity : []), [data]);

  let body;
  if (error && !data) {
    body = <ViewError what="your activity" error={error} onRetry={reload} />;
  } else if (loading && !data) {
    body = <ViewSkeleton />;
  } else if (daily.length === 0) {
    body = (
      <ViewEmpty
        title="No activity yet"
        action={
          <ButtonLink to="/profile?edit=platforms" tone="secondary">
            Link a platform
          </ButtonLink>
        }
      >
        Solve a cohort problem or link LeetCode, Codeforces, CodeChef, HackerRank or GitHub, and your days appear here after the next update.
      </ViewEmpty>
    );
  } else {
    const best = daily.reduce((top, day) => (day.count > top.count ? day : top), { date: null, count: 0 });
    const streak = longestStreak(daily);

    body = (
      <Content>
        <KpiRow label="Activity figures">
          <Kpi lead label="Activity" value={formatNumber(data.totalCount || 0)} note="in the last 12 months" />
          <Kpi label="Active days" value={formatNumber(data.activeDays || 0)} note={`of ${pluralize(DAYS, 'day')}`} />
          <Kpi label="Longest streak" value={pluralize(streak, 'day')} note="any platform" />
          <Kpi label="Best day" value={best.count > 0 ? activityCount(best.count) : '-'} note={best.date ? shortDay(best.date) : null} />
        </KpiRow>

        <Grid>
          <Block
            wide
            natural
            className="sd-heat"
            title="All platforms"
            note={`${activityCount(data.totalCount || 0)} on ${pluralize(data.activeDays || 0, 'day')}, cohorts and every linked platform together`}
          >
            <Heatmap
              data={daily}
              getDate={(day) => day.date}
              getValue={(day) => day.count}
              getLevel={(day) => day.level}
              endDate={endKey}
              days={DAYS}
              gap={3}
              minCellSize={12}
              renderTooltip={(day, { date }) => <ActivityTip entry={day} date={date} />}
              tipClassName={ACTIVITY_TIP_CLASS}
              title="Activity per day on all platforms"
              summary={`${activityCount(data.totalCount || 0)} on ${formatNumber(data.activeDays || 0)} days in the last 12 months`}
            />
          </Block>

          {ACTIVITY_SOURCES.map((source) => {
            const days = daysOfSource(daily, source.key);
            return (
              <Block
                key={source.key}
                natural
                className="sd-heat"
                title={
                  <span className="sd-heat__title">
                    <PlatformIcon platform={source.icon} size={18} color={source.color} />
                    {source.label}
                  </span>
                }
                note={sourceNote(days, source)}
              >
                <Heatmap
                  data={days}
                  getDate={(day) => day.date}
                  getValue={(day) => day.count}
                  colors={shadesOf(source.color)}
                  endDate={endKey}
                  days={DAYS}
                  gap={2}
                  minCellSize={7}
                  renderTooltip={(day, { date }) => <ActivityTip entry={day} date={date} />}
                  tipClassName={ACTIVITY_TIP_CLASS}
                  title={`${source.label} activity per day`}
                  summary={sourceNote(days, source)}
                />
              </Block>
            );
          })}
        </Grid>
      </Content>
    );
  }

  return (
    <>
      <ViewTop>
        <ViewHeader titleId={titleId} title="Activity" note="Every platform together, then each on its own" onClose={onClose}>
          <HeatmapLegend />
        </ViewHeader>
      </ViewTop>
      <ViewBody>{body}</ViewBody>
    </>
  );
}
