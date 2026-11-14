import React from 'react';
import { ArrowsOutSimpleIcon } from '@phosphor-icons/react/dist/csr/ArrowsOutSimple';
import { CalendarBlankIcon } from '@phosphor-icons/react/dist/csr/CalendarBlank';
import { Heatmap, HeatmapLegend } from '../custom-components';
import useMediaQuery from '../../hooks/useMediaQuery';
import ActivityTip, { ACTIVITY_TIP_CLASS } from '../activity/ActivityTip';
import { activityCount } from '../activity/activityModel';
import Card, { CardHeader, CardNotice, Skeleton, failureMessage } from './Card';
import { formatNumber, pluralize, todayInIndia } from './formatters';

/**
 * Activity on each day of the last 12 months (GET /dashboard/heatmap/:userId): cohort solves and every
 * linked platform (LeetCode, Codeforces, CodeChef, HackerRank, GitHub) on one calendar. Pointing at a day
 * opens a card that lists what each source contributed (../activity/ActivityTip).
 *
 * The server adds the sources up and decides the shade of every day, so this card only draws what it
 * is given. The grid is as big as fits the card, with square cells, and sits in the middle of it. On a
 * phone the whole year is kept and the squares stay big (15px); the grid scrolls sideways, starting at
 * the latest week, with room under the month names for the scrollbar.
 *
 * Pressing the card (or its expand button) opens the activity view: the overall heatmap and one for
 * every platform on its own.
 */
export default function ActivityCard({ state, onOpen }) {
  const { data, loading, error, reload } = state;
  const phone = useMediaQuery('(max-width: 599.95px)');
  const span = 365;
  const spanWords = 'Last 12 months';
  const endKey = todayInIndia();
  const days = Array.isArray(data?.dailyActivity) ? data.dailyActivity : [];
  const total = data?.totalCount || 0;
  const activeDays = data?.activeDays || 0;
  let body;
  if (loading) {
    body = <Skeleton height="fill" label="Loading your activity" />;
  } else if (error) {
    body = <CardNotice message={failureMessage('your activity', error)} onRetry={reload} />;
  } else {
    body = (
      <div className="sd-fill">
        <Heatmap
          fill={!phone}
          data={days}
          getDate={(entry) => entry.date}
          getValue={(entry) => entry.count}
          getLevel={(entry) => entry.level}
          endDate={endKey}
          days={span}
          gap={phone ? 3 : 2}
          minCellSize={phone ? 15 : 7}
          renderTooltip={(entry, { date }) => <ActivityTip entry={entry} date={date} />}
          tipClassName={ACTIVITY_TIP_CLASS}
          title="Activity per day on all platforms"
          summary={`${activityCount(total)} on ${formatNumber(activeDays)} days in the ${spanWords.toLowerCase()}`}
        />
      </div>
    );
  }

  const subtitle =
    !loading && !error
      ? total > 0
        ? `${spanWords} · ${activityCount(total)} on ${pluralize(activeDays, 'day')}`
        : `${spanWords} · no activity yet`
      : `${spanWords} · cohorts and all your platforms`;

  return (
    <Card className="sd-card--activity" aria-labelledby="sd-activity-title" onOpen={onOpen} openButton={false}>
      <CardHeader
        id="sd-activity-title"
        icon={<CalendarBlankIcon size={20} weight="regular" />}
        title="Daily activity"
        subtitle={subtitle}
        action={
          <div className="sd-card__tools">
            <HeatmapLegend />
            {onOpen && (
              <button
                type="button"
                className="sd-circle sd-card__expand"
                aria-label="Open the heatmap of every platform"
                title="Open every platform's heatmap"
                onClick={(event) => {
                  event.stopPropagation();
                  onOpen(event.currentTarget.closest('.sd-card'));
                }}
              >
                <ArrowsOutSimpleIcon size={16} aria-hidden="true" />
              </button>
            )}
          </div>
        }
      />
      {body}
    </Card>
  );
}
