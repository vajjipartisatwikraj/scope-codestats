import React from 'react';
import { CalendarBlankIcon } from '@phosphor-icons/react/dist/csr/CalendarBlank';
import { Heatmap, HeatmapLegend } from '../custom-components';
import useMediaQuery from '../../hooks/useMediaQuery';
import Card, { CardHeader, CardNotice, Skeleton, failureMessage } from './Card';
import { formatDay, formatNumber, pluralize, todayInIndia } from './formatters';

/**
 * Problems solved on each day of the last 12 months (GET /dashboard/heatmap/:userId).
 *
 * The server counts problems solved in cohorts, and decides the shade of every day, so this card
 * only draws what it is given. The grid is as big as fits the card, with square cells, and sits in the
 * middle of it. On a phone the whole year is kept and the squares stay big (15px); the grid scrolls
 * sideways, starting at the latest week, with room under the month names for the scrollbar.
 */
export default function ActivityCard({ state }) {
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
          getTooltip={(entry, { date, value }) =>
            entry && value > 0
              ? `${pluralize(value, 'problem')} solved on ${formatDay(date)}`
              : `No problems solved on ${formatDay(date)}`
          }
          title="Problems solved per day"
          summary={`${formatNumber(total)} problems solved on ${formatNumber(activeDays)} days in the ${spanWords.toLowerCase()}`}
        />
      </div>
    );
  }

  const subtitle =
    !loading && !error
      ? total > 0
        ? `${spanWords} · ${pluralize(total, 'problem')} solved on ${pluralize(activeDays, 'day')}`
        : `${spanWords} · no problems solved in cohorts yet`
      : `${spanWords} · problems solved in cohorts`;

  return (
    <Card className="sd-card--activity" aria-labelledby="sd-activity-title">
      <CardHeader
        id="sd-activity-title"
        icon={<CalendarBlankIcon size={20} weight="regular" />}
        title="Daily activity"
        subtitle={subtitle}
        action={<HeatmapLegend />}
      />
      {body}
    </Card>
  );
}
