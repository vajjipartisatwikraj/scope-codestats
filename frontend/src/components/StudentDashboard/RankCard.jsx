import React from 'react';
import { CaretDownIcon } from '@phosphor-icons/react/dist/csr/CaretDown';
import { CaretUpIcon } from '@phosphor-icons/react/dist/csr/CaretUp';
import { LineChart } from '../custom-components';
import Card, { CardEmpty, CardNotice, Skeleton, failureMessage } from './Card';
import { hasScores, rankHistory, rankRanges } from './dashboardModel';
import { formatDay, formatNumber, formatRank, pluralize } from './formatters';

/**
 * The student's rank among all ranked students (GET /platform-progress/me/scores).
 *
 * The chart has one dumbbell for each stretch of a few days: a dot at the best and a dot at the
 * worst rank the student had in it, joined by a stem. Rank 1 is at the top. One of the three
 * tiles on the right: the name and the rank on one row, the chart takes the height that is left,
 * and one line of plain text at the bottom (the change this month, the number of ranked students).
 */
export default function RankCard({ state, onOpen }) {
  const { data, loading, error, reload } = state;
  const overall = hasScores(data) ? data.summary.overall : null;
  const ranked = !loading && !error && overall && typeof overall.rank === 'number';

  let body;
  if (loading) {
    body = <Skeleton height="fill" label="Loading your rank" />;
  } else if (error) {
    body = <CardNotice message={failureMessage('your rank', error)} onRetry={reload} />;
  } else if (!ranked) {
    body = (
      <CardEmpty title="Not ranked yet">
        {data?.message || 'Your rank appears after the next ranking run.'}
      </CardEmpty>
    );
  } else {
    const ranges = rankRanges(rankHistory(data), 8);
    const change = typeof overall.rankChange === 'number' ? overall.rankChange : null;
    const best = overall.best && typeof overall.best.rank === 'number' ? overall.best.rank : null;
    const places = change === null ? null : pluralize(Math.abs(change), 'place');

    body = (
      <>
        <LineChart
          className="sd-rank__chart"
          variant="stems"
          data={ranges}
          getY={(range) => range.best}
          getY0={(range) => range.worst}
          getLabel={(range) => `${formatDay(range.from)} to ${formatDay(range.to)}`}
          getTooltip={(range) =>
            `${formatDay(range.from)} to ${formatDay(range.to)}: ${
              range.best === range.worst ? formatRank(range.best) : `${formatRank(range.best)} to ${formatRank(range.worst)}`
            }`
          }
          formatY={formatRank}
          invertY
          height="fill"
          dotRadius={5}
          stemWidth={4}
          baseDots="filled"
          showGrid={false}
          title="Overall rank over the last 30 days, in stretches of a few days"
          summary={`Rank ${overall.rank} today${best !== null ? `, best in this period ${formatRank(best)}` : ''}. Each stem joins the best and the worst rank of a stretch of days; the higher the stem, the better the rank.`}
          colors={{ stem: 'var(--ds-series-rose)', dot: 'var(--ds-series-rose)' }}
        />

        <p className="sd-foot-row sd-foot-row--soft">
          {change !== null && (
            <span>
              {change > 0 && <CaretUpIcon size={12} weight="fill" aria-hidden="true" />}
              {change < 0 && <CaretDownIcon size={12} weight="fill" aria-hidden="true" />}
              {change === 0 ? (
                'No change'
              ) : (
                <>
                  <span className="sd-visually-hidden">{change > 0 ? 'Up ' : 'Down '}</span>
                  {places}
                </>
              )}
              <span className="sd-long"> this month</span>
            </span>
          )}
          {typeof overall.of === 'number' && <span>of {formatNumber(overall.of)}</span>}
        </p>
      </>
    );
  }

  return (
    <Card tone="ink" className="sd-card--rank" aria-labelledby="sd-rank-title" onOpen={onOpen} openLabel="Open rank details">
      <div className="sd-top">
        <h2 className="sd-label" id="sd-rank-title">
          College rank
        </h2>
        {ranked && <span className="sd-rank__value">{formatRank(overall.rank)}</span>}
      </div>
      {body}
    </Card>
  );
}
